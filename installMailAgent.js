const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const { JOB_ROOT, ensureDirectories } = require("./processPendingMails");

const PROJECT_DIR = __dirname;
const PROCESSOR_SCRIPT_PATH = path.join(PROJECT_DIR, "processPendingMails.js");
const LOG_DIR = path.join(JOB_ROOT, "logs");
const LAUNCH_AGENTS_DIR = path.join(os.homedir(), "Library", "LaunchAgents");
const PLIST_LABEL = "com.verdoyant.gmail-script.pending-mails";

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function ensureSchedulerDirectories() {
  ensureDirectories();
  fs.mkdirSync(LOG_DIR, { recursive: true });
  fs.mkdirSync(LAUNCH_AGENTS_DIR, { recursive: true });
}

function buildPlist({ stdoutPath, stderrPath }) {
  const programArguments = [process.execPath, PROCESSOR_SCRIPT_PATH]
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
  return { plistPath };
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
    ensureSchedulerDirectories();
    const { plistPath } = writeLaunchAgent();
    loadLaunchAgent(plistPath);
    kickLaunchAgent();

    console.log("Agent launchd installe.");
    console.log(`Fichier launchd : ${plistPath}`);
    console.log(`Label launchd : ${PLIST_LABEL}`);
    console.log(
      "Les mails en attente seront verifies toutes les 60 secondes et au prochain login."
    );
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

main();
