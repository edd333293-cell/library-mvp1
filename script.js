// =============== 0. ГЛОБАЛЬНЫЙ ЛОВЕЦ ОШИБОК ===============
window.addEventListener('error', (e) => {
  console.log('[JS ERROR]', e.message, 'at', e.filename, e.lineno + ':' + e.colno);
});


// =============== 1. ПОМОЩНИК: ID КНИГИ ИЗ URL (tgWebAppStartParam) ===============
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

// Expand только в режимах чтения/админки
function tgExpand() {
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.expand();
  }
}


// =============== 4. DOM-ССЫЛКИ ===============

const dom = {
  // секции
  librarySection: document.querySelector('#library'),
  readerSection: document.querySelector('#reader'),
  adminSection: document.querySelector('#admin'),

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
  adminSaveUpdateButton: document.querySelector('#admin-save-update'),
  adminSaveNewButton: document.querySelector('#admin-save-new'),
  adminExportBooksButton: document.querySelector('#admin-export-books'),
  adminBooksJson: document.querySelector('#admin-books-json')
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

  document.body.classList.remove('library-active', 'reader-active', 'admin-active');

  if (sectionId === 'library') document.body.classList.add('library-active');
  if (sectionId === 'reader') document.body.classList.add('reader-active');
  if (sectionId === 'admin') document.body.classList.add('admin-active');

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


// =============== 7. ГОРИЗОНТАЛЬНЫЕ СПИСКИ И КОМПАКТ-КАРТОЧКИ ===============

function createCompactBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card-compact';

  // запоминаем id книги на DOM-элементе
  card.dataset.bookId = book.id;

  const yearText =
    typeof book.yearwriting === 'number'
      ? `${book.yearwriting} г.`
      : '';

  card.innerHTML = `
    <img class="book-cover" src="${book.cover}" alt="">
    <h3 class="book-title">${book.title}</h3>
    <p class="book-meta">${book.author || ''}${yearText ? ', ' + yearText : ''}</p>
  `;

  card.addEventListener('click', () => {
    if (!book || book.id == null) return;
    openReader(book.id);
  });

  return card;
}

function renderRecommended() {
  const container = document.getElementById('row-recommended');
  if (!container) return;

  container.innerHTML = '';

  const filtered = books.filter(book =>
    Array.isArray(book.collections) &&
    book.collections.includes('recommended')
  );

  filtered.forEach(book => {
    container.appendChild(createCompactBookCard(book));
  });
}

function renderAllBooksRow() {
  const container = document.getElementById('row-all');
  if (!container) return;

  container.innerHTML = '';

  const sorted = [...books].sort(
    (a, b) => (a.yearwriting || 0) - (b.yearwriting || 0)
  );

  sorted.forEach(book => {
    container.appendChild(createCompactBookCard(book));
  });
}

// подсветка/прокрутка карточки последней открытой книги (в "Все произведения")
function highlightLastReadInAllRow() {
  const lastId = appState.currentBookId;
  if (lastId == null) return;

  const container = document.getElementById('row-all');
  if (!container) return;

  const cards = Array.from(container.querySelectorAll('.book-card-compact'));

  cards.forEach(card => {
    card.classList.remove('book-card-compact--current');
  });

  const target = cards.find(card => Number(card.dataset.bookId) === Number(lastId));
  if (!target) return;

  target.classList.add('book-card-compact--current');

  try {
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
      inline: 'center'
    });
  } catch (e) {
    target.scrollIntoView();
  }
}


// =============== 8. РЕНДЕР ЧИТАЛКИ (fullText) ===============

function renderReader(book) {
  if (!book) {
    dom.readerTitle.textContent = 'Книга не найдена';
    dom.readerContent.innerHTML = '';
    return;
  }

  dom.readerTitle.textContent = book.title;
  dom.readerContent.innerHTML = '';

  const meta = document.createElement('p');
  meta.className = 'reader-meta';
  const yearText = typeof book.yearwriting === 'number' ? `${book.yearwriting} г.` : '';
  meta.textContent = `${book.author || ''}${book.author && yearText ? ' · ' : ''}${yearText}`;
  dom.readerContent.appendChild(meta);

  const paragraphs = Array.isArray(book.fullText) ? book.fullText : [];
  paragraphs.forEach(paragraphText => {
    const p = document.createElement('p');
    p.textContent = paragraphText;
    dom.readerContent.appendChild(p);
  });
}

