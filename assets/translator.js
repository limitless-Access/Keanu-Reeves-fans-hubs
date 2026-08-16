/**
 * Official Keanu Reeves Fans Hub — Language Translator
 * - Cookie persistence (survives refresh)
 * - Immediate language switch
 * - Works even if script loads before the button HTML
 */
(function () {
  "use strict";

  var COOKIE = "fans_hub_language";
  var LANGS = [
    ["en", "English", "🇺🇸"], ["es", "Español", "🇪🇸"], ["fr", "Français", "🇫🇷"],
    ["de", "Deutsch", "🇩🇪"], ["it", "Italiano", "🇮🇹"], ["pt", "Português", "🇵🇹"],
    ["ru", "Русский", "🇷🇺"], ["zh-CN", "中文 (简体)", "🇨🇳"], ["zh-TW", "中文 (繁體)", "🇹🇼"],
    ["ja", "日本語", "🇯🇵"], ["ko", "한국어", "🇰🇷"], ["ar", "العربية", "🇸🇦"],
    ["hi", "हिन्दी", "🇮🇳"], ["tr", "Türkçe", "🇹🇷"], ["nl", "Nederlands", "🇳🇱"],
    ["pl", "Polski", "🇵🇱"], ["uk", "Українська", "🇺🇦"], ["vi", "Tiếng Việt", "🇻🇳"],
    ["th", "ไทย", "🇹🇭"], ["id", "Bahasa Indonesia", "🇮🇩"], ["ms", "Bahasa Melayu", "🇲🇾"],
    ["sv", "Svenska", "🇸🇪"], ["no", "Norsk", "🇳🇴"], ["da", "Dansk", "🇩🇰"],
    ["fi", "Suomi", "🇫🇮"], ["el", "Ελληνικά", "🇬🇷"], ["he", "עברית", "🇮🇱"],
    ["cs", "Čeština", "🇨🇿"], ["ro", "Română", "🇷🇴"], ["hu", "Magyar", "🇭🇺"],
    ["bg", "Български", "🇧🇬"], ["hr", "Hrvatski", "🇭🇷"], ["sk", "Slovenčina", "🇸🇰"],
    ["sr", "Српски", "🇷🇸"], ["sl", "Slovenščina", "🇸🇮"], ["lt", "Lietuvių", "🇱🇹"],
    ["lv", "Latviešu", "🇱🇻"], ["et", "Eesti", "🇪🇪"], ["fa", "فارسی", "🇮🇷"],
    ["ur", "اردو", "🇵🇰"], ["bn", "বাংলা", "🇧🇩"], ["ta", "தமிழ்", "🇮🇳"],
    ["te", "తెలుగు", "🇮🇳"], ["ml", "മലയാളം", "🇮🇳"], ["kn", "ಕನ್ನಡ", "🇮🇳"],
    ["gu", "ગુજરાતી", "🇮🇳"], ["pa", "ਪੰਜਾਬੀ", "🇮🇳"], ["mr", "मराठी", "🇮🇳"],
    ["sw", "Kiswahili", "🇰🇪"], ["am", "አማርኛ", "🇪🇹"], ["yo", "Yorùbá", "🇳🇬"],
    ["ig", "Igbo", "🇳🇬"], ["ha", "Hausa", "🇳🇬"], ["zu", "isiZulu", "🇿🇦"],
    ["af", "Afrikaans", "🇿🇦"], ["fil", "Filipino", "🇵🇭"], ["my", "မြန်မာ", "🇲🇲"],
    ["si", "සිංහල", "🇱🇰"], ["km", "ខ្មែរ", "🇰🇭"], ["lo", "ລາວ", "🇱🇦"],
    ["ne", "नेपाली", "🇳🇵"], ["ps", "پښتو", "🇦🇫"], ["ku", "Kurdî", "🇮🇶"]
  ];

  function readCookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }

  function writeCookie(name, value, days) {
    days = days == null ? 365 : days;
    var maxAge = days * 24 * 60 * 60;
    var expires = new Date(Date.now() + maxAge * 1000).toUTCString();
    // Path=/ so it works on every page; SameSite=Lax for normal navigation
    document.cookie = name + "=" + encodeURIComponent(value) +
      "; Max-Age=" + maxAge + "; expires=" + expires + "; Path=/; SameSite=Lax";
  }

  function saveLanguage(lang) {
    writeCookie(COOKIE, lang, 365);
    // Google Translate cookie format: /source/target  e.g. /en/es
    if (!lang || lang === "en") {
      // Clear googtrans so page returns to English
      writeCookie("googtrans", "", -1);
      document.cookie = "googtrans=; Max-Age=0; Path=/; SameSite=Lax";
      document.cookie = "googtrans=; Max-Age=0; Path=/; domain=" + location.hostname + "; SameSite=Lax";
    } else {
      writeCookie("googtrans", "/en/" + lang, 365);
    }
  }

  function getCombo() {
    return document.querySelector(".goog-te-combo");
  }

  function setComboValue(lang) {
    var c = getCombo();
    if (!c) return false;
    try {
      c.value = lang;
      // Multiple event types for different browser / GT versions
      c.dispatchEvent(new Event("change", { bubbles: true }));
      if (typeof Event === "function") {
        var ev = document.createEvent ? null : null;
      }
      // Fallback for older engines
      if (typeof c.onchange === "function") c.onchange();
      return true;
    } catch (e) {
      return false;
    }
  }

  function applyLanguage(lang, opts) {
    opts = opts || {};
    lang = (lang || "en").trim();
    saveLanguage(lang);

    var btn = document.getElementById("languageButton");
    var panel = document.getElementById("languagePanel");
    if (panel) panel.hidden = true;
    if (btn) {
      btn.setAttribute("aria-expanded", "false");
      // Update label to current language short name
      var found = LANGS.filter(function (p) { return p[0] === lang; })[0];
      var lbl = btn.querySelector(".lbl");
      if (lbl && found) lbl.textContent = found[1].length > 10 ? found[0].toUpperCase() : found[1];
      else if (lbl) lbl.textContent = lang === "en" ? "Lang" : lang.toUpperCase();
    }

    // Try immediately
    if (setComboValue(lang)) {
      if (lang === "en" && opts.reloadOnEnglish) {
        setTimeout(function () { location.reload(); }, 200);
      }
      return;
    }

    // Wait for Google Translate widget to appear
    var tries = 0;
    var timer = setInterval(function () {
      if (setComboValue(lang)) {
        clearInterval(timer);
        if (lang === "en" && opts.reloadOnEnglish) {
          setTimeout(function () { location.reload(); }, 200);
        }
      }
      if (++tries > 40) clearInterval(timer);
    }, 250);
  }

  window.applySiteLanguage = applyLanguage;

  function renderList(filter) {
    var list = document.getElementById("langList");
    if (!list) return;
    var q = (filter || "").toLowerCase().trim();
    list.innerHTML = "";
    LANGS.forEach(function (pair) {
      var code = pair[0], name = pair[1], flag = pair[2] || "🏳️";
      if (q && name.toLowerCase().indexOf(q) < 0 && code.toLowerCase().indexOf(q) < 0) return;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "lp-item";
      b.setAttribute("data-lang", code);
      b.innerHTML = '<span class="flag">' + flag + '</span><span>' + name + '</span>';
      b.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        applyLanguage(code);
      });
      list.appendChild(b);
    });
  }

  function wireUI() {
    var btn = document.getElementById("languageButton");
    var panel = document.getElementById("languagePanel");
    var search = document.getElementById("langSearch");
    var original = document.getElementById("langOriginal") || document.getElementById("originalLanguage");
    if (!btn || !panel) return false;

    if (btn.dataset.wired === "1") return true;
    btn.dataset.wired = "1";

    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      var open = panel.hidden;
      panel.hidden = !open;
      btn.setAttribute("aria-expanded", String(open));
      if (open) {
        renderList("");
        if (search) {
          search.value = "";
          setTimeout(function () { try { search.focus(); } catch (err) {} }, 40);
        }
      }
    });

    panel.addEventListener("click", function (e) { e.stopPropagation(); });

    document.addEventListener("click", function () {
      panel.hidden = true;
      btn.setAttribute("aria-expanded", "false");
    });

    if (search) {
      search.addEventListener("input", function () {
        renderList(search.value);
      });
    }

    if (original) {
      original.addEventListener("click", function (e) {
        e.preventDefault();
        applyLanguage("en", { reloadOnEnglish: true });
      });
    }

    renderList("");

    // Reflect saved language on the button
    var saved = readCookie(COOKIE) || "en";
    var found = LANGS.filter(function (p) { return p[0] === saved; })[0];
    var lbl = btn.querySelector(".lbl");
    if (lbl && found && saved !== "en") {
      lbl.textContent = found[1].length > 10 ? found[0].toUpperCase() : found[1];
    }

    return true;
  }

  window.initFansHubTranslator = function () {
    var host = document.getElementById("google_translate_element");
    if (!host) {
      host = document.createElement("div");
      host.id = "google_translate_element";
      host.style.display = "none";
      document.body.appendChild(host);
    }
    try {
      if (typeof google !== "undefined" && google.translate && google.translate.TranslateElement) {
        new google.translate.TranslateElement({
          pageLanguage: "en",
          autoDisplay: false,
          multilanguagePage: true
        }, "google_translate_element");
      }
    } catch (e) {
      console.warn("TranslateElement init:", e);
    }

    // Restore language from cookie after widget is ready
    var saved = readCookie(COOKIE) || readCookie("googtrans");
    if (saved && saved.indexOf("/en/") === 0) {
      saved = saved.split("/").pop();
    }
    if (saved && saved !== "en") {
      setTimeout(function () { applyLanguage(saved); }, 600);
      setTimeout(function () { applyLanguage(saved); }, 1500);
    }
  };

  function loadGoogleScript() {
    if (document.querySelector('script[src*="translate.google.com/translate_a/element.js"]')) {
      // Already loading / loaded
      if (typeof google !== "undefined" && google.translate) {
        window.initFansHubTranslator();
      }
      return;
    }
    var s = document.createElement("script");
    s.src = "https://translate.google.com/translate_a/element.js?cb=initFansHubTranslator";
    s.async = true;
    s.onerror = function () {
      console.warn("Google Translate script failed to load (network / region).");
    };
    document.head.appendChild(s);
  }

  function boot() {
    wireUI();
    // If footer was slow, retry wiring a few times
    var attempts = 0;
    var t = setInterval(function () {
      if (wireUI() || ++attempts > 20) clearInterval(t);
    }, 200);
    loadGoogleScript();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
