/** =============================
 *  Simulation Core
 *  ============================= */
function getActivePortfolio(age, month) {
    const portfolioEvents = state.events
        .filter(e => e.type === 'portfolio' && e.enabled && (e.age < age || (e.age === age && (e.month || 1) <= month)))
        .sort((a, b) => {
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
    const { ageNow, ageRetire, initialInvestment } = state.inputs;
    const endAge = state.maxAge;
    const startYear = state.startYear;
    const activeEvents = state.events.filter(e => e.enabled);

    const years = [];
    let portfolioState = [];
    let uninvestedCash = 0;

    const calculationStartAge = ageNow;

    let initialPortfolioConfig = getActivePortfolio(calculationStartAge, 1);
    if (initialPortfolioConfig.length > 0) {
        portfolioState = initialPortfolioConfig.map(p => ({ ...p, balance: 0, costBasis: 0, yearReturn: 0, yearDividend: 0 }));
    }
    let lastPortfolioSignature = getPortfolioSignature(initialPortfolioConfig);

    for (let age = calculationStartAge; age <= endAge; age++) {
        const year = startYear + (age - ageNow);
        let yContr = 0, yReturn = 0, yDiv = 0, yWithdrawal = 0, yIncome = 0;
        let yRealizedGain = 0;
        let yCapitalGainTax = 0;
        portfolioState.forEach(p => { p.yearReturn = 0; p.yearDividend = 0; });

        for (let m = 1; m <= 12; m++) {
            let currentPortfolioConfig = getActivePortfolio(age, m);
            const currentPortfolioSignature = getPortfolioSignature(currentPortfolioConfig);

            if (currentPortfolioSignature !== lastPortfolioSignature && currentPortfolioSignature !== '') {
                const totalBalance = portfolioState.reduce((sum, p) => sum + p.balance, 0) + uninvestedCash;
                const totalCostBasis = portfolioState.reduce((sum, p) => sum + p.costBasis, 0);
                portfolioState = currentPortfolioConfig.map(p => ({
                    ...p, 
                    balance: totalBalance * p.percentage, 
                    costBasis: totalCostBasis * p.percentage, 
                    yearReturn: 0, 
                    yearDividend: 0 
                }));
                uninvestedCash = 0;
                lastPortfolioSignature = currentPortfolioSignature;
            }
            
            const getActiveEventAmount = (type) => activeEvents
                .filter(e => e.type === type && (e.age < age || (e.age === age && (e.month || 1) <= m)))
                .sort((a,b) => (b.age - a.age) || ((b.month || 1) - (a.month || 1)))
                [0]?.amount ?? 0;

            const activeMonthly = getActiveEventAmount("monthly");
            const withdrawalMonthly = getActiveEventAmount("withdrawal");
            
            const incomeMonthly = activeEvents
                .filter(e => e.type === 'income' && (e.age < age || (e.age === age && (e.month || 1) <= m)))
                .reduce((sum, e) => sum + e.amount, 0);

            let lumpSum = activeEvents
                .filter(e => e.type === 'lump' && e.age === age && (e.month || 1) === m)
                .reduce((sum, e) => sum + e.amount, 0);
            
            if (age === ageNow && m === 1) {
                lumpSum += initialInvestment;
            }

            yIncome += incomeMonthly;
            const monthContribution = activeMonthly + (lumpSum > 0 ? lumpSum : 0);
            yContr += monthContribution;
            uninvestedCash += monthContribution;

            if (uninvestedCash > 0 && currentPortfolioConfig.length > 0) {
                if (portfolioState.length === 0) {
                    portfolioState = currentPortfolioConfig.map(p => ({ ...p, balance: 0, costBasis: 0, yearReturn: 0, yearDividend: 0 }));
                }
                const totalInvested = portfolioState.reduce((sum, p) => sum + p.balance, 0);
                if (totalInvested > 0) {
                    portfolioState.forEach(p => {
                        const investmentAmount = uninvestedCash * (p.balance / totalInvested);
                        p.balance += investmentAmount;
                        p.costBasis += investmentAmount;
                    });
                } else {
                    portfolioState.forEach(p => {
                        const investmentAmount = uninvestedCash * p.percentage;
                        p.balance += investmentAmount;
                        p.costBasis += investmentAmount;
                    });
                }
                uninvestedCash = 0;
            }

            portfolioState.forEach(p => {
                const r = p.balance * (p.preset.annualReturnPct / 100 / 12);
                const d = p.balance * (p.preset.dividendPct / 100 / 12) * (1 - state.dividendTaxRate);
                p.balance += r + d;
                // 배당금은 이미 15.4% 과세된 금액이므로 재투자 시 취득원가에 포함.
                // 이렇게 해야 (balance - costBasis)가 순수 매매차익(가격상승분)만 반영됨.
                p.costBasis += d;
                p.yearReturn += r;
                p.yearDividend += d;
                yReturn += r;
                yDiv += d;
            });
            
            const lumpSumWithdrawal = lumpSum < 0 ? Math.abs(lumpSum) : 0;
            const totalWithdrawalForMonth = withdrawalMonthly + lumpSumWithdrawal;

            if (totalWithdrawalForMonth > 0) {
                let totalDrawable = portfolioState.reduce((sum, p) => sum + p.balance, 0);
                const drawAmount = Math.min(totalDrawable, totalWithdrawalForMonth);
                yWithdrawal += drawAmount;
                if (drawAmount > 0) {
                    const fraction = drawAmount / totalDrawable;
                    portfolioState.forEach(p => {
                        const withdrawn = p.balance * fraction;
                        const gainRatio = p.balance > 0 ? Math.max(0, (p.balance - p.costBasis) / p.balance) : 0;
                        const estimatedGain = withdrawn * gainRatio;
                        yRealizedGain += estimatedGain;

                        p.balance -= withdrawn;
                        p.costBasis -= p.costBasis * fraction;
                    });
                }
            }
        }

        const CAPITAL_GAIN_EXEMPTION = 2500000;
        if (yRealizedGain > CAPITAL_GAIN_EXEMPTION) {
            yCapitalGainTax = (yRealizedGain - CAPITAL_GAIN_EXEMPTION) * 0.22;
            const taxTotalDrawable = portfolioState.reduce((sum, p) => sum + p.balance, 0);
            if (taxTotalDrawable > 0) {
                const taxFraction = Math.min(yCapitalGainTax, taxTotalDrawable) / taxTotalDrawable;
                portfolioState.forEach(p => {
                    p.balance -= p.balance * taxFraction;
                    p.costBasis -= p.costBasis * taxFraction;
                });
            }
        }

        const endBalance = portfolioState.reduce((sum, p) => sum + p.balance, 0) + uninvestedCash;
        let detailedPortfolioResult = portfolioState.map(p => ({ name: p.preset.name, balance: p.balance, return: p.yearReturn, dividend: p.yearDividend }));
        if (uninvestedCash > 0) {
            detailedPortfolioResult.push({ name: getText('TABLE.UNINVESTED_CASH'), balance: uninvestedCash, return: 0, dividend: 0 });
        }

        years.push({
            year, age,
            annualContribution: yContr,
            annualCashFlow: yIncome + yWithdrawal,
            annualWithdrawal: yWithdrawal,
            returnEarned: yReturn,
            dividends: yDiv,
            capitalGainTax: yCapitalGainTax,
            realizedGain: yRealizedGain,
            endBalance,
            portfolio: getActivePortfolio(age, 12),
            detailedPortfolio: detailedPortfolioResult
        });
    }

    return { years, startYear, ageNow, endAge, ageRetire };
}
