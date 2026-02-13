// debug-panel.js
(function () {
  function safeJson(obj) {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (e) {
      return String(obj);
    }
  }

  function getQueryParams() {
    const params = {};
    const usp = new URLSearchParams(window.location.search);
    for (const [k, v] of usp.entries()) params[k] = v;
    return params;
  }

  function getHashParams() {
    // поддержка формата #/book/12 или #bookId=12 и т.п.
    return {
      hash: window.location.hash || "",
    };
  }

  function parseStartParamFromInitData(initData) {
    // initData — строка вида "query_id=...&user=...&start_param=xxx..."
    if (!initData || typeof initData !== "string") return null;
    const sp = new URLSearchParams(initData);
    return sp.get("start_param");
  }

  function buildDebugState() {
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;

    const initData = tg && typeof tg.initData === "string" ? tg.initData : null;
    const initDataUnsafe = tg && tg.initDataUnsafe ? tg.initDataUnsafe : null;

    const queryParams = getQueryParams();
    const hashParams = getHashParams();

    const startParamUnsafe =
      initDataUnsafe && typeof initDataUnsafe.start_param === "string"
        ? initDataUnsafe.start_param
        : null;

    const startParamFromInitData = parseStartParamFromInitData(initData);

    const startParamFromUrl =
      queryParams.startapp ||
      queryParams.start ||
      queryParams.start_param ||
      queryParams.bookId ||
      queryParams.id ||
      null;

    // Популярные варианты, которые часто используют в учебных проектах:
    const urlBookId =
      queryParams.bookId ||
      queryParams.id ||
      (queryParams.book ? queryParams.book : null) ||
      null;

    return {
      time: new Date().toISOString(),
      location: {
        href: window.location.href,
        origin: window.location.origin,
        pathname: window.location.pathname,
        search: window.location.search,
        hash: window.location.hash,
        queryParams,
        hashInfo: hashParams,
      },
      telegram: {
        detected: !!tg,
        platform: tg ? tg.platform : null,
        version: tg ? tg.version : null,
        colorScheme: tg ? tg.colorScheme : null,
        isExpanded: tg ? tg.isExpanded : null,
        viewportHeight: tg ? tg.viewportHeight : null,
        viewportStableHeight: tg ? tg.viewportStableHeight : null,
        initData_present: !!initData,
        initData_length: initData ? initData.length : 0,
        initData_first200: initData ? initData.slice(0, 200) : null,
        initDataUnsafe,
        start_param_from_initDataUnsafe: startParamUnsafe,
        start_param_from_initData_string: startParamFromInitData,
      },
      routing_guess: {
        urlBookId_guess: urlBookId,
        start_param_from_url_guess: startParamFromUrl,
      },
    };
  }

  function createPanel() {
    const panel = document.createElement("div");
    panel.id = "debug-panel";
    panel.style.position = "fixed";
    panel.style.left = "8px";
    panel.style.right = "8px";
    panel.style.bottom = "8px";
    panel.style.zIndex = "999999";
    panel.style.maxHeight = "45vh";
    panel.style.overflow = "auto";
    panel.style.background = "rgba(0,0,0,0.88)";
    panel.style.color = "#fff";
    panel.style.borderRadius = "12px";
    panel.style.padding = "10px";
    panel.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace";
    panel.style.fontSize = "12px";
    panel.style.lineHeight = "1.3";
    panel.style.boxShadow = "0 12px 30px rgba(0,0,0,0.35)";

    const header = document.createElement("div");
    header.style.display = "flex";
    header.style.gap = "8px";
    header.style.alignItems = "center";
    header.style.marginBottom = "8px";

    const title = document.createElement("div");
    title.textContent = "DEBUG PANEL (tap Copy → send here)";
    title.style.fontWeight = "700";
    title.style.flex = "1";

    const btnCopy = document.createElement("button");
    btnCopy.textContent = "Copy";
    btnCopy.style.padding = "6px 10px";
    btnCopy.style.borderRadius = "10px";
    btnCopy.style.border = "1px solid rgba(255,255,255,0.25)";
    btnCopy.style.background = "rgba(255,255,255,0.08)";
    btnCopy.style.color = "#fff";
    btnCopy.style.cursor = "pointer";

    const btnClose = document.createElement("button");
    btnClose.textContent = "Close";
    btnClose.style.padding = "6px 10px";
    btnClose.style.borderRadius = "10px";
    btnClose.style.border = "1px solid rgba(255,255,255,0.25)";
    btnClose.style.background = "rgba(255,255,255,0.08)";
    btnClose.style.color = "#fff";
    btnClose.style.cursor = "pointer";

    const pre = document.createElement("pre");
    pre.id = "debug-panel-pre";
    pre.style.whiteSpace = "pre-wrap";
    pre.style.wordBreak = "break-word";
    pre.style.margin = "0";

    header.appendChild(title);
    header.appendChild(btnCopy);
    header.appendChild(btnClose);

    panel.appendChild(header);
    panel.appendChild(pre);

    btnClose.addEventListener("click", () => panel.remove());

    btnCopy.addEventListener("click", async () => {
      const text = pre.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        btnCopy.textContent = "Copied!";
        setTimeout(() => (btnCopy.textContent = "Copy"), 900);
      } catch (e) {
        // fallback
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        btnCopy.textContent = "Copied!";
        setTimeout(() => (btnCopy.textContent = "Copy"), 900);
      }
    });

    return panel;
  }

  function shouldShow() {
    // Показываем, если:
    // 1) есть ?debug=1
    // 2) или Telegram не детектится, но мы в тесте ловим проблему
    const qp = new URLSearchParams(window.location.search);
    if (qp.get("debug") === "1") return true;

    // автопоказ при подозрении на проблему запуска
    const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
    const suspected = !tg || !tg.initData;
    return suspected;
  }

// панель добавляется жестом 0.7сек
let holdTimer = null;

function enableLongPressToToggle(panel) {
  const toggle = () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
  };

  const start = () => {
    holdTimer = setTimeout(toggle, 700);
  };

  const end = () => {
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = null;
  };

  document.addEventListener('touchstart', start, { passive: true });
  document.addEventListener('touchend', end);
  document.addEventListener('mousedown', start);
  document.addEventListener('mouseup', end);
}

  function mount() {
    if (!shouldShow()) return;

    const panel = createPanel();
    document.body.appendChild(panel);
    enableLongPressToToggle(panel);
    panel.style.display = 'none';


    const state = buildDebugState();
    const pre = document.getElementById("debug-panel-pre");
    if (pre) pre.textContent = safeJson(state);

    // Попробуем корректно "развернуть" WebApp, если мы в Telegram
    try {
      const tg = window.Telegram && window.Telegram.WebApp ? window.Telegram.WebApp : null;
      if (tg) {
        tg.ready();
        tg.expand();
      }
    } catch (e) {
      // ignore
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
