const PATHS: Record<string, string[]> = {
  home: ["M3 10.5 12 3l9 7.5", "M5.5 9.5V20a1 1 0 0 0 1 1h4v-6h3v6h4a1 1 0 0 0 1-1V9.5"],
  compass: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "m15.5 8.5-2 5-5 2 2-5 5-2Z"],
  hash: ["M9 3 7.5 21", "M16.5 3 15 21", "M3.5 8.5h17", "M3 15.5h17"],
  stack: ["M4 8.5h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-11Z", "M6.5 5.5h11", "M8.5 2.8h7"],
  bookmark: ["M6.5 3.5h11v17l-5.5-4-5.5 4z"],
  pen: ["M4 20h4l11-11-4-4L4 16v4Z", "M14.5 5.5l4 4"],
  chart: ["M4 20h16", "M7 20v-6", "M12 20V7", "M17 20v-9"],
  inbox: ["M3.5 13.5h4l1.5 3h6l1.5-3h4", "M3.5 13.5 6 4.5h12l2.5 9v6a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1v-6Z"],
  scale: ["M12 3.5v17", "M5 7.5h14", "m5 7.5-2.5 6h5Z", "m19 7.5-2.5 6h5Z", "M8 20.5h8"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z", "m16.2 16.2 4.3 4.3"],
  bell: ["M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z", "M13.7 20a2 2 0 0 1-3.4 0"],
  settings: [
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    "M19.1 13.8a7.6 7.6 0 0 0 0-3.6l2-1.6-2-3.4-2.4 1a7.6 7.6 0 0 0-3.1-1.8L13.2 2h-3.9l-.4 2.6a7.6 7.6 0 0 0-3.1 1.8l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3.6l-2 1.6 2 3.4 2.4-1a7.6 7.6 0 0 0 3.1 1.8l.4 2.6h3.9l.4-2.6a7.6 7.6 0 0 0 3.1-1.8l2.4 1 2-3.4-2-1.6Z",
  ],
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z", "M12 11v5.5", "M12 7.6v.5"],
  check: ["m4.5 12.5 5 5 10-11"],
  like: ["M12 20.5S3.5 15 3.5 9.3A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 8.5 1.7c0 5.7-8.5 11.2-8.5 11.2Z"],
  reply: ["M20.5 11.5c0 4-3.8 7.2-8.5 7.2a10 10 0 0 1-2.6-.35L4.5 20l1.3-3.6a6.8 6.8 0 0 1-2.3-4.9c0-4 3.8-7.2 8.5-7.2s8.5 3.2 8.5 7.2Z"],
  share: ["M12 15V4", "m8 7.5 4-3.5 4 3.5", "M5 13v6.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V13"],
  menu: ["M4 7h16", "M4 12h16", "M4 17h16"],
};

export default function Icon({ name, size = 22 }: { name: string; size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {(PATHS[name] ?? []).map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/** The mark: a pen nib, with the slit and vent that make it read as one. */
export function NibMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" className="nib">
      <rect width="28" height="28" rx="8" fill="var(--mark)" />
      <path d="M8.6 7.2h10.8v7.9a2 2 0 0 1-.36 1.15L14 23l-5.04-6.75a2 2 0 0 1-.36-1.15V7.2Z" fill="#fff" />
      <circle cx="14" cy="12.1" r="2.05" fill="var(--mark)" />
      <path d="M14 14.6V20.4" stroke="var(--mark)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const TONES = ["", "t2", "t3", "mark"];

function hashOf(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return h;
}

export function Avatar({
  name, handle, image, size = "sm",
}: { name: string | null; handle: string; image?: string | null; size?: "sm" | "md" | "lg" }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`avatar ${size}`} src={image} alt="" />;
  }
  const tone = TONES[hashOf(handle) % TONES.length];
  const initials = (name || handle).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return <span className={`avatar ${size} ${tone}`} aria-hidden="true">{initials}</span>;
}

/** A publication's tile, generated from its name so none has to upload one. */
export function PubTile({ name, slug, size = 84 }: { name: string; slug: string; size?: number }) {
  const tint = ["var(--t1)", "var(--t2)", "var(--t3)", "var(--mark)"][hashOf(slug) % 4];
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  return (
    <svg className="pubtile" width={size} height={size} viewBox="0 0 84 84" role="img" aria-label={name}>
      <rect width="84" height="84" rx="6" fill={tint} opacity="0.12" />
      <text
        x="42" y="54" textAnchor="middle" fontFamily="Newsreader, Georgia, serif"
        fontSize="34" fontWeight="700" fill={tint} opacity="0.85"
      >
        {initials}
      </text>
    </svg>
  );
}
