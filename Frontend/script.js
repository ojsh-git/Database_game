"use strict";

// GTMS FRONTEND DEMO
// Sample data is stored in this JavaScript file.

const API_BASE = "http://localhost:3000/api";

// Tournaments now come from MySQL via the backend.
let tournaments = [];

const matches = [
  {
    date: "NOV 15",
    game: "Valorant",
    title: "Valorant Champions Cup",
    teams: "Team Alpha vs Team Nova",
    time: "5:00 PM"
  },
  {
    date: "NOV 20",
    game: "BGMI",
    title: "BGMI Campus Showdown",
    teams: "Team Phoenix vs Team Elite",
    time: "6:30 PM"
  },
  {
    date: "NOV 25",
    game: "Free Fire",
    title: "Free Fire Elite League",
    teams: "Team Blaze vs Team Storm",
    time: "4:00 PM"
  }
];

const leaderboard = [
  { name: "ShadowX", game: "Valorant", wins: 28, points: 2450 },
  { name: "Phantom", game: "BGMI", wins: 24, points: 2210 },
  { name: "NovaAce", game: "Counter-Strike 2", wins: 21, points: 1980 },
  { name: "BlazeYT", game: "Free Fire", wins: 19, points: 1840 },
  { name: "Viper", game: "Valorant", wins: 17, points: 1690 }
];

// Browser-session demo state.
let registrations = [];
let adminMode = false;
let adminToken = "";
let toastTimer;

try {
  adminToken = sessionStorage.getItem("gtmsAdminToken") || "";
} catch {}

// Logged-in player (null = guest). Token survives a refresh.
let currentUser = null;
let userToken = "";
let pendingTournamentId = null;

try {
  userToken = localStorage.getItem("gtmsUserToken") || "";
} catch {}

function saveRegistrations() {
  try {
    localStorage.setItem("gtmsRegistrations", JSON.stringify(registrations));
  } catch {}
}

// Format Indian Rupees.
function formatMoney(amount) {
  return "₹" + Number(amount).toLocaleString("en-IN");
}

// Format dates without changing their calendar day.
function formatDate(dateString) {
  const date = new Date(dateString + "T12:00:00");

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

// Build a local date/time from YYYY-MM-DD and an optional time.
function makeLocalDateTime(dateString, timeString) {
  const [year, month, day] = dateString.split("-").map(Number);

  let hours = 0;
  let minutes = 0;

  if (timeString) {
    const match = timeString.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);

    if (match) {
      hours = Number(match[1]) % 12;
      minutes = Number(match[2]);

      if (match[3].toUpperCase() === "PM") {
        hours += 12;
      }
    }
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

function countdownTimestamp(dateString, timeString) {
  return makeLocalDateTime(dateString, timeString).getTime();
}

// Format countdown display.
function formatCountdown(targetTimestamp) {
  const remaining = targetTimestamp - Date.now();

  if (remaining <= 0) {
    return {
      text: "Scheduled time reached",
      finished: true
    };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return {
      text: `${days}d ${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m`,
      finished: false
    };
  }

  return {
    text: `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`,
    finished: false
  };
}

// Update countdowns without rebuilding cards.
function updateCountdowns() {
  document.querySelectorAll("[data-countdown-ms]").forEach(element => {
    const target = Number(element.dataset.countdownMs);

    if (!Number.isFinite(target)) return;

    const countdown = formatCountdown(target);

    element.textContent = countdown.text;
    element.classList.toggle("countdown-finished", countdown.finished);
  });
}

// Escape user-provided text before inserting it into HTML.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}
// Call the backend and turn error responses into readable messages.
async function apiRequest(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (userToken) {
    headers["X-User-Token"] = userToken;
  }

  if (adminToken) {
    headers.Authorization = `Bearer ${adminToken}`;
  }

  const response = await fetch(API_BASE + path, { ...options, headers });

  let data = {};
  try { data = await response.json(); } catch {}

  if (!response.ok) {
    const error = new Error(
  [data.error, data.code, data.detail].filter(Boolean).join(" — ") ||
  `Request failed (${response.status})`
);
    error.status = response.status;
    throw error;
  }

  return data;
}

// Convert database status to the labels the UI already uses.
function toFrontendStatus(row) {
  const registered = Number(row.registered) || 0;
  const slots = Number(row.slots) || 0;

  if (row.db_status === "registration_open") {
    return registered >= slots ? "Full" : "Open";
  }

  const labels = {
    upcoming: "Upcoming",
    ongoing: "Ongoing",
    completed: "Completed",
    cancelled: "Cancelled"
  };

  return labels[row.db_status] || "Upcoming";
}

// Load tournaments from MySQL and reshape them for the existing cards.
async function loadTournaments() {
  try {
    const rows = await apiRequest("/tournaments");

    tournaments = rows.map(row => ({
      id: Number(row.id),
      name: row.name,
      game: row.game,
      prize: Number(row.prize) || 0,       // DECIMAL arrives as a string
      slots: Number(row.slots) || 0,
      registered: Number(row.registered) || 0,
      date: String(row.date).slice(0, 10),
      status: toFrontendStatus(row),
      competitorType: row.competitor_type,
      description: `Join ${row.name}, compete in ${row.game}, and challenge other players.`
    }));
  } catch (error) {
    console.error("Load tournaments failed:", error);
    showToast("Could not reach the GTMS server. Is it running?");
  }

  renderAll();
  updateCountdowns();
}
async function loadRegistrations() {
    if (!currentUser) {
      registrations = [];
      renderRegistrations();
      return;
    }
  try {
      registrations = await apiRequest("/my-registrations");
  } catch (error) {
    console.error("Load registrations failed:", error);
    if (error.status === 401) clearUserSession();
  }

  renderRegistrations();
}

function setAdminMode(on) {
  adminMode = on;
  const indicator = document.getElementById("adminIndicator");
  indicator.textContent = on ? "ON" : "OFF";
  indicator.classList.toggle("enabled", on);
}

function openAdminForm() {
  document.getElementById("newDate").value = "2026-12-20";
  const message = document.getElementById("adminMessage");
  message.textContent = "";
  message.classList.remove("error");
  openModal("adminModal");
}

function gameClass(game) {
  return game.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function gameSymbol(game) {
  const symbols = {
    "Valorant": "V",
    "BGMI": "B",
    "Free Fire": "F",
    "Counter-Strike 2": "CS"
  };

  return symbols[game] || "G";
}

// Toast notification.
function showToast(message) {
  const toast = document.getElementById("toast");

  toast.textContent = message;
  toast.classList.remove("hidden");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 2800);
}

// Open modal.
function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
  document.body.style.overflow = "hidden";

  const firstInput = document.querySelector(
    `#${id} input:not([type="hidden"])`
  );

  if (firstInput) {
    setTimeout(() => firstInput.focus(), 50);
  }
}

// Close modal.
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");

  const anotherModalOpen = [
    ...document.querySelectorAll(".modal-backdrop")
  ].some(modal => !modal.classList.contains("hidden"));

  if (!anotherModalOpen) {
    document.body.style.overflow = "";
  }
}

