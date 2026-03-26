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