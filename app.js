(function () {
  const STORAGE_KEY = "fitoraAccountsCafe.v1";

  const categories = [
    ["raw_material", "Raw material"],
    ["transport", "Transport"],
    ["salary", "Salary"],
    ["packaging", "Packaging"],
    ["branding", "Branding"],
    ["miscellaneous", "Miscellaneous"]
  ];

  const categoryLabels = Object.fromEntries(categories);

  const state = loadState();
  const els = {};
  let editingExpenseId = null;
  let editingIncomeId = null;
  let deferredInstallPrompt = null;
  let toastTimer = null;

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    cacheElements();
    bindEvents();
    setupPwa();
    resetExpenseForm();
    resetIncomeForm();
    renderAll();
  }

  function cacheElements() {
    Object.assign(els, {
      tabs: Array.from(document.querySelectorAll(".tab-button")),
      views: Array.from(document.querySelectorAll(".view")),
      metricIncome: document.getElementById("metricIncome"),
      metricExpense: document.getElementById("metricExpense"),
      metricTotalBalance: document.getElementById("metricTotalBalance"),
      installAppBtn: document.getElementById("installAppBtn"),

      expenseForm: document.getElementById("expenseForm"),
      expenseDate: document.getElementById("expenseDate"),
      voucherNumber: document.getElementById("voucherNumber"),
      expenseLines: document.getElementById("expenseLines"),
      addExpenseLineBtn: document.getElementById("addExpenseLineBtn"),
      saveExpenseBtn: document.getElementById("saveExpenseBtn"),
      resetExpenseBtn: document.getElementById("resetExpenseBtn"),
      expenseTableBody: document.getElementById("expenseTableBody"),
      expenseEmpty: document.getElementById("expenseEmpty"),

      incomeForm: document.getElementById("incomeForm"),
      incomeDate: document.getElementById("incomeDate"),
      cashReceived: document.getElementById("cashReceived"),
      upiReceived: document.getElementById("upiReceived"),
      incomeNote: document.getElementById("incomeNote"),
      saveIncomeBtn: document.getElementById("saveIncomeBtn"),
      resetIncomeBtn: document.getElementById("resetIncomeBtn"),
      incomeTableBody: document.getElementById("incomeTableBody"),
      incomeEmpty: document.getElementById("incomeEmpty"),

      reportFrom: document.getElementById("reportFrom"),
      reportTo: document.getElementById("reportTo"),
      clearReportFilterBtn: document.getElementById("clearReportFilterBtn"),
      reportTableBody: document.getElementById("reportTableBody"),
      reportEmpty: document.getElementById("reportEmpty"),
      totalExpense: document.getElementById("totalExpense"),
      totalIncome: document.getElementById("totalIncome"),
      totalBalance: document.getElementById("totalBalance"),
      categoryBreakdown: document.getElementById("categoryBreakdown"),
      voucherReportBody: document.getElementById("voucherReportBody"),
      downloadReportBtn: document.getElementById("downloadReportBtn"),
      printReportBtn: document.getElementById("printReportBtn"),

      settingsForm: document.getElementById("settingsForm"),
      backupEmail: document.getElementById("backupEmail"),
      backupStatus: document.getElementById("backupStatus"),
      downloadBackupBtn: document.getElementById("downloadBackupBtn"),
      downloadEmailFileBtn: document.getElementById("downloadEmailFileBtn"),
      openMailBtn: document.getElementById("openMailBtn"),
      importBackupBtn: document.getElementById("importBackupBtn"),
      importFileInput: document.getElementById("importFileInput"),
      toast: document.getElementById("toast")
    });
  }

  function bindEvents() {
    els.tabs.forEach((button) => {
      button.addEventListener("click", () => switchTab(button.dataset.tab));
    });

    els.installAppBtn.addEventListener("click", installApp);

    els.expenseForm.addEventListener("submit", saveExpense);
    els.expenseDate.addEventListener("change", refreshGeneratedVoucherNumber);
    els.addExpenseLineBtn.addEventListener("click", () => addExpenseLine());
    els.resetExpenseBtn.addEventListener("click", resetExpenseForm);

    els.incomeForm.addEventListener("submit", saveIncome);
    els.resetIncomeBtn.addEventListener("click", resetIncomeForm);

    els.reportFrom.addEventListener("change", renderReport);
    els.reportTo.addEventListener("change", renderReport);
    els.clearReportFilterBtn.addEventListener("click", clearReportFilters);
    els.downloadReportBtn.addEventListener("click", downloadReportCsv);
    els.printReportBtn.addEventListener("click", () => window.print());

    els.settingsForm.addEventListener("submit", saveSettings);
    els.downloadBackupBtn.addEventListener("click", downloadBackup);
    els.downloadEmailFileBtn.addEventListener("click", downloadEmailBackupFile);
    els.openMailBtn.addEventListener("click", openEmailDraft);
    els.importBackupBtn.addEventListener("click", () => els.importFileInput.click());
    els.importFileInput.addEventListener("change", importBackup);
  }

  function setupPwa() {
    window.addEventListener("beforeinstallprompt", (event) => {
      event.preventDefault();
      deferredInstallPrompt = event;
      els.installAppBtn.hidden = false;
    });

    window.addEventListener("appinstalled", () => {
      deferredInstallPrompt = null;
      showToast("Fitora Accounts installed.");
    });

    if ("serviceWorker" in navigator && canUseServiceWorker()) {
      navigator.serviceWorker.register("./sw.js").catch(() => {
        showToast("Offline install setup needs a hosted web address.");
      });
    }
  }

  async function installApp() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      if (choice.outcome === "accepted") {
        showToast("Install started.");
      } else {
        showToast("Install cancelled.");
      }
      return;
    }

    if (isStandaloneApp()) {
      showToast("Fitora Accounts is already installed.");
      return;
    }

    if (isIos()) {
      showToast("On iPhone, open in Safari and use Share, then Add to Home Screen.");
      return;
    }

    showToast("Open this app from a hosted HTTPS link to install on mobile.");
  }

  function canUseServiceWorker() {
    return (
      window.location.protocol === "https:" ||
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    );
  }

  function isStandaloneApp() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone;
  }

  function isIos() {
    return /iphone|ipad|ipod/i.test(window.navigator.userAgent || "");
  }

  function switchTab(tabId) {
    els.tabs.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.tab === tabId);
    });
    els.views.forEach((view) => {
      view.classList.toggle("is-active", view.id === tabId);
    });
  }

  function addExpenseLine(line) {
    const data = line || {};
    const row = document.createElement("div");
    row.className = "line-row";

    const category = document.createElement("select");
    category.setAttribute("aria-label", "Expense category");
    categories.forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      category.appendChild(option);
    });
    category.value = data.category || "raw_material";

    const description = document.createElement("input");
    description.type = "text";
    description.placeholder = "Description";
    description.setAttribute("aria-label", "Expense description");
    description.value = data.description || "";

    const amount = document.createElement("input");
    amount.type = "number";
    amount.min = "0";
    amount.step = "0.01";
    amount.placeholder = "0.00";
    amount.setAttribute("aria-label", "Expense amount");
    amount.value = data.amount ? String(data.amount) : "";

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button";
    remove.title = "Remove line";
    remove.setAttribute("aria-label", "Remove expense line");
    remove.textContent = "x";
    remove.addEventListener("click", () => {
      if (els.expenseLines.children.length === 1) {
        description.value = "";
        amount.value = "";
        category.value = "raw_material";
        return;
      }
      row.remove();
    });

    row.append(category, description, amount, remove);
    els.expenseLines.appendChild(row);
  }

  function saveExpense(event) {
    event.preventDefault();

    const date = els.expenseDate.value;
    const voucher = editingExpenseId ? els.voucherNumber.value.trim() : generateVoucherNumber(date);
    const items = readExpenseLines();

    if (!date) {
      showToast("Select an expense date.");
      return;
    }

    if (!voucher) {
      showToast("Enter a voucher number.");
      return;
    }

    if (!items.length) {
      showToast("Add at least one expense amount.");
      return;
    }

    if (editingExpenseId) {
      const existing = state.expenses.find((expense) => expense.id === editingExpenseId);
      if (existing) {
        existing.date = date;
        existing.voucher = voucher;
        existing.items = items;
        existing.updatedAt = new Date().toISOString();
      }
      showToast("Expense updated.");
    } else {
      state.expenses.push({
        id: makeId("exp"),
        date,
        voucher,
        paidBy: "cash",
        items,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      showToast("Expense saved.");
    }

    persist();
    resetExpenseForm();
    renderAll();
  }

  function readExpenseLines() {
    return Array.from(els.expenseLines.querySelectorAll(".line-row"))
      .map((row) => {
        const [category, description, amount] = row.querySelectorAll("select, input");
        return {
          category: category.value,
          description: description.value.trim(),
          amount: roundMoney(amount.value)
        };
      })
      .filter((line) => line.amount > 0);
  }

  function resetExpenseForm() {
    editingExpenseId = null;
    els.expenseForm.reset();
    els.expenseDate.value = today();
    refreshGeneratedVoucherNumber();
    els.expenseLines.innerHTML = "";
    addExpenseLine();
    els.saveExpenseBtn.textContent = "Save expense";
  }

  function editExpense(id) {
    const expense = state.expenses.find((entry) => entry.id === id);
    if (!expense) return;

    editingExpenseId = id;
    els.expenseDate.value = expense.date;
    els.voucherNumber.value = expense.voucher;
    els.expenseLines.innerHTML = "";
    expense.items.forEach((item) => addExpenseLine(item));
    els.saveExpenseBtn.textContent = "Update expense";
    switchTab("expense");
    showToast("Expense ready for editing.");
  }

  function refreshGeneratedVoucherNumber() {
    if (editingExpenseId) return;
    els.voucherNumber.value = generateVoucherNumber(els.expenseDate.value || today());
  }

  function generateVoucherNumber(date) {
    const voucherDate = normalizeDate(date) || today();
    const datePart = voucherDate.replace(/-/g, "");
    const prefix = `FV-${datePart}-`;
    const nextNumber =
      state.expenses
        .filter((expense) => String(expense.voucher || "").startsWith(prefix))
        .map((expense) => Number.parseInt(String(expense.voucher).slice(prefix.length), 10))
        .filter((number) => Number.isFinite(number))
        .reduce((max, number) => Math.max(max, number), 0) + 1;

    return `${prefix}${String(nextNumber).padStart(3, "0")}`;
  }

  function deleteExpense(id) {
    const expense = state.expenses.find((entry) => entry.id === id);
    if (!expense) return;

    const total = money(sumItems(expense.items));
    if (!window.confirm(`Delete voucher ${expense.voucher} for ${total}?`)) return;

    state.expenses = state.expenses.filter((entry) => entry.id !== id);
    persist();
    renderAll();
    showToast("Voucher deleted.");
  }

  function saveIncome(event) {
    event.preventDefault();

    const date = els.incomeDate.value;
    const cash = roundMoney(els.cashReceived.value);
    const upi = roundMoney(els.upiReceived.value);
    const note = els.incomeNote.value.trim();

    if (!date) {
      showToast("Select an income date.");
      return;
    }

    if (cash <= 0 && upi <= 0) {
      showToast("Enter cash or UPI received.");
      return;
    }

    if (editingIncomeId) {
      const existing = state.incomes.find((income) => income.id === editingIncomeId);
      if (existing) {
        existing.date = date;
        existing.cash = cash;
        existing.upi = upi;
        existing.note = note;
        existing.updatedAt = new Date().toISOString();
      }
      showToast("Income updated.");
    } else {
      const existingForDate = state.incomes.find((income) => income.date === date);
      if (existingForDate) {
        existingForDate.cash = cash;
        existingForDate.upi = upi;
        existingForDate.note = note;
        existingForDate.updatedAt = new Date().toISOString();
        showToast("Daily income updated.");
      } else {
        state.incomes.push({
          id: makeId("inc"),
          date,
          cash,
          upi,
          note,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showToast("Income saved.");
      }
    }

    persist();
    resetIncomeForm();
    renderAll();
  }

  function resetIncomeForm() {
    editingIncomeId = null;
    els.incomeForm.reset();
    els.incomeDate.value = today();
    els.saveIncomeBtn.textContent = "Save income";
  }

  function editIncome(id) {
    const income = state.incomes.find((entry) => entry.id === id);
    if (!income) return;

    editingIncomeId = id;
    els.incomeDate.value = income.date;
    els.cashReceived.value = income.cash || "";
    els.upiReceived.value = income.upi || "";
    els.incomeNote.value = income.note || "";
    els.saveIncomeBtn.textContent = "Update income";
    switchTab("income");
    showToast("Income ready for editing.");
  }

  function deleteIncome(id) {
    const income = state.incomes.find((entry) => entry.id === id);
    if (!income) return;

    if (!window.confirm(`Delete income for ${formatDate(income.date)}?`)) return;

    state.incomes = state.incomes.filter((entry) => entry.id !== id);
    persist();
    renderAll();
    showToast("Income deleted.");
  }

  function saveSettings(event) {
    event.preventDefault();
    state.settings.backupEmail = els.backupEmail.value.trim();
    persist(false);
    renderBackupStatus();
    showToast("Backup email saved.");
  }

  function renderAll() {
    renderMetrics();
    renderExpenseTable();
    renderIncomeTable();
    renderReport();
    renderBackupStatus();
  }

  function renderMetrics() {
    const totals = calculateTotals(state.expenses, state.incomes);
    els.metricIncome.textContent = money(totalIncome(totals));
    els.metricExpense.textContent = money(totalExpense(totals));
    els.metricTotalBalance.textContent = money(totalBalance(totals));
  }

  function renderExpenseTable() {
    els.expenseTableBody.innerHTML = "";
    const rows = [...state.expenses].sort(sortByDateDesc);
    els.expenseEmpty.classList.toggle("is-visible", rows.length === 0);

    rows.forEach((expense) => {
      const row = document.createElement("tr");
      row.append(
        td(formatDate(expense.date), "", "Date"),
        td(expense.voucher, "", "Voucher"),
        expenseItemsCell(expense.items),
        td(money(sumItems(expense.items)), "number", "Total"),
        actionCell([
          ["Edit", () => editExpense(expense.id), "small-button"],
          ["Delete", () => deleteExpense(expense.id), "danger-button small-button"]
        ], "Action")
      );
      els.expenseTableBody.appendChild(row);
    });
  }

  function renderIncomeTable() {
    els.incomeTableBody.innerHTML = "";
    const rows = [...state.incomes].sort(sortByDateDesc);
    els.incomeEmpty.classList.toggle("is-visible", rows.length === 0);

    rows.forEach((income) => {
      const row = document.createElement("tr");
      row.append(
        td(formatDate(income.date), "", "Date"),
        td(money(income.cash), "number", "Cash"),
        td(money(income.upi), "number", "UPI"),
        td(income.note || "-", "", "Note"),
        actionCell([
          ["Edit", () => editIncome(income.id), "small-button"],
          ["Delete", () => deleteIncome(income.id), "danger-button small-button"]
        ], "Action")
      );
      els.incomeTableBody.appendChild(row);
    });
  }

  function renderReport() {
    const report = buildReportData();
    els.reportTableBody.innerHTML = "";
    els.voucherReportBody.innerHTML = "";
    els.categoryBreakdown.innerHTML = "";
    els.reportEmpty.classList.toggle("is-visible", report.dateRows.length === 0);

    report.dateRows.forEach((entry) => {
      const row = document.createElement("tr");
      row.append(
        td(formatDate(entry.date), "", "Date"),
        td(money(entry.totalExpense), "number", "Total Expense"),
        td(money(entry.totalIncome), "number", "Total Income"),
        td(money(entry.totalBalance), "number", "Total Balance")
      );
      els.reportTableBody.appendChild(row);
    });

    els.totalExpense.textContent = money(totalExpense(report.totals));
    els.totalIncome.textContent = money(totalIncome(report.totals));
    els.totalBalance.textContent = money(totalBalance(report.totals));

    renderCategoryBreakdown(report.categoryTotals);
    renderVoucherReport(report.voucherRows);
  }

  function renderCategoryBreakdown(categoryTotals) {
    const entries = categories
      .map(([key, label]) => ({ key, label, total: categoryTotals[key] || 0 }))
      .filter((entry) => entry.total > 0)
      .sort((a, b) => b.total - a.total);

    if (!entries.length) {
      const empty = document.createElement("p");
      empty.className = "empty-state is-visible";
      empty.textContent = "No category expenses found.";
      els.categoryBreakdown.appendChild(empty);
      return;
    }

    const max = Math.max(...entries.map((entry) => entry.total));
    entries.forEach((entry) => {
      const row = document.createElement("div");
      row.className = "breakdown-row";

      const meta = document.createElement("div");
      meta.className = "breakdown-meta";
      const name = document.createElement("strong");
      name.textContent = entry.label;
      const total = document.createElement("span");
      total.textContent = money(entry.total);
      meta.append(name, total);

      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${Math.max(6, (entry.total / max) * 100)}%`;
      track.appendChild(fill);

      row.append(meta, track);
      els.categoryBreakdown.appendChild(row);
    });
  }

  function renderVoucherReport(rows) {
    rows.forEach((entry) => {
      const row = document.createElement("tr");
      row.append(
        td(formatDate(entry.date), "", "Date"),
        td(entry.voucher, "", "Voucher"),
        td(categoryLabels[entry.category] || entry.category, "", "Category"),
        td(money(entry.amount), "number", "Amount")
      );
      els.voucherReportBody.appendChild(row);
    });

    if (!rows.length) {
      const row = document.createElement("tr");
      const cell = td("No expense details found.", "", "Expense detail");
      cell.colSpan = 4;
      row.appendChild(cell);
      els.voucherReportBody.appendChild(row);
    }
  }

  function buildReportData() {
    const expenseRows = state.expenses.filter((entry) => isDateInRange(entry.date));
    const incomeRows = state.incomes.filter((entry) => isDateInRange(entry.date));
    const byDate = new Map();
    const categoryTotals = {};
    const voucherRows = [];

    const ensureDate = (date) => {
      if (!byDate.has(date)) {
        byDate.set(date, {
          date,
          expenseCash: 0,
          expenseUpi: 0,
          totalExpense: 0,
          incomeCash: 0,
          incomeUpi: 0,
          totalIncome: 0
        });
      }
      return byDate.get(date);
    };

    expenseRows.forEach((expense) => {
      const dateRow = ensureDate(expense.date);
      const total = sumItems(expense.items);
      dateRow.totalExpense += total;
      if (expense.paidBy === "upi") {
        dateRow.expenseUpi += total;
      } else {
        dateRow.expenseCash += total;
      }

      expense.items.forEach((item) => {
        categoryTotals[item.category] = roundMoney((categoryTotals[item.category] || 0) + item.amount);
        voucherRows.push({
          date: expense.date,
          voucher: expense.voucher,
          category: item.category,
          amount: item.amount,
          paidBy: expense.paidBy
        });
      });
    });

    incomeRows.forEach((income) => {
      const dateRow = ensureDate(income.date);
      dateRow.incomeCash += income.cash || 0;
      dateRow.incomeUpi += income.upi || 0;
      dateRow.totalIncome += (income.cash || 0) + (income.upi || 0);
    });

    const dateRows = Array.from(byDate.values())
      .map((entry) => ({
        ...entry,
        expenseCash: roundMoney(entry.expenseCash),
        expenseUpi: roundMoney(entry.expenseUpi),
        totalExpense: roundMoney(entry.totalExpense),
        incomeCash: roundMoney(entry.incomeCash),
        incomeUpi: roundMoney(entry.incomeUpi),
        totalIncome: roundMoney(entry.totalIncome),
        cashBalance: roundMoney(entry.incomeCash - entry.expenseCash),
        upiBalance: roundMoney(entry.incomeUpi - entry.expenseUpi),
        totalBalance: roundMoney(entry.totalIncome - entry.totalExpense)
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const totals = calculateTotals(expenseRows, incomeRows);

    return {
      dateRows,
      totals,
      categoryTotals,
      voucherRows: voucherRows.sort(sortByDateDesc)
    };
  }

  function calculateTotals(expenses, incomes) {
    const totals = {
      expenseCash: 0,
      expenseUpi: 0,
      incomeCash: 0,
      incomeUpi: 0
    };

    expenses.forEach((expense) => {
      const total = sumItems(expense.items);
      if (expense.paidBy === "upi") totals.expenseUpi += total;
      else totals.expenseCash += total;
    });

    incomes.forEach((income) => {
      totals.incomeCash += income.cash || 0;
      totals.incomeUpi += income.upi || 0;
    });

    Object.keys(totals).forEach((key) => {
      totals[key] = roundMoney(totals[key]);
    });

    return totals;
  }

  function totalIncome(totals) {
    return roundMoney(totals.incomeCash + totals.incomeUpi);
  }

  function totalExpense(totals) {
    return roundMoney(totals.expenseCash + totals.expenseUpi);
  }

  function cashBalance(totals) {
    return roundMoney(totals.incomeCash - totals.expenseCash);
  }

  function upiBalance(totals) {
    return roundMoney(totals.incomeUpi - totals.expenseUpi);
  }

  function totalBalance(totals) {
    return roundMoney(totalIncome(totals) - totalExpense(totals));
  }

  function clearReportFilters() {
    els.reportFrom.value = "";
    els.reportTo.value = "";
    renderReport();
  }

  function downloadReportCsv() {
    const report = buildReportData();
    if (!report.dateRows.length && !report.voucherRows.length) {
      showToast("No report data to download.");
      return;
    }

    const lines = [];
    lines.push(["Fitora Fuels Cafe Date Wise Report"]);
    lines.push(["Generated at", formatDateTime(new Date().toISOString())]);
    lines.push(["From", els.reportFrom.value || "All dates", "To", els.reportTo.value || "All dates"]);
    lines.push([]);
    lines.push(["Date wise totals"]);
    lines.push([
      "Date",
      "Total Expense",
      "Total Income",
      "Total Balance"
    ]);
    report.dateRows.forEach((entry) => {
      lines.push([
        entry.date,
        entry.totalExpense,
        entry.totalIncome,
        entry.totalBalance
      ]);
    });
    lines.push([
      "Total",
      totalExpense(report.totals),
      totalIncome(report.totals),
      totalBalance(report.totals)
    ]);

    lines.push([]);
    lines.push(["Category total"]);
    lines.push(["Category", "Amount"]);
    categories.forEach(([key, label]) => {
      if (report.categoryTotals[key]) lines.push([label, report.categoryTotals[key]]);
    });

    lines.push([]);
    lines.push(["Expense detail"]);
    lines.push(["Date", "Voucher", "Category", "Amount"]);
    report.voucherRows.forEach((entry) => {
      lines.push([
        entry.date,
        entry.voucher,
        categoryLabels[entry.category] || entry.category,
        entry.amount
      ]);
    });

    const csv = lines.map((line) => line.map(csvCell).join(",")).join("\r\n");
    const filename = `fitora-report-${fileDateRange()}.csv`;
    downloadFile(new Blob([csv], { type: "text/csv;charset=utf-8" }), filename);
    showToast("Report CSV downloaded.");
  }

  function downloadBackup() {
    const filename = backupFilename("json");
    downloadFile(new Blob([backupJson()], { type: "application/json;charset=utf-8" }), filename);
    markBackedUp();
    showToast("Backup downloaded.");
  }

  function downloadEmailBackupFile() {
    const email = readAndSaveBackupEmail();
    if (!email) {
      showToast("Enter a backup email ID first.");
      switchTab("backup");
      els.backupEmail.focus();
      return;
    }

    const json = backupJson();
    const jsonName = backupFilename("json");
    const boundary = `fitora-backup-${Date.now()}`;
    const subject = `Fitora Fuels Cafe backup ${today()}`;
    const body = [
      "Fitora Fuels Cafe account backup.",
      "",
      `Generated at: ${formatDateTime(new Date().toISOString())}`,
      `Expenses saved: ${state.expenses.length}`,
      `Income records saved: ${state.incomes.length}`
    ].join("\r\n");

    const eml = [
      `To: ${email}`,
      `Subject: ${subject}`,
      `Date: ${new Date().toUTCString()}`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      "Content-Type: text/plain; charset=utf-8",
      "",
      body,
      "",
      `--${boundary}`,
      `Content-Type: application/json; name="${jsonName}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${jsonName}"`,
      "",
      wrapBase64(toBase64(json)),
      `--${boundary}--`,
      ""
    ].join("\r\n");

    downloadFile(new Blob([eml], { type: "message/rfc822;charset=utf-8" }), backupFilename("eml"));
    markBackedUp();
    showToast("Email backup file downloaded.");
  }

  function openEmailDraft() {
    const email = readAndSaveBackupEmail();
    if (!email) {
      showToast("Enter a backup email ID first.");
      switchTab("backup");
      els.backupEmail.focus();
      return;
    }

    const subject = `Fitora Fuels Cafe backup ${today()}`;
    const body = [
      "Fitora Fuels Cafe account backup summary",
      "",
      `Generated at: ${formatDateTime(new Date().toISOString())}`,
      `Expenses saved: ${state.expenses.length}`,
      `Income records saved: ${state.incomes.length}`,
      "",
      "Attach the downloaded backup JSON or email backup file before sending."
    ].join("\n");

    window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast("Email draft opened.");
  }

  function importBackup(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const imported = normalizeState(parsed.data || parsed);
        const message = [
          `Import ${imported.expenses.length} expense vouchers`,
          `and ${imported.incomes.length} income records?`
        ].join(" ");
        if (!window.confirm(message)) return;

        state.expenses = imported.expenses;
        state.incomes = imported.incomes;
        state.settings = {
          ...state.settings,
          ...imported.settings,
          backupEmail: imported.settings.backupEmail || state.settings.backupEmail || ""
        };
        persist();
        resetExpenseForm();
        resetIncomeForm();
        renderAll();
        showToast("Backup imported.");
      } catch (error) {
        showToast("Backup file could not be imported.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }

  function renderBackupStatus() {
    els.backupEmail.value = state.settings.backupEmail || "";
    if (state.settings.lastBackupAt) {
      els.backupStatus.textContent = `Last backup: ${formatDateTime(state.settings.lastBackupAt)}`;
    } else {
      els.backupStatus.textContent = "No backup created yet.";
    }
  }

  function markBackedUp() {
    state.settings.lastBackupAt = new Date().toISOString();
    persist(false);
    renderBackupStatus();
  }

  function readAndSaveBackupEmail() {
    const email = els.backupEmail.value.trim() || state.settings.backupEmail || "";
    state.settings.backupEmail = email;
    persist(false);
    return email;
  }

  function backupJson() {
    return JSON.stringify(
      {
        app: "Fitora Fuels Cafe Accounts",
        version: 1,
        exportedAt: new Date().toISOString(),
        data: state
      },
      null,
      2
    );
  }

  function backupFilename(extension) {
    return `fitora-accounts-backup-${timestampForFile()}.${extension}`;
  }

  function fileDateRange() {
    const start = els.reportFrom.value || "all";
    const end = els.reportTo.value || "all";
    return `${start}-to-${end}`;
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return normalizeState({});
      return normalizeState(JSON.parse(saved));
    } catch (error) {
      return normalizeState({});
    }
  }

  function normalizeState(input) {
    const source = input && typeof input === "object" ? input : {};
    const expenses = Array.isArray(source.expenses) ? source.expenses : [];
    const incomes = Array.isArray(source.incomes) ? source.incomes : [];
    const settings = source.settings && typeof source.settings === "object" ? source.settings : {};

    return {
      expenses: expenses
        .map((rawEntry) => {
          const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
          return {
            id: String(entry.id || makeId("exp")),
            date: normalizeDate(entry.date),
            voucher: String(entry.voucher || "").trim(),
            paidBy: entry.paidBy === "upi" ? "upi" : "cash",
            items: Array.isArray(entry.items)
              ? entry.items
                  .map((rawItem) => {
                    const item = rawItem && typeof rawItem === "object" ? rawItem : {};
                    return {
                      category: categoryLabels[item.category] ? item.category : "miscellaneous",
                      description: String(item.description || "").trim(),
                      amount: roundMoney(item.amount)
                    };
                  })
                  .filter((item) => item.amount > 0)
              : [],
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
          };
        })
        .filter((entry) => entry.date && entry.voucher && entry.items.length),
      incomes: incomes
        .map((rawEntry) => {
          const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
          return {
            id: String(entry.id || makeId("inc")),
            date: normalizeDate(entry.date),
            cash: roundMoney(entry.cash),
            upi: roundMoney(entry.upi),
            note: String(entry.note || "").trim(),
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: entry.updatedAt || entry.createdAt || new Date().toISOString()
          };
        })
        .filter((entry) => entry.date && (entry.cash > 0 || entry.upi > 0)),
      settings: {
        backupEmail: String(settings.backupEmail || "").trim(),
        lastBackupAt: settings.lastBackupAt || "",
        lastChangedAt: settings.lastChangedAt || ""
      }
    };
  }

  function persist(markChanged = true) {
    if (markChanged) {
      state.settings.lastChangedAt = new Date().toISOString();
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function td(content, className, label) {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    if (label) cell.dataset.label = label;
    if (content instanceof Node) {
      cell.appendChild(content);
    } else {
      cell.textContent = content;
    }
    return cell;
  }

  function actionCell(actions, label) {
    const cell = document.createElement("td");
    if (label) cell.dataset.label = label;
    const wrap = document.createElement("div");
    wrap.className = "row-actions";
    actions.forEach(([label, handler, className]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = className;
      button.textContent = label;
      button.addEventListener("click", handler);
      wrap.appendChild(button);
    });
    cell.appendChild(wrap);
    return cell;
  }

  function paidPill(value) {
    const pill = document.createElement("span");
    const mode = value === "upi" ? "upi" : "cash";
    pill.className = `paid-pill ${mode}`;
    pill.textContent = mode.toUpperCase();
    return pill;
  }

  function expenseItemsCell(items) {
    const cell = document.createElement("td");
    cell.dataset.label = "Items";
    items.forEach((item) => {
      const line = document.createElement("div");
      const pill = document.createElement("span");
      pill.className = "category-pill";
      pill.textContent = categoryLabels[item.category] || item.category;
      const text = document.createElement("span");
      text.textContent = `${item.description || "Expense"} - ${money(item.amount)}`;
      line.append(pill, text);
      cell.appendChild(line);
    });
    return cell;
  }

  function getCheckedValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : "";
  }

  function setCheckedValue(name, value) {
    const input = document.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
  }

  function isDateInRange(date) {
    const from = els.reportFrom.value;
    const to = els.reportTo.value;
    if (from && date < from) return false;
    if (to && date > to) return false;
    return true;
  }

  function sumItems(items) {
    return roundMoney((items || []).reduce((sum, item) => sum + roundMoney(item.amount), 0));
  }

  function sortByDateDesc(a, b) {
    const dateCompare = String(b.date).localeCompare(String(a.date));
    if (dateCompare !== 0) return dateCompare;
    return String(b.voucher || b.id).localeCompare(String(a.voucher || a.id));
  }

  function roundMoney(value) {
    const number = Number.parseFloat(value);
    if (!Number.isFinite(number)) return 0;
    return Math.round(number * 100) / 100;
  }

  function money(value) {
    return `Rs. ${roundMoney(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function today() {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join("-");
  }

  function timestampForFile() {
    const date = new Date();
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
      String(date.getHours()).padStart(2, "0"),
      String(date.getMinutes()).padStart(2, "0")
    ].join("");
  }

  function normalizeDate(value) {
    const text = String(value || "").slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
  }

  function formatDate(value) {
    const date = normalizeDate(value);
    if (!date) return "-";
    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  }

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `${prefix}-${window.crypto.randomUUID()}`;
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function csvCell(value) {
    const text = String(value == null ? "" : value);
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function toBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  function wrapBase64(value) {
    return value.replace(/.{1,76}/g, "$&\r\n").trim();
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      els.toast.classList.remove("is-visible");
    }, 2400);
  }
})();
