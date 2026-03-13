const state = {
  selectedNeed: "mark-read",
  authenticated: false,
  dates: [],
};

const needGrid = document.getElementById("needGrid");
const tokenTitle = document.getElementById("tokenTitle");
const tokenMessage = document.getElementById("tokenMessage");
const tokenCard = document.getElementById("tokenCard");
const loginButton = document.getElementById("loginButton");
const connectedEmail = document.getElementById("connectedEmail");
const mailConnected = document.getElementById("mailConnected");
const agentLoaded = document.getElementById("agentLoaded");
const pendingMails = document.getElementById("pendingMails");
const nextSend = document.getElementById("nextSend");
const markReadButton = document.getElementById("markReadButton");
const scheduleForm = document.getElementById("scheduleForm");
const dateInput = document.getElementById("dateInput");
const addDateButton = document.getElementById("addDateButton");
const dateList = document.getElementById("dateList");
const flashMessage = document.getElementById("flashMessage");

function showFlash(message, tone = "success") {
  flashMessage.textContent = message;
  flashMessage.className = `flash is-visible is-${tone}`;

  window.clearTimeout(showFlash.timeoutId);
  showFlash.timeoutId = window.setTimeout(() => {
    flashMessage.className = "flash";
  }, 3200);
}

function setAuthenticated(authenticated) {
  state.authenticated = authenticated;
  tokenCard.dataset.authenticated = String(authenticated);

  if (authenticated) {
    tokenTitle.textContent = "Ready to act";
    tokenMessage.textContent =
      "Your Gmail token is available. Every action still rechecks it before running.";
    loginButton.textContent = "Disconnect mail";
    return;
  }

  tokenTitle.textContent = "Login required";
  tokenMessage.textContent =
    "Please login first. The dashboard blocks every action until a Gmail token is available.";
  loginButton.textContent = "Connect mail";
}

async function fetchTokenStatus() {
  const response = await fetch("/api/dashboard-status");
  const payload = await response.json();
  setAuthenticated(Boolean(payload.authenticated));
  mailConnected.textContent = payload.authenticated ? "Yes" : "No";
  connectedEmail.textContent = payload.connectedEmail || "No mailbox connected";
  agentLoaded.textContent = payload.agentLoaded ? "Yes" : "No";
  pendingMails.textContent = String(payload.pendingCount || 0);
  nextSend.textContent = payload.nextJob
    ? `${payload.nextJob.localTime} -> ${payload.nextJob.to}`
    : "None";
}

function renderDates() {
  if (state.dates.length === 0) {
    dateList.innerHTML = '<p class="empty-state">No date added yet.</p>';
    return;
  }

  dateList.innerHTML = state.dates
    .map(
      (value) => `
        <span class="date-chip">
          ${new Date(value).toLocaleString()}
          <button type="button" data-remove-date="${value}" aria-label="Remove date">Remove</button>
        </span>
      `
    )
    .join("");
}

function showSelectedNeed() {
  document.querySelectorAll("[data-view]").forEach((view) => {
    const isVisible = view.dataset.view === state.selectedNeed;
    view.classList.toggle("is-visible", isVisible);
  });

  document.querySelectorAll("[data-need]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.need === state.selectedNeed);
  });
}

async function guardedAction(action) {
  await fetchTokenStatus();

  if (!state.authenticated) {
    showFlash("Please login with Gmail before running this action.", "error");
    return null;
  }

  return action();
}

async function login() {
  loginButton.disabled = true;

  try {
    const response = await fetch("/api/login", { method: "POST" });
    const payload = await response.json();

    if (!response.ok || !payload.authUrl) {
      throw new Error(payload.error || "Unable to start Gmail login.");
    }

    window.location.href = payload.authUrl;
  } catch (error) {
    showFlash(error.message, "error");
  } finally {
    loginButton.disabled = false;
  }
}

async function disconnect() {
  loginButton.disabled = true;

  try {
    const response = await fetch("/api/disconnect", { method: "POST" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Unable to disconnect Gmail.");
    }

    setAuthenticated(false);
    mailConnected.textContent = "No";
    connectedEmail.textContent = "No mailbox connected";
    showFlash(payload.message || "Gmail disconnected.", "success");
    await fetchTokenStatus();
  } catch (error) {
    showFlash(error.message, "error");
  } finally {
    loginButton.disabled = false;
  }
}

async function markAllRead() {
  markReadButton.disabled = true;

  try {
    const response = await fetch("/api/mark-read", { method: "POST" });
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || payload.error || "Action failed.");
    }

    showFlash(payload.message, "success");
    await fetchTokenStatus();
  } catch (error) {
    showFlash(error.message, "error");
  } finally {
    markReadButton.disabled = false;
  }
}

async function scheduleMails(event) {
  event.preventDefault();

  if (state.dates.length === 0) {
    showFlash("Add at least one future date before scheduling.", "error");
    return;
  }

  const submitButton = scheduleForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const formData = new FormData(scheduleForm);
    const payload = {
      to: formData.get("to"),
      subject: formData.get("subject"),
      body: formData.get("body"),
      dates: state.dates,
    };

    const response = await fetch("/api/schedule-mails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || "Unable to schedule messages.");
    }

    scheduleForm.reset();
    state.dates = [];
    renderDates();
    showFlash(result.message, "success");
    await fetchTokenStatus();
  } catch (error) {
    showFlash(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
}

needGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-need]");

  if (!button) {
    return;
  }

  state.selectedNeed = button.dataset.need;
  showSelectedNeed();
});

loginButton.addEventListener("click", () => {
  if (state.authenticated) {
    disconnect();
    return;
  }

  login();
});

markReadButton.addEventListener("click", () => {
  guardedAction(markAllRead);
});

addDateButton.addEventListener("click", () => {
  if (!dateInput.value) {
    showFlash("Choose a future date first.", "error");
    return;
  }

  const isoDate = new Date(dateInput.value).toISOString();

  if (Number.isNaN(new Date(isoDate).getTime()) || new Date(isoDate) <= new Date()) {
    showFlash("Please choose a valid future date.", "error");
    return;
  }

  if (!state.dates.includes(isoDate)) {
    state.dates.push(isoDate);
    state.dates.sort((a, b) => new Date(a) - new Date(b));
  }

  dateInput.value = "";
  renderDates();
});

dateList.addEventListener("click", (event) => {
  const removeValue = event.target.dataset.removeDate;

  if (!removeValue) {
    return;
  }

  state.dates = state.dates.filter((value) => value !== removeValue);
  renderDates();
});

scheduleForm.addEventListener("submit", (event) => {
  event.preventDefault();
  guardedAction(() => scheduleMails(event));
});

showSelectedNeed();
renderDates();
fetchTokenStatus().catch(() => {
  showFlash("Unable to check token status.", "error");
});
