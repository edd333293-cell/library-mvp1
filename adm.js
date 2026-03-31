// =============== ADM.JS — АДМИНСКАЯ ЛОГИКА ===============

function generateNextId() {
  const ids = books.map(b => Number(b.id)).filter(n => Number.isFinite(n));
  return ids.length ? Math.max(...ids) + 1 : 1;
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

function openAdmin() {
  fillAdminFormFromCurrentBook();
  showAdmin();
}

function handleAdminPreview() {
  const text = dom.adminFulltext.value;
  const paragraphs = splitTextIntoParagraphs(text);

  dom.adminPreviewContent.innerHTML = '';

  paragraphs.forEach(paragraph => {
    const el = document.createElement('p');
    el.textContent = paragraph;
    dom.adminPreviewContent.appendChild(el);
  });

  dom.adminPreviewBlock.classList.remove('hidden');
}

function buildBookFilePayload(baseBook, fallbackId = null) {
  const title = dom.adminTitle.value.trim();
  const description = dom.adminDescription.value.trim();
  const paragraphs = splitTextIntoParagraphs(dom.adminFulltext.value);
  const yearValue = Number(dom.adminYear.value) || '';

  if (!title || paragraphs.length === 0) {
    alert('Нужно указать название и текст произведения.');
    return null;
  }

  return {
    id: baseBook?.id || fallbackId,
    title,
    author: baseBook?.author || 'А.П. Чехов',
    yearwriting: yearValue,
    description,
    cover: baseBook?.cover || 'img/chekhov-default-cover.jpg',
    collections: Array.isArray(baseBook?.collections) ? baseBook.collections : [],
    fullText: paragraphs
  };
}

function buildCatalogItemFromBook(book) {
  return {
    id: book.id,
    title: book.title,
    author: book.author,
    yearwriting: book.yearwriting,
    description: book.description,
    cover: book.cover,
    collections: Array.isArray(book.collections) ? book.collections : [],
    file: `data/books/${book.id}.json`
  };
}

function handleAdminSaveUpdate() {
  const currentBook = appState.currentBook;
  if (!currentBook) return;

  const updatedBook = buildBookFilePayload(currentBook);
  if (!updatedBook) return;

  appState.currentBookId = updatedBook.id;
  appState.currentBook = updatedBook;

  const idx = books.findIndex(item => Number(item.id) === Number(updatedBook.id));
  if (idx >= 0) {
    books[idx] = buildCatalogItemFromBook(updatedBook);
  }

  renderRecommended();
  renderAllBooksRow();
  openReader(updatedBook.id);
}

function handleAdminSaveNew() {
  const baseBook = appState.currentBook;
  const newId = generateNextId();

  const newBook = buildBookFilePayload(baseBook, newId);
  if (!newBook) return;

  books.push(buildCatalogItemFromBook(newBook));

  appState.currentBookId = newBook.id;
  appState.currentBook = newBook;

  renderRecommended();
  renderAllBooksRow();
  openReader(newBook.id);
}

function handleAdminExportBooks() {
  try {
    const exportPayload = {
      catalog: books,
      currentBookFile: appState.currentBook
    };

    dom.adminBooksJson.value = JSON.stringify(exportPayload, null, 2);
  } catch (e) {
    console.error('Ошибка при генерации JSON библиотеки', e);
    alert('Ошибка при генерации JSON библиотеки.');
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