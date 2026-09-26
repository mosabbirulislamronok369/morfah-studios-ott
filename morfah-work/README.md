# Morfah Studios OTT

Morfah OTT is a catalog/showcase. Telegram is the video delivery layer.

## Architecture

`Telegram channel -> Telegram user` for video playback/download.

Morfah only stores metadata in Cloudflare D1 and serves the catalog UI. The Worker never calls Telegram `getFile`, never downloads a video, and never proxies a Telegram file.

## Automatic publishing

Upload a video to the private Morfah Studios Telegram channel with this caption format:

```text
MORFAH
Series: Dark Boys: Encore
Episode: 02
Title: Dark Boys: Encore Episode - 02
```

Optional first-time series metadata:

```text
MORFAH
Series: My New Series
Episode: 01
Title: My New Series Episode - 01
Year: 2026
Genre: Drama, Mystery
Poster: https://example.com/poster.jpg
Backdrop: https://example.com/backdrop.jpg
Description: Short series description.
```

The webhook creates/updates the series and episode in D1 and uses the Telegram message URL as the Watch link. Episode count is automatically `COUNT(episodes)`.

## Deploy to Cloudflare

1. Create a D1 database named `morfah-ott-db`.
2. Put its database ID into `wrangler.jsonc`.
3. Install dependencies: `npm install`.
4. Run `npx wrangler d1 migrations apply morfah-ott-db --remote`.
5. Build the frontend: `npm run build`.
6. Set Cloudflare Worker secrets:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
7. Deploy: `npx wrangler deploy`.
8. Make sure the existing Telegram bot is an administrator of the private Morfah Studios channel.
9. Set the webhook:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_DOMAIN/api/telegram/webhook" \
  -d "secret_token=YOUR_WEBHOOK_SECRET" \
  -d "allowed_updates=[\"channel_post\"]"
```

Check it with:

```bash
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/getWebhookInfo"
```

## Important

Do not put `TELEGRAM_BOT_TOKEN` in GitHub, `NEXT_PUBLIC_*`, or frontend code. Use Cloudflare Worker secrets.