// Dashboard statistics.
function renderStats() {
  const active = tournaments.filter(t => t.status === "Open").length;

  const players = tournaments.reduce(
    (sum, t) => sum + t.registered,
    0
  );

  const prize = tournaments.reduce(
    (sum, t) => sum + t.prize,
    0
  );

  document.getElementById("activeCount").textContent = active;

  document.getElementById("playerCount").textContent =
    players.toLocaleString("en-IN");

  document.getElementById("prizeCount").textContent =
    formatMoney(prize);

  document.getElementById("matchCount").textContent = matches.length;

  document.getElementById("tournamentCount").textContent =
    tournaments.length;
}

// Render tournament cards with countdowns.
function renderTournaments() {
  const search = document.getElementById("searchInput")
    .value.trim().toLowerCase();

  const selectedGame = document.getElementById("gameFilter").value;
  const selectedStatus = document.getElementById("statusFilter").value;
  const sort = document.getElementById("sortFilter").value;

  let filtered = tournaments.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(search) ||
      t.game.toLowerCase().includes(search);

    const matchesGame =
      selectedGame === "all" || t.game === selectedGame;

    const matchesStatus =
      selectedStatus === "all" || t.status === selectedStatus;

    return matchesSearch && matchesGame && matchesStatus;
  });

  if (sort === "prize") {
    filtered.sort((a, b) => b.prize - a.prize);
  } else if (sort === "name") {
    filtered.sort((a, b) => a.name.localeCompare(b.name));
  }

  const grid = document.getElementById("tournamentGrid");
  const emptyState = document.getElementById("emptyState");

  grid.innerHTML = filtered.map(t => {
    const available = Math.max(0, t.slots - t.registered);

    const canRegister =
      t.status === "Open" && available > 0;

    const isRegistered = false; // unlimited entries allowed

    let buttonText = "Register →";

    if (isRegistered) {
      buttonText = "Registered ✓";
    } else if (t.status === "Full" || available === 0) {
      buttonText = "Tournament full";
    } else if (t.status === "Upcoming") {
      buttonText = "Coming soon";
    }

    return `
      <article class="tournament-card">
        <div class="card-art ${gameClass(t.game)}">
          <span class="card-status ${t.status.toLowerCase()}">
            ${escapeHTML(t.status.toUpperCase())}
          </span>

          <span class="game-symbol">
            ${escapeHTML(gameSymbol(t.game))}
          </span>

          <span class="card-game">
            ${escapeHTML(t.game)}
          </span>
        </div>

        <div class="card-content">
          <h3>${escapeHTML(t.name)}</h3>

          <p class="card-description">
            ${escapeHTML(t.description)}
          </p>

          <div class="card-facts">
            <div class="card-fact">
              <small>PRIZE POOL</small>
              <strong>${formatMoney(t.prize)}</strong>
            </div>

            <div class="card-fact">
              <small>TOURNAMENT DATE</small>
              <strong>${formatDate(t.date)}</strong>
            </div>
          </div>

          <div class="countdown-strip">
            <span class="countdown-label">STARTS IN</span>

            <strong
              class="countdown-value"
              data-countdown-ms="${countdownTimestamp(t.date)}"
            >Calculating…</strong>
          </div>

          <div class="card-bottom">
            <span class="slot-text">
              <strong>${t.registered}/${t.slots}</strong> slots filled
            </span>

            <button
              class="card-button"
              data-tournament="${t.id}"
              ${(!canRegister || isRegistered) ? "disabled" : ""}
            >
              ${buttonText}
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");

  emptyState.classList.toggle("hidden", filtered.length !== 0);

  grid.querySelectorAll("[data-tournament]").forEach(button => {
    button.addEventListener("click", () => {
      openTournament(Number(button.dataset.tournament));
    });
  });
}

// Tournament detail and registration modal.
function openTournament(id) {
  const t = tournaments.find(item => item.id === id);

  if (!t) return;

  const available = Math.max(0, t.slots - t.registered);

  const isRegistered = false; // unlimited entries allowed

  const canRegister =
    t.status === "Open" &&
    available > 0 &&
    !isRegistered;

  document.getElementById("registrationTournamentId").value = t.id;
  document.getElementById("modalGameBadge").textContent = t.game;
  document.getElementById("modalTitle").textContent = t.name;
  document.getElementById("modalDescription").textContent = t.description;

  document.getElementById("modalInfo").innerHTML = `
    <div class="modal-info">
      <small>PRIZE POOL</small>
      <strong>${formatMoney(t.prize)}</strong>
    </div>

    <div class="modal-info">
      <small>DATE</small>
      <strong>${formatDate(t.date)}</strong>
    </div>

    <div class="modal-info">
      <small>STATUS</small>
      <strong>${escapeHTML(t.status)}</strong>
    </div>
    <div class="modal-info">
      <small>TYPE</small>
      <strong>${escapeHTML((t.competitorType || "").toUpperCase())}</strong>
    </div>
    <div class="modal-info">
      <small>AVAILABLE SLOTS</small>
      <strong>${available} / ${t.slots}</strong>
    </div>
  `;
  const teamInput = document.getElementById("teamName");
  teamInput.disabled = false;
  teamInput.required = false;

  // Suggest the account name; any name can still be typed.
  const nameInput = document.getElementById("playerName");
  if (currentUser && !nameInput.value) nameInput.value = currentUser.username;
  
    document.getElementById("entryType").value =
    ["solo", "duo", "squad"].includes(t.competitorType) ? t.competitorType : "solo";
  const message = document.getElementById("registrationMessage");

  message.textContent = "";
  message.classList.remove("error");

  const submit = document.getElementById("registerSubmit");

  submit.disabled = !canRegister;

  submit.textContent = isRegistered
    ? "Already registered"
    : (canRegister
      ? "Confirm registration →"
      : "Registration unavailable");
      if (canRegister && !currentUser) submit.textContent = "Log in to register →";

  openModal("tournamentModal");
}

// Register a player in the frontend demo.
document.getElementById("registrationForm").addEventListener("submit", async event => {
  event.preventDefault();

  const id = Number(document.getElementById("registrationTournamentId").value);
  const tournament = tournaments.find(t => t.id === id);
  const playerName = document.getElementById("playerName").value.trim();
  const teamName = document.getElementById("teamName").value.trim();
  const entryType = document.getElementById("entryType").value;
  const message = document.getElementById("registrationMessage");
  const submit = document.getElementById("registerSubmit");

  if (!tournament || !playerName) return;

  // Registrations are saved under an account, so guests log in first.
  if (!currentUser) {
    pendingTournamentId = id;
    closeModal("tournamentModal");
    openAuth("login", "Log in to register for " + tournament.name + ".");
    return;
  }

  message.textContent = "";
  message.classList.remove("error");
  submit.disabled = true;
  submit.textContent = "Registering…";

  try {
    await apiRequest(`/tournaments/${id}/register`, {
      method: "POST",
      body: JSON.stringify({ playerName, teamName, entryType })

    });

    closeModal("tournamentModal");
    document.getElementById("registrationForm").reset();
    showToast(`Successfully registered for ${tournament.name}!`);

    await Promise.all([loadTournaments(), loadRegistrations()]);
  } catch (error) {
    if (error.status === 401) {
      clearUserSession();
      pendingTournamentId = id;
      closeModal("tournamentModal");
      openAuth("login", "Your session expired. Please log in again.");
      return;
    }
    message.textContent = error.message;
    message.classList.add("error");
  } finally {
    submit.disabled = false;
    submit.textContent = "Confirm registration →";
  }
});
// Match schedule with countdowns.
function renderMatches() {
  document.getElementById("matchList").innerHTML = matches.map(match => {
    const parts = match.date.split(" ");

    const linkedTournament = tournaments.find(
      t => t.name === match.title
    );

    // Use the linked tournament's exact date when available.
    let matchDate = linkedTournament ? linkedTournament.date : "";

    // Resolve dates such as NOV 15 when there is no linked tournament.
    if (!matchDate) {
      const monthNames = [
        "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
        "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
      ];

      const monthIndex = monthNames.indexOf(
        (parts[0] || "").toUpperCase()
      );

      const day = Number(parts[1]);
      const now = new Date();

      let year = now.getFullYear();

      if (monthIndex >= 0 && day) {
        let candidate = new Date(year, monthIndex, day);

        if (candidate.getTime() < now.getTime()) {
          year += 1;
          candidate = new Date(year, monthIndex, day);
        }

        matchDate =
          `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }

    const targetTimestamp = matchDate
      ? countdownTimestamp(matchDate, match.time)
      : NaN;

    return `
      <div class="match-row">
        <div class="match-date">
          ${escapeHTML(parts[0] || "")}
          <small>${escapeHTML(parts[1] || "")}</small>
        </div>

        <div class="match-details">
          <strong>${escapeHTML(match.title)}</strong>
          <small>${escapeHTML(match.teams)}</small>

          <span
            class="match-countdown"
            data-countdown-ms="${targetTimestamp}"
          >Calculating countdown…</span>
        </div>

        <div class="match-time">
          ${escapeHTML(match.time)}
        </div>
      </div>
    `;
  }).join("");
}

