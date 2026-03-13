const fs = require("fs");
const path = require("path");
const { authorize, loadCredentials, sendMail } = require("./gmailClient");
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

function loadMailFile(filePath) {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Fichier introuvable: ${absolutePath}`);
  }

  const content = JSON.parse(fs.readFileSync(absolutePath, "utf8"));

  if (!content.to || !content.subject || !content.body) {
    throw new Error(
      "Le fichier JSON doit contenir 'to', 'subject' et 'body'."
    );
  }

  let scheduledDate = null;
  if (content.scheduledAt) {
    scheduledDate = new Date(content.scheduledAt);

    if (Number.isNaN(scheduledDate.getTime())) {
      throw new Error(
        "scheduledAt doit etre une date valide, par exemple 2026-03-20T10:35:00+01:00"
      );
    }
  }

  return {
    absolutePath,
    mail: {
      to: content.to,
      subject: content.subject,
      body: content.body,
      scheduledAt: content.scheduledAt || null,
    },
    scheduledDate,
  };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const filePath = args.file || args.f || "mail.json";
    const { absolutePath, mail, scheduledDate } = loadMailFile(filePath);

    if (!scheduledDate || scheduledDate.getTime() <= Date.now()) {
      const auth = await authorize(loadCredentials());
      await sendMail(auth, mail);

      console.log(`Mail envoye a ${mail.to}`);
      console.log(`Source: ${absolutePath}`);
      if (scheduledDate) {
        console.log(
          `"scheduledAt" est dans le passe, donc envoi immediat: ${formatLocalDate(
            scheduledDate
          )}`
        );
      } else {
        console.log("Aucune date planifiee, donc envoi immediat.");
      }
      return;
    }

    const { job } = createJob({
      to: mail.to,
      subject: mail.subject,
      body: mail.body,
      at: scheduledDate.toISOString(),
    });
    ensureAgentLoaded();

    console.log("Mail ajoute a la file locale.");
    console.log(`Source: ${absolutePath}`);
    console.log(`Date prevue (locale) : ${formatLocalDate(scheduledDate)}`);
    console.log(`Date prevue (ISO) : ${scheduledDate.toISOString()}`);
    console.log(`Job ID : ${job.id}`);
    console.log("Agent launchd active automatiquement car un mail est en attente.");
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

main();
