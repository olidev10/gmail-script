const fs = require("fs");
const { CREDENTIALS_PATH, TOKEN_PATH } = require("./gmailClient");
const { createJob } = require("./processPendingMails");
const { ensureAgentLoaded } = require("./launchAgent");

function formatLocalDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);
}

function parseArgs(argv) {
  const args = {};

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];

    if (!current.startsWith("--")) {
      continue;
    }

    const key = current.slice(2);
    const value = argv[i + 1];

    if (!value || value.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = value;
    i += 1;
  }

  return args;
}

function validateArgs(args) {
  if (!args.to || !args.subject || !args.body || !args.at) {
    throw new Error(
      "Usage: node scheduleMailLaunchd.js --to email@example.com --subject \"Sujet\" --body \"Message\" --at \"2026-03-20T10:35:00+01:00\""
    );
  }

  const scheduledDate = new Date(args.at);

  if (Number.isNaN(scheduledDate.getTime())) {
    throw new Error(
      "--at doit etre une date valide, par exemple 2026-03-20T10:35:00+01:00"
    );
  }

  if (scheduledDate.getTime() <= Date.now()) {
    throw new Error("--at doit etre dans le futur.");
  }

  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error("credentials.json est introuvable.");
  }

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(
      "token.json est introuvable. Lance d'abord sendScheduledMail.js une premiere fois pour autoriser Gmail."
    );
  }

  return scheduledDate;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const scheduledDate = validateArgs(args);

    const { job } = createJob({
      ...args,
      at: scheduledDate.toISOString(),
    });
    ensureAgentLoaded();

    console.log("Mail ajoute a la file locale.");
    console.log(`Date prevue (locale) : ${formatLocalDate(scheduledDate)}`);
    console.log(`Date prevue (ISO) : ${scheduledDate.toISOString()}`);
    console.log(`Job ID : ${job.id}`);
    console.log("Tu peux fermer le terminal.");
    console.log("Agent launchd active automatiquement car un mail est en attente.");
    console.log(
      "Si le Mac etait eteint a l'heure prevue, le mail sera envoye au prochain login si l'agent est installe."
    );
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

main();