// Player leaderboard.
function renderLeaderboard() {
  document.getElementById("leaderboardList").innerHTML =
    leaderboard.map((player, index) => `
      <div class="leaderboard-row">
        <div class="player-cell">
          <span class="player-rank">#${index + 1}</span>

          <span class="player-avatar">
            ${escapeHTML(player.name.charAt(0))}
          </span>

          <span>
            <span class="player-name">
              ${escapeHTML(player.name)}
            </span>

            <span class="player-game">
              ${escapeHTML(player.game)}
            </span>
          </span>
        </div>

        <span class="player-wins">${player.wins}</span>

        <span class="player-points">
          ${player.points.toLocaleString("en-IN")}
        </span>
      </div>
    `).join("");
}

// Player registrations.
function renderRegistrations() {
  const container = document.getElementById("registrationsList");

  if (!currentUser) {
    container.innerHTML = `
      <div class="no-registrations">
        Log in to see your registrations.
        <button type="button" class="text-button" data-open-auth="login">Log in →</button>
      </div>
    `;
    return;
  }

  if (registrations.length === 0) {
    container.innerHTML = `
      <div class="no-registrations">
        You haven't registered for any tournaments yet.
        Browse the tournaments above to get started.
      </div>
    `;
    return;
  }

  container.innerHTML = registrations.map(r => `
    <div class="registration-row">
      <div>
        <strong>${escapeHTML(r.tournamentName)}</strong>
        <small>${escapeHTML(r.playerName)} · ${escapeHTML(r.teamName)}${r.entryType ? " · " + escapeHTML(r.entryType.charAt(0).toUpperCase() + r.entryType.slice(1)) : ""}</small>
      </div>
      <span class="registration-tag">Registered ✓</span>
    </div>
  `).join("");
}

