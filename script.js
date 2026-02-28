//чтение параметров URL, для перехода из тг к конкретной книге
//function getBookIdFromUrl() {
//const params = new URLSearchParams(window.location.search);
//const id = params.get('bookId');
//return id ? Number(id) : null;
//}

//Быстрый бонус (чтобы ловить такие падения сразу)
//Тогда даже в WebView будет видно, что именно упало.
window.addEventListener('error', (e) => {
  console.log('[JS ERROR]', e.message, 'at', e.filename, e.lineno + ':' + e.colno);
});


//поиск книги по id в массиве
//function findBookById(id) {
//return books.find(book => book.id === id);
//}

//новый поиск книги по id в массиве
function findBookById(id) {
  const n = Number(id);
  if (!Number.isFinite(n)) return undefined;
  return books.find(book => Number(book.id) === n);
}


//1-1. сделаем одну универсальную функцию, которая:
//Берёт start_param из Telegram.WebApp.initDataUnsafe
//Если нет — берёт tgWebAppStartParam
//Если нет — берёт ?bookId=
//Корректно обрабатывает "0"
//Поддерживает формат book_4
//Всегда возвращает number или null

function getLaunchBookId() {
  // 1️⃣ Попытка получить из Telegram initDataUnsafe
  try {
    if (window.Telegram && Telegram.WebApp) {
      const unsafe = Telegram.WebApp.initDataUnsafe || {};
      if (typeof unsafe.start_param === 'string') {
        const parsed = parseBookId(unsafe.start_param);
        if (parsed !== null) return parsed;
      }
    }
  } catch (e) {
    console.log('[LaunchID] Telegram parse error:', e);
  }

  // 2️⃣ Попытка получить из tgWebAppStartParam
  const params = new URLSearchParams(window.location.search);

  if (params.has('tgWebAppStartParam')) {
    const parsed = parseBookId(params.get('tgWebAppStartParam'));
    if (parsed !== null) return parsed;
  }

  // 3️⃣ Фолбэк на обычные параметры
  if (params.has('bookId')) {
    const parsed = parseBookId(params.get('bookId'));
    if (parsed !== null) return parsed;
  }

  return null;
}

//1-2. Добавили вспомогательную функцию парсинга
function parseBookId(value) {
  if (value === null || value === undefined) return null;

  const str = String(value).trim();

  // поддержка формата "book_4"
  if (str.startsWith('book_')) {
    const n = Number(str.replace('book_', ''));
    return Number.isFinite(n) ? n : null;
  }

  // поддержка просто числа "4"
  const n = Number(str);
  return Number.isFinite(n) ? n : null;
}
//end 1-1,1-2

//добавление функции startapp
//function getBookIdFromTelegram() {
//  try {
//    if (window.Telegram && Telegram.WebApp) {
//      const unsafe = Telegram.WebApp.initDataUnsafe || {};
//      const startParam = unsafe.start_param;

//      if (!startParam) return null;

      // если просто число: ?startapp=5
//      const numericId = Number(startParam);
//      if (Number.isFinite(numericId)) {
//        return numericId;
//      }

      // если формат book_5
//      if (typeof startParam === 'string' && startParam.startsWith('book_')) {
//        const id = Number(startParam.replace('book_', ''));
//        return Number.isFinite(id) ? id : null;
//      }
//    }
//  } catch (e) {}

//  return null;
//}




let books = [];
//Ввести инициализацию текущего состояния
//Смысл: 
//-currentBookId = 0 — мы не находимся в контексте конкретной книги, «создания новой»; 
//- currentBookId > 0 — открыта конкретная книга.

let currentBookId = 0;
let currentBook = null;

//Шаблон нулевой книги (ZERO_BOOK_TEMPLATE)
const ZERO_BOOK_TEMPLATE = {
  id: 0,
  author: 'А.П. Чехов',
  title: 'Название произведения',
  description: 'Краткое описание произведения (1–3 строки).',
  content: [
    'Первый абзац текста произведения.',
    'Второй абзац текста произведения.',
    'Третий абзац текста произведения.'
  ]
};

