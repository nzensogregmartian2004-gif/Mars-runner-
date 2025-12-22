// ============================================
// public/admin.js - FRONTEND ADMIN AVEC BACKEND
// (VERSION CORRIGÉE & ROBUSTE)
// ============================================

const API_BASE = "https://mars-runner-backend.onrender.com/api/admin";
let adminToken = null;

// Utilitaires
function escapeHtml(str) {
  if (str === undefined || str === null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showNotification(message, type = "success", timeout = 3000) {
  const containerId = "adminNotificationContainer";
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.position = "fixed";
    container.style.top = "12px";
    container.style.right = "12px";
    container.style.zIndex = 9999;
    document.body.appendChild(container);
  }

  const notif = document.createElement("div");
  notif.className = `admin-notif ${type}`;
  notif.textContent = message;
  notif.style.marginBottom = "8px";
  notif.style.padding = "10px 14px";
  notif.style.borderRadius = "8px";
  notif.style.color = "#fff";
  notif.style.boxShadow = "0 6px 18px rgba(0,0,0,0.2)";

  if (type === "success")
    notif.style.background = "linear-gradient(#28a745,#218838)";
  else if (type === "error")
    notif.style.background = "linear-gradient(#dc3545,#c82333)";
  else notif.style.background = "linear-gradient(#17a2b8,#117a8b)";

  container.appendChild(notif);
  setTimeout(() => {
    notif.remove();
    // cleanup container if empty
    if (container && container.children.length === 0) container.remove();
  }, timeout);
}

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
  const usernameEl = document.getElementById("adminUsername");
  const passwordEl = document.getElementById("adminPassword");
  const username = usernameEl ? usernameEl.value.trim() : "";
  const password = passwordEl ? passwordEl.value : "";

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

    if (data && data.success && data.data && data.data.token) {
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
  const loginScreen = document.getElementById("loginScreen");
  const adminPanel = document.getElementById("adminPanel");
  if (loginScreen) loginScreen.style.display = "flex";
  if (adminPanel) adminPanel.style.display = "none";
}

function showAdminPanel() {
  const loginScreen = document.getElementById("loginScreen");
  const adminPanel = document.getElementById("adminPanel");
  if (loginScreen) loginScreen.style.display = "none";
  if (adminPanel) adminPanel.style.display = "block";
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
    if (response && response.success) {
      const stats = response.data || {};
      const el = (id) => document.getElementById(id);
      if (el("totalUsers"))
        el("totalUsers").textContent = stats.totalUsers || 0;
      if (el("pendingDeposits"))
        el("pendingDeposits").textContent = stats.pendingDeposits || 0;
      if (el("pendingWithdrawals"))
        el("pendingWithdrawals").textContent = stats.pendingWithdrawals || 0;
      if (el("totalRevenue"))
        el("totalRevenue").textContent =
          (stats.totalRevenue || 0).toLocaleString() + " FCFA";
    }
  } catch (error) {
    console.error("Erreur chargement stats:", error);
  }
}

async function loadDeposits() {
  try {
    const response = await apiCall("/deposits");
    if (response && response.success) {
      renderDeposits(response.data || []);
    } else {
      renderDeposits([]);
    }
  } catch (error) {
    console.error("Erreur chargement dépôts:", error);
    const tb = document.getElementById("depositsBody");
    if (tb)
      tb.innerHTML =
        '<tr><td colspan="8" class="empty-state">Erreur de chargement</td></tr>';
  }
}

async function loadWithdrawals() {
  try {
    const response = await apiCall("/withdrawals");
    if (response && response.success) {
      renderWithdrawals(response.data || []);
    } else {
      renderWithdrawals([]);
    }
  } catch (error) {
    console.error("Erreur chargement retraits:", error);
    const tb = document.getElementById("withdrawalsBody");
    if (tb)
      tb.innerHTML =
        '<tr><td colspan="8" class="empty-state">Erreur de chargement</td></tr>';
  }
}

async function loadUsers() {
  try {
    const response = await apiCall("/users");
    if (response && response.success) {
      renderUsers(response.data || []);
    } else {
      renderUsers([]);
    }
  } catch (error) {
    console.error("Erreur chargement utilisateurs:", error);
    const tb = document.getElementById("usersBody");
    if (tb)
      tb.innerHTML =
        '<tr><td colspan="6" class="empty-state">Erreur de chargement</td></tr>';
  }
}

