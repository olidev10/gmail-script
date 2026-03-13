# Gmail Script

Local Gmail automation project with two ways to work:

- a dashboard UI built with HTML, CSS, and vanilla JavaScript
- a CLI toolkit for sending, scheduling, monitoring, and cleaning up Gmail actions

The project uses Google OAuth plus the Gmail API. It can:

- mark all unread mails as read
- send one mail immediately
- schedule one message for one or many future dates
- keep pending jobs in local JSON files
- process queued jobs automatically on macOS with `launchd`

## Project structure

```text
.
├── public/                      # Dashboard front-end assets
├── src/
│   ├── cli/                     # CLI entrypoints
│   ├── lib/gmail/               # Gmail auth and Gmail API helpers
│   ├── lib/scheduler/           # Pending job storage and macOS agent helpers
│   ├── lib/shared/              # Shared paths, date helpers, CLI parsing
│   └── server/                  # Local HTTP server for the dashboard UI
├── data/                        # Local runtime files (credentials, token, queued mails)
├── data-exemple/                # Commit-safe JSON examples for developers
├── credentials.example.json     # Example OAuth credential file
└── package.json                 # npm scripts and runtime dependencies
```

## Requirements

- Node.js
- A Google Cloud project with Gmail API enabled
- An OAuth client whose redirect URI matches `http://localhost:3000`
- macOS only if you want background scheduling through `launchd`

## Installation

```bash
npm install
```

## Gmail OAuth setup

1. Open the Google Cloud console.
2. Enable the Gmail API for your project.
3. Configure the OAuth consent screen.
4. Create an OAuth client ID.
5. Add `http://localhost:3000` as the redirect URI.
6. Save your credentials file as one of:

```text
data/gmail/credentials.json
credentials.json
```

Preferred location is `data/gmail/credentials.json`. The root-level fallback exists for backward compatibility.

## Runtime data locations

- `data/gmail/credentials.json`: Google OAuth client credentials
- `data/gmail/token.json`: saved Gmail OAuth token
- `data/mail.json`: optional local JSON input for `run-mail-json`
- `data/scheduled-mails/pending/`: queued jobs waiting to be sent
- `data/scheduled-mails/sent/`: successfully processed jobs
- `data/scheduled-mails/failed/`: failed jobs with error details
- `data/scheduled-mails/agent-config.json`: polling interval for the macOS agent

## Dashboard UI

Start the dashboard:

```bash
npm run dashboard
```

Then open:

```text
http://127.0.0.1:3000
```

Current dashboard needs:

1. Mark all unread mails as read
2. Schedule one email message on a list of future dates for the same recipient

Dashboard behavior:

- checks the token before every action
- asks the user to log in first when no Gmail token is available
- redirects through Google OAuth and stores the token locally
- creates one pending JSON job per scheduled date

## CLI usage

### 1. Mark all unread mails as read

```bash
npm run mark-read
```

This authenticates with Gmail if needed, lists all unread messages, and removes the `UNREAD` label. it can takes much times if many mails.

### 2. Send one mail now

```bash
npm run send-mail -- --to recipient@example.com --subject "Hello" --body "My message"
```

### 3. Send one mail later while keeping the terminal open

```bash
npm run send-mail -- --to recipient@example.com --subject "Reminder" --body "My message" --at "2026-03-20T10:35:00+01:00"
```

This mode waits in the current Node process until the target time, then sends the message.

### 4. Schedule one mail into the local queue

```bash
npm run schedule-mail -- --to recipient@example.com --subject "Reminder" --body "Queued message" --at "2026-03-20T10:35:00+01:00"
```

This creates a pending JSON file and ensures the macOS agent is active.

### 5. Send or queue from a JSON file

```bash
npm run run-mail-json -- --file data/mail.json
```

Expected JSON shape:

```json
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "This is my message.",
  "scheduledAt": "2026-03-20T10:35:00+01:00"
}
```

Rules:

- if `scheduledAt` is missing, the mail is sent immediately
- if `scheduledAt` is in the past, the mail is sent immediately
- if `scheduledAt` is in the future, the mail is queued

### 6. Process due pending mails

```bash
npm run process-pending-mails
```

This reads every job in `data/scheduled-mails/pending`, sends any job whose date is due, then moves it to `sent` or `failed`.

### 7. Install the macOS background agent

```bash
npm run install-mail-agent
```

The agent:

- runs on login
- polls the pending queue on an interval
- sends due mails automatically

### 8. Change the polling interval

```bash
npm run set-mail-agent-interval -- --seconds 30
```

### 9. Show scheduler status

```bash
npm run mail-status
```

This shows:

- whether the `launchd` agent is loaded
- the current polling interval
- how many mails are pending
- the next pending job, if any

### 10. Cancel pending mails

Cancel every queued mail for one recipient:

```bash
npm run cancel-pending-mails -- --to recipient@example.com
```

Cancel all queued mails:

```bash
npm run cancel-pending-mails -- --all
```

## JSON files explained

Because JSON does not support true comments, the example JSON files in this repository use extra metadata keys such as `_comment` and `_notes`. The scripts ignore those keys where it is safe to do so, and they help GitHub readers understand the file format quickly.

Documented JSON examples:

- `credentials.example.json`: OAuth credential structure expected by the Gmail client
- `data-exemple/mail.example.json`: input format for `run-mail-json`
- `data-exemple/gmail/token.exemple.json`: example saved OAuth token
- `data-exemple/scheduled-mails/agent-config.exemple.json`: scheduler polling configuration
- `data-exemple/scheduled-mails/pending/*.json`: pending job format
- `data-exemple/scheduled-mails/sent/*.json`: successful archived job format

Special cases:

- `package.json` is documented with an `x-docs` block because npm tolerates custom fields.
- `package-lock.json` is generated by npm and should not be manually documented or edited.

## Typical workflows

### First-time setup for the dashboard

1. Put Google credentials in `data/gmail/credentials.json`.
2. Run `npm install`.
3. Run `npm run dashboard`.
4. Click the Gmail login button.
5. Use the UI to run actions.

### Schedule many sends for one recipient

1. Start the dashboard.
2. Log in with Gmail.
3. Select the scheduling need.
4. Enter one recipient, one subject, and one message.
5. Add several future dates.
6. Submit the form.
7. Keep the macOS agent installed if you want background delivery.

### CLI-only workflow

1. Run a Gmail command such as `npm run send-mail -- --to ...`.
2. Complete Google OAuth on first use.
3. Reuse the saved token for future commands.

## Notes for developers

- `src/lib/gmail/client.js` is the shared Gmail auth layer.
- `src/lib/gmail/actions.js` contains Gmail mailbox actions such as mark-as-read.
- `src/lib/scheduler/pendingMails.js` owns queue creation, queue scanning, and job archiving.
- `src/server/dashboardServer.js` exposes local JSON endpoints used by the front-end.
- `public/app.js` handles the dashboard interaction logic and token checks before actions.

## Security notes

- Never commit a real `token.json`.
- Never commit a real `credentials.json` unless you intentionally want it public.
- The committed `data-exemple/` files are safe examples only.
