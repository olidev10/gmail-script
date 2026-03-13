const {
  listPendingFiles,
  listPendingJobs,
} = require("../lib/scheduler/pendingMails");
const {
  isAgentLoaded,
  PLIST_LABEL,
} = require("../lib/scheduler/launchAgent");
const { readAgentConfig } = require("../lib/scheduler/agentConfig");
const { formatLocalDate } = require("../lib/shared/date");

function main() {
  const pendingCount = listPendingFiles().length;
  const agentLoaded = isAgentLoaded();
  const nextJob = listPendingJobs()[0] || null;
  const { intervalSeconds } = readAgentConfig();

  console.log(`Agent loaded: ${agentLoaded ? "yes" : "no"}`);
  console.log(`Agent label: ${PLIST_LABEL}`);
  console.log(`Polling interval: ${intervalSeconds}s`);
  console.log(`Pending mails: ${pendingCount}`);

  if (nextJob) {
    const nextDate = new Date(nextJob.at);
    console.log(`Next send (local): ${formatLocalDate(nextDate)}`);
    console.log(`Next send (ISO): ${nextDate.toISOString()}`);
    console.log(`Next job ID: ${nextJob.id}`);
    console.log(`Next recipient: ${nextJob.to}`);
  } else {
    console.log("Next send: none");
  }
}

main();
