# **Retirement Simulator with Dynamic Portfolio Allocation**

This application is a web-based retirement simulator that allows users to project their financial future based on a set of inputs and event-driven scenarios. It now features a dynamic portfolio allocation system where users can define different investment strategies (presets) and change their portfolio composition over time.

## **Core Features**

*   **Dynamic Portfolio Allocation:** Users can create multiple investment presets, each with its own assumed annual return and dividend yield. They can then create "portfolio change" events to adjust the allocation of their assets between these presets at different ages. For example, a user can start with an aggressive 100% S&P 500 allocation and later shift to a more conservative 50/50 split between S&P 500 and a dividend-focused fund like SCHD.
*   **Event-Driven Scenarios:** Users can model various life events that impact their financial journey. Supported events include:
    *   **Portfolio Change:** Adjust the investment strategy at a specific age.
    *   **Monthly Contribution Change:** Increase or decrease the amount of money invested each month.
    *   **Lump-Sum Investment:** Model one-time events like an inheritance or the sale of an asset.
    *   **Pension (Withdrawal):** Simulate the start of pension payments, which are withdrawn from the portfolio balance.
*   **Interactive Chart & Table:** The application visualizes the projected growth of the user's portfolio through an interactive chart and a detailed annual table. The chart shows the composition of the portfolio over time, broken down into principal and returns.
*   **Persistent State:** All user inputs, including presets and events, are automatically saved to the browser's local storage. This allows users to close the application and resume their simulation later.
*   **Data Export:** Users can export their simulation results to a CSV file for further analysis.

## **Current Implementation Plan**

### **UI/UX**

*   [x] The main UI is divided into a left-side control panel and a right-side results panel.
*   [x] The control panel contains sections for basic configuration (age, retirement, initial investment), event management, and table filtering.
*   [x] The results panel displays the annual projection table and an interactive chart.
*   [x] A new modal dialog has been implemented for managing investment presets (create, delete).
*   [x] The event creation dialog has been updated to support the new "portfolio change" event, allowing users to select a preset and assign a weight to it.

### **State Management**

*   [x] The application state is managed in a single JavaScript object.
*   [x] The state includes user inputs, a list of presets, and a list of events.
*   [x] A snapshot of the state is automatically saved to local storage whenever a change is made.

### **Simulation Logic**

*   [x] The core simulation logic has been rewritten to support dynamic portfolio allocation.
*   [x] The simulator now calculates the growth of each preset in the portfolio independently, based on its assigned weight.
*   [x] The simulation takes into account all user-defined events, such as changes in monthly contributions, lump-sum investments, and pension withdrawals.

### **Next Steps**

*   The current implementation is complete. No further steps are planned at this time.