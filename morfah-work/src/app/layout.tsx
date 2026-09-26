import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Morfah Studios",
  description: "Morfah Studios official OTT showcase",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="bn">
      <body>
        <Header />
        {children}
        <footer className="footer">
          <div className="container">© 2026 Morfah Studios. All rights reserved.</div>
        </footer>
      </body>
    </html>
  );
}
