import Link from "next/link";
import { Play } from "lucide-react";
import type { Series } from "@/data/catalog";

export function SeriesCard({ series }: { series: Series }) {
  const contentType = series.contentType ?? "series";

  const typeLabel =
    contentType === "movie"
      ? "Movie"
      : contentType === "short_natok"
        ? "Short Natok"
        : "Series";

  const episodeCount =
    series.episodeCount ?? series.episodes?.length ?? 0;

  return (
    <Link
      className="card"
      href={`/series?id=${encodeURIComponent(series.id)}`}
    >
      <div className="card-image-wrap">
        <img
          className="poster"
          src={series.poster}
          alt={series.title}
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
          {series.title}
        </div>

        <div className="card-meta">
          {series.year ?? ""}
          {series.year ? " · " : ""}
          {episodeCount} Episodes
        </div>
      </div>
    </Link>
  );
}