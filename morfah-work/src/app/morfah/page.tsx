"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import Link from "next/link";

import type { Series } from "@/data/catalog";
import { fallbackCatalog } from "@/data/catalog";
import { SeriesCard } from "@/components/SeriesCard";
import { ContentSection } from "@/components/ContentSection";

type ContentItem = {
  id: string;
  type: "movie" | "short_natok" | "vlog" | "trailer";
  title: string;
  originalTitle?: string | null;
  description?: string | null;
  year?: number | null;
  genre?: string[];
  poster?: string | null;
  backdrop?: string | null;
  telegramUrl?: string | null;
  youtubeUrl?: string | null;
  facebookUrl?: string | null;
  telegramMessageId?: number | null;
  featured?: number;
  createdAt?: string;
  updatedAt?: string;
};

function ContentCard({ item }: { item: ContentItem }) {
  const typeLabel =
    item.type === "movie"
      ? "Movie"
      : item.type === "short_natok"
        ? "Short Natok"
        : item.type === "vlog"
          ? "Vlog"
          : "Trailer";

  const href =
    item.telegramUrl ||
    item.youtubeUrl ||
    item.facebookUrl ||
    "#";

  return (
    <Link
      className="card"
      href={href}
      target={href !== "#" ? "_blank" : undefined}
      rel={href !== "#" ? "noreferrer" : undefined}
    >
      <div className="card-image-wrap">
        <img
          className="poster"
          src={item.poster || "/placeholder-poster.jpg"}
          alt={item.title}
          loading="lazy"
        />

        <div className="card-overlay">
          <div className="card-play">
            <Play size={20} fill="currentColor" />
          </div>
        </div>

        <div className="card-type">
          {typeLabel}
        </div>
      </div>

      <div className="card-body">
        <div className="card-title">
          {item.title}
        </div>

        <div className="card-meta">
          {item.year ?? ""}
          {item.year ? " · " : ""}
          {item.genre?.length
            ? item.genre.slice(0, 2).join(", ")
            : typeLabel}
        </div>
      </div>
    </Link>
  );
}

async function fetchContent(type: ContentItem["type"]) {
  const response = await fetch(
    `/api/content?type=${encodeURIComponent(type)}`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`Failed to load ${type}`);
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    return data as ContentItem[];
  }

  if (Array.isArray(data.content)) {
    return data.content as ContentItem[];
  }

  return [];
}

export default function HomePage() {
  const [catalog, setCatalog] = useState<Series[]>(fallbackCatalog);

  const [shortNatoks, setShortNatoks] = useState<ContentItem[]>([]);
  const [movies, setMovies] = useState<ContentItem[]>([]);
  const [vlogs, setVlogs] = useState<ContentItem[]>([]);
  const [trailers, setTrailers] = useState<ContentItem[]>([]);

  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalog(data);
        } else if (Array.isArray(data.series)) {
          setCatalog(data.series);
        }
      })
      .catch(() => undefined);

    fetchContent("short_natok")
      .then(setShortNatoks)
      .catch(() => undefined);

    fetchContent("movie")
      .then(setMovies)
      .catch(() => undefined);

    fetchContent("vlog")
      .then(setVlogs)
      .catch(() => undefined);

    fetchContent("trailer")
      .then(setTrailers)
      .catch(() => undefined);
  }, []);

  const featured = catalog[0];

  if (!featured) {
    return (
      <main className="empty">
        <div className="container">
          <h1>No content yet</h1>
        </div>
      </main>
    );
  }

  return (
    <main>
      {/* HERO */}
      <section
        className="hero"
        style={{
          backgroundImage: `url(${featured.backdrop ?? featured.poster})`,
        }}
      >
        <div className="container hero-content">
          <div className="kicker">
            Morfah Studios Original
          </div>

          <h1>{featured.title}</h1>

          <div className="meta">
            {featured.year && (
              <span>{featured.year}</span>
            )}

            <span>
              {featured.episodeCount ??
                featured.episodes.length}{" "}
              Episodes
            </span>

            {featured.genre.map((g) => (
              <span className="pill" key={g}>
                {g}
              </span>
            ))}
          </div>

          <p>{featured.description}</p>

          <Link
            className="btn btn-primary"
            href={`/series?id=${encodeURIComponent(
              featured.id
            )}`}
          >
            <Play size={18} fill="currentColor" />
            View Series
          </Link>
        </div>
      </section>

      {/* SERIES */}
      <ContentSection
        title="Series"
        subtitle="Morfah Studios-এর সব সিরিজ"
        href="/series"
      >
        {catalog.slice(0, 6).map((series) => (
          <SeriesCard
            key={series.id}
            series={series}
          />
        ))}
      </ContentSection>

      {/* SHORT NATOK */}
      <ContentSection
        title="Short Natok"
        subtitle="ছোট নাটক ও একক গল্প"
        href="/?category=short-natok"
      >
        {shortNatoks.slice(0, 6).map((item) => (
          <ContentCard
            key={item.id}
            item={item}
          />
        ))}
      </ContentSection>

      {/* MOVIES */}
      <ContentSection
        title="Movies"
        subtitle="Morfah Studios-এর সিনেমা"
        href="/?category=movies"
      >
        {movies.slice(0, 6).map((item) => (
          <ContentCard
            key={item.id}
            item={item}
          />
        ))}
      </ContentSection>

      {/* VLOGS */}
      <ContentSection
        title="Vlogs"
        subtitle="Morfah Studios-এর Vlogs"
        href="/?category=vlogs"
      >
        {vlogs.slice(0, 6).map((item) => (
          <ContentCard
            key={item.id}
            item={item}
          />
        ))}
      </ContentSection>

      {/* TRAILERS */}
      <ContentSection
        title="Trailers"
        subtitle="Latest trailers & previews"
        href="/?category=trailers"
      >
        {trailers.slice(0, 6).map((item) => (
          <ContentCard
            key={item.id}
            item={item}
          />
        ))}
      </ContentSection>

      {/* CINEMATIC UNIVERSE */}
      <ContentSection
        title="Cinematic Universe"
        subtitle="Morfah-এর connected stories"
        href="/?category=cinematic-universe"
        empty
      />
    </main>
  );
}