const { ensureAgentLoaded, isAgentLoaded } = require("./launchAgent");
const { normalizeIntervalSeconds, writeAgentConfig } = require("./agentConfig");

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
