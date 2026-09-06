import Link from "next/link";

/**
 * Shell for the coming-soon and legal pages.
 *
 * Content is hardcoded here for now; M7 moves it to `store_cms_content` so the
 * owners can edit it in admin without a deploy. The routes exist from day one
 * because a footer or nav link that 404s reads as an abandoned shop.
 */
export function StaticPage({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="wrap" style={{ padding: "40px 0 64px", maxWidth: 720 }}>
      <h1 style={{ fontSize: "clamp(28px, 6vw, 40px)" }}>{title}</h1>
      {lead ? (
        <p className="muted" style={{ fontSize: 18, marginTop: 10 }}>
          {lead}
        </p>
      ) : null}
      <div style={{ marginTop: 24, lineHeight: 1.7 }}>{children}</div>
    </div>
  );
}

export function ComingSoon({
  title,
  lead,
  detail,
  cmsHtml,
}: {
  title: string;
  lead: string;
  detail: string;
  /** Admin-managed copy. Falls back to `detail` when nothing is set. */
  cmsHtml?: string | null;
}) {
  return (
    <StaticPage title={title} lead={lead}>
      <div className="notice">
        <strong>Coming soon</strong>
        {cmsHtml ? (
          <div className="muted" style={{ marginTop: 6 }} dangerouslySetInnerHTML={{ __html: cmsHtml }} />
        ) : (
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {detail}
          </p>
        )}
      </div>
      <p style={{ marginTop: 24 }}>
        <Link href="/shop" className="btn btn--secondary" style={{ width: "auto" }}>
          Shop charms instead
        </Link>
      </p>
    </StaticPage>
  );
}
