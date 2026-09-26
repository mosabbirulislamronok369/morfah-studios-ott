"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Series } from "@/data/catalog";

export default function SearchPage() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Series[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!q.trim()) { setResults([]); return; }
      fetch(`/api/search?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" })
        .then((r) => r.json()).then((data) => setResults(data.series ?? [])).catch(() => setResults([]));
    }, 180);
    return () => clearTimeout(timer);
  }, [q]);

  return <main className="search-overlay" style={{ position: "static", minHeight: "70vh" }}>
    <div className="search-box">
      <div className="search-top"><input autoFocus className="search-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search series..." /></div>
      <div className="search-results">
        {results.map((series) => <Link className="search-result" key={series.id} href={`/series?id=${encodeURIComponent(series.id)}`}>
          <img src={series.poster} alt={series.title} /><div><strong>{series.title}</strong><div className="muted">{series.episodes.length} Episodes</div></div>
        </Link>)}
        {q && !results.length && <div className="muted">কোনো সিরিজ পাওয়া যায়নি।</div>}
      </div>
    </div>
  </main>;
}
