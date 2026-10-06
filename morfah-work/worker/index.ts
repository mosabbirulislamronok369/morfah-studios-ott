/// <reference types="@cloudflare/workers-types" />

interface Env {
  DB: D1Database;
  ASSETS: Fetcher;

  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHANNEL_ID: string;

  TELEGRAM_WEBHOOK_SECRET?: string;
  TELEGRAM_INVITE_LINK?: string;
}

type TelegramPhotoSize = {
  file_id: string;
  file_unique_id?: string;
  width?: number;
  height?: number;
  file_size?: number;
};

type TelegramMedia = {
  file_id?: string;
  file_unique_id?: string;

  // Telegram Bot API 8.3+: custom/message-specific video cover.
  // This is preferred over the generated video thumbnail.
  cover?: TelegramPhotoSize[];

  thumbnail?: TelegramPhotoSize;
  thumb?: TelegramPhotoSize;
};

type TelegramPost = {
  message_id: number;

  chat?: {
    id?: number;
    username?: string;
    title?: string;
    type?: string;
  };

  caption?: string;

  photo?: TelegramPhotoSize[];

  video?: TelegramMedia;
  document?: TelegramMedia;
  animation?: TelegramMedia;
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

type ContentType =
  | "series"
  | "movie"
  | "short_natok"
  | "vlog"
  | "trailer";

type ParsedCaption = {
  type: ContentType;

  series: string;

  episode?: number;

  title: string;

  year?: number;

  genre?: string[];

  poster?: string;

  backdrop?: string;

  description?: string;
  youtube?: string;
  facebook?: string;
};

const DEFAULT_POSTER =
  "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85";


/* =========================================================
   JSON RESPONSE
========================================================= */

function json(
  data: unknown,
  status = 200
): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        "content-type":
          "application/json; charset=utf-8",

        "cache-control": "no-store",
      },
    }
  );
}


/* =========================================================
   SLUGIFY
========================================================= */

function slugify(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(
        /[^a-z0-9\u0980-\u09ff]+/g,
        "-"
      )
      .replace(/^-+|-+$/g, "") ||
    `content-${Date.now()}`
  );
}


/* =========================================================
   PARSE TELEGRAM CAPTION
========================================================= */

function parseCaption(
  caption: string
): ParsedCaption | null {
  const lines = caption
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean);

  if (
    !lines.some(
      (x) =>
        /^morfah$/i.test(x) ||
        /^#morfah$/i.test(x)
    )
  ) {
    return null;
  }

  const get = (label: string) => {
    const line = lines.find((x) =>
      new RegExp(
        `^${label}\\s*:\\s*`,
        "i"
      ).test(x)
    );

    return (
      line
        ?.replace(
          new RegExp(
            `^${label}\\s*:\\s*`,
            "i"
          ),
          ""
        )
        .trim() || ""
    );
  };

  const typeRaw =
    get("Type").toLowerCase();

  let type: ContentType = "series";

  if (typeRaw === "movie") {
    type = "movie";
  } else if (
    typeRaw === "short natok" ||
    typeRaw === "short_natok" ||
    typeRaw === "short-natok"
  ) {
    type = "short_natok";
  } else if (typeRaw === "vlog") {
    type = "vlog";
  } else if (typeRaw === "trailer") {
    type = "trailer";
  }

  const series =
    get("Series") ||
    get("Title") ||
    "";

  const episodeRaw =
    get("Episode");

  const title =
    get("Title") ||
    series;

  const yearRaw =
    get("Year");

  const genreRaw =
    get("Genre");

  const poster =
    get("Poster");

  const backdrop =
    get("Backdrop");

  const description =
    get("Description");

  const youtube =
    get("YouTube");

  const facebook =
    get("Facebook");

  const parsedEpisode =
    Number.parseInt(
      episodeRaw,
      10
    );

  const episode =
    Number.isInteger(parsedEpisode) &&
    parsedEpisode > 0
      ? parsedEpisode
      : undefined;

  if (!series) {
    return null;
  }

  if (
    type === "series" &&
    episode === undefined
  ) {
    return null;
  }

  const parsedYear =
    Number.parseInt(
      yearRaw,
      10
    );

  return {
    type,

    series,

    episode,

    title,

    year:
      Number.isInteger(parsedYear) &&
      parsedYear > 0
        ? parsedYear
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

    youtube,

    facebook,
  };
}

