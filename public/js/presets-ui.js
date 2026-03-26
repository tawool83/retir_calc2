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
                <div class="text-xs text-slate-500 dark:text-slate-400 mt-1">주가성장 ${p.annualReturnPct}% / 배당 ${p.dividendPct}% / 배당성장 ${p.dividendGrowthPct ?? 0}%</div>
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
        $('dlgPresetDivGrowth').value = preset.dividendGrowthPct ?? 0;
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
        showModal(dlg);
    });
    $('closePresetDlg').addEventListener('click', () => dlg.close());
    $('newPresetForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = ($("dlgPresetName").value || "").trim();
        const r = parsePct($("dlgPresetReturn").value);
        const d = parsePct($("dlgPresetDiv").value);
        const dg = parsePct($("dlgPresetDivGrowth").value);
        if (!name) return;
        if (state.editingPresetId) {
            const index = state.presets.findIndex(p => p.id === state.editingPresetId);
            if (index > -1) {
                const p = state.presets[index];
                p.annualReturnPct = r;
                p.dividendPct = d;
                p.dividendGrowthPct = dg;
                if (!p.builtin) p.name = name;
            }
        } else {
            const id = "u_" + uid().slice(0, 8);
            state.presets.push({ id, name, annualReturnPct: r, dividendPct: d, dividendGrowthPct: dg, builtin: false });
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
