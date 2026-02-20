/** =============================
 *  Persistence (localStorage)
 *  ============================= */
const STORAGE_KEY = "retire_sim_v2_dynamic_portfolio";

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function loadSavedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const data = safeJsonParse(raw);
  return data && typeof data === "object" ? data : null;
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
        if (Math.abs(num) >= 100000000) {
            return `${parseFloat((num / 100000000).toFixed(2))}억`;
        } else if (Math.abs(num) >= 10000) {
            return `${parseFloat((num / 10000).toFixed(0))}만`;
        }
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

  inputs: {
    ageNow: 30,
    ageRetire: 65,
    initialInvestment: 50000000,
    monthlyContribution: 2000000,
    filterEnabled: false,
    filterAgeFrom: 30,
    filterAgeTo: 100
  },

  events: [],
  results: null,
  chart: null,
  activeTooltip: null
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
    state.events = defaultEvents.map(e => ({ ...e, id: uid() }));
    return;
  }

  // Presets
  const builtins = [...defaultPresets];
  const userPresets = Array.isArray(snap.presets)
    ? snap.presets.filter(p => p && !p.builtin && p.id && p.name)
    : [];
  state.presets = [...builtins, ...userPresets];

  // Inputs
  if (snap.inputs && typeof snap.inputs === 'object') {
     Object.assign(state.inputs, snap.inputs);
  }
  
  state.isEventListExpanded = snap.isEventListExpanded || false;

   // Migration for removing autoZeroAfterRetire
  if (state.inputs.autoZeroAfterRetire) {
    delete state.inputs.autoZeroAfterRetire;
  }


  // Events
  if (Array.isArray(snap.events) && snap.events.length > 0) {
    state.events = snap.events
      .filter(e => e && e.type && e.age != null)
      .map(e => ({ ...e, id: e.id || uid() }));
  } else {
    state.events = defaultEvents.map(e => ({ ...e, id: uid() }));
  }
}

/** =============================
 *  UI binding helpers
 *  ============================= */
function syncStateToUi() {
  $("ageNow").value = state.inputs.ageNow;
  $("ageRetire").value = state.inputs.ageRetire;
  $("initialInvestment").value = state.inputs.initialInvestment.toLocaleString();
  $("monthlyContribution").value = state.inputs.monthlyContribution.toLocaleString();
  
  $("filterEnabled").checked = state.inputs.filterEnabled;
  $("filterAgeFrom").value = state.inputs.filterAgeFrom;
  $("filterAgeTo").value = state.inputs.filterAgeTo;

  renderEventList();
  updateFilterButton();
}

function syncUiToStateFromInputs() {
  state.inputs.ageNow = clamp(Number($("ageNow").value || 0), 0, 120);
  state.inputs.ageRetire = clamp(Number($("ageRetire").value || 0), 0, 120);
  state.inputs.initialInvestment = parseMoney($("initialInvestment").value);
  state.inputs.monthlyContribution = parseMoney($("monthlyContribution").value);

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
    item.className = "flex items-center justify-between gap-2 text-sm p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50";
    item.innerHTML = `
      <div class="font-bold">${p.name} ${p.builtin ? '(기본)' : ''}</div>
      <div class="text-xs text-slate-500">수익 ${p.annualReturnPct}% / 배당 ${p.dividendPct}%</div>
      ${!p.builtin ? `<button data-del-preset="${p.id}" class="text-red-500 hover:text-red-400"><span class="material-symbols-outlined text-sm">delete</span></button>` : ''}
    `;
    listEl.appendChild(item);
  });

  listEl.querySelectorAll("[data-del-preset]").forEach(btn => {
      btn.addEventListener("click", (e) => {
          const id = e.currentTarget.getAttribute("data-del-preset");
          state.presets = state.presets.filter(p => p.id !== id);
          renderPresetList();
          recalcAndRender();
          saveStateDebounced();
      });
  });
}

