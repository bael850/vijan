import { ImageResponse } from "next/og";
import { OgCard, OG_SIZE } from "@/lib/og";

export const alt = "Vijan — An Ordinary People";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    <OgCard title="An Ordinary People" footer="Vijan" />,
    size,
  );
}
