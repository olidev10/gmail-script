const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "../../..");
const SRC_DIR = path.join(ROOT_DIR, "src");
const DATA_DIR = path.join(ROOT_DIR, "data");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");
const GMAIL_DATA_DIR = path.join(DATA_DIR, "gmail");
const EXAMPLES_DIR = path.join(DATA_DIR, "examples");
const SCHEDULED_MAILS_DIR = path.join(DATA_DIR, "scheduled-mails");

module.exports = {
  ROOT_DIR,
  SRC_DIR,
  DATA_DIR,
  PUBLIC_DIR,
  GMAIL_DATA_DIR,
  EXAMPLES_DIR,
  SCHEDULED_MAILS_DIR,
};
