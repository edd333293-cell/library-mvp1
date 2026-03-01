// =============== 0. ГЛОБАЛЬНЫЙ ЛОВЕЦ ОШИБОК ===============
window.addEventListener('error', (e) => {
  console.log('[JS ERROR]', e.message, 'at', e.filename, e.lineno + ':' + e.colno);
});


// =============== 1. ПОМОЩНИК: ID КНИГИ ИЗ URL (ЕДИНСТВЕННЫЙ ВАРИАНТ) ===============
// Единственный официальный вариант входа в книгу:
//   tgWebAppStartParam=book_4   → Telegram даёт так при startapp=book_4
function getLaunchBookId() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has('tgWebAppStartParam')) return null;

  const raw = params.get('tgWebAppStartParam') || '';

  if (!raw.startsWith('book_')) return null;

  const num = Number(raw.slice('book_'.length));
  if (!Number.isFinite(num)) return null;

  return num;
}


// =============== 2. ДАННЫЕ / СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===============

let books = [];

const appState = {
  currentView: 'library',   // 'library' | 'reader' | 'admin'
  currentBookId: null,
  currentBook: null
};

// ID администратора (твоя учётка в Telegram)
const ADMIN_ID = 6283474141;


// =============== 3. TELEGRAM-ПОМОЩНИКИ (АДМИН / USER ID) ===============

function getTelegramUserId() {
  try {
    if (window.Telegram && Telegram.WebApp && Telegram.WebApp.initDataUnsafe) {
      const user = Telegram.WebApp.initDataUnsafe.user;
      return user && user.id ? Number(user.id) : null;
    }
  } catch (e) {
    console.log('[TG USER ERROR]', e);
  }
  return null;
}

function isAdmin() {
  const uid = getTelegramUserId();
  return uid !== null && uid === ADMIN_ID;
}


// =============== 4. DOM-ССЫЛКИ ===============

const dom = {
  // секции
  librarySection: document.querySelector('#library'),
  readerSection: document.querySelector('#reader'),
  adminSection: document.querySelector('#admin'),

  // библиотека
  bookList: document.querySelector('.book-list'),

  // читалка
  readerTitle: document.querySelector('#reader-title'),
  readerContent: document.querySelector('#reader-content'),
  backToLibraryButton: document.querySelector('#back-to-library'),
  adminOpenButton: document.querySelector('#admin-open'),

  // админка
  backFromAdminButton: document.querySelector('#back-from-admin'),
  adminTitle: document.querySelector('#admin-title'),
  adminDescription: document.querySelector('#admin-description'),
  adminFulltext: document.querySelector('#admin-fulltext'),
  adminYear: document.querySelector('#admin-year'),
  adminPreviewButton: document.querySelector('#admin-preview'),
  adminPreviewBlock: document.querySelector('#admin-preview-block'),
  adminPreviewContent: document.querySelector('#admin-preview-content'),
  //добавили кнопки перезаписать и сохранить новую
  adminSaveUpdateButton: document.querySelector('#admin-save-update'),
  adminSaveNewButton: document.querySelector('#admin-save-new'),
  //добавили 
  adminExportBooksButton: document.querySelector('#admin-export-books'),
  adminBooksJson: document.querySelector('#admin-books-json'),
};

const sections = {
  library: dom.librarySection,
  reader: dom.readerSection,
  admin: dom.adminSection
};


// =============== 5. ТЕКСТОВЫЕ УТИЛИТЫ ===============

function splitTextIntoParagraphs(input) {
  let text = input;

  if (Array.isArray(text)) {
    text = text.join('');
  }

  if (typeof text !== 'string') {
    text = String(text ?? '');
  }

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];

  return text
    .split(/\n\s*\n+/)
    .map(p => p.replace(/[ \t]+/g, ' ').trim())
    .filter(p => p.length > 0);
}


// =============== 6. НАВИГАЦИЯ (ЕДИНЫЙ ЦЕНТР) ===============

