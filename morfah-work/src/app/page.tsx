"use client";

import { useEffect, useMemo, useState } from "react";
import { SeriesCard } from "@/components/SeriesCard";
import { Play, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Series } from "@/data/catalog";
import { fallbackCatalog } from "@/data/catalog";

function ContentRow({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: Series[];
}) {
  if (!items.length) return null;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="muted">{subtitle}</div>}
          </div>

          <div className="section-count">
            {items.length} {items.length === 1 ? "Title" : "Titles"}
            <ChevronRight size={18} />
          </div>
        </div>

        <div className="content-row">
          {items.map((item) => (
            <SeriesCard key={item.id} series={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  const [catalog, setCatalog] = useState<Series[]>(fallbackCatalog);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/catalog", {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Catalog API error: ${response.status}`);
        }

        return response.json();
      })
      .then((data) => {
        if (cancelled) return;

        /*
         * Worker currently returns:
         *
         * [
         *   { id, title, ... },
         *   { id, title, ... }
         * ]
         *
         * But we also support:
         *
         * { series: [...] }
         */
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.series)
            ? data.series
            : [];

        if (items.length) {
          setCatalog(items);
        }
      })
      .catch((error) => {
        console.error("Failed to load catalog:", error);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const series = useMemo(
    () => catalog.filter((item) => (item.contentType ?? "series") === "series"),
    [catalog]
  );

  const movies = useMemo(
    () => catalog.filter((item) => item.contentType === "movie"),
    [catalog]
  );

  const shortNatoks = useMemo(
    () => catalog.filter((item) => item.contentType === "short_natok"),
    [catalog]
  );

  const featured =
    catalog.find((item) => item.featured) ??
    series[0] ??
    catalog[0];

  if (!featured) {
    return (
      <main className="empty">
        <div className="container">
          <h1>No content yet</h1>
          <p className="muted">
            এখনো কোনো content পাওয়া যায়নি।
          </p>
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
          backgroundImage: `
            linear-gradient(
              90deg,
              rgba(0,0,0,0.92) 0%,
              rgba(0,0,0,0.70) 45%,
              rgba(0,0,0,0.25) 100%
            ),
            linear-gradient(
              180deg,
              rgba(0,0,0,0.10) 0%,
              rgba(0,0,0,0.95) 100%
            ),
            url(${featured.backdrop ?? featured.poster})
          `,
        }}
      >
        <div className="container hero-content">
          <div className="kicker">
            Morfah Studios Original
          </div>

          <h1>{featured.title}</h1>

          <div className="meta">
            {featured.year && <span>{featured.year}</span>}

            <span>
              {featured.episodeCount ??
                featured.episodes.length}{" "}
              Episodes
            </span>

            {featured.genre?.map((genre) => (
              <span className="pill" key={genre}>
                {genre}
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
      <ContentRow
        title="Series"
        subtitle="Morfah Studios-এর সব সিরিজ"
        items={series}
      />

      {/* MOVIES */}
      <ContentRow
        title="Movie Flow"
        subtitle="Morfah Studios-এর Movies"
        items={movies}
      />

      {/* SHORT NATOK */}
      <ContentRow
        title="Short Natok Flow"
        subtitle="Morfah Studios-এর Short Natok"
        items={shortNatoks}
      />
    </main>
  );
}