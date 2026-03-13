# Gmail Script

This project is now organized by topic:

```text
gmail-script/
├── data/
│   ├── examples/
│   ├── gmail/
│   └── scheduled-mails/
├── public/
├── src/
│   ├── cli/
│   ├── lib/
│   │   ├── gmail/
│   │   ├── scheduler/
│   │   └── shared/
│   └── server/
└── package.json
```

## JSON files

Runtime JSON files are no longer stored at the project root.

- Gmail credentials: `data/gmail/credentials.json`
- Gmail token: `data/gmail/token.json`
- Scheduled mail queue: `data/scheduled-mails/`
- Example mail JSON: `data/examples/mail.example.json`
- Example Google credentials JSON: `data/examples/credentials.example.json`

Legacy root files like `credentials.json` and `token.json` are still read if they already exist, but all new writes now go to `data/gmail/`.

## Main commands

```bash
npm run dashboard
npm run mark-read
npm run send-mail -- --to recipient@example.com --subject "Hello" --body "Message"
npm run schedule-mail -- --to recipient@example.com --subject "Hello" --body "Message" --at "2026-03-20T10:35:00+01:00"
npm run run-mail-json -- --file data/mail.json
npm run mail-status
```

## Notes

- Put your Google OAuth file in `data/gmail/credentials.json`
- The first authenticated send creates `data/gmail/token.json`
- The dashboard is served from `src/server/dashboardServer.js`
