import RightRail from "@/components/RightRail";

/** Browsing pages: reading column plus the highlights rail on wide screens. */
export default function FeedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout">
      <main id="content" className="feed">{children}</main>
      <RightRail />
    </div>
  );
}
