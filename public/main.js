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
 *  Persistence (localStorage & URL)
 *  ============================= */
const STORAGE_KEY = "retire_sim_v2_dynamic_portfolio";

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function loadStateFromSource(source) {
    if (source === 'url') {
        try {
            const hash = window.location.hash.substring(1);
            if (!hash) return null;
            const decoded = decodeURIComponent(hash);
            const compressed = atob(decoded).split('').map(c => c.charCodeAt(0));
            const decompressed = pako.inflate(new Uint8Array(compressed), { to: 'string' });
            return safeJsonParse(decompressed);
        } catch (e) {
            console.error("Failed to load state from URL", e);
            return null;
        }
    } else {
        const raw = localStorage.getItem(STORAGE_KEY);
        return safeJsonParse(raw);
    }
}

function saveStateDebounced() {
  clearTimeout(saveStateDebounced._t);
  saveStateDebounced._t = setTimeout(() => {
    const snapshot = buildSnapshot();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, 150);
}

function resetSavedState() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('onboardingCompleted');
}

/** -----------------------------
 *  Utilities
 *  ----------------------------- */
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

/** =============================
 *  State
 *  ============================= */
const state = {
  startYear: new Date().getFullYear(),
  maxAge: 100,
  dividendTaxRate: 0.154,
  isEventListExpanded: false,
  presets: [...defaultPresets],
  editingPresetId: null,
  inputs: {
    ageNow: 30,
    ageRetire: 65,
    initialInvestment: 0,
    monthlyContribution: 0,
    filterEnabled: false,
    filterAgeFrom: 30,
    filterAgeTo: 100
  },
  events: [],
  results: null,
  chart: null,
  activeTooltip: null,
  editingEventId: null,
  availableIcons: ['❤️','😊','🎵','📍','⭐','✈️','😱']
};

/** =============================
 *  Snapshot / Restore
 *  ============================= */
function buildSnapshot() {
  return {
    version: 2,
    presets: state.presets.map(p => ({ ...p })),
    inputs: { ...state.inputs },
    events: state.events.map(e => ({ ...e })),
    isEventListExpanded: state.isEventListExpanded,
    savedAt: new Date().toISOString()
  };
}

function applySnapshot(snap) {
  if (!snap || snap.version !== 2) {
    state.presets = [...defaultPresets];
    state.events = defaultEvents.map(e => ({ ...e, id: uid(), enabled: true, month: e.month || 1 }));
    return false;
  }
  const builtins = [...defaultPresets];
  const userPresets = Array.isArray(snap.presets) ? snap.presets.filter(p => p && !p.builtin && p.id && p.name) : [];
  state.presets = [...builtins, ...userPresets];
  if (snap.inputs && typeof snap.inputs === 'object') Object.assign(state.inputs, snap.inputs);
  state.inputs.initialInvestment = 0;
  state.inputs.monthlyContribution = 0;
  state.isEventListExpanded = snap.isEventListExpanded || false;
  if (Array.isArray(snap.events)) {
    state.events = snap.events.filter(e => e && e.type && e.age != null).map(e => ({ ...e, id: e.id || uid(), enabled: e.enabled !== false, month: e.month || 1 }));
  } else {
    state.events = defaultEvents.map(e => ({ ...e, id: uid(), enabled: true, month: e.month || 1 }));
  }
  return true;
}

/** =============================
 *  UI binding helpers
 *  ============================= */
function syncStateToUi() {
  $("ageNow").value = state.inputs.ageNow;
  $("ageRetire").value = state.inputs.ageRetire;
  $("filterEnabled").checked = state.inputs.filterEnabled;
  $("filterAgeFrom").value = state.inputs.filterAgeFrom;
  $("filterAgeTo").value = state.inputs.filterAgeTo;
  renderEventList();
  updateFilterButton();
}

function syncUiToStateFromInputs() {
  state.inputs.ageNow = clamp(Number($("ageNow").value || 0), 0, 120);
  state.inputs.ageRetire = clamp(Number($("ageRetire").value || 0), 0, 120);
  state.inputs.filterEnabled = $("filterEnabled").checked;
  state.inputs.filterAgeFrom = clamp(Number($("filterAgeFrom").value || 0), 0, 120);
  state.inputs.filterAgeTo = clamp(Number($("filterAgeTo").value || 0), 0, 120);
}

function updateFilterButton() {
    const btn = $('btnToggleFilter');
    if (state.inputs.filterEnabled) {
        btn.classList.add("bg-primary", "text-white");
        btn.classList.remove("bg-slate-100", "dark:bg-slate-800", "text-slate-500", "dark:text-slate-300");
    } else {
        btn.classList.remove("bg-primary", "text-white");
        btn.classList.add("bg-slate-100", "dark:bg-slate-800", "text-slate-500", "dark:text-slate-300");
    }
}

/** =============================
 *  Presets Management
 *  ============================= */
function renderPresetList() {
    const listEl = $("presetList");
    listEl.innerHTML = "";
    state.presets.forEach(p => {
        const item = document.createElement("div");
        item.className = "flex items-center justify-between gap-2 text-sm p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";
        item.innerHTML = `
            <div class="flex-grow min-w-0">
                <div class="font-bold truncate">${p.name} ${p.builtin ? getText('COMMON.BUILTIN') : ''}</div>
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">수익 ${p.annualReturnPct}% / 배당 ${p.dividendPct}%</div>
            </div>
            ${!p.builtin ? `<button data-del-preset="${p.id}" class="text-red-500 hover:text-red-400 shrink-0"><span class="material-symbols-outlined text-base">delete</span></button>` : '<div class="w-8 shrink-0"></div>'}
        `;
        listEl.appendChild(item);
        item.addEventListener('click', (e) => {
            if (e.target.closest('[data-del-preset]')) return;
            setPresetEditMode(p.id);
        });
        const delBtn = item.querySelector("[data-del-preset]");
        if (delBtn) {
            delBtn.addEventListener("click", () => {
                state.presets = state.presets.filter(pr => pr.id !== p.id);
                if (state.editingPresetId === p.id) setPresetEditMode(null);
                renderPresetList();
                recalcAndRender();
                saveStateDebounced();
            });
        }
    });
}

