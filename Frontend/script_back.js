```javascript
/* =========================================================
   GTMS — GAMING TOURNAMENT MANAGEMENT SYSTEM
   Frontend JavaScript
   Backend: http://localhost:3000/api
========================================================= */

"use strict";

const GTMS_API = "http://localhost:3000/api";

let adminToken = null;
let selectedTournament = null;
let currentSearch = "";
let currentGame = "all";
let currentStatus = "all";
let currentSort = "date";

let registrations = [];
let tournaments = [];
let matches = [
    {
        id: 1,
        game: "Valorant",
        team1: "Shadow Strikers",
        team2: "Night Raiders",
        date: getRelativeDate(1),
        time: "18:00",
        status: "upcoming"
    },
    {
        id: 2,
        game: "BGMI",
        team1: "Alpha Squad",
        team2: "Phoenix Esports",
        date: getRelativeDate(2),
        time: "17:00",
        status: "upcoming"
    },
    {
        id: 3,
        game: "CS2",
        team1: "Cyber Wolves",
        team2: "Pixel Warriors",
        date: getRelativeDate(3),
        time: "19:30",
        status: "upcoming"
    }
];

let leaderboard = [
    { id: 1, name: "ShadowX", game: "Valorant", points: 2450, wins: 24 },
    { id: 2, name: "Phantom", game: "BGMI", points: 2210, wins: 21 },
    { id: 3, name: "Blaze", game: "CS2", points: 1980, wins: 19 },
    { id: 4, name: "NightFury", game: "Free Fire", points: 1760, wins: 17 },
    { id: 5, name: "Venom", game: "Valorant", points: 1590, wins: 15 }
];

const demoTournaments = [
    {
        id: "demo-1",
        name: "Valorant Campus Clash",
        game: "Valorant",
        prize: 10000,
        slots: 64,
        registered: 32,
        date: getRelativeDate(4),
        status: "upcoming",
        description: "Bring your team and prove your tactical skills in the ultimate Valorant showdown."
    },
    {
        id: "demo-2",
        name: "BGMI Battle Royale",
        game: "BGMI",
        prize: 8000,
        slots: 100,
        registered: 65,
        date: getRelativeDate(6),
        status: "upcoming",
        description: "Survive the battlefield, outplay your opponents, and claim the chicken dinner."
    },
    {
        id: "demo-3",
        name: "Free Fire Championship",
        game: "Free Fire",
        prize: 5000,
        slots: 48,
        registered: 28,
        date: getRelativeDate(2),
        status: "live",
        description: "Fast-paced action, strategic plays, and intense competition."
    },
    {
        id: "demo-4",
        name: "CS2 Strike League",
        game: "CS2",
        prize: 12000,
        slots: 32,
        registered: 18,
        date: getRelativeDate(8),
        status: "upcoming",
        description: "A competitive tactical shooter tournament for aspiring champions."
    },
    {
        id: "demo-5",
        name: "Minecraft Build-Off",
        game: "Minecraft",
        prize: 3000,
        slots: 40,
        registered: 20,
        date: getRelativeDate(10),
        status: "upcoming",
        description: "Show your creativity, teamwork, and building skills."
    },
    {
        id: "demo-6",
        name: "Legends Arena",
        game: "League of Legends",
        prize: 15000,
        slots: 50,
        registered: 50,
        date: getRelativeDate(-5),
        status: "completed",
        description: "A competitive arena for players who want to test their limits."
    }
];


/* =========================================================
   UTILITIES
========================================================= */

function getRelativeDate(daysFromNow) {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    date.setHours(18, 0, 0, 0);
    return date.toISOString();
}

function $(id) {
    return document.getElementById(id);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[char];
    });
}

function formatMoney(value) {
    return "₹" + Number(value || 0).toLocaleString("en-IN");
}

function formatDate(value) {
    if (!value) return "Date to be announced";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatDateTime(value) {
    if (!value) return "Date to be announced";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return escapeHTML(value);
    }

    return date.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function gameIcon(game) {
    const icons = {
        "Valorant": "🎯",
        "BGMI": "🔫",
        "Free Fire": "🔥",
        "CS2": "⚔️",
        "Minecraft": "🧱",
        "Call of Duty": "💥",
        "League of Legends": "🛡️",
        "Other": "🎮"
    };

    return icons[game] || "🎮";
}

function normalizeStatus(status) {
    const value = String(status || "upcoming").toLowerCase();

    if (["live", "ongoing", "in progress"].includes(value)) {
        return "live";
    }

    if (["completed", "finished", "closed"].includes(value)) {
        return "completed";
    }

    return "upcoming";
}

function getTournamentStatus(tournament) {
    const status = normalizeStatus(tournament.status);

    if (status === "completed" || status === "live") {
        return status;
    }

    const date = new Date(tournament.date);

    if (!Number.isNaN(date.getTime()) && date.getTime() < Date.now()) {
        return "completed";
    }

    return "upcoming";
}

function showToast(message, type = "success") {
    const container = $("toastContainer");

    if (!container) {
        console.log(message);
        return;
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icon = type === "error" ? "✕" : "✓";

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span>${escapeHTML(message)}</span>
    `;

    container.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    setTimeout(() => {
        toast.classList.remove("show");

        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3200);
}

