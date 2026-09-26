import Link from "next/link";
import type { Series } from "@/data/catalog";

export function SeriesCard({ series }: { series: Series }) {
  return (
    <Link className="card" href={`/series?id=${encodeURIComponent(series.id)}`}>
      <img className="poster" src={series.poster} alt={series.title} />
      <div className="card-title">{series.title}</div>
      <div className="card-meta">{series.year ?? ""}{series.year ? " · " : ""}{series.episodes.length} Episodes</div>
    </Link>
  );
}
