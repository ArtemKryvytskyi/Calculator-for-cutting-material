let items = [];
let leftovers = {};

function addItem() {
  const size = parseInt(document.getElementById("size").value);
  const qty = parseInt(document.getElementById("qty").value);

  if (!size || !qty) return;

  items.push({ size, qty });

  const tbody = document.querySelector("#itemsTable tbody");
  const row = document.createElement("tr");

  row.innerHTML = `
        <td>${size}</td>
        <td>${qty}</td>
    `;

  tbody.appendChild(row);

  document.getElementById("size").value = "";
  document.getElementById("qty").value = "";
}

function calculate() {
  const stockLength = parseInt(document.getElementById("stock").value);
  const color = document.getElementById("color").value || "default";

  let expanded = [];

  // Разворачиваем детали по количеству
  items.forEach(item => {
    for (let i = 0; i < item.qty; i++) {
      expanded.push(item.size);
    }
  });

  // Сортировка по убыванию (FFD)
  expanded.sort((a, b) => b - a);

  let stocks = [];

  expanded.forEach(piece => {
    let placed = false;

    for (let stock of stocks) {
      if (stock.remaining >= piece) {
        stock.pieces.push(piece);
        stock.remaining -= piece;
        placed = true;
        break;
      }
    }

    if (!placed) {
      stocks.push({
        pieces: [piece],
        remaining: stockLength - piece
      });
    }
  });

  const resultDiv = document.getElementById("result");
  resultDiv.innerHTML = `<h3>Нужно заготовок: ${stocks.length}</h3>`;

  stocks.forEach((stock, index) => {
    resultDiv.innerHTML += `
            <p><b>Заготовка ${index + 1}</b>: 
            ${stock.pieces.join(", ")} 
            | Остаток: ${stock.remaining} мм</p>
        `;

    if (stock.remaining > 0) {
      if (!leftovers[color]) {
        leftovers[color] = [];
      }
      leftovers[color].push(stock.remaining);
    }
  });

  console.log("Остатки:", leftovers);
}