function setPresetEditMode(presetId) {
    state.editingPresetId = presetId;
    const form = $('newPresetForm');
    const title = $('dlgPresetTitle');
    if (presetId) {
        const preset = state.presets.find(p => p.id === presetId);
        if (!preset) return;
        title.textContent = getText('PRESET_DIALOG.EDIT_TITLE');
        $('dlgPresetName').value = preset.name;
        $('dlgPresetReturn').value = preset.annualReturnPct;
        $('dlgPresetDiv').value = preset.dividendPct;
        $('dlgPresetName').disabled = preset.builtin;
    } else {
        title.textContent = getText('PRESET_DIALOG.ADD_TITLE');
        form.reset();
        $('dlgPresetName').disabled = false;
    }
}

function initPresetManagement() {
    const dlg = $('presetDialog');
    let downTarget = null;
    $('btnAddPreset').addEventListener('click', () => {
        setPresetEditMode(null);
        renderPresetList();
        dlg.showModal();
    });
    $('closePresetDlg').addEventListener('click', () => dlg.close());
    $('newPresetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = ($("dlgPresetName").value || "").trim();
        const r = parsePct($("dlgPresetReturn").value);
        const d = parsePct($("dlgPresetDiv").value);
        if (!name) return;
        if (state.editingPresetId) {
            const index = state.presets.findIndex(p => p.id === state.editingPresetId);
            if (index > -1) {
                const p = state.presets[index];
                p.annualReturnPct = r;
                p.dividendPct = d;
                if (!p.builtin) p.name = name;
            }
        } else {
            const id = "u_" + uid().slice(0, 8);
            state.presets.push({ id, name, annualReturnPct: r, dividendPct: d, builtin: false });
        }
        setPresetEditMode(null);
        renderPresetList();
        recalcAndRender();
        saveStateDebounced();
    });
    dlg.addEventListener("mousedown", e => { downTarget = e.target; });
    dlg.addEventListener("click", (e) => { if (e.target === dlg && downTarget === dlg) dlg.close(); });
    dlg.addEventListener('close', () => setPresetEditMode(null));
}

/** =============================
 *  Events UI
 *  ============================= */
function getEventSubtitle(ev, theme = 'light') {
    const icon = ev.icon ? `<span class="text-base mr-1">${ev.icon}</span>` : '';
    const labelColor = (theme === 'dark') ? 'text-slate-300' : 'text-slate-800 dark:text-slate-100';
    const labelPart = ev.label ? `<span class="font-bold ${labelColor}">${ev.label}:</span>` : '';
    const content = labelPart ? `${icon}${labelPart}` : icon;

    switch (ev.type) {
        case 'portfolio':
            const preset = state.presets.find(p => p.id === ev.presetId);
            return getText('EVENT_CARD.SUBTITLE_PORTFOLIO', preset ? preset.name : '알 수 없음', ev.weight);
        case 'monthly':
            return getText('EVENT_CARD.SUBTITLE_MONTHLY', content, fmtMoney(ev.amount, true));
        case 'lump':
            return ev.amount >= 0 ? getText('EVENT_CARD.SUBTITLE_LUMP_IN', content, fmtMoney(Math.abs(ev.amount), true)) : getText('EVENT_CARD.SUBTITLE_LUMP_OUT', content, fmtMoney(Math.abs(ev.amount), true));
        case 'withdrawal':
            return getText('EVENT_CARD.SUBTITLE_WITHDRAWAL', content, fmtMoney(ev.amount, true));
        case 'income':
            return getText('EVENT_CARD.SUBTITLE_INCOME', content, fmtMoney(ev.amount, true));
        default:
            return getText('EVENT_CARD.UNKNOWN_EVENT');
    }
}


