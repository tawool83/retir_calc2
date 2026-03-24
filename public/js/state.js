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
    inflationRate: 3,
    retirePlanAgeNow: 40,
    retirePlanAgeRetire: 65,
    targetMonthlyCashFlow: 0,
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
