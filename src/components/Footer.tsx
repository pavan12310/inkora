import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { NibMark } from "@/components/Icon";

const COLUMNS: [string, [string, string][]][] = [
  ["Read", [["Home", "/"], ["Explore", "/explore"], ["Topics", "/topics"], ["Publications", "/publications"]]],
  ["Write", [["Start a piece", "/write"], ["What gets published", "/about"], ["Your pieces", "/me"]]],
  ["The desk", [["The record", "/record"], ["About", "/about"], ["RSS", "/feed.xml"]]],
];

export default async function Footer() {
  const s = await getSettings();

  return (
    <footer className="site-footer">
      <div className="foot-inner">
        <div className="foot-brand">
          <NibMark size={26} />
          <p>
            {s.name} &mdash; {s.tagline}
          </p>
          <p className="foot-note">Every piece is read by an editor before it is published.</p>
        </div>

        <div className="foot-grid">
          {COLUMNS.map(([head, items]) => (
            <div className="foot-col" key={head}>
              <h3>{head}</h3>
              {items.map(([label, href]) =>
                href.startsWith("/feed") ? (
                  <a key={label} href={href}>{label}</a>
                ) : (
                  <Link key={label} href={href}>{label}</Link>
                )
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="foot-bar">
        <span>&copy; {new Date().getFullYear()} {s.name}</span>
        <Link href="/record">Moderation record</Link>
        <Link href="/about">About</Link>
      </div>
    </footer>
  );
}
