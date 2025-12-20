// ============================================
// public/admin.js - FRONTEND ADMIN AVEC BACKEND
// ============================================

const API_BASE = "http://192.168.1.75:5000/api/admin";
let adminToken = null;

// ============================================
// INITIALISATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  adminToken = localStorage.getItem("adminToken");

  if (adminToken) {
    showAdminPanel();
    loadAllData();
  } else {
    showLoginScreen();
  }
});

// ============================================
// AUTHENTIFICATION
// ============================================

async function handleAdminLogin() {
  const username = document.getElementById("adminUsername").value;
  const password = document.getElementById("adminPassword").value;

  if (!username || !password) {
    showNotification("Veuillez remplir tous les champs", "error");
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();

    if (data.success && data.data.token) {
      adminToken = data.data.token;
      localStorage.setItem("adminToken", adminToken);
      showAdminPanel();
      loadAllData();
      showNotification("Connexion réussie !", "success");
    } else {
      showNotification(data.message || "Identifiants invalides", "error");
    }
  } catch (error) {
    console.error("Erreur login:", error);
    showNotification("Erreur de connexion", "error");
  }
}

function logout() {
  localStorage.removeItem("adminToken");
  adminToken = null;
  showLoginScreen();
  showNotification("Déconnexion réussie", "success");
}

function showLoginScreen() {
  document.getElementById("loginScreen").style.display = "flex";
  document.getElementById("adminPanel").style.display = "none";
}

function showAdminPanel() {
  document.getElementById("loginScreen").style.display = "none";
  document.getElementById("adminPanel").style.display = "block";
}

// ============================================
// CHARGEMENT DES DONNÉES
// ============================================

async function loadAllData() {
  await Promise.all([
    loadStats(),
    loadDeposits(),
    loadWithdrawals(),
    loadUsers(),
    loadGames(),
  ]);
}

async function loadStats() {
  try {
    const response = await apiCall("/stats");
    if (response.success) {
      const stats = response.data;
      document.getElementById("totalUsers").textContent = stats.totalUsers || 0;
      document.getElementById("pendingDeposits").textContent =
        stats.pendingDeposits || 0;
      document.getElementById("pendingWithdrawals").textContent =
        stats.pendingWithdrawals || 0;
      document.getElementById("totalRevenue").textContent =
        (stats.totalRevenue || 0).toLocaleString() + " FCFA";
    }
  } catch (error) {
    console.error("Erreur chargement stats:", error);
  }
}

async function loadDeposits() {
  try {
    const response = await apiCall("/deposits");
    if (response.success) {
      renderDeposits(response.data);
    }
  } catch (error) {
    console.error("Erreur chargement dépôts:", error);
    document.getElementById("depositsBody").innerHTML =
      '<tr><td colspan="7" class="empty-state">Erreur de chargement</td></tr>';
  }
}

async function loadWithdrawals() {
  try {
    const response = await apiCall("/withdrawals");
    if (response.success) {
      renderWithdrawals(response.data);
    }
  } catch (error) {
    console.error("Erreur chargement retraits:", error);
    document.getElementById("withdrawalsBody").innerHTML =
      '<tr><td colspan="8" class="empty-state">Erreur de chargement</td></tr>';
  }
}

async function loadUsers() {
  try {
    const response = await apiCall("/users");
    if (response.success) {
      renderUsers(response.data);
    }
  } catch (error) {
    console.error("Erreur chargement utilisateurs:", error);
    document.getElementById("usersBody").innerHTML =
      '<tr><td colspan="6" class="empty-state">Erreur de chargement</td></tr>';
  }
}

async function loadGames() {
  try {
    const response = await apiCall("/games");
    if (response.success) {
      renderGames(response.data);
    }
  } catch (error) {
    console.error("Erreur chargement parties:", error);
    document.getElementById("gamesBody").innerHTML =
      '<tr><td colspan="7" class="empty-state">Erreur de chargement</td></tr>';
  }
}

// ============================================
// RENDU DES DONNÉES
// ============================================

function renderDeposits(deposits) {
  const tbody = document.getElementById("depositsBody");

  if (!deposits || deposits.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">Aucun dépôt</td></tr>';
    return;
  }

  tbody.innerHTML = deposits
    .map(
      (d) => `
    <tr data-status="${d.status}">
      <td>#${d.id}</td>
      <td>${d.user_name || d.prenom + " " + d.nom}</td>
      <td>${d.email}</td>
      <td>${d.amount_fcfa.toLocaleString()} FCFA<br><small>(${
        d.amount_mz
      } MZ)</small></td>
      <td>${formatDate(d.created_at)}</td>
      <td><span class="badge badge-${d.status}">${getStatusLabel(
        d.status
      )}</span></td>
      <td>
        ${
          d.status === "pending"
            ? `
          <button class="btn btn-approve" onclick="approveDeposit(${d.id})">✅ Valider</button>
          <button class="btn btn-reject" onclick="rejectDeposit(${d.id})">❌ Refuser</button>
        `
            : ""
        }
      </td>
    </tr>
  `
    )
    .join("");
}