async function apiRequest(path, options = {}) {
    const headers = {
        ...(options.headers || {})
    };

    if (options.body && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }

    if (adminToken) {
        headers.Authorization = `Bearer ${adminToken}`;
    }

    const response = await fetch(`${GTMS_API}${path}`, {
        ...options,
        headers
    });

    const text = await response.text();

    let data = {};

    try {
        data = text ? JSON.parse(text) : {};
    } catch {
        data = { message: text };
    }

    if (!response.ok) {
        throw new Error(
            data.message ||
            data.error ||
            `Request failed (${response.status})`
        );
    }

    return data;
}


/* =========================================================
   MODALS
========================================================= */

function openModal(id) {
    const modal = $(id);

    if (!modal) return;

    modal.classList.add("active", "open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const input = modal.querySelector(
        'input:not([type="hidden"]), select, textarea'
    );

    if (input) {
        setTimeout(() => input.focus(), 100);
    }
}

function closeModal(id) {
    const modal = $(id);

    if (!modal) return;

    modal.classList.remove("active", "open");
    modal.setAttribute("aria-hidden", "true");

    if (!document.querySelector(
        '.modal-overlay.active, .modal-overlay.open'
    )) {
        document.body.classList.remove("modal-open");
    }
}

function closeAllModals() {
    document.querySelectorAll(".modal-overlay").forEach(modal => {
        modal.classList.remove("active", "open");
        modal.setAttribute("aria-hidden", "true");
    });

    document.body.classList.remove("modal-open");
}

document.querySelectorAll("[data-close-modal]").forEach(button => {
    button.addEventListener("click", () => {
        const modal = button.closest(".modal-overlay");

        if (modal) {
            closeModal(modal.id);
        }
    });
});

document.querySelectorAll(".modal-overlay").forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal(modal.id);
        }
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        closeAllModals();
    }
});


/* =========================================================
   LOAD TOURNAMENTS FROM MYSQL
========================================================= */

function mapDatabaseTournament(row) {
    return {
        id: row.id ?? row.tournament_id,
        name: row.name ?? row.tournament_name ?? "Untitled Tournament",
        game: row.game ?? row.game_name ?? "Other",
        prize: Number(row.prize ?? row.prize_pool ?? 0),
        slots: Number(
            row.slots ??
            row.max_participants ??
            row.max_players ??
            0
        ),
        registered: Number(
            row.registered ??
            row.registered_count ??
            row.participant_count ??
            0
        ),
        date: row.date ?? row.start_date ?? row.tournament_date ?? "",
        status: normalizeStatus(row.status ?? row.db_status),
        description: row.description ?? "Join the competition and prove your skills.",
        source: "database"
    };
}

async function loadTournamentsFromDatabase() {
    try {
        const result = await apiRequest("/tournaments");

        const rows = Array.isArray(result)
            ? result
            : result.tournaments || result.data || [];

        if (Array.isArray(rows)) {
            tournaments = rows.map(mapDatabaseTournament);
        }

        renderAll();
    } catch (error) {
        console.warn("Could not load database tournaments:", error.message);

        if (tournaments.length === 0) {
            tournaments = demoTournaments.map(item => ({ ...item }));
            renderAll();
        }

        showToast(
            "Backend unavailable. Showing demo tournaments.",
            "error"
        );
    }
}


/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