// Refresh all existing sections.
function renderAll() {
  renderStats();
  renderTournaments();
  renderMatches();
  renderLeaderboard();
  renderRegistrations();
}

// Search, filters, and sorting.
["searchInput", "gameFilter", "statusFilter", "sortFilter"].forEach(id => {
  const element = document.getElementById(id);

  element.addEventListener(
    id === "searchInput" ? "input" : "change",
    renderTournaments
  );
});

// Reset all filters.
document.getElementById("resetFilters").addEventListener("click", () => {
  document.getElementById("searchInput").value = "";
  document.getElementById("gameFilter").value = "all";
  document.getElementById("statusFilter").value = "all";
  document.getElementById("sortFilter").value = "default";

  renderTournaments();
});

// Scroll to tournaments.
function scrollToTournaments() {
  document.getElementById("tournaments").scrollIntoView({
    behavior: "smooth"
  });
}

document.getElementById("browseButton").addEventListener(
  "click",
  scrollToTournaments
);

document.getElementById("viewAllButton").addEventListener(
  "click",
  scrollToTournaments
);

document.getElementById("featuredButton").addEventListener("click", () => {
  const firstOpen = tournaments.find(t => t.status === "Open");

  if (firstOpen) {
    openTournament(firstOpen.id);
  }
});

// Admin mode: frontend demonstration only, not real authentication.
// Admin toggle: ask for the password unless we already hold a valid token.
document.getElementById("adminToggle").addEventListener("click", () => {
  if (adminMode) {
    setAdminMode(false);
    adminToken = "";
    try { sessionStorage.removeItem("gtmsAdminToken"); } catch {}
    closeModal("adminModal");
    showToast("Admin mode disabled.");
    return;
  }

  if (adminToken) {
    setAdminMode(true);
    openAdminForm();
  } else {
    const message = document.getElementById("adminLoginMessage");
    message.textContent = "";
    message.classList.remove("error");
    openModal("adminLoginModal");
  }
});

