/** =============================
 *  Render table + Chart
 *  ============================= */
function buildAnnualRow(y) {
    const yearsFromStart = y.age - (state.results?.ageNow ?? y.age);
    const inflationFactor = Math.pow(1 + (state.inputs.inflationRate || 0) / 100, yearsFromStart);
    const realBalance = y.endBalance / inflationFactor;
    const realCashFlow = y.annualCashFlow / inflationFactor;

    const fullPortfolioTitle = y.portfolio.map(p => `${p.preset.name}: ${(p.percentage*100).toFixed(0)}%`).join(', ');
    let portfolioDisplayHtml;
    if (y.portfolio.length === 0) {
        if (y.endBalance > 0) {
            portfolioDisplayHtml = `<span class="text-xs text-amber-500">${getText('TABLE.UNINVESTED_CASH')}</span>`;
        } else {
            portfolioDisplayHtml = `<span class="text-xs text-slate-400">${getText('TABLE.PORTFOLIO_UNDEFINED')}</span>`;
        }
    } else {
        const itemsToDisplay = y.portfolio.slice(0, 2);
        let htmlItems = itemsToDisplay.map(p => `<div class="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-xs font-semibold text-slate-700 dark:text-slate-300">${p.preset.name}: ${(p.percentage * 100).toFixed(0)}%</div>`);
        if (y.portfolio.length > 2) {
            htmlItems[1] = `<div class="flex items-center gap-1.5">${htmlItems[1]} <span class="font-bold">...</span></div>`;
        }
        portfolioDisplayHtml = `<div class="flex flex-col items-center gap-1">${htmlItems.join('')}</div>`;
    }

    let highlight = '';
    const eventsAtAge = state.events.filter(e => e.age === y.age && e.type !== 'portfolio');
    if (eventsAtAge.length > 0) {
        highlight = "bg-teal-50/60 dark:bg-teal-900/20";
    }

    let ageExtra = [];
    ageExtra.push(...eventsAtAge.map(e => e.icon || ' '));
    const ageExtraHtml = ageExtra.filter(i => i.trim()).join('');

    return `
    <tr class="annual-row ${highlight} hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group" data-year="${y.year}">
      <td class="px-2 py-2.5 font-bold text-slate-900 dark:text-slate-100 text-center">
        <div class="flex flex-col">
          <span>${y.year}</span>
          <span class="text-xs text-slate-400">${y.age}세 <span class="text-base ml-1">${ageExtraHtml}</span></span>
        </div>
      </td>
      <td class="px-2 py-2.5 font-medium text-slate-600 dark:text-slate-400">${fmtMoney(y.annualContribution, true)}</td>
      <td class="px-2 py-2.5 font-bold text-primary">+${fmtMoney(y.returnEarned, true)}</td>
      <td class="px-2 py-2.5 font-medium text-slate-600 dark:text-slate-400">${fmtMoney(y.dividends, true)}</td>
      <td class="px-2 py-2.5 font-medium text-orange-500 dark:text-orange-400">
        ${y.capitalGainTax > 0 ? `-${fmtMoney(y.capitalGainTax, true)}` : '-'}
      </td>
      <td class="px-2 py-2.5 font-medium text-red-600 dark:text-red-400 hidden">-${fmtMoney(y.annualWithdrawal, true)}</td>
      <td class="px-2 py-2.5 font-black">
        <div class="flex flex-col">
          <span>${fmtMoney(y.endBalance, true)}</span>
          <span class="text-xs text-slate-400 font-normal">실질 ${fmtMoney(realBalance, true)}</span>
        </div>
      </td>
      <td class="px-2 py-2.5 text-center" title="${fullPortfolioTitle}">${portfolioDisplayHtml}</td>
      <td class="px-2 py-2.5 font-medium text-sky-600 dark:text-sky-300">
        <div class="flex flex-col">
          <span>+${fmtMoney(y.annualCashFlow, true)}</span>
          <span class="text-xs text-slate-400 font-normal">실질 +${fmtMoney(realCashFlow, true)}</span>
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
  tbody.innerHTML = filtered.map(buildAnnualRow).join("");
  initTooltips();
}

function renderChart(results) {
  const filteredYears = results.years.filter(passesFilter);
  const labels = filteredYears.map(y => [`${String(y.year)}`, `${y.age}세`]);
  let cumulativePrincipal = 0;
  const principalData = [];
  const returnData = [];

  results.years.forEach(year => {
      cumulativePrincipal += year.annualContribution - year.annualWithdrawal - year.capitalGainTax;
      if(passesFilter(year)){
          const principalComponent = Math.max(0, Math.min(cumulativePrincipal, year.endBalance));
          const returnComponent = Math.max(0, year.endBalance - principalComponent);
          principalData.push(principalComponent);
          returnData.push(returnComponent);
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
        { label: getText('CHART.PRINCIPAL_LABEL'), data: principalData, backgroundColor: '#2563eb' },
        { label: getText('CHART.RETURN_LABEL'), data: returnData, backgroundColor: '#84cc16' }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) label += fmtMoney(context.parsed.y, true);
              return label;
            },
            footer: function(tooltipItems) {
                let sum = 0;
                tooltipItems.forEach(function(tooltipItem) { sum += tooltipItem.parsed.y; });
                return getText('CHART.TOTAL_LABEL', fmtMoney(sum, true));
            }
          }
        }
      },
      scales: { x: { stacked: true }, y: { stacked: true, ticks: { callback: (value) => fmtMoney(value, true) } } }
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
                <div class="text-blue-400">+${fmtMoney(p.dividend)}</div>
                ` : ''}
            </div>
          `}).join('');
      } else {
          html += `<div class="text-slate-400">${getText('TOOLTIP.NO_DATA')}</div>`;
      }
      const eventsAtAge = state.events.filter(e => e.age === yearData.age);
        if (eventsAtAge.length > 0) {
            html += `<div class="font-bold mt-3 mb-2 text-base border-t border-slate-700 pt-2">${getText('TOOLTIP.EVENT_TITLE')}</div>`;
            html += eventsAtAge.map(ev => `<p class="text-xs text-slate-300 mb-1 ${!ev.enabled ? 'line-through' : ''}">${getEventSubtitle(ev, 'dark')}</p>`).join('');
        }
      tooltip.innerHTML = html;
      tooltip.classList.remove('hidden');
      const tooltipRect = tooltip.getBoundingClientRect();
      let left = e.clientX + 10, top = e.clientY + 10;
      if (left + tooltipRect.width > window.innerWidth) left = e.clientX - tooltipRect.width - 10;
      if (top + tooltipRect.height > window.innerHeight) top = e.clientY - tooltipRect.height - 10;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    });
    row.addEventListener('mouseleave', () => { tooltip.classList.add('hidden'); });
  });

  const headerTooltips = {
      'th-year-age': getText('TABLE.TOOLTIP_YEAR_AGE'),
      'th-contribution': getText('TABLE.TOOLTIP_ANNUAL_CONTRIBUTION'),
      'th-return': getText('TABLE.TOOLTIP_RETURN'),
      'th-dividend': getText('TABLE.TOOLTIP_DIVIDEND'),
      'th-withdrawal': getText('TABLE.TOOLTIP_WITHDRAWAL'),
      'th-cash-flow': getText('TABLE.TOOLTIP_CASH_FLOW'),
      'th-balance': getText('TABLE.TOOLTIP_BALANCE'),
      'th-portfolio': getText('TABLE.TOOLTIP_PORTFOLIO'),
      'th-capital-gain-tax': getText('TABLE.TOOLTIP_CAPITAL_GAIN_TAX')
  };

  Object.entries(headerTooltips).forEach(([id, text]) => {
      const th = $(id);
      if (!th) return;
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
    if (retirementBalance <= 0 || !portfolio) return 0;
    const targetAge = 90;
    const targetEndBalance = retirementBalance * 0.2;

    const getFinalBalance = (monthlyWithdrawal) => {
        let balance = retirementBalance;
        for (let age = retirementAge; age < targetAge; age++) {
            for (let m = 1; m <= 12; m++) {
                const portfolioReturn = balance * (portfolio.annualReturnPct / 100 / 12);
                const dividend = balance * (portfolio.dividendPct / 100 / 12) * (1 - state.dividendTaxRate);
                balance += portfolioReturn + dividend;
                const withdrawalAmount = Math.min(balance, monthlyWithdrawal);
                balance -= withdrawalAmount;
            }
        }
        return balance;
    };

    let low = 0;
    let high = retirementBalance / 12;
    let mid = 0;

    for(let i=0; i<100; i++) {
        mid = (low + high) / 2;
        if (mid === 0) break;
        const finalBalance = getFinalBalance(mid);
        if (finalBalance > targetEndBalance) {
            low = mid;
        } else {
            high = mid;
        }
    }
    return mid;
}

function updateObservation(results) {
    const last = results.years[results.years.length - 1];
    let msg = ``;
    if (last) msg += getText('OBSERVATION.FINAL_RESULT', state.maxAge, last.year, fmtMoney(last.endBalance, true));

    const firstTaxYear = results.years.find(y => y.capitalGainTax > 0);
    if (firstTaxYear) {
        msg += " " + getText('OBSERVATION.TAX_WARNING', firstTaxYear.year, fmtMoney(firstTaxYear.capitalGainTax, true));
    }

    $("observation").innerHTML = msg || getText('OBSERVATION.NO_RESULT');
    $("sustainableWithdrawal").innerHTML = "";
}

/** =============================
 *  Recalc + Render
 *  ============================= */
function recalcAndRender() {
  const results = simulate();
  state.results = results;
  $("rangeLabel").textContent = getText('RESULTS.RANGE_LABEL', results.startYear, results.ageNow, results.endAge, results.endAge);
  renderAnnualTable(results);
  updateObservation(results);
  renderEventList();
  updateFilterButton();
  if (!$("chartPanel").classList.contains("hidden")) renderChart(state.results);
}
