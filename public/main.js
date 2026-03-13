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
 *  Inputs init
 *  ============================= */
function initInputs() {
  const inputsToWatch = ["ageNow", "ageRetire"];
  inputsToWatch.forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", () => { recalcAndRender(); saveStateDebounced(); });
      if(el.type !== 'text') el.addEventListener("change", () => { recalcAndRender(); saveStateDebounced(); });
      el.addEventListener("blur", () => { syncUiToStateFromInputs(); saveStateDebounced(); });
  });
    const filterPanel = $('filterPanel');
    const btnToggleFilter = $('btnToggleFilter');
    btnToggleFilter.addEventListener('click', (e) => { e.stopPropagation(); filterPanel.classList.toggle('hidden'); });
    document.addEventListener('click', (e) => { if (!filterPanel.contains(e.target) && !btnToggleFilter.contains(e.target)) filterPanel.classList.add('hidden'); });
    const filterInputs = ["filterEnabled", "filterAgeFrom", "filterAgeTo"];
    filterInputs.forEach(id => {
        const el = $(id);
        if (!el) return;
        el.addEventListener("input", () => { recalcAndRender(); saveStateDebounced(); });
        if(el.type !== 'text') el.addEventListener("change", () => { recalcAndRender(); saveStateDebounced(); });
        el.addEventListener("blur", () => { syncUiToStateFromInputs(); saveStateDebounced(); });
    });
  $("btnToggleChart").addEventListener("click", () => {
    $("chartPanel").classList.toggle("hidden");
    if (!$("chartPanel").classList.contains("hidden")) renderChart(state.results || simulate());
  });
  $("btnResetAll").addEventListener("click", () => {
    if (confirm(getText('CONFIG.RESET_CONFIRM'))) {
      resetSavedState();
      window.location.hash = "";
      location.reload();
    }
  });
  $('btnShare').addEventListener('click', async () => {
    const snapshot = buildSnapshot();
    try {
      const jsonString = JSON.stringify(snapshot);
      const compressed = pako.deflate(jsonString, { level: 9 });
      const encoded = btoa(String.fromCharCode.apply(null, compressed));
      const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(encoded)}`;
      await navigator.clipboard.writeText(url);
      alert(getText('CONFIG.SHARE_SUCCESS'));
    } catch (e) {
      console.error("Failed to create shareable URL", e);
    }
  });
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

            if (!loadedFromUrl) {
                const fromLocal = loadStateFromSource('local');
                applySnapshot(fromLocal);
            }

            syncStateToUi();
            initPresetManagement();
            initEventDialog();
            initInputs();
            recalcAndRender();

            if (!loadedFromUrl) {
                initOnboarding();
            }
        })();
    };
    document.head.appendChild(script);
}