// Admin login → POST /api/admin/login
document.getElementById("adminLoginForm").addEventListener("submit", async event => {
  event.preventDefault();

  const input = document.getElementById("adminPasswordInput");
  const message = document.getElementById("adminLoginMessage");

  message.textContent = "";
  message.classList.remove("error");

  try {
    const data = await apiRequest("/admin/login", {
      method: "POST",
      body: JSON.stringify({ password: input.value })
    });

    adminToken = data.token;
    try { sessionStorage.setItem("gtmsAdminToken", adminToken); } catch {}

    input.value = "";
    closeModal("adminLoginModal");
    setAdminMode(true);
    openAdminForm();
    showToast("Admin access verified.");
  } catch (error) {
    message.textContent = error.message;
    message.classList.add("error");
  }
});

// Create tournament → POST /api/tournaments (Bearer token)
document.getElementById("adminForm").addEventListener("submit", async event => {
  event.preventDefault();

  if (!adminMode || !adminToken) return;

  const name = document.getElementById("newTournamentName").value.trim();
  const game = document.getElementById("newGame").value;
  const prize = Number(document.getElementById("newPrize").value);
  const slots = Number(document.getElementById("newSlots").value);
  const date = document.getElementById("newDate").value;
  const status = document.getElementById("newStatus").value;
  const competitorType = document.getElementById("newCompetitorType").value;
  const message = document.getElementById("adminMessage");

  if (!name || !date || !Number.isFinite(prize) || prize < 0 ||
      !Number.isInteger(slots) || slots < 2) {
    message.textContent = "Please enter valid tournament details.";
    message.classList.add("error");
    return;
  }

  try {
    await apiRequest("/tournaments", {
      method: "POST",
      body: JSON.stringify({
        name,
        game,
        prize,
        slots,
        date,
        status,
        competitorType
      })
    });

    closeModal("adminModal");
    document.getElementById("adminForm").reset();
    showToast("Tournament saved to the database.");
    await loadTournaments();
  } catch (error) {
    if (error.status === 401) {
      // Token expired or server restarted.
      adminToken = "";
      try { sessionStorage.removeItem("gtmsAdminToken"); } catch {}
      setAdminMode(false);
      closeModal("adminModal");
      openModal("adminLoginModal");
      document.getElementById("adminLoginMessage").textContent =
        "Session expired. Please sign in again.";
      return;
    }

    message.textContent = error.message;
    message.classList.add("error");
  }
});

// =========================================
// PLAYER ACCOUNTS: menu, login, sign-up, profile, logout
// =========================================

function setUserSession(token, user) {
  userToken = token;
  currentUser = user;
  try { localStorage.setItem("gtmsUserToken", token); } catch {}
  updateUserUI();
}

function clearUserSession() {
  userToken = "";
  currentUser = null;
  registrations = [];
  try { localStorage.removeItem("gtmsUserToken"); } catch {}
  updateUserUI();
  renderRegistrations();
}

function updateUserUI() {
  const name = currentUser ? currentUser.username : "Guest";
  document.getElementById("profileAvatar").textContent = name.charAt(0).toUpperCase();
  document.getElementById("profileName").textContent = name;
  document.getElementById("profileSubtitle").textContent = currentUser ? "Esports member" : "Not signed in";
  document.getElementById("welcomeName").textContent = currentUser ? `${currentUser.username}.` : "Player.";
  document.getElementById("dropdownCaption").textContent =
    currentUser ? `Signed in as ${currentUser.username}` : "Not signed in";
  document.getElementById("dropdownUserItems").classList.toggle("hidden", !currentUser);
  document.getElementById("dropdownGuestItems").classList.toggle("hidden", !!currentUser);
}

async function loadCurrentUser() {
  if (!userToken) { updateUserUI(); return; }
  try {
    const data = await apiRequest("/auth/me");
    currentUser = data.user;
  } catch (error) {
    if (error.status === 401) clearUserSession();
    else console.error("Session check failed:", error);
  }
  updateUserUI();
}

// One registration row (profile modal).
function registrationRowHTML(r) {
  const typeLabel = r.entryType ? r.entryType.charAt(0).toUpperCase() + r.entryType.slice(1) : "";
  const details = [typeLabel, r.game, r.tournamentDate ? formatDate(String(r.tournamentDate).slice(0, 10)) : ""]
    .filter(Boolean).join(" · ");
  return `
    <div class="registration-row">
      <div>
        <strong>${escapeHTML(r.tournamentName)}</strong>
        <small>${escapeHTML(r.playerName)} · ${escapeHTML(r.teamName)}${details ? " · " + escapeHTML(details) : ""}</small>
      </div>
      <span class="registration-tag">Registered ✓</span>
    </div>
  `;
}

// ••• menu
const profileMenuButton = document.getElementById("profileMenuButton");
const profileDropdown = document.getElementById("profileDropdown");

function toggleProfileMenu(open) {
  const shouldOpen = open ?? profileDropdown.classList.contains("hidden");
  profileDropdown.classList.toggle("hidden", !shouldOpen);
  profileMenuButton.setAttribute("aria-expanded", String(shouldOpen));
}

profileMenuButton.addEventListener("click", event => {
  event.stopPropagation();
  toggleProfileMenu();
});

document.addEventListener("click", event => {
  if (!profileDropdown.contains(event.target) && event.target !== profileMenuButton) {
    toggleProfileMenu(false);
  }
  const link = event.target.closest("[data-open-auth]");
  if (link) openAuth(link.dataset.openAuth);
});

