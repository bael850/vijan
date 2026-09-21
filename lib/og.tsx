// Kartu preview link (WhatsApp, Telegram, X, dll). Sengaja polos: latar gelap,
// judul besar. Satori (renderer di balik next/og) mewajibkan display:flex
// pada elemen yang punya lebih dari satu anak.

export const OG_SIZE = { width: 1200, height: 630 };

export function OgCard({
  eyebrow,
  title,
  footer = "Vijan — An Ordinary People",
}: {
  eyebrow?: string;
  title: string;
  footer?: string;
}) {
  const shortTitle = title.length > 90 ? title.slice(0, 87) + "…" : title;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background: "linear-gradient(135deg, #142236 0%, #05070d 60%)",
        color: "#f2f3f5",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 28,
          letterSpacing: 6,
          textTransform: "uppercase",
          color: "#b9cfff",
        }}
      >
        {eyebrow ?? " "}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: shortTitle.length > 45 ? 68 : 88,
          lineHeight: 1.05,
          fontWeight: 700,
        }}
      >
        {shortTitle}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 28,
          letterSpacing: 4,
          textTransform: "uppercase",
          color: "#8a8f98",
        }}
      >
        {footer}
      </div>
    </div>
  );
}
