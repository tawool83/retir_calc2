const API_KEY = "03158JFBWW7S5CEU";

async function getCompanyOverview(symbol) {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Handle API limit notes or empty responses gracefully
        if (data.Note || data.Information || Object.keys(data).length === 0) {
            console.warn('Alpha Vantage API limit likely reached, or symbol not supported for OVERVIEW.', data);
            return null; 
        }
        return data;
    } catch (error) {
        console.error("Error fetching company overview:", error);
        return null;
    }
}

async function getTimeSeriesMonthly(symbol) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${symbol}&apikey=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // Handle API limit notes
        if (data.Note || data.Information || !data["Monthly Adjusted Time Series"]) {
            console.warn('Alpha Vantage API limit likely reached or invalid symbol for Monthly Series.', data);
            return null;
        }
        return data["Monthly Adjusted Time Series"];
    } catch (error) {
        console.error("Error fetching time series data:", error);
        return null;
    }
}
