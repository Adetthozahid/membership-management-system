import type { Metadata } from "next";
import Link from "next/link";
import { APP_NAME } from "@mms/shared";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Handshake,
  ShieldCheck,
} from "lucide-react";
import { AlumniVoicesShowcase } from "@/components/public/alumni-voices-showcase";
import { HomeGalleryLightbox } from "@/components/public/home-gallery-lightbox";
import { HomeUpdatesTabs } from "@/components/public/home-updates-tabs";
import { HomeHeroSlider } from "@/components/public/home-hero-slider";
import { Button } from "@/components/ui/button";
import { getPublicCollection, getPublicSite } from "@/lib/api";
import type { PublicGalleryAlbum } from "@mms/shared";

export const metadata: Metadata = {
  title: "Home",
  description: "Official website for the Sociology Alumni Association of SUST.",
};

export const dynamic = "force-dynamic";

const defaultMessage =
  "We are graduates of Sociology, SUST working together to build friendship, cooperation, mutual understanding, and academic excellence in collaboration with the department.";

const sampleEvents = [
  {
    id: "sample-reunion-2025",
    title: "Alumni Reunion 2025",
    slug: "alumni-reunion-2025",
    summary: "Reconnect with batchmates and celebrate our journey together.",
    startsAt: "2025-06-14T10:00:00+06:00",
    publishedAt: null,
    location: "SUST Campus, Sylhet",
    demo: true,
  },
  {
    id: "sample-career-talk-03",
    title: "Career Talk Series - 03",
    slug: "career-talk-series-03",
    summary: "Insights from alumni working in different fields.",
    startsAt: "2025-07-05T18:00:00+06:00",
    publishedAt: null,
    location: "Online (Google Meet)",
    demo: true,
  },
  {
    id: "sample-department-picnic-2025",
    title: "Department Picnic 2025",
    slug: "department-picnic-2025",
    summary: "A day of fun, food and memories.",
    startsAt: "2025-08-22T09:00:00+06:00",
    publishedAt: null,
    location: "Madhabkunda, Sylhet",
    demo: true,
  },
];

const fallbackGalleryPhotos = [
  {
    id: "fallback-gallery-main-gate",
    title: "SUST alumni gathering",
    thumbnailUrl: "/images/home-hero.png",
    caption: null,
    albumTitle: "Gallery",
  },
  {
    id: "fallback-gallery-campus",
    title: "Campus program",
    thumbnailUrl: "/images/home-hero-campus.png",
    caption: null,
    albumTitle: "Gallery",
  },
  {
    id: "fallback-gallery-networking",
    title: "Networking session",
    thumbnailUrl: "/images/home-hero-networking.png",
    caption: null,
    albumTitle: "Gallery",
  },
  {
    id: "fallback-gallery-building",
    title: "Academic program",
    thumbnailUrl: "/images/sust-slider-academic-building.jpg",
    caption: null,
    albumTitle: "Gallery",
  },
  {
    id: "fallback-gallery-pond",
    title: "Campus memories",
    thumbnailUrl: "/images/sust-about-pond.png",
    caption: null,
    albumTitle: "Gallery",
  },
  {
    id: "fallback-gallery-memorial",
    title: "SUST memorial",
    thumbnailUrl: "/images/sust-slider-memorial.jpg",
    caption: null,
    albumTitle: "Gallery",
  },
  {
    id: "fallback-gallery-slider",
    title: "Campus life",
    thumbnailUrl: "/images/sust-slider-campus-building.jpg",
    caption: null,
    albumTitle: "Gallery",
  },
];

type AlumniVoice = {
  id?: string;
  name: string;
  role: string;
  affiliation: string;
  quote: string;
  initials: string;
  imageUrl?: string;
  published?: boolean;
  sortOrder?: number;
};

type HomeHeroSlide = {
  id: string;
  eyebrow: string;
  eyebrowIcon: string;
  eyebrowVisible: boolean;
  title: string;
  body: string;
  imageUrl: string;
  imagePosition: string;
  primaryLabel?: string | null;
  primaryHref?: string | null;
  secondaryLabel?: string | null;
  secondaryHref?: string | null;
  tertiaryLabel?: string | null;
  tertiaryHref?: string | null;
  accentClass: string;
  published: boolean;
  sortOrder: number;
};

