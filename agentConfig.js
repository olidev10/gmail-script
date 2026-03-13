const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, ".scheduled-mails", "agent-config.json");
const DEFAULT_INTERVAL_SECONDS = 5;

function ensureConfigDirectory() {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
}

function normalizeIntervalSeconds(value) {
  const seconds = Number(value);

  if (!Number.isInteger(seconds) || seconds <= 0) {
    throw new Error("Le polling interval doit etre un entier positif en secondes.");
  }

  return seconds;
}

function readAgentConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    return { intervalSeconds: DEFAULT_INTERVAL_SECONDS };
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  return {
    intervalSeconds: normalizeIntervalSeconds(
      config.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS
    ),
  };
}

function writeAgentConfig(config) {
  ensureConfigDirectory();
  const normalized = {
    intervalSeconds: normalizeIntervalSeconds(config.intervalSeconds),
  };

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(normalized, null, 2));
  return normalized;
}

module.exports = {
  CONFIG_PATH,
  DEFAULT_INTERVAL_SECONDS,
  normalizeIntervalSeconds,
  readAgentConfig,
  writeAgentConfig,
};
