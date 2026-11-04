export type ContactLink = {
  id: "email" | "github" | "linkedin" | "instagram";
  label: string;
  handle: string;
  glyph: string;
  href: string;
};

export const CONTACTS: ContactLink[] = [
  {
    id: "email",
    label: "Email",
    handle: "baeeelll205",
    glyph: "@",
    href: "mailto:baeeelll205@gmail.com",
  },
  {
    id: "github",
    label: "GitHub",
    handle: "bael850",
    glyph: "GH",
    href: "https://github.com/bael850",
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    handle: "muhammad-iqbal-malik",
    glyph: "in",
    href: "https://www.linkedin.com/in/muhammad-iqbal-malik-95a6633a3/",
  },
  {
    id: "instagram",
    label: "Instagram",
    handle: "baeeelll1",
    glyph: "IG",
    href: "https://instagram.com/baeeelll1",
  },
];

export const OWNER_NAME = "Muhammad Iqbal Malik";

export type CvLink = {
  id: "writer" | "marketing";
  title: string;
  sub: string;
  href: string;
};

export const CVS: CvLink[] = [
  {
    id: "writer",
    title: "CV",
    sub: "Penulis",
    href: "/files/cv-writer-muhammad-iqbal-malik.pdf",
  },
  {
    id: "marketing",
    title: "CV",
    sub: "Digital Marketing",
    href: "/files/cv-digitalmarketing-muhammad-iqbal-malik.pdf",
  },
];
