const fs = require("fs");
const http = require("http");
const { google } = require("googleapis");

const credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8"));
const { client_id, client_secret, redirect_uris } = credentials.web;

const auth = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);

const gmail = google.gmail({ version: "v1", auth });

async function markAllUnreadAsRead() {
  let nextPageToken = undefined;
  let total = 0;

  do {
    const res = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
      maxResults: 100,
      pageToken: nextPageToken,
    });

    const messages = res.data.messages || [];

    for (const msg of messages) {
      await gmail.users.messages.modify({
        userId: "me",
        id: msg.id,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });
      total++;
    }

    nextPageToken = res.data.nextPageToken;
  } while (nextPageToken);

  console.log(`${total} mails marqués comme lus.`);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost:3000");
    const code = url.searchParams.get("code");

    if (!code) {
      res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Serveur OAuth prêt. Retourne au terminal.");
      return;
    }

    const { tokens } = await auth.getToken(code);
    auth.setCredentials(tokens);

    fs.writeFileSync("token.json", JSON.stringify(tokens, null, 2));

    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Authentification réussie. Tu peux fermer cette page.");

    server.close();

    await markAllUnreadAsRead();
  } catch (err) {
    console.error("Erreur OAuth:", err);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Erreur pendant l'authentification.");
    server.close();
  }
});

server.listen(3000, () => {
  const authUrl = auth.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/gmail.modify"],
    prompt: "consent",
  });

  console.log("Ouvre ce lien dans ton navigateur :");
  console.log(authUrl);
});