function getTelegramThumbnailFileId(
  post: TelegramPost
): string | null {
  // 1) Prefer the custom/message-specific video cover selected
  //    when the video was posted to Telegram.
  const videoCover =
    post.video?.cover?.[0]?.file_id;

  if (videoCover) {
    return videoCover;
  }

  // 2) Fallback to Telegram's generated video thumbnail.
  // A separate cover-photo update is handled in the webhook. 
  const videoThumbnail =
    post.video?.thumbnail?.file_id ||
    post.video?.thumb?.file_id;

  if (videoThumbnail) {
    return videoThumbnail;
  }

  // 3) Document thumbnail fallback.
  const documentThumbnail =
    post.document?.thumbnail?.file_id ||
    post.document?.thumb?.file_id;

  if (documentThumbnail) {
    return documentThumbnail;
  }

  // 4) Animation thumbnail fallback.
  const animationThumbnail =
    post.animation?.thumbnail?.file_id ||
    post.animation?.thumb?.file_id;

  if (animationThumbnail) {
    return animationThumbnail;
  }

  // 5) Fallback: Telegram photo post.
  if (post.photo && post.photo.length > 0) {
    const largest =
      post.photo[post.photo.length - 1];

    return largest?.file_id ?? null;
  }

  return null;
}

/* =========================================================
   TELEGRAM CUSTOM COVER PHOTO

   Telegram may deliver a manually selected video cover as a
   separate channel photo update immediately after the video.
   When the photo message directly follows an imported video
   message, use the highest-resolution photo as the SERIES poster.
   Once saved, later episodes keep that same series poster unless
   a caption explicitly provides a new Poster: value.
========================================================= */

async function applyTelegramCoverPhoto(
  env: Env,
  post: TelegramPost
) {
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
      matched: false,
      reason: "wrong_channel",
    };
  }

  if (!post.photo?.length || !post.message_id) {
    return {
      matched: false,
      reason: "not_a_photo_post",
    };
  }

  const previousMessageId =
    post.message_id - 1;

  const largestPhoto =
    post.photo[post.photo.length - 1];

  if (!largestPhoto?.file_id) {
    return {
      matched: false,
      reason: "photo_file_id_missing",
    };
  }

  const poster =
    `/api/telegram/poster/${encodeURIComponent(
      largestPhoto.file_id
    )}`;

  // A photo immediately after a content video can be the custom
  // poster/cover for that content item.
  const content =
    await env.DB.prepare(`
      SELECT id
      FROM content
      WHERE telegram_message_id = ?
      LIMIT 1
    `)
      .bind(previousMessageId)
      .first<{ id: string }>();

  if (content?.id) {
    await env.DB.prepare(`
      UPDATE content
      SET poster = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `)
      .bind(poster, content.id)
      .run();

    return {
      matched: true,
      contentId: content.id,
      coverMessageId: post.message_id,
      sourceMessageId: previousMessageId,
    };
  }

  // Existing Series behavior: a following photo becomes the
  // series poster and is shared across the series.
  const episode =
    await env.DB.prepare(`
      SELECT series_id
      FROM episodes
      WHERE telegram_message_id = ?
      LIMIT 1
    `)
      .bind(previousMessageId)
      .first<{ series_id: string }>();

  if (!episode?.series_id) {
    return {
      matched: false,
      reason: "no_previous_content_or_video",
    };
  }

  await env.DB.prepare(`
    UPDATE series
    SET poster = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `)
    .bind(
      poster,
      episode.series_id
    )
    .run();

  return {
    matched: true,
    seriesId: episode.series_id,
    coverMessageId: post.message_id,
    sourceMessageId: previousMessageId,
  };
}

/* =========================================================
   TELEGRAM URL
========================================================= */

function telegramUrl(
  env: Env,
  post: TelegramPost
) {
  const id = post.message_id;
  const chatId = String(post.chat?.id ?? "");

  if (post.chat?.username && id) {
    return `https://t.me/${post.chat.username}/${id}`;
  }

  if (chatId && id) {
    return `https://t.me/c/${chatId.replace(/^\-100/, "")}/${id}`;
  }

  return env.TELEGRAM_INVITE_LINK || "https://t.me/";
}


/* =========================================================
   GENRE PARSER
========================================================= */

