const { listPendingFiles, listPendingJobs } = require("./processPendingMails");
const { isAgentLoaded, PLIST_LABEL } = require("./launchAgent");

function formatLocalDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);
}

function main() {
  const pendingCount = listPendingFiles().length;
  const agentLoaded = isAgentLoaded();
  const nextJob = listPendingJobs()[0] || null;

  console.log(`Agent loaded: ${agentLoaded ? "yes" : "no"}`);
  console.log(`Agent label: ${PLIST_LABEL}`);
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