function renderWithdrawals(withdrawals) {
  const tbody = document.getElementById("withdrawalsBody");

  if (!withdrawals || withdrawals.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="empty-state">Aucun retrait</td></tr>';
    return;
  }

  tbody.innerHTML = withdrawals
    .map(
      (w) => `
    <tr data-status="${w.status}">
      <td>#${w.id}</td>
      <td>${w.user_name || w.prenom + " " + w.nom}</td>
      <td>${w.email}</td>
      <td>${w.amount_fcfa.toLocaleString()} FCFA<br><small>(${
        w.amount_mz
      } MZ)</small></td>
      <td>${w.wallet_name}<br><small>${w.wallet_number}</small></td>
      <td>${formatDate(w.created_at)}</td>
      <td><span class="badge badge-${w.status}">${getStatusLabel(
        w.status
      )}</span></td>
      <td>
        ${
          w.status === "pending"
            ? `
          <button class="btn btn-approve" onclick="approveWithdrawal(${w.id})">✅ Valider</button>
          <button class="btn btn-reject" onclick="rejectWithdrawal(${w.id})">❌ Refuser</button>
        `
            : ""
        }
      </td>
    </tr>
  `
    )
    .join("");
}

function renderUsers(users) {
  const tbody = document.getElementById("usersBody");

  if (!users || users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-state">Aucun utilisateur</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map(
      (u) => `
    <tr>
      <td>#${u.id}</td>
      <td>${u.prenom} ${u.nom}</td>
      <td>${u.email}</td>
      <td>${u.telephone}</td>
      <td>${parseFloat(u.balance_mz).toFixed(2)} MZ</td>
      <td>${formatDate(u.created_at)}</td>
    </tr>
  `
    )
    .join("");
}

function renderGames(games) {
  const tbody = document.getElementById("gamesBody");

  if (!games || games.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">Aucune partie</td></tr>';
    return;
  }

  tbody.innerHTML = games
    .map((g) => {
      const isWin = parseFloat(g.win_amount) > 0;
      const badgeClass = isWin ? "badge-approved" : "badge-rejected";
      const resultText = isWin ? "🎉 Victoire" : "💀 Défaite";

      return `
      <tr>
        <td>${g.id}</td>
        <td>${g.user_name || g.prenom + " " + g.nom}</td>
        <td>${g.bet_amount} MZ</td>
        <td>x${parseFloat(g.final_multiplier).toFixed(2)}</td>
        <td>${parseFloat(g.win_amount).toFixed(2)} MZ</td>
        <td>${formatDate(g.created_at)}</td>
        <td><span class="badge ${badgeClass}">${resultText}</span></td>
      </tr>
    `;
    })
    .join("");
}

// ============================================
// ACTIONS
// ============================================

async function approveDeposit(id) {
  if (!confirm("Confirmer la validation de ce dépôt ?")) return;

  try {
    const response = await apiCall(`/deposits/${id}/approve`, "POST");
    if (response.success) {
      showNotification("✅ Dépôt validé avec succès", "success");
      loadDeposits();
      loadStats();
    } else {
      showNotification(response.message || "Erreur", "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur lors de la validation", "error");
  }
}

async function rejectDeposit(id) {
  const reason = prompt("Raison du rejet (optionnel):");
  if (reason === null) return;

  try {
    const response = await apiCall(`/deposits/${id}/reject`, "POST", {
      reason,
    });
    if (response.success) {
      showNotification("❌ Dépôt rejeté", "success");
      loadDeposits();
      loadStats();
    } else {
      showNotification(response.message || "Erreur", "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur lors du rejet", "error");
  }
}

async function approveWithdrawal(id) {
  if (!confirm("Avez-vous effectué le transfert Mobile Money ?")) return;

  try {
    const response = await apiCall(`/withdrawals/${id}/approve`, "POST");
    if (response.success) {
      showNotification("✅ Retrait validé avec succès", "success");
      loadWithdrawals();
      loadStats();
    } else {
      showNotification(response.message || "Erreur", "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur lors de la validation", "error");
  }
}

async function rejectWithdrawal(id) {
  const reason = prompt("Raison du rejet (optionnel):");
  if (reason === null) return;

  try {
    const response = await apiCall(`/withdrawals/${id}/reject`, "POST", {
      reason,
    });
    if (response.success) {
      showNotification("❌ Retrait rejeté", "success");
      loadWithdrawals();
      loadStats();
    } else {
      showNotification(response.message || "Erreur", "error");
    }
  } catch (error) {
    console.error("Erreur:", error);
    showNotification("Erreur lors du rejet", "error");
  }
}

// ============================================
// UTILITAIRES
// ============================================

async function apiCall(endpoint, method = "GET", data = null) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
  };

  if (data && (method === "POST" || method === "PUT")) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);

  if (response.status === 401) {
    logout();
    throw new Error("Session expirée");
  }

  return await response.json();
}

function switchTab(tabName) {
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));

  document.getElementById(tabName).classList.add("active");
  event.target.classList.add("active");
}

function filterByStatus(type, status) {
  event.target.parentElement
    .querySelectorAll(".filter-btn")
    .forEach((btn) => btn.classList.remove("active"));
  event.target.classList.add("active");

  const tableId = type + "Table";
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);

  rows.forEach((row) => {
    if (status === "all") {
      row.style.display = "";
    } else {
      const rowStatus = row.getAttribute("data-status");
      row.style.display = rowStatus === status ? "" : "none";
    }
  });
}

function searchTable(tableId, searchValue) {
  const table = document.getElementById(tableId);
  const rows = table.getElementsByTagName("tr");
  const search = searchValue.toLowerCase();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(search) ? "" : "none";
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("fr-FR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStatusLabel(status) {
  const labels = {
    pending: "⏳ En attente",
    approved: "✅ Approuvé",
    rejected: "❌ Rejeté",
  };
  return labels[status] || status;
}

function showNotification(message, type = "success") {
  const notif = document.createElement("div");
  notif.className = `notification ${type}`;
  notif.textContent = message;
  document.body.appendChild(notif);

  setTimeout(() => notif.remove(), 3000);
}