const fallbackAlumniVoices: AlumniVoice[] = [
  {
    name: "Alumni Member",
    role: "Sociology Graduate",
    affiliation: "SUST",
    initials: "AM",
    imageUrl: "/images/demo-alumni-professor.png",
    quote:
      "This association helps former students stay connected with the department, classmates, and the wider alumni community.",
  },
  {
    name: "Community Volunteer",
    role: "Association Contributor",
    affiliation: "Sociology Alumni Association of SUST",
    initials: "CV",
    imageUrl: "/images/demo-alumni-professor.png",
    quote:
      "A strong alumni network can support mentorship, events, career guidance, and meaningful collaboration across batches.",
  },
  {
    name: "Former Student",
    role: "Department of Sociology",
    affiliation: "Shahjalal University of Science and Technology",
    initials: "FS",
    imageUrl: "/images/demo-alumni-professor.png",
    quote:
      "The platform creates a shared place for memories, notices, verified member records, and future initiatives.",
  },
];

export default async function HomePage() {
  const [site, gallery, voices, heroSlideData] = await Promise.all([
    getPublicSite().catch(() => null),
    getPublicCollection<PublicGalleryAlbum>("/public/gallery", { cache: "no-store" }).catch(
      () => null,
    ),
    getPublicCollection<AlumniVoice>("/public/testimonials", { cache: "no-store" }).catch(
      () => null,
    ),
    getPublicCollection<HomeHeroSlide>("/public/home-hero-slides", { cache: "no-store" }).catch(
      () => null,
    ),
  ]);
  const organization = site?.organization ?? {
    name: APP_NAME,
    message: defaultMessage,
    email: null,
    phone: null,
    address: null,
  };
  const notices = site?.notices.items.slice(0, 3) ?? [];
  const events = site?.events.items.slice(0, 3) ?? [];
  const galleryPhotos =
    gallery?.items
      .filter((album) => album.published)
      .flatMap((album) =>
        album.photos.filter((photo) => photo.published).map((photo) => ({
          ...photo,
          albumTitle: album.title,
        })),
      )
      .slice(0, 7) ?? [];
  const displayEvents = events.length
    ? events.map((event) => ({ ...event, demo: false }))
    : sampleEvents;
  const displayGalleryPhotos = [
    ...galleryPhotos,
    ...fallbackGalleryPhotos.filter(
      (fallbackPhoto) =>
        !galleryPhotos.some((photo) => photo.id === fallbackPhoto.id),
    ),
  ].slice(0, 7);
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const fallbackHeroSlides = [
    {
      eyebrow: "SUST Sociology alumni network",
      title: "SUST Sociology Alumni|Stay Connected",
      body: organization.message || defaultMessage,
      image: "/images/sust-slider-main-gate.jpg",
      position: "center center",
      accent: "bg-[hsl(var(--cream))]",
    },
    {
      eyebrow: "SUST campus memory",
      title: "Rooted in memory, united for the future.",
      body: "A shared platform for former students to stay connected with classmates, the department, and the university community.",
      image: "/images/sust-slider-memorial.jpg",
      position: "center center",
      accent: "bg-[hsl(var(--terracotta))]",
    },
    {
      eyebrow: "Membership and verification",
      title: "One trusted record for every alumnus.",
      body: "Apply for membership, verify alumni identity, and keep a safe public profile connected to the association.",
      image: "/images/sust-slider-academic-building.jpg",
      position: "center center",
      accent: "bg-primary",
    },
    {
      eyebrow: "Programs, notices, and collaboration",
      title: "Stay close to campus and community.",
      body: "Follow association notices, upcoming events, reunions, academic programs, and alumni initiatives from one place.",
      image: "/images/sust-slider-campus-building.jpg",
      position: "center center",
      accent: "bg-[hsl(var(--terracotta))]",
    },
  ];
  const heroSlides =
    heroSlideData?.items.length
      ? heroSlideData.items.map((slide) => ({
          id: slide.id,
          eyebrow: slide.eyebrow,
          eyebrowIcon: slide.eyebrowIcon,
          eyebrowVisible: slide.eyebrowVisible,
          title: slide.title,
          body: slide.body,
          image: mediaUrl(slide.imageUrl),
          position: slide.imagePosition || "center center",
          accent: slide.accentClass || "bg-[hsl(var(--cream))]",
          primaryLabel: slide.primaryLabel,
          primaryHref: slide.primaryHref,
          secondaryLabel: slide.secondaryLabel,
          secondaryHref: slide.secondaryHref,
          tertiaryLabel: slide.tertiaryLabel,
          tertiaryHref: slide.tertiaryHref,
        }))
      : fallbackHeroSlides;
  const heroStats = [
    {
      label: "Public alumni records",
      value: site?.stats.membersTotal ?? 0,
      icon: "members" as const,
    },
    {
      label: "Active members",
      value: site?.stats.activeMembers ?? 0,
      icon: "active" as const,
    },
    {
      label: "Upcoming programs",
      value: events.length,
      icon: "events" as const,
    },
  ];

  const sponsors = site?.sponsors ?? [];

  function mediaUrl(url: string | null | undefined) {
    if (!url) return "";
    if (url.startsWith("/images/")) return url;
    return url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
  }
  const displayAlumniVoices =
    voices?.items.length
      ? voices.items.map((voice) => ({
          ...voice,
          initials: voice.initials || voice.name.slice(0, 2).toUpperCase(),
          imageUrl: voice.imageUrl ? mediaUrl(voice.imageUrl) : undefined,
        }))
      : fallbackAlumniVoices;

  return (
    <div className="space-y-16">
      <HomeHeroSlider slides={heroSlides} stats={heroStats} />

      <section className="relative left-1/2 right-1/2 -mx-[50vw] !mt-0 w-screen overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--sky))_46%,hsl(var(--sunlit))_100%)] py-14 sm:py-18">
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:items-center">
          <div className="pt-8 lg:pt-0">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-primary">
              About Us
            </p>
            <div className="mt-4 flex items-center gap-2" aria-hidden="true">
              <span className="h-0.5 w-12 bg-[hsl(var(--terracotta))]" />
              <span className="h-1.5 w-1.5 rounded-sm bg-[hsl(var(--terracotta))]" />
            </div>
            <h2 className="mt-6 max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-normal text-primary sm:text-5xl">
              Connecting former students through{" "}
              <span className="text-[hsl(var(--terracotta))]">
                friendship, cooperation,
              </span>{" "}
              and shared resources.
            </h2>
            <div
              className="my-7 flex items-center gap-4 text-primary/70"
              aria-hidden="true"
            >
              <span className="h-px flex-1 bg-primary/35" />
              <Handshake className="h-5 w-5 text-primary" />
              <span className="h-px flex-1 bg-primary/35" />
            </div>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground">
              {organization.message || defaultMessage}
            </p>
            <div className="mt-8 divide-y rounded-md border-y border-primary/15 bg-white/48 px-4 shadow-sm shadow-primary/5">
              {[
                {
                  title: "Non-political alumni community",
                  body: "A community built on unity, respect, and shared values beyond politics.",
                  icon: Handshake,
                  tone: "primary",
                },
                {
                  title: "Membership and verified records",
                  body: "Secure membership system and verified records for all alumni.",
                  icon: ShieldCheck,
                  tone: "terracotta",
                },
                {
                  title: "Department collaboration",
                  body: "Working hand in hand with the department for academic excellence.",
                  icon: BookOpen,
                  tone: "terracotta",
                },
                {
                  title: "Events, notices, and resources",
                  body: "Stay updated with notices, events, and useful academic resources.",
                  icon: CalendarDays,
                  tone: "primary",
                },
              ].map((item) => {
                const Icon = item.icon;
                const isTerracotta = item.tone === "terracotta";
                return (
                  <div
                    key={item.title}
                    className="grid gap-4 py-4 sm:grid-cols-[46px_1fr] sm:items-start"
                  >
                    <span
                      className={`flex h-10 w-10 items-center justify-center rounded-md ${
                        isTerracotta
                          ? "bg-[hsl(var(--terracotta))]/12 text-[hsl(var(--terracotta))]"
                          : "bg-primary/10 text-primary"
                      }`}
                    >
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span className="grid gap-1 sm:grid-cols-[0.76fr_1fr] sm:gap-5">
                      <span className="font-serif text-xl font-semibold leading-7 tracking-normal text-primary">
                        {item.title}
                      </span>
                      <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
            <Button
              asChild
              className="mt-8 bg-primary px-7 text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
              <Link href="/about">
                About the Association
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <div
              className="absolute -left-2 top-6 h-[72%] w-28 rounded-md bg-primary sm:w-36"
              aria-hidden="true"
            />
            <div
              className="absolute bottom-8 right-0 h-24 w-44 rounded-md bg-[hsl(var(--terracotta))]"
              aria-hidden="true"
            />
            <div className="relative ml-4 mt-8 overflow-hidden rounded-md rounded-tl-[56px] rounded-br-[56px] border-8 border-[hsl(var(--cream))] bg-primary shadow-2xl shadow-primary/20 sm:ml-8 lg:mt-0">
              <div
                className="aspect-[1.08/1] bg-[url('/images/sust-about-pond.png')] bg-cover bg-center"
                style={{ backgroundPosition: "center 58%" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/34 via-transparent to-transparent" />
            </div>
            <div className="absolute -bottom-7 left-0 flex h-32 w-32 items-center justify-center rounded-full border-8 border-[hsl(var(--cream))] bg-primary text-center text-[hsl(var(--cream))] shadow-xl sm:left-2 sm:h-36 sm:w-36">
              <div>
                <BookOpen className="mx-auto h-8 w-8" aria-hidden="true" />
                <p className="mt-2 text-[10px] font-semibold uppercase leading-4 tracking-[0.18em] sm:text-[11px]">
                  SUST Sociology Alumni
                </p>
              </div>
            </div>
            <div
              className="absolute -bottom-12 left-44 hidden grid-cols-5 gap-2 sm:grid"
              aria-hidden="true"
            >
              {Array.from({ length: 20 }).map((_, dotIndex) => (
                <span
                  key={dotIndex}
                  className="h-1 w-1 rounded-sm bg-primary/75"
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative left-1/2 right-1/2 -mx-[50vw] !mt-0 w-screen overflow-hidden border-t border-primary/10 bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(var(--card))_24%,hsl(var(--sage))_100%)] py-14 shadow-[inset_0_1px_0_hsl(var(--card)/0.8)] sm:py-16">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 sm:px-6 lg:grid-cols-2 lg:items-stretch">
          <HomeUpdatesTabs events={displayEvents} notices={notices} />

          <div className="rounded-md border bg-card p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-semibold tracking-normal text-primary">
                Gallery
              </h2>
              <Button asChild variant="outline" className="h-10 px-4">
                <Link href="/gallery">
                  View all
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </Button>
            </div>
            <HomeGalleryLightbox
              photos={displayGalleryPhotos.map((photo) => ({
                id: photo.id,
                title: photo.title,
                imageUrl: mediaUrl(photo.thumbnailUrl),
                caption: photo.caption,
                albumTitle: photo.albumTitle,
              }))}
            />
          </div>
        </div>
      </section>

      <AlumniVoicesShowcase voices={displayAlumniVoices} />

      <section className="rounded-md border bg-[linear-gradient(135deg,hsl(var(--card)),hsl(var(--sunlit)))] px-5 py-10 text-center shadow-sm sm:px-8">
        <h2 className="text-2xl font-semibold tracking-normal text-primary sm:text-3xl">
          Ready to be part of the Sociology Alumni Association?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
          Join the alumni network, keep your profile verified, and stay
          connected with events, notices, and member services.
        </p>
        <Button
          asChild
          className="mt-6 bg-primary px-7 text-primary-foreground hover:bg-primary/90"
        >
          <Link href="/register">
            Become a member
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
        </Button>
      </section>

      {sponsors.length ? (
        <section>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-primary">
                Support
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-normal">
                Community supporters
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/donation">Support the association</Link>
            </Button>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {sponsors.map((sponsor) => (
              <div
                key={sponsor.id}
                className="rounded-md border bg-card p-4 text-sm font-medium"
              >
                {sponsor.name}
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
