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

module.exports = {
  parseArgs,
};
