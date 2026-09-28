export type ContentType = "series" | "movie" | "short_natok";

export type Episode = {
  id: string;
  number: number;
  title?: string;
  telegramUrl: string;
  youtubeUrl?: string;
  facebookUrl?: string;
};

export type Series = {
  id: string;
  title: string;
  originalTitle?: string;
  description: string;
  year?: number;
  genre: string[];
  poster: string;
  backdrop?: string;
  featured?: boolean;

  // এই line-টাই গুরুত্বপূর্ণ
  contentType?: ContentType;

  episodeCount?: number;
  episodes: Episode[];
};

export const fallbackCatalog: Series[] = [
  {
    id: "dark-boys-encore",
    title: "Dark Boys: Encore",
    description: "Morfah Studios-এর Dark Boys: Encore সিরিজ। ভিডিও Telegram-এ hosted এবং Watch চাপলে সরাসরি Telegram-এ playback হবে।",
    year: 2026,
    genre: ["Drama", "Mystery"],
    poster: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=700&q=85",
    backdrop: "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1800&q=85",
    featured: true,
    episodes: [
      {
        id: "dark-boys-encore-ep-01",
        number: 1,
        title: "Dark Boys: Encore Episode - 01",
        telegramUrl: "https://t.me/c/4427906462/3"
      }
    ]
  }
];
