# Morfah Studios OTT

Morfah OTT is a catalog/showcase. Telegram is the video delivery layer.

## Automatic episode publishing

Upload a video to the private Morfah Studios Telegram channel with:

```text
MORFAH
Series: Dark Boys: Encore
Episode: 02
Title: Dark Boys: Encore Episode - 02
```

The Telegram bot sends the `channel_post` to the Cloudflare Worker webhook. The Worker validates the post, creates/updates the series, upserts the episode in D1, and the OTT immediately reads the latest episode from D1.

## Important fixes in this version

- `/api/catalog` now returns the real episode list instead of `episodes: []`.
- Homepage and series cards use the real `episodeCount` from D1.
- Search results use `episodeCount` correctly.
- Episode detail data is read from D1 and sorted newest-first.
- Telegram posts can be video, document, or animation.
- Webhook import errors are returned as HTTP 500 with a useful message instead of failing silently.
- Added `/api/telegram/webhook-info` to inspect Telegram webhook errors and pending updates.
- API responses are marked `no-store` so newly imported episodes are not served from stale cache.

## Cloudflare deployment

1. Put your real D1 database ID into `wrangler.jsonc`.
2. Install dependencies: `npm install`.
3. Apply migration: `npm run cf:migrate`.
4. Set Worker secrets:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_WEBHOOK_SECRET`
5. Deploy: `npm run cf:deploy`.
6. Set the Telegram webhook using the URL above.
7. Check `https://YOUR_DOMAIN/api/telegram/webhook-info`.

Do not put `TELEGRAM_BOT_TOKEN` in frontend code, GitHub, or `NEXT_PUBLIC_*` variables.