function initPresetManagement() {
    const dlg = $('presetDialog');
    let downTarget = null;

    $('btnAddPreset').addEventListener('click', () => {
        renderPresetList();
        $('newPresetForm').reset();
        dlg.showModal();
    });

    $('newPresetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = ($("dlgPresetName").value || "").trim();
        const r = parsePct($("dlgPresetReturn").value);
        const d = parsePct($("dlgPresetDiv").value);

        if (!name) return;
        const id = "u_" + uid().slice(0, 8);

        state.presets.push({ id, name, annualReturnPct: r, dividendPct: d, builtin: false });
        renderPresetList();
        recalcAndRender();
        saveStateDebounced();
        e.target.reset();
    });

    dlg.addEventListener("mousedown", e => { downTarget = e.target; });
    dlg.addEventListener("click", (e) => {
      if (e.target === dlg && downTarget === dlg) {
        dlg.close();
      }
    });
}

/** =============================
 *  Events UI
 *  ============================= */
function createEventCard(ev) {
    let border, subtitle, pill;

    switch (ev.type) {
        case 'portfolio':
            const preset = state.presets.find(p => p.id === ev.presetId);
            border = "border-purple-500";
            subtitle = `전략: ${preset ? preset.name : '알 수 없음'}, 비중: ${ev.weight}`;
            pill = `<span class="px-2 py-0.5 bg-purple-500 text-white text-[10px] font-bold rounded-full uppercase">포트폴리오</span>`;
            break;
        case 'monthly':
            border = "border-primary";
            subtitle = `월 납입액 ${fmtMoney(ev.amount)}으로 변경`;
            pill = `<span class="px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded-full uppercase">월납입</span>`;
            break;
        case 'lump':
            subtitle = `일시불 입금 ${ev.amount >= 0 ? "+" : ""}${fmtMoney(ev.amount)}`;
            pill = `<span class="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200 text-[10px] font-bold rounded-full uppercase">일시불</span>`;
            break;
        case 'withdrawal':
            border = "border-emerald-400";
            subtitle = `현금 인출 시작: 매월 ${fmtMoney(ev.amount)} (인출)`;
            pill = `<span class="px-2 py-0.5 bg-emerald-500 text-white text-[10px] font-bold rounded-full uppercase">현금 인출</span>`;
            break;
        default: 
            subtitle = "알 수 없는 이벤트";
            pill = "";
            border = "border-slate-300";
    }

    const node = document.createElement("div");
    node.className = `p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border-l-4 ${border} relative`;
    node.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            ${pill}
          </div>
          <p class="text-[11px] text-slate-500 mt-1">${subtitle}</p>
        </div>
        <button class="text-slate-400 hover:text-red-500 transition-colors shrink-0" data-del="${ev.id}" title="삭제">
          <span class="material-symbols-outlined text-sm">delete</span>
        </button>
      </div>
    `;

    node.querySelector("[data-del]").addEventListener("click", () => {
      state.events = state.events.filter(e => e.id !== ev.id);
      recalcAndRender();
      saveStateDebounced();
    });

    return node;
}

function renderEventList() {
    const wrap = $("eventList");
    wrap.innerHTML = "";

    if (typeof state.isEventListExpanded === 'undefined') {
        state.isEventListExpanded = false;
    }

    const sortedEvents = [...state.events].sort((a,b) => a.age - b.age);
    if (sortedEvents.length === 0) {
        wrap.innerHTML = `<div class="text-[11px] text-slate-500 dark:text-slate-400">이벤트가 없습니다. “이벤트 추가”를 클릭하세요.</div>`;
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
        group.events.forEach(ev => {
            cardsPart.appendChild(createEventCard(ev));
        });
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
        btn.innerHTML = state.isEventListExpanded 
            ? '<span class="material-symbols-outlined text-sm">unfold_less</span> 간략히 보기'
            : `<span class="material-symbols-outlined text-sm">unfold_more</span> 전체 보기 (+${eventGroups.length - 5}개)`;

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

function initEventDialog() {
  const dlg = $("eventDialog");
  const typeSelect = $("dlgType");
  const fieldsPortfolio = $('dlgFieldsPortfolio');
  const fieldsMonetary = $('dlgFieldsMonetary');
  const infoEl = $('dlgInfo');
  let downTarget = null;

  const updateDialogFields = () => {
    const type = typeSelect.value;
    fieldsPortfolio.classList.toggle('hidden', type !== 'portfolio');
    fieldsMonetary.classList.toggle('hidden', type === 'portfolio');

    let infoText = '';
    switch (type) {
        case 'portfolio': infoText = '해당 나이부터 포트폴리오 구성을 변경합니다. 같은 나이에 여러 개의 프리셋을 추가하여 비중을 조절할 수 있습니다.'; break;
        case 'monthly': infoText = '해당 나이부터 월 납입액을 새로 설정합니다.'; break;
        case 'lump': infoText = '해당 나이에 일시불로 입금 또는 출금합니다.'; break;
        case 'withdrawal': infoText = '해당 나이부터 매월 잔액에서 고정 금액을 인출합니다.'; break;
    }
    infoEl.textContent = infoText;
  };

  $("btnAddEvent").addEventListener("click", () => {
    const ageNow = state.inputs.ageNow;
    $("dlgAge").value = clamp(ageNow + 5, 0, 120);
    typeSelect.value = "portfolio";
    $("dlgLabel").value = "";
    $("dlgAmount").value = "";
    $('dlgWeight').value = 10;
    
    const presetSelect = $("dlgPresetId");
    presetSelect.innerHTML = state.presets.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    updateDialogFields();
    dlg.showModal();
  });

  typeSelect.addEventListener('change', updateDialogFields);

  $("dlgSave").addEventListener("click", () => {
    const age = clamp(Number($("dlgAge").value || 0), 0, 120);
    const type = typeSelect.value;
    const id = uid();
    let newEvent = { id, age, type };

    if (type === 'portfolio') {
        newEvent.presetId = $('dlgPresetId').value;
        newEvent.weight = clamp(Number($('dlgWeight').value), 1, 10);
    } else {
        newEvent.amount = parseMoney($("dlgAmount").value);
        newEvent.label = $('dlgLabel').value.trim();
    }

    state.events.push(newEvent);
    recalcAndRender();
    saveStateDebounced();
  });

  dlg.addEventListener("mousedown", e => { downTarget = e.target; });
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg && downTarget === dlg) {
      dlg.close();
    }
  });
}

/** =============================
 *  Simulation Core
 *  ============================= */
function getActivePortfolio(age) {
    const portfolioEvents = state.events
        .filter(e => e.type === 'portfolio' && e.age <= age)
        .sort((a,b) => b.age - a.age);

    if (!portfolioEvents.length) {
        const firstPreset = state.presets[0];
        if (!firstPreset) return [];
        return [{
            preset: firstPreset,
            weight: 10,
            percentage: 1
        }];
    }

    const latestAge = portfolioEvents[0].age;
    const activeEvents = portfolioEvents.filter(e => e.age === latestAge);
    
    const totalWeight = activeEvents.reduce((sum, e) => sum + e.weight, 0);
    if (totalWeight === 0) return [];

    return activeEvents.map(e => {
        const preset = state.presets.find(p => p.id === e.presetId);
        return {
            preset: preset || { annualReturnPct: 0, dividendPct: 0, name: 'Unknown' },
            weight: e.weight,
            percentage: e.weight / totalWeight
        };
    });
}

function getPortfolioSignature(portfolio) {
    if (!portfolio || portfolio.length === 0) return '';
    return portfolio.map(p => `${p.preset.id}:${p.percentage.toFixed(4)}`).sort().join('|');
}

function simulate() {
  syncUiToStateFromInputs();
  const { ageNow, ageRetire, initialInvestment, monthlyContribution } = state.inputs;
  const endAge = state.maxAge;
  const startYear = state.startYear;

  const years = [];
  
  let firstPortfolio = getActivePortfolio(ageNow);
  let portfolioState = firstPortfolio.map(p => ({ ...p, balance: initialInvestment * p.percentage }));
  let lastPortfolioSignature = getPortfolioSignature(firstPortfolio);

  for (let age = ageNow; age <= endAge; age++) {
    const year = startYear + (age - ageNow);
    let currentPortfolioConfig = getActivePortfolio(age);
    const currentPortfolioSignature = getPortfolioSignature(currentPortfolioConfig);

    if (currentPortfolioSignature !== lastPortfolioSignature) {
        const totalBalance = portfolioState.reduce((sum, p) => sum + p.balance, 0);
        portfolioState = currentPortfolioConfig.map(p => ({ ...p, balance: totalBalance * p.percentage }));
        lastPortfolioSignature = currentPortfolioSignature;
    }

    portfolioState.forEach(p => {
        p.yearReturn = 0;
        p.yearDividend = 0;
    });

    const activeMonthly = state.events
        .filter(e => e.type === "monthly" && e.age <= age)
        .sort((a,b) => b.age - a.age)[0]?.amount ?? monthlyContribution;
    const lumpSum = state.events.filter(e => e.type === 'lump' && e.age === age).reduce((sum, e) => sum + e.amount, 0);
    const withdrawalMonthly = state.events.filter(e => e.type === 'withdrawal' && e.age <= age).reduce((sum, e) => sum + e.amount, 0);

    if (lumpSum !== 0) {
         const totalBalanceBeforeLump = portfolioState.reduce((sum, p) => sum + p.balance, 0);
         if (totalBalanceBeforeLump > 0) { 
            portfolioState.forEach(p => p.balance += lumpSum * (p.balance / totalBalanceBeforeLump));
         } else if (portfolioState.length > 0) {
            portfolioState.forEach(p => p.balance += lumpSum * p.percentage);
         }
    }

    let yContr = 0, yReturn = 0, yDiv = 0, yWithdrawal = 0;

    for (let m = 1; m <= 12; m++) {
      if(activeMonthly > 0) {
          portfolioState.forEach(p => p.balance += activeMonthly * p.percentage);
          yContr += activeMonthly;
      }
      
      portfolioState.forEach(p => {
          const r = p.balance * (p.preset.annualReturnPct / 100 / 12);
          const d_pretax = p.balance * (p.preset.dividendPct / 100 / 12);
          const d_posttax = d_pretax * (1 - state.dividendTaxRate);
          
          p.balance += r + d_posttax;
          p.yearReturn += r;
          p.yearDividend += d_posttax;
          yReturn += r;
          yDiv += d_posttax;
      });

      if (withdrawalMonthly > 0) {
          const totalBalanceBeforeWithdrawal = portfolioState.reduce((sum, p) => sum + p.balance, 0);
          if (totalBalanceBeforeWithdrawal > withdrawalMonthly) {
              const fraction = withdrawalMonthly / totalBalanceBeforeWithdrawal;
              portfolioState.forEach(p => { p.balance -= p.balance * fraction; });
              yWithdrawal += withdrawalMonthly;
          } else { // Liquidate all
              yWithdrawal += totalBalanceBeforeWithdrawal;
              portfolioState.forEach(p => { p.balance = 0; });
          }
      }
    }

    const endBalance = portfolioState.reduce((sum, p) => sum + p.balance, 0);

    years.push({
      year, age, 
      annualContribution: yContr, 
      returnEarned: yReturn, 
      dividends: yDiv, 
      withdrawalOut: yWithdrawal,
      endBalance,
      portfolio: currentPortfolioConfig,
      detailedPortfolio: portfolioState.map(p => ({ 
        name: p.preset.name, 
        balance: p.balance,
        return: p.yearReturn,
        dividend: p.yearDividend
      }))
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
        portfolioDisplayHtml = `<span class="text-xs text-slate-400">정의되지 않음</span>`;
    } else {
        const itemsToDisplay = y.portfolio.slice(0, 2);
        let htmlItems = itemsToDisplay.map(p => {
            const content = `${p.preset.name}: ${(p.percentage * 100).toFixed(0)}%`;
            return `<div class="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300">${content}</div>`;
        });

        if (y.portfolio.length > 2) {
            htmlItems[1] = `<div class="flex items-center gap-1.5">${htmlItems[1]} <span class="font-bold">...</span></div>`;
        }
        
        portfolioDisplayHtml = `<div class="flex flex-col items-start gap-1">${htmlItems.join('')}</div>`;
    }

    const highlight = y.age === state.inputs.ageRetire ? "bg-emerald-50/60 dark:bg-emerald-900/10" : "";

    return `
    <tr class="annual-row ${highlight} hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group" data-year="${y.year}">
      <td class="px-6 py-4 font-bold text-slate-900 dark:text-slate-100">
        <div class="flex flex-col">
          <span>${y.year}</span>
          <span class="text-[10px] text-slate-400">${y.age}세${y.age === state.inputs.ageRetire ? " • 은퇴" : ""}</span>
        </div>
      </td>
      <td class="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">${fmtMoney(y.annualContribution, true)}</td>
      <td class="px-6 py-4 font-bold text-primary">+${fmtMoney(y.returnEarned, true)}</td>
      <td class="px-6 py-4 font-medium text-slate-600 dark:text-slate-400">${fmtMoney(y.dividends, true)}</td>
      <td class="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-300">-${fmtMoney(y.withdrawalOut, true)}</td>
      <td class="px-6 py-4 font-black">${fmtMoney(y.endBalance, true)}</td>
      <td class="px-6 py-4" title="${fullPortfolioTitle}">${portfolioDisplayHtml}</td>
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
  tbody.innerHTML = filtered.map(buildAnnualRow).join("");
  initTooltips();
}

