import Link from "next/link";

export default function NotFound() {
  return (
    <main className="empty">
      <div className="container">
        <h1>Content not found</h1>
        <p>এই সিরিজটি পাওয়া যায়নি।</p>
        <Link className="btn btn-primary" href="/">Back Home</Link>
      </div>
    </main>
  );
}