function renderStats() {
    const activeTournaments = tournaments.filter(tournament => {
        return getTournamentStatus(tournament) !== "completed";
    });

    const totalPrize = tournaments.reduce((sum, tournament) => {
        return sum + Number(tournament.prize || 0);
    }, 0);

    const totalPlayers = tournaments.reduce((sum, tournament) => {
        return sum + Number(tournament.registered || 0);
    }, 0);

    if ($("tournamentCount")) {
        $("tournamentCount").textContent = tournaments.length;
    }

    if ($("activeCount")) {
        $("activeCount").textContent = activeTournaments.length;
    }

    if ($("playerCount")) {
        $("playerCount").textContent = totalPlayers.toLocaleString("en-IN");
    }

    if ($("prizeCount")) {
        $("prizeCount").textContent = formatMoney(totalPrize);
    }

    if ($("matchCount")) {
        $("matchCount").textContent = matches.length;
    }
}


/* =========================================================
   TOURNAMENT CARDS
========================================================= */

function getFilteredTournaments() {
    let filtered = [...tournaments];

    if (currentSearch) {
        const search = currentSearch.toLowerCase();

        filtered = filtered.filter(tournament => {
            return (
                String(tournament.name).toLowerCase().includes(search) ||
                String(tournament.game).toLowerCase().includes(search) ||
                String(tournament.description || "").toLowerCase().includes(search)
            );
        });
    }

    if (currentGame !== "all") {
        filtered = filtered.filter(tournament => {
            return tournament.game.toLowerCase() === currentGame.toLowerCase();
        });
    }

    if (currentStatus !== "all") {
        filtered = filtered.filter(tournament => {
            return getTournamentStatus(tournament) === currentStatus;
        });
    }

    if (currentSort === "prize") {
        filtered.sort((a, b) => Number(b.prize) - Number(a.prize));
    } else if (currentSort === "players") {
        filtered.sort((a, b) => Number(b.registered) - Number(a.registered));
    } else if (currentSort === "name") {
        filtered.sort((a, b) => a.name.localeCompare(b.name));
    } else {
        filtered.sort((a, b) => {
            return new Date(a.date || 0) - new Date(b.date || 0);
        });
    }

    return filtered;
}

function renderTournaments() {
    const grid = $("tournamentGrid");

    if (!grid) return;

    const filtered = getFilteredTournaments();

    grid.innerHTML = "";

    if ($("emptyState")) {
        $("emptyState").hidden = filtered.length > 0;
    }

    filtered.forEach(tournament => {
        const status = getTournamentStatus(tournament);
        const registered = Number(tournament.registered || 0);
        const slots = Number(tournament.slots || 0);

        const percentage = slots > 0
            ? Math.min(100, Math.round((registered / slots) * 100))
            : 0;

        const isFull = slots > 0 && registered >= slots;

        const card = document.createElement("article");
        card.className = "tournament-card tilt-card";
        card.dataset.id = tournament.id;

        card.innerHTML = `
            <div class="tournament-card-top">
                <div class="game-icon">${gameIcon(tournament.game)}</div>
                <span class="status-badge status-${status}">
                    ${status === "live" ? "● LIVE" : escapeHTML(status)}
                </span>
            </div>

            <div class="tournament-game">${escapeHTML(tournament.game)}</div>

            <h3 class="tournament-title">
                ${escapeHTML(tournament.name)}
            </h3>

            <p class="tournament-description">
                ${escapeHTML(tournament.description)}
            </p>

            <div class="tournament-prize">
                <span class="detail-label">PRIZE POOL</span>
                <strong>${formatMoney(tournament.prize)}</strong>
            </div>

            <div class="tournament-details">
                <div class="tournament-detail">
                    <span>📅</span>
                    <span>${formatDate(tournament.date)}</span>
                </div>

                <div class="tournament-detail">
                    <span>👥</span>
                    <span>${registered}${slots ? " / " + slots : ""} players</span>
                </div>
            </div>

            <div class="progress-info">
                <span>Registration</span>
                <span>${percentage}%</span>
            </div>

            <div class="progress-track">
                <div class="progress-fill" style="width:${percentage}%"></div>
            </div>

            <div class="countdown" data-countdown="${escapeHTML(tournament.date)}">
                <span class="countdown-label">STARTS IN</span>
                <strong class="countdown-value">Calculating...</strong>
            </div>

            <button
                type="button"
                class="btn btn-primary tournament-register-btn"
                data-register="${escapeHTML(tournament.id)}"
                ${status !== "upcoming" || isFull ? "disabled" : ""}
            >
                ${
                    status === "completed"
                        ? "Tournament Ended"
                        : status === "live"
                            ? "Tournament Live"
                            : isFull
                                ? "Registration Full"
                                : "Register Now ↗"
                }
            </button>
        `;

        grid.appendChild(card);
    });

    updateCountdowns();
    attachTournamentTilt();
}

