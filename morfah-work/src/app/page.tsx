"use client";

import { useEffect, useState } from "react";
import { SeriesCard } from "@/components/SeriesCard";
import { Play } from "lucide-react";
import Link from "next/link";
import type { Series } from "@/data/catalog";
import { fallbackCatalog } from "@/data/catalog";
import { ContentSection } from "@/components/ContentSection";

export default function HomePage() {
  const [catalog, setCatalog] = useState<Series[]>(fallbackCatalog);

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
      <section
        className="hero"
        style={{
          backgroundImage: `url(${featured.backdrop ?? featured.poster})`,
        }}
      >
        <div className="container hero-content">
          <div className="kicker">Morfah Studios Original</div>
          <h1>{featured.title}</h1>

          <div className="meta">
            {featured.year && <span>{featured.year}</span>}
            <span>
              {featured.episodeCount ?? featured.episodes.length} Episodes
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
            href={`/series?id=${encodeURIComponent(featured.id)}`}
          >
            <Play size={18} fill="currentColor" /> View Series
          </Link>
        </div>
      </section>

      <ContentSection
        title="Series"
        subtitle="Morfah Studios-এর সব সিরিজ"
        href="/series"
      >
        {catalog.slice(0, 6).map((series) => (
          <SeriesCard key={series.id} series={series} />
        ))}
      </ContentSection>

      <ContentSection
        title="Short Natok"
        subtitle="ছোট নাটক ও একক গল্প"
        href="/?category=short-natok"
        empty
      />

      <ContentSection
        title="Movies"
        subtitle="Morfah Studios-এর সিনেমা"
        href="/?category=movies"
        empty
      />

      <ContentSection
        title="Vlogs"
        subtitle="Morfah Studios-এর Vlogs"
        href="/?category=vlogs"
        empty
      />

      <ContentSection
        title="Trailers"
        subtitle="Latest trailers & previews"
        href="/?category=trailers"
        empty
      />

      <ContentSection
        title="Cinematic Universe"
        subtitle="Morfah-এর connected stories"
        href="/?category=cinematic-universe"
        empty
      />
    </main>
  );
}
