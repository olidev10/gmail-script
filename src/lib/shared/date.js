function formatLocalDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);
}

module.exports = {
  formatLocalDate,
};