function renderChart(results) {
  const filteredYears = results.years.filter(passesFilter);
  const labels = filteredYears.map(y => [`${String(y.year)}`, `${y.age}세`]);
  const datasets = {};
  
  // This is a simplified view for the chart. We calculate total principal and total returns.
  let cumulativePrincipal = state.inputs.initialInvestment;
  const principalData = [];
  const returnData = [];
  const endBalanceData = [];

  results.years.forEach(year => {
      cumulativePrincipal += year.annualContribution;
      if(passesFilter(year)){
          const principalComponent = Math.min(cumulativePrincipal, year.endBalance);
          const returnComponent = Math.max(0, year.endBalance - cumulativePrincipal);
          principalData.push(principalComponent);
          returnData.push(returnComponent);
          endBalanceData.push(year.endBalance);
      }
  });

  const ctx = $("balanceChart").getContext("2d");
  if (state.chart) state.chart.destroy();
  if (labels.length === 0) return;

  state.chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: '누적 투자원금', data: principalData, backgroundColor: '#2563eb' },
        { label: '누적 투자수익', data: returnData, backgroundColor: '#84cc16' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { x: { stacked: true }, y: { stacked: true } }
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
      
      let html = `<div class="font-bold mb-2 text-base">${year}년 포트폴리오</div>`;
      if (yearData.detailedPortfolio.length > 0) {
          html += yearData.detailedPortfolio.map(p => `
            <div class="grid grid-cols-[1fr,auto] items-center gap-x-4 gap-y-1 text-xs mb-2 pb-2 border-b border-slate-700 last:border-b-0 last:pb-0 last:mb-0">
                <div class="font-bold col-span-2">${p.name}</div>
                <div class="text-slate-400">기말 잔액</div>
                <div class="text-slate-100 font-bold">${fmtMoney(p.balance)}</div>
                <div class="text-slate-400">평가 수익</div>
                <div class="text-green-400">+${fmtMoney(p.return)}</div>
                <div class="text-slate-400">세후 배당금</div>
                <div class="text-blue-400">+${fmtMoney(p.dividend)}</div>
            </div>
          `).join('');
      } else {
          html += `<div class="text-slate-400">데이터 없음</div>`;
      }

      tooltip.innerHTML = html;
      tooltip.classList.remove('hidden');
      
      const rect = e.currentTarget.getBoundingClientRect();
      const tooltipRect = tooltip.getBoundingClientRect();
      let left = e.clientX + 10;
      let top = e.clientY + 10;

      if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top + tooltipRect.height > window.innerHeight) {
        top = window.innerHeight - tooltipRect.height - 10;
      }

      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;

    });
    row.addEventListener('mouseleave', () => {
      tooltip.classList.add('hidden');
    });
  });

  // Header tooltips
  const headerTooltips = {
      'th-contribute': '연간 총 납입액입니다.<br>계산식: <b>월 납입액 x 12</b>',
      'th-return': '연간 발생한 총 투자 수익금입니다. (배당 제외)<br>계산식: <b>(기말 잔액 - 연간 납입액 - 배당금)</b>',
      'th-dividend': '연간 발생한 총 배당금입니다. (세후 15.4% 적용)<br>계산식: <b>(배당 수익률 * (1 - 0.154))</b>',
      'th-withdrawal': '연간 인출한 총 현금액입니다.<br>계산식: <b>월 현금 인출액 x 12</b>',
      'th-balance': '해당 연도 말 기준 총 잔액입니다.<br>계산식: <b>기초 잔액 + 연간 납입액 + 평가 수익 + 배당금 - 현금 인출</b>',
      'th-portfolio': '해당 연도에 적용된 포트폴리오 구성입니다. 마우스를 올리면 전체 구성을 확인할 수 있습니다.'
  };

  Object.entries(headerTooltips).forEach(([id, text]) => {
      const th = $(id);
      if (!th) return;
      const tooltip = th.querySelector('.header-tooltip');
      if (tooltip) {
        tooltip.innerHTML = text;
        th.addEventListener('mouseenter', () => {
            tooltip.classList.remove('hidden');
        });
        th.addEventListener('mouseleave', () => {
            tooltip.classList.add('hidden');
        });
      }
  });
}