function createEventCard(ev) {
    let borderClass, pillBgClass, pillText;
    const subtitle = getEventSubtitle(ev);
    switch (ev.type) {
        case 'portfolio':
            borderClass = "border-purple-500"; pillBgClass = "bg-purple-500"; pillText = getText('EVENT_CARD.PILL_PORTFOLIO'); break;
        case 'monthly':
            borderClass = "border-primary"; pillBgClass = "bg-primary"; pillText = getText('EVENT_CARD.PILL_MONTHLY'); break;
        case 'lump':
            borderClass = "border-slate-500"; pillBgClass = "bg-slate-500"; pillText = getText('EVENT_CARD.PILL_LUMP'); break;
        case 'withdrawal':
            borderClass = "border-emerald-500"; pillBgClass = "bg-emerald-500"; pillText = getText('EVENT_CARD.PILL_WITHDRAWAL'); break;
        case 'income':
            borderClass = "border-sky-500"; pillBgClass = "bg-sky-500"; pillText = getText('EVENT_CARD.PILL_INCOME'); break;
        default: 
            pillText = ""; borderClass = "border-slate-300"; pillBgClass = "bg-slate-300";
    }
    const pill = `<span class="px-2 py-0.5 ${pillBgClass} text-white text-[10px] font-bold rounded-full uppercase">${pillText}</span>`;
    const node = document.createElement("div");
    node.className = `p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border-l-4 ${borderClass} relative transition-opacity`;
    if (!ev.enabled) node.classList.add('opacity-40');
    node.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">${pill} <span class="text-[10px] text-slate-400 font-bold">${ev.month || 1}월부터</span></div>
          <p class="text-sm text-slate-500 mt-1 flex items-center">${subtitle}</p>
        </div>
        <div class="flex items-center">
            <button class="text-slate-400 hover:text-primary transition-colors shrink-0" data-toggle="${ev.id}" title="${ev.enabled ? getText('EVENT_CARD.TOOLTIP_DISABLE') : getText('EVENT_CARD.TOOLTIP_ENABLE')}"><span class="material-symbols-outlined text-sm">${ev.enabled ? 'visibility' : 'visibility_off'}</span></button>
            <button class="text-slate-400 hover:text-primary transition-colors shrink-0" data-edit="${ev.id}" title="${getText('EVENT_CARD.EDIT_TOOLTIP')}"><span class="material-symbols-outlined text-sm">edit</span></button>
            <button class="text-slate-400 hover:text-red-500 transition-colors shrink-0" data-del="${ev.id}" title="${getText('EVENT_CARD.DELETE_TOOLTIP')}"><span class="material-symbols-outlined text-sm">delete</span></button>
         </div>
      </div>
    `;
    node.querySelector("[data-toggle]").addEventListener("click", () => {
        const event = state.events.find(e => e.id === ev.id);
        if(event) {
            event.enabled = !event.enabled;
            recalcAndRender();
            saveStateDebounced();
        }
    });
    node.querySelector("[data-del]").addEventListener("click", () => {
      state.events = state.events.filter(e => e.id !== ev.id);
      recalcAndRender();
      saveStateDebounced();
    });
    node.querySelector("[data-edit]").addEventListener("click", () => openEventDialog(ev.id));
    return node;
}

function renderEventList() {
    const wrap = $("eventList");
    wrap.innerHTML = "";
    if (typeof state.isEventListExpanded === 'undefined') state.isEventListExpanded = false;
    const sortedEvents = [...state.events].sort((a,b) => {
        if (a.age !== b.age) return a.age - b.age;
        return (a.month || 1) - (b.month || 1);
    });
    if (sortedEvents.length === 0) {
        wrap.innerHTML = `<div class="text-[11px] text-slate-500 dark:text-slate-400">${getText('SCENARIO.NO_EVENTS')}</div>`;
        return;
    }
    const eventGroups = [];
    const eventsByAge = {};
    sortedEvents.forEach(ev => {
        if (!eventsByAge[ev.age]) {
            const newGroup = { age: ev.age, events: [] };
            eventsByAge[ev.age] = newGroup;
            eventGroups.push(newGroup);
        }
        eventsByAge[ev.age].events.push(ev);
    });
    const showAll = state.isEventListExpanded || eventGroups.length <= 5;
    const groupsToShow = showAll ? eventGroups : eventGroups.slice(0, 5);
    const container = document.createElement('div');
    container.className = 'relative';
    const line = document.createElement('div');
    line.className = 'absolute left-[15px] top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-700';
    container.appendChild(line);
    const rowsContainer = document.createElement('div');
    rowsContainer.className = 'relative z-10';
    container.appendChild(rowsContainer);
    groupsToShow.forEach(group => {
        const row = document.createElement('div');
        row.className = 'flex items-start gap-4 pt-4 first:pt-0';
        const timelinePart = document.createElement('div');
        timelinePart.className = 'w-8 flex-shrink-0 flex justify-center pt-3';
        const dotWrapper = document.createElement('div');
        dotWrapper.className = 'w-3 h-3 bg-primary rounded-full ring-4 ring-white dark:ring-slate-900 relative';
        const ageLabel = document.createElement('span');
        ageLabel.className = 'absolute -top-1.5 right-full mr-2 text-[10px] font-bold text-slate-500 dark:text-slate-400 whitespace-nowrap';
        ageLabel.textContent = `${group.age}세`;
        dotWrapper.appendChild(ageLabel);
        timelinePart.appendChild(dotWrapper);
        row.appendChild(timelinePart);
        const cardsPart = document.createElement('div');
        cardsPart.className = 'flex-grow space-y-3 min-w-0';
        group.events.forEach(ev => { cardsPart.appendChild(createEventCard(ev)); });
        row.appendChild(cardsPart);
        rowsContainer.appendChild(row);
    });
    wrap.appendChild(container);
    if (eventGroups.length > 5) {
        const btnContainer = document.createElement('div');
        btnContainer.className = 'flex items-start gap-4 pt-3';
        const spacer = document.createElement('div');
        spacer.className = 'w-8 flex-shrink-0';
        btnContainer.appendChild(spacer);
        const btnWrapper = document.createElement('div');
        btnWrapper.className = 'flex-grow';
        const btn = document.createElement('button');
        btn.id = 'btnToggleEventList';
        btn.className = 'text-primary hover:text-secondary text-xs font-bold uppercase tracking-wider flex items-center gap-1';
        btn.innerHTML = state.isEventListExpanded ? `<span class="material-symbols-outlined text-sm">unfold_less</span> ${getText('SCENARIO.VIEW_LESS')}` : `<span class="material-symbols-outlined text-sm">unfold_more</span> ${getText('SCENARIO.VIEW_MORE', eventGroups.length - 5)}`;
        btn.addEventListener('click', () => {
            state.isEventListExpanded = !state.isEventListExpanded;
            renderEventList();
            saveStateDebounced();
        });
        btnWrapper.appendChild(btn);
        btnContainer.appendChild(btnWrapper);
        wrap.appendChild(btnContainer);
    }
}

function openEventDialog(eventId = null) {
    const dlg = $("eventDialog");
    const title = $("dlgEventTitle");
    const saveBtn = $("dlgSave");
    state.editingEventId = eventId;
    if (eventId) {
        const eventToEdit = state.events.find(e => e.id === eventId);
        if (!eventToEdit) {
            console.error("Event not found:", eventId);
            state.editingEventId = null;
            return;
        }
        title.textContent = getText("EVENT_DIALOG.EDIT_TITLE");
        saveBtn.textContent = getText("EVENT_DIALOG.SAVE_BUTTON");
        $("dlgAge").value = eventToEdit.age;
        $("dlgMonth").value = eventToEdit.month || 1;
        $("dlgType").value = eventToEdit.type;
        $("dlgLabel").value = eventToEdit.label || "";
        $("dlgAmount").value = (eventToEdit.amount || "").toLocaleString();
        $('dlgWeight').value = eventToEdit.weight || 10;
        const presetSelect = $("dlgPresetId");
        presetSelect.innerHTML = state.presets.map(p => `<option value="${p.id}" ${p.id === eventToEdit.presetId ? 'selected' : ''}>${p.name}</option>`).join('');
        renderIconPicker(eventToEdit.icon);
    } else {
        title.textContent = getText("EVENT_DIALOG.ADD_TITLE");
        saveBtn.textContent = getText("EVENT_DIALOG.ADD_BUTTON");
        const ageNow = state.inputs.ageNow;
        $("dlgAge").value = clamp(ageNow + 5, 0, 120);
        $("dlgMonth").value = 1;
        $("dlgType").value = "portfolio";
        $("dlgLabel").value = "";
        $("dlgAmount").value = "";
        $('dlgWeight').value = 10;
        const presetSelect = $("dlgPresetId");
        presetSelect.innerHTML = state.presets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
        renderIconPicker();
    }
    updateDialogFields();
    dlg.showModal();
}

function renderIconPicker(selectedIcon = null) {
    const iconContainer = $('dlgIcons');
    iconContainer.innerHTML = '';
    state.availableIcons.forEach(icon => {
        const iconEl = document.createElement('div');
        iconEl.className = 'p-2 cursor-pointer';
        iconEl.textContent = icon;
        if (icon === selectedIcon) {
            iconEl.classList.add('selected-icon');
        }
        iconEl.addEventListener('click', () => {
            const currentSelected = iconContainer.querySelector('.selected-icon');
            if (currentSelected) {
                currentSelected.classList.remove('selected-icon');
            }
            iconEl.classList.add('selected-icon');
        });
        iconContainer.appendChild(iconEl);
    });
}

function getSelectedIcon() {
    const selectedEl = $('dlgIcons').querySelector('.selected-icon');
    return selectedEl ? selectedEl.textContent : null;
}

function updateDialogFields() {
    const typeSelect = $("dlgType");
    const fieldsPortfolio = $('dlgFieldsPortfolio');
    const fieldsMonetary = $('dlgFieldsMonetary');
    const infoEl = $('dlgInfo');
    const type = typeSelect.value;
    fieldsPortfolio.classList.toggle('hidden', type !== 'portfolio');
    fieldsMonetary.classList.toggle('hidden', type === 'portfolio');
    let infoKey;
    switch(type) {
        case 'portfolio': infoKey = 'INFO_PORTFOLIO'; break;
        case 'monthly': infoKey = 'INFO_MONTHLY'; break;
        case 'lump': infoKey = 'INFO_LUMP'; break;
        case 'withdrawal': infoKey = 'INFO_WITHDRAWAL'; break;
        case 'income': infoKey = 'INFO_INCOME'; break;
        default: infoKey = '';
    }
    infoEl.textContent = infoKey ? getText('EVENT_DIALOG.' + infoKey) : '';
}

function initEventDialog() {
    const dlg = $("eventDialog");
    const form = dlg.querySelector('form');
    const typeSelect = $("dlgType");
    let downTarget = null;

    $("btnAddEvent").addEventListener("click", () => openEventDialog());
    typeSelect.addEventListener('change', updateDialogFields);

    const closeButtons = ["dlgCancel", "dlgCloseX"];
    closeButtons.forEach(id => {
        const btn = $(id);
        if (btn) {
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                dlg.close();
            });
        }
    });

    form.addEventListener('submit', (e) => {
        if (e.submitter && e.submitter.id !== 'dlgSave') return;
        
        e.preventDefault();
        const age = clamp(Number($("dlgAge").value || 0), 0, 120);
        const month = Number($("dlgMonth").value || 1);
        const type = typeSelect.value;
        let eventData = { age, month, type };

        if (type === 'portfolio') {
            eventData.presetId = $('dlgPresetId').value;
            eventData.weight = clamp(Number($('dlgWeight').value), 1, 10);
        } else {
            eventData.amount = parseMoney($("dlgAmount").value);
            eventData.label = $('dlgLabel').value.trim();
            eventData.icon = getSelectedIcon();
        }

        if (state.editingEventId) {
            const index = state.events.findIndex(e => e.id === state.editingEventId);
            if (index !== -1) {
                state.events[index] = { ...state.events[index], ...eventData };
            }
        } else {
            eventData.id = uid();
            eventData.enabled = true;
            state.events.push(eventData);
        }

        state.editingEventId = null;
        recalcAndRender();
        saveStateDebounced();
        dlg.close();
    });

    dlg.addEventListener("mousedown", e => { downTarget = e.target; });
    dlg.addEventListener("click", (e) => { if (e.target === dlg && downTarget === dlg) dlg.close(); });
    dlg.addEventListener('close', () => { state.editingEventId = null; });
}



/** =============================
 *  Simulation Core
 *  ============================= */
function getActivePortfolio(age, month) {
    const portfolioEvents = state.events.filter(e => e.type === 'portfolio' && e.enabled && (e.age < age || (e.age === age && (e.month || 1) <= month))).sort((a,b) => {
        if (a.age !== b.age) return b.age - a.age;
        return (b.month || 1) - (a.month || 1);
    });
    if (!portfolioEvents.length) return [];
    const latestAge = portfolioEvents[0].age;
    const latestMonth = portfolioEvents[0].month || 1;
    const activeEvents = portfolioEvents.filter(e => e.age === latestAge && (e.month || 1) === latestMonth);
    const totalWeight = activeEvents.reduce((sum, e) => sum + e.weight, 0);
    if (totalWeight === 0) return [];
    return activeEvents.map(e => {
        const preset = state.presets.find(p => p.id === e.presetId);
        return { preset: preset || { annualReturnPct: 0, dividendPct: 0, name: 'Unknown' }, weight: e.weight, percentage: e.weight / totalWeight };
    });
}

function getPortfolioSignature(portfolio) {
    if (!portfolio || portfolio.length === 0) return '';
    return portfolio.map(p => `${p.preset.id}:${p.percentage.toFixed(4)}`).sort().join('|');
}

function simulate() {
    syncUiToStateFromInputs();
    const { ageNow, ageRetire, initialInvestment } = state.inputs;
    const endAge = state.maxAge;
    const startYear = state.startYear;
    const activeEvents = state.events.filter(e => e.enabled);

    const calculationStartAge = ageNow;
    const years = [];
    let portfolioState = [];
    let uninvestedCash = 0;

    let initialPortfolioConfig = getActivePortfolio(calculationStartAge, 1);
    if (initialPortfolioConfig.length > 0) {
        portfolioState = initialPortfolioConfig.map(p => ({ ...p, balance: 0, yearReturn: 0, yearDividend: 0 }));
    }
    let lastPortfolioSignature = getPortfolioSignature(initialPortfolioConfig);

    for (let age = calculationStartAge; age <= endAge; age++) {
        const year = startYear + (age - ageNow);
        portfolioState.forEach(p => { p.yearReturn = 0; p.yearDividend = 0; });

        let yContr = 0, yReturn = 0, yDiv = 0, yWithdrawal = 0, yIncome = 0;
        let monthlySnapshots = [];

        for (let m = 1; m <= 12; m++) {
            let mReturn = 0, mDiv = 0, mWithdrawal = 0, mIncome = 0;

            // 1. Portfolio change check
            let currentPortfolioConfig = getActivePortfolio(age, m);
            const currentPortfolioSignature = getPortfolioSignature(currentPortfolioConfig);
            if (currentPortfolioSignature !== lastPortfolioSignature && currentPortfolioSignature !== '') {
                const totalBalance = portfolioState.reduce((sum, p) => sum + p.balance, 0) + uninvestedCash;
                portfolioState = currentPortfolioConfig.map(p => ({ ...p, balance: totalBalance * p.percentage, yearReturn: 0, yearDividend: 0 }));
                uninvestedCash = 0;
                lastPortfolioSignature = currentPortfolioSignature;
            }

            // 2. Active values lookup
            const getVal = (type) => activeEvents.filter(e => e.type === type && (e.age < age || (e.age === age && (e.month || 1) <= m))).sort((a,b) => (b.age - a.age) || ((b.month || 1) - (a.month || 1)))[0]?.amount ?? 0;
            const activeMonthly = getVal("monthly");
            const withdrawalMonthly = getVal("withdrawal");
            const incomeMonthly = getVal("income");
            mIncome = incomeMonthly;

            let lumpSum = activeEvents.filter(e => e.type === 'lump' && e.age === age && (e.month || 1) === m).reduce((sum, e) => sum + e.amount, 0);
            if (age === ageNow && m === 1) lumpSum += initialInvestment;

            // 3. Cash flow apply
            const monthlyContribution = activeMonthly + (lumpSum > 0 ? lumpSum : 0);
            yContr += monthlyContribution;
            uninvestedCash += monthlyContribution;
            yIncome += mIncome;

            // 4. Investment
            if (uninvestedCash > 0) {
                if (portfolioState.length > 0) {
                    const totalInvested = portfolioState.reduce((sum, p) => sum + p.balance, 0);
                    if (totalInvested > 0) portfolioState.forEach(p => { p.balance += uninvestedCash * (p.balance / totalInvested); });
                    else portfolioState.forEach(p => { p.balance += uninvestedCash * p.percentage; });
                    uninvestedCash = 0;
                } else if (currentPortfolioConfig.length > 0) {
                    portfolioState = currentPortfolioConfig.map(p => ({ ...p, balance: uninvestedCash * p.percentage, yearReturn: 0, yearDividend: 0 }));
                    uninvestedCash = 0;
                }
            }

            // 5. Growth
            portfolioState.forEach(p => {
                const r = p.balance * (p.preset.annualReturnPct / 100 / 12);
                const d = p.balance * (p.preset.dividendPct / 100 / 12) * (1 - state.dividendTaxRate);
                p.balance += r + d; p.yearReturn += r; p.yearDividend += d;
                mReturn += r; mDiv += d; yReturn += r; yDiv += d;
            });

            // 6. Withdrawal
            const netWithdrawalNeeded = Math.max(0, withdrawalMonthly - incomeMonthly);
            const lumpSumWithdrawal = lumpSum < 0 ? Math.abs(lumpSum) : 0;
            const totalWithdrawalNeeded = netWithdrawalNeeded + lumpSumWithdrawal;

            if (totalWithdrawalNeeded > 0) {
                let totalDrawable = portfolioState.reduce((sum, p) => sum + p.balance, 0);
                const drawAmount = Math.min(totalDrawable, totalWithdrawalNeeded);
                mWithdrawal = drawAmount; yWithdrawal += drawAmount;
                if (drawAmount > 0) {
                    const fraction = drawAmount / totalDrawable;
                    portfolioState.forEach(p => { p.balance -= p.balance * fraction; });
                }
            }

            monthlySnapshots.push({
                month: m, contribution: monthlyContribution, returnEarned: mReturn,
                dividends: mDiv, withdrawal: mWithdrawal, mIncome: mIncome,
                cashFlow: mIncome + mWithdrawal,
                balance: portfolioState.reduce((sum, p) => sum + p.balance, 0) + uninvestedCash
            });
        }

        const endBalance = portfolioState.reduce((sum, p) => sum + p.balance, 0) + uninvestedCash;
        let detailedPortfolioResult = portfolioState.map(p => ({ name: p.preset.name, balance: p.balance, return: p.yearReturn, dividend: p.yearDividend }));
        if (uninvestedCash > 0) detailedPortfolioResult.push({ name: getText('TABLE.UNINVESTED_CASH'), balance: uninvestedCash, return: 0, dividend: 0 });

        years.push({
            year, age, annualContribution: yContr,
            annualCashFlow: yIncome + yWithdrawal,
            annualWithdrawal: yWithdrawal, returnEarned: yReturn, dividends: yDiv,
            endBalance, portfolio: getActivePortfolio(age, 12),
            detailedPortfolio: detailedPortfolioResult, monthlyData: monthlySnapshots
        });
    }
    return { years, startYear, ageNow, endAge, ageRetire };
}

/** =============================
 *  Render table + Chart
 *  ============================= */
function buildAnnualRow(y) {
    const fullPortfolioTitle = y.portfolio.map(p => `${p.preset.name}: ${(p.percentage*100).toFixed(0)}%`).join(', ');
    let portfolioDisplayHtml;
    if (y.portfolio.length === 0) {
        portfolioDisplayHtml = y.endBalance > 0 ? `<span class="text-xs text-amber-500">${getText('TABLE.UNINVESTED_CASH')}</span>` : `<span class="text-xs text-slate-400">${getText('TABLE.PORTFOLIO_UNDEFINED')}</span>`;
    } else {
        const itemsToDisplay = y.portfolio.slice(0, 2);
        let htmlItems = itemsToDisplay.map(p => `<div class="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300">${p.preset.name}: ${(p.percentage * 100).toFixed(0)}%</div>`);
        if (y.portfolio.length > 2) htmlItems[1] = `<div class="flex items-center gap-1.5">${htmlItems[1]} <span class="font-bold">...</span></div>`;
        portfolioDisplayHtml = `<div class="flex flex-col items-center gap-1">${htmlItems.join('')}</div>`;
    }

    let highlight = '';
    const eventsAtAge = state.events.filter(e => e.age === y.age && e.type !== 'portfolio');
    if (y.age === state.inputs.ageRetire) highlight = "bg-emerald-50/60 dark:bg-emerald-900/10";
    else if (eventsAtAge.length > 0) highlight = "bg-teal-50/60 dark:bg-teal-900/20";
    
    let ageExtra = [];
    if (y.age === state.inputs.ageRetire) ageExtra.push('❤️');
    ageExtra.push(...eventsAtAge.map(e => e.icon || ' '));
    const ageExtraHtml = ageExtra.filter(i => i.trim()).join('');

    return `
    <tr class="annual-row ${highlight} hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group cursor-pointer" data-year="${y.year}">
      <td class="px-2 py-2.5 font-bold text-slate-900 dark:text-slate-100 text-center relative">
        <div class="absolute left-1 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-primary transition-colors">
            <span class="material-symbols-outlined text-sm toggle-icon">chevron_right</span>
        </div>
        <div class="flex flex-col">
          <span>${y.year}</span>
          <span class="text-xs text-slate-400">${y.age}세 <span class="text-base ml-1">${ageExtraHtml}</span></span>
        </div>
      </td>
      <td class="px-2 py-2.5 font-medium text-slate-600 dark:text-slate-400">${fmtMoney(y.annualContribution, true)}</td>
      <td class="px-2 py-2.5 font-bold text-primary">+${fmtMoney(y.returnEarned, true)}</td>
      <td class="px-2 py-2.5 font-medium text-slate-600 dark:text-slate-400">${fmtMoney(y.dividends, true)}</td>
      <td class="px-2 py-2.5 font-medium text-red-600 dark:text-red-400 hidden">-${fmtMoney(y.annualWithdrawal, true)}</td>
      <td class="px-2 py-2.5 font-black">${fmtMoney(y.endBalance, true)}</td>
      <td class="px-2 py-2.5 text-center" title="${fullPortfolioTitle}">${portfolioDisplayHtml}</td>
      <td class="px-2 py-2.5 font-medium text-sky-600 dark:text-sky-300">+${fmtMoney(y.annualCashFlow, true)}</td>
    </tr>
  `;
}

function buildMonthlyDetailRow(y) {
    const monthlyHtml = (y.monthlyData || []).map(m => `
        <tr class="text-xs border-b border-slate-50 dark:border-slate-800/50 last:border-0">
            <td class="px-3 py-2 text-center font-bold text-slate-400">${m.month}월</td>
            <td class="px-3 py-2 text-slate-500">${fmtMoney(m.contribution, true)}</td>
            <td class="px-3 py-2 text-green-600 font-medium">+${fmtMoney(m.returnEarned, true)}</td>
            <td class="px-3 py-2 text-blue-500 font-medium">${fmtMoney(m.dividends, true)}</td>
            <td class="px-3 py-2 font-bold text-sky-600 dark:text-sky-300">+${fmtMoney(m.cashFlow, true)}</td>
            <td class="px-3 py-2 font-bold text-slate-700 dark:text-slate-300 text-right">${fmtMoney(m.balance, true)}</td>
        </tr>
    `).join('');

    return `
    <tr class="detail-row hidden bg-slate-50/50 dark:bg-slate-900/40" data-year-detail="${y.year}">
        <td colspan="8" class="p-0">
            <div class="px-2 py-3 bg-slate-50/30 dark:bg-slate-900/20 border-y border-slate-100 dark:border-slate-800">
                <div class="max-w-3xl mx-auto overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
                    <table class="w-full text-left border-collapse">
                        <thead class="bg-slate-50 dark:bg-slate-900 text-xs uppercase font-bold text-slate-400 border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th class="px-3 py-2 text-center w-16">월</th>
                                <th class="px-3 py-2">투자금</th>
                                <th class="px-3 py-2">수익</th>
                                <th class="px-3 py-2">배당금</th>
                                <th class="px-3 py-2">순 현금흐름</th>
                                <th class="px-3 py-2 text-right">기말 잔고</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 dark:divide-slate-900">${monthlyHtml}</tbody>
                    </table>
                </div>
            </div>
        </td>
    </tr>
    `;
}

function passesFilter(y) {
  if (!state.inputs.filterEnabled) return true;
  const from = Math.min(state.inputs.filterAgeFrom, state.inputs.filterAgeTo);
  const to = Math.max(state.inputs.filterAgeFrom, state.inputs.filterAgeTo);
  return y.age >= from && y.age <= to;
}

function renderAnnualTable(results) {
    const tbody = $("annualTbody");
    const filtered = results.years.filter(passesFilter);
    let html = "";
    filtered.forEach(y => { html += buildAnnualRow(y); html += buildMonthlyDetailRow(y); });
    tbody.innerHTML = html;
    tbody.querySelectorAll('.annual-row').forEach(row => {
        row.addEventListener('click', () => {
            const year = row.dataset.year;
            const detailRow = tbody.querySelector(`[data-year-detail="${year}"]`);
            const icon = row.querySelector('.toggle-icon');
            if (detailRow) {
                const isHidden = detailRow.classList.contains('hidden');
                detailRow.classList.toggle('hidden');
                if (icon) { icon.textContent = isHidden ? 'expand_more' : 'chevron_right'; icon.classList.toggle('text-primary', isHidden); }
                row.classList.toggle('bg-slate-100', isHidden); row.classList.toggle('dark:bg-slate-800', isHidden);
            }
        });
    });
    initTooltips();
}

function renderChart(results) {
  const filteredYears = results.years.filter(passesFilter);
  const labels = filteredYears.map(y => [`${String(y.year)}`, `${y.age}세`]);
  let cumulativePrincipal = 0;
  const principalData = [], returnData = [];
  results.years.forEach(year => {
      cumulativePrincipal += year.annualContribution - year.annualWithdrawal;
      if(passesFilter(year)){
          const principalComponent = Math.max(0, Math.min(cumulativePrincipal, year.endBalance));
          const returnComponent = Math.max(0, year.endBalance - principalComponent);
          principalData.push(principalComponent); returnData.push(returnComponent);
      }
  });
  const ctx = $("balanceChart").getContext("2d");
  if (state.chart) state.chart.destroy();
  if (labels.length === 0) return;
  state.chart = new Chart(ctx, {
    type: 'bar', data: { labels, datasets: [
        { label: getText('CHART.PRINCIPAL_LABEL'), data: principalData, backgroundColor: '#2563eb' },
        { label: getText('CHART.RETURN_LABEL'), data: returnData, backgroundColor: '#84cc16' }
      ]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, tooltip: { callbacks: {
            label: (context) => (context.dataset.label || '') + ': ' + fmtMoney(context.parsed.y, true),
            footer: (items) => getText('CHART.TOTAL_LABEL', fmtMoney(items.reduce((s, i) => s + i.parsed.y, 0), true))
          }}},
      scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: (v) => fmtMoney(v, true) } } }
    }
  });
}

/** =============================
 *  Tooltip
 *  ============================= */
function initTooltips() {
  const tooltip = $('portfolioTooltip');
  document.querySelectorAll('.annual-row').forEach(row => {
    row.addEventListener('mouseenter', (e) => {
      const year = Number(e.currentTarget.dataset.year);
      const yearData = state.results.years.find(y => y.year === year);
      if (!yearData) return;
      let html = `<div class="font-bold mb-2 text-base">${getText('TOOLTIP.PORTFOLIO_TITLE', year)}</div>`;
      if (yearData.detailedPortfolio.length > 0) {
          html += yearData.detailedPortfolio.map(p => {
            const isCash = p.name === getText('TABLE.UNINVESTED_CASH');
            return `
            <div class="grid grid-cols-[1fr,auto] items-center gap-x-4 gap-y-1 text-xs mb-2 pb-2 border-b border-slate-700 last:border-b-0 last:pb-0 last:mb-0">
                <div class="font-bold col-span-2">${p.name}</div>
                <div class="text-slate-400">${getText('TOOLTIP.BALANCE_LABEL')}</div>
                <div class="text-slate-100 font-bold">${fmtMoney(p.balance)}</div>
                ${!isCash ? `
                <div class="text-slate-400">${getText('TOOLTIP.RETURN_LABEL')}</div>
                <div class="text-green-400">+${fmtMoney(p.return)}</div>
                <div class="text-slate-400">${getText('TOOLTIP.DIVIDEND_LABEL')}</div>
                <div class="text-blue-400">+${fmtMoney(p.dividend)}</div>` : ''}
            </div>`}).join('');
      } else html += `<div class="text-slate-400">${getText('TOOLTIP.NO_DATA')}</div>`;
      const eventsAtAge = state.events.filter(e => e.age === yearData.age);
      if (eventsAtAge.length > 0) {
          html += `<div class="font-bold mt-3 mb-2 text-base border-t border-slate-700 pt-2">${getText('TOOLTIP.EVENT_TITLE')}</div>`;
          html += eventsAtAge.map(ev => `<p class="text-xs text-slate-300 mb-1 ${!ev.enabled ? 'line-through' : ''}">${ev.month}월: ${getEventSubtitle(ev, 'dark')}</p>`).join('');
      }
      tooltip.innerHTML = html; tooltip.classList.remove('hidden');
      const rect = tooltip.getBoundingClientRect();
      let left = e.clientX + 10, top = e.clientY + 10;
      if (left + rect.width > window.innerWidth) left = e.clientX - rect.width - 10;
      if (top + rect.height > window.innerHeight) top = e.clientY - rect.height - 10;
      tooltip.style.left = `${left}px`; tooltip.style.top = `${top}px`;
    });
    row.addEventListener('mouseleave', () => { tooltip.classList.add('hidden'); });
  });

  const headerTooltips = {
      'th-year-age': getText('TABLE.TOOLTIP_YEAR_AGE'), 'th-contribution': getText('TABLE.TOOLTIP_ANNUAL_CONTRIBUTION'),
      'th-return': getText('TABLE.TOOLTIP_RETURN'), 'th-dividend': getText('TABLE.TOOLTIP_DIVIDEND'),
      'th-withdrawal': getText('TABLE.TOOLTIP_WITHDRAWAL'), 'th-cash-flow': getText('TABLE.TOOLTIP_CASH_FLOW'),
      'th-balance': getText('TABLE.TOOLTIP_BALANCE'), 'th-portfolio': getText('TABLE.TOOLTIP_PORTFOLIO')
  };
  Object.entries(headerTooltips).forEach(([id, text]) => {
      const th = $(id); if (!th) return;
      const tooltip = th.querySelector('.header-tooltip');
      if (tooltip) {
        tooltip.innerHTML = text;
        th.addEventListener('mouseenter', () => { tooltip.classList.remove('hidden'); });
        th.addEventListener('mouseleave', () => { tooltip.classList.add('hidden'); });
      }
  });
}

/** =============================
 *  Observation
 *  ============================= */
function calculateSustainableWithdrawal(retirementBalance, retirementAge, portfolio) {
    if (retirementBalance <= 0) return 0;
    const targetAge = 90, targetEndBalance = retirementBalance * 0.2;
    const getFinalBalance = (monthlyWithdrawal) => {
        let balance = retirementBalance;
        for (let age = retirementAge; age < targetAge; age++) {
            for (let m = 1; m <= 12; m++) {
                const r = balance * (portfolio.annualReturnPct / 100 / 12);
                const d = balance * (portfolio.dividendPct / 100 / 12) * (1 - state.dividendTaxRate);
                balance += r + d;
                balance -= Math.min(balance, monthlyWithdrawal);
            }
        }
        return balance;
    };
    let low = 0, high = retirementBalance / 12, mid = 0;
    for(let i=0; i<100; i++) {
        mid = (low + high) / 2; if (mid === 0) break;
        if (getFinalBalance(mid) > targetEndBalance) low = mid; else high = mid;
    }
    return mid;
}

function updateObservation(results) {
  const retireRow = results.years.find(y => y.age === state.inputs.ageRetire);
  const last = results.years[results.years.length - 1];
  let msg = ``;
  if (retireRow) msg += getText('OBSERVATION.RETIRE_RESULT', state.inputs.ageRetire, retireRow.year, fmtMoney(retireRow.endBalance, true));
  if (last) msg += getText('OBSERVATION.FINAL_RESULT', state.maxAge, last.year, fmtMoney(last.endBalance, true));
  $("observation").innerHTML = msg || getText('OBSERVATION.NO_RESULT');
  const sustainableWithdrawalEl = $("sustainableWithdrawal");
  if (retireRow && retireRow.endBalance > 0) {
    const retirementPortfolioConfig = getActivePortfolio(state.inputs.ageRetire, 1);
    const portfolioForWithdrawal = {
        annualReturnPct: retirementPortfolioConfig.reduce((acc, p) => acc + p.percentage * (p.preset.annualReturnPct), 0),
        dividendPct: retirementPortfolioConfig.reduce((acc, p) => acc + p.percentage * (p.preset.dividendPct), 0)
    };
    const sustainableMonthly = calculateSustainableWithdrawal(retireRow.endBalance, state.inputs.ageRetire, portfolioForWithdrawal);
    const otherMonthlyIncome = state.events.filter(e => e.type === 'income' && (e.age < state.inputs.ageRetire || (e.age === state.inputs.ageRetire && (e.month || 1) <= 1))).sort((a,b) => (b.age - a.age) || ((b.month||1) - (a.month||1)))[0]?.amount ?? 0;
    if (sustainableMonthly > 0) sustainableWithdrawalEl.innerHTML = getText('OBSERVATION.SUSTAINABLE_WITHDRAWAL_DETAIL', state.inputs.ageRetire, fmtMoney(sustainableMonthly), fmtMoney(otherMonthlyIncome), fmtMoney(sustainableMonthly + otherMonthlyIncome));
    else sustainableWithdrawalEl.innerHTML = getText('OBSERVATION.SUSTAINABLE_WITHDRAWAL_NOT_APPLICABLE');
  } else sustainableWithdrawalEl.innerHTML = "";
}

/** =============================
 *  Recalc + Render
 *  ============================= */
function recalcAndRender() {
  const results = simulate(); state.results = results;
  $("rangeLabel").textContent = getText('RESULTS.RANGE_LABEL', results.startYear, results.ageNow, results.endAge, results.endAge);
  renderAnnualTable(results); updateObservation(results); renderEventList(); updateFilterButton();
  if (!$("chartPanel").classList.contains("hidden")) renderChart(state.results);
  runTests();
}

/** =============================
 *  Inputs init
 *  ============================= */
function initInputs() {
  ["ageNow", "ageRetire"].forEach(id => {
      const el = $(id); if (!el) return;
      el.addEventListener("input", () => { recalcAndRender(); saveStateDebounced(); });
      if(el.type !== 'text') el.addEventListener("change", () => { recalcAndRender(); saveStateDebounced(); });
      el.addEventListener("blur", () => { syncUiToStateFromInputs(); saveStateDebounced(); });
  });
  const filterPanel = $('filterPanel'), btnToggleFilter = $('btnToggleFilter');
  btnToggleFilter.addEventListener('click', (e) => { e.stopPropagation(); filterPanel.classList.toggle('hidden'); });
  document.addEventListener('click', (e) => { if (!filterPanel.contains(e.target) && !btnToggleFilter.contains(e.target)) filterPanel.classList.add('hidden'); });
  ["filterEnabled", "filterAgeFrom", "filterAgeTo"].forEach(id => {
      const el = $(id); if (!el) return;
      el.addEventListener("input", () => { recalcAndRender(); saveStateDebounced(); });
      if(el.type !== 'text') el.addEventListener("change", () => { recalcAndRender(); saveStateDebounced(); });
      el.addEventListener("blur", () => { syncUiToStateFromInputs(); saveStateDebounced(); });
  });
  $("btnToggleChart").addEventListener("click", () => {
    $("chartPanel").classList.toggle("hidden");
    if (!$("chartPanel").classList.contains("hidden")) renderChart(state.results || simulate());
  });
  $("btnResetAll").addEventListener("click", () => {
    if (confirm(getText('CONFIG.RESET_CONFIRM'))) { resetSavedState(); window.location.hash = ""; location.reload(); }
  });
  $('btnShare').addEventListener('click', async () => {
    const snapshot = buildSnapshot();
    try {
      const jsonString = JSON.stringify(snapshot);
      const compressed = pako.deflate(jsonString, { level: 9 });
      const encoded = btoa(String.fromCharCode.apply(null, compressed));
      const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(encoded)}`;
      await navigator.clipboard.writeText(url); alert(getText('CONFIG.SHARE_SUCCESS'));
    } catch (e) { console.error("Failed to create shareable URL", e); }
  });
}

