// =============== TELEGRAM-PLATFORM.JS  v.1.2 — ПЛАТФОРМЕННЫЙ СЛОЙ TELEGRAM ===============

// Этот файл отвечает только за Telegram-зависимую интеграцию.
// Здесь не храним прикладную логику библиотеки, reader или админки.
// Его задача — изолировать Telegram WebApp API от общего клиентского ядра.

function getTelegramWebApp() {
  if (window.Telegram && Telegram.WebApp) {
    return Telegram.WebApp;
  }
  return null;
}

function initTelegramPlatform() {
  const webApp = getTelegramWebApp();
  if (!webApp) return;

  webApp.ready();
  webApp.expand();

  if (typeof webApp.disableVerticalSwipes === 'function') {
    webApp.disableVerticalSwipes();
  }

  if (typeof webApp.setBackgroundColor === 'function') {
    webApp.setBackgroundColor('#f3efe6');
  }

  if (typeof webApp.setHeaderColor === 'function') {
    webApp.setHeaderColor('#e6dfd2');
  }
}

function getTelegramUserId() {
  try {
    const webApp = getTelegramWebApp();
    if (!webApp || !webApp.initDataUnsafe) return null;

    const user = webApp.initDataUnsafe.user;
    return user && user.id ? Number(user.id) : null;
  } catch (e) {
    console.log('[TG USER ERROR]', e);
    return null;
  }
}

function isTelegramAdmin(adminId) {
  const uid = getTelegramUserId();
  return uid !== null && uid === Number(adminId);
}

// Возвращает сырой стартовый параметр Telegram Mini App.
// Поддерживаем внешний формат:
// - startapp=<id>
// - startapp=<slug>
//
// Примеры значений, которые может вернуть функция:
// - "9"
// - "beglets"
// - null
//
// Важно:
// этот файл только читает параметр из Telegram.
// Преобразование этого значения во внутренний bookId
// выполняется уже в общем клиентском ядре приложения.
function getTelegramStartParam() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('tgWebAppStartParam');

  if (raw == null) return null;

  const normalized = String(raw).trim();
  return normalized || null;
}