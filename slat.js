// =======================
// Глобальные переменные
// =======================

let items = [];
let generatedCombinations = [];
let leftoverStocks = [];

let historyLog = [];
let totalNewStocksUsed = 0;
let totalLeftoversUsed = 0;

// =======================
// Добавление детали
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
// Запуск генерации
// =======================

function calculate() {
  historyLog = [];
  totalNewStocksUsed = 0;
  totalLeftoversUsed = 0;

  generateVariants();
}

// =======================
// Генерация вариантов
// =======================

function generateVariants() {
  const stockLength = parseInt(document.getElementById("stock").value);
  if (!stockLength) return;

  let activeSizes = items.filter(i => i.qty > 0).map(i => i.size);
  if (activeSizes.length === 0) {
    showFinalSummary();
    return;
  }

  activeSizes.sort((a, b) => b - a);

  let allCombinations = [];

  // Новая заготовка
  generateEfficientCombinations(activeSizes, stockLength)
    .forEach(c => {
      allCombinations.push({
        ...c,
        source: "new",
        sourceLabel: "Новая заготовка"
      });
    });

  // Остатки
  leftoverStocks.forEach((leftover, index) => {
    generateEfficientCombinations(activeSizes, leftover)
      .forEach(c => {
        allCombinations.push({
          ...c,
          source: "leftover",
          sourceLabel: "Обрезок " + leftover + " мм",
          leftoverIndex: index
        });
      });
  });

  // 🔥 Сортировка по остатку
  allCombinations.sort((a, b) => a.remaining - b.remaining);

  renderCombinations(allCombinations);
}

// =======================
// Алгоритм перебора
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

  let html = "<h3>Выберите вариант:</h3>";

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

  resultDiv.innerHTML = renderHistory() + html;
}

// =======================
// Применение варианта
// =======================

function applyCombination(index) {
  const selected = generatedCombinations[index];

  // списываем детали
  selected.pieces.forEach(piece => {
    const found = items.find(i => i.size === piece && i.qty > 0);
    if (found) found.qty--;
  });

  // если использован обрезок — удалить его
  if (selected.source === "leftover") {
    leftoverStocks.splice(selected.leftoverIndex, 1);
    totalLeftoversUsed++;
  } else {
    totalNewStocksUsed++;
  }

  // сохраняем новый остаток
  if (selected.remaining > 0) {
    leftoverStocks.push(selected.remaining);
  }

  historyLog.push({
    pieces: selected.pieces,
    remaining: selected.remaining,
    source: selected.sourceLabel
  });

  renderItemsTable();
  generateVariants();
}

// =======================
// История этапов
// =======================

function renderHistory() {
  if (historyLog.length === 0) return "";

  let html = "<h3>Этапы раскроя:</h3>";

  historyLog.forEach((step, index) => {
    html += `
      <div style="margin-bottom:5px;">
        ${index + 1}) ${step.pieces.join(" + ")}
        | Остаток: ${step.remaining} мм
        | ${step.source}
      </div>
    `;
  });

  html += "<hr>";
  return html;
}

// =======================
// Финальный итог
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