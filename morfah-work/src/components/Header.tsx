import Link from "next/link";
import { Search } from "lucide-react";

export function Header() {
  return (
    <header className="header">
      <div className="container header-inner">
        <Link href="/" className="logo">MORFAH STUDIOS</Link>
        <nav className="nav">
          <Link href="/">Home</Link>
          <Link href="/search"><Search size={17} /> Search</Link>
        </nav>
      </div>
    </header>
  );
}
