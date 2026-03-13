const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFileSync } = require("child_process");
const { JOB_ROOT, ensureDirectories, listPendingFiles } = require("./processPendingMails");
const { readAgentConfig } = require("./agentConfig");

const PROJECT_DIR = __dirname;
const PROCESSOR_SCRIPT_PATH = path.join(PROJECT_DIR, "processPendingMails.js");
const LOG_DIR = path.join(JOB_ROOT, "logs");
const LAUNCH_AGENTS_DIR = path.join(os.homedir(), "Library", "LaunchAgents");
const PLIST_LABEL = "com.verdoyant.gmail-script.pending-mails";
const PLIST_PATH = path.join(LAUNCH_AGENTS_DIR, `${PLIST_LABEL}.plist`);

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

function buildPlist() {
  const stdoutPath = path.join(LOG_DIR, "processor.out.log");
  const stderrPath = path.join(LOG_DIR, "processor.err.log");
  const { intervalSeconds } = readAgentConfig();
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
  <integer>${intervalSeconds}</integer>
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
  ensureSchedulerDirectories();
  fs.writeFileSync(PLIST_PATH, buildPlist());
  return { plistPath: PLIST_PATH };
}

function bootstrapLaunchAgent(plistPath = PLIST_PATH) {
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

function bootoutLaunchAgent() {
  try {
    execFileSync(
      "launchctl",
      ["bootout", `gui/${process.getuid()}/${PLIST_LABEL}`],
      { stdio: "pipe" }
    );
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : "";
    if (
      !stderr.includes("Could not find service") &&
      !stderr.includes("No such process") &&
      !stderr.includes("service not found")
    ) {
      throw error;
    }
  }
}

function ensureAgentLoaded() {
  const { plistPath } = writeLaunchAgent();
  bootoutLaunchAgent();
  bootstrapLaunchAgent(plistPath);
  kickLaunchAgent();
}

function isAgentLoaded() {
  try {
    execFileSync(
      "launchctl",
      ["print", `gui/${process.getuid()}/${PLIST_LABEL}`],
      { stdio: "pipe" }
    );
    return true;
  } catch (error) {
    const stderr = error.stderr ? error.stderr.toString() : "";
    if (
      stderr.includes("Could not find service") ||
      stderr.includes("service not found") ||
      stderr.includes("not found")
    ) {
      return false;
    }

    throw error;
  }
}

function disableAgentIfIdle() {
  if (listPendingFiles().length > 0) {
    return false;
  }

  bootoutLaunchAgent();
  return true;
}

module.exports = {
  PLIST_LABEL,
  PLIST_PATH,
  bootoutLaunchAgent,
  buildPlist,
  disableAgentIfIdle,
  ensureAgentLoaded,
  ensureSchedulerDirectories,
  isAgentLoaded,
  writeLaunchAgent,
};
