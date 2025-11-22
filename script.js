/** Déclaration des variables */
const form          = document.querySelector(".add");
const incomeList    = document.querySelector("ul.income-list");
const expenseList   = document.querySelector("ul.expense-list");
const historySection = document.querySelector(".transaction-history");

const balance = document.getElementById("balance");
const income = document.getElementById("income");
const expense = document.getElementById("expense");
const transactionBtn = document.getElementById("transaction");
const searchInput = document.getElementById("search");
const resetBtn    = document.getElementById("resetSearch");
const cancelBtn   = document.getElementById("cancelEdit");

let transactions = localStorage.getItem("transactions") !== null ? JSON.parse(localStorage.getItem("transactions")) : [];
let editId = null;
let editMode = false;
let balanceChart = null;

/** Fonctions et événements */

/* Statistiques (balance/income/expense) */
function updateStatistics() {
    const updatedIncome = transactions
        .filter(t => t.amount > 0)
        .reduce((total, t) => total + t.amount, 0);

    const updatedExpense = transactions
        .filter(t => t.amount < 0)
        .reduce((total, t) => total + Math.abs(t.amount), 0);

    const updatedBalance = updatedIncome - updatedExpense;
    balance.textContent = updatedBalance;
    income.textContent  = updatedIncome;
    expense.textContent = updatedExpense;

    updateChart();
}
updateStatistics();

/* Chart initialization */
function initChart() {
    const ctx = document.getElementById('balanceChart').getContext('2d');

    balanceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Income', 'Expense'],
            datasets: [{
                data: [0, 0],
                backgroundColor: ['#32a171', '#0b65f7'],
                hoverBackgroundColor: ['#008049ff', '#0948adff'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                title: { display: true, text: 'Income vs Expense', color: '#111' }
            }
        }
    });

    updateChart();
}

/* Update chart dataset + show/hide no-data message */
function updateChart() {
    if(!balanceChart) return;

    const updatedIncome = transactions
        .filter(t => t.amount > 0)
        .reduce((s, t) => s + t.amount, 0);

    const updatedExpense = transactions
        .filter(t => t.amount < 0)
        .reduce((s, t) => s + Math.abs(t.amount), 0);

    const total = updatedIncome + updatedExpense;

    const noDataEl = document.getElementById('noDataMessage');
    const chartCanvas = document.getElementById('balanceChart');

    if (total === 0) {
        chartCanvas.style.display = 'none';
        noDataEl.style.display = 'block';
    } else {
        chartCanvas.style.display = 'block';
        noDataEl.style.display = 'none';
    }

    balanceChart.data.datasets[0].data = [updatedIncome, updatedExpense];
    balanceChart.update();
}

/* template li */
function generateTemplate(id, source, amount, time){
    return `<li data-id="${id}">
                <p>
                    <span>${escapeHtml(source)}</span>
                    <span id="time">${time}</span>
                 </p>
                $<span>${Math.abs(amount)}</span>
                <section class="actionBtnIcone">
                    <i class="bi bi-trash delete" title="Delete"></i>
                    <i class="bi bi-pencil edit" title="Edit"></i>
                </section>
            </li>`;
}

/* small helper to avoid injection if user paste html */
function escapeHtml(unsafe) {
    return (''+unsafe).replace(/[&<>"'`]/g, function(m){ return ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;', '`':'&#96;'
    })[m];});
}

/* Add transaction into DOM with animation */
function addTransactionDOM(id, source, amount, time){
    const html = generateTemplate(id, source, amount, time);
    const parent = amount > 0 ? incomeList : expenseList;
    parent.insertAdjacentHTML('beforeend', html);

    // animate the newly added element
    const added = parent.lastElementChild;
    added.classList.add('fade-in');
    // force reflow then add .show to trigger transition
    // eslint-disable-next-line no-unused-expressions
    added.offsetHeight;
    added.classList.add('show');

    // remove classes after animation so it can animate again later
    setTimeout(() => {
        added.classList.remove('fade-in','show');
    }, 600);

    show();
}

/* Create & store new transaction */
function addTransaction(source, amount) {
    const time = new Date();
    const transaction = {
        id: Math.floor(Math.random()*1000000),
        source: source,
        amount: amount,
        time: `${time.toLocaleTimeString()} ${time.toLocaleDateString()}`
    };

    transactions.push(transaction);
    localStorage.setItem("transactions", JSON.stringify(transactions));
    addTransactionDOM(transaction.id, source, amount, transaction.time);

    // ensure cancel hidden when adding normally
    if(cancelBtn) cancelBtn.classList.add('hidden');
}

