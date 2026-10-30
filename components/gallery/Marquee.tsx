const WORDS = [
  "cerpen",
  "sajak",
  "cerbung",
  "kukulutus",
  "foto",
  "rekomendasi",
];

export default function Marquee() {
  const row = (
    <div className="flex shrink-0 items-center">
      {WORDS.map((w) => (
        <span
          key={w}
          className="flex items-center gap-6 px-6 font-display text-3xl font-black uppercase tracking-tight text-ink md:text-5xl"
        >
          {w}
          <span className="font-serif text-4xl italic text-accent md:text-6xl">
            ✺
          </span>
        </span>
      ))}
    </div>
  );
  return (
    <div
      aria-hidden
      className="-rotate-1 overflow-hidden border-y-2 border-ink bg-lime py-3"
    >
      <div className="marquee-track">
        {row}
        {row}
      </div>
    </div>
  );
}
