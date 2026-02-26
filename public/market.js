document.addEventListener('DOMContentLoaded', () => {
    const symbolSearch = document.getElementById('symbolSearch');
    const loadingState = document.getElementById('loadingState');
    const errorState = document.getElementById('errorState');
    const errorMessage = document.getElementById('errorMessage');
    const welcomeState = document.getElementById('welcomeState');
    const dataContainer = document.getElementById('dataContainer');

    let chart = null;

    // Debounce function to limit API calls
    let debounceTimer;
    symbolSearch.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const symbol = e.target.value.trim().toUpperCase();
            if (symbol) {
                fetchAndDisplayData(symbol);
            }
        }, 1000); // Wait for 1 second of no typing
    });

    async function fetchAndDisplayData(symbol) {
        // Reset UI
        dataContainer.classList.add('hidden');
        welcomeState.classList.add('hidden');
        errorState.classList.add('hidden');
        loadingState.classList.remove('hidden');

        try {
            const [overview, timeSeries] = await Promise.all([
                getCompanyOverview(symbol),
                getTimeSeriesDaily(symbol)
            ]);

            loadingState.classList.add('hidden');

            if (!overview || !timeSeries) {
                throw new Error("데이터를 불러오는 데 실패했습니다. API 요청 제한에 도달했거나 유효하지 않은 심볼일 수 있습니다.");
            }

            displayCompanyInfo(overview);
            displayChart(timeSeries, overview.Symbol);
            displayKPIs(overview);

            dataContainer.classList.remove('hidden');

        } catch (error) {
            loadingState.classList.add('hidden');
            errorMessage.textContent = error.message;
            errorState.classList.remove('hidden');
        }
    }

    function displayCompanyInfo(data) {
        document.getElementById('companyName').textContent = data.Name || 'N/A';
        document.getElementById('companySymbol').textContent = data.Symbol || 'N/A';
        document.getElementById('companyExchange').textContent = `${data.AssetType} | ${data.Exchange}`;
        document.getElementById('companyDescription').textContent = data.Description || '설명이 제공되지 않았습니다.';
        
        // You might need a logo service for this
        // document.getElementById('companyLogo').src = `URL_TO_LOGO_API/${data.Symbol}`;
    }

    function displayChart(timeSeries, symbol) {
        const ctx = document.getElementById('priceChart').getContext('2d');
        const dates = Object.keys(timeSeries).reverse();
        const prices = dates.map(date => parseFloat(timeSeries[date]['4. close']));

        if (chart) {
            chart.destroy();
        }

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: `${symbol} 종가`,
                    data: prices,
                    borderColor: '#2563eb',
                    backgroundColor: 'rgba(37, 99, 235, 0.1)',
                    fill: true,
                    tension: 0.1,
                    pointRadius: 0,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        ticks: { display: false },
                        grid: { display: false }
                    },
                    y: {
                        ticks: { 
                            callback: (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value),
                            color: document.documentElement.classList.contains('dark') ? '#94a3b8' : '#64748b' 
                        },
                        grid: { color: document.documentElement.classList.contains('dark') ? '#334155' : '#e2e8f0' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                         callbacks: {
                            label: (context) => `종가: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(context.parsed.y)}`
                        }
                    }
                }
            }
        });
    }

    function displayKPIs(data) {
        const formatNumber = (num) => {
            if (num === undefined || num === null || num === 'None') return 'N/A';
            const number = parseFloat(num);
            if (number > 1_000_000_000_000) return `${(number / 1_000_000_000_000).toFixed(2)}T`;
            if (number > 1_000_000_000) return `${(number / 1_000_000_000).toFixed(2)}B`;
            if (number > 1_000_000) return `${(number / 1_000_000).toFixed(2)}M`;
            return number.toString();
        };

        document.getElementById('marketCap').textContent = formatNumber(data.MarketCapitalization);
        document.getElementById('peRatio').textContent = data.PERatio !== 'None' ? parseFloat(data.PERatio).toFixed(2) : 'N/A';
        document.getElementById('dividendYield').textContent = data.DividendYield !== 'None' ? `${(parseFloat(data.DividendYield) * 100).toFixed(2)}%` : 'N/A';
        document.getElementById('52WeekHigh').textContent = data["52WeekHigh"] ? `$${parseFloat(data["52WeekHigh"]).toFixed(2)}` : 'N/A';
    }
});
