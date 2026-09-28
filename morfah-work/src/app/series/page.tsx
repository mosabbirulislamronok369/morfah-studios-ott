"use client";

import { useEffect, useState } from "react";
import { EpisodeRow } from "@/components/EpisodeRow";
import { fallbackCatalog, type Series } from "@/data/catalog";

export default function SeriesPage() {
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("id") ?? "";

    if (!value) {
      setLoading(false);
      return;
    }

    // Show fallback immediately if available
    const fallback = fallbackCatalog.find((x) => x.id === value);
    if (fallback) {
      setSeries(fallback);
    }

    fetch(`/api/series/${encodeURIComponent(value)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        return response.json();
      })
      .then((data: Series) => {
        // Worker returns the Series object directly
        setSeries(data);
      })
      .catch((error) => {
        console.error("Failed to load series:", error);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading && !series) {
    return (
      <main className="empty">
        <div className="container">
          <h1>Loading...</h1>
          <p>সিরিজের তথ্য লোড হচ্ছে।</p>
        </div>
      </main>
    );
  }

  if (!series) {
    return (
      <main className="empty">
        <div className="container">
          <h1>Series not found</h1>
          <p>এই সিরিজটি পাওয়া যায়নি।</p>
        </div>
      </main>
    );
  }

  return (
    <main className="detail">
      <div className="container">
        <div className="detail-grid">
          <img
            className="poster"
            src={series.poster}
            alt={series.title}
          />

          <div>
            <div className="kicker">Series</div>

            <h1>{series.title}</h1>

            <div className="meta">
              {series.year && <span>{series.year}</span>}

              <span>
                {series.episodes.length} Episodes
              </span>

              {series.genre.map((genre) => (
                <span className="pill" key={genre}>
                  {genre}
                </span>
              ))}
            </div>

            <p>{series.description}</p>

            <h2 style={{ marginTop: 36 }}>
              Episodes ({series.episodes.length})
            </h2>

            <div className="episode-list">
              {[...series.episodes]
                .sort((a, b) => b.number - a.number)
                .map((episode) => (
                  <EpisodeRow
                    key={episode.id}
                    episode={episode}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}