document.getElementById("menuProfile").addEventListener("click", () => { toggleProfileMenu(false); openProfile(); });
document.getElementById("menuLogout").addEventListener("click", () => { toggleProfileMenu(false); logout(); });
document.getElementById("menuLogin").addEventListener("click", () => { toggleProfileMenu(false); openAuth("login"); });
document.getElementById("menuSignup").addEventListener("click", () => { toggleProfileMenu(false); openAuth("signup"); });

// Login / create-account modal
function switchAuthTab(tab) {
  const isLogin = tab === "login";
  document.querySelectorAll("[data-auth-tab]").forEach(button => {
    button.classList.toggle("active", button.dataset.authTab === tab);
  });
  document.getElementById("loginForm").classList.toggle("hidden", !isLogin);
  document.getElementById("signupForm").classList.toggle("hidden", isLogin);
  document.getElementById("authTitle").textContent = isLogin ? "Welcome back" : "Create your account";
  ["loginMessage", "signupMessage"].forEach(id => {
    const m = document.getElementById(id);
    m.textContent = "";
    m.classList.remove("error");
  });
  const first = document.getElementById(isLogin ? "loginUsername" : "signupUsername");
  setTimeout(() => first.focus(), 50);
}

function openAuth(tab = "login", subtitle) {
  document.getElementById("authSubtitle").textContent =
    subtitle || "Log in to register and track your tournaments.";
  openModal("authModal");
  switchAuthTab(tab);
}

document.querySelectorAll("[data-auth-tab]").forEach(button => {
  button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
});

async function afterLogin(data, toastText) {
  setUserSession(data.token, data.user);
  closeModal("authModal");
  document.getElementById("loginForm").reset();
  document.getElementById("signupForm").reset();
  document.getElementById("registrationForm").reset();
  showToast(toastText);
  await loadRegistrations();
  renderTournaments();

  if (pendingTournamentId) {          // continue the registration that needed a login
    const id = pendingTournamentId;
    pendingTournamentId = null;
    openTournament(id);
  }
}

async function submitAuthForm(event, path, body, messageId, submitId, busyText, toastText) {
  event.preventDefault();
  const message = document.getElementById(messageId);
  const submit = document.getElementById(submitId);
  const idleText = submit.textContent;

  message.textContent = "";
  message.classList.remove("error");
  submit.disabled = true;
  submit.textContent = busyText;

  try {
    const data = await apiRequest(path, { method: "POST", body: JSON.stringify(body) });
    await afterLogin(data, toastText(data.user));
  } catch (error) {
    message.textContent = error.message;
    message.classList.add("error");
  } finally {
    submit.disabled = false;
    submit.textContent = idleText;
  }
}

document.getElementById("loginForm").addEventListener("submit", event => {
  submitAuthForm(event, "/auth/login", {
    username: document.getElementById("loginUsername").value.trim(),
    password: document.getElementById("loginPassword").value
  }, "loginMessage", "loginSubmit", "Logging in…", user => `Welcome back, ${user.username}!`);
});

document.getElementById("signupForm").addEventListener("submit", event => {
  submitAuthForm(event, "/auth/signup", {
    username: document.getElementById("signupUsername").value.trim(),
    email: document.getElementById("signupEmail").value.trim(),
    password: document.getElementById("signupPassword").value
  }, "signupMessage", "signupSubmit", "Creating account…", user => `Account created. Welcome, ${user.username}!`);
});

// Logout → then show the login popup for another player
async function logout() {
  const name = currentUser ? currentUser.username : "";
  try { await apiRequest("/auth/logout", { method: "POST" }); } catch {}
  clearUserSession();
  closeModal("profileModal");
  renderTournaments();
  document.getElementById("registrationForm").reset();
  showToast(name ? `${name} logged out.` : "Logged out.");
  openAuth("login", "Log in with another account, or create a new one.");
}

document.getElementById("profileLogout").addEventListener("click", logout);

// Profile modal
async function openProfile() {
  if (!currentUser) { openAuth("login"); return; }

  const name = currentUser.username;
  document.getElementById("profileModalAvatar").textContent = name.charAt(0).toUpperCase();
  document.getElementById("profileTitle").textContent = name;
  document.getElementById("profileMeta").textContent = currentUser.email;
  document.getElementById("profileStats").innerHTML = "";
  document.getElementById("profileDetails").innerHTML = "";
  document.getElementById("profileRegistrations").innerHTML = `<div class="no-registrations">Loading…</div>`;
  openModal("profileModal");

  try {
    const [profile] = await Promise.all([apiRequest("/me/profile"), loadRegistrations()]);
    renderProfile(profile);
  } catch (error) {
    if (error.status === 401) {
      clearUserSession();
      closeModal("profileModal");
      openAuth("login", "Your session expired. Please log in again.");
      return;
    }
    document.getElementById("profileRegistrations").innerHTML =
      `<div class="no-registrations">${escapeHTML(error.message)}</div>`;
  }
}

