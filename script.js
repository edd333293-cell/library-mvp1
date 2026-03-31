// =============== 0. ГЛОБАЛЬНЫЙ ЛОВЕЦ ОШИБОК ===============
window.addEventListener('error', (e) => {
  console.log('[JS ERROR]', e.message, 'at', e.filename, e.lineno + ':' + e.colno);
});


// =============== 1. ДАННЫЕ / СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===============
// books хранит каталог библиотеки, а не полные тексты всех книг.
let books = [];

const appState = {
  currentView: 'library',   // 'library' | 'reader' | 'admin'
  currentBookId: null,
  currentBook: null
};

// ID администратора проекта.
// Сравнение с Telegram user id выполняется в платформенном слое.
const ADMIN_ID = 6283474141;


// =============== 2. DOM-ССЫЛКИ ===============
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
  adminCatalogJson: document.querySelector('#admin-catalog-json'),
  adminBookJson: document.querySelector('#admin-book-json')
};

const sections = {
  library: dom.librarySection,
  reader: dom.readerSection,
  admin: dom.adminSection
};


// =============== 3. ТЕКСТОВЫЕ УТИЛИТЫ ===============
function splitTextIntoParagraphs(input) {
  let text = input;

  if (Array.isArray(text)) text = text.join('');
  if (typeof text !== 'string') text = String(text ?? '');

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];

  return text
    .split(/\n\s*\n+/)
    .map(p => p.replace(/[ \t]+/g, ' ').trim())
    .filter(p => p.length > 0);
}


