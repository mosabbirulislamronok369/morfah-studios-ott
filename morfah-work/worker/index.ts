interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  ADMIN_SYNC_SECRET?: string;
}

type TelegramPost = {
  message_id: number;
  chat?: { id?: number; username?: string; title?: string };
  caption?: string;
  video?: unknown;
  document?: unknown;
};

type TelegramUpdate = { channel_post?: TelegramPost };

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8" } });

function slugify(value: string) {
  return value.trim().toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0980-\u09ff]+/g, "-").replace(/^-+|-+$/g, "") || `series-${Date.now()}`;
}

function parseCaption(caption: string) {
  const lines = caption.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (!lines.some((x) => /^morfah$/i.test(x) || /^#morfah$/i.test(x))) return null;

  const get = (label: string) => {
    const line = lines.find((x) => new RegExp(`^${label}\\s*:\\s*`, "i").test(x));
    return line?.replace(new RegExp(`^${label}\\s*:\\s*`, "i"), "").trim() || "";
  };

  const series = get("Series");
  const episodeRaw = get("Episode");
  const title = get("Title");
  const yearRaw = get("Year");
  const genreRaw = get("Genre");
  const poster = get("Poster");
  const backdrop = get("Backdrop");
  const description = get("Description");
  const episode = Number.parseInt(episodeRaw, 10);

  if (!series || !Number.isInteger(episode) || episode < 1) return null;
  return {
    series,
    episode,
    title,
    year: Number.isInteger(Number.parseInt(yearRaw, 10)) ? Number.parseInt(yearRaw, 10) : undefined,
    genre: genreRaw ? genreRaw.split(",").map((x) => x.trim()).filter(Boolean) : undefined,
    poster,
    backdrop,
    description,
  };
}

function telegramUrl(post: TelegramPost) {
  const id = post.message_id;
  const chatId = String(post.chat?.id ?? "");
  if (post.chat?.username) return `https://t.me/${post.chat.username}/${id}`;
  return `https://t.me/c/${chatId.replace(/^-100/, "")}/${id}`;
}

async function catalog(env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT s.id, s.title, s.original_title AS originalTitle, s.description, s.year,
           s.genre_json AS genreJson, s.poster, s.backdrop, s.featured,
           COUNT(e.id) AS episodeCount
    FROM series s LEFT JOIN episodes e ON e.series_id = s.id
    GROUP BY s.id ORDER BY s.featured DESC, s.updated_at DESC, s.title ASC
  `).all();

  return results.map((row: any) => ({
    id: row.id, title: row.title, originalTitle: row.originalTitle || undefined,
    description: row.description, year: row.year || undefined,
    genre: JSON.parse(row.genreJson || "[]"), poster: row.poster,
    backdrop: row.backdrop || undefined, featured: Boolean(row.featured),
    episodes: [], episodeCount: Number(row.episodeCount || 0)
  }));
}

async function series(env: Env, id: string) {
  const row: any = await env.DB.prepare(`SELECT * FROM series WHERE id = ?`).bind(id).first();
  if (!row) return null;
  const { results } = await env.DB.prepare(`
    SELECT id, number, title, telegram_url AS telegramUrl, youtube_url AS youtubeUrl, facebook_url AS facebookUrl
    FROM episodes WHERE series_id = ? ORDER BY number DESC
  `).bind(id).all();
  return {
    id: row.id, title: row.title, originalTitle: row.original_title || undefined,
    description: row.description, year: row.year || undefined,
    genre: JSON.parse(row.genre_json || "[]"), poster: row.poster,
    backdrop: row.backdrop || undefined, featured: Boolean(row.featured), episodes: results
  };
}

async function importPost(env: Env, post: TelegramPost) {
  const parsed = parseCaption(post.caption ?? "");
  if (!parsed) return { ignored: true, reason: "caption_not_morfah_or_invalid" };
  if (!post.video && !post.document) return { ignored: true, reason: "not_a_video_post" };

  const configuredChannel = String(env.TELEGRAM_CHANNEL_ID || "");
  const incomingChannel = String(post.chat?.id ?? "");
  if (configuredChannel && incomingChannel !== configuredChannel) return { ignored: true, reason: "wrong_channel" };

  const seriesId = slugify(parsed.series);
  const existing: any = await env.DB.prepare(`SELECT * FROM series WHERE id = ?`).bind(seriesId).first();
  const poster = parsed.poster || existing?.poster || "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85";
  const backdrop = parsed.backdrop || existing?.backdrop || poster;
  const genre = parsed.genre || (existing ? JSON.parse(existing.genre_json || "[]") : ["Morfah Studios"]);
  const description = parsed.description || existing?.description || `${parsed.series} — Morfah Studios.`;
  const year = parsed.year ?? existing?.year ?? new Date().getUTCFullYear();
  const title = parsed.title || `${parsed.series} Episode - ${String(parsed.episode).padStart(2, "0")}`;

  await env.DB.prepare(`
    INSERT INTO series (id,title,description,year,genre_json,poster,backdrop,featured,updated_at)
    VALUES (?,?,?,?,?,?,?,COALESCE((SELECT featured FROM series WHERE id=?),0),CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET title=excluded.title,description=excluded.description,year=excluded.year,
      genre_json=excluded.genre_json,poster=excluded.poster,backdrop=excluded.backdrop,updated_at=CURRENT_TIMESTAMP
  `).bind(seriesId, parsed.series, description, year, JSON.stringify(genre), poster, backdrop, seriesId).run();

  const epId = `${seriesId}-ep-${parsed.episode}`;
  await env.DB.prepare(`
    INSERT INTO episodes (id,series_id,number,title,telegram_url,telegram_message_id)
    VALUES (?,?,?,?,?,?)
    ON CONFLICT(series_id,number) DO UPDATE SET title=excluded.title,telegram_url=excluded.telegram_url,telegram_message_id=excluded.telegram_message_id
  `).bind(epId, seriesId, parsed.episode, title, telegramUrl(post), post.message_id).run();

  return { imported: true, seriesId, episode: parsed.episode, telegramUrl: telegramUrl(post) };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/catalog" && request.method === "GET") return json({ ok: true, series: await catalog(env) });

    if (url.pathname.startsWith("/api/series/") && request.method === "GET") {
      const id = decodeURIComponent(url.pathname.slice("/api/series/".length));
      const item = await series(env, id);
      return item ? json({ ok: true, series: item }) : json({ ok: false, error: "Series not found" }, 404);
    }

    if (url.pathname === "/api/search" && request.method === "GET") {
      const q = (url.searchParams.get("q") || "").trim();
      if (!q) return json({ ok: true, series: [] });
      const rows = await env.DB.prepare(`
        SELECT s.id, s.title, s.description, s.year, s.genre_json AS genreJson, s.poster, s.backdrop, s.featured,
               COUNT(e.id) AS episodeCount
        FROM series s LEFT JOIN episodes e ON e.series_id=s.id
        WHERE lower(s.title) LIKE lower(?) OR lower(s.original_title) LIKE lower(?)
        GROUP BY s.id ORDER BY s.title ASC LIMIT 30
      `).bind(`%${q}%`, `%${q}%`).all();
      return json({ ok: true, series: rows.results.map((row: any) => ({
        id: row.id, title: row.title, description: row.description, year: row.year || undefined,
        genre: JSON.parse(row.genreJson || "[]"), poster: row.poster, backdrop: row.backdrop || undefined,
        featured: Boolean(row.featured), episodes: Array.from({ length: Number(row.episodeCount || 0) })
      })) });
    }

    if (url.pathname === "/api/telegram/status" && request.method === "GET") {
      if (!env.TELEGRAM_BOT_TOKEN) return json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not configured." }, 500);
      const me = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`).then((r) => r.json());
      return json({ ok: Boolean((me as any).ok), bot: (me as any).result ? { id: (me as any).result.id, username: (me as any).result.username, name: (me as any).result.first_name } : undefined });
    }

    if (url.pathname === "/api/telegram/webhook" && request.method === "POST") {
      if (env.TELEGRAM_WEBHOOK_SECRET) {
        const supplied = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
        if (supplied !== env.TELEGRAM_WEBHOOK_SECRET) return json({ ok: false, error: "Unauthorized" }, 401);
      }
      const update = await request.json() as TelegramUpdate;
      if (!update.channel_post) return json({ ok: true, ignored: true });
      const result = await importPost(env, update.channel_post);
      return json({ ok: true, ...result });
    }

    return env.ASSETS.fetch(request);
  }
};
