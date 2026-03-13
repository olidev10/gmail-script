const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const {
  CREDENTIALS_PATH,
  TOKEN_PATH,
} = require("./gmailClient");
const {
  JOB_ROOT,
  createJob,
  ensureDirectories,
} = require("./processPendingMails");

const PROJECT_DIR = __dirname;
const PROCESSOR_SCRIPT_PATH = path.join(PROJECT_DIR, "processPendingMails.js");
const LOG_DIR = path.join(JOB_ROOT, "logs");
const LAUNCH_AGENTS_DIR = path.join(os.homedir(), "Library", "LaunchAgents");
const PLIST_LABEL = "com.verdoyant.gmail-script.pending-mails";

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

function ensureSchedulerDirectories() {
  ensureDirectories();
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildPlist({ stdoutPath, stderrPath }) {
  const programArguments = [
    process.execPath,
    PROCESSOR_SCRIPT_PATH,
  ]
    .map((value) => `    <string>${escapeXml(String(value))}</string>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${escapeXml(PLIST_LABEL)}</string>
  <key>ProgramArguments</key>
  <array>
${programArguments}
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>StartInterval</key>
  <integer>60</integer>
  <key>WorkingDirectory</key>
  <string>${escapeXml(PROJECT_DIR)}</string>
  <key>StandardOutPath</key>
  <string>${escapeXml(stdoutPath)}</string>
  <key>StandardErrorPath</key>
  <string>${escapeXml(stderrPath)}</string>
</dict>
</plist>
`;
}

function writeLaunchAgent() {
  const plistPath = path.join(LAUNCH_AGENTS_DIR, `${PLIST_LABEL}.plist`);
  const stdoutPath = path.join(LOG_DIR, "processor.out.log");
  const stderrPath = path.join(LOG_DIR, "processor.err.log");
  const plist = buildPlist({ stdoutPath, stderrPath });

  fs.writeFileSync(plistPath, plist);

  return { plistPath, stdoutPath, stderrPath };
}

function loadLaunchAgent(plistPath) {
  try {
    execFileSync("launchctl", ["bootstrap", `gui/${process.getuid()}`, plistPath], {
      stdio: "pipe",
    });
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : "";
    if (!stderr.includes("already loaded")) {
      throw error;
    }
  }
}

function kickLaunchAgent() {
  execFileSync(
    "launchctl",
    ["kickstart", "-k", `gui/${process.getuid()}/${PLIST_LABEL}`],
    { stdio: "pipe" }
  );
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const scheduledDate = validateArgs(args);

    ensureSchedulerDirectories();

    const { job } = createJob({
      ...args,
      at: scheduledDate.toISOString(),
    });
    const files = writeLaunchAgent();
    loadLaunchAgent(files.plistPath);
    kickLaunchAgent();

    console.log("Mail ajoute a la file locale.");
    console.log(`Date prevue : ${scheduledDate.toString()}`);
    console.log(`Job ID : ${job.id}`);
    console.log(`Fichier launchd : ${files.plistPath}`);
    console.log(`Label launchd : ${PLIST_LABEL}`);
    console.log("Tu peux fermer le terminal.");
    console.log(
      "Si le Mac est allume et la session ouverte, le traitement verifie les mails toutes les 60 secondes."
    );
    console.log(
      "Si le Mac etait eteint a l'heure prevue, le mail sera envoye au prochain login, des que l'agent redemarre."
    );
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

main();
