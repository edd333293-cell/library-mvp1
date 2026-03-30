// =============== APP.JS — ТОЧКА ВХОДА ПРИЛОЖЕНИЯ ===============

// Этот файл отвечает за запуск mini app и orchestration.
// Он не хранит прикладную логику библиотеки и не содержит Telegram API напрямую.

document.addEventListener('DOMContentLoaded', () => {
  // 1. Инициализируем Telegram-платформенный слой.
  if (typeof initTelegramPlatform === 'function') {
    initTelegramPlatform();
  }

  // 2. Показываем кнопку входа в админку только для администратора.
  if (
    typeof isTelegramAdmin === 'function' &&
    isTelegramAdmin(ADMIN_ID) &&
    dom.adminOpenButton
  ) {
    dom.adminOpenButton.classList.remove('hidden');
  }

  // 3. Навешиваем пользовательские события.
  if (typeof initEvents === 'function') {
    initEvents();
  }

  // 4. Подключаем админский контур.
  if (typeof window.initAdminEvents === 'function') {
    window.initAdminEvents();
  }

  // 5. Подключаем глобальные события reader.
  window.addEventListener('scroll', handleReaderScroll, { passive: true });
  window.addEventListener('resize', updateTopProgress, { passive: true });

  // 6. Загружаем книги, затем рендерим библиотеку и запускаем приложение.
  loadBooks().then(() => {
    renderRecommended();
    renderAllBooksRow();

    const launchBookId =
      typeof getTelegramLaunchBookId === 'function'
        ? getTelegramLaunchBookId()
        : null;

    runApp(launchBookId);
  });
});