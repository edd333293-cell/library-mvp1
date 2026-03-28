// =============== APP.JS — ТОЧКА ВХОДА ПРИЛОЖЕНИЯ ===============

// Этот файл отвечает только за запуск mini app.
// Здесь не храним прикладную логику библиотеки, reader или админки.
// Его задача — последовательно инициировать уже подготовленные модули проекта.

document.addEventListener('DOMContentLoaded', () => {
  // 1. Инициализация Telegram WebApp на текущем этапе MVP-1.
  // Telegram-специфичные вызовы пока еще остаются здесь.
  // На следующем этапе они будут вынесены в отдельный платформенный слой.
  if (window.Telegram && Telegram.WebApp) {
    Telegram.WebApp.ready();
    Telegram.WebApp.expand();

    if (typeof Telegram.WebApp.disableVerticalSwipes === 'function') {
      Telegram.WebApp.disableVerticalSwipes();
    }

    Telegram.WebApp.setBackgroundColor('#f3efe6');
    Telegram.WebApp.setHeaderColor('#e6dfd2');
  }

  // 2. Показываем кнопку входа в админку только для администратора.
  // Проверка администратора пока остается через существующую функцию isAdmin().
  if (typeof isAdmin === 'function' && isAdmin() && dom.adminOpenButton) {
    dom.adminOpenButton.classList.remove('hidden');
  }

  // 3. Навешиваем пользовательские события.
  if (typeof initEvents === 'function') {
    initEvents();
  }

  // 4. Подключаем админский контур, если он уже загружен.
  if (typeof window.initAdminEvents === 'function') {
    window.initAdminEvents();
  }

  // 5. Подключаем глобальные события reader.
  window.addEventListener('scroll', handleReaderScroll, { passive: true });
  window.addEventListener('resize', updateTopProgress, { passive: true });

  // 6. Загружаем книги, затем делаем первичный рендер и запускаем приложение.
  loadBooks().then(() => {
    renderRecommended();
    renderAllBooksRow();
    runApp();
  });
});