function resetFilters() {
    currentSearch = "";
    currentGame = "all";
    currentStatus = "all";
    currentSort = "date";

    if ($("searchInput")) $("searchInput").value = "";
    if ($("gameFilter")) $("gameFilter").value = "all";
    if ($("statusFilter")) $("statusFilter").value = "all";
    if ($("sortFilter")) $("sortFilter").value = "date";

    renderTournaments();
}

if ($("searchInput")) {
    $("searchInput").addEventListener("input", event => {
        currentSearch = event.target.value.trim();
        renderTournaments();
    });
}

if ($("gameFilter")) {
    $("gameFilter").addEventListener("change", event => {
        currentGame = event.target.value;
        renderTournaments();
    });
}

if ($("statusFilter")) {
    $("statusFilter").addEventListener("change", event => {
        currentStatus = event.target.value;
        renderTournaments();
    });
}

if ($("sortFilter")) {
    $("sortFilter").addEventListener("change", event => {
        currentSort = event.target.value;
        renderTournaments();
    });
}

if ($("resetFilters")) {
    $("resetFilters").addEventListener("click", resetFilters);
}

if ($("emptyResetButton")) {
    $("emptyResetButton").addEventListener("click", resetFilters);
}


/* =========================================================
   TOURNAMENT REGISTRATION MODAL
========================================================= */

function openRegistration(tournamentId) {
    selectedTournament = tournaments.find(tournament => {
        return String(tournament.id) === String(tournamentId);
    });

    if (!selectedTournament) {
        showToast("Tournament not found.", "error");
        return;
    }

    if ($("registrationTournamentId")) {
        $("registrationTournamentId").value = selectedTournament.id;
    }

    if ($("registrationTournamentName")) {
        $("registrationTournamentName").textContent =
            `${selectedTournament.name} — ${selectedTournament.game}`;
    }

    openModal("registrationModal");
}

if ($("tournamentGrid")) {
    $("tournamentGrid").addEventListener("click", event => {
        const button = event.target.closest("[data-register]");

        if (button && !button.disabled) {
            openRegistration(button.dataset.register);
        }
    });
}

if ($("registrationType")) {
    $("registrationType").addEventListener("change", event => {
        const isTeam = event.target.value === "team";

        const teamGroup = $("registrationTeamGroup");
        const teamInput = $("registrationTeamName");

        if (teamGroup) {
            teamGroup.style.display = isTeam ? "" : "none";
        }

        if (teamInput) {
            teamInput.required = isTeam;
        }
    });
}

if ($("registrationForm")) {
    $("registrationForm").addEventListener("submit", event => {
        event.preventDefault();

        if (!selectedTournament) {
            showToast("Please select a tournament first.", "error");
            return;
        }

        const playerName = $("registrationPlayerName").value.trim();
        const gamerTag = $("registrationGamerTag").value.trim();
        const email = $("registrationEmail").value.trim();
        const registrationType = $("registrationType").value;
        const teamName = $("registrationTeamName").value.trim();

        if (!playerName || !gamerTag || !email) {
            showToast("Please complete all required fields.", "error");
            return;
        }

        if (registrationType === "team" && !teamName) {
            showToast("Please enter your team name.", "error");
            return;
        }

        const alreadyRegistered = registrations.some(registration => {
            return (
                String(registration.tournamentId) === String(selectedTournament.id) &&
                registration.email.toLowerCase() === email.toLowerCase()
            );
        });

        if (alreadyRegistered) {
            showToast("You have already registered for this tournament.", "error");
            return;
        }

        /*
          This form currently records registrations in frontend memory.
          The backend registration route requires an existing playerId
          or teamId. It cannot persist this form until player/team creation
          and ID mapping are connected to the backend.
        */

        registrations.push({
            id: Date.now(),
            tournamentId: selectedTournament.id,
            tournamentName: selectedTournament.name,
            game: selectedTournament.game,
            playerName,
            gamerTag,
            email,
            registrationType,
            teamName,
            date: new Date().toISOString(),
            status: "Registered"
        });

        selectedTournament.registered =
            Number(selectedTournament.registered || 0) + 1;

        $("registrationForm").reset();

        if ($("registrationTeamGroup")) {
            $("registrationTeamGroup").style.display = "none";
        }

        closeModal("registrationModal");
        renderAll();

        showToast("Registration added for this session!");
    });
}


