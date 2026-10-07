"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Speaker = {
  id: number;
  name: string;
  photoUrl?: string;
  bio?: string;
  videoCount: number;
};

type Collection = {
  id: number;
  speakerId: number;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  videoCount: number;
};

type Course = {
  id: number;
  title: string;
  slug: string;
  description?: string;
  coverImage?: string;
  videoCount: number;
};

type SalafiVideo = {
  id: number;
  title: string;
  description?: string;
  thumbnail?: string;
  speakerName?: string;
  collectionTitle?: string;
  courseTitle?: string;
  telegramUrl: string;
  youtubeUrl?: string;
  contentType: string;
};

const fallbackImage =
  "https://images.unsplash.com/photo-1507692049790-de58290a4334?auto=format&fit=crop&w=900&q=80";

const workerUrl =
  process.env.NEXT_PUBLIC_WORKER_URL ||
  "https://morfah-studios-ott.track-social-hub.workers.dev";

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${workerUrl}${path}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`API ${response.status}`);
  }

  return (await response.json()) as T;
}

function CardImage({
  src,
  alt,
}: {
  src?: string;
  alt: string;
}) {
  return (
    <div className="card-image-wrap">
      <img
        className="poster"
        src={src || fallbackImage}
        alt={alt}
        loading="lazy"
      />
    </div>
  );
}

export default function SalafiDawahPage() {
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [videos, setVideos] = useState<SalafiVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;

    Promise.all([
      getJson<Speaker[]>("/api/salafi/speakers"),
      getJson<Collection[]>("/api/salafi/collections"),
      getJson<Course[]>("/api/salafi/courses"),
      getJson<SalafiVideo[]>("/api/salafi/videos"),
    ])
      .then(([speakerRows, collectionRows, courseRows, videoRows]) => {
        if (!alive) return;
        setSpeakers(speakerRows);
        setCollections(collectionRows);
        setCourses(courseRows);
        setVideos(videoRows);
      })
      .catch(() => {
        if (alive) {
          setError(
            "Salafi data load হচ্ছে না। Worker deploy/webhook/API check করুন।"
          );
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const specialVideos = videos.filter(
    (v) => v.contentType === "special_video"
  );

  const liveVideos = videos.filter(
    (v) => v.contentType === "live"
  );

  return (
    <main className="dawah-page">
      <section className="dawah-hero">
        <div className="container">
          <div className="platform-kicker">
            Salafi Dawah Platform
          </div>
          <h1>ইসলামী জ্ঞান ও দাওয়াহ</h1>
          <p>
            Telegram থেকে publish করা speakers, series,
            courses, special videos এবং live programmes
            এখানে automatically দেখাবে।
          </p>
        </div>
      </section>

      <div className="container">
        {loading && (
          <div className="dawah-empty">
            Telegram/D1 data loading...
          </div>
        )}

        {error && (
          <div className="dawah-empty">
            {error}
          </div>
        )}

        <section className="dawah-section">
          <div className="dawah-section-head">
            <div>
              <h2>Speakers</h2>
              <p>আমাদের বক্তাদের content</p>
            </div>
          </div>

          <div className="dawah-card-grid">
            {speakers.map((speaker) => (
              <Link
                key={speaker.id}
                className="dawah-card"
                href={`/salafi-dawah/speaker?id=${speaker.id}`}
              >
                <CardImage
                  src={speaker.photoUrl}
                  alt={speaker.name}
                />
                <h3>{speaker.name}</h3>
                <p>{speaker.videoCount} Videos</p>
              </Link>
            ))}
          </div>

          {!loading && !speakers.length && (
            <p className="dawah-empty">
              Telegram-এ Speaker post করলে এখানে দেখা যাবে।
            </p>
          )}
        </section>

        <section className="dawah-section">
          <div className="dawah-section-head">
            <div>
              <h2>Series</h2>
              <p>বিষয়ভিত্তিক ধারাবাহিক আলোচনা</p>
            </div>
          </div>

          <div className="dawah-card-grid">
            {collections.map((item) => (
              <Link
                key={item.id}
                className="dawah-card dawah-card-series"
                href={`/salafi-dawah/series?id=${item.id}`}
              >
                <CardImage
                  src={item.coverImage}
                  alt={item.title}
                />
                <h3>{item.title}</h3>
                <p>{item.videoCount} Videos</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="dawah-section">
          <div className="dawah-feature-grid">
            <Link
              className="dawah-feature-card"
              href="/salafi-dawah/special-videos"
            >
              <span>▶</span>
              <h2>Special Videos</h2>
              <p>{specialVideos.length} Videos</p>
            </Link>

            <Link
              className="dawah-feature-card"
              href="/salafi-dawah/live"
            >
              <span>●</span>
              <h2>Live Programme</h2>
              <p>{liveVideos.length} Videos</p>
            </Link>
          </div>
        </section>

        <section className="dawah-section">
          <div className="dawah-section-head">
            <div>
              <h2>Courses</h2>
              <p>ধাপে ধাপে ইসলামিক শিক্ষা</p>
            </div>
          </div>

          <div className="dawah-card-grid">
            {courses.map((course) => (
              <Link
                key={course.id}
                className="dawah-card dawah-course-card"
                href={`/salafi-dawah/course?id=${course.id}`}
              >
                <CardImage
                  src={course.coverImage}
                  alt={course.title}
                />
                <h3>{course.title}</h3>
                <p>{course.videoCount} Classes</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="dawah-section">
          <div className="dawah-section-head">
            <div>
              <h2>Latest Videos</h2>
              <p>সর্বশেষ Telegram uploads</p>
            </div>
          </div>

          <div className="dawah-video-list">
            {videos.slice(0, 12).map((video) => (
              <a
                key={video.id}
                className="dawah-video-row"
                href={video.youtubeUrl || video.telegramUrl}
                target="_blank"
                rel="noreferrer"
              >
                <CardImage
                  src={video.thumbnail}
                  alt={video.title}
                />
                <div>
                  <h3>{video.title}</h3>
                  <p>
                    {video.speakerName ||
                      video.courseTitle ||
                      video.contentType}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        <div className="dawah-back">
          <Link href="/">← Back to Platforms</Link>
        </div>
      </div>
    </main>
  );
}
