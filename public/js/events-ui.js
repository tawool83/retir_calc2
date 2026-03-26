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
    const monthText = `<span class="text-[10px] text-slate-400 font-bold">${ev.month}월 부터</span>`;
    const node = document.createElement("div");
    node.className = `p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border-l-4 ${borderClass} relative transition-opacity`;
    if (!ev.enabled) node.classList.add('opacity-40');
    node.innerHTML = `
      <div class="flex justify-between items-start gap-2">
        <div class="min-w-0">
          <div class="flex items-center gap-2 flex-wrap">${pill} ${monthText}</div>
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
    const sortedEvents = [...state.events].sort((a,b) => (a.age - b.age) || ((a.month || 1) - (b.month || 1)));
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
        const minAge = state.events.length > 0 ? Math.min(...state.events.map(e => e.age)) : 30;
        $("dlgAge").value = clamp(minAge, 0, 120);
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
    showModal(dlg);
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
    infoEl.innerHTML = infoKey ? getText('EVENT_DIALOG.' + infoKey) : '';
}

function initEventDialog() {
    const dlg = $("eventDialog");
    const form = dlg.querySelector('form');
    const typeSelect = $("dlgType");
    let downTarget = null;

    $("btnAddEvent").addEventListener("click", () => openEventDialog());
    $("dlgCloseX").addEventListener("click", () => dlg.close());
    typeSelect.addEventListener('change', updateDialogFields);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const age = clamp(Number($("dlgAge").value || 0), 0, 120);
        const month = clamp(Number($("dlgMonth").value || 1), 1, 12);
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