/* form submit: add OR update */
form.addEventListener("submit", event => {
    event.preventDefault();

    const sourceValue = form.source.value.trim();
    const amountValue  = Number(form.amount.value);

    if(sourceValue === "" || form.amount.value.trim() === "") {
        return alert("You must write some value for Source and Amount. Try again !");
    }

    if(Number(form.amount.value) === 0) {
        return alert("Amount cannot be zero !");
    }

    // if in edit mode -> update and STOP (prevent adding)
    if(editId !== null && editMode) {
        updateTransaction(editId, sourceValue, amountValue);
        return;
    }

    // otherwise add new transaction
    addTransaction(sourceValue, amountValue);
    updateStatistics();
    form.reset();
});

/* update transaction in array + persist + refresh lists */
function updateTransaction(id, newSource, newAmount) {
    transactions = transactions.map(transaction => {
        if(transaction.id === id) {
            transaction.source = newSource;
            transaction.amount = newAmount;
            transaction.time   = `${new Date().toLocaleTimeString()} ${new Date().toLocaleDateString()}`;
        }
        return transaction;
    });

    localStorage.setItem("transactions", JSON.stringify(transactions));

    // re-render lists
    incomeList.innerHTML = "";
    expenseList.innerHTML = "";
    getTransaction();

    // UI feedback
    // alert("Transaction updated successfully");

    // reset edit state
    editId = null;
    editMode = false;
    transactionBtn.value = "Add Transaction";
    transactionBtn.classList.remove("update");
    form.reset();

    // hide cancel
    if(cancelBtn) cancelBtn.classList.add('hidden');

    // refresh statistics & chart
    updateStatistics();
}

/* Recreate existing transactions into DOM (on load) */
function getTransaction() {
    // clear first
    incomeList.innerHTML = "";
    expenseList.innerHTML = "";

    transactions.forEach(transaction => {
        if(transaction.amount > 0) {
            incomeList.innerHTML += generateTemplate(transaction.id, transaction.source, transaction.amount, transaction.time);
        } else {
            expenseList.innerHTML += generateTemplate(transaction.id, transaction.source, transaction.amount, transaction.time);
        }
    });
}

/* initial render + chart init */
getTransaction();
initChart();

/* show / hide history section depending on transactions */
function show() {
    historySection.style.display = transactions.length === 0 ? "none" : "block";
}
show();

/* Delete logic */
function deleteTransaction(id) {
    transactions = transactions.filter(transaction => transaction.id !== id);
    localStorage.setItem("transactions", JSON.stringify(transactions));
}

/* Event delegation: incomeList & expenseList combined handling */
incomeList.addEventListener("click", handleListClick);
expenseList.addEventListener("click", handleListClick);

function handleListClick(event) {
    const li = event.target.closest('li');
    if(!li) return;
    const id = Number(li.dataset.id);

    if(event.target.classList.contains("delete")) {
        // animate out then remove
        li.style.opacity = '0';
        li.style.transform = 'translateX(-10px) scale(.98)';
        setTimeout(() => {
            li.remove();
            deleteTransaction(id);
            updateStatistics();
        }, 200);
        return;
    }

    if(event.target.classList.contains("edit")) {
        startEditing(id);
        return;
    }
}

/* start editing: populate form, show cancel, toggle state */
function startEditing(id) {
    const transaction = transactions.find(t => t.id === id);
    if(!transaction) return;

    // If already editing same id -> toggle cancel behavior
    if(editMode && editId === id) {
        // second click on same edit => cancel edit
        editMode = false;
        editId = null;
        form.reset();
        transactionBtn.value = "Add Transaction";
        transactionBtn.classList.remove("update");
        if(cancelBtn) cancelBtn.classList.add('hidden');
        return;
    }

    // populate
    form.source.value = transaction.source;
    form.amount.value = transaction.amount;

    editId = id;
    editMode = true;
    transactionBtn.value = "Update Transaction";
    transactionBtn.classList.add("update");

    if(cancelBtn) cancelBtn.classList.remove('hidden');

    // scroll to form for better UX (smooth)
    form.scrollIntoView({behavior: "smooth", block: "start"});
}

/* cancel button handler (explicit cancel) */
if(cancelBtn) {
    cancelBtn.addEventListener("click", () => {
        editMode = false;
        editId = null;
        form.reset();
        transactionBtn.value = "Add Transaction";
        transactionBtn.classList.remove("update");
        cancelBtn.classList.add("hidden");
    });
}

/* search */
searchInput.addEventListener("input", function(e) {
    const query = e.target.value.toLowerCase().trim();

    const filteredTransactions = transactions.filter(t =>
        t.source.toLowerCase().includes(query)
    );

    // Nettoyer les listes
    incomeList.innerHTML = "";
    expenseList.innerHTML = "";

    // Afficher les résultats filtrés
    filteredTransactions.forEach(t => {
        if (t.amount > 0) {
            incomeList.innerHTML += generateTemplate(t.id, t.source, t.amount, t.time);
        } else {
            expenseList.innerHTML += generateTemplate(t.id, t.source, t.amount, t.time);
        }
    });
});

/* reset search */
resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    getTransaction();
    updateStatistics();
});
