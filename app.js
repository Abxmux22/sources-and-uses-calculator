const USES = [
  { key: "purchasePrice", label: "Purchase Price", note: "" },
  { key: "remodel", label: "Remodel", note: "" },
  { key: "legalTitle", label: "Legal & Title", note: "" },
  { key: "thirdPartyFee", label: "3rd Party Fee", note: "" },
  { key: "loanGuarantee", label: "Loan Guarantee", note: "Sponsor Fee" },
  { key: "loanFees", label: "Loan Fees, Closing Cost", note: "" },
  { key: "workingCapital", label: "Working Capital, etc.", note: "" },
  { key: "acquisitionFee", label: "Acquisition Fee", note: "Sponsor Fee" },
  { key: "refinancingFee", label: "Refinancing Fee", note: "Sponsor Fee" }
];

const usesBody = document.getElementById("usesBody");

function numeric(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function money(value, decimals = 0) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Number.isFinite(value) ? value : 0);
}

function percent(value) {
  return `${(Number.isFinite(value) ? value * 100 : 0).toFixed(1)}%`;
}

function renderUses() {
  usesBody.innerHTML = USES.map((item) => `
    <tr data-use="${item.key}">
      <th scope="row">${item.label}</th>
      <td class="input-cell"><span class="currency-prefix">$</span><input data-field="amount" type="number" min="0" step="1000" value="0" inputmode="decimal" aria-label="${item.label} dollar amount" /></td>
      <td class="calculated" data-output="costPerUnit">$0</td>
      <td class="calculated" data-output="allocation">0.0%</td>
      <td class="note-cell">${item.note}</td>
    </tr>
  `).join("");
}

function calculate() {
  const numberOfUnits = numeric(document.getElementById("numberOfUnits").value);
  const rows = [...usesBody.querySelectorAll("tr")];
  const amounts = rows.map((row) => numeric(row.querySelector('[data-field="amount"]').value));
  const totalUses = amounts.reduce((sum, amount) => sum + amount, 0);
  const purchasePrice = amounts[0] || 0;

  rows.forEach((row, index) => {
    row.querySelector('[data-output="costPerUnit"]').textContent = money(numberOfUnits ? amounts[index] / numberOfUnits : 0);
    row.querySelector('[data-output="allocation"]').textContent = percent(totalUses ? amounts[index] / totalUses : 0);
  });

  const loan = numeric(document.getElementById("loan").value);
  const otherLoan = numeric(document.getElementById("otherLoan").value);
  const totalDebt = loan + otherLoan;
  const capitalRaise = totalUses - totalDebt;
  const totalSources = capitalRaise + totalDebt;
  const ltcDenominator = totalUses || 0;
  const ltvDenominator = purchasePrice || 0;

  const sourceValues = {
    capitalRaise: Math.max(capitalRaise, 0),
    loan,
    otherLoan
  };

  document.getElementById("totalUses").textContent = money(totalUses);
  document.getElementById("totalCostPerUnit").textContent = money(numberOfUnits ? totalUses / numberOfUnits : 0);
  document.getElementById("totalAllocation").textContent = percent(totalUses ? 1 : 0);

  document.getElementById("capitalRaise").textContent = money(capitalRaise);
  Object.entries(sourceValues).forEach(([key, value]) => {
    document.getElementById(`${key}Ltc`).textContent = percent(ltcDenominator ? value / ltcDenominator : 0);
    document.getElementById(`${key}Ltv`).textContent = percent(ltvDenominator ? value / ltvDenominator : 0);
  });
  document.getElementById("totalSources").textContent = money(totalSources);
  document.getElementById("totalSourcesLtc").textContent = percent(ltcDenominator ? totalSources / ltcDenominator : 0);
  document.getElementById("totalSourcesLtv").textContent = percent(ltvDenominator ? totalSources / ltvDenominator : 0);

  document.getElementById("summaryUses").textContent = money(totalUses);
  document.getElementById("summaryCapital").textContent = money(capitalRaise);
  document.getElementById("summaryDebt").textContent = money(totalDebt);
  document.getElementById("summaryLtc").textContent = percent(ltcDenominator ? totalDebt / ltcDenominator : 0);

  const balanceMessage = document.getElementById("balanceMessage");
  if (capitalRaise < 0) {
    balanceMessage.textContent = `Debt sources exceed total uses by ${money(Math.abs(capitalRaise))}.`;
    balanceMessage.style.color = "#9a3412";
  } else {
    balanceMessage.textContent = "Sources and uses are balanced.";
    balanceMessage.style.color = "#3f6c47";
  }

  return { numberOfUnits, amounts, totalUses, purchasePrice, loan, otherLoan, totalDebt, capitalRaise, totalSources };
}

function pdfEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7e]/g, "-");
}

