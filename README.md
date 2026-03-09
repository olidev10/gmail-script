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