/** =============================
 *  Onboarding Guide
 *  ============================= */
function initOnboarding() {
    if (localStorage.getItem('onboardingCompleted') === 'true') return;
    const guide = $('onboarding-guide'), titleEl = $('onboarding-title'), contentEl = $('onboarding-content'), dotsEl = $('onboarding-dots'), prevBtn = $('onboarding-prev'), nextBtn = $('onboarding-next'), closeBtn = $('close-onboarding');
    let currentStep = 0, highlightedElement = null;
    const steps = [
        { titleKey: 'ONBOARDING.TITLE_STEP_1', contentKey: 'ONBOARDING.CONTENT_STEP_1', highlightTarget: null },
        { titleKey: 'ONBOARDING.TITLE_STEP_2', contentKey: 'ONBOARDING.CONTENT_STEP_2', highlightTarget: 'config-section' },
        { titleKey: 'ONBOARDING.TITLE_STEP_3', contentKey: 'ONBOARDING.CONTENT_STEP_3', highlightTarget: 'events-section' },
        { titleKey: 'ONBOARDING.TITLE_STEP_4', contentKey: 'ONBOARDING.CONTENT_STEP_4', highlightTarget: null }
    ];
    function renderStep(stepIndex) {
        const step = steps[stepIndex];
        titleEl.innerHTML = getText(step.titleKey);
        contentEl.innerHTML = getText(step.contentKey);
        dotsEl.innerHTML = '';
        for (let i = 0; i < steps.length; i++) {
            const dot = document.createElement('div'); dot.className = 'onboarding-dot';
            if (i === stepIndex) dot.classList.add('active');
            dotsEl.appendChild(dot);
        }
        prevBtn.style.visibility = (stepIndex === 0) ? 'hidden' : 'visible';
        nextBtn.innerHTML = (stepIndex === steps.length - 1) ? getText('ONBOARDING.DONE_BUTTON') : getText('ONBOARDING.NEXT_BUTTON');
        if (highlightedElement) highlightedElement.classList.remove('onboarding-highlight');
        if (step.highlightTarget) {
            highlightedElement = $(step.highlightTarget);
            if (highlightedElement) highlightedElement.classList.add('onboarding-highlight');
        }
    }
    function completeOnboarding() {
        guide.classList.add('hidden');
        if (highlightedElement) highlightedElement.classList.remove('onboarding-highlight');
        localStorage.setItem('onboardingCompleted', 'true');
    }
    nextBtn.addEventListener('click', () => { (currentStep < steps.length - 1) ? renderStep(++currentStep) : completeOnboarding(); });
    prevBtn.addEventListener('click', () => { if (currentStep > 0) renderStep(--currentStep); });
    closeBtn.addEventListener('click', completeOnboarding);
    guide.classList.remove('hidden'); renderStep(0);
}

/** =============================
 *  Boot
 *  ============================= */
function loadPakoAndBoot() {
    const script = document.createElement('script');
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pako/2.1.0/pako.min.js";
    script.onload = () => {
        (function boot() {
            applyLocalization();
            const fromUrl = loadStateFromSource('url');
            const loadedFromUrl = applySnapshot(fromUrl);
            if (!loadedFromUrl) { const fromLocal = loadStateFromSource('local'); applySnapshot(fromLocal); }
            syncStateToUi(); initPresetManagement(); initEventDialog(); initInputs(); recalcAndRender();
            if (!loadedFromUrl) initOnboarding();
        })();
    };
    document.head.appendChild(script);
}
loadPakoAndBoot();
