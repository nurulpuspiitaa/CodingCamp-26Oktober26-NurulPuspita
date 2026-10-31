# Expense & Budget Visualizer

A responsive, client-side daily expense tracker built with HTML, CSS, and Vanilla JavaScript.

## Required MVP
- Add an expense with item name, amount, category, and date.
- Validate required fields and positive whole-number amounts.
- Display a scrollable transaction list.
- Delete transactions.
- Automatically update total balance, monthly spending, and transaction count.
- Display a category breakdown chart.

## Three selected optional challenges
1. **Custom categories** — add categories beyond Food, Transport, and Fun.
2. **Monthly summary** — show the total spending for the current month.
3. **Sort transactions** — sort by newest, amount (high-to-low / low-to-high), or category.

## Technology
- HTML
- CSS (one stylesheet: `css/style.css`)
- Vanilla JavaScript (one script: `js/script.js`)
- Chart.js via CDN
- Browser Local Storage

## Run locally
Open `index.html` in a modern browser. An internet connection is needed to load Chart.js and the Google Fonts CDN. Transactions are stored in the browser where they were entered.

## Notes
- “Total Balance” represents the sum of recorded expenses because the assignment does not include an income field.
- This is a front-end-only project; no server or account system is used.
