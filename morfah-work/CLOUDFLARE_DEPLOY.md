# Morfah OTT — GitHub + Cloudflare deployment

## 1. GitHub

Push this project to a private/public GitHub repository. Do **not** commit:

- `.env.local`
- `.dev.vars`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

## 2. Cloudflare D1

Create a D1 database named:

```text
morfah-ott-db
```

Copy its database ID into `wrangler.jsonc` in place of:

```text
REPLACE_WITH_YOUR_D1_DATABASE_ID
```

Then run:

```bash
npm install
npm run cf:migrate
```

The migration creates the series/episode tables and seeds `Dark Boys: Encore — Episode 01` with the current Telegram message:

```text
https://t.me/c/4427906462/3
```

## 3. Cloudflare secrets

Set these as Worker secrets, not GitHub variables and not frontend variables:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_WEBHOOK_SECRET
```

You can use:

```bash
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
```

## 4. Deploy

```bash
npm run cf:deploy
```

## 5. Telegram webhook

After deployment, set the webhook:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_DOMAIN/api/telegram/webhook" \
  -d "secret_token=YOUR_WEBHOOK_SECRET" \
  -d 'allowed_updates=["channel_post"]'
```

Verify:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

## 6. Daily workflow

Upload directly to the private Telegram channel:

```text
MORFAH
Series: Dark Boys: Encore
Episode: 02
Title: Dark Boys: Encore Episode - 02
```

The OTT then automatically gets Episode 02. No GitHub commit is required for each new episode.

For a brand-new series, include optional metadata:

```text
MORFAH
Series: New Series
Episode: 01
Title: New Series Episode - 01
Year: 2026
Genre: Drama, Mystery
Poster: https://...
Backdrop: https://...
Description: ...
```

## 7. Video-bandwidth rule

The Worker never calls Telegram `getFile`. It receives only the Telegram update metadata, builds the message URL, and stores metadata in D1. Playback remains Telegram -> user.