// =============== 4. НАВИГАЦИЯ (ЕДИНЫЙ ЦЕНТР) ===============
function showSection(sectionId) {
  Object.entries(sections).forEach(([id, el]) => {
    if (!el) return;
    if (id === sectionId) el.classList.remove('hidden');
    else el.classList.add('hidden');
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


// =============== 5. ГОРИЗОНТАЛЬНЫЕ СПИСКИ И КОМПАКТ-КАРТОЧКИ ===============
function createCompactBookCard(book) {
  const card = document.createElement('div');
  card.className = 'book-card-compact';
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


// =============== 6. РЕНДЕР ЧИТАЛКИ (fullText) ===============
function renderReader(book) {
  if (!book) {
    dom.readerTitle.textContent = 'Книга не найдена';
    dom.readerContent.innerHTML = '';
    return;
  }

  dom.readerTitle.textContent = book.title;
  dom.readerContent.innerHTML = '';

  const yearText = typeof book.yearwriting === 'number' ? `${book.yearwriting} г.` : '';

  const meta = document.createElement('p');
  meta.className = 'reader-meta';
  meta.textContent = `${book.author || ''}${book.author && yearText ? ' · ' : ''}${yearText}`;

  const textWrap = document.createElement('div');
  textWrap.className = 'reader-text-page';

  const paragraphs = Array.isArray(book.fullText) ? book.fullText : [];
  paragraphs.forEach(paragraphText => {
    const p = document.createElement('p');
    p.textContent = paragraphText;
    textWrap.appendChild(p);
  });

  dom.readerContent.appendChild(meta);
  dom.readerContent.appendChild(textWrap);
}


// =============== 7. TELEGRAPH MODE: TOOLBAR + PROGRESS ===============
let readerLastScrollY = 0;
let readerToolbarTicking = false;

function getReaderToolbar() {
  return document.querySelector('.reader-toolbar');
}

function updateTopProgress() {
  const wrap = document.getElementById('top-progress');
  const bar = document.getElementById('top-progress-bar');
  if (!wrap || !bar) return;

  if (appState.currentView !== 'reader') {
    wrap.classList.add('hidden');
    bar.style.width = '0%';
    return;
  }

  wrap.classList.remove('hidden');

  const doc = document.documentElement;
  const scrollTop = doc.scrollTop || window.scrollY || 0;
  const maxScroll = Math.max(1, doc.scrollHeight - doc.clientHeight);
  const progress = Math.max(0, Math.min(1, scrollTop / maxScroll));

  bar.style.width = `${progress * 100}%`;
}

function updateReaderToolbarVisibility() {
  const backButton = document.getElementById('back-to-library');
  if (!backButton) return;

  if (appState.currentView !== 'reader') {
    backButton.classList.remove('reader-back--hidden');
    backButton.classList.add('reader-back--peek');
    updateTopProgress();
    return;
  }

  const currentY = window.scrollY || document.documentElement.scrollTop || 0;

  if (currentY < 20) {
    backButton.classList.remove('reader-back--hidden');
    backButton.classList.add('reader-back--peek');
    readerLastScrollY = currentY;
    updateTopProgress();
    return;
  }

  if (currentY > readerLastScrollY + 8) {
    backButton.classList.add('reader-back--hidden');
    backButton.classList.remove('reader-back--peek');
  }

  if (currentY < readerLastScrollY - 8) {
    backButton.classList.remove('reader-back--hidden');
    backButton.classList.add('reader-back--peek');
  }

  readerLastScrollY = currentY;
  updateTopProgress();
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


// =============== 8. ВЫСОКОУРОВНЕВЫЕ ДЕЙСТВИЯ ===============
function findBookById(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return undefined;
  return books.find(book => Number(book.id) === num);
}

function openLibrary() {
  showLibrary();
}

async function loadBookById(bookId) {
  const catalogItem = findBookById(bookId);
  if (!catalogItem || !catalogItem.file) return null;

  try {
    const response = await fetch(catalogItem.file);
    if (!response.ok) {
      throw new Error('Ошибка загрузки файла книги: ' + response.status);
    }

    const book = await response.json();
    if (!book || typeof book !== 'object') return null;

    return book;
  } catch (err) {
    console.log('[BOOK FILE LOAD ERROR]', err);
    return null;
  }
}

async function openReader(bookId) {
  const catalogItem = findBookById(bookId);

  if (!catalogItem) {
    appState.currentBookId = null;
    appState.currentBook = null;
    showLibrary();
    return;
  }

  const book = await loadBookById(bookId);
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

  const toolbar = getReaderToolbar();
  if (toolbar) {
    toolbar.classList.remove('reader-toolbar--hidden');
  }

  const backButton = document.getElementById('back-to-library');
  if (backButton) {
    backButton.classList.remove(
      'reader-back--hidden',
      'reader-back--pressed'
    );
    backButton.classList.add('reader-back--peek');
  }

  readerLastScrollY = window.scrollY || document.documentElement.scrollTop || 0;
  updateTopProgress();
}


// =============== 9. ЗАГРУЗКА КАТАЛОГА БИБЛИОТЕКИ ===============
function loadBooks() {
  return fetch('data/catalog.json')
    .then(response => {
      if (!response.ok) {
        throw new Error('Ошибка загрузки catalog.json: ' + response.status);
      }
      return response.json();
    })
    .then(data => {
      if (!Array.isArray(data)) {
        throw new Error('Неверный формат catalog.json: ожидается массив');
      }
      books = data;
    })
    .catch(err => {
      console.log('[CATALOG LOAD ERROR]', err);
      books = [];
    });
}


// =============== 10. СТАРТОВАЯ ЛОГИКА ПРИЛОЖЕНИЯ ===============
function runApp(launchBookId = null) {
  if (launchBookId !== null) {
    openReader(launchBookId);
    return;
  }

  openLibrary();
}


// =============== 11. КНОПКА ВОЗВРАТА ИЗ ЧИТАЛКИ ===============
function animateBackToLibrary() {
  const backButton = dom.backToLibraryButton;

  if (!backButton) {
    openLibrary();
    highlightLastReadInAllRow();
    updateTopProgress();
    return;
  }

  setTimeout(() => {
    backButton.classList.remove('reader-back--pressed');

    openLibrary();
    highlightLastReadInAllRow();
    updateTopProgress();
  }, 220);
}


// =============== 12. ИНИЦИАЛИЗАЦИЯ ПОЛЬЗОВАТЕЛЬСКИХ СОБЫТИЙ ===============
function initEvents() {
  if (dom.backToLibraryButton) {
    let backPressed = false;

    dom.backToLibraryButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      backPressed = true;
      dom.backToLibraryButton.classList.add('reader-back--pressed');
    });

    dom.backToLibraryButton.addEventListener('pointerup', (event) => {
      event.preventDefault();
      if (!backPressed) return;

      backPressed = false;
      animateBackToLibrary();
    });

    dom.backToLibraryButton.addEventListener('pointercancel', () => {
      backPressed = false;
      dom.backToLibraryButton.classList.remove('reader-back--pressed');
    });

    dom.backToLibraryButton.addEventListener('pointerleave', () => {
      if (!backPressed) return;

      backPressed = false;
      dom.backToLibraryButton.classList.remove('reader-back--pressed');
    });

    dom.backToLibraryButton.addEventListener('pointerenter', () => {
      if (!backPressed) return;
      dom.backToLibraryButton.classList.add('reader-back--pressed');
    });

    dom.backToLibraryButton.addEventListener('contextmenu', (event) => {
      event.preventDefault();
    });
  }
}