function renderProfile(profile) {
  const { user, player, stats } = profile;
  const memberSince = user.memberSince ? formatDate(String(user.memberSince).slice(0, 10)) : "—";
  document.getElementById("profileMeta").textContent = `${user.email} · Member since ${memberSince}`;

  const info = (label, value) => `
    <div class="modal-info"><small>${label}</small><strong>${escapeHTML(value)}</strong></div>`;

  document.getElementById("profileStats").innerHTML =
    info("REGISTRATIONS", stats.totalEntries) +
    info("TOURNAMENTS JOINED", stats.tournamentsJoined) +
    info("UPCOMING", stats.upcomingEntries) +
    info("ROLE", user.role === "admin" ? "Admin" : "Player");

  document.getElementById("profileDetails").innerHTML = player
    ? info("GAMER TAG", player.gamer_tag) + info("FULL NAME", player.full_name) +
      (player.country ? info("COUNTRY", player.country) : "")
    : "";

  document.getElementById("profileRegCount").textContent = registrations.length;
  document.getElementById("profileRegistrations").innerHTML = registrations.length
    ? registrations.map(registrationRowHTML).join("")
    : `<div class="no-registrations">No registrations yet. Pick a tournament to get started.</div>`;
}

// Modal close buttons.
document.querySelectorAll("[data-close]").forEach(button => {
  button.addEventListener("click", () => {
    closeModal(button.dataset.close);
  });
});

// Close a modal when clicking its backdrop.
document.querySelectorAll(".modal-backdrop").forEach(backdrop => {
  backdrop.addEventListener("click", event => {
    if (event.target === backdrop) {
      closeModal(backdrop.id);
    }
  });
});

// Close open modals using Escape.
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    toggleProfileMenu(false);
    document.querySelectorAll(".modal-backdrop").forEach(modal => {
      if (!modal.classList.contains("hidden")) {
        closeModal(modal.id);
      }
    });
  }
});

// Sidebar navigation and active section.
document.querySelectorAll(".nav-link[data-section]").forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();

    const sectionId = link.dataset.section;
    const target = document.getElementById(sectionId);

    if (!target) return;

    document.querySelectorAll(".nav-link[data-section]").forEach(item => {
      item.classList.remove("active");
    });

    link.classList.add("active");

    document.getElementById("pageName").textContent =
      link.textContent.trim().replace(/\s+OFF$|\s+ON$/, "");

    target.scrollIntoView({
      behavior: "smooth"
    });
  });
});

// Current date and footer year.
document.getElementById("currentDate").textContent =
  new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });

document.getElementById("footerYear").textContent =
  new Date().getFullYear();
document.getElementById("copyrightYear").textContent =
  new Date().getFullYear();
  // =========================================
// START THE GTMS APPLICATION
// =========================================

renderAll();
loadTournaments();
loadCurrentUser().then(loadRegistrations);   // who is logged in → their registrations

// Update countdowns every second without rebuilding cards.
setInterval(updateCountdowns, 1000);


// =========================================
// GTMS 3D TOURNAMENT CARD TILT
// =========================================

(() => {
  const grid = document.getElementById("tournamentGrid");

  // Only activate on devices with a mouse or precise pointer.
  if (
    !grid ||
    !window.matchMedia("(hover: hover) and (pointer: fine)").matches
  ) {
    return;
  }

  // Respect reduced-motion accessibility settings.
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  // Mouse movement creates a 3D tilt.
  grid.addEventListener("pointermove", event => {
    const card = event.target.closest(".tournament-card");

    if (!card || event.pointerType === "touch") return;

    const rect = card.getBoundingClientRect();

    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;

    const rotateY = (x - 0.5) * 10;
    const rotateX = (0.5 - y) * 8;

    card.style.setProperty(
      "--tilt-x",
      `${rotateX.toFixed(2)}deg`
    );

    card.style.setProperty(
      "--tilt-y",
      `${rotateY.toFixed(2)}deg`
    );

    card.classList.add("is-tilting");
  });

  // Reset all cards when the pointer leaves the grid.
  grid.addEventListener("pointerleave", () => {
    grid.querySelectorAll(".tournament-card.is-tilting").forEach(card => {
      card.classList.remove("is-tilting");

      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    });
  });

  // Reset the previous card when moving to another card.
  grid.addEventListener("pointerout", event => {
    const card = event.target.closest(".tournament-card");

    const nextCard =
      event.relatedTarget && event.relatedTarget.closest
        ? event.relatedTarget.closest(".tournament-card")
        : null;

    if (card && card !== nextCard) {
      card.classList.remove("is-tilting");

      card.style.removeProperty("--tilt-x");
      card.style.removeProperty("--tilt-y");
    }
  });
})();


// =========================================
// GTMS ANIMATED ESPORTS CURSOR ENGINE
// =========================================

