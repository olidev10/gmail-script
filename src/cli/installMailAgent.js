const {
  ensureAgentLoaded,
  PLIST_LABEL,
  PLIST_PATH,
} = require("../lib/scheduler/launchAgent");
const { readAgentConfig } = require("../lib/scheduler/agentConfig");

function main() {
  try {
    ensureAgentLoaded();
    const { intervalSeconds } = readAgentConfig();

    console.log("Agent launchd installe.");
    console.log(`Fichier launchd : ${PLIST_PATH}`);
    console.log(`Label launchd : ${PLIST_LABEL}`);
    console.log(
      `Les mails en attente seront verifies toutes les ${intervalSeconds} secondes et au prochain login.`
    );
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

main();
