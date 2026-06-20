"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, GraduationCap, Quote } from "lucide-react";

type AlumniVoice = {
  name: string;
  role: string;
  affiliation: string;
  quote: string;
  initials: string;
  imageUrl?: string;
};

export function AlumniVoicesShowcase({ voices }: { voices: AlumniVoice[] }) {
  const [activeIndex, setActiveIndex] = useState(1);
  const activeVoice = voices[activeIndex] ?? voices[0];

  function goToPrevious() {
    setActiveIndex((current) =>
      current === 0 ? voices.length - 1 : current - 1,
    );
  }

  function goToNext() {
    setActiveIndex((current) =>
      current === voices.length - 1 ? 0 : current + 1,
    );
  }

  useEffect(() => {
    if (voices.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) =>
        current === voices.length - 1 ? 0 : current + 1,
      );
    }, 5500);

    return () => window.clearInterval(timer);
  }, [voices.length]);

  function renderAvatar(
    voice: AlumniVoice,
    sizeClass: string,
    textClass: string,
  ) {
    return (
      <span
        className={`${sizeClass} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[hsl(var(--cream))] bg-[linear-gradient(135deg,hsl(var(--sage)),hsl(var(--sunlit)))] p-1 shadow-sm`}
      >
        {voice.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={voice.imageUrl}
            alt={voice.name}
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <span
            className={`${textClass} flex h-full w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,hsl(var(--primary)),hsl(var(--terracotta)))] font-bold text-white`}
          >
            {voice.initials}
          </span>
        )}
      </span>
    );
  }

  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--cream))_28%,hsl(var(--card))_64%,hsl(var(--background))_100%)] py-12 text-center sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative overflow-hidden px-5 py-8 sm:px-10 sm:py-10">
          <div className="mx-auto max-w-5xl">
            <div className="flex items-center justify-center gap-5">
              <span
                className="hidden h-px w-36 bg-[hsl(var(--terracotta))]/30 sm:block"
                aria-hidden="true"
              />
              <p className="text-xs font-bold uppercase tracking-[0.32em] text-primary sm:text-sm">
                Alumni Voices / Testimonials
              </p>
              <span
                className="hidden h-px w-36 bg-[hsl(var(--terracotta))]/30 sm:block"
                aria-hidden="true"
              />
            </div>
            <div className="mx-auto mt-3 flex h-10 w-10 items-center justify-center rounded-full border border-[hsl(var(--terracotta))]/20 bg-[hsl(var(--cream))] text-[hsl(var(--terracotta))]">
              <GraduationCap className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2 className="mt-2 font-serif text-3xl font-semibold leading-tight tracking-normal text-primary sm:text-4xl">
              Voices From Our Community
            </h2>
            <p className="mx-auto mt-3 max-w-3xl text-sm leading-6 text-foreground/72 sm:text-base">
              Real experiences and thoughts from our respected alumni and
              well-wishers.
            </p>
          </div>

          <div className="relative mx-auto mt-7 max-w-6xl">
            <button
              type="button"
              className="absolute -left-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-primary shadow-lg shadow-primary/10 transition hover:-translate-x-1 hover:border-primary sm:-left-6 sm:h-12 sm:w-12"
              onClick={goToPrevious}
              aria-label="Previous voice"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden="true" />
            </button>

            <article className="relative grid min-h-[300px] overflow-hidden rounded-md border bg-card px-6 py-7 text-left shadow-sm sm:px-9 lg:grid-cols-[1fr_330px] lg:px-12 lg:py-9">
              <div className="flex flex-col justify-center lg:pr-10">
                <Quote
                  className="h-9 w-9 rotate-180 fill-current text-[hsl(var(--terracotta))]"
                  aria-hidden="true"
                />
                <blockquote className="mt-4 font-serif text-xl leading-8 tracking-normal text-foreground sm:text-2xl sm:leading-10">
                  {activeVoice.quote}
                </blockquote>
                <Quote
                  className="ml-auto mt-1 h-8 w-8 fill-current text-[hsl(var(--terracotta))]"
                  aria-hidden="true"
                />
              </div>

              <div className="mt-7 flex flex-col items-center justify-center border-t pt-7 text-center lg:mt-0 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                {renderAvatar(
                  activeVoice,
                  "h-32 w-32 sm:h-36 sm:w-36",
                  "text-4xl",
                )}
                <h3 className="mt-5 text-xl font-bold tracking-normal text-primary sm:text-2xl">
                  {activeVoice.name}
                </h3>
                <p className="mt-2 text-sm leading-6 text-foreground/78 sm:text-base">
                  {activeVoice.role}
                </p>
                <p className="text-sm font-medium leading-6 text-foreground/90 sm:text-base">
                  {activeVoice.affiliation}
                </p>
              </div>

              <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center justify-center gap-3">
                {voices.map((voice, index) => (
                  <button
                    key={voice.name}
                    type="button"
                    className={`h-3 w-3 rounded-full transition ${
                      activeIndex === index
                        ? "bg-primary"
                        : "bg-[hsl(var(--border))] hover:bg-primary/35"
                    }`}
                    onClick={() => setActiveIndex(index)}
                    aria-label={`Show ${voice.name}`}
                  />
                ))}
              </div>
            </article>

            <button
              type="button"
              className="absolute -right-3 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border bg-card text-primary shadow-lg shadow-primary/10 transition hover:translate-x-1 hover:border-primary sm:-right-6 sm:h-12 sm:w-12"
              onClick={goToNext}
              aria-label="Next voice"
            >
              <ChevronRight className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="mx-auto mt-6 grid max-w-5xl gap-3 lg:grid-cols-3">
            {voices.map((voice, index) => (
              <button
                key={voice.name}
                type="button"
                className={`grid grid-cols-[58px_1fr] items-center gap-3 rounded-md p-3 text-left transition ${
                  activeIndex === index
                    ? "border border-primary bg-card shadow-md shadow-primary/10"
                    : "border border-transparent bg-transparent hover:border-primary/30 hover:bg-card/72"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                {renderAvatar(voice, "h-12 w-12", "text-xs")}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-primary">
                    {voice.name}
                  </span>
                  <span className="mt-1 block truncate text-xs leading-5 text-foreground/78">
                    {voice.role}
                  </span>
                  <span className="block truncate text-xs leading-5 text-foreground/78">
                    {voice.affiliation}
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div
            className="pointer-events-none mx-auto mt-8 hidden h-16 max-w-xl opacity-25 sm:block"
            aria-hidden="true"
          >
            <div className="mx-auto h-full w-full overflow-hidden">
              <div className="mx-auto grid h-full max-w-md grid-cols-[1fr_1.6fr_1fr] items-end gap-2 text-[hsl(var(--terracotta))]/35">
                <div className="h-8 border-x border-t" />
                <div className="h-14 border-x border-t" />
                <div className="h-8 border-x border-t" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