/** =============================
 *  Observation
 *  ============================= */
function updateObservation(results) {
  const retireRow = results.years.find(y => y.age === state.inputs.ageRetire);
  const last = results.years[results.years.length - 1];

  let msg = ``;
  if (retireRow) {
    msg += `${state.inputs.ageRetire}세 (${retireRow.year}) 은퇴 시점에 예상 잔액은 ${fmtMoney(retireRow.endBalance, true)} 입니다. `;
  }
  if (last) {
    msg += `${state.maxAge}세 (${last.year})에 예상 잔액은 ${fmtMoney(last.endBalance, true)}가 될 수 있습니다.`;
  }
  $("observation").textContent = msg || '시뮬레이션 결과가 없습니다.';
}

/** =============================
 *  Recalc + Render
 *  ============================= */
function recalcAndRender() {
  const results = simulate();
  state.results = results;

  $("rangeLabel").textContent = `시작 연도 ${results.startYear} • ${results.ageNow}세 → ${results.endAge}세 • 은퇴 ${results.ageRetire}세`;

  renderAnnualTable(results);
  updateObservation(results);
  renderEventList();
  updateFilterButton();

  if (!$("chartPanel").classList.contains("hidden")) {
    renderChart(results);
  }
}

/** =============================
 *  Inputs init
 *  ============================= */
