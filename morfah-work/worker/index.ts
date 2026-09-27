/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_INVITE_LINK?: string;
}

type TelegramPost = {
  message_id: number;
  chat?: {
    id?: number;
    username?: string;
    title?: string;
    type?: string;
  };
  caption?: string;
  video?: unknown;
  document?: unknown;
  animation?: unknown;
};

type TelegramUpdate = {
  channel_post?: TelegramPost;
};

type EpisodeRow = {
  id: string;
  number: number;
  title?: string;
  telegramUrl: string;
  youtubeUrl?: string;
  facebookUrl?: string;
};

type ContentType = "series" | "movie" | "short_natok";

const DEFAULT_POSTER =
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\u0980-\u09ff]+/g, "-")
      .replace(/^-+|-+$/g, "") || `series-${Date.now()}`
  );
}

function parseCaption(caption: string) {
  const lines = caption
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (
    !lines.some(
      (x) => /^morfah$/i.test(x) || /^#morfah$/i.test(x)
    )
  ) {
    return null;
  }

  const get = (label: string) => {
    const line = lines.find((x) =>
      new RegExp(`^${label}\\s*:\\s*`, "i").test(x)
    );

    return (
      line
        ?.replace(new RegExp(`^${label}\\s*:\\s*`, "i"), "")
        .trim() || ""
    );
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

  if (!series || !Number.isInteger(episode) || episode < 1) {
    return null;
  }

  return {
    series,
    episode,
    title,
    year: Number.isInteger(Number.parseInt(yearRaw, 10))
      ? Number.parseInt(yearRaw, 10)
      : undefined,
    genre: genreRaw
      ? genreRaw
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
      : undefined,
    poster,
    backdrop,
    description,
  };
}

function telegramUrl(env: Env, post: TelegramPost) {
  if (env.TELEGRAM_INVITE_LINK) {
    return env.TELEGRAM_INVITE_LINK;
  }

  const id = post.message_id;
  const chatId = String(post.chat?.id ?? "");

  if (post.chat?.username) {
    return `https://t.me/${post.chat.username}/${id}`;
  }

  return `https://t.me/c/${chatId.replace(/^-100/, "")}/${id}`;
}

function parseGenre(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (x): x is string => typeof x === "string"
    );
  }

  try {
    const parsed = JSON.parse(String(value || "[]"));

    return Array.isArray(parsed)
      ? parsed.filter(
          (x): x is string => typeof x === "string"
        )
      : [];
  } catch {
    return [];
  }
}

async function getEpisodes(
  env: Env,
  seriesId: string
): Promise<EpisodeRow[]> {
  const { results } = await env.DB.prepare(`
    SELECT
      id,
      number,
      title,
      telegram_url AS telegramUrl,
      youtube_url AS youtubeUrl,
      facebook_url AS facebookUrl
    FROM episodes
    WHERE series_id = ?
    ORDER BY number DESC
  `)
    .bind(seriesId)
    .all<EpisodeRow>();

  return results.map((row: EpisodeRow) => ({
    id: String(row.id),
    number: Number(row.number),
    title: row.title || undefined,
    telegramUrl: String(row.telegramUrl),
    youtubeUrl: row.youtubeUrl || undefined,
    facebookUrl: row.facebookUrl || undefined,
  }));
}

async function catalog(env: Env) {
  const { results } = await env.DB.prepare(`
    SELECT
      s.id,
      s.title,
      s.original_title AS originalTitle,
      s.description,
      s.year,
      s.genre_json AS genreJson,
      s.poster,
      s.backdrop,
      s.featured,
      s.content_type AS contentType,
      COUNT(e.id) AS episodeCount
    FROM series s
    LEFT JOIN episodes e ON e.series_id = s.id
    GROUP BY s.id
    ORDER BY
      s.featured DESC,
      s.updated_at DESC,
      s.title ASC
  `).all();

  return Promise.all(
    results.map(async (row: any) => ({
      id: row.id,
      title: row.title,
      originalTitle: row.originalTitle || undefined,
      description: row.description,
      year: row.year || undefined,
      genre: parseGenre(row.genreJson),
      poster: row.poster,
      backdrop: row.backdrop || undefined,
      featured: Boolean(row.featured),

      contentType: (
        row.contentType || "series"
      ) as ContentType,

      episodeCount: Number(row.episodeCount || 0),

      episodes: await getEpisodes(
        env,
        String(row.id)
      ),
    }))
  );
}

async function series(env: Env, id: string) {
  const row: any = await env.DB.prepare(`
    SELECT *
    FROM series
    WHERE id = ?
  `)
    .bind(id)
    .first();

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    title: row.title,
    originalTitle: row.original_title || undefined,
    description: row.description,
    year: row.year || undefined,
    genre: parseGenre(row.genre_json),
    poster: row.poster,
    backdrop: row.backdrop || undefined,
    featured: Boolean(row.featured),

    contentType: (
      row.content_type || "series"
    ) as ContentType,

    episodes: await getEpisodes(env, id),
  };
}

async function importPost(
  env: Env,
  post: TelegramPost
) {
  const parsed = parseCaption(post.caption ?? "");

  if (!parsed) {
    return {
      imported: false,
      ignored: true,
      reason: "caption_not_morfah_or_invalid",
    };
  }

  if (
    !post.video &&
    !post.document &&
    !post.animation
  ) {
    return {
      imported: false,
      ignored: true,
      reason: "not_a_video_post",
    };
  }

  const configuredChannel = String(
    env.TELEGRAM_CHANNEL_ID || ""
  ).trim();

  const incomingChannel = String(
    post.chat?.id ?? ""
  ).trim();

  if (
    configuredChannel &&
    incomingChannel !== configuredChannel
  ) {
    return {
      imported: false,
      ignored: true,
      reason: "wrong_channel",
      configuredChannel,
      incomingChannel,
    };
  }

  const seriesId = slugify(parsed.series);

  const existing: any = await env.DB.prepare(`
    SELECT *
    FROM series
    WHERE id = ?
  `)
}