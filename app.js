// =============== APP.JS v.1.1 — ТОЧКА ВХОДА ПРИЛОЖЕНИЯ ===============

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initTelegramPlatform === 'function') {
    initTelegramPlatform();
  }

  if (
    typeof isTelegramAdmin === 'function' &&
    isTelegramAdmin(ADMIN_ID) &&
    dom.adminOpenButton
  ) {
    dom.adminOpenButton.classList.remove('hidden');
  }

  if (typeof initEvents === 'function') {
    initEvents();
  }

  if (typeof window.initAdminEvents === 'function') {
    window.initAdminEvents();
  }

  window.addEventListener('scroll', handleReaderScroll, { passive: true });
  window.addEventListener('resize', updateTopProgress, { passive: true });

  loadBooks().then(() => {
    renderRecommended();
    renderAllBooksRow();

    // Получаем исходный стартовый параметр Telegram Mini App.
    // Он может быть:
    // - числовым id книги: startapp=9
    // - slug книги: startapp=beglets
    // - пустым, если приложение открыто без startapp
    const rawStartParam =
      typeof getTelegramStartParam === 'function'
        ? getTelegramStartParam()
        : null;

    // Один раз преобразуем внешний параметр запуска
    // во внутренний числовой id книги.
    // После этого приложение работает только с id.
    const launchBookId =
      typeof resolveLaunchBookId === 'function'
        ? resolveLaunchBookId(rawStartParam)
        : null;

    runApp(launchBookId);
  });
});