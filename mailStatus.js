const { listPendingFiles } = require("./processPendingMails");
const { isAgentLoaded, PLIST_LABEL } = require("./launchAgent");
const fs = require("fs");

function formatLocalDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);
}

function loadJob(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getNextPendingJob() {
  const jobs = listPendingFiles()
    .map((filePath) => ({ filePath, job: loadJob(filePath) }))
    .filter(({ job }) => job && job.at)
    .sort((a, b) => new Date(a.job.at).getTime() - new Date(b.job.at).getTime());

  return jobs.length > 0 ? jobs[0].job : null;
}

function main() {
  const pendingCount = listPendingFiles().length;
  const agentLoaded = isAgentLoaded();
  const nextJob = getNextPendingJob();

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