//функция загрузки книг через fetch
function loadBooks() {
  return fetch('data/books.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Ошибка загрузки books.json: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) {
        throw new Error('Неверный формат books.json: ожидается массив');
      }
      books = data;
    })
    .catch(err => {
      console.log('[BOOKS LOAD ERROR]', err);
      books = [];
    });
}

//добавили переменную ADMIN_ID и функцию isAdmin
const ADMIN_ID = 6283474141; // сюда вставь свой реальный Telegram user_id

function getTelegramUserId() {
  try {
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe) {
      const user = Telegram.WebApp.initDataUnsafe.user;
      return user && user.id ? Number(user.id) : null;
    }
  } catch (e) {}
  return null;
}

function isAdmin() {
  const uid = getTelegramUserId();
  return uid !== null && uid === ADMIN_ID;
}
//конец вкладки админ

//получение ссылок на шесть элементов читалки
//const bookListElement = document.querySelector('.book-list');
const librarySection = document.querySelector('#library');
const readerSection = document.querySelector('#reader');
const readerTitle = document.querySelector('#reader-title');
const readerContent = document.querySelector('#reader-content');
const backButton = document.querySelector('#back-to-library');


const bookList = document.querySelector('.book-list');

//элементы админки
const adminOpenButton = document.querySelector('#admin-open');
const adminSection = document.querySelector('#admin');
const backFromAdminButton = document.querySelector('#back-from-admin');
  //новые переменные админки
const adminTitle = document.querySelector('#admin-title');
const adminDescription = document.querySelector('#admin-description');
const adminText = document.querySelector('#admin-text');
const adminPreviewButton = document.querySelector('#admin-preview');
const adminPreviewBlock = document.querySelector('#admin-preview-block');
const adminPreviewContent = document.querySelector('#admin-preview-content');
// end новые переменные админки

//Генерация объекта книги. Добавь переменные:
const adminGenerateButton = document.querySelector('#admin-generate');
const adminOutputBlock = document.querySelector('#admin-output-block');
const adminOutput = document.querySelector('#admin-output');

//Генерация объекта книги. Добавь функцию генерации id
function generateNextId() {
const ids = books.map(b => b.id);
return ids.length ? Math.max(...ids) + 1 : 1;
}


//функции показа/скрытия админки
function showAdmin() {
  librarySection.classList.add('hidden');
  readerSection.classList.add('hidden');
  adminSection.classList.remove('hidden');
}
function hideAdmin() {
  adminSection.classList.add('hidden');
  showLibrary();
}

//Добавь функцию разбивки на абзацы админки
//function splitTextIntoParagraphs(text) {
//  return text
//    .split('\n')
//    .map(p => p.trim())
//    .filter(p => p.length > 0);
//}

//Самый надёжный вариант: поддержка Windows/Unix переносов и разделение по пустым строкам (как в книгах)
function splitTextIntoParagraphs(input) {
  let text = input;

  // на всякий: если вдруг прилетел массив — склеим
  if (Array.isArray(text)) text = text.join('');

  // если не строка — приводим к строке
  if (typeof text !== 'string') text = String(text ?? '');

  // нормализуем переносы строк
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];

  // делим по пустым строкам (абзацам)
  return text
    .split(/\n\s*\n+/)
    .map(p => p.replace(/[ \t]+/g, ' ').trim())
    .filter(p => p.length > 0);
}

//обработчик админки
if (isAdmin()) {
  adminOpenButton.classList.remove('hidden');
}
adminOpenButton.addEventListener('click', () => {
  showAdmin();
});
backFromAdminButton.addEventListener('click', () => {
  hideAdmin();
});

//Добавь обработчик предпросмотра 
adminPreviewButton.addEventListener('click', () => {
  const text = adminText.value;
  const paragraphs = splitTextIntoParagraphs(text);

  adminPreviewContent.innerHTML = '';

  paragraphs.forEach(p => {
    const el = document.createElement('p');
    el.textContent = p;
    adminPreviewContent.appendChild(el);
  });

  adminPreviewBlock.classList.remove('hidden');
});