/* =========================================================
   MATCH SCHEDULE
========================================================= */

function renderMatches() {
    const container = $("matchList");

    if (!container) return;

    container.innerHTML = "";

    if (matches.length === 0) {
        container.innerHTML = `
            <div class="empty-inline">
                <span>⚔️</span>
                <p>No matches scheduled yet.</p>
            </div>
        `;
        return;
    }

    matches.forEach(match => {
        const row = document.createElement("article");
        row.className = "match-card match-row tilt-card";

        row.innerHTML = `
            <div class="match-card-top">
                <span class="match-game-icon">${gameIcon(match.game)}</span>
                <span class="match-status status-${escapeHTML(match.status)}">
                    ${escapeHTML(match.status)}
                </span>
            </div>

            <div class="match-versus">
                <div class="match-team">
                    <span class="team-symbol">${escapeHTML(match.team1.slice(0, 2).toUpperCase())}</span>
                    <strong>${escapeHTML(match.team1)}</strong>
                </div>

                <span class="versus-text">VS</span>

                <div class="match-team">
                    <span class="team-symbol">${escapeHTML(match.team2.slice(0, 2).toUpperCase())}</span>
                    <strong>${escapeHTML(match.team2)}</strong>
                </div>
            </div>

            <div class="match-footer">
                <span>${escapeHTML(match.game)}</span>
                <span>📅 ${formatDate(match.date)}</span>
                <span>🕒 ${escapeHTML(match.time || "TBA")}</span>
            </div>
        `;

        container.appendChild(row);
    });

    attachTiltToElements(container.querySelectorAll(".tilt-card"));
}


/* =========================================================
   LEADERBOARD
========================================================= */

function renderLeaderboard() {
    const container = $("leaderboardList");

    if (!container) return;

    container.innerHTML = "";

    const sorted = [...leaderboard].sort((a, b) => {
        return Number(b.points) - Number(a.points);
    });

    if (sorted.length === 0) {
        container.innerHTML = `
            <div class="empty-inline">
                <span>🏆</span>
                <p>Leaderboard will appear here.</p>
            </div>
        `;
        return;
    }

    sorted.forEach((player, index) => {
        const row = document.createElement("article");
        row.className = "leaderboard-card leaderboard-row tilt-card";

        const rankClass = index < 3 ? `rank-${index + 1}` : "";

        row.innerHTML = `
            <div class="leaderboard-rank ${rankClass}">
                ${String(index + 1).padStart(2, "0")}
            </div>

            <div class="player-avatar">
                ${escapeHTML(player.name.slice(0, 1).toUpperCase())}
            </div>

            <div class="player-info">
                <strong>${escapeHTML(player.name)}</strong>
                <span>${escapeHTML(player.game)} · ${Number(player.wins)} wins</span>
            </div>

            <div class="player-points">
                <strong>${Number(player.points).toLocaleString("en-IN")}</strong>
                <span>POINTS</span>
            </div>
        `;

        container.appendChild(row);
    });

    attachTiltToElements(container.querySelectorAll(".tilt-card"));
}


/* =========================================================
   MY REGISTRATIONS
========================================================= */

function renderRegistrations() {
    const container = $("registrationsList");

    if (!container) return;

    container.innerHTML = "";

    if (registrations.length === 0) {
        container.innerHTML = `
            <div class="empty-inline registration-empty">
                <span>🎮</span>
                <h3>No registrations yet</h3>
                <p>Join a tournament to see your registrations here.</p>
                <a href="#tournaments" class="btn btn-outline">Explore Tournaments</a>
            </div>
        `;
        return;
    }

    registrations.forEach(registration => {
        const card = document.createElement("article");
        card.className = "registration-card tilt-card";

        card.innerHTML = `
            <div class="registration-card-icon">
                ${gameIcon(registration.game)}
            </div>

            <div class="registration-card-info">
                <span class="registration-game">${escapeHTML(registration.game)}</span>
                <h3>${escapeHTML(registration.tournamentName)}</h3>
                <p>
                    ${escapeHTML(registration.registrationType === "team"
                        ? registration.teamName
                        : registration.gamerTag)}
                </p>
                <span class="registration-date">
                    Registered ${formatDate(registration.date)}
                </span>
            </div>

            <div class="registration-card-status">
                <span class="status-badge status-upcoming">
                    ${escapeHTML(registration.status)}
                </span>
            </div>
        `;

        container.appendChild(card);
    });

    attachTiltToElements(container.querySelectorAll(".tilt-card"));
}


