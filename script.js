// =============== 0. ГЛОБАЛЬНЫЙ ЛОВЕЦ ОШИБОК ===============
window.addEventListener('error', (e) => {
  console.log('[JS ERROR]', e.message, 'at', e.filename, e.lineno + ':' + e.colno);
});


// =============== 1. ДАННЫЕ / СОСТОЯНИЕ ПРИЛОЖЕНИЯ ===============
// books хранит каталог библиотеки.
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
  loadingOverlay: document.querySelector('#loading-overlay'),

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

// функция показа/скрытия loader
function showLoadingOverlay() {
  if (!dom.loadingOverlay) return;
  dom.loadingOverlay.classList.remove('hidden');
  dom.loadingOverlay.setAttribute('aria-hidden', 'false');
}

function hideLoadingOverlay() {
  if (!dom.loadingOverlay) return;
  dom.loadingOverlay.classList.add('hidden');
  dom.loadingOverlay.setAttribute('aria-hidden', 'true');
}


// =============== 3. ТЕКСТОВЫЕ УТИЛИТЫ ===============
function splitTextIntoParagraphs(input) {
  let text = input;

  if (Array.isArray(text)) text = text.join('');
  if (typeof text !== 'string') text = String(text ?? '');

  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  if (!text) return [];

  return text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/[ \t]+/g, ' ').trim())
    .filter((p) => p.length > 0);
}

function getBookThumb(book) {
  return book?.covers?.thumb || book?.covers?.main || '';
}

function getBookMainCover(book) {
  return book?.covers?.main || book?.covers?.thumb || '';
}

