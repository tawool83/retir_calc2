const API_KEY = "03158JFBWW7S5CEU";
// https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=VOO&apikey=03158JFBWW7S5CEU

async function getCompanyOverview(symbol) {
    const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.Note || Object.keys(data).length === 0) {
            console.warn('Alpha Vantage API limit likely reached or invalid symbol.', data);
            return null; 
        }
        return data;
    } catch (error) {
        console.error("Error fetching company overview:", error);
        return null;
    }
}

async function getTimeSeriesDaily(symbol) {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&outputsize=full&apikey=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.Note || !data["Time Series (Daily)"]) {
            console.warn('Alpha Vantage API limit likely reached or invalid symbol.', data);
            return null;
        }
        return data["Time Series (Daily)"];
    } catch (error) {
        console.error("Error fetching time series data:", error);
        return null;
    }
}