/* =========================================================
   COUNTDOWNS
========================================================= */

function updateCountdowns() {
    document.querySelectorAll("[data-countdown]").forEach(element => {
        const targetDate = new Date(element.dataset.countdown);
        const output = element.querySelector(".countdown-value");

        if (!output || Number.isNaN(targetDate.getTime())) {
            if (output) output.textContent = "Date TBA";
            return;
        }

        const difference = targetDate.getTime() - Date.now();

        if (difference <= 0) {
            output.textContent = "Started / Ended";
            return;
        }

        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
            (difference / (1000 * 60 * 60)) % 24
        );
        const minutes = Math.floor(
            (difference / (1000 * 60)) % 60
        );
        const seconds = Math.floor((difference / 1000) % 60);

        output.textContent =
            `${days}d ${hours}h ${minutes}m ${seconds}s`;
    });
}


/* =========================================================
   ADMIN LOGIN
========================================================= */

if ($("adminLoginButton")) {
    $("adminLoginButton").addEventListener("click", () => {
        openModal(adminToken ? "adminModal" : "adminLoginModal");
    });
}

if ($("adminLoginForm")) {
    $("adminLoginForm").addEventListener("submit", async event => {
        event.preventDefault();

        const username = $("adminUsername").value.trim();
        const password = $("adminPassword").value;

        const button = $("adminLoginForm").querySelector(
            'button[type="submit"]'
        );

        if (button) button.disabled = true;

        try {
            const result = await apiRequest("/admin/login", {
                method: "POST",
                body: JSON.stringify({ username, password })
            });

            adminToken = result.token || result.accessToken || null;

            if (!adminToken) {
                throw new Error("The server did not return an admin token.");
            }

            $("adminLoginForm").reset();
            closeModal("adminLoginModal");
            openModal("adminModal");

            showToast("Admin login successful.");
        } catch (error) {
            showToast(error.message || "Admin login failed.", "error");
        } finally {
            if (button) button.disabled = false;
        }
    });
}


/* =========================================================
   ADMIN CREATE TOURNAMENT
========================================================= */

if ($("adminForm")) {
    $("adminForm").addEventListener("submit", async event => {
        event.preventDefault();

        if (!adminToken) {
            closeModal("adminModal");
            openModal("adminLoginModal");
            showToast("Please log in as admin first.", "error");
            return;
        }

        const name = $("adminTournamentName").value.trim();
        const game = $("adminGame").value;
        const date = $("adminTournamentDate").value;
        const prizePool = Number($("adminPrizePool").value);
        const maxPlayers = Number($("adminMaxPlayers").value);
        const status = $("adminTournamentStatus").value;
        const description = $("adminTournamentDescription").value.trim();

        if (!name || !game || !date) {
            showToast("Please fill in all required fields.", "error");
            return;
        }

        const button = $("adminForm").querySelector(
            'button[type="submit"]'
        );

        if (button) button.disabled = true;

        try {
            await apiRequest("/tournaments", {
                method: "POST",
                body: JSON.stringify({
                    name,
                    game,
                    date,
                    prizePool,
                    maxPlayers,
                    status,
                    description
                })
            });

            $("adminForm").reset();
            closeModal("adminModal");

            showToast("Tournament created successfully.");

            await loadTournamentsFromDatabase();
        } catch (error) {
            showToast(
                error.message || "Could not create tournament.",
                "error"
            );
        } finally {
            if (button) button.disabled = false;
        }
    });
}


/* =========================================================
   NAVIGATION
========================================================= */

document.querySelectorAll('.nav-links a[href^="#"]').forEach(link => {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");
    });
});

const observedSections = document.querySelectorAll(
    "#dashboard, #tournaments, #matches, #leaderboard, #my-registrations"
);

if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            const sectionId = entry.target.id;

            document.querySelectorAll(".nav-link").forEach(link => {
                link.classList.toggle(
                    "active",
                    link.getAttribute("href") === `#${sectionId}`
                );
            });
        });
    }, {
        threshold: 0.25
    });

    observedSections.forEach(section => sectionObserver.observe(section));
}


