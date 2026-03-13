const fs = require("fs");
const http = require("http");
const { google } = require("googleapis");

const CREDENTIALS_PATH = "credentials.json";
const TOKEN_PATH = "token.json";
const OAUTH_PORT = 3000;
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

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

function saveToken(tokens) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
}

function buildRawMessage({ to, subject, body }) {
  const message = [
    `To: ${to}`,
    "Content-Type: text/plain; charset=utf-8",
    "MIME-Version: 1.0",
    `Subject: ${subject}`,
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

async function authorize(auth) {
  const savedToken = loadSavedToken();

  if (savedToken) {
    auth.setCredentials(savedToken);
    return auth;
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const url = new URL(req.url, `http://localhost:${OAUTH_PORT}`);
        const code = url.searchParams.get("code");

        if (!code) {
          res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
          res.end("Serveur OAuth pret. Retourne au terminal.");
          return;
        }

        const { tokens } = await auth.getToken(code);
        auth.setCredentials(tokens);
        saveToken(tokens);

        res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Authentification reussie. Tu peux fermer cette page.");

        server.close(() => resolve(auth));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Erreur pendant l'authentification.");
        server.close(() => reject(error));
      }
    });

    server.listen(OAUTH_PORT, () => {
      const authUrl = auth.generateAuthUrl({
        access_type: "offline",
        prompt: "consent",
        scope: [GMAIL_SEND_SCOPE],
      });

      console.log("Ouvre ce lien dans ton navigateur pour autoriser l'envoi :");
      console.log(authUrl);
    });
  });
}

module.exports = {
  authorize,
  loadCredentials,
  loadSavedToken,
  saveToken,
  sendMail,
  TOKEN_PATH,
  CREDENTIALS_PATH,
};
