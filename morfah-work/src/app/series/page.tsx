"use client";

import { useEffect, useState } from "react";
import { EpisodeRow } from "@/components/EpisodeRow";
import { fallbackCatalog, type Series } from "@/data/catalog";
import Link from "next/link";

export default function SeriesPage() {
  const [series, setSeries] = useState<Series | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("id") ?? "";
    setSeries(fallbackCatalog.find((x) => x.id === value) ?? null);
    if (!value) return;
    fetch(`/api/series/${encodeURIComponent(value)}`, { cache: "no-store" })
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((data) => setSeries(data.series ?? null))
      .catch(() => undefined);
  }, []);

  if (!series) return <main className="empty"><div className="container"><h1>Loading...</h1><p>সিরিজের তথ্য লোড হচ্ছে।</p></div></main>;

  return (
    <main className="detail">
      <div className="container">
        <div className="detail-grid">
          <img className="poster" src={series.poster} alt={series.title} />
          <div>
            <div className="kicker">Series</div>
            <h1>{series.title}</h1>
            <div className="meta">
              {series.year && <span>{series.year}</span>}
              <span>{series.episodes.length} Episodes</span>
              {series.genre.map((g) => <span className="pill" key={g}>{g}</span>)}
            </div>
            <p>{series.description}</p>
            <h2 style={{ marginTop: 36 }}>Episodes ({series.episodes.length})</h2>
            <div className="episode-list">
              {[...series.episodes].sort((a,b) => b.number - a.number).map((episode) => <EpisodeRow key={episode.id} episode={episode} />)}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