//тул бар
let readerLastScrollY = 0;
let readerToolbarTicking = false;

function getReaderToolbar() {
  return document.querySelector('.reader-toolbar');
}

function updateReaderToolbarVisibility() {
  const toolbar = getReaderToolbar();
  if (!toolbar) return;

  if (appState.currentView !== 'reader') {
    toolbar.classList.remove('reader-toolbar--hidden');
    return;
  }

  const currentY = window.scrollY || document.documentElement.scrollTop || 0;

  // в самом верху всегда показываем toolbar
  if (currentY < 20) {
    toolbar.classList.remove('reader-toolbar--hidden');
    readerLastScrollY = currentY;
    return;
  }

  // скролл вниз -> скрываем
  if (currentY > readerLastScrollY + 8) {
    toolbar.classList.add('reader-toolbar--hidden');
  }

  // скролл вверх -> показываем
  if (currentY < readerLastScrollY - 8) {
    toolbar.classList.remove('reader-toolbar--hidden');
  }

  readerLastScrollY = currentY;
}

function handleReaderScroll() {
  if (!readerToolbarTicking) {
    window.requestAnimationFrame(() => {
      updateReaderToolbarVisibility();
      readerToolbarTicking = false;
    });
    readerToolbarTicking = true;
  }
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

  // expand ТОЛЬКО в читалке
 // tgExpand();

  showReader();
  
  //
  const toolbar = getReaderToolbar();
    if (toolbar) {
      toolbar.classList.remove('reader-toolbar--hidden');
    }
    
    readerLastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  
}

function openAdmin() {
  fillAdminFormFromCurrentBook();

  // expand ТОЛЬКО в админке
 // tgExpand();

  showAdmin();
}


// =============== 10. ЛОГИКА АДМИНКИ ===============

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

function fillAdminFormFromCurrentBook() {
  const book = appState.currentBook;
  if (!book) return;

  dom.adminTitle.value = book.title || '';
  dom.adminDescription.value = book.description || '';
  dom.adminYear.value = book.yearwriting || '';

  const paragraphs = Array.isArray(book.fullText) ? book.fullText : [];
  dom.adminFulltext.value = paragraphs.join('\n\n');
}

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
  book.yearwriting = yearValue;
  book.fullText = paragraphs;

  renderRecommended();
  renderAllBooksRow();
  openReader(book.id);
}

function handleAdminSaveNew() {
  const baseBook = appState.currentBook;

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
    yearwriting: yearValue,
    description: description,
    cover: baseBook?.cover || 'img/chekhov-default-cover.jpg',
    collections: [],
    fullText: paragraphs
  };

  books.push(newBook);

  appState.currentBookId = newBook.id;
  appState.currentBook = newBook;

  renderRecommended();
  renderAllBooksRow();
  openReader(newBook.id);
}

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


// =============== 12. ЗАПУСК ПРИЛОЖЕНИЯ ПОСЛЕ ЗАГРУЗКИ КНИГ ===============

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
      highlightLastReadInAllRow();
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

    // пытаемся открыть настоящий fullscreen (если клиент поддерживает)
    //if (typeof Telegram.WebApp.requestFullscreen === 'function') {
      //Telegram.WebApp.requestFullscreen();
    //}
    // Расширяем WebApp максимально (стабильно работает именно на старте)
    Telegram.WebApp.expand();
    
    // делаем системные значки (статус-бар) читаемыми на светлом фоне
    if (typeof Telegram.WebApp.setColorScheme === 'function') {
      Telegram.WebApp.setColorScheme('light');
    }

    // Чуть “нативнее” — убирает конфликт свайпов Telegram и страницы
    if (typeof Telegram.WebApp.disableVerticalSwipes === 'function') {
      Telegram.WebApp.disableVerticalSwipes();
    }

    // Цвета (можешь оставить свои)
    Telegram.WebApp.setBackgroundColor('#f5f5f5');
    Telegram.WebApp.setHeaderColor('bg_color');
  }

  if (isAdmin() && dom.adminOpenButton) {
    dom.adminOpenButton.classList.remove('hidden');
  }

  initEvents();

  loadBooks().then(() => {
    renderRecommended();
    renderAllBooksRow();
    runApp();
  });
});

window.addEventListener('scroll', handleReaderScroll, { passive: true });