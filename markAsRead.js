const { authorize, loadCredentials } = require("./gmailClient");
const { markAllUnreadAsRead } = require("./gmailActions");

async function main() {
  try {
    const auth = await authorize(loadCredentials());
    const total = await markAllUnreadAsRead(auth);
    console.log(`${total} mails marques comme lus.`);
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

main();
