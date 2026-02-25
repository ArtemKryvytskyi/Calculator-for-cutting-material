// =======================
// slat.js — CLASSIC + BALANCE
// =======================

// ---------- Глобальные ----------
let items = [];
let initialItems = [];
let leftoverStocks = [];
let generatedCombinations = [];
let historyLog = [];

let totalNewStocksUsed = 0;
let totalLeftoversUsed = 0;

let calculationMode = "classic";
// "classic" | "balance"

// ---------- Добавление деталей ----------
function addItem() {
  const size = parseInt(document.getElementById("size").value);
  const qty = parseInt(document.getElementById("qty").value);
  if (!size || !qty || size <= 0 || qty <= 0) return;

  const ex = items.find(i => i.size === size);
  ex ? ex.qty += qty : items.push({ size, qty });

  renderItemsTable();
  document.getElementById("size").value = "";
  document.getElementById("qty").value = "";
}

// ---------- Таблица ----------
function renderItemsTable() {
  const tbody = document.querySelector("#itemsTable tbody");
  tbody.innerHTML = "";
  items.forEach(i => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${i.size}</td><td>${i.qty}</td>`;
    tbody.appendChild(tr);
  });
}

// ---------- Переключение режимов ----------
function setClassicMode() {
  calculationMode = "classic";
  calculate();
}

function setBalanceMode() {
  calculationMode = "balance";
  calculate();
}

// ---------- Запуск ----------
function calculate() {
  initialItems = JSON.parse(JSON.stringify(items));
  leftoverStocks = [];
  generatedCombinations = [];
  historyLog = [];
  totalNewStocksUsed = 0;
  totalLeftoversUsed = 0;

  calculationMode === "classic"
    ? generateVariants()
    : autoBalanceCutting();
}

// =======================
// CLASSIC (как было)
// =======================
function generateVariants() {
  const stock = parseInt(document.getElementById("stock").value);
  if (!stock) return;

  const sizes = items.filter(i => i.qty > 0).map(i => i.size).sort((a, b) => b - a);
  if (!sizes.length) return showFinalSummary();

  let all = [];

  genComb(sizes, stock).forEach(c =>
    all.push({ ...c, source: "new", label: "Новая заготовка" })
  );

  leftoverStocks.forEach((l, idx) =>
    genComb(sizes, l).forEach(c =>
      all.push({ ...c, source: "leftover", label: `Обрезок ${l}`, idx })
    )
  );

  const uniq = {};
  all.forEach(c => {
    const k = [...c.pieces].sort((a, b) => a - b).join("-") + "|" + c.remaining;
    uniq[k] = c;
  });

  renderCombinations(Object.values(uniq).sort((a, b) => a.remaining - b.remaining));
}

function genComb(sizes, len) {
  const res = [];
  function bt(start, cur, sum) {
    const rem = len - sum;
    if (cur.length && rem >= 0) res.push({ pieces: [...cur], remaining: rem });
    for (let i = start; i < sizes.length; i++) {
      if (sum + sizes[i] <= len) {
        cur.push(sizes[i]);
        bt(i + 1, cur, sum + sizes[i]);
        cur.pop();
      }
    }
  }
  bt(0, [], 0);
  return res;
}

function renderCombinations(list) {
  const r = document.getElementById("result");
  if (!list.length) return showFinalSummary();

  generatedCombinations = list;
  let h = renderHistory() + "<h3>Выберите вариант:</h3>";

  list.forEach((c, i) => {
    h += `
    <div style="border:1px solid #ccc;padding:8px;margin:6px">
      ${c.pieces.join(" + ")}<br>
      Остаток: ${c.remaining} мм<br>
      ${c.label}<br>
      <button onclick="applyCombination(${i})">Выбрать</button>
    </div>`;
  });

  r.innerHTML = h;
}

function applyCombination(i) {
  const c = generatedCombinations[i];
  let copy = JSON.parse(JSON.stringify(items));
  let min = Infinity;

  c.pieces.forEach(p => {
    const it = copy.find(i => i.size === p);
    min = it ? Math.min(min, it.qty) : 0;
  });
  if (!min) return;

  c.source === "new" ? totalNewStocksUsed += min : leftoverStocks.splice(c.idx, 1);

  c.pieces.forEach(p => {
    const it = copy.find(i => i.size === p);
    if (it) it.qty -= min;
  });

  for (let i = 0; i < min; i++) if (c.remaining > 0) leftoverStocks.push(c.remaining);

  items = copy;
  historyLog.push({ ...c, count: min });
  renderItemsTable();
  generateVariants();
}

// =======================
// BALANCE MODE (новое)
// =======================
function autoBalanceCutting() {
  const stock = parseInt(document.getElementById("stock").value);
  const sizes = items.filter(i => i.qty > 0).map(i => i.size).sort((a, b) => b - a);
  if (!sizes.length) return showFinalSummary();

  let best = null;
  leftoverStocks.forEach((l, idx) => {
    const c = findBest(sizes, l, "leftover");
    if (c && (!best || c.score < best.score)) best = { ...c, idx };
  });

  const fromNew = findBest(sizes, stock, "new");
  if (fromNew && (!best || fromNew.score < best.score)) best = fromNew;

  if (!best) return showFinalSummary();
  applyBalanced(best);
}

function findBest(sizes, len, src) {
  let best = null;
  const map = {};
  leftoverStocks.forEach(l => map[l] = (map[l] || 0) + 1);

  function bt(start, cur, sum) {
    const rem = len - sum;
    if (rem < 0 || cur.length > 4) return;
    if (cur.length) {
      let score = (src === "new" ? 1000 : 0) + rem;
      if (rem < 400) score += 800;
      if (rem < 400 && (map[rem] || 0) >= 50) score += 1500;
      if (rem % 100 === 0) score -= 200;
      if (!best || score < best.score)
        best = { pieces: [...cur], remaining: rem, score, source: src };
    }
    for (let i = start; i < sizes.length; i++)
      bt(i + 1, [...cur, sizes[i]], sum + sizes[i]);
  }
  bt(0, [], 0);
  return best;
}

function applyBalanced(c) {
  let copy = JSON.parse(JSON.stringify(items));
  let min = Infinity;
  c.pieces.forEach(p => {
    const it = copy.find(i => i.size === p);
    min = it ? Math.min(min, it.qty) : 0;
  });
  if (!min) return showFinalSummary();

  c.source === "new" ? totalNewStocksUsed += min : leftoverStocks.splice(c.idx, 1);
  c.pieces.forEach(p => {
    const it = copy.find(i => i.size === p);
    if (it) it.qty -= min;
  });
  for (let i = 0; i < min; i++) if (c.remaining > 0) leftoverStocks.push(c.remaining);

  items = copy;
  historyLog.push({ pieces: c.pieces, remaining: c.remaining, count: min, source: c.source });
  renderItemsTable();
  autoBalanceCutting();
}

// =======================
// Общие
// =======================
function renderHistory() {
  if (!historyLog.length) return "";
  let h = "<h3>Этапы:</h3>";
  historyLog.forEach((s, i) => {
    h += `${i + 1}) ${s.pieces.join("+")} ×${s.count} → ${s.remaining} мм<br>`;
  });
  return h + "<hr>";
}

function renderLeftovers() {
  if (!leftoverStocks.length) return "<p>Остатков нет</p>";
  const g = {}; leftoverStocks.forEach(l => g[l] = (g[l] || 0) + 1);
  let h = "<h4>Обрезки:</h4>", sum = 0;
  Object.keys(g).sort((a, b) => b - a).forEach(k => {
    h += `${k} мм × ${g[k]}<br>`;
    sum += k * g[k];
  });
  return h + `<b>Всего:</b> ${leftoverStocks.length}<br><b>Длина:</b> ${sum} мм`;
}

function showFinalSummary() {
  document.getElementById("result").innerHTML =
    renderHistory() +
    `<h3>Завершено</h3>
     Новые: ${totalNewStocksUsed}<br>
     Обрезки: ${totalLeftoversUsed}<br>
     ${renderLeftovers()}
     <br><button onclick="resetCutting()">🔁 Повторить</button>`;
}

function resetCutting() {
  items = JSON.parse(JSON.stringify(initialItems));
  leftoverStocks = [];
  historyLog = [];
  renderItemsTable();
  document.getElementById("result").innerHTML = "";
}