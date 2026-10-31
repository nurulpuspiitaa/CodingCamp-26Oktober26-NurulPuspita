const STORAGE_KEYS = {
  transactions: "expenseVisualizer.transactions.v1",
  customCategories: "expenseVisualizer.customCategories.v1",
  iconCounter: "expenseVisualizer.iconCounter.v1"
};

const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];
const CATEGORY_COLORS = ["#7b86df", "#f0a7bd", "#79b6df", "#f2c66d", "#a9a0df", "#85c6ad", "#e69b77"];
const CATEGORY_ICONS = {
  Food: "☕",
  Transport: "↗",
  Fun: "✦"
};
const ICON_PALETTE = ["🛒","🎮","🏠","💊","🎓","✈️","🐾","💪","📱","🎁"];

let transactions = loadFromStorage(STORAGE_KEYS.transactions, []);
let customCategories = loadFromStorage(STORAGE_KEYS.customCategories, []);
let iconCounter = loadFromStorage(STORAGE_KEYS.iconCounter, 0);
let iconMap = {};
let categoryChart = null;

const form = document.getElementById("transactionForm");
const itemNameInput = document.getElementById("itemName");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("transactionDate");
const transactionList = document.getElementById("transactionList");
const sortSelect = document.getElementById("sortSelect");
const formFeedbackEl = document.getElementById("formFeedback");
const catFeedbackEl = document.getElementById("categoryFeedback");

function loadFromStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn(`Could not read ${key} from local storage.`, error);
    return fallback;
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions));
  localStorage.setItem(STORAGE_KEYS.customCategories, JSON.stringify(customCategories));
}

function formatCurrency(value) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(value);
}

function formatDate(dateString) {
  const date = new Date(`${dateString}T00:00:00`);
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getAllCategories() {
  return [...DEFAULT_CATEGORIES, ...customCategories];
}

function rebuildIconMap() {
  let counter = 0;
  customCategories.forEach((name) => {
    iconMap[name] = ICON_PALETTE[counter % ICON_PALETTE.length];
    counter++;
  });
}

function getCategoryIcon(category) {
  if (CATEGORY_ICONS[category]) return CATEGORY_ICONS[category];
  return iconMap[category] || "•";
}

function setDateDefaults() {
  const today = new Date();
  const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 10);
  dateInput.value = localDate;
  document.getElementById("todayLabel").textContent =
    today.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  document.getElementById("monthLabel").textContent =
    today.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function updateCategoryOptions() {
  const currentValue = categoryInput.value;
  categoryInput.innerHTML = '<option value="">Choose category</option>';
  getAllCategories().forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categoryInput.appendChild(option);
  });
  if (getAllCategories().includes(currentValue)) categoryInput.value = currentValue;
}

const feedbackTimers = new WeakMap();

function setFeedback(element, message, delayMs) {
  element.textContent = message;
  clearTimeout(feedbackTimers.get(element));
  const timerId = setTimeout(() => {
    element.textContent = "";
    feedbackTimers.delete(element);
  }, delayMs);
  feedbackTimers.set(element, timerId);
}

function showError(id, message) {
  document.getElementById(id).textContent = message;
}

function clearErrors() {
  ["nameError", "amountError", "categoryError", "dateError"].forEach((id) => showError(id, ""));
}

function validateTransaction(name, amount, category, date) {
  let valid = true;
  clearErrors();

  if (!name.trim()) {
    showError("nameError", "Please enter an item name.");
    valid = false;
  }
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1 || amount > 999_999_999_999) {
    showError("amountError", "Enter a positive whole number between 1 and 999,999,999,999.");
    valid = false;
  }
  if (!getAllCategories().includes(category)) {
    showError("categoryError", "Please choose a category.");
    valid = false;
  }
  const parsedDate = new Date(`${date}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!date || Number.isNaN(parsedDate.getTime()) || parsedDate > today) {
    showError("dateError", "Date must be today or a past date.");
    valid = false;
  }
  return valid;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = itemNameInput.value.trim();
  const amount = Number(amountInput.value);
  const category = categoryInput.value;
  const date = dateInput.value;

  if (!validateTransaction(name, amount, category, date)) return;

  transactions.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    amount,
    category,
    date
  });

  saveToStorage();
  form.reset();
  dateInput.value = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  clearErrors();
  setFeedback(formFeedbackEl, "Transaction added successfully.", 4000);
  renderApp();
  itemNameInput.focus();
});

function deleteTransaction(id) {
  transactions = transactions.filter((transaction) => transaction.id !== id);
  saveToStorage();
  renderApp();
}

function getSortedTransactions() {
  const sorted = [...transactions];
  switch (sortSelect.value) {
    case "amount-high":
      return sorted.sort((a, b) => b.amount - a.amount);
    case "amount-low":
      return sorted.sort((a, b) => a.amount - b.amount);
    case "category":
      return sorted.sort((a, b) => a.category.localeCompare(b.category) || b.date.localeCompare(a.date));
    default:
      return sorted.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }
}

function renderTransactions() {
  transactionList.innerHTML = "";
  const sorted = getSortedTransactions();

  if (sorted.length === 0) {
    transactionList.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">↗</span>
        <strong>No transactions yet</strong>
        <p>Add your first expense to see it here.</p>
      </div>`;
    return;
  }

  sorted.forEach((transaction) => {
    const row = document.createElement("article");
    row.className = "transaction-item";

    const dot = document.createElement("div");
    dot.className = "category-dot";
    dot.textContent = getCategoryIcon(transaction.category);
    dot.setAttribute("aria-hidden", "true");

    const info = document.createElement("div");
    info.className = "transaction-info";
    const name = document.createElement("p");
    name.className = "transaction-name";
    name.textContent = transaction.name;
    const meta = document.createElement("p");
    meta.className = "transaction-meta";
    meta.textContent = `${transaction.category} · ${formatDate(transaction.date)}`;
    info.append(name, meta);

    const right = document.createElement("div");
    right.className = "transaction-right";
    const amount = document.createElement("span");
    amount.className = "transaction-amount";
    amount.textContent = formatCurrency(transaction.amount);

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "×";
    deleteButton.setAttribute("aria-label", `Delete ${transaction.name}`);
    deleteButton.addEventListener("click", () => deleteTransaction(transaction.id));

    right.append(amount, deleteButton);
    row.append(dot, info, right);
    transactionList.appendChild(row);
  });
}