function pdfText(value, x, y, size = 9, font = "F1") {
  return `BT /${font} ${size} Tf ${x} ${y} Td (${pdfEscape(value)}) Tj ET\n`;
}

async function createPdf() {
  const data = calculate();
  const name = document.getElementById("fullName").value.trim() || "Not provided";
  const email = document.getElementById("email").value.trim() || "Not provided";
  const logoResponse = await fetch("./assets/real-estate-to-freedom-logo.jpg?v=1");
  if (!logoResponse.ok) throw new Error("Logo could not be loaded");
  const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
  const width = 612;
  const height = 792;
  const left = 42;
  const tableWidth = 528;
  const rowHeight = 23;
  let stream = "";

  stream += "q 90 0 0 83.7 480 678 cm /Logo Do Q\n";
  stream += "0.06 0.09 0.16 rg\n" + pdfText("SOURCES & USES", left, 744, 22, "F2");
  stream += "0.39 0.45 0.55 rg\n" + pdfText(`Prepared for: ${name}`, left, 720, 9) + pdfText(`Email: ${email}`, left, 706, 9);
  stream += pdfText(`Generated: ${new Date().toLocaleDateString("en-US")}`, left, 692, 9);
  stream += "0.06 0.09 0.16 rg\n" + pdfText(`Number of Units: ${data.numberOfUnits.toLocaleString("en-US")}`, left, 666, 10, "F2");

  const usesTop = 630;
  const usesWidths = [174, 102, 102, 86, 64];
  const usesHeaders = ["USES", "DOLLAR AMOUNT", "COST / UNIT", "% ALLOC.", "NOTES"];
  stream += `0.95 0.96 0.98 rg\n${left} ${usesTop} ${tableWidth} ${rowHeight} re f\n`;
  stream += "0.80 0.84 0.88 RG 0.6 w\n";
  const useRowCount = USES.length + 2;
  for (let i = 0; i <= useRowCount; i += 1) {
    const y = usesTop + rowHeight - i * rowHeight;
    stream += `${left} ${y} m ${left + tableWidth} ${y} l S\n`;
  }
  let x = left;
  stream += `${left} ${usesTop + rowHeight} m ${left} ${usesTop + rowHeight - useRowCount * rowHeight} l S\n`;
  usesWidths.forEach((columnWidth) => {
    x += columnWidth;
    stream += `${x} ${usesTop + rowHeight} m ${x} ${usesTop + rowHeight - useRowCount * rowHeight} l S\n`;
  });
  x = left;
  stream += "0.06 0.09 0.16 rg\n";
  usesHeaders.forEach((header, index) => {
    stream += pdfText(header, x + 4, usesTop + 8, index === 1 ? 7 : 7.6, "F2");
    x += usesWidths[index];
  });
  USES.forEach((item, index) => {
    const y = usesTop - 15 - index * rowHeight;
    const amount = data.amounts[index];
    const values = [item.label, money(amount), money(data.numberOfUnits ? amount / data.numberOfUnits : 0), percent(data.totalUses ? amount / data.totalUses : 0), item.note];
    x = left;
    values.forEach((value, cell) => {
      stream += pdfText(value, x + 4, y, cell === 4 ? 7 : 7.7, cell === 0 ? "F2" : "F1");
      x += usesWidths[cell];
    });
  });
  const usesTotalY = usesTop - 15 - USES.length * rowHeight;
  stream += pdfText("TOTAL USES", left + 4, usesTotalY, 8, "F2");
  stream += pdfText(money(data.totalUses), left + usesWidths[0] + 4, usesTotalY, 8, "F2");
  stream += pdfText(money(data.numberOfUnits ? data.totalUses / data.numberOfUnits : 0), left + usesWidths[0] + usesWidths[1] + 4, usesTotalY, 8, "F2");
  stream += pdfText(percent(data.totalUses ? 1 : 0), left + usesWidths[0] + usesWidths[1] + usesWidths[2] + 4, usesTotalY, 8, "F2");

  const sourcesTop = usesTop - useRowCount * rowHeight - 42;
  const sourceWidths = [174, 118, 118, 118];
  const sourceHeaders = ["SOURCES", "DOLLAR AMOUNT", "LOAN TO COST", "LOAN TO VALUE"];
  stream += `0.95 0.96 0.98 rg\n${left} ${sourcesTop} ${tableWidth} ${rowHeight} re f\n`;
  stream += "0.06 0.09 0.16 rg\n";
  const sourceRowCount = 5;
  for (let i = 0; i <= sourceRowCount; i += 1) {
    const y = sourcesTop + rowHeight - i * rowHeight;
    stream += `${left} ${y} m ${left + tableWidth} ${y} l S\n`;
  }
  x = left;
  stream += `${left} ${sourcesTop + rowHeight} m ${left} ${sourcesTop + rowHeight - sourceRowCount * rowHeight} l S\n`;
  sourceWidths.forEach((columnWidth) => {
    x += columnWidth;
    stream += `${x} ${sourcesTop + rowHeight} m ${x} ${sourcesTop + rowHeight - sourceRowCount * rowHeight} l S\n`;
  });
  x = left;
  sourceHeaders.forEach((header, index) => {
    stream += pdfText(header, x + 4, sourcesTop + 8, index ? 7.2 : 7.8, "F2");
    x += sourceWidths[index];
  });
  const sourceRows = [
    ["Capital Raise Needed", data.capitalRaise],
    ["Loan", data.loan],
    ["Other Loan Source", data.otherLoan]
  ];
  sourceRows.forEach(([label, value], index) => {
    const y = sourcesTop - 15 - index * rowHeight;
    stream += pdfText(label, left + 4, y, 8, "F2");
    stream += pdfText(money(value), left + sourceWidths[0] + 4, y, 8);
    stream += pdfText(percent(data.totalUses ? value / data.totalUses : 0), left + sourceWidths[0] + sourceWidths[1] + 4, y, 8);
    stream += pdfText(percent(data.purchasePrice ? value / data.purchasePrice : 0), left + sourceWidths[0] + sourceWidths[1] + sourceWidths[2] + 4, y, 8);
  });
  const sourceTotalY = sourcesTop - 15 - sourceRows.length * rowHeight;
  stream += pdfText("TOTAL SOURCES", left + 4, sourceTotalY, 8, "F2");
  stream += pdfText(money(data.totalSources), left + sourceWidths[0] + 4, sourceTotalY, 8, "F2");
  stream += pdfText(percent(data.totalUses ? data.totalSources / data.totalUses : 0), left + sourceWidths[0] + sourceWidths[1] + 4, sourceTotalY, 8, "F2");
  stream += pdfText(percent(data.purchasePrice ? data.totalSources / data.purchasePrice : 0), left + sourceWidths[0] + sourceWidths[1] + sourceWidths[2] + 4, sourceTotalY, 8, "F2");

  stream += "0.22 0.36 0.24 rg\n" + pdfText(`Blended Loan to Cost: ${percent(data.totalUses ? data.totalDebt / data.totalUses : 0)}`, left, 74, 10, "F2");
  stream += "0.39 0.45 0.55 rg\n" + pdfText("Capital raise automatically balances total uses less loan sources.", left, 56, 8);

  const encoder = new TextEncoder();
  const objects = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Logo 7 0 R >> >> /Contents 4 0 R >>`;
  objects[4] = `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`;
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";
  objects[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>";
  objects[7] = logoBytes;

  const chunks = [];
  let byteLength = 0;
  const appendText = (value) => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    byteLength += bytes.length;
  };
  const appendBytes = (bytes) => {
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  appendText("%PDF-1.4\n");
  const offsets = [0];
  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = byteLength;
    appendText(`${i} 0 obj\n`);
    if (i === 7) {
      appendText(`<< /Type /XObject /Subtype /Image /Width 371 /Height 345 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logoBytes.length} >>\nstream\n`);
      appendBytes(logoBytes);
      appendText("\nendstream");
    } else {
      appendText(objects[i]);
    }
    appendText("\nendobj\n");
  }
  const xref = byteLength;
  appendText(`xref\n0 ${objects.length}\n0000000000 65535 f \n`);
  for (let i = 1; i < objects.length; i += 1) appendText(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  appendText(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
  return new Blob(chunks, { type: "application/pdf" });
}

async function downloadPdf() {
  const button = document.getElementById("downloadPdf");
  const status = document.getElementById("downloadStatus");
  button.disabled = true;
  status.textContent = "Preparing PDF...";
  try {
    const url = URL.createObjectURL(await createPdf());
    const link = document.createElement("a");
    const fileName = (document.getElementById("fullName").value.trim() || "analysis")
      .replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
    link.href = url;
    link.download = `sources-and-uses-${fileName}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "PDF downloaded.";
    setTimeout(() => { status.textContent = ""; }, 3000);
  } catch (error) {
    status.textContent = "PDF could not be generated. Please try again.";
  } finally {
    button.disabled = false;
  }
}

function handleFocus(event) {
  if (event.target.matches('input[type="number"]') && numeric(event.target.value) === 0) event.target.value = "";
}

function handleBlur(event) {
  if (event.target.matches('input[type="number"]') && event.target.value.trim() === "") {
    event.target.value = "0";
    calculate();
  }
}

renderUses();
document.addEventListener("input", (event) => {
  if (event.target.matches('input[type="number"]')) calculate();
});
document.addEventListener("focusin", handleFocus);
document.addEventListener("focusout", handleBlur);
document.getElementById("downloadPdf").addEventListener("click", downloadPdf);
calculate();
