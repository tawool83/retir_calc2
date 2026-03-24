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
    const { initialInvestment } = state.inputs;
    const enabledEvents = state.events.filter(e => e.enabled);
    const ageNow = enabledEvents.length > 0 ? Math.min(...enabledEvents.map(e => e.age)) : 30;
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

            let monthlyDividends = 0;
            const yearsElapsed = age - ageNow;
            portfolioState.forEach(p => {
                const effectiveReturnPct = p.preset.annualReturnPct;
                // dividendGrowthPct > 0 인 경우에만 성장 공식 적용
                // balance가 이미 annualReturnPct로 성장하므로, yield에는 (dg - sg) 초과분만 반영
                // dividendGrowthPct = 0 이면 기존과 동일하게 고정 yield 사용
                const dg = p.preset.dividendGrowthPct ?? 0;
                // 배당 수익률이 총 수익률(주가성장 + 초기배당)을 초과하지 않도록 상한 적용
                // dg >> sg 인 경우 장기간에서 배당률이 비현실적으로 폭발하는 것을 방지
                const maxDividendPct = effectiveReturnPct + p.preset.dividendPct;
                const effectiveDividendPct = dg > 0
                    ? Math.min(
                        p.preset.dividendPct * Math.pow((1 + dg / 100) / (1 + effectiveReturnPct / 100), yearsElapsed),
                        maxDividendPct
                      )
                    : p.preset.dividendPct;
                const r = p.balance * (effectiveReturnPct / 100 / 12);
                const d = p.balance * (effectiveDividendPct / 100 / 12) * (1 - state.dividendTaxRate);
                p.balance += r;
                p.yearReturn += r;
                yReturn += r;

                // 배당금은 재투자되지 않고, 인출에 우선 사용되기 위해 별도로 처리
                monthlyDividends += d;
                p.yearDividend += d;
                yDiv += d;
            });
            
            const lumpSumWithdrawal = lumpSum < 0 ? Math.abs(lumpSum) : 0;
            const totalWithdrawalForMonth = withdrawalMonthly + lumpSumWithdrawal;

            if (totalWithdrawalForMonth > 0) {
                let totalDrawableBalance = portfolioState.reduce((sum, p) => sum + p.balance, 0);
                const actualTotalWithdrawal = Math.min(totalDrawableBalance + monthlyDividends, totalWithdrawalForMonth);
                yWithdrawal += actualTotalWithdrawal;
                
                const saleAmount = Math.max(0, actualTotalWithdrawal - monthlyDividends);

                if (saleAmount > 0) {
                    const fraction = saleAmount / totalDrawableBalance;
                    portfolioState.forEach(p => {
                        const withdrawn = p.balance * fraction;
                        const gainRatio = p.balance > 0 ? Math.max(0, (p.balance - p.costBasis) / p.balance) : 0;
                        const estimatedGain = withdrawn * gainRatio;
                        yRealizedGain += estimatedGain;

                        p.balance -= withdrawn;
                        p.costBasis -= p.costBasis * fraction;
                    });
                }
                
                // 배당금으로 충당하고 남은 금액 재투자
                const reinvestment = Math.max(0, monthlyDividends - actualTotalWithdrawal);
                if (reinvestment > 0) {
                     if (totalDrawableBalance > 0) {
                        portfolioState.forEach(p => {
                            const reinvestAmount = reinvestment * (p.balance / totalDrawableBalance);
                            p.balance += reinvestAmount;
                            p.costBasis += reinvestAmount;
                        });
                    } else if (portfolioState.length > 0) {
                         portfolioState.forEach(p => {
                            const reinvestAmount = reinvestment * p.percentage;
                            p.balance += reinvestAmount;
                            p.costBasis += reinvestAmount;
                        });
                    }
                }
            } else if (monthlyDividends > 0 && portfolioState.length > 0) {
                // 인출이 없을 때는 배당금 전액 재투자
                const totalBalance = portfolioState.reduce((sum, p) => sum + p.balance, 0);
                if (totalBalance > 0) {
                    portfolioState.forEach(p => {
                        const reinvestAmount = monthlyDividends * (p.balance / totalBalance);
                        p.balance += reinvestAmount;
                        p.costBasis += reinvestAmount;
                    });
                } else {
                    portfolioState.forEach(p => {
                        const reinvestAmount = monthlyDividends * p.percentage;
                        p.balance += reinvestAmount;
                        p.costBasis += reinvestAmount;
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
        let detailedPortfolioResult = portfolioState.map(p => ({ name: p.preset.name, balance: p.balance, return: p.yearReturn, dividend: p.yearDividend, costBasis: p.costBasis }));
        if (uninvestedCash > 0) {
            detailedPortfolioResult.push({ name: getText('TABLE.UNINVESTED_CASH'), balance: uninvestedCash, return: 0, dividend: 0, costBasis: uninvestedCash });
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

    return { years, startYear, ageNow, endAge };
}