async function loadGames() {
  try {
    const response = await apiCall("/games");
    if (response && response.success) {
      renderGames(response.data || []);
    } else {
      renderGames([]);
    }
  } catch (error) {
    console.error("Erreur chargement parties:", error);
    const tb = document.getElementById("gamesBody");
    if (tb)
      tb.innerHTML =
        '<tr><td colspan="7" class="empty-state">Erreur de chargement</td></tr>';
  }
}

// ============================================
// RENDERERS
// ============================================
function renderDeposits(deposits) {
  const tbody = document.getElementById("depositsBody");
  if (!tbody) return;

  if (!deposits || deposits.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="empty-state">Aucun dépôt</td></tr>';
    return;
  }

  tbody.innerHTML = deposits
    .map((d) => {
      const id = escapeHtml(d.id);
      const name = escapeHtml(
        d.user_name || (d.prenom || "") + " " + (d.nom || "")
      );
      const email = escapeHtml(d.email || "");
      const amountFcfa =
        typeof d.amount_fcfa === "number"
          ? d.amount_fcfa
          : Number(d.amount_fcfa || 0);
      const amountMz =
        typeof d.amount_mz === "number"
          ? d.amount_mz
          : Number(d.amount_mz || 0);
      const paymentMethod = escapeHtml(d.payment_method || "");
      const telephone = escapeHtml(d.telephone || "");
      const createdAt = escapeHtml(d.created_at || "");
      const status = escapeHtml(d.status || "pending");

      const paymentLabel =
        paymentMethod === "airtel"
          ? "📱 Airtel"
          : paymentMethod === "moov"
          ? "💳 Moov"
          : escapeHtml(paymentMethod);

      return `
      <tr data-status="${status}">
        <td>#${id}</td>
        <td>${name}</td>
        <td>${email}</td>
        <td>
          <strong>${amountFcfa.toLocaleString()} FCFA</strong><br>
          <small>(${amountMz} MZ)</small>
        </td>
        <td>
          <span class="payment-badge ${paymentMethod}">
            ${paymentLabel}
          </span><br>
          <small>${telephone}</small>
        </td>
        <td>${formatDate(createdAt)}</td>
        <td><span class="badge badge-${status}">${getStatusLabel(
        status
      )}</span></td>
        <td>
          ${
            status === "pending"
              ? `
            <button class="btn btn-approve" onclick="approveDeposit(${id})">✅ Approuver</button>
            <button class="btn btn-reject" onclick="rejectDeposit(${id})">❌ Rejeter</button>
          `
              : ""
          }
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderWithdrawals(withdrawals) {
  const tbody = document.getElementById("withdrawalsBody");
  if (!tbody) return;

  if (!withdrawals || withdrawals.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="empty-state">Aucun retrait</td></tr>';
    return;
  }

  tbody.innerHTML = withdrawals
    .map((w) => {
      const id = escapeHtml(w.id);
      const name = escapeHtml(
        w.user_name || (w.prenom || "") + " " + (w.nom || "")
      );
      const email = escapeHtml(w.email || "");
      const amountFcfa =
        typeof w.amount_fcfa === "number"
          ? w.amount_fcfa
          : Number(w.amount_fcfa || 0);
      const amountMz =
        typeof w.amount_mz === "number"
          ? w.amount_mz
          : Number(w.amount_mz || 0);
      const paymentMethod = escapeHtml(w.payment_method || "");
      const telephone = escapeHtml(w.telephone || "");
      const createdAt = escapeHtml(w.created_at || "");
      const status = escapeHtml(w.status || "pending");

      const paymentLabel =
        paymentMethod === "airtel"
          ? "📱 Airtel"
          : paymentMethod === "moov"
          ? "💳 Moov"
          : escapeHtml(paymentMethod);

      return `
      <tr data-status="${status}">
        <td>#${id}</td>
        <td>${name}</td>
        <td>${email}</td>
        <td>
          <strong>${amountFcfa.toLocaleString()} FCFA</strong><br>
          <small>(${amountMz} MZ)</small>
        </td>
        <td>
          <span class="payment-badge ${paymentMethod}">
            ${paymentLabel}
          </span><br>
          <small>${telephone}</small>
        </td>
        <td>${formatDate(createdAt)}</td>
        <td><span class="badge badge-${status}">${getStatusLabel(
        status
      )}</span></td>
        <td>
          ${
            status === "pending"
              ? `
            <button class="btn btn-approve" onclick="approveWithdrawal(${id})">✅ Approuver</button>
            <button class="btn btn-reject" onclick="rejectWithdrawal(${id})">❌ Rejeter</button>
          `
              : ""
          }
        </td>
      </tr>
    `;
    })
    .join("");
}

function renderUsers(users) {
  const tbody = document.getElementById("usersBody");
  if (!tbody) return;

  if (!users || users.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-state">Aucun utilisateur</td></tr>';
    return;
  }

  tbody.innerHTML = users
    .map((u) => {
      const id = escapeHtml(u.id);
      const name = escapeHtml((u.prenom || "") + " " + (u.nom || ""));
      const email = escapeHtml(u.email || "");
      const telephone = escapeHtml(u.telephone || "");
      const balanceMz = isNaN(parseFloat(u.balance_mz))
        ? 0
        : parseFloat(u.balance_mz);
      const createdAt = escapeHtml(u.created_at || "");

      return `
      <tr>
        <td>#${id}</td>
        <td>${name}</td>
        <td>${email}</td>
        <td>${telephone}</td>
        <td>${balanceMz.toFixed(2)} MZ</td>
        <td>${formatDate(createdAt)}</td>
      </tr>
    `;
    })
    .join("");
}

function renderGames(games) {
  const tbody = document.getElementById("gamesBody");
  if (!tbody) return;

  if (!games || games.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="7" class="empty-state">Aucune partie</td></tr>';
    return;
  }

  tbody.innerHTML = games
    .map((g) => {
      const id = escapeHtml(g.id);
      const name = escapeHtml(
        g.user_name || (g.prenom || "") + " " + (g.nom || "")
      );
      const bet = Number(g.bet_amount || 0);
      const multiplier = Number(g.final_multiplier || 0);
      const win = Number(g.win_amount || 0);
      const createdAt = escapeHtml(g.created_at || "");
      const isWin = win > 0;
      const badgeClass = isWin ? "badge-approved" : "badge-rejected";
      const resultText = isWin ? "🎉 Victoire" : "💀 Défaite";

      return `
      <tr>
        <td>${id}</td>
        <td>${name}</td>
        <td>${bet} MZ</td>
        <td>x${multiplier.toFixed(2)}</td>
        <td>${win.toFixed(2)} MZ</td>
        <td>${formatDate(createdAt)}</td>
        <td><span class="badge ${badgeClass}">${resultText}</span></td>
      </tr>
    `;
    })
    .join("");
}

// ============================================
// ACTIONS (approve / reject)
// ============================================
async function approveDeposit(id) {
  if (!confirm("Confirmer la validation de ce dépôt ?")) return;

  try {
    const response = await apiCall(`/deposits/${id}/approve`, "POST");
    if (response && response.success) {
      showNotification("✅ Dépôt validé avec succès", "success");
      await loadDeposits();
      await loadStats();
    } else {
      showNotification(response?.message || "Erreur", "error");
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
    if (response && response.success) {
      showNotification("❌ Dépôt rejeté", "success");
      await loadDeposits();
      await loadStats();
    } else {
      showNotification(response?.message || "Erreur", "error");
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
    if (response && response.success) {
      showNotification("✅ Retrait validé avec succès", "success");
      await loadWithdrawals();
      await loadStats();
    } else {
      showNotification(response?.message || "Erreur", "error");
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
    if (response && response.success) {
      showNotification("❌ Retrait rejeté", "success");
      await loadWithdrawals();
      await loadStats();
    } else {
      showNotification(response?.message || "Erreur", "error");
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
  if (!adminToken) {
    logout();
    throw new Error("Session admin manquante");
  }

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

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (response.status === 401) {
      logout();
      throw new Error("Session expirée");
    }

    const json = await response.json();

    if (!response.ok) {
      // Normaliser l'erreur
      return {
        success: false,
        message: json?.message || `Erreur HTTP ${response.status}`,
      };
    }

    return json;
  } catch (error) {
    console.error("API call error:", error);
    return { success: false, message: error.message || "Erreur réseau" };
  }
}

// switchTab expects the DOM event as second argument
function switchTab(tabName, evt) {
  document
    .querySelectorAll(".tab-content")
    .forEach((tab) => tab.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((btn) => btn.classList.remove("active"));

  const targetTab = document.getElementById(tabName);
  if (targetTab) targetTab.classList.add("active");
  if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
}

function filterByStatus(type, status, evt) {
  if (evt && evt.currentTarget && evt.currentTarget.parentElement) {
    evt.currentTarget.parentElement
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
    evt.currentTarget.classList.add("active");
  }

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
  if (!table) return;
  const rows = table.querySelectorAll("tbody tr");
  const search = (searchValue || "").toLowerCase();

  rows.forEach((row) => {
    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(search) ? "" : "none";
  });
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return escapeHtml(dateString);
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
  return labels[status] || escapeHtml(status);
}