/* =========================================================
   TILT AND HOVER ANIMATIONS
========================================================= */

function attachTiltToElements(elements) {
    elements.forEach(element => {
        if (element.dataset.tiltReady === "true") return;

        element.dataset.tiltReady = "true";

        element.addEventListener("pointermove", event => {
            if (event.pointerType === "touch") return;

            const rect = element.getBoundingClientRect();

            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateY = ((x - centerX) / centerX) * 4;
            const rotateX = ((centerY - y) / centerY) * 4;

            element.style.transform =
                `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;

            element.style.setProperty("--mouse-x", `${x}px`);
            element.style.setProperty("--mouse-y", `${y}px`);
        });

        element.addEventListener("pointerleave", () => {
            element.style.transform = "";
        });
    });
}

function attachTournamentTilt() {
    attachTiltToElements(
        document.querySelectorAll(".tournament-card.tilt-card")
    );
}

function setupGeneralTilt() {
    attachTiltToElements(
        document.querySelectorAll(".stat-card.tilt-card, .team-card.tilt-card")
    );
}


/* =========================================================
   CUSTOM ESPORTS CURSOR
========================================================= */

function setupCustomCursor() {
    const core = document.querySelector(".cursor-core");
    const ringOne = document.querySelector(".cursor-ring-one");
    const ringTwo = document.querySelector(".cursor-ring-two");
    const glow = document.querySelector(".cursor-glow");

    const particles = [
        document.querySelector(".particle-one"),
        document.querySelector(".particle-two"),
        document.querySelector(".particle-three")
    ].filter(Boolean);

    if (!core || !ringOne || !ringTwo) return;

    if (window.matchMedia("(pointer: coarse)").matches) {
        [core, ringOne, ringTwo, glow, ...particles].forEach(element => {
            if (element) element.style.display = "none";
        });
        return;
    }

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    let ringOneX = mouseX;
    let ringOneY = mouseY;
    let ringTwoX = mouseX;
    let ringTwoY = mouseY;

    document.addEventListener("pointermove", event => {
        mouseX = event.clientX;
        mouseY = event.clientY;

        core.style.left = `${mouseX}px`;
        core.style.top = `${mouseY}px`;

        if (glow) {
            glow.style.left = `${mouseX}px`;
            glow.style.top = `${mouseY}px`;
        }

        particles.forEach((particle, index) => {
            const angle = (Date.now() / 250) + (index * 2.1);
            const radius = 17 + (index * 5);

            particle.style.left =
                `${mouseX + Math.cos(angle) * radius}px`;

            particle.style.top =
                `${mouseY + Math.sin(angle) * radius}px`;
        });
    });

    function animateCursor() {
        ringOneX += (mouseX - ringOneX) * 0.22;
        ringOneY += (mouseY - ringOneY) * 0.22;

        ringTwoX += (mouseX - ringTwoX) * 0.12;
        ringTwoY += (mouseY - ringTwoY) * 0.12;

        ringOne.style.left = `${ringOneX}px`;
        ringOne.style.top = `${ringOneY}px`;

        ringTwo.style.left = `${ringTwoX}px`;
        ringTwo.style.top = `${ringTwoY}px`;

        requestAnimationFrame(animateCursor);
    }

    animateCursor();

    document.addEventListener("pointerover", event => {
        const target = event.target;

        if (target.closest("a, button, input, select, textarea, .tilt-card")) {
            document.body.classList.add("cursor-hover");
        } else {
            document.body.classList.remove("cursor-hover");
        }
    });

    document.addEventListener("pointerdown", () => {
        document.body.classList.add("cursor-click");
    });

    document.addEventListener("pointerup", () => {
        document.body.classList.remove("cursor-click");
    });
}


/* =========================================================
   DATE AND FOOTER
========================================================= */

function setupDateAndFooter() {
    if ($("footerYear")) {
        $("footerYear").textContent = new Date().getFullYear();
    }

    if ($("currentDate")) {
        $("currentDate").textContent = new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {
    renderStats();
    renderTournaments();
    renderMatches();
    renderLeaderboard();
    renderRegistrations();
    setupGeneralTilt();
}

function initializeGTMS() {
    setupDateAndFooter();
    setupCustomCursor();
    renderAll();
    updateCountdowns();

    loadTournamentsFromDatabase();

    setInterval(updateCountdowns, 1000);
}

initializeGTMS();
```