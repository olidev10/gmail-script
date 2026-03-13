const fs = require("fs");
const path = require("path");
const http = require("http");
const {
  authorize,
  loadCredentials,
  hasSavedToken,
  getAuthorizationUrl,
  getConnectedEmail,
  exchangeCodeForToken,
} = require("../lib/gmail/client");
const { markAllUnreadAsRead } = require("../lib/gmail/actions");
const {
  createJob,
  ensureDirectories,
  listPendingJobs,
} = require("../lib/scheduler/pendingMails");
const {
  ensureAgentLoaded,
  isAgentLoaded,
} = require("../lib/scheduler/launchAgent");
const { formatLocalDate } = require("../lib/shared/date");
const { PUBLIC_DIR } = require("../lib/shared/projectPaths");

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || "127.0.0.1";

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": CONTENT_TYPES[".json"] });
  res.end(JSON.stringify(payload));
}

function sendHtml(res, statusCode, html) {
  res.writeHead(statusCode, { "Content-Type": CONTENT_TYPES[".html"] });
  res.end(html);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Le corps de la requete JSON est invalide."));
      }
    });

    req.on("error", reject);
  });
}

function sendStaticFile(res, filePath) {
  const extension = path.extname(filePath);
  const contentType =
    CONTENT_TYPES[extension] || "application/octet-stream";

  fs.readFile(filePath, (error, content) => {
    if (error) {
      sendJson(res, 404, { error: "Fichier introuvable." });
      return;
    }

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
}

function requireToken(res) {
  if (hasSavedToken()) {
    return true;
  }

  sendJson(res, 401, {
    error: "Authentification requise.",
    needsLogin: true,
    message: "Please login with Gmail before running this action.",
  });

  return false;
}

function normalizeDateInput(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Date invalide: ${value}`);
  }

  if (date.getTime() <= Date.now()) {
    throw new Error(`La date doit etre dans le futur: ${value}`);
  }

  return date;
}

async function getDashboardStatus() {
  const authenticated = hasSavedToken();
  const pendingJobs = listPendingJobs();
  const nextJob = pendingJobs[0] || null;
  let connectedEmail = null;

  if (authenticated) {
    try {
      const auth = await authorize(loadCredentials());
      connectedEmail = await getConnectedEmail(auth);
    } catch (error) {
      connectedEmail = null;
    }
  }

  return {
    authenticated,
    connectedEmail,
    agentLoaded: isAgentLoaded(),
    pendingCount: pendingJobs.length,
    nextJob: nextJob
      ? {
          id: nextJob.id,
          to: nextJob.to,
          at: nextJob.at,
          localTime: formatLocalDate(new Date(nextJob.at)),
        }
      : null,
  };
}

function buildAuthSuccessPage() {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gmail Connected</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        font-family: Georgia, "Times New Roman", serif;
        background:
          radial-gradient(circle at top, rgba(255, 214, 153, 0.55), transparent 32%),
          linear-gradient(135deg, #11243d, #0d1321 58%, #351c2f);
        color: #fff9ef;
      }
      main {
        width: min(34rem, calc(100vw - 3rem));
        padding: 2.25rem;
        border: 1px solid rgba(255, 255, 255, 0.18);
        border-radius: 28px;
        background: rgba(10, 18, 31, 0.74);
        box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
      }
      a {
        color: #ffd07a;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Gmail is connected.</h1>
      <p>You can close this page or go back to the dashboard.</p>
      <p><a href="/">Return to dashboard</a></p>
    </main>
  </body>
</html>`;
}

async function handleApi(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/token-status") {
    sendJson(res, 200, { authenticated: hasSavedToken() });
    return;
  }

  if (req.method === "GET" && pathname === "/api/dashboard-status") {
    sendJson(res, 200, await getDashboardStatus());
    return;
  }

  if (req.method === "POST" && pathname === "/api/login") {
    const auth = loadCredentials();
    sendJson(res, 200, { authUrl: getAuthorizationUrl(auth) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/mark-read") {
    if (!requireToken(res)) {
      return;
    }

    const auth = await authorize(loadCredentials());
    const count = await markAllUnreadAsRead(auth);
    sendJson(res, 200, {
      success: true,
      count,
      message: `${count} unread emails marked as read.`,
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/schedule-mails") {
    if (!requireToken(res)) {
      return;
    }

    const body = await readBody(req);
    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();
    const message = String(body.body || "").trim();
    const dates = Array.isArray(body.dates) ? body.dates : [];

    if (!to || !subject || !message) {
      throw new Error("Recipient, subject, and message are required.");
    }

    if (dates.length === 0) {
      throw new Error("At least one future date is required.");
    }

    const uniqueDates = [...new Set(dates.map((value) => String(value).trim()))];
    const jobs = uniqueDates.map((value) => {
      const scheduledDate = normalizeDateInput(value);
      const { job } = createJob({
        to,
        subject,
        body: message,
        at: scheduledDate.toISOString(),
      });

      return {
        id: job.id,
        at: job.at,
      };
    });

    ensureAgentLoaded();

    sendJson(res, 200, {
      success: true,
      count: jobs.length,
      jobs,
      message: `${jobs.length} mail(s) scheduled for ${to}.`,
    });
    return;
  }

  sendJson(res, 404, { error: "Route API introuvable." });
}

function handleStatic(req, res, pathname, searchParams) {
  if (pathname === "/" && searchParams.has("code")) {
    return false;
  }

  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const normalizedPath = path
    .normalize(requestedPath)
    .replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, normalizedPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Acces refuse." });
    return true;
  }

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    sendJson(res, 404, { error: "Page introuvable." });
    return true;
  }

  sendStaticFile(res, filePath);
  return true;
}

async function requestListener(req, res) {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    const { pathname, searchParams } = url;
    const auth = loadCredentials();
    const redirectPathname = new URL(auth.redirectUri).pathname || "/";

    if (pathname === redirectPathname && searchParams.has("code")) {
      await exchangeCodeForToken(auth, searchParams.get("code"));
      sendHtml(res, 200, buildAuthSuccessPage());
      return;
    }

    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname);
      return;
    }

    handleStatic(req, res, pathname, searchParams);
  } catch (error) {
    sendJson(res, 400, {
      error: error.message || "Une erreur est survenue.",
      needsLogin: /token\.json/.test(String(error.message || "")),
    });
  }
}

ensureDirectories();

http.createServer(requestListener).listen(PORT, HOST, () => {
  console.log(`Dashboard available at http://${HOST}:${PORT}`);
});
