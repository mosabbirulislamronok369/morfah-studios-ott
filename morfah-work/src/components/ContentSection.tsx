import type { ReactNode } from "react";
import Link from "next/link";

type ContentSectionProps = {
  title: string;
  subtitle?: string;
  href?: string;
  children?: ReactNode;
  empty?: boolean;
};

export function ContentSection({
  title,
  subtitle,
  href = "#",
  children,
  empty = false,
}: ContentSectionProps) {
  return (
    <section className="section content-section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>{title}</h2>
            {subtitle && <div className="muted">{subtitle}</div>}
          </div>

          <Link className="view-all" href={href}>
            View All →
          </Link>
        </div>

        {empty ? (
          <div className="category-empty">
            <span>Coming soon</span>
          </div>
        ) : (
          <div className="grid">{children}</div>
        )}
      </div>
    </section>
  );
}