//Генерация объекта книги. Добавь обработчик генерации
adminGenerateButton.addEventListener('click', () => {
  const id = generateNextId();
  const title = adminTitle.value.trim();
  const description = adminDescription.value.trim();
  const paragraphs = splitTextIntoParagraphs(adminText.value);

//  const bookObject = {
//    id,
//    title,
//    description,
//    content: paragraphs
//  };
  
  const bookObject = {
    id,
    title,
    author: 'Имя Автора', // можно оставить пустым/шаблонным
    description,
    cover: 'https://via.placeholder.com/120x180',
    fullText: paragraphs
  };


  adminOutput.value = JSON.stringify(bookObject, null, 2);
  adminOutputBlock.classList.remove('hidden');
});


//конец по админке


//генерация карточек
function createBookCard(book) {
  const bookItem = document.createElement('div');
  bookItem.className = 'book-item';
  
  bookItem.innerHTML = `
      <img class="book-cover" src="${book.cover}" alt="Обложка книги">
      <div class="book-info">
        <h3 class="book-title">${book.title}</h3>
        <p class="book-author">Автор: ${book.author}</p>
        <p class="book-description">${book.description}</p>
        <button class="book-read" type="button">Читать</button>
      </div>
    `;
    
  //обработчик клика, связь кнопки «Читать» с читалкой  
  const readButton = bookItem.querySelector('.book-read');
    readButton.addEventListener('click', () => {
    openReader(book);
  });  
  
  return bookItem;
}

//генерация библиотеки из карточек
//books.forEach(book => {
//  const card = createBookCard(book);
//  bookList.appendChild(card);
//});
//Выносим генерацию библиотеки в renderLibrary()
//И убираем прямой books.forEach(...) вне функции.
function renderLibrary() {
  bookList.innerHTML = '';
  books.forEach(book => {
    const card = createBookCard(book);
    bookList.appendChild(card);
  });
}

//прячет читалку и показывает библиотеку
function showLibrary() {
  librarySection.classList.remove('hidden');
  readerSection.classList.add('hidden');
}

function showReader() { 
  librarySection.classList.add('hidden');
  readerSection.classList.remove('hidden');
}

backButton.addEventListener('click', () => {
  showLibrary();
});

// открывает экран читалки для выбранной книги
//function openReader(book) {
//  readerTitle.textContent = book.title;
  
//  readerContent.innerHTML = '';
  
//  if (Array.isArray(book.fullText)) {
//    book.fullText.forEach(paragraphText => {
//      const p = document.createElement('p');
//      p.textContent = paragraphText;
//      readerContent.appendChild(p);
//    });
//  } else {
//    const p = document.createElement('p');
//    p.textContent = book.description;
//    readerContent.appendChild(p);
//  }
//  showReader();
//}
//новая
function openReader(book) {
  currentBook = book;
  currentBookId = book.id;

  readerTitle.textContent = book.title;

  readerContent.innerHTML = '';

  const paragraphs = Array.isArray(book.content)
    ? book.content
    : Array.isArray(book.fullText)
      ? book.fullText
      : [];

  paragraphs.forEach(paragraphText => {
    const p = document.createElement('p');
    p.textContent = paragraphText;
    readerContent.appendChild(p);
  });

  showReader();
}

//автооткрытие книги
//при обычном открытии показывается библиотека
//при ?bookId=1 открывается книга
//обернули запуск автооткрытия в runApp() и запускаем его после ready

//новая runApp
function runApp() {
  const launchId = getLaunchBookId();

  if (launchId !== null) {
    const book = findBookById(launchId);
    if (book) {
      openReader(book);
      return;
    }
  }

  showLibrary();
}


//document.addEventListener('DOMContentLoaded', () => {
//  if (window.Telegram && Telegram.WebApp) {
//    Telegram.WebApp.ready();
//  }
//  runApp();
//});
//Обновили запуск приложения: ждём загрузку книг
//Нужно:
//сначала загрузить книги,
//потом отрендерить библиотеку,
//и только потом вызывать runApp().
document.addEventListener('DOMContentLoaded', () => {
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
  }

  loadBooks().then(() => {
    // после загрузки книг строим библиотеку
    renderLibrary();
    // и только потом запускаем логику открытия книги / библиотеки
    runApp();
  });
});
