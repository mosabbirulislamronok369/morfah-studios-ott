import type { Episode } from "@/data/catalog";
import { ExternalLink, Play } from "lucide-react";

export function EpisodeRow({ episode }: { episode: Episode }) {
  return (
    <div className="episode">
      <div className="episode-number">{episode.number}</div>
      <div className="episode-info">
        <div className="episode-title">{episode.title ?? `Episode ${episode.number}`}</div>
        <div className="card-meta">Watch on Telegram</div>
      </div>
      <div className="episode-actions">
        <a className="btn btn-primary" href={episode.telegramUrl} target="_blank" rel="noopener noreferrer">
          <Play size={16} fill="currentColor" /> Watch
        </a>
        {episode.youtubeUrl && (
          <a className="btn btn-ghost" href={episode.youtubeUrl} target="_blank" rel="noopener noreferrer">
            YouTube
          </a>
        )}
        {episode.facebookUrl && (
          <a className="btn btn-ghost" href={episode.facebookUrl} target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
        )}
        <a href={episode.telegramUrl} target="_blank" rel="noopener noreferrer" aria-label="Open Telegram">
          <ExternalLink size={18} />
        </a>
      </div>
    </div>
  );
}
