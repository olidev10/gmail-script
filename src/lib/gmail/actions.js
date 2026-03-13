const { google } = require("googleapis");

async function markAllUnreadAsRead(auth) {
  const gmail = google.gmail({ version: "v1", auth });
  let nextPageToken;
  let total = 0;

  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: "is:unread",
      maxResults: 100,
      pageToken: nextPageToken,
    });

    const messages = response.data.messages || [];

    for (const message of messages) {
      await gmail.users.messages.modify({
        userId: "me",
        id: message.id,
        requestBody: {
          removeLabelIds: ["UNREAD"],
        },
      });
      total += 1;
    }

    nextPageToken = response.data.nextPageToken;
  } while (nextPageToken);

  return total;
}

module.exports = {
  markAllUnreadAsRead,
};
