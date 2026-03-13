const {
  ensureAgentLoaded,
  isAgentLoaded,
} = require("../lib/scheduler/launchAgent");
const {
  normalizeIntervalSeconds,
  writeAgentConfig,
} = require("../lib/scheduler/agentConfig");
const { parseArgs } = require("../lib/shared/cli");

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const seconds = normalizeIntervalSeconds(args.seconds);
    const config = writeAgentConfig({ intervalSeconds: seconds });

    if (isAgentLoaded()) {
      ensureAgentLoaded();
      console.log(
        `Polling interval updated to ${config.intervalSeconds}s and launchd agent reloaded.`
      );
      return;
    }

    console.log(
      `Polling interval updated to ${config.intervalSeconds}s. The new value will apply the next time the agent is loaded.`
    );
  } catch (error) {
    console.error("Erreur:", error.message);
    process.exitCode = 1;
  }
}

main();
