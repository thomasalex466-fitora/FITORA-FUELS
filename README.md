# Fitora Fuels Cafe Accounts

This is a standalone browser app for Fitora Fuels Cafe expense, income, reporting, and backup records.

## Open the app

Open `index.html` in a browser. No installation is required.

## Install on Android and iPhone

This app is now set up as a Progressive Web App with the Fitora logo as its mobile icon.

To install on mobile, the app must be opened from an HTTPS website. A local `file://` link works for desktop testing, but mobile browsers will not install it as an app from `file://`.

1. Upload this folder to an HTTPS host such as GitHub Pages, Netlify, Vercel, or your own website.
2. Android: open the hosted link in Chrome, tap the browser menu, then choose Install app or Add to Home screen.
3. iPhone/iPad: open the hosted link in Safari, tap Share, then choose Add to Home Screen.

Each phone stores its own data in that browser/app install. Use the Backup tab to download a backup from one device and import it on another device when needed.

## What it does

- Expense tab: add a voucher with one date, one voucher number, cash or UPI payment mode, and multiple expense lines.
- Income tab: save daily cash received and UPI received.
- Report tab: view date wise cash and UPI expenses, cash and UPI income, and the balance for each mode.
- Backup tab: save a backup email ID, download a JSON backup, generate an email message file, open an email draft, and import a backup.

## Storage and email backup

The app stores data in the browser's local storage. Use the Backup tab regularly to download a JSON backup.

Because this is a local static app, it cannot silently send email by itself. The Backup tab creates files and email drafts that can be sent to the saved email ID. Fully automatic email backup can be added later after hosting the app with an SMTP or email-service account.
