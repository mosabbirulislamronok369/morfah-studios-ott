"use client";

import { useEffect, useState } from "react";
import { SeriesCard } from "@/components/SeriesCard";
import { Play } from "lucide-react";
import Link from "next/link";
import type { Series } from "@/data/catalog";
import { fallbackCatalog } from "@/data/catalog";

export default function HomePage() {
  const [catalog, setCatalog] = useState<Series[]>(fallbackCatalog);

  useEffect(() => {
    fetch("/api/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data.series)) setCatalog(data.series); })
      .catch(() => undefined);
  }, []);

  const featured = catalog.find((x) => x.featured) ?? catalog[0];
  if (!featured) return <main className="empty"><div className="container"><h1>No series yet</h1></div></main>;

  return (
    <main>
      <section className="hero" style={{ backgroundImage: `url(${featured.backdrop ?? featured.poster})` }}>
        <div className="container hero-content">
          <div className="kicker">Morfah Studios Original</div>
          <h1>{featured.title}</h1>
          <div className="meta">
            {featured.year && <span>{featured.year}</span>}
            <span>{featured.episodeCount ?? featured.episodes.length} Episodes</span>
            {featured.genre.map((g) => <span className="pill" key={g}>{g}</span>)}
          </div>
          <p>{featured.description}</p>
          <Link className="btn btn-primary" href={`/series?id=${encodeURIComponent(featured.id)}`}>
            <Play size={18} fill="currentColor" /> View Series
          </Link>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div><h2>Series</h2><div className="muted">Morfah Studios-এর সব সিরিজ</div></div>
          </div>
          <div className="grid">{catalog.map((series) => <SeriesCard key={series.id} series={series} />)}</div>
        </div>
      </section>
    </main>
  );
}
