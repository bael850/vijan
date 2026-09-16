import { FaGithub, FaInstagram, FaLinkedinIn } from "react-icons/fa6";
import { FiMail } from "react-icons/fi";

// GANTI value di bawah ini dengan akun/email asli kamu.
const LINKS = [
  {
    label: "Email",
    href: "mailto:baeeelll205@gmail.com",
    icon: FiMail,
  },
  {
    label: "GitHub",
    href: "https://github.com/bael850",
    icon: FaGithub,
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/muhammad-iqbal-malik-95a6633a3/",
    icon: FaLinkedinIn,
  },
  {
    label: "Instagram",
    href: "https://instagram.com/baeeelll1",
    icon: FaInstagram,
  },
];

export default function SocialLinks({
  layout = "row",
  variant = "text",
  className = "",
}: {
  layout?: "row" | "stack";
  variant?: "text" | "icons";
  className?: string;
}) {
  if (variant === "icons") {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {LINKS.map((link) => (
          <a
            key={link.label}
            href={link.href}
            target={link.href.startsWith("mailto:") ? undefined : "_blank"}
            rel={
              link.href.startsWith("mailto:")
                ? undefined
                : "noopener noreferrer"
            }
            aria-label={link.label}
            className="group flex h-11 w-11 items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--accent-soft)] hover:text-[var(--accent-soft)]"
          >
            <link.icon size={16} />
          </a>
        ))}
      </div>
    );
  }

  return (
    <div
      className={`flex ${
        layout === "stack" ? "flex-col items-start gap-3" : "flex-row gap-6"
      } ${className}`}
    >
      {LINKS.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target={link.href.startsWith("mailto:") ? undefined : "_blank"}
          rel={
            link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"
          }
          className="text-xs text-neutral-500 underline decoration-neutral-700 underline-offset-4 transition-colors hover:text-[var(--accent-soft)] hover:decoration-[var(--accent-soft)]"
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