(() => {
  const finePointer = window.matchMedia(
    "(hover: hover) and (pointer: fine)"
  );

  // Leave normal cursors enabled on touch devices.
  if (!finePointer.matches) return;

  const core = document.querySelector(".cursor-core");
  const ringOne = document.querySelector(".cursor-ring-one");
  const ringTwo = document.querySelector(".cursor-ring-two");
  const glow = document.querySelector(".cursor-glow");

  const particles = [
    document.querySelector(".particle-one"),
    document.querySelector(".particle-two"),
    document.querySelector(".particle-three")
  ];

  // Stop safely if the cursor elements are missing from index.html.
  if (!core || !ringOne || !ringTwo || !glow) return;

  let mouseX = -100;
  let mouseY = -100;

  let glowX = -100;
  let glowY = -100;

  let cursorVisible = false;

  // Track mouse position.
  document.addEventListener("mousemove", event => {
    mouseX = event.clientX;
    mouseY = event.clientY;

    if (!cursorVisible) {
      cursorVisible = true;

      glowX = mouseX;
      glowY = mouseY;

      document.body.classList.add("cursor-ready");
    }
  });

  // Hide the custom cursor when leaving the browser window.
  document.addEventListener("mouseleave", () => {
    cursorVisible = false;

    document.body.classList.remove("cursor-ready");
  });

  // Restore cursor visibility when entering the document.
  document.addEventListener("mouseenter", () => {
    if (mouseX >= 0 && mouseY >= 0) {
      cursorVisible = true;

      document.body.classList.add("cursor-ready");
    }
  });

  // Position a cursor element.
  function positionElement(element, x, y) {
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  }

  // Animate the cursor and its neon trail.
  function animateCursor() {
    if (cursorVisible) {
      // Main cursor and geometric rings follow the pointer.
      positionElement(core, mouseX, mouseY);
      positionElement(ringOne, mouseX, mouseY);
      positionElement(ringTwo, mouseX, mouseY);

      // Smooth neon glow follows with a slight delay.
      glowX += (mouseX - glowX) * 0.13;
      glowY += (mouseY - glowY) * 0.13;

      positionElement(glow, glowX, glowY);

      // Orbiting particles.
      const time = performance.now() * 0.001;

      particles.forEach((particle, index) => {
        if (!particle) return;

        const radius = 24 + index * 7;
        const speed = 1.5 + index * 0.4;

        const angle =
          time * speed + (index * Math.PI * 2) / 3;

        const x = mouseX + Math.cos(angle) * radius;
        const y = mouseY + Math.sin(angle) * radius;

        positionElement(particle, x, y);
      });
    }

    requestAnimationFrame(animateCursor);
  }

  animateCursor();

  // Enlarge the cursor over interactive elements.
  const interactiveSelector = [
    "button",
    "a",
    "input",
    "select",
    ".tournament-card",
    ".stat-card",
    ".panel"
  ].join(", ");

  document.addEventListener("mouseover", event => {
    if (event.target.closest(interactiveSelector)) {
      document.body.classList.add("cursor-hover");
    }
  });

  document.addEventListener("mouseout", event => {
    if (!event.target.closest(interactiveSelector)) return;

    const nextTarget = event.relatedTarget;

    if (
      !nextTarget ||
      !nextTarget.closest ||
      !nextTarget.closest(interactiveSelector)
    ) {
      document.body.classList.remove("cursor-hover");
    }
  });

  // Small reaction when clicking.
  document.addEventListener("mousedown", () => {
    document.body.classList.add("cursor-click");
  });

  document.addEventListener("mouseup", () => {
    document.body.classList.remove("cursor-click");
  });

  // Prevent the pressed state from remaining stuck if the
  // mouse button is released outside the document.
  window.addEventListener("blur", () => {
    document.body.classList.remove("cursor-click");
  });
})();


/* ==========================================
   SAME CURSOR-FOLLOWING TILT AS TOURNAMENTS
   ========================================== */

(() => {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    return;
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const sections = [
    ["#matchList", ".match-row"],
    ["#leaderboardList", ".leaderboard-row"],
    ["#registrationsList", ".registration-row"]
  ];

  sections.forEach(([containerSelector, itemSelector]) => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    container.addEventListener("pointermove", event => {
      if (event.pointerType === "touch") return;

      const item = event.target.closest(itemSelector);
      if (!item || !container.contains(item)) return;

      // Reset the previous item when moving to another one.
      container.querySelectorAll(itemSelector + ".is-tilting")
        .forEach(previous => {
          if (previous !== item) resetTilt(previous);
        });

      const rect = item.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;

      // Same angle calculation as the tournament cards.
      const rotateY = (x - 0.5) * 10;
      const rotateX = (0.5 - y) * 8;

      item.style.setProperty("--tilt-x", `${rotateX}deg`);
      item.style.setProperty("--tilt-y", `${rotateY}deg`);
      item.classList.add("is-tilting");
    });

    container.addEventListener("pointerout", event => {
      const item = event.target.closest(itemSelector);
      if (!item) return;

      // Keep the tilt while moving between children of the same item.
      if (event.relatedTarget && item.contains(event.relatedTarget)) {
        return;
      }

      resetTilt(item);
    });

    container.addEventListener("pointerleave", () => {
      container.querySelectorAll(itemSelector + ".is-tilting")
        .forEach(resetTilt);
    });
  });

  function resetTilt(item) {
    item.classList.remove("is-tilting");
    item.style.removeProperty("--tilt-x");
    item.style.removeProperty("--tilt-y");
  }
})();