function initInputs() {
  const inputsToWatch = ["ageNow", "ageRetire", "initialInvestment", "monthlyContribution"];
  inputsToWatch.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => { recalcAndRender(); saveStateDebounced(); });
      if(el.type !== 'text') el.addEventListener("change", () => { recalcAndRender(); saveStateDebounced(); });
      el.addEventListener("blur", () => {
          if(id === 'initialInvestment' || id === 'monthlyContribution') {
              const v = parseMoney($(id).value);
              $(id).value = v.toLocaleString();
          }
          syncUiToStateFromInputs(); 
          saveStateDebounced();
      });
  });

    // Filter logic
    const filterPanel = $('filterPanel');
    const btnToggleFilter = $('btnToggleFilter');
    btnToggleFilter.addEventListener('click', (e) => {
        e.stopPropagation();
        filterPanel.classList.toggle('hidden');
    });
    document.addEventListener('click', (e) => {
        if (!filterPanel.contains(e.target) && !btnToggleFilter.contains(e.target)) {
            filterPanel.classList.add('hidden');
        }
    });
    const filterInputs = ["filterEnabled", "filterAgeFrom", "filterAgeTo"];
    filterInputs.forEach(id => {
        const el = $(id);
        if (!el) return;
        el.addEventListener("input", () => { recalcAndRender(); saveStateDebounced(); });
        if(el.type !== 'text') el.addEventListener("change", () => { recalcAndRender(); saveStateDebounced(); });
        el.addEventListener("blur", () => { 
            syncUiToStateFromInputs();
            saveStateDebounced();
        });
    });

  $("btnToggleChart").addEventListener("click", () => {
    $("chartPanel").classList.toggle("hidden");
    if (!$("chartPanel").classList.contains("hidden")) {
      renderChart(state.results || simulate());
    }
  });
  
  $("btnResetAll").addEventListener("click", () => {
    if (confirm("저장된 모든 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) {
      resetSavedState();
      location.reload();
    }
  });
}

/** =============================
 *  Boot
 *  ============================= */
(function boot() {
  const saved = loadSavedState();
  applySnapshot(saved);
  syncStateToUi();
  initPresetManagement();
  initEventDialog();
  initInputs();
  recalcAndRender();
})();
