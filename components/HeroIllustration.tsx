// Purely decorative — five concentric organic blobs (the classic
// "irregular border-radius" trick) each rotated a very different amount so
// their edges don't line up into a perfect, spinner-like circle. The corner
// spread on each border-radius is deliberately wide (not close to 50/50) —
// a near-circular shape barely changes silhouette when rotated, which is
// exactly what made an earlier pass read as flat concentric rings.
//
// The muted layer uses an explicit color-mix(), not a Tailwind opacity
// utility over the same green: an N%-opacity green painted directly on top
// of the fully opaque green beneath it blends to that same green regardless
// of N (blending a color with itself never changes it), so it was
// invisible and the illustration read as four bands instead of five.
// components/HeroIllustration.tsx
const BLOBS = [
  {
    sizePct: 100,
    background: "#F2B83F", // Saffron
    radius: "78% 22% 70% 30% / 30% 72% 22% 78%",
    rotate: -20,
  },
  {
    sizePct: 74,
    background: "#387D6D", // Green
    radius: "24% 76% 30% 70% / 72% 24% 78% 26%",
    rotate: 32,
  },
  {
    sizePct: 52,
    background: "color-mix(in srgb, #387D6D, white 55%)", // Muted Green
    radius: "74% 26% 66% 34% / 26% 74% 32% 68%",
    rotate: -40,
  },
  {
    sizePct: 35,
    background: "#F2B83F", // Saffron
    radius: "26% 74% 32% 68% / 76% 22% 70% 30%",
    rotate: 55,
  },
  {
    sizePct: 20,
    background: "#E6532B", // Terracotta
    radius: "68% 32% 60% 40% / 34% 68% 28% 72%",
    rotate: -8,
  },
] as const;

export function HeroIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto aspect-square w-full max-w-[520px] mb-9"
    >
      {/* Clipped frame containing the five layers */}
      <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
        {BLOBS.map((blob, i) => (
          <div
            key={i}
            className="absolute inset-0 m-auto"
            style={{
              width: `${blob.sizePct}%`,
              height: `${blob.sizePct}%`,
              borderRadius: blob.radius,
              transform: `rotate(${blob.rotate}deg)`,
              background: blob.background,
            }}
          />
        ))}
      </div>

      {/* Overlapping lower-left informational note */}
      <div className="absolute -bottom-8 -left-6 w-48 -rotate-8 rounded-xl bg-[#FFFDF9] p-4 shadow-lg border border-[#E8DED2]">
        <p className="text-[10px] font-semibold tracking-widest text-[#E6532B] uppercase font-mono">
          CHOWLY PROMISE
        </p>
        <p className="font-serif text-lg text-[#2B1D35] italic leading-tight mt-0.5">
          We&apos;ve got you.
        </p>
      </div>
    </div>
  );
}
