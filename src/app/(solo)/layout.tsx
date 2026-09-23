/** Reading and working pages: the full width, no rail competing for attention. */
export default function SoloLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="layout solo">
      <main id="content" className="feed">{children}</main>
    </div>
  );
}
