const { authorize, loadCredentials, sendMail } = require("./gmailClient");

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
  if (!args.to || !args.subject || !args.body) {
    throw new Error(
      "Usage: node sendScheduledMail.js --to email@example.com --subject \"Sujet\" --body \"Message\" [--at \"2026-03-13T18:30:00+01:00\"]"
    );
  }

  if (!args.at) {
    return null;
  }

  const scheduledDate = new Date(args.at);

  if (Number.isNaN(scheduledDate.getTime())) {
    throw new Error(
      "--at doit etre une date valide, par exemple 2026-03-13T18:30:00+01:00"
    );
  }

  return scheduledDate;
}

async function waitUntil(targetDate) {
  const waitMs = targetDate.getTime() - Date.now();

  if (waitMs <= 0) {
    return;
  }

  console.log(`Mail programme pour ${targetDate.toString()}`);

  await new Promise((resolve) => {
    setTimeout(resolve, waitMs);
  });
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const scheduledDate = validateArgs(args);
    const auth = await authorize(loadCredentials());

    if (scheduledDate) {
      await waitUntil(scheduledDate);
    }

    await sendMail(auth, {
      to: args.to,
      subject: args.subject,
      body: args.body,
    });

    console.log(`Mail envoye a ${args.to}`);
  } catch (error) {
    console.error("Erreur:", error.message);

    if (
      error &&
      error.response &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.status === "PERMISSION_DENIED"
    ) {
      console.error(
        "Supprime token.json puis relance le script pour redemander la permission Gmail d'envoi."
      );
    }

    process.exitCode = 1;
  }
}

main();
