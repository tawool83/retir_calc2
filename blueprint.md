# Blueprint

## Overview

This is a retirement simulator that allows users to project their savings over time based on their current age, retirement age, initial investment, and monthly contributions. It also allows for custom events, such as changing the portfolio, making lump-sum investments, or receiving a pension.

## Features

*   **Core Logic:** All business logic is encapsulated in `main.js`, which is responsible for running the simulation and rendering the data.
*   **Data Persistence:** The application saves the user's data to the browser's local storage, allowing them to pick up where they left off.
*   **Dynamic Portfolio:** Users can define custom investment portfolios with different return and dividend rates, and the simulation will adjust accordingly.
*   **Event-Based Scenarios:** Users can create events at different ages to simulate real-life scenarios, such as a promotion or a large purchase.
*   **Tooltip:** When hovering over a row in the table, a tooltip appears, showing a detailed breakdown of the portfolio for that year, including the value, return, and dividend for each asset.
*   **Chart:** The application includes a chart that visualizes the user's savings over time, with labels showing both the year and the user's age.
*   **Responsive Design:** The application is fully responsive and works on both desktop and mobile devices.

## Current Plan

I will now update the `blueprint.md` file to reflect the latest changes, which include applying a 15.4% tax to dividends and adding tooltips to the table headers to explain what each column means.