function renderSummary() {
  const total = transactions.reduce((sum, item) => sum + item.amount, 0);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthlyTotal = transactions
    .filter((item) => {
      const date = new Date(`${item.date}T00:00:00`);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    })
    .reduce((sum, item) => sum + item.amount, 0);

  document.getElementById("totalBalance").textContent = formatCurrency(total);
  document.getElementById("monthlyTotal").textContent = formatCurrency(monthlyTotal);
  document.getElementById("transactionCount").textContent = transactions.length;
}

function renderChart() {
  const totals = {};
  transactions.forEach((item) => {
    totals[item.category] = (totals[item.category] || 0) + item.amount;
  });

  const labels = Object.keys(totals);
  const values = labels.map((label) => totals[label]);
  const colors = labels.map((label) => {
    const index = getAllCategories().indexOf(label);
    return CATEGORY_COLORS[(index < 0 ? 0 : index) % CATEGORY_COLORS.length];
  });

  const canvas = document.getElementById("categoryChart");
  document.getElementById("chartEmpty").hidden = labels.length > 0;
  document.getElementById("chartLegend").innerHTML = "";

  if (categoryChart) {
    categoryChart.destroy();
    categoryChart = null;
  }

  if (labels.length > 0 && window.Chart) {
    categoryChart = new Chart(canvas, {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 0,
          hoverOffset: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: "65%",
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => ` ${context.label}: ${formatCurrency(context.raw)}`
            }
          }
        }
      }
    });

    labels.forEach((label, index) => {
      const row = document.createElement("div");
      row.className = "legend-row";
      const left = document.createElement("span");
      left.className = "legend-label";
      const swatch = document.createElement("span");
      swatch.className = "legend-swatch";
      swatch.style.backgroundColor = colors[index];
      const text = document.createElement("span");
      text.textContent = label;
      left.append(swatch, text);
      const value = document.createElement("span");
      value.className = "legend-value";
      value.textContent = formatCurrency(values[index]);
      row.append(left, value);
      document.getElementById("chartLegend").appendChild(row);
    });
  }
}

function renderCustomCategories() {
  const container = document.getElementById("customCategoryList");
  container.innerHTML = "";
  customCategories.forEach((category) => {
    const tag = document.createElement("span");
    tag.className = "category-tag";
    tag.textContent = category;
    container.appendChild(tag);
  });
}

document.getElementById("categoryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.getElementById("newCategory");
  const category = input.value.trim();

  if (!category) {
    input.focus();
    return;
  }
  if (getAllCategories().some((item) => item.toLowerCase() === category.toLowerCase())) {
    setFeedback(catFeedbackEl, "That category already exists.", 4000);
    return;
  }
  if (customCategories.length >= 20) {
    setFeedback(catFeedbackEl, "You've reached the 20-category limit.", 4000);
    return;
  }

  customCategories.push(category);
  saveToStorage();
  updateCategoryOptions();
  renderCustomCategories();
  input.value = "";
  setFeedback(catFeedbackEl, `"${category}" category added.`, 4000);
});

sortSelect.addEventListener("change", renderTransactions);

itemNameInput.addEventListener("input", () => showError("nameError", ""));
amountInput.addEventListener("input", () => showError("amountError", ""));
categoryInput.addEventListener("change", () => showError("categoryError", ""));
dateInput.addEventListener("input", () => showError("dateError", ""));

function renderApp() {
  renderSummary();
  renderTransactions();
  renderChart();
  renderCustomCategories();
}

setDateDefaults();
updateCategoryOptions();
rebuildIconMap();
renderApp();
