//чтение параметров URL, для перехода из тг к конкретной книге
function getBookIdFromUrl() {
const params = new URLSearchParams(window.location.search);
const id = params.get('bookId');
return id ? Number(id) : null;
}

//поиск книги по id в массиве
function findBookById(id) {
return books.find(book => book.id === id);
}

//добавление функции startapp
function getBookIdFromTelegram() {
  try {
    if (window.Telegram && Telegram.WebApp) {
      const unsafe = Telegram.WebApp.initDataUnsafe || {};
      const startParam = unsafe.start_param;

      if (!startParam) return null;

      // если просто число: ?startapp=5
      const numericId = Number(startParam);
      if (Number.isFinite(numericId)) {
        return numericId;
      }

      // если формат book_5
      if (typeof startParam === 'string' && startParam.startsWith('book_')) {
        const id = Number(startParam.replace('book_', ''));
        return Number.isFinite(id) ? id : null;
      }
    }
  } catch (e) {}

  return null;
}




const books = [
  {
    id: 1,
    title: 'Произведение 1',
    author: 'Имя Автора',
    description: 'Краткое описание первого произведения.',
    cover: 'https://via.placeholder.com/120x180',
    fullText: [
      'Это первый абзац полного текста первой книги. Здесь может быть несколько предложений.',
      'Это второй абзац текста. Мы разбиваем книгу на части, чтобы удобнее было отображать её в читалке.',
      'Это третий абзац. Позже здесь будет реальный текст произведения.'
    ]
  },
  {
    id: 2,
    title: 'Произведение 2',
    author: 'Имя Автора',
    description: 'Краткое описание второго произведения.',
    cover: 'https://via.placeholder.com/120x180',
    fullText: [
      'Полный текст второй книги. Первый абзац.',
      'Второй абзац второй книги. Здесь тоже может быть несколько предложений.',
      'Третий абзац второй книги для примера.'
    ]
  },
  {
    id: 3,
    title: 'Произведение 3',
    author: 'Имя Автора',
    description: 'Краткое описание третьего произведения.',
    cover: 'https://via.placeholder.com/120x180',
    fullText: [
      'Полный текст книги третьей. Первый абзац.',
      'Второй абзац третьей книги. Здесь тоже может быть несколько предложений.',
      'Третий абзац третьей книги для примера.'
    ]
  },
  {
    id: 4,
    title: 'Произведение 4',
    author: 'Имя Автора',
    description: 'Краткое описание четвертого произведения.',
    cover: 'https://via.placeholder.com/120x180',
    fullText: [
      'Полный текст книги четыре. Первый абзац.',
      'Второй абзац книги четыре. Здесь тоже может быть несколько предложений.',
      'Третий абзац четвертой книги для примера.',
      'Четвертый абзац читаем. Что-то восхитительное получается. Читать — не перечитать. Не будем слишком восторгаться — до результата еще очень, очееь далеко!',
      'Пятый абзац книги четыре. Здесь тоже может быть несколько предложений. Вот так читалка',
      'Шестой абзац четвертой книги для примера. Это самый большой абзац, так как надо бы проверить прокрутку страниц. Создадим лучшую библиотеку в телеграм. Пожалуй, этого текста будет в избытке. Точка.'
    ]
  }  
];

// Временная отладка: посмотреть Telegram user_id в мини-приложении
if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe) {
  console.log('TG USER:', Telegram.WebApp.initDataUnsafe.user);
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
//конец вкладки админ-библиотекарь

//получение ссылок на шесть элементов читалки
//const bookListElement = document.querySelector('.book-list');
const librarySection = document.querySelector('#library');
const readerSection = document.querySelector('#reader');
const readerTitle = document.querySelector('#reader-title');
const readerContent = document.querySelector('#reader-content');
const backButton = document.querySelector('#back-to-library');


const bookList = document.querySelector('.book-list');

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
        <button class="book-read">Читать</button>
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
books.forEach(book => {
  const card = createBookCard(book);
  bookList.appendChild(card);
});

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
function openReader(book) {
  readerTitle.textContent = book.title;
  
  readerContent.innerHTML = '';
  
  if (Array.isArray(book.fullText)) {
    book.fullText.forEach(paragraphText => {
      const p = document.createElement('p');
      p.textContent = paragraphText;
      readerContent.appendChild(p);
    });
  } else {
    const p = document.createElement('p');
    p.textContent = book.description;
    readerContent.appendChild(p);
  }
  showReader();
}

//автооткрытие книги
//при обычном открытии показывается библиотека
//при ?bookId=1 открывается книга
//обернули запуск автооткрытия в runApp() и запускаем его после ready

function runApp() {
  const bookIdFromTelegram = getBookIdFromTelegram();
  const bookIdFromUrl = getBookIdFromUrl();

  let bookToOpen = null;

  if (bookIdFromTelegram) {
    bookToOpen = findBookById(bookIdFromTelegram);
  } else if (bookIdFromUrl) {
    bookToOpen = findBookById(bookIdFromUrl);
  }

  if (bookToOpen) {
    openReader(bookToOpen);
  } else {
    showLibrary();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
  }
  runApp();
});

