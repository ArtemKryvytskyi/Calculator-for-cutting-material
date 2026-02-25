// =======================
// slat.js — профессиональная версия
// =======================

// Глобальные переменные
let items = [];
let leftoverStocks = [];
let generatedCombinations = [];
let historyLog = [];
let totalNewStocksUsed = 0;
let totalLeftoversUsed = 0;

// =======================
// Добавление деталей
// =======================
function addItem() {
  const size = parseInt(document.getElementById("size").value);
  const qty = parseInt(document.getElementById("qty").value);

  if (isNaN(size) || isNaN(qty) || size <= 0 || qty <= 0) return;

  const existing = items.find(i => i.size === size);
  if (existing) existing.qty += qty;
  else items.push({ size, qty });

  renderItemsTable();
  document.getElementById("size").value = "";
  document.getElementById("qty").value = "";
}

// =======================
// Добавление остатка вручную
// =======================
function addManualLeftover() {
  const value = parseInt(document.getElementById("manualLeftover").value);
  if (isNaN(value) || value <= 0) return;

  leftoverStocks.push(value);
  document.getElementById("manualLeftover").value = "";
}

// =======================
// Отображение таблицы деталей
// =======================
function renderItemsTable() {
  const tbody = document.querySelector("#itemsTable tbody");
  tbody.innerHTML = "";

  items.forEach(item => {
    const row = document.createElement("tr");
    row.innerHTML = `<td>${item.size}</td><td>${item.qty}</td>`;
    tbody.appendChild(row);
  });
}

// =======================
// Запуск расчёта
// =======================
function calculate() {
  historyLog = [];
  totalNewStocksUsed = 0;
  totalLeftoversUsed = 0;
  generateVariants();
}

// =======================
// Генерация уникальных вариантов
// =======================
function generateVariants() {
  const stockLength = parseInt(document.getElementById("stock").value);
  if (!stockLength) return;

  // Активные размеры
  const activeSizes = items.filter(i => i.qty > 0).map(i => i.size);
  if (activeSizes.length === 0) {
    showFinalSummary();
    return;
  }

  // Сортировка по убыванию для оптимизации
  activeSizes.sort((a, b) => b - a);

  let allCombinations = [];

  // 1️⃣ Новая заготовка
  generateEfficientCombinations(activeSizes, stockLength).forEach(c => {
    allCombinations.push({
      ...c,
      sourceLabel: "Новая заготовка",
      source: "new"
    });
  });

  // 2️⃣ Остатки
  leftoverStocks.forEach((leftover, index) => {
    generateEfficientCombinations(activeSizes, leftover).forEach(c => {
      allCombinations.push({
        ...c,
        sourceLabel: `Обрезок ${leftover} мм`,
        source: "leftover",
        leftoverIndex: index
      });
    });
  });

  // 🔹 Исключаем дубли
  const unique = {};
  allCombinations.forEach(c => {
    const key = [...c.pieces].sort((a, b) => a - b).join("-") + "|" + c.remaining;
    unique[key] = c;
  });
  const uniqueCombinations = Object.values(unique);

  // 🔹 Сортировка по остатку (меньший сначала)
  uniqueCombinations.sort((a, b) => a.remaining - b.remaining);

  renderCombinations(uniqueCombinations);
}

// =======================
// Генерация комбинаций (backtracking)
// =======================
function generateEfficientCombinations(sizes, stockLength) {
  const results = [];

  function backtrack(start, current, sum) {
    const remaining = stockLength - sum;
    if (current.length > 0 && remaining >= 0) {
      results.push({ pieces: [...current], remaining });
    }
    for (let i = start; i < sizes.length; i++) {
      if (sum + sizes[i] <= stockLength) {
        current.push(sizes[i]);
        backtrack(i + 1, current, sum + sizes[i]);
        current.pop();
      }
    }
  }

  backtrack(0, [], 0);
  return results;
}

// =======================
// Отображение вариантов
// =======================
function renderCombinations(combos) {
  const resultDiv = document.getElementById("result");
  if (combos.length === 0) {
    showFinalSummary();
    return;
  }

  generatedCombinations = combos;

  let html = renderHistory();
  html += "<h3>Выберите вариант раскроя:</h3>";

  combos.forEach((c, i) => {
    html += `
      <div style="margin-bottom:10px;padding:10px;border:1px solid #ccc;">
        ${c.pieces.join(" + ")}
        <br>Остаток: ${c.remaining} мм
        <br>Источник: <b>${c.sourceLabel}</b>
        <br><br>
        <button onclick="applyCombination(${i})">Выбрать</button>
      </div>
    `;
  });

  resultDiv.innerHTML = html;
}

// =======================
// Применение выбранного варианта (максимальное использование)
// =======================
function applyCombination(index) {
  const selected = generatedCombinations[index];

  // Копия текущих деталей
  let remainingItems = JSON.parse(JSON.stringify(items));

  // Подсчёт максимально возможного применения
  let minQty = Infinity;
  selected.pieces.forEach(p => {
    const item = remainingItems.find(i => i.size === p);
    if (item) minQty = Math.min(minQty, item.qty);
    else minQty = 0;
  });

  if (minQty === 0) return; // невозможно применить

  // Используем обрезки, если есть
  if (selected.source === "leftover") {
    leftoverStocks.splice(selected.leftoverIndex, 1);
    totalLeftoversUsed += minQty;
  } else {
    totalNewStocksUsed += minQty;
  }

  // Списываем детали
  selected.pieces.forEach(p => {
    const item = remainingItems.find(i => i.size === p);
    if (item) item.qty -= minQty;
  });

  // Добавляем остатки
  if (selected.remaining > 0) {
    for (let i = 0; i < minQty; i++) leftoverStocks.push(selected.remaining);
  }

  items = remainingItems;

  // Сохраняем этап в истории
  historyLog.push({
    pieces: selected.pieces,
    remaining: selected.remaining,
    source: selected.sourceLabel,
    count: minQty
  });

  renderItemsTable();
  generateVariants();
}

// =======================
// Отображение истории
// =======================
function renderHistory() {
  if (historyLog.length === 0) return "";

  let html = "<h3>Этапы раскроя:</h3>";
  historyLog.forEach((step, index) => {
    html += `
      <div style="margin-bottom:5px;">
        ${index + 1}) ${step.pieces.join(" + ")} 
        | применено: ${step.count} раз 
        | остаток: ${step.remaining} мм
        | ${step.source}
      </div>
    `;
  });
  html += "<hr>";
  return html;
}

// =======================
// Финальная статистика
// =======================
function showFinalSummary() {
  const resultDiv = document.getElementById("result");
  let html = renderHistory();
  html += `
    <h3>Раскрой завершён</h3>
    <p>Использовано новых заготовок: <b>${totalNewStocksUsed}</b></p>
    <p>Использовано обрезков: <b>${totalLeftoversUsed}</b></p>
  `;
  resultDiv.innerHTML = html;
}