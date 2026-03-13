const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const {
  authorize,
  loadCredentials,
  loadSavedToken,
  sendMail,
  TOKEN_PATH,
} = require("./gmailClient");

const JOB_ROOT = path.join(__dirname, ".scheduled-mails");
const PENDING_DIR = path.join(JOB_ROOT, "pending");
const SENT_DIR = path.join(JOB_ROOT, "sent");
const FAILED_DIR = path.join(JOB_ROOT, "failed");

function ensureDirectories() {
  fs.mkdirSync(PENDING_DIR, { recursive: true });
  fs.mkdirSync(SENT_DIR, { recursive: true });
  fs.mkdirSync(FAILED_DIR, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
}

function listPendingFiles() {
  if (!fs.existsSync(PENDING_DIR)) {
    return [];
  }

  return fs
    .readdirSync(PENDING_DIR)
    .filter((file) => file.endsWith(".json"))
    .map((file) => path.join(PENDING_DIR, file))
    .sort();
}

function makeArchivePath(baseDir, job) {
  return path.join(baseDir, `${job.id}.json`);
}

function normalizeError(error) {
  if (!error) {
    return "Unknown error";
  }

  if (error.response && error.response.data) {
    return JSON.stringify(error.response.data);
  }

  return error.message || String(error);
}

function needsRefreshTokenWarning(token) {
  return Boolean(
    token &&
      typeof token.refresh_token_expires_in === "number" &&
      token.refresh_token_expires_in <= 7 * 24 * 60 * 60
  );
}

async function processDueMails() {
  ensureDirectories();

  const pendingFiles = listPendingFiles();

  if (pendingFiles.length === 0) {
    return { sent: 0, failed: 0, skipped: 0 };
  }

  const token = loadSavedToken();
  if (!token) {
    throw new Error(
      `${TOKEN_PATH} est introuvable. Lance d'abord sendScheduledMail.js pour autoriser Gmail.`
    );
  }

  const auth = await authorize(loadCredentials());
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const filePath of pendingFiles) {
    const job = readJson(filePath);
    const scheduledTime = new Date(job.at).getTime();

    if (Number.isNaN(scheduledTime)) {
      writeJson(makeArchivePath(FAILED_DIR, job), {
        ...job,
        failedAt: new Date().toISOString(),
        error: "Date invalide dans le job planifie.",
      });
      fs.unlinkSync(filePath);
      failed += 1;
      continue;
    }

    if (scheduledTime > Date.now()) {
      skipped += 1;
      continue;
    }

    try {
      await sendMail(auth, {
        to: job.to,
        subject: job.subject,
        body: job.body,
      });

      writeJson(makeArchivePath(SENT_DIR, job), {
        ...job,
        sentAt: new Date().toISOString(),
      });
      fs.unlinkSync(filePath);
      sent += 1;
    } catch (error) {
      writeJson(makeArchivePath(FAILED_DIR, job), {
        ...job,
        failedAt: new Date().toISOString(),
        error: normalizeError(error),
      });
      fs.unlinkSync(filePath);
      failed += 1;
    }
  }

  return {
    sent,
    failed,
    skipped,
    refreshTokenWarning: needsRefreshTokenWarning(token),
  };
}

function createJob(args) {
  ensureDirectories();

  const timestamp = new Date(args.at).toISOString();
  const id = `mail-${timestamp.replace(/[:.]/g, "-")}-${crypto
    .randomBytes(3)
    .toString("hex")}`;
  const filePath = path.join(PENDING_DIR, `${id}.json`);
  const job = {
    id,
    to: args.to,
    subject: args.subject,
    body: args.body,
    at: args.at,
    createdAt: new Date().toISOString(),
  };

  writeJson(filePath, job);
  return { job, filePath };
}

async function main() {
  try {
    const result = await processDueMails();
    console.log(
      `Traitement termine. Envoyes: ${result.sent}, en echec: ${result.failed}, en attente: ${result.skipped}`
    );

    const { disableAgentIfIdle } = require("./launchAgent");
    const unloaded = disableAgentIfIdle();
    if (unloaded) {
      console.log("Aucun mail en attente. Agent launchd desactive.");
    }

    if (result.refreshTokenWarning) {
      console.log(
        "Attention: le refresh token actuel semble limite dans le temps. Un mail programme tres loin dans le futur pourrait echouer si tu ne reautorises pas Gmail avant."
      );
    }
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  JOB_ROOT,
  PENDING_DIR,
  SENT_DIR,
  FAILED_DIR,
  createJob,
  ensureDirectories,
  listPendingFiles,
  processDueMails,
};
