# Gmail – Mark All Unread Emails as Read

A small **Node.js** script that uses the API of **Gmail** to automatically mark all unread emails as read.

Authentication is handled via OAuth using **Google Cloud**.

---

# 1. Prerequisites

Install **Node.js**.

Check installation:

```bash
node -v
npm -v
```

---

# 2. Create a Google Cloud Project

1. Go to https://console.cloud.google.com
2. Create a new project
3. Navigate to **APIs & Services → Library**
4. Search for **Gmail API**
5. Click **Enable**

---

# 3. Configure the OAuth Consent Screen

1. Go to **OAuth consent screen**
2. Select **External**
3. Add your email address under **Test users**
4. Save the configuration

---

# 4. Create OAuth Credentials

1. Go to **Credentials**
2. Click **Create credentials**
3. Select **OAuth Client ID**
4. Choose **Web application**

Add the following redirect URI:

```
http://localhost:3000
```

Download the generated file:

```
credentials.json
```

Place this file in the root of your project directory.

---

# 5. Initialize the Node Project

Create a new project folder:

```bash
mkdir gmail-script
cd gmail-script
npm init -y
```

Install the Google API client library:

```bash
npm install googleapis
```

---

# 6. Add the Script

Create a file named:

```
markAsRead.js
```

This script will:

* start a local server
* receive the OAuth authorization code
* exchange the code for an access token
* fetch emails matching `is:unread`
* remove the `UNREAD` label from them

---

# 7. Run the Script

```bash
node markAsRead.js
```

Workflow:

1. The script prints an authentication URL
2. You log in with your Gmail account
3. Google redirects to `http://localhost:3000`
4. The script captures the OAuth token
5. All unread emails are marked as read

---

# 8. Generated Files

After the first authentication:

```
credentials.json
token.json
```

* `credentials.json` → OAuth client credentials
* `token.json` → saved access token

---

# Result

The script:

* retrieves all emails matching `is:unread`
* removes the `UNREAD` label
* marks them as read automatically

---

# Possible Improvements

* automatically delete specific emails
* archive newsletters
* mark emails from specific senders as read
* automate execution with a cron job

---

# Gmail - Send A Scheduled Email

This project now also includes:

```
sendScheduledMail.js
```

This script sends an email through Gmail and can wait until a scheduled date/time before sending it.

## Run It

Immediate send:

```bash
node sendScheduledMail.js --to recipient@example.com --subject "Hello" --body "This email was sent by the script."
```

Scheduled send:

```bash
node sendScheduledMail.js --to recipient@example.com --subject "Reminder" --body "This will be sent later." --at "2026-03-13T18:30:00+01:00"
```

You can also use the npm shortcut:

```bash
npm run send-mail -- --to recipient@example.com --subject "Hello" --body "This email was sent by the script."
```

## Authentication

On the first run, the script:

1. prints a Google OAuth URL
2. asks you to sign in
3. saves the token in `token.json`

If `token.json` was created by the read-only script and sending fails with a permission error, delete `token.json` and run the sender again so Google can grant the `gmail.send` permission.

## Important Note About Scheduling

The `--at` option keeps the Node.js process running until the target time, then sends the email.

So if you want the email to go out later, you must keep the terminal session alive until that moment.

For fully automatic recurring delivery, run this script with:

* `cron` on macOS/Linux
* Task Scheduler on Windows

## Send Later And Close The Terminal On macOS

If you want to schedule an email for later and close the terminal right away, use:

```bash
node scheduleMailLaunchd.js --to recipient@example.com --subject "Hello" --body "Sent later" --at "2026-03-20T10:35:00+01:00"
```

What this does:

* stores the mail in a local queue in `.scheduled-mails/pending`
* installs a macOS `launchd` agent in `~/Library/LaunchAgents`
* checks the queue every 60 seconds while you are logged in
* sends overdue mails on the next login if the Mac was off at the planned time
* lets you close the terminal as soon as the command finishes

Important:

* run `sendScheduledMail.js` once before this so `token.json` already exists
* the Mac must be powered on and your session logged in for the mail to send exactly on time
* if the Mac is off at the target time, the mail should send shortly after your next login

## Token Lifetime

If your `token.json` contains:

```json
"refresh_token_expires_in": 604799
```

that means the refresh token is valid for about 7 days.

If you schedule a mail very close to that limit, the send can fail if Google expires the refresh token before the queued job runs.

In that case, run `sendScheduledMail.js` again before the scheduled day to refresh the authorization.

## Use A JSON File

You can now prepare a file like:

```json
{
  "to": "recipient@example.com",
  "subject": "Hello",
  "body": "This is my message.",
  "scheduledAt": "2026-03-20T10:35:00+01:00"
}
```

Example file:

```bash
mail.example.json
```

Run it with:

```bash
node runMailJson.js --file mail.json
```

or:

```bash
npm run run-mail-json -- --file mail.json
```

Rules:

* if `scheduledAt` is missing, the mail is sent immediately
* if `scheduledAt` is in the future, the mail is added to the local queue
* if `scheduledAt` is in the past, the mail is sent immediately
* when queued, the script prints both the local date and the ISO timestamp so you can verify the exact send time

To process queued mails automatically while the terminal is closed, install the macOS agent once:

```bash
npm run install-mail-agent
```
