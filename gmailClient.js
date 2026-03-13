const fs = require("fs");
const http = require("http");
const { google } = require("googleapis");

const CREDENTIALS_PATH = "credentials.json";
const TOKEN_PATH = "token.json";
const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
];

function loadCredentials() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, "utf8"));
  const oauthConfig = credentials.web || credentials.installed;

  if (!oauthConfig) {
    throw new Error(
      "credentials.json doit contenir une configuration OAuth 'web' ou 'installed'."
    );
  }

  const { client_id, client_secret, redirect_uris } = oauthConfig;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

function loadSavedToken() {
  if (!fs.existsSync(TOKEN_PATH)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
}

function hasSavedToken() {
  return fs.existsSync(TOKEN_PATH);
}

function saveToken(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

function encodeHeaderValue(value) {
  return `=?UTF-8?B?${Buffer.from(String(value), "utf8").toString("base64")}?=`;
}

function buildRawMessage({ to, subject, body }) {
  const message = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${encodeHeaderValue(subject)}`,
    "",
    body,
  ].join("\r\n");

  return Buffer.from(message)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sendMail(auth, mail) {
  const gmail = google.gmail({ version: "v1", auth });
  const raw = buildRawMessage(mail);

  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });
}

async function getConnectedEmail(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  const response = await gmail.users.getProfile({ userId: "me" });
  return response.data.emailAddress || null;
}

function applySavedToken(auth) {
  const savedToken = loadSavedToken();

  if (!savedToken) {
    return null;
  }

  auth.setCredentials(savedToken);
  return auth;
}

function getAuthorizationUrl(auth) {
  return auth.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
  });
}

async function exchangeCodeForToken(auth, code) {
  const { tokens } = await auth.getToken(code);
  auth.setCredentials(tokens);
  saveToken(tokens);
  return auth;
}

function getOAuthListenerConfig(auth) {
  const redirectUrl = new URL(auth.redirectUri);

  return {
    origin: redirectUrl.origin,
    port: Number(redirectUrl.port || 80),
    pathname: redirectUrl.pathname || "/",
  };
}

async function authorizeViaLocalServer(auth) {
  const { origin, port, pathname } = getOAuthListenerConfig(auth);

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, origin);

        if (url.pathname !== pathname) {
          res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Page introuvable.");
          return;
        }

        const code = url.searchParams.get("code");

        if (!code) {
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Serveur OAuth pret. Retourne au terminal.");
          return;
        }

        await exchangeCodeForToken(auth, code);

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Authentification reussie. Tu peux fermer cette page.");

        server.close(() => resolve(auth));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Erreur pendant l'authentification.");
        server.close(() => reject(error));
      }
    });

    server.listen(port, () => {
      console.log("Ouvre ce lien dans ton navigateur pour autoriser Gmail :");
      console.log(getAuthorizationUrl(auth));
    });
  });
}

async function authorize(auth) {
  const configuredAuth = applySavedToken(auth);

  if (configuredAuth) {
    return configuredAuth;
  }

  return authorizeViaLocalServer(auth);
}

module.exports = {
  authorize,
  applySavedToken,
  loadCredentials,
  loadSavedToken,
  hasSavedToken,
  getAuthorizationUrl,
  getConnectedEmail,
  exchangeCodeForToken,
  saveToken,
  sendMail,
  TOKEN_PATH,
  CREDENTIALS_PATH,
  GMAIL_SCOPES,
};