function getFlatParagraphsFromBook(book) {
  if (!book || !Array.isArray(book.content)) return [];

  const paragraphs = [];

  book.content.forEach((section) => {
    if (Array.isArray(section?.paragraphs)) {
      section.paragraphs.forEach((paragraph) => {
        if (typeof paragraph === 'string' && paragraph.trim()) {
          paragraphs.push(paragraph.trim());
        }
      });
    }
  });

  return paragraphs;
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

  const coverSrc = getBookThumb(book);

  card.innerHTML = `
    <img
      class="book-cover"
      src="${coverSrc}"
      alt="${book.title} — ${book.author || ''}"
      loading="lazy"
    >
    <div class="book-card-compact__body">
      <h3 class="book-title">${book.title}</h3>
      <p class="book-meta">${book.author || ''}${yearText ? ', ' + yearText : ''}</p>
    </div>
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

  const filtered = books.filter((book) =>
    Array.isArray(book.collections) &&
    book.collections.includes('recommended')
  );

  filtered.forEach((book) => {
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

  sorted.forEach((book) => {
    container.appendChild(createCompactBookCard(book));
  });
}

function highlightLastReadInAllRow() {
  const lastId = appState.currentBookId;
  if (lastId == null) return;

  const container = document.getElementById('row-all');
  if (!container) return;

  const cards = Array.from(container.querySelectorAll('.book-card-compact'));

  cards.forEach((card) => {
    card.classList.remove('book-card-compact--current');
  });

  const target = cards.find((card) => Number(card.dataset.bookId) === Number(lastId));
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


// =============== 6. РЕНДЕР ЧИТАЛКИ ===============
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

  if (book?.structure?.type === 'sections' && Array.isArray(book?.structure?.sections)) {
    const sectionMap = new Map();

    if (Array.isArray(book.content)) {
      book.content.forEach((section) => {
        if (section?.id) {
          sectionMap.set(section.id, section);
        }
      });
    }

    book.structure.sections.forEach((sectionInfo) => {
      const sectionContent = sectionInfo?.id ? sectionMap.get(sectionInfo.id) : null;

      if (sectionInfo?.title) {
        const heading = document.createElement('h3');
        heading.className = 'reader-section-title';
        heading.textContent = sectionInfo.title;
        textWrap.appendChild(heading);
      }

      if (Array.isArray(sectionContent?.paragraphs)) {
        sectionContent.paragraphs.forEach((paragraphText) => {
          const p = document.createElement('p');
          p.textContent = paragraphText;
          textWrap.appendChild(p);
        });
      }
    });
  } else {
    const flatParagraphs = getFlatParagraphsFromBook(book);

    flatParagraphs.forEach((paragraphText) => {
      const p = document.createElement('p');
      p.textContent = paragraphText;
      textWrap.appendChild(p);
    });
  }

//вензель
const endOrnament = document.createElement('div');
endOrnament.className = 'reader-end-ornament';
endOrnament.setAttribute('aria-hidden', 'true');
endOrnament.innerHTML = `
  <img
    class="reader-end-ornament__image"
    src="data/ui/reader-end-vignette.svg"
    alt=""
    aria-hidden="true"
  >
`;

textWrap.appendChild(endOrnament);
// конец вензель

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

// Поиск книги по числовому id в уже загруженном каталоге.
// Это основной внутренний способ работы приложения с книгой.
function findBookById(id) {
  const num = Number(id);
  if (!Number.isFinite(num)) return undefined;

  return books.find((book) => Number(book.id) === num);
}

// Поиск книги по slug в уже загруженном каталоге.
// Нужен только на этапе стартового входа,
// если Telegram передал startapp=<slug>.
function findBookBySlug(slug) {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!normalized) return undefined;

  return books.find((book) => {
    return String(book.slug || '').trim().toLowerCase() === normalized;
  });
}

// Преобразует внешний стартовый параметр в внутренний bookId.
//
// Поддерживаем два варианта:
// - startapp=<id>
// - startapp=<slug>
//
// Возвращает:
// - числовой id книги, если удалось определить книгу;
// - null, если параметр пустой, некорректный или книга не найдена.
//
// Важно:
// после этой функции все дальнейшее приложение работает только с id.
function resolveLaunchBookId(rawStartParam) {
  const normalized = String(rawStartParam || '').trim();
  if (!normalized) return null;

  // Если параметр состоит только из цифр, считаем, что это id книги.
  if (/^\d+$/.test(normalized)) {
    const num = Number(normalized);
    return Number.isFinite(num) ? num : null;
  }

  // Иначе считаем, что это slug книги.
  const book = findBookBySlug(normalized);
  return book ? Number(book.id) : null;
}

// Высокоуровневое действие: показать библиотеку.
function openLibrary() {
  showLibrary();
}

// Загружает полную книгу по id.
// Логика такая:
// 1) в catalog.json находим карточку книги;
// 2) из карточки берем путь к book.json;
// 3) загружаем полный файл книги;
// 4) нормализуем структуру данных для дальнейшей работы приложения.
async function loadBookById(bookId) {
  const catalogItem = findBookById(bookId);
  if (!catalogItem || !catalogItem.file) return null;

  try {
    const response = await fetch(catalogItem.file);

    if (!response.ok) {
      throw new Error('Ошибка загрузки файла книги: ' + response.status);
    }

    const rawBook = await response.json();
    if (!rawBook || typeof rawBook !== 'object') return null;

    const normalizedBook = {
      id: Number(rawBook.id),
      slug: rawBook.slug || '',
      title: rawBook.title || '',
      author: rawBook.author || '',
      yearwriting: rawBook.yearwriting || '',
      description: rawBook.description || '',
      collections: Array.isArray(rawBook.collections) ? rawBook.collections : [],
      covers: {
        main: rawBook?.covers?.main || '',
        thumb: rawBook?.covers?.thumb || rawBook?.covers?.main || ''
      },
      illustrations: Array.isArray(rawBook.illustrations) ? rawBook.illustrations : [],
      structure: rawBook?.structure && typeof rawBook.structure === 'object'
        ? rawBook.structure
        : { type: 'plain' },
      content: Array.isArray(rawBook.content) ? rawBook.content : []
    };

    return normalizedBook;
  } catch (err) {
    console.log('[BOOK FILE LOAD ERROR]', err);
    return null;
  }
}

// Высокоуровневое действие: открыть читалку по id книги.
// После стартовой инициализации приложение работает именно так:
// только через id.
async function openReader(bookId) {
  const catalogItem = findBookById(bookId);

  if (!catalogItem) {
    appState.currentBookId = null;
    appState.currentBook = null;
    showLibrary();
    return;
  }

  try {
    showLoadingOverlay();//спиннер

    const loaderStartedAt = Date.now();

    await new Promise((resolve) => requestAnimationFrame(resolve));//чтобы браузер успел реально отрисовать кругляшок до начала загрузки и построения DOM читалки.

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

    const loaderElapsed = Date.now() - loaderStartedAt;
    const minimumLoaderTime = 500; //минимальное время задержки спиннера

    if (loaderElapsed < minimumLoaderTime) {
      await new Promise((resolve) => {
        setTimeout(resolve, minimumLoaderTime - loaderElapsed);
      });
    }
  } finally {
    hideLoadingOverlay();
  }
}

// =============== 9. ЗАГРУЗКА КАТАЛОГА БИБЛИОТЕКИ ===============
function loadBooks() {
  return fetch('data/catalog.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Ошибка загрузки catalog.json: ' + response.status);
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error('Неверный формат catalog.json: ожидается массив');
      }

      books = data.map((item) => ({
        id: Number(item.id),
        slug: item.slug || '',
        title: item.title || '',
        author: item.author || '',
        yearwriting: item.yearwriting || '',
        description: item.description || '',
        collections: Array.isArray(item.collections) ? item.collections : [],
        covers: {
          main: item?.covers?.main || '',
          thumb: item?.covers?.thumb || item?.covers?.main || ''
        },
        structureType: item.structureType || 'plain',
        file: item.file || ''
      }));
    })
    .catch((err) => {
      console.log('[CATALOG LOAD ERROR]', err);
      books = [];
    });
}


// =============== 10. СТАРТОВАЯ ЛОГИКА ПРИЛОЖЕНИЯ ===============

// Старт приложения после загрузки каталога.
//
// На вход приходит уже не slug и не сырой startapp,
// а готовый внутренний launchBookId.
//
// Логика простая:
// - если id книги определен, открываем читалку;
// - если нет, открываем библиотеку.
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