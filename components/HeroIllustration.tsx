const BLOBS = [
  { sizePct: 100, colorClass: "bg-saffron", radius: "58% 42% 63% 37% / 41% 56% 44% 59%", rotate: -12 },
  { sizePct: 76, colorClass: "bg-green", radius: "38% 62% 42% 58% / 58% 40% 60% 42%", rotate: 18 },
  { sizePct: 57, colorClass: "bg-green opacity-60", radius: "63% 37% 55% 45% / 35% 65% 38% 62%", rotate: -9 },
  { sizePct: 41, colorClass: "bg-saffron", radius: "34% 66% 40% 60% / 62% 35% 68% 32%", rotate: 22 },
  { sizePct: 27, colorClass: "bg-terracotta", radius: "62% 38% 58% 42% / 40% 63% 35% 65%", rotate: -14 },
] as const;



export function HeroIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative mx-auto hidden md:block md:h-[520px] md:w-[520px]"
    >
      {BLOBS.map((blob, i) => (
        <div
          key={i}
          className={`absolute inset-0 m-auto ${blob.colorClass}`}
          style={{
            width: `${blob.sizePct}%`,
            height: `${blob.sizePct}%`,
            borderRadius: blob.radius,
            transform: `rotate(${blob.rotate}deg)`,
          }}
        />
      ))}

      <div className="absolute -bottom-8 -left-6 w-48 rotate-[-8deg] rounded-xl bg-cream p-4 shadow-lg">
        <p className="text-xs font-semibold tracking-widest text-terracotta uppercase">
          Ready in 20 min
        </p>
        <p className="font-serif text-base text-ink">We&apos;ve got you.</p>
      </div>
    </div>
  );
}