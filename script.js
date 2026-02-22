document.getElementById("calculateButton").addEventListener("click", function () {
  const materialLength = parseInt(document.getElementById("materialLength").value);
  const piecesInput = document.getElementById("pieces").value;
  const pieces = piecesInput.split(",").map(num => parseInt(num.trim()));

  if (isNaN(materialLength) || pieces.some(piece => isNaN(piece))) {
    alert("Please enter the correct information.");
    return;
  }

  const result = calculateCuts(materialLength, pieces);

  // Отображаем результаты
  const cutsDiv = document.getElementById("cuts");
  const materialUsedDiv = document.getElementById("materialUsed");
  const rollsDiv = document.getElementById("rollsNeeded");
  const leftoverDiv = document.getElementById("leftover");

  rollsDiv.innerHTML = `<strong>Necessary:</strong> ${result.rollsNeeded}`;
  leftoverDiv.innerHTML = `<strong>Remain:</strong> ${result.totalLeftover}`;

  cutsDiv.innerHTML = "<strong>The size of the details for the order:</strong><br>" + result.cuts.map(cut => `[${cut.join(", ")}]`).join("<br>");
  materialUsedDiv.innerHTML = `<strong>Total length of the material to be ordered:</strong> ${result.totalMaterialUsed}`;

  rollsDiv.innerHTML = `<strong>Required amount of material:</strong> ${result.rollsNeeded}`;
  leftoverDiv.innerHTML = `<strong>The remainder after cutting:</strong> ${result.totalLeftover}`;
  document.querySelector(".result-section").style.display = "block";
});

// Алгоритм нарезки
function calculateCuts(materialLength, pieces) {
  pieces.sort((a, b) => b - a);

  let totalMaterialUsed = 0;
  let cuts = [];
  let leftovers = [];

  while (pieces.length > 0) {
    let currentRoll = materialLength;
    let currentCut = [];

    for (let i = 0; i < pieces.length; i++) {
      if (pieces[i] <= currentRoll) {
        currentRoll -= pieces[i];
        currentCut.push(pieces[i]);
        pieces.splice(i, 1);
        i--;
      }
    }

    cuts.push(currentCut);
    leftovers.push(currentRoll);
    totalMaterialUsed += materialLength - currentRoll;
  }

  const rollsNeeded = cuts.length;
  const totalLeftover = rollsNeeded * materialLength - totalMaterialUsed;

  return {
    cuts,
    totalMaterialUsed,
    rollsNeeded,
    leftovers,
    totalLeftover
  };
}