function parseGenre(
  value: unknown
): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (
        x
      ): x is string =>
        typeof x === "string"
    );
  }

  try {
    const parsed =
      JSON.parse(
        String(value || "[]")
      );

    return Array.isArray(parsed)
      ? parsed.filter(
          (
            x
          ): x is string =>
            typeof x === "string"
        )
      : [];
  } catch {
    return [];
  }
}


/* =========================================================
   GET EPISODES
========================================================= */

async function getEpisodes(
  env: Env,
  seriesId: string
): Promise<EpisodeRow[]> {
  const result =
    await env.DB.prepare(`
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

  const results =
    result.results || [];

  return results.map(
    (row: EpisodeRow) => ({
      id: String(row.id),

      number:
        Number(row.number),

      title:
        row.title ||
        undefined,

      telegramUrl:
        String(
          row.telegramUrl
        ),

      youtubeUrl:
        row.youtubeUrl ||
        undefined,

      facebookUrl:
        row.facebookUrl ||
        undefined,
    })
  );
}


/* =========================================================
   CATALOG
========================================================= */

async function catalog(
  env: Env
) {
  const result =
    await env.DB.prepare(`
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
      LEFT JOIN episodes e
        ON e.series_id = s.id
      GROUP BY s.id
      ORDER BY
        s.updated_at DESC,
        s.title ASC
    `)
      .all();

  const results =
    result.results || [];

  return Promise.all(
    results.map(
      async (row: any) => ({
        id: row.id,

        title:
          row.title,

        originalTitle:
          row.originalTitle ||
          undefined,

        description:
          row.description,

        year:
          row.year ||
          undefined,

        genre:
          parseGenre(
            row.genreJson
          ),

        poster:
          row.poster ||
          DEFAULT_POSTER,

        backdrop:
          row.backdrop ||
          undefined,

        featured:
          Boolean(
            row.featured
          ),

        contentType:
          (
            row.contentType ||
            "series"
          ) as ContentType,

        episodeCount:
          Number(
            row.episodeCount ||
              0
          ),

        episodes:
          await getEpisodes(
            env,
            String(row.id)
          ),
      })
    )
  );
}


/* =========================================================
   CONTENT CATALOG
   ========================================================= */

async function contentCatalog(
  env: Env,
  type?: string
) {
  const normalizedType =
    type?.trim().toLowerCase() || "";

  const query = normalizedType
    ? `
      SELECT
        id,
        type,
        title,
        original_title AS originalTitle,
        description,
        year,
        genre_json AS genreJson,
        poster,
        backdrop,
        telegram_url AS telegramUrl,
        youtube_url AS youtubeUrl,
        facebook_url AS facebookUrl,
        telegram_message_id AS telegramMessageId,
        featured,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM content
      WHERE type = ?
      ORDER BY updated_at DESC, title ASC
    `
    : `
      SELECT
        id,
        type,
        title,
        original_title AS originalTitle,
        description,
        year,
        genre_json AS genreJson,
        poster,
        backdrop,
        telegram_url AS telegramUrl,
        youtube_url AS youtubeUrl,
        facebook_url AS facebookUrl,
        telegram_message_id AS telegramMessageId,
        featured,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM content
      ORDER BY updated_at DESC, title ASC
    `;

  const statement = env.DB.prepare(query);

  const result = normalizedType
    ? await statement.bind(normalizedType).all()
    : await statement.all();

  return (result.results || []).map(
    (row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      originalTitle:
        row.originalTitle || undefined,
      description:
        row.description || undefined,
      year:
        row.year || undefined,
      genre:
        parseGenre(row.genreJson),
      poster:
        row.poster || DEFAULT_POSTER,
      backdrop:
        row.backdrop || undefined,
      telegramUrl:
        row.telegramUrl || undefined,
      youtubeUrl:
        row.youtubeUrl || undefined,
      facebookUrl:
        row.facebookUrl || undefined,
      telegramMessageId:
        row.telegramMessageId
          ? Number(row.telegramMessageId)
          : undefined,
      featured:
        Boolean(row.featured),
      createdAt:
        row.createdAt,
      updatedAt:
        row.updatedAt,
    })
  );
}


/* =========================================================
   SINGLE SERIES
========================================================= */

async function getSeries(
  env: Env,
  id: string
) {
  const row: any =
    await env.DB.prepare(`
      SELECT *
      FROM series
      WHERE id = ?
      LIMIT 1
    `)
      .bind(id)
      .first();

  if (!row) {
    return null;
  }

  /*
   * IMPORTANT:
   * Do not use first<number>("count")
   * here. Read the row object safely.
   */

  const countRow: any =
    await env.DB.prepare(`
      SELECT COUNT(*) AS count
      FROM episodes
      WHERE series_id = ?
    `)
      .bind(id)
      .first();

  const episodeCount =
    Number(
      countRow?.count ?? 0
    );

  const episodes =
    await getEpisodes(
      env,
      id
    );

  return {
    id:
      row.id,

    title:
      row.title,

    originalTitle:
      row.original_title ||
      undefined,

    description:
      row.description,

    year:
      row.year ||
      undefined,

    genre:
      parseGenre(
        row.genre_json
      ),

    poster:
      row.poster ||
      DEFAULT_POSTER,

    backdrop:
      row.backdrop ||
      undefined,

    featured:
      Boolean(
        row.featured
      ),

    contentType:
      (
        row.content_type ||
        "series"
      ) as ContentType,

    episodeCount,

    episodes,
  };
}


/* =========================================================
   SEARCH
========================================================= */

async function searchCatalog(
  env: Env,
  query: string
) {
  const q =
    `%${query
      .toLowerCase()}%`;

  const result =
    await env.DB.prepare(`
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
      LEFT JOIN episodes e
        ON e.series_id = s.id
      WHERE
        LOWER(s.title) LIKE ?
        OR LOWER(
          COALESCE(
            s.original_title,
            ''
          )
        ) LIKE ?
        OR LOWER(
          COALESCE(
            s.description,
            ''
          )
        ) LIKE ?
      GROUP BY s.id
      ORDER BY
        s.updated_at DESC,
        s.title ASC
      LIMIT 50
    `)
      .bind(
        q,
        q,
        q
      )
      .all();

  const results =
    result.results || [];

  return results.map(
    (row: any) => ({
      id:
        row.id,

      title:
        row.title,

      originalTitle:
        row.originalTitle ||
        undefined,

      description:
        row.description,

      year:
        row.year ||
        undefined,

      genre:
        parseGenre(
          row.genreJson
        ),

      poster:
        row.poster ||
        DEFAULT_POSTER,

      backdrop:
        row.backdrop ||
        undefined,

      featured:
        Boolean(
          row.featured
        ),

      contentType:
        (
          row.contentType ||
          "series"
        ) as ContentType,

      episodeCount:
        Number(
          row.episodeCount ||
            0
        ),
    })
  );
}


/* =========================================================
   IMPORT TELEGRAM POST
========================================================= */

async function importPost(
  env: Env,
  post: TelegramPost
) {
  const parsed =
    parseCaption(
      post.caption ?? ""
    );

  if (!parsed) {
    return {
      imported: false,
      ignored: true,
      reason:
        "caption_not_morfah_or_invalid",
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
      reason:
        "not_a_video_post",
    };
  }

  const configuredChannel =
    String(
      env.TELEGRAM_CHANNEL_ID ||
        ""
    ).trim();

  const incomingChannel =
    String(
      post.chat?.id ?? ""
    ).trim();

  if (
    configuredChannel &&
    incomingChannel !==
      configuredChannel
  ) {
    return {
      imported: false,
      ignored: true,
      reason:
        "wrong_channel",
      configuredChannel,
      incomingChannel,
    };
  }

  const seriesId =
    slugify(
      parsed.series
    );

  const existing: any =
    await env.DB.prepare(`
      SELECT *
      FROM series
      WHERE id = ?
    `)
      .bind(seriesId)
      .first();

  const genreSource =
    parsed.genre ??
    existing?.genre_json;

  const genreJson =
    JSON.stringify(
      parseGenre(
        genreSource
      )
    );

 const telegramThumbnailFileId =
  getTelegramThumbnailFileId(post);

const telegramThumbnail =
  telegramThumbnailFileId
    ? `/api/telegram/poster/${encodeURIComponent(
        telegramThumbnailFileId
      )}`
    : null;

// Series poster priority:
  // 1) Explicit Poster: from the caption, if supplied.
  // 2) Existing series poster: keeps ONE poster across all episodes.
  // 3) Telegram video cover/thumbnail: used only when the series
  //    does not already have a poster.
  // 4) Default poster fallback.
  const poster =
    parsed.poster ||
    existing?.poster ||
    telegramThumbnail ||
    DEFAULT_POSTER;

  const backdrop =
    parsed.backdrop ||
    existing?.backdrop ||
    null;

  const description =
    parsed.description ||
    existing?.description ||
    `${parsed.series} - Morfah Studios`;

  const year =
    parsed.year ??
    existing?.year ??
    null;

  const featured =
    existing?.featured ??
    0;

  /* =======================================================
     UPSERT SERIES / CONTENT
  ======================================================= */

  await env.DB.prepare(`
    INSERT INTO series (
      id,
      title,
      original_title,
      description,
      year,
      genre_json,
      poster,
      backdrop,
      featured,
      content_type,
      created_at,
      updated_at
    )
    VALUES (
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(id)
    DO UPDATE SET
      title =
        excluded.title,

      description =
        excluded.description,

      year =
        excluded.year,

      genre_json =
        excluded.genre_json,

      poster =
        excluded.poster,

      backdrop =
        excluded.backdrop,

      content_type =
        excluded.content_type,

      updated_at =
        CURRENT_TIMESTAMP
  `)
    .bind(
      seriesId,
      parsed.series,
      existing?.original_title ||
        null,
      description,
      year,
      genreJson,
      poster,
      backdrop,
      featured,
      parsed.type
    )
    .run();

  /* =======================================================
     MOVIE / SHORT NATOK / VLOG / TRAILER
     IMPORTANT:
     These standalone content types belong in the new
     `content` table, not in `series` / `episodes`.
  ======================================================= */

  if (
    parsed.type === "movie" ||
    parsed.type === "short_natok" ||
    parsed.type === "vlog" ||
    parsed.type === "trailer"
  ) {
    const contentId =
      `${parsed.type}-${slugify(parsed.title || parsed.series)}`;

    const existingContent: any =
      await env.DB.prepare(`
        SELECT *
        FROM content
        WHERE id = ?
        LIMIT 1
      `)
        .bind(contentId)
        .first();

    const contentGenreSource =
      parsed.genre ??
      existingContent?.genre_json;

    const contentGenreJson =
      JSON.stringify(
        parseGenre(contentGenreSource)
      );

    const contentPoster =
      parsed.poster ||
      existingContent?.poster ||
      telegramThumbnail ||
      DEFAULT_POSTER;

    const contentBackdrop =
      parsed.backdrop ||
      existingContent?.backdrop ||
      null;

    const contentDescription =
      parsed.description ||
      existingContent?.description ||
      `${parsed.title || parsed.series} - Morfah Studios`;

    const contentYear =
      parsed.year ??
      existingContent?.year ??
      null;

    const contentFeatured =
      existingContent?.featured ??
      0;

    await env.DB.prepare(`
      INSERT INTO content (
        id,
        type,
        title,
        original_title,
        description,
        year,
        genre_json,
        poster,
        backdrop,
        telegram_url,
        youtube_url,
        facebook_url,
        telegram_message_id,
        featured,
        created_at,
        updated_at
      )
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT(id)
      DO UPDATE SET
        type =
          excluded.type,
        title =
          excluded.title,
        description =
          excluded.description,
        year =
          excluded.year,
        genre_json =
          excluded.genre_json,
        poster =
          excluded.poster,
        backdrop =
          excluded.backdrop,
        telegram_url =
          excluded.telegram_url,
        youtube_url =
          excluded.youtube_url,
        facebook_url =
          excluded.facebook_url,
        telegram_message_id =
          excluded.telegram_message_id,
        updated_at =
          CURRENT_TIMESTAMP
    `)
      .bind(
        contentId,
        parsed.type,
        parsed.title || parsed.series,
        existingContent?.original_title || null,
        contentDescription,
        contentYear,
        contentGenreJson,
        contentPoster,
        contentBackdrop,
        telegramUrl(env, post),
        parsed.youtube || null,
        parsed.facebook || null,
        post.message_id,
        contentFeatured
      )
      .run();

    return {
      imported: true,
      type: parsed.type,
      id: contentId,
      title:
        parsed.title || parsed.series,
    };
  }

  /* =======================================================
     SERIES EPISODE
  ======================================================= */

  const episode =
    parsed.episode;

  if (!episode) {
    return {
      imported: false,
      ignored: true,
      reason:
        "series_episode_missing",
    };
  }

  const episodeId =
    `${seriesId}-ep-${episode}`;

  await env.DB.prepare(`
    INSERT INTO episodes (
      id,
      series_id,
      number,
      title,
      telegram_url,
      youtube_url,
      facebook_url,
      telegram_message_id,
      created_at
    )
    VALUES (
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      ?,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT(id)
    DO UPDATE SET
      title =
        excluded.title,

      telegram_url =
        excluded.telegram_url,

      telegram_message_id =
        excluded.telegram_message_id
  `)
    .bind(
      episodeId,
      seriesId,
      episode,
      parsed.title ||
        `${parsed.series} Episode - ${episode}`,
      telegramUrl(
        env,
        post
      ),
      parsed.youtube || null,
      parsed.facebook || null,
      post.message_id
    )
    .run();

  return {
    imported: true,
    type:
      "series",
    seriesId,
    episode,
    title:
      parsed.title ||
      `${parsed.series} Episode - ${episode}`,
  };
}


/* =========================================================
   TELEGRAM API
========================================================= */

async function telegramApi(
  env: Env,
  method: string,
  body?: Record<
    string,
    unknown
  >
) {
  const response =
    await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/${method}`,

      body
        ? {
            method: "POST",

            headers: {
              "content-type":
                "application/json",
            },

            body:
              JSON.stringify(
                body
              ),
          }
        : undefined
    );

  return response.json();
}


/* =========================================================
   TELEGRAM WEBHOOK SECRET
========================================================= */

function checkWebhookSecret(
  request: Request,
  env: Env
) {
  if (
    !env.TELEGRAM_WEBHOOK_SECRET
  ) {
    return true;
  }

  return (
    request.headers.get(
      "x-telegram-bot-api-secret-token"
    ) ===
    env.TELEGRAM_WEBHOOK_SECRET
  );
}


/* =========================================================
   WORKER
========================================================= */

export default {
  async fetch(
    request: Request,
    env: Env
  ): Promise<Response> {
    const url =
      new URL(
        request.url
      );

    const path =
      url.pathname;


    try {

      /* =====================================================
         API: CATALOG
      ===================================================== */

      if (
        request.method === "GET" &&
        path === "/api/catalog"
      ) {
        const result =
          await catalog(env);

        return json(
          result
        );
      }


      /* =====================================================
         API: SEARCH
      ===================================================== */

      if (
        request.method === "GET" &&
        path === "/api/search"
      ) {
        const q =
          url.searchParams
            .get("q")
            ?.trim() ||
          "";

        if (!q) {
          return json([]);
        }

        const result =
          await searchCatalog(
            env,
            q
          );

        return json(
          result
        );
      }


      /* =====================================================
         API: CONTENT
         Query examples:
         /api/content
         /api/content?type=short_natok
         /api/content?type=movie
         /api/content?type=vlog
         /api/content?type=trailer
      ===================================================== */

      if (
        request.method === "GET" &&
        path === "/api/content"
      ) {
        const type =
          url.searchParams
            .get("type")
            ?.trim()
            .toLowerCase() || undefined;

        const allowedTypes = new Set([
          "movie",
          "short_natok",
          "vlog",
          "trailer",
        ]);

        if (
          type &&
          !allowedTypes.has(type)
        ) {
          return json(
            {
              ok: false,
              error: "Unsupported content type",
              allowedTypes: [
                "movie",
                "short_natok",
                "vlog",
                "trailer",
              ],
            },
            400
          );
        }

        const result =
          await contentCatalog(
            env,
            type
          );

        return json(result);
      }


      /* =====================================================
         API: CONTENT SEARCH
         Optional type filter.
      ===================================================== */

      if (
        request.method === "GET" &&
        path === "/api/content/search"
      ) {
        const q =
          url.searchParams
            .get("q")
            ?.trim()
            .toLowerCase() || "";

        if (!q) {
          return json([]);
        }

        const type =
          url.searchParams
            .get("type")
            ?.trim()
            .toLowerCase() || "";

        const like = `%${q}%`;

        const result =
          type
            ? await env.DB.prepare(`
                SELECT
                  id,
                  type,
                  title,
                  original_title AS originalTitle,
                  description,
                  year,
                  genre_json AS genreJson,
                  poster,
                  backdrop,
                  telegram_url AS telegramUrl,
                  youtube_url AS youtubeUrl,
                  facebook_url AS facebookUrl,
                  telegram_message_id AS telegramMessageId,
                  featured,
                  created_at AS createdAt,
                  updated_at AS updatedAt
                FROM content
                WHERE type = ?
                  AND (
                    LOWER(title) LIKE ?
                    OR LOWER(COALESCE(original_title, '')) LIKE ?
                    OR LOWER(COALESCE(description, '')) LIKE ?
                  )
                ORDER BY updated_at DESC, title ASC
                LIMIT 50
              `)
              .bind(
                type,
                like,
                like,
                like
              )
              .all()
            : await env.DB.prepare(`
                SELECT
                  id,
                  type,
                  title,
                  original_title AS originalTitle,
                  description,
                  year,
                  genre_json AS genreJson,
                  poster,
                  backdrop,
                  telegram_url AS telegramUrl,
                  youtube_url AS youtubeUrl,
                  facebook_url AS facebookUrl,
                  telegram_message_id AS telegramMessageId,
                  featured,
                  created_at AS createdAt,
                  updated_at AS updatedAt
                FROM content
                WHERE
                  LOWER(title) LIKE ?
                  OR LOWER(COALESCE(original_title, '')) LIKE ?
                  OR LOWER(COALESCE(description, '')) LIKE ?
                ORDER BY updated_at DESC, title ASC
                LIMIT 50
              `)
              .bind(
                like,
                like,
                like
              )
              .all();

        return json(
          (result.results || []).map(
            (row: any) => ({
              id: row.id,
              type: row.type,
              title: row.title,
              originalTitle:
                row.originalTitle || undefined,
              description:
                row.description || undefined,
              year:
                row.year || undefined,
              genre:
                parseGenre(row.genreJson),
              poster:
                row.poster || DEFAULT_POSTER,
              backdrop:
                row.backdrop || undefined,
              telegramUrl:
                row.telegramUrl || undefined,
              youtubeUrl:
                row.youtubeUrl || undefined,
              facebookUrl:
                row.facebookUrl || undefined,
              telegramMessageId:
                row.telegramMessageId
                  ? Number(row.telegramMessageId)
                  : undefined,
              featured:
                Boolean(row.featured),
              createdAt:
                row.createdAt,
              updatedAt:
                row.updatedAt,
            })
          )
        );
      }


      /* =====================================================
         API: SINGLE SERIES
         
         IMPORTANT:
         This must stay BEFORE ASSETS fallback.
      ===================================================== */

      if (
        request.method === "GET" &&
        path.startsWith(
          "/api/series/"
        )
      ) {
        const rawId =
          path.slice(
            "/api/series/"
              .length
          );

        const id =
          decodeURIComponent(
            rawId
          );

        if (!id) {
          return json(
            {
              ok: false,
              error:
                "Series ID is required",
            },
            400
          );
        }

        const result =
          await getSeries(
            env,
            id
          );

        if (!result) {
          return json(
            {
              ok: false,
              error:
                "Series not found",
              id,
            },
            404
          );
        }

        return json(
          result
        );
      }


      /* =====================================================
         API: TELEGRAM STATUS
      ===================================================== */

      if (
        path ===
        "/api/telegram/status"
      ) {
        if (
          !env.TELEGRAM_BOT_TOKEN
        ) {
          return json(
            {
              ok: false,
              error:
                "TELEGRAM_BOT_TOKEN is not configured",
            },
            500
          );
        }

        const result =
          await telegramApi(
            env,
            "getMe"
          );

        return json(
          result
        );
      }


      /* =====================================================
         API: TELEGRAM WEBHOOK INFO
      ===================================================== */

      if (
        path ===
        "/api/telegram/webhook-info"
      ) {
        if (
          !env.TELEGRAM_BOT_TOKEN
        ) {
          return json(
            {
              ok: false,
              error:
                "TELEGRAM_BOT_TOKEN is not configured",
            },
            500
          );
        }

        const result =
          await telegramApi(
            env,
            "getWebhookInfo"
          );

        return json(
          result
        );
      }


      /* =====================================================
         API: SET TELEGRAM WEBHOOK
      ===================================================== */

      if (
        path ===
        "/api/telegram/set-webhook"
      ) {
        if (
          !env.TELEGRAM_BOT_TOKEN
        ) {
          return json(
            {
              ok: false,
              error:
                "TELEGRAM_BOT_TOKEN is not configured",
            },
            500
          );
        }

        const webhookUrl =
          `${url.origin}/api/telegram/webhook`;

        const body: Record<
          string,
          unknown
        > = {
          url:
            webhookUrl,
        };

        if (
          env.TELEGRAM_WEBHOOK_SECRET
        ) {
          body.secret_token =
            env.TELEGRAM_WEBHOOK_SECRET;
        }

        const result =
          await telegramApi(
            env,
            "setWebhook",
            body
          );

        return json(
          result
        );
      }


      /* =====================================================
         TELEGRAM POSTER PROXY

         Uses the Telegram file_id stored in series.poster or content.poster.
      ===================================================== */

      if (
        request.method === "GET" &&
        path.startsWith("/api/telegram/poster/")
      ) {
        const rawFileId = path.slice(
          "/api/telegram/poster/".length
        );

        const fileId = decodeURIComponent(
          rawFileId
        );

        if (!fileId) {
          return json(
            {
              ok: false,
              error:
                "Telegram file_id is required",
            },
            400
          );
        }

        const fileInfo =
          (await telegramApi(
            env,
            "getFile",
            {
              file_id: fileId,
            }
          )) as {
            ok?: boolean;
            result?: {
              file_path?: string;
            };
          };

        const filePath =
          fileInfo?.ok &&
          fileInfo?.result?.file_path;

        if (!filePath) {
          return json(
            {
              ok: false,
              error:
                "Telegram poster file not found",
            },
            404
          );
        }

        const imageResponse =
          await fetch(
            `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`
          );

        if (!imageResponse.ok) {
          return json(
            {
              ok: false,
              error:
                "Failed to download Telegram poster",
            },
            502
          );
        }

        const headers = new Headers();

        headers.set(
          "content-type",
          imageResponse.headers.get(
            "content-type"
          ) || "image/jpeg"
        );

        headers.set(
          "cache-control",
          "public, max-age=86400, s-maxage=86400"
        );

        return new Response(
          imageResponse.body,
          {
            status: 200,
            headers,
          }
        );
      }


      /* =====================================================
         TELEGRAM WEBHOOK POST
      ===================================================== */

      if (
        path ===
          "/api/telegram/webhook" &&
        request.method === "POST"
      ) {
        if (
          !checkWebhookSecret(
            request,
            env
          )
        ) {
          return json(
            {
              ok: false,
              error:
                "Invalid webhook secret",
            },
            401
          );
        }

        const update =
          (await request.json()) as TelegramUpdate;

        const post =
          update.channel_post;

        if (!post) {
          return json({
            ok: true,
            ignored: true,
            reason:
              "no_channel_post",
          });
        }

        // A manually selected Telegram video cover may arrive
        // as a separate photo update immediately after the video.
        if (post.photo?.length) {
          const coverResult =
            await applyTelegramCoverPhoto(
              env,
              post
            );

          if (coverResult.matched) {
            return json({
              ok: true,
              imported: false,
              coverUpdated: true,
              ...coverResult,
            });
          }
        }

        const result =
          await importPost(
            env,
            post
          );

        return json({
          ok: true,
          ...result,
        });
      }


      /* =====================================================
         TELEGRAM WEBHOOK GET
      ===================================================== */

      if (
        path ===
          "/api/telegram/webhook" &&
        request.method === "GET"
      ) {
        return json({
          ok: true,

          service:
            "morfah-studios-ott",

          webhook:
            "ready",
        });
      }


      /* =====================================================
         STATIC NEXT.JS ASSETS
         
         IMPORTANT:
         API routes are already handled above.
      ===================================================== */
// Never send unknown API routes to the Next.js SPA.
if (path.startsWith("/api/")) {
  return json(
    {
      ok: false,
      error: "API route not found",
      path,
    },
    404
  );
}
      if (
        request.method === "GET" ||
        request.method === "HEAD"
      ) {
        return env.ASSETS.fetch(
          request
        );
      }


      /* =====================================================
         404
      ===================================================== */

      return json(
        {
          ok: false,
          error:
            "Not found",
        },
        404
      );

    } catch (error) {

      console.error(
        "Worker error:",
        error
      );

      return json(
        {
          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "Internal server error",
        },
        500
      );
    }
  },
};