const { ensureAgentLoaded, PLIST_LABEL, PLIST_PATH } = require("./launchAgent");

function main() {
  try {
    ensureAgentLoaded();

    console.log("Agent launchd installe.");
    console.log(`Fichier launchd : ${PLIST_PATH}`);
    console.log(`Label launchd : ${PLIST_LABEL}`);
    console.log(
      "Les mails en attente seront verifies toutes les 5 secondes et au prochain login."
    );
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

main();