function showSection(sectionId) {
  Object.entries(sections).forEach(([id, el]) => {
    if (!el) return;
    if (id === sectionId) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  appState.currentView = sectionId;
}

function showLibrary() {
  showSection('library');
}

function showReader() {
  showSection('reader');
}

function showAdmin() {
  showSection('admin');
}


// =============== 7. РЕНДЕР БИБЛИОТЕКИ ===============

function createBookCard(book) {
  const bookItem = document.createElement('div');
  bookItem.className = 'book-item';

  bookItem.innerHTML = `
    <img class="book-cover" src="${book.cover}" alt="Обложка книги">
    <div class="book-info">
      <h3 class="book-title">${book.title}</h3>
      <p class="book-author">Автор: ${book.author}</p>
      <p class="book-year">${book.year} г.</p>
      <p class="book-description">${book.description}</p>
      <button class="book-read" type="button">Читать</button>
    </div>
  `;

  const readButton = bookItem.querySelector('.book-read');
  readButton.addEventListener('click', () => {
    openReader(book.id);
  });

  return bookItem;
}

function renderLibrary() {
  if (!dom.bookList) return;

  dom.bookList.innerHTML = '';
  books.forEach(book => {
    const card = createBookCard(book);
    dom.bookList.appendChild(card);
  });
}


// =============== 8. РЕНДЕР ЧИТАЛКИ (ТОЛЬКО fullText) ===============

function renderReader(book) {
  if (!book) {
    dom.readerTitle.textContent = 'Книга не найдена';
    dom.readerContent.innerHTML = '';
    return;
  }

  dom.readerTitle.textContent = book.title;
  dom.readerContent.innerHTML = '';

  const paragraphs = Array.isArray(book.fullText) ? book.fullText : [];

  paragraphs.forEach(paragraphText => {
    const p = document.createElement('p');
    p.textContent = paragraphText;
    dom.readerContent.appendChild(p);
  });
}


// =============== 9. ВЫСОКОУРОВНЕВЫЕ ДЕЙСТВИЯ ===============

function findBookById(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return undefined;
  return books.find(book => Number(book.id) === num);
}

function openLibrary() {
  showLibrary();
}

function openReader(bookId) {
  const book = findBookById(bookId);

  if (!book) {
    appState.currentBookId = null;
    appState.currentBook = null;
    showLibrary();
    return;
  }

  appState.currentBookId = Number(book.id);
  appState.currentBook = book;

  renderReader(book);
  showReader();
}

// обновили openAdmin, чтобы он работал только с текущей книгой
//сделали мягче //...
function openAdmin() {
  //if (!appState.currentBook) {
  //  // На всякий случай защита: без открытой книги админка не имеет смысла
  //  return;
  //}

  //Пытаемся заполнить форму из текущей книги (если есть)
  fillAdminFormFromCurrentBook();
  // В любом случае показываем экран админки
  showAdmin();
}


// =============== 10. ЛОГИКА АДМИНКИ (ГЕНЕРИРУЕТ ТОЛЬКО fullText) ===============

function generateNextId() {
  const ids = books.map(b => Number(b.id)).filter(n => Number.isFinite(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function handleAdminPreview() {
  const text = dom.adminFulltext.value;
  const paragraphs = splitTextIntoParagraphs(text);

  dom.adminPreviewContent.innerHTML = '';

  paragraphs.forEach(p => {
    const el = document.createElement('p');
    el.textContent = p;
    dom.adminPreviewContent.appendChild(el);
  });

  dom.adminPreviewBlock.classList.remove('hidden');
}
//здесь был handleAdminGenerate
//
//добавили функцию заполнения полей формы Админки из текущей книги
// обновили fillAdminFormFromCurrentBook
function fillAdminFormFromCurrentBook() {
  const book = appState.currentBook;
  if (!book) return;

  dom.adminTitle.value = book.title || '';
  dom.adminDescription.value = book.description || '';
  dom.adminYear.value = book.year || '';

  const paragraphs = Array.isArray(book.fullText) ? book.fullText : [];
  dom.adminFulltext.value = paragraphs.join('\n\n');
}

//добавили «Перезаписать текущую книгу»
// обновили handleAdminSaveUpdate
function handleAdminSaveUpdate() {
  const book = appState.currentBook;
  if (!book) return;

  const title = dom.adminTitle.value.trim();
  const description = dom.adminDescription.value.trim();
  const paragraphs = splitTextIntoParagraphs(dom.adminFulltext.value);
  const yearValue = Number(dom.adminYear.value) || '';

  if (!title || paragraphs.length === 0) {
    alert('Нужно указать название и текст произведения.');
    return;
  }

  book.title = title;
  book.description = description;
  book.year = yearValue;
  book.fullText = paragraphs;

  renderLibrary();
  openReader(book.id);
}

//добавили «Создать новую книгу»
// обновили handleAdminSaveNew
function handleAdminSaveNew() {
  const baseBook = appState.currentBook;
  // даже если currentBook по какой-то причине null, всё равно можно создать новую из формы

  const title = dom.adminTitle.value.trim();
  const description = dom.adminDescription.value.trim();
  const paragraphs = splitTextIntoParagraphs(dom.adminFulltext.value);
  const yearValue = Number(dom.adminYear.value) || new Date().getFullYear();



  if (!title || paragraphs.length === 0) {
    alert('Нужно указать название и текст произведения.');
    return;
  }

  const newId = generateNextId();

  const newBook = {
    id: newId,
    title: title,
    author: baseBook?.author || 'А.П. Чехов',
    year: yearValue,
    description: description,
    cover: baseBook?.cover || 'img/chekhov-default-cover.jpg',
    fullText: paragraphs
  };

  books.push(newBook);

  appState.currentBookId = newBook.id;
  appState.currentBook = newBook;

  renderLibrary();
  openReader(newBook.id);
}

//добавили логику Экспорта
function handleAdminExportBooks() {
  try {
    const json = JSON.stringify(books, null, 2);
    dom.adminBooksJson.value = json;
  } catch (e) {
    console.error('Ошибка при генерации JSON библиотеки', e);
    alert('Ошибка при генерации JSON библиотеки.');
  }
}

// =============== 11. ЗАГРУЗКА КНИГ ===============

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


// =============== 12. ЗАПУСК ПРИЛОЖЕНИЯ (ПОСЛЕ ЗАГРУЗКИ КНИГ) ===============

function runApp() {
  const launchId = getLaunchBookId();

  if (launchId !== null) {
    const book = findBookById(launchId);
    if (book) {
      openReader(book.id);
      return;
    }
  }

  openLibrary();
}


// =============== 13. ИНИЦИАЛИЗАЦИЯ СОБЫТИЙ ===============

function initEvents() {
  if (dom.backToLibraryButton) {
    dom.backToLibraryButton.addEventListener('click', () => {
      openLibrary();
    });
  }

  if (dom.adminOpenButton) {
    dom.adminOpenButton.addEventListener('click', () => {
      openAdmin();
    });
  }

  if (dom.backFromAdminButton) {
    dom.backFromAdminButton.addEventListener('click', () => {
      openReader(appState.currentBookId);
    });
  }

  if (dom.adminPreviewButton) {
    dom.adminPreviewButton.addEventListener('click', handleAdminPreview);
  }

  if (dom.adminSaveUpdateButton) {
    dom.adminSaveUpdateButton.addEventListener('click', handleAdminSaveUpdate);
  }

  if (dom.adminSaveNewButton) {
    dom.adminSaveNewButton.addEventListener('click', handleAdminSaveNew);
  }
  
  if (dom.adminExportBooksButton) {
  dom.adminExportBooksButton.addEventListener('click', handleAdminExportBooks);
  }
  
}


// =============== 14. DOMContentLoaded: СТАРТ ПРИЛОЖЕНИЯ ===============

document.addEventListener('DOMContentLoaded', () => {
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
  }

  if (isAdmin() && dom.adminOpenButton) {
    dom.adminOpenButton.classList.remove('hidden');
  }

  initEvents();

  loadBooks().then(() => {
    books.sort((a, b) => a.year - b.year);  // сортировка по году
    renderLibrary();
    runApp();
  });
});