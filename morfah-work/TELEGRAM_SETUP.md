# Telegram automatic publishing setup

## 1. Bot permission

The Telegram bot must be an **administrator** of the private Morfah Studios channel.

## 2. Required caption

Every episode post must contain these lines:

```text
MORFAH
Series: Dark Boys: Encore
Episode: 02
Title: Dark Boys: Encore Episode - 02
```

`MORFAH`, `Series`, and `Episode` are required. `Title` is optional.

Optional first-time series metadata:

```text
Year: 2026
Genre: Drama, Mystery
Poster: https://example.com/poster.jpg
Backdrop: https://example.com/backdrop.jpg
Description: Short series description.
```

## 3. Webhook

Set the webhook after deploying the Worker:

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook" \
  -d "url=https://YOUR_DOMAIN/api/telegram/webhook" \
  -d "secret_token=YOUR_WEBHOOK_SECRET" \
  -d 'allowed_updates=["channel_post"]'
```

Check it:

```bash
curl "https://YOUR_DOMAIN/api/telegram/webhook-info"
```

The response exposes Telegram's `pendingUpdateCount`, `lastErrorMessage`, webhook URL, and allowed updates.

## 4. What happens after upload

`Telegram channel -> channel_post webhook -> caption parser -> D1 series/episode -> OTT API -> latest episode list`

The OTT stores only episode metadata and the Telegram message URL. It does not download, proxy, transcode, or stream the Telegram video.
