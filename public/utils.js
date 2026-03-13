/** =============================
 *  Localization
 *  ============================= */
function getText(key, ...args) {
    let text = key.split('.').reduce((o, i) => o && o[i], STRINGS);
    if (!text) return key;
    return text.replace(/\{(\d+)\}/g, (match, number) => {
        return typeof args[number] !== 'undefined' ? args[number] : match;
    });
}

function applyLocalization() {
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
        const key = el.dataset.i18nKey;
        if (key.startsWith('[')) {
            const parts = key.match(/\[(.*?)\](.*)/);
            if (parts) {
                const attribute = parts[1];
                const actualKey = parts[2];
                const text = getText(actualKey);
                el.setAttribute(attribute, text);
                return;
            }
        }
        const text = getText(key);
        el.innerHTML = text;
    });
}

/** =============================
 *  Utilities
 *  ============================= */
const $ = (id) => document.getElementById(id);

function parseMoney(input) {
  if (typeof input === "number") return input;
  const s = String(input || "").replace(/[^0-9.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(n, compact = false) {
    const num = Number(n);
    if (!Number.isFinite(num)) return "0원";
    if (compact) {
        if (Math.abs(num) >= 100000000) return `${parseFloat((num / 100000000).toFixed(2))}억`;
        if (Math.abs(num) >= 10000) return `${parseFloat((num / 10000).toFixed(0))}만`;
    }
    return `${Math.round(num).toLocaleString()}원`;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function parsePct(s) {
  const v = Number(parseFloat(String(s || "").replace(/[^0-9.%]/g, "")));
  return Number.isFinite(v) ? v : 0;
}

function uid() {
  return (crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + "_" + Math.random().toString(16).slice(2);
}
