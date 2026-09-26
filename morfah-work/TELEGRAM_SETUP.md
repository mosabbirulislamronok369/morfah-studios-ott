# Telegram setup

The existing bot should be an administrator of the private Morfah Studios channel.

## Caption format

Every post you want to publish automatically must contain a line containing `MORFAH`, then:

```text
MORFAH
Series: Dark Boys: Encore
Episode: 02
Title: Dark Boys: Encore Episode - 02
```

Optional metadata can be supplied when creating a series: `Year`, `Genre`, `Poster`, `Backdrop`, `Description`.

## What the webhook does

- receives `channel_post`
- validates the configured channel
- validates the webhook secret
- parses metadata from the caption
- writes only metadata to Cloudflare D1
- constructs the Telegram message URL
- updates the OTT catalog automatically

It does **not** download, proxy, transcode, store, or stream the Telegram video.
