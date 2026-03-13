const fs = require("fs");
const { listPendingFiles } = require("../lib/scheduler/pendingMails");
const { disableAgentIfIdle } = require("../lib/scheduler/launchAgent");
const { parseArgs } = require("../lib/shared/cli");

function readJob(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const recipient = String(args.to || "").trim().toLowerCase();
    const removeAll = Boolean(args.all);

    if ((recipient && removeAll) || (!recipient && !removeAll)) {
      throw new Error(
        "Usage: node cancelPendingMails.js --to recipient@example.com | --all"
      );
    }

    const pendingFiles = listPendingFiles();
    let removed = 0;

    for (const filePath of pendingFiles) {
      const job = readJob(filePath);
      if (
        !removeAll &&
        String(job.to || "").trim().toLowerCase() !== recipient
      ) {
        continue;
      }

      fs.unlinkSync(filePath);
      removed += 1;
    }

    const unloaded = disableAgentIfIdle();

    if (removeAll) {
      console.log("Filter: all pending mails");
    } else {
      console.log(`Recipient: ${recipient}`);
    }
    console.log(`Pending mails removed: ${removed}`);

    if (unloaded) {
      console.log("No pending mails left. Agent launchd disabled.");
    }
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

main();
