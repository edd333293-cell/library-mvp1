// =============== ADM.JS 1.10 — АДМИНСКАЯ ЛОГИКА ===============

function generateNextId() {
  const ids = books.map((b) => Number(b.id)).filter((n) => Number.isFinite(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function transliterateRuToLat(text) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd',
    е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n',
    о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch',
    ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '',
    э: 'e', ю: 'yu', я: 'ya'
  };

  return String(text || '')
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      if (!(lower in map)) return char;
      const converted = map[lower];
      return char === lower
        ? converted
        : converted.charAt(0).toUpperCase() + converted.slice(1);
    })
    .join('');
}

function slugify(text) {
  return transliterateRuToLat(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildBookFolderPath(id) {
  return `data/books/${id}`;
}

function buildDefaultCovers(id) {
  const base = buildBookFolderPath(id);
  return {
    main: `${base}/cover-main.jpg`,
    thumb: `${base}/cover-thumb.jpg`
  };
}

function buildDefaultIllustrations(id) {
  const base = buildBookFolderPath(id);
  return [
    `${base}/pic-01.jpg`,
    `${base}/pic-02.jpg`
  ];
}

function getBookParagraphsForAdmin(book) {
  if (!book) return [];

  if (book?.structure?.type === 'sections' && Array.isArray(book.content)) {
    const paragraphs = [];

    book.content.forEach((section) => {
      if (section?.title) {
        paragraphs.push(`## ${section.title}`);
      }

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

  if (Array.isArray(book.content) && book.content[0] && Array.isArray(book.content[0].paragraphs)) {
    return book.content[0].paragraphs;
  }

  return [];
}

function fillAdminFormFromCurrentBook() {
  const book = appState.currentBook;
  if (!book) return;

  dom.adminTitle.value = book.title || '';
  dom.adminDescription.value = book.description || '';
  dom.adminYear.value = book.yearwriting || '';

  const paragraphs = getBookParagraphsForAdmin(book);
  dom.adminFulltext.value = paragraphs.join('\n\n');
}

function openAdmin() {
  fillAdminFormFromCurrentBook();
  showAdmin();
}

function handleAdminPreview() {
  const text = dom.adminFulltext.value;
  const paragraphs = splitTextIntoParagraphs(text);

  dom.adminPreviewContent.innerHTML = '';

  paragraphs.forEach((paragraph) => {
    const el = document.createElement('p');
    el.textContent = paragraph;
    dom.adminPreviewContent.appendChild(el);
  });

  dom.adminPreviewBlock.classList.remove('hidden');
}

function buildPlainStructureAndContent(paragraphs) {
  return {
    structure: {
      type: 'plain'
    },
    content: [
      {
        paragraphs
      }
    ]
  };
}

function buildBookFilePayload(options = {}) {
  const {
    id,
    baseBook = null,
    preserveCollections = true,
    preserveMedia = true
  } = options;

  const numericId = Number(id);
  const title = dom.adminTitle.value.trim();
  const description = dom.adminDescription.value.trim();
  const paragraphs = splitTextIntoParagraphs(dom.adminFulltext.value);
  const yearValue = Number(dom.adminYear.value) || '';

  if (!title || paragraphs.length === 0) {
    alert('Нужно указать название и текст произведения.');
    return null;
  }

  const plainData = buildPlainStructureAndContent(paragraphs);
  const defaultCovers = buildDefaultCovers(numericId);
  const defaultIllustrations = buildDefaultIllustrations(numericId);

  return {
    id: numericId,
    slug: slugify(title),
    title,
    author: baseBook?.author || 'А.П. Чехов',
    yearwriting: yearValue,
    description,
    collections: preserveCollections && Array.isArray(baseBook?.collections)
      ? [...baseBook.collections]
      : [],
    covers: preserveMedia
      ? {
          main: baseBook?.covers?.main || defaultCovers.main,
          thumb: baseBook?.covers?.thumb || defaultCovers.thumb
        }
      : {
          main: defaultCovers.main,
          thumb: defaultCovers.thumb
        },
    illustrations: preserveMedia && Array.isArray(baseBook?.illustrations)
      ? [...baseBook.illustrations]
      : [...defaultIllustrations],
    structure: plainData.structure,
    content: plainData.content
  };
}

function buildCatalogItemFromBook(book) {
  const numericId = Number(book.id);
  const defaultCovers = buildDefaultCovers(numericId);

  return {
    id: numericId,
    slug: book.slug,
    title: book.title,
    author: book.author,
    yearwriting: book.yearwriting,
    description: book.description,
    collections: Array.isArray(book.collections) ? [...book.collections] : [],
    covers: {
      main: book?.covers?.main || defaultCovers.main,
      thumb: book?.covers?.thumb || defaultCovers.thumb
    },
    structureType: book?.structure?.type || 'plain',
    file: `data/books/${numericId}/book.json`
  };
}

function handleAdminSaveUpdate() {
  const currentBook = appState.currentBook;
  if (!currentBook) return;

  const updatedBook = buildBookFilePayload({
    id: currentBook.id,
    baseBook: currentBook,
    preserveCollections: true,
    preserveMedia: true
  });

  if (!updatedBook) return;

  appState.currentBookId = updatedBook.id;
  appState.currentBook = updatedBook;

  const idx = books.findIndex((item) => Number(item.id) === Number(updatedBook.id));
  if (idx >= 0) {
    books[idx] = buildCatalogItemFromBook(updatedBook);
  }

  renderRecommended();
  renderAllBooksRow();

  fillAdminFormFromCurrentBook();
  showAdmin();

  alert('Текущая книга обновлена в рабочем состоянии админки. Скопируйте JSON каталога и JSON книги.');
}

function handleAdminSaveNew() {
  const baseBook = appState.currentBook;
  const newId = generateNextId();

  const newBook = buildBookFilePayload({
    id: newId,
    baseBook,
    preserveCollections: false,
    preserveMedia: false
  });

  if (!newBook) return;

  const newCatalogItem = buildCatalogItemFromBook(newBook);

  books.push(newCatalogItem);

  appState.currentBookId = newBook.id;
  appState.currentBook = newBook;

  renderRecommended();
  renderAllBooksRow();

  fillAdminFormFromCurrentBook();
  showAdmin();

  alert('Новая книга добавлена в рабочее состояние админки. Скопируйте JSON каталога и JSON книги.');
}

function handleAdminExportBooks() {
  try {
    const catalogJson = JSON.stringify(books, null, 2);
    const currentBookJson = JSON.stringify(appState.currentBook || {}, null, 2);

    if (dom.adminCatalogJson) {
      dom.adminCatalogJson.value = catalogJson;
    }

    if (dom.adminBookJson) {
      dom.adminBookJson.value = currentBookJson;
    }
  } catch (e) {
    console.error('Ошибка при генерации JSON каталога и книги', e);
    alert('Ошибка при генерации JSON каталога и книги.');
  }
}

function initAdminEvents() {
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

window.initAdminEvents = initAdminEvents;