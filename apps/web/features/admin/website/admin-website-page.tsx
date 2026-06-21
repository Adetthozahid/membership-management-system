"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  ChevronDown,
  Eye,
  FileText,
  Globe2,
  IdCard,
  Image as ImageIcon,
  LayoutTemplate,
  MessageSquareQuote,
  PenLine,
  Plus,
  Save,
  Search,
  Settings,
  ToggleLeft,
  Trash2,
  Upload,
} from "lucide-react";
import {
  apiRequest,
  uploadGalleryPhoto,
  uploadMediaFiles,
  uploadWebsiteAsset,
} from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminMessage } from "./components/admin-message";
import { LoadingWebsiteControls } from "./components/loading-website-controls";
import { WebsitePageHeader } from "./components/website-page-header";
import { WebsiteTabs } from "./components/website-tabs";
import type {
  AboutBlock,
  AboutBlockItem,
  AlumniVoice,
  GalleryAlbum,
  GalleryPhoto,
  HomeHeroSlide,
  IdCardFieldSetting,
  IdCardSignatureSetting,
  Tab,
  WebsiteGeneral,
  WebsitePage,
  WebsiteSection,
} from "./types";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const tabs: Array<{ id: Tab; label: string }> = [
  { id: "general", label: "General Settings" },
  { id: "id-card", label: "ID Card" },
  { id: "navigation", label: "Navigation Bar" },
  { id: "pages", label: "Pages" },
  { id: "hero", label: "Hero Slider" },
  { id: "voices", label: "Voices / Testimonials" },
];

const heroIconOptions = [
  { value: "fa6-solid:graduation-cap", label: "Graduation cap" },
  { value: "fa6-solid:users", label: "Users" },
  { value: "fa6-solid:calendar-days", label: "Calendar" },
  { value: "fa6-solid:circle-check", label: "Badge check" },
  { value: "fa6-solid:book-open", label: "Book" },
  { value: "fa6-solid:handshake", label: "Handshake" },
  { value: "fa6-solid:star", label: "Star" },
  { value: "fa6-solid:landmark", label: "Landmark" },
  { value: "fa6-solid:wand-magic-sparkles", label: "Sparkles" },
  { value: "mdi:account-group", label: "Group" },
  { value: "tabler:certificate", label: "Certificate" },
  { value: "bi:mortarboard-fill", label: "Mortarboard" },
  { value: "none", label: "No icon" },
];

const legacyHeroIconMap: Record<string, string> = {
  graduation: "fa6-solid:graduation-cap",
  users: "fa6-solid:users",
  calendar: "fa6-solid:calendar-days",
  badge: "fa6-solid:circle-check",
  book: "fa6-solid:book-open",
  handshake: "fa6-solid:handshake",
  star: "fa6-solid:star",
  landmark: "fa6-solid:landmark",
  sparkles: "fa6-solid:wand-magic-sparkles",
};

const aboutKnownBlockTypes = new Set([
  "focusCards",
  "aboutOverview",
  "aboutStats",
  "aboutValues",
  "services",
  "serviceStats",
  "contact",
]);

const defaultAboutBlocks: AboutBlock[] = [
  {
    type: "focusCards",
    items: [
      {
        title: "Our Mission",
        body: "To build a strong and supportive alumni community that fosters lifelong connections, professional growth, and gives back to the department and society.",
        icon: "target",
      },
      {
        title: "Our Vision",
        body: "To be a leading alumni network that empowers graduates to create positive impact and uphold the values of Sociology and SUST worldwide.",
        icon: "eye",
      },
      {
        title: "Our Purpose",
        body: "To connect alumni, encourage knowledge sharing, support current students, and contribute to the development of the Department of Sociology, SUST.",
        icon: "users",
      },
    ],
  },
  {
    type: "aboutOverview",
    eyebrow: "About the Association",
    title: "Building Connections, Creating Impact",
    body: "The Sociology Alumni Association of SUST is a voluntary, non-political and non-profit organization of proud graduates of the Department of Sociology, Shahjalal University of Science and Technology.",
    bodySecondary:
      "We aim to strengthen bonds among alumni, support the academic and professional journey of current students, and contribute to the advancement of the department and society at large.",
    imageUrl: "/images/sust-slider-campus-building.webp",
    imageAlt: "SUST campus",
    primaryLabel: "Become a member",
    primaryHref: "/register",
    secondaryLabel: "View members",
    secondaryHref: "/members",
  },
  {
    type: "aboutStats",
    items: [
      { label: "Alumni Members", value: "6+", icon: "users" },
      { label: "Years of Journey", value: "15+", icon: "graduation" },
      { label: "Events Organized", value: "50+", icon: "heart" },
      { label: "Countries Connected", value: "10+", icon: "globe" },
    ],
  },
  {
    type: "aboutValues",
    eyebrow: "Our Values",
    items: [
      {
        title: "Unity",
        body: "Together we are stronger. We believe in the power of community.",
        icon: "handshake",
      },
      {
        title: "Integrity",
        body: "We uphold honesty, transparency, and accountability in everything we do.",
        icon: "idea",
      },
      {
        title: "Excellence",
        body: "We strive for excellence in professional and personal endeavors.",
        icon: "book",
      },
      {
        title: "Service",
        body: "We are committed to giving back to our alma mater and society.",
        icon: "heart",
      },
      {
        title: "Inclusivity",
        body: "We welcome and respect every alumni, regardless of location or background.",
        icon: "globe",
      },
    ],
  },
  {
    type: "services",
    eyebrow: "What We Do",
    title: "Supporting Sociology alumni through focused services",
    body: "Membership, connection, information, and programs brought together in one association platform.",
    highlight:
      "Friendship, cooperation, and academic excellence for Sociology graduates.",
    highlightIcon: "handshake",
    imageUrl: "/images/sust-slider-campus-building.webp",
    ctaTitle: "Be a part of our journey",
    ctaLabel: "Join the Association",
    ctaHref: "/register",
    items: [
      {
        title: "Membership",
        body: "Verified registration and member records for Sociology alumni.",
        href: "/register",
        icon: "shield",
      },
      {
        title: "Alumni Network",
        body: "Reconnect with classmates, seniors, juniors, and the department.",
        href: "/members",
        icon: "search",
      },
      {
        title: "Information Hub",
        body: "Notices, updates, resources, and association announcements.",
        href: "/notices",
        icon: "book",
      },
      {
        title: "Events & Programs",
        body: "Reunions, discussions, academic collaboration, and community events.",
        href: "/events",
        icon: "calendar",
      },
    ],
  },
  {
    type: "serviceStats",
    items: [
      { label: "Public alumni records", value: "6" },
      { label: "Active members", value: "5" },
      { label: "Upcoming programs", value: "1" },
    ],
  },
  {
    type: "contact",
    eyebrow: "Contact",
    title: "Connect with the association",
    body: "Reach out for membership, alumni records, association updates, or collaboration with the Sociology alumni community.",
    items: [
      {
        label: "Email",
        value: "alamgirdw@gmail.com",
        href: "mailto:alamgirdw@gmail.com",
        icon: "email",
      },
      {
        label: "Phone",
        value: "01713861084",
        href: "tel:01713861084",
        icon: "phone",
      },
      { label: "Address", value: "Mirabazar, Sylhet", icon: "address" },
    ],
  },
];

function heroIconValue(value?: string | null) {
  if (!value) return "fa6-solid:graduation-cap";
  return legacyHeroIconMap[value] || value;
}

function emptyGeneral(): WebsiteGeneral {
  return {
    id: "",
    siteTitle: "",
    logoUrl: "",
    faviconUrl: "",
    metaKeywords: "",
    metaDescription: "",
    idCardSignatures: defaultIdCardSignatures(),
    idCardFields: defaultIdCardFields(),
  };
}

function defaultIdCardSignatures(): IdCardSignatureSetting[] {
  return [
    {
      key: "president",
      label: "President",
      name: "President",
      signatureType: "text",
      text: "Demo Sign",
      imageUrl: null,
      showOnCard: true,
    },
    {
      key: "secretary",
      label: "Secretary",
      name: "Secretary",
      signatureType: "text",
      text: "Demo Sign",
      imageUrl: null,
      showOnCard: true,
    },
  ];
}

function normalizeIdCardSignatures(
  signatures?: IdCardSignatureSetting[],
): IdCardSignatureSetting[] {
  const current = signatures ?? [];
  return defaultIdCardSignatures().map((fallback) => ({
    ...fallback,
    ...(current.find((item) => item.key === fallback.key) ?? {}),
  }));
}

function defaultIdCardFields(): IdCardFieldSetting[] {
  return [
    { key: "photo", label: "Member photo", showOnCard: true },
    { key: "memberName", label: "Member name", showOnCard: true },
    { key: "memberId", label: "Member ID", showOnCard: true },
    { key: "bloodGroup", label: "Blood group", showOnCard: true },
    { key: "phone", label: "Phone", showOnCard: true },
    { key: "address", label: "Address", showOnCard: true },
    { key: "qrCode", label: "QR verification code", showOnCard: true },
    { key: "approvedSeal", label: "Approved member seal", showOnCard: true },
    { key: "organizationAddress", label: "Organization address", showOnCard: true },
    { key: "returnNotice", label: "Return notice", showOnCard: true },
    { key: "signatures", label: "Signatures", showOnCard: true },
  ];
}

function normalizeIdCardFields(
  fields?: IdCardFieldSetting[],
): IdCardFieldSetting[] {
  const current = fields ?? [];
  return defaultIdCardFields().map((fallback) => {
    const item = current.find((entry) => entry.key === fallback.key);
    return {
      ...fallback,
      ...item,
      label: item?.label?.trim() || fallback.label,
      showOnCard:
        typeof item?.showOnCard === "boolean"
          ? item.showOnCard
          : fallback.showOnCard,
    };
  });
}

function formatBlocks(value: unknown) {
  try {
    return JSON.stringify(value ?? [], null, 2);
  } catch {
    return "[]";
  }
}

function parseBlocks(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return [];
  return JSON.parse(trimmed) as unknown;
}

function cloneAboutBlock(block: AboutBlock): AboutBlock {
  return {
    ...block,
    items: block.items?.map((item) => ({ ...item })),
  };
}

function asAboutBlocks(value: string): AboutBlock[] {
  try {
    const parsed = parseBlocks(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (block): block is AboutBlock =>
        Boolean(block) && typeof block === "object" && "type" in block,
    );
  } catch {
    return [];
  }
}

function aboutBlocksForEditor(value: string) {
  const current = asAboutBlocks(value);
  const extras = current.filter(
    (block) => !aboutKnownBlockTypes.has(block.type),
  );
  const merged = defaultAboutBlocks.map((fallback) => {
    const existing = current.find((block) => block.type === fallback.type);
    return {
      ...cloneAboutBlock(fallback),
      ...existing,
      items: existing?.items?.length
        ? existing.items.map((item) => ({ ...item }))
        : fallback.items?.map((item) => ({ ...item })),
    };
  });
  return [...merged, ...extras];
}

function stringifyAboutBlocks(blocks: AboutBlock[]) {
  return JSON.stringify(blocks, null, 2);
}

function mediaUrl(url: string) {
  if (
    url.startsWith("http") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  )
    return url;
  return `${apiBaseUrl}${url}`;
}

function emptyHeroSlide(order = 0) {
  return {
    eyebrow: "",
    eyebrowIcon: "fa6-solid:graduation-cap",
    eyebrowVisible: true,
    title: "",
    body: "",
    imageUrl: "",
    imagePosition: "center center",
    primaryLabel: "Become a member",
    primaryHref: "/register",
    secondaryLabel: "Find alumni",
    secondaryHref: "/members",
    tertiaryLabel: "",
    tertiaryHref: "",
    accentClass: "bg-[hsl(var(--cream))]",
    published: true,
    sortOrder: order,
  };
}

export function AdminWebsitePage() {
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [general, setGeneral] = useState<WebsiteGeneral>(emptyGeneral);
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [albums, setAlbums] = useState<GalleryAlbum[]>([]);
  const [heroSlides, setHeroSlides] = useState<HomeHeroSlide[]>([]);
  const [heroDraft, setHeroDraft] = useState(emptyHeroSlide());
  const [openHeroSlideId, setOpenHeroSlideId] = useState<string | null>(null);
  const [voices, setVoices] = useState<AlumniVoice[]>([]);
  const [selectedPageKey, setSelectedPageKey] = useState<string>("");
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>("");
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumDescription, setNewAlbumDescription] = useState("");
  const [newVoice, setNewVoice] = useState({
    name: "",
    role: "",
    affiliation: "",
    quote: "",
    initials: "",
    imageUrl: "",
  });
  const [openVoiceId, setOpenVoiceId] = useState<string | null>(null);
  const [photoTitle, setPhotoTitle] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const [blocksText, setBlocksText] = useState("[]");
  const [message, setMessage] = useState<string | null>(null);
  const [uploadingVoicePhotoId, setUploadingVoicePhotoId] = useState<
    string | null
  >(null);
  const [uploadingHeroImageId, setUploadingHeroImageId] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);

  const selectedPage = useMemo(
    () => pages.find((page) => page.key === selectedPageKey) ?? pages[0],
    [pages, selectedPageKey],
  );
  const selectedAlbum = useMemo(
    () => albums.find((album) => album.id === selectedAlbumId) ?? albums[0],
    [albums, selectedAlbumId],
  );
  const aboutEditorBlocks = useMemo(
    () => aboutBlocksForEditor(blocksText),
    [blocksText],
  );

  useEffect(() => {
    async function load() {
      try {
        const [
          generalData,
          sectionData,
          pageData,
          albumData,
          heroData,
          voiceData,
        ] = await Promise.all([
          apiRequest<WebsiteGeneral>("/admin/website/general"),
          apiRequest<WebsiteSection[]>("/admin/website/sections"),
          apiRequest<WebsitePage[]>("/admin/website/pages"),
          apiRequest<GalleryAlbum[]>("/admin/website/gallery/albums"),
          apiRequest<HomeHeroSlide[]>("/admin/website/home-hero-slides"),
          apiRequest<AlumniVoice[]>("/admin/website/testimonials"),
        ]);
        setGeneral({
          ...generalData,
          idCardSignatures: normalizeIdCardSignatures(
            generalData.idCardSignatures,
          ),
          idCardFields: normalizeIdCardFields(generalData.idCardFields),
        });
        setSections(sectionData);
        setPages(pageData);
        setAlbums(albumData);
        setHeroSlides(heroData);
        setHeroDraft(emptyHeroSlide(heroData.length * 10));
        setOpenHeroSlideId(null);
        setVoices(voiceData);
        setOpenVoiceId(null);
        setSelectedPageKey(pageData[0]?.key ?? "");
        setSelectedAlbumId(albumData[0]?.id ?? "");
        setBlocksText(formatBlocks(pageData[0]?.contentBlocks ?? []));
      } catch {
        setMessage("Could not load website control settings.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  function choosePage(key: string) {
    const page = pages.find((item) => item.key === key);
    setSelectedPageKey(key);
    setBlocksText(formatBlocks(page?.contentBlocks ?? []));
  }

  function updateSection(key: string, patch: Partial<WebsiteSection>) {
    setSections((current) =>
      current.map((section) =>
        section.key === key ? { ...section, ...patch } : section,
      ),
    );
  }

  function updatePage(key: string, patch: Partial<WebsitePage>) {
    setPages((current) =>
      current.map((page) => (page.key === key ? { ...page, ...patch } : page)),
    );
  }

  function updateAboutBlock(type: string, patch: Partial<AboutBlock>) {
    const blocks = aboutBlocksForEditor(blocksText).map((block) =>
      block.type === type ? { ...block, ...patch } : block,
    );
    setBlocksText(stringifyAboutBlocks(blocks));
  }

  function updateAboutBlockItem(
    type: string,
    index: number,
    patch: Partial<AboutBlockItem>,
  ) {
    const blocks = aboutBlocksForEditor(blocksText).map((block) => {
      if (block.type !== type) return block;
      const items = [...(block.items ?? [])];
      items[index] = { ...(items[index] ?? {}), ...patch };
      return { ...block, items };
    });
    setBlocksText(stringifyAboutBlocks(blocks));
  }

  function updateAlbum(id: string, patch: Partial<GalleryAlbum>) {
    setAlbums((current) =>
      current.map((album) =>
        album.id === id ? { ...album, ...patch } : album,
      ),
    );
  }

  function updatePhoto(id: string, patch: Partial<GalleryPhoto>) {
    setAlbums((current) =>
      current.map((album) => ({
        ...album,
        photos: album.photos.map((photo) =>
          photo.id === id ? { ...photo, ...patch } : photo,
        ),
      })),
    );
  }

  function updateVoice(id: string, patch: Partial<AlumniVoice>) {
    setVoices((current) =>
      current.map((voice) =>
        voice.id === id ? { ...voice, ...patch } : voice,
      ),
    );
  }

  function updateHeroSlide(id: string, patch: Partial<HomeHeroSlide>) {
    setHeroSlides((current) =>
      current.map((slide) =>
        slide.id === id ? { ...slide, ...patch } : slide,
      ),
    );
  }

  function updateSignature(
    key: string,
    patch: Partial<IdCardSignatureSetting>,
  ) {
    setGeneral((current) => ({
      ...current,
      idCardSignatures: normalizeIdCardSignatures(
        current.idCardSignatures,
      ).map((signature) =>
        signature.key === key ? { ...signature, ...patch } : signature,
      ),
    }));
  }

  function updateIdCardField(key: string, patch: Partial<IdCardFieldSetting>) {
    setGeneral((current) => ({
      ...current,
      idCardFields: normalizeIdCardFields(current.idCardFields).map((field) =>
        field.key === key ? { ...field, ...patch } : field,
      ),
    }));
  }

  async function saveGeneral(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const updated = await apiRequest<WebsiteGeneral>(
        "/admin/website/general",
        {
          method: "PATCH",
          body: JSON.stringify(general),
        },
      );
      setGeneral({
        ...updated,
        idCardSignatures: normalizeIdCardSignatures(updated.idCardSignatures),
        idCardFields: normalizeIdCardFields(updated.idCardFields),
      });
      setMessage("General website settings saved.");
    } catch {
      setMessage("Could not save general website settings.");
    }
  }

  async function saveIdCardSignatures(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const updated = await apiRequest<WebsiteGeneral>(
        "/admin/website/general",
        {
          method: "PATCH",
          body: JSON.stringify({
            ...general,
            idCardSignatures: normalizeIdCardSignatures(
              general.idCardSignatures,
            ),
            idCardFields: normalizeIdCardFields(general.idCardFields),
          }),
        },
      );
      setGeneral({
        ...updated,
        idCardSignatures: normalizeIdCardSignatures(updated.idCardSignatures),
        idCardFields: normalizeIdCardFields(updated.idCardFields),
      });
      setMessage("ID card settings saved.");
    } catch {
      setMessage("Could not save ID card settings.");
    }
  }

  async function uploadGeneralAsset(
    kind: "logo" | "favicon",
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    try {
      const uploaded = await uploadWebsiteAsset(kind, file);
      const url = uploaded.url.startsWith("http")
        ? uploaded.url
        : `${apiBaseUrl}${uploaded.url}`;
      setGeneral((current) => ({
        ...current,
        [kind === "logo" ? "logoUrl" : "faviconUrl"]: url,
      }));
      setMessage(
        `${kind === "logo" ? "Logo" : "Favicon"} uploaded. Save general settings to publish it.`,
      );
    } catch {
      setMessage(
        `${kind === "logo" ? "Logo" : "Favicon"} upload failed. Use PNG, JPG, WebP, SVG, or ICO within the size limit.`,
      );
    } finally {
      event.target.value = "";
    }
  }

  async function uploadSignatureImage(
    key: string,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    try {
      const uploaded = await uploadWebsiteAsset("signature", file);
      const url = uploaded.url.startsWith("http")
        ? uploaded.url
        : `${apiBaseUrl}${uploaded.url}`;
      updateSignature(key, {
        imageUrl: url,
        signatureType: "image",
      });
      setMessage("Signature image uploaded. Save general settings to publish it.");
    } catch {
      setMessage("Signature upload failed. Use PNG, JPG, WebP, or SVG within 2MB.");
    } finally {
      event.target.value = "";
    }
  }

  async function removeGeneralAsset(kind: "logo" | "favicon") {
    setMessage(null);
    try {
      const updated = await apiRequest<WebsiteGeneral>(
        "/admin/website/general",
        {
          method: "PATCH",
          body: JSON.stringify({
            ...general,
            [kind === "logo" ? "logoUrl" : "faviconUrl"]: null,
          }),
        },
      );
      setGeneral({
        ...updated,
        idCardSignatures: normalizeIdCardSignatures(updated.idCardSignatures),
        idCardFields: normalizeIdCardFields(updated.idCardFields),
      });
      setMessage(
        `${kind === "logo" ? "Logo" : "Favicon"} removed from website settings.`,
      );
    } catch {
      setMessage(`Could not remove ${kind === "logo" ? "logo" : "favicon"}.`);
    }
  }

  async function saveNavigation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const updated = await apiRequest<WebsiteSection[]>(
        "/admin/website/sections",
        {
          method: "PATCH",
          body: JSON.stringify({
            items: sections.map(
              ({ key, label, href, active, navVisible, sortOrder }) => ({
                key,
                label,
                href,
                active,
                navVisible,
                sortOrder,
              }),
            ),
          }),
        },
      );
      setSections(updated);
      setMessage("Navigation settings saved.");
    } catch {
      setMessage("Could not save navigation settings.");
    }
  }

  async function savePages(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedPage) return;
    setMessage(null);
    try {
      const pageWithBlocks = {
        ...selectedPage,
        contentBlocks:
          selectedPage.key === "about"
            ? aboutBlocksForEditor(blocksText)
            : parseBlocks(blocksText),
      };
      const updated = await apiRequest<WebsitePage[]>("/admin/website/pages", {
        method: "PATCH",
        body: JSON.stringify({
          items: [pageWithBlocks],
        }),
      });
      setPages(updated);
      const nextPage = updated.find((page) => page.key === selectedPage.key);
      setBlocksText(formatBlocks(nextPage?.contentBlocks ?? []));
      setMessage("Page settings saved.");
    } catch (error) {
      setMessage(
        error instanceof SyntaxError
          ? "Content blocks must be valid JSON."
          : "Could not save page settings.",
      );
    }
  }

  async function createVoice(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const created = await apiRequest<AlumniVoice>(
        "/admin/website/testimonials",
        {
          method: "POST",
          body: JSON.stringify({
            ...newVoice,
            published: true,
            sortOrder: voices.length * 10,
          }),
        },
      );
      setVoices((current) => [...current, created]);
      setOpenVoiceId(null);
      setNewVoice({
        name: "",
        role: "",
        affiliation: "",
        quote: "",
        initials: "",
        imageUrl: "",
      });
      setMessage("Voice/testimonial added.");
    } catch {
      setMessage(
        "Could not add voice/testimonial. Name, role, and quote are required.",
      );
    }
  }

  async function createHeroSlide(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const created = await apiRequest<HomeHeroSlide>(
        "/admin/website/home-hero-slides",
        {
          method: "POST",
          body: JSON.stringify(heroDraft),
        },
      );
      setHeroSlides((current) => [...current, created]);
      setHeroDraft(emptyHeroSlide((heroSlides.length + 1) * 10));
      setMessage("Hero slide added.");
    } catch {
      setMessage(
        "Could not add hero slide. Eyebrow, title, body, and image are required.",
      );
    }
  }

  async function saveHeroSlide(slide: HomeHeroSlide) {
    setMessage(null);
    try {
      const updated = await apiRequest<HomeHeroSlide>(
        `/admin/website/home-hero-slides/${slide.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(slide),
        },
      );
      updateHeroSlide(updated.id, updated);
      setMessage("Hero slide saved.");
    } catch {
      setMessage("Could not save hero slide.");
    }
  }

  async function removeHeroSlide(slide: HomeHeroSlide) {
    setMessage(null);
    try {
      await apiRequest(`/admin/website/home-hero-slides/${slide.id}/delete`, {
        method: "POST",
      });
      setHeroSlides((current) =>
        current.filter((item) => item.id !== slide.id),
      );
      setMessage("Hero slide removed.");
    } catch {
      setMessage("Could not remove hero slide.");
    }
  }

  async function uploadHeroImage(
    event: ChangeEvent<HTMLInputElement>,
    slideId?: string,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setUploadingHeroImageId(slideId ?? "new");
    try {
      const uploaded = await uploadMediaFiles([file]);
      const image = uploaded.items.find((item) => item.mediaType === "image");
      if (!image) {
        setMessage("Please upload a PNG, JPG, or WebP image.");
        return;
      }
      if (slideId) {
        const currentSlide = heroSlides.find((slide) => slide.id === slideId);
        updateHeroSlide(slideId, { imageUrl: image.fileUrl });
        if (currentSlide) {
          const updated = await apiRequest<HomeHeroSlide>(
            `/admin/website/home-hero-slides/${slideId}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                ...currentSlide,
                imageUrl: image.fileUrl,
              }),
            },
          );
          updateHeroSlide(updated.id, updated);
        }
      } else {
        setHeroDraft((current) => ({ ...current, imageUrl: image.fileUrl }));
      }
      setMessage(
        slideId
          ? "Hero image uploaded and saved."
          : "Hero image uploaded. Add the slide to publish it.",
      );
    } catch {
      setMessage("Hero image upload failed. Use PNG, JPG, or WebP up to 5MB.");
    } finally {
      setUploadingHeroImageId(null);
      event.target.value = "";
    }
  }

  async function saveVoice(voice: AlumniVoice) {
    setMessage(null);
    try {
      const updated = await apiRequest<AlumniVoice>(
        `/admin/website/testimonials/${voice.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(voice),
        },
      );
      updateVoice(updated.id, updated);
      setMessage("Voice/testimonial saved.");
    } catch {
      setMessage("Could not save voice/testimonial.");
    }
  }

  async function removeVoice(voice: AlumniVoice) {
    setMessage(null);
    try {
      await apiRequest(`/admin/website/testimonials/${voice.id}/delete`, {
        method: "POST",
      });
      setVoices((current) => current.filter((item) => item.id !== voice.id));
      setOpenVoiceId((current) => (current === voice.id ? null : current));
      setMessage("Voice/testimonial removed.");
    } catch {
      setMessage("Could not remove voice/testimonial.");
    }
  }

  async function uploadVoicePhoto(
    event: ChangeEvent<HTMLInputElement>,
    voiceId?: string,
  ) {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage(null);
    setUploadingVoicePhotoId(voiceId ?? "new");
    try {
      const uploaded = await uploadMediaFiles([file]);
      const image = uploaded.items.find((item) => item.mediaType === "image");
      if (!image) {
        setMessage("Please upload a PNG, JPG, or WebP image.");
        return;
      }
      if (voiceId) {
        updateVoice(voiceId, { imageUrl: image.fileUrl });
        const currentVoice = voices.find((voice) => voice.id === voiceId);
        if (currentVoice) {
          const updated = await apiRequest<AlumniVoice>(
            `/admin/website/testimonials/${voiceId}`,
            {
              method: "PATCH",
              body: JSON.stringify({
                ...currentVoice,
                imageUrl: image.fileUrl,
              }),
            },
          );
          updateVoice(updated.id, updated);
        }
      } else {
        setNewVoice((current) => ({ ...current, imageUrl: image.fileUrl }));
      }
      setMessage(
        voiceId
          ? "Photo uploaded and saved."
          : "Photo uploaded. Add the testimonial to publish it.",
      );
    } catch {
      setMessage("Photo upload failed. Use PNG, JPG, or WebP up to 5MB.");
    } finally {
      setUploadingVoicePhotoId(null);
      event.target.value = "";
    }
  }

  async function removeVoicePhoto(voiceId?: string) {
    setMessage(null);
    if (!voiceId) {
      setNewVoice((current) => ({ ...current, imageUrl: "" }));
      setMessage("Selected photo removed.");
      return;
    }
    const currentVoice = voices.find((voice) => voice.id === voiceId);
    if (!currentVoice) return;
    updateVoice(voiceId, { imageUrl: null });
    try {
      const updated = await apiRequest<AlumniVoice>(
        `/admin/website/testimonials/${voiceId}`,
        {
          method: "PATCH",
          body: JSON.stringify({ ...currentVoice, imageUrl: null }),
        },
      );
      updateVoice(updated.id, updated);
      setMessage("Photo removed.");
    } catch {
      updateVoice(voiceId, { imageUrl: currentVoice.imageUrl });
      setMessage("Could not remove photo.");
    }
  }

  async function createAlbum(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    try {
      const created = await apiRequest<GalleryAlbum>(
        "/admin/website/gallery/albums",
        {
          method: "POST",
          body: JSON.stringify({
            title: newAlbumTitle,
            description: newAlbumDescription,
            published: true,
            sortOrder: albums.length * 10,
          }),
        },
      );
      setAlbums((current) => [...current, created]);
      setSelectedAlbumId(created.id);
      setNewAlbumTitle("");
      setNewAlbumDescription("");
      setMessage("Gallery album created.");
    } catch {
      setMessage("Could not create gallery album.");
    }
  }

  async function saveAlbum(album: GalleryAlbum) {
    setMessage(null);
    try {
      const updated = await apiRequest<GalleryAlbum>(
        `/admin/website/gallery/albums/${album.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: album.title,
            description: album.description,
            coverUrl: album.coverUrl,
            published: album.published,
            sortOrder: album.sortOrder,
          }),
        },
      );
      setAlbums((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setSelectedAlbumId(updated.id);
      setMessage("Gallery album saved.");
    } catch {
      setMessage("Could not save gallery album.");
    }
  }

  async function removeAlbum(album: GalleryAlbum) {
    setMessage(null);
    try {
      await apiRequest(`/admin/website/gallery/albums/${album.id}/delete`, {
        method: "POST",
      });
      const nextAlbums = albums.filter((item) => item.id !== album.id);
      setAlbums(nextAlbums);
      setSelectedAlbumId(nextAlbums[0]?.id ?? "");
      setMessage("Gallery album removed.");
    } catch {
      setMessage("Could not remove gallery album.");
    }
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedAlbum) return;
    const previewUrl = URL.createObjectURL(file);
    const temporaryId = `uploading-${Date.now()}`;
    const optimisticPhoto: GalleryPhoto = {
      id: temporaryId,
      albumId: selectedAlbum.id,
      title: photoTitle.trim() || file.name.replace(/\.[^.]+$/, ""),
      caption: photoCaption.trim() || null,
      imageUrl: previewUrl,
      thumbnailUrl: previewUrl,
      originalFileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      width: 0,
      height: 0,
      published: true,
      sortOrder: selectedAlbum.photos.length * 10,
      uploading: true,
    };
    setMessage(null);
    setAlbums((current) =>
      current.map((album) =>
        album.id === selectedAlbum.id
          ? {
              ...album,
              coverUrl: album.coverUrl ?? previewUrl,
              photos: [...album.photos, optimisticPhoto],
            }
          : album,
      ),
    );
    try {
      const photo = await uploadGalleryPhoto(selectedAlbum.id, file, {
        title: optimisticPhoto.title,
        caption: optimisticPhoto.caption ?? "",
        published: true,
        sortOrder: optimisticPhoto.sortOrder,
      });
      setAlbums((current) =>
        current.map((album) =>
          album.id === selectedAlbum.id
            ? {
                ...album,
                coverUrl:
                  album.coverUrl === previewUrl
                    ? photo.thumbnailUrl
                    : album.coverUrl,
                photos: album.photos.map((item) =>
                  item.id === temporaryId ? photo : item,
                ),
              }
            : album,
        ),
      );
      setPhotoTitle("");
      setPhotoCaption("");
      setMessage("Photo uploaded and compressed.");
    } catch {
      setAlbums((current) =>
        current.map((album) =>
          album.id === selectedAlbum.id
            ? {
                ...album,
                coverUrl: album.coverUrl === previewUrl ? null : album.coverUrl,
                photos: album.photos.filter((item) => item.id !== temporaryId),
              }
            : album,
        ),
      );
      setMessage("Photo upload failed. Use PNG, JPG, or WebP up to 12MB.");
    } finally {
      URL.revokeObjectURL(previewUrl);
      event.target.value = "";
    }
  }

  async function savePhoto(photo: GalleryPhoto) {
    setMessage(null);
    try {
      const updated = await apiRequest<GalleryPhoto>(
        `/admin/website/gallery/photos/${photo.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: photo.title,
            caption: photo.caption,
            published: photo.published,
            sortOrder: photo.sortOrder,
          }),
        },
      );
      updatePhoto(updated.id, updated);
      setMessage("Photo saved.");
    } catch {
      setMessage("Could not save photo.");
    }
  }

  async function removePhoto(photo: GalleryPhoto) {
    setMessage(null);
    try {
      await apiRequest(`/admin/website/gallery/photos/${photo.id}/delete`, {
        method: "POST",
      });
      setAlbums((current) =>
        current.map((album) =>
          album.id === photo.albumId
            ? {
                ...album,
                photos: album.photos.filter((item) => item.id !== photo.id),
              }
            : album,
        ),
      );
      setMessage("Photo removed.");
    } catch {
      setMessage("Could not remove photo.");
    }
  }

  if (loading) {
    return <LoadingWebsiteControls />;
  }

  return (
    <div className="space-y-6">
      <WebsitePageHeader />

      <AdminMessage message={message} />

      <WebsiteTabs activeTab={activeTab} tabs={tabs} onChange={setActiveTab} />

      {activeTab === "general" ? (
        <form className="space-y-5" onSubmit={saveGeneral}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" aria-hidden="true" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium">Website title</span>
                <input
                  className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={general.siteTitle}
                  onChange={(event) =>
                    setGeneral({ ...general, siteTitle: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <ImageIcon className="h-4 w-4" aria-hidden="true" />
                  Logo upload
                </span>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={(event) => void uploadGeneralAsset("logo", event)}
                />
                {general.logoUrl ? (
                  <div className="mt-3 flex items-center gap-3 rounded-md border bg-muted p-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={general.logoUrl}
                        alt=""
                        className="h-10 w-10 rounded object-cover"
                      />
                      <span className="min-w-0 truncate text-xs text-muted-foreground">
                        {general.logoUrl}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void removeGeneralAsset("logo");
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="font-medium">Favicon upload</span>
                <input
                  className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico"
                  onChange={(event) =>
                    void uploadGeneralAsset("favicon", event)
                  }
                />
                {general.faviconUrl ? (
                  <div className="mt-3 flex items-center gap-3 rounded-md border bg-muted p-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={general.faviconUrl}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                      <span className="min-w-0 truncate text-xs text-muted-foreground">
                        {general.faviconUrl}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void removeGeneralAsset("favicon");
                      }}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                ) : null}
              </label>
              <label className="block text-sm">
                <span className="flex items-center gap-2 font-medium">
                  <Search className="h-4 w-4" aria-hidden="true" />
                  Keywords
                </span>
                <input
                  className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                  value={general.metaKeywords ?? ""}
                  onChange={(event) =>
                    setGeneral({ ...general, metaKeywords: event.target.value })
                  }
                />
              </label>
              <label className="block text-sm lg:col-span-2">
                <span className="font-medium">Default meta description</span>
                <textarea
                  className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={general.metaDescription ?? ""}
                  onChange={(event) =>
                    setGeneral({
                      ...general,
                      metaDescription: event.target.value,
                    })
                  }
                />
              </label>
            </CardContent>
          </Card>
          <Button type="submit">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save general settings
          </Button>
        </form>
      ) : null}

      {activeTab === "id-card" ? (
        <form className="space-y-5" onSubmit={saveIdCardSignatures}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <IdCard className="h-5 w-5" aria-hidden="true" />
                ID Card Signatures
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3 rounded-md border bg-muted/35 p-4">
                <div>
                  <h3 className="font-semibold">Card display fields</h3>
                  <p className="text-xs text-muted-foreground">
                    Choose which information appears on the member ID card.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {normalizeIdCardFields(general.idCardFields).map((field) => (
                    <label
                      key={field.key}
                      className="flex min-h-11 items-center gap-3 rounded-md border bg-background px-3 py-2 text-sm font-medium"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[hsl(var(--primary))]"
                        checked={field.showOnCard}
                        onChange={(event) =>
                          updateIdCardField(field.key, {
                            showOnCard: event.target.checked,
                          })
                        }
                      />
                      <span>{field.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-md border bg-muted/35 p-4">
                <PenLine className="h-5 w-5 text-primary" aria-hidden="true" />
                <div>
                  <h3 className="font-semibold">President and Secretary</h3>
                  <p className="text-xs text-muted-foreground">
                    Edit signatures for the member ID card preview and PDF.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {normalizeIdCardSignatures(general.idCardSignatures).map(
                  (signature) => (
                    <div
                      key={signature.key}
                      className="space-y-3 rounded-md border bg-card p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{signature.label}</p>
                        <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={signature.showOnCard}
                            onChange={(event) =>
                              updateSignature(signature.key, {
                                showOnCard: event.target.checked,
                              })
                            }
                          />
                          Show on ID card
                        </label>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="block text-sm">
                          <span className="font-medium">Designation</span>
                          <input
                            className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                            value={signature.label}
                            onChange={(event) =>
                              updateSignature(signature.key, {
                                label: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="font-medium">Name</span>
                          <input
                            className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                            value={signature.name}
                            onChange={(event) =>
                              updateSignature(signature.key, {
                                name: event.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                      <label className="block text-sm">
                        <span className="font-medium">Signature type</span>
                        <select
                          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={signature.signatureType}
                          onChange={(event) =>
                            updateSignature(signature.key, {
                              signatureType: event.target.value as
                                | "text"
                                | "image",
                            })
                          }
                        >
                          <option value="text">Digital text signature</option>
                          <option value="image">Uploaded image signature</option>
                        </select>
                      </label>
                      {signature.signatureType === "text" ? (
                        <label className="block text-sm">
                          <span className="font-medium">Signature text</span>
                          <input
                            className="mt-2 h-10 w-full rounded-md border bg-background px-3 font-serif text-lg italic text-[#f05a28]"
                            value={signature.text}
                            onChange={(event) =>
                              updateSignature(signature.key, {
                                text: event.target.value,
                              })
                            }
                          />
                        </label>
                      ) : (
                        <div className="space-y-3 text-sm">
                          <label className="block">
                            <span className="font-medium">Signature image</span>
                            <input
                              className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                              type="file"
                              accept="image/png,image/jpeg,image/webp,image/svg+xml"
                              onChange={(event) =>
                                void uploadSignatureImage(signature.key, event)
                              }
                            />
                          </label>
                          {signature.imageUrl ? (
                            <div className="flex items-center gap-3 rounded-md border bg-muted p-3">
                              <div className="flex min-w-0 flex-1 items-center gap-3">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={signature.imageUrl}
                                  alt=""
                                  className="h-10 max-w-32 object-contain"
                                />
                                <span className="min-w-0 truncate text-xs text-muted-foreground">
                                  {signature.imageUrl}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50"
                                onClick={() =>
                                  updateSignature(signature.key, {
                                    imageUrl: null,
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                                Remove
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ),
                )}
              </div>
            </CardContent>
          </Card>
          <Button type="submit">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save ID card settings
          </Button>
        </form>
      ) : null}

      {activeTab === "navigation" ? (
        <form className="space-y-5" onSubmit={saveNavigation}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 className="h-5 w-5" aria-hidden="true" />
                Navigation Bar
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sections.map((section) => (
                <div
                  key={section.key}
                  className="grid gap-3 rounded-md border p-4 lg:grid-cols-[80px_1fr_1.5fr_auto_auto] lg:items-center"
                >
                  <label className="block text-sm">
                    <span className="text-xs text-muted-foreground">Order</span>
                    <input
                      className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      type="number"
                      value={section.sortOrder}
                      onChange={(event) =>
                        updateSection(section.key, {
                          sortOrder: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-muted-foreground">Label</span>
                    <input
                      className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={section.label}
                      onChange={(event) =>
                        updateSection(section.key, {
                          label: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-xs text-muted-foreground">
                      Website route
                    </span>
                    <input
                      className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={section.href}
                      onChange={(event) =>
                        updateSection(section.key, { href: event.target.value })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={section.active}
                      onChange={(event) =>
                        updateSection(section.key, {
                          active: event.target.checked,
                        })
                      }
                    />
                    <ToggleLeft className="h-4 w-4" aria-hidden="true" />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={section.navVisible}
                      onChange={(event) =>
                        updateSection(section.key, {
                          navVisible: event.target.checked,
                        })
                      }
                    />
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Show in nav
                  </label>
                </div>
              ))}
            </CardContent>
          </Card>
          <Button type="submit">
            <Save className="h-4 w-4" aria-hidden="true" />
            Save navigation
          </Button>
        </form>
      ) : null}

      {activeTab === "pages" && selectedPage ? (
        <form
          className="grid gap-5 lg:grid-cols-[260px_1fr]"
          onSubmit={savePages}
        >
          <Card className="self-start">
            <CardHeader>
              <CardTitle>Pages</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {pages.map((page) => (
                <button
                  key={page.key}
                  type="button"
                  className={`rounded-md border px-3 py-2 text-left text-sm ${page.key === selectedPage.key ? "border-primary bg-muted font-medium" : "bg-card text-muted-foreground"}`}
                  onClick={() => choosePage(page.key)}
                >
                  {page.title}
                  <span className="mt-1 block text-xs">{page.route}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LayoutTemplate className="h-5 w-5" aria-hidden="true" />
                  Page Content
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">Page title</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedPage.title}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        title: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Route</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedPage.route}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        route: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Status</span>
                  <select
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedPage.status}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        status: event.target.value as WebsitePage["status"],
                      })
                    }
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="hidden">Hidden</option>
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Template/layout</span>
                  <select
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedPage.layout}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        layout: event.target.value as WebsitePage["layout"],
                      })
                    }
                  >
                    <option value="standard">Standard content</option>
                    <option value="landing">Landing page</option>
                    <option value="sidebar">Sidebar layout</option>
                    <option value="custom">Custom template</option>
                  </select>
                </label>
                <label className="block text-sm lg:col-span-2">
                  <span className="font-medium">Hero title</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedPage.heroTitle ?? ""}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        heroTitle: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="block text-sm lg:col-span-2">
                  <span className="font-medium">Hero subtitle</span>
                  <textarea
                    className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedPage.heroSubtitle ?? ""}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        heroSubtitle: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="block text-sm lg:col-span-2">
                  <span className="font-medium">Dynamic page content</span>
                  <textarea
                    className="mt-2 min-h-40 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedPage.body ?? ""}
                    onChange={(event) =>
                      updatePage(selectedPage.key, { body: event.target.value })
                    }
                  />
                </label>
                <label className="block text-sm lg:col-span-2">
                  <span className="font-medium">Custom template notes/key</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedPage.customTemplate ?? ""}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        customTemplate: event.target.value,
                      })
                    }
                    placeholder="Example: donation-v1, about-sidebar, landing-feature-grid"
                  />
                </label>
              </CardContent>
            </Card>

            {selectedPage.key === "about"
              ? (() => {
                  const focus = aboutEditorBlocks.find(
                    (block) => block.type === "focusCards",
                  )!;
                  const overview = aboutEditorBlocks.find(
                    (block) => block.type === "aboutOverview",
                  )!;
                  const stats = aboutEditorBlocks.find(
                    (block) => block.type === "aboutStats",
                  )!;
                  const values = aboutEditorBlocks.find(
                    (block) => block.type === "aboutValues",
                  )!;
                  const services = aboutEditorBlocks.find(
                    (block) => block.type === "services",
                  )!;
                  const serviceStats = aboutEditorBlocks.find(
                    (block) => block.type === "serviceStats",
                  )!;
                  const contact = aboutEditorBlocks.find(
                    (block) => block.type === "contact",
                  )!;

                  return (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5" aria-hidden="true" />
                          About Section Editor
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="rounded-md border bg-muted/35 p-4">
                          <h3 className="font-semibold">
                            Mission, Vision, Purpose
                          </h3>
                          <div className="mt-4 grid gap-4 lg:grid-cols-3">
                            {(focus.items ?? []).map((item, index) => (
                              <div
                                key={`focus-${index}`}
                                className="rounded-md border bg-card p-3"
                              >
                                <label className="block text-sm">
                                  <span className="font-medium">Title</span>
                                  <input
                                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                    value={item.title ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem(
                                        "focusCards",
                                        index,
                                        { title: event.target.value },
                                      )
                                    }
                                  />
                                </label>
                                <label className="mt-3 block text-sm">
                                  <span className="font-medium">Body</span>
                                  <textarea
                                    className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                    value={item.body ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem(
                                        "focusCards",
                                        index,
                                        { body: event.target.value },
                                      )
                                    }
                                  />
                                </label>
                                <label className="mt-3 block text-sm">
                                  <span className="font-medium">Icon key</span>
                                  <input
                                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                    value={item.icon ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem(
                                        "focusCards",
                                        index,
                                        { icon: event.target.value },
                                      )
                                    }
                                    placeholder="target, eye, users"
                                  />
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-md border bg-muted/35 p-4">
                          <h3 className="font-semibold">About Overview</h3>
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <label className="block text-sm">
                              <span className="font-medium">Eyebrow</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={overview.eyebrow ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("aboutOverview", {
                                    eyebrow: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="font-medium">Title</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={overview.title ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("aboutOverview", {
                                    title: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm lg:col-span-2">
                              <span className="font-medium">
                                First paragraph
                              </span>
                              <textarea
                                className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={overview.body ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("aboutOverview", {
                                    body: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm lg:col-span-2">
                              <span className="font-medium">
                                Second paragraph
                              </span>
                              <textarea
                                className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={overview.bodySecondary ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("aboutOverview", {
                                    bodySecondary: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="font-medium">Image URL</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={overview.imageUrl ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("aboutOverview", {
                                    imageUrl: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="font-medium">Image alt</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={overview.imageAlt ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("aboutOverview", {
                                    imageAlt: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="font-medium">
                                Primary button label
                              </span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={overview.primaryLabel ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("aboutOverview", {
                                    primaryLabel: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="font-medium">
                                Primary button link
                              </span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={overview.primaryHref ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("aboutOverview", {
                                    primaryHref: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                        </div>

                        <div className="grid gap-4 xl:grid-cols-2">
                          <div className="rounded-md border bg-muted/35 p-4">
                            <h3 className="font-semibold">About Stats</h3>
                            <div className="mt-4 grid gap-3">
                              {(stats.items ?? []).map((item, index) => (
                                <div
                                  key={`stat-${index}`}
                                  className="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-[1fr_110px_120px]"
                                >
                                  <input
                                    className="h-10 rounded-md border bg-background px-3 text-sm"
                                    value={item.label ?? item.title ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem(
                                        "aboutStats",
                                        index,
                                        { label: event.target.value },
                                      )
                                    }
                                    placeholder="Label"
                                  />
                                  <input
                                    className="h-10 rounded-md border bg-background px-3 text-sm"
                                    value={item.value ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem(
                                        "aboutStats",
                                        index,
                                        { value: event.target.value },
                                      )
                                    }
                                    placeholder="Value"
                                  />
                                  <input
                                    className="h-10 rounded-md border bg-background px-3 text-sm"
                                    value={item.icon ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem(
                                        "aboutStats",
                                        index,
                                        { icon: event.target.value },
                                      )
                                    }
                                    placeholder="Icon"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="rounded-md border bg-muted/35 p-4">
                            <h3 className="font-semibold">Service Stats</h3>
                            <div className="mt-4 grid gap-3">
                              {(serviceStats.items ?? []).map((item, index) => (
                                <div
                                  key={`service-stat-${index}`}
                                  className="grid gap-3 rounded-md border bg-card p-3 sm:grid-cols-[1fr_110px]"
                                >
                                  <input
                                    className="h-10 rounded-md border bg-background px-3 text-sm"
                                    value={item.label ?? item.title ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem(
                                        "serviceStats",
                                        index,
                                        { label: event.target.value },
                                      )
                                    }
                                    placeholder="Label"
                                  />
                                  <input
                                    className="h-10 rounded-md border bg-background px-3 text-sm"
                                    value={item.value ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem(
                                        "serviceStats",
                                        index,
                                        { value: event.target.value },
                                      )
                                    }
                                    placeholder="Value"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="rounded-md border bg-muted/35 p-4">
                          <div className="grid gap-4 lg:grid-cols-2">
                            <label className="block text-sm">
                              <span className="font-medium">
                                Values heading
                              </span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={values.eyebrow ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("aboutValues", {
                                    eyebrow: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                            {(values.items ?? []).map((item, index) => (
                              <div
                                key={`value-${index}`}
                                className="rounded-md border bg-card p-3"
                              >
                                <input
                                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                  value={item.title ?? ""}
                                  onChange={(event) =>
                                    updateAboutBlockItem("aboutValues", index, {
                                      title: event.target.value,
                                    })
                                  }
                                  placeholder="Value title"
                                />
                                <textarea
                                  className="mt-3 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                  value={item.body ?? ""}
                                  onChange={(event) =>
                                    updateAboutBlockItem("aboutValues", index, {
                                      body: event.target.value,
                                    })
                                  }
                                  placeholder="Value body"
                                />
                                <input
                                  className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                  value={item.icon ?? ""}
                                  onChange={(event) =>
                                    updateAboutBlockItem("aboutValues", index, {
                                      icon: event.target.value,
                                    })
                                  }
                                  placeholder="Icon"
                                />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-md border bg-muted/35 p-4">
                          <h3 className="font-semibold">Services Section</h3>
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <label className="block text-sm">
                              <span className="font-medium">Eyebrow</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={services.eyebrow ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("services", {
                                    eyebrow: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="font-medium">Title</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={services.title ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("services", {
                                    title: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm lg:col-span-2">
                              <span className="font-medium">Body</span>
                              <textarea
                                className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={services.body ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("services", {
                                    body: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm lg:col-span-2">
                              <span className="font-medium">
                                Highlight text
                              </span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={services.highlight ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("services", {
                                    highlight: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="font-medium">CTA title</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={services.ctaTitle ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("services", {
                                    ctaTitle: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="font-medium">CTA link</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={services.ctaHref ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("services", {
                                    ctaHref: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            {(services.items ?? []).map((item, index) => (
                              <div
                                key={`service-${index}`}
                                className="rounded-md border bg-card p-3"
                              >
                                <input
                                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                  value={item.title ?? ""}
                                  onChange={(event) =>
                                    updateAboutBlockItem("services", index, {
                                      title: event.target.value,
                                    })
                                  }
                                  placeholder="Service title"
                                />
                                <textarea
                                  className="mt-3 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                  value={item.body ?? ""}
                                  onChange={(event) =>
                                    updateAboutBlockItem("services", index, {
                                      body: event.target.value,
                                    })
                                  }
                                  placeholder="Service body"
                                />
                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                  <input
                                    className="h-10 rounded-md border bg-background px-3 text-sm"
                                    value={item.href ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem("services", index, {
                                        href: event.target.value,
                                      })
                                    }
                                    placeholder="Link"
                                  />
                                  <input
                                    className="h-10 rounded-md border bg-background px-3 text-sm"
                                    value={item.icon ?? ""}
                                    onChange={(event) =>
                                      updateAboutBlockItem("services", index, {
                                        icon: event.target.value,
                                      })
                                    }
                                    placeholder="Icon"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="rounded-md border bg-muted/35 p-4">
                          <h3 className="font-semibold">Contact Section</h3>
                          <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <label className="block text-sm">
                              <span className="font-medium">Eyebrow</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={contact.eyebrow ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("contact", {
                                    eyebrow: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm">
                              <span className="font-medium">Title</span>
                              <input
                                className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                value={contact.title ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("contact", {
                                    title: event.target.value,
                                  })
                                }
                              />
                            </label>
                            <label className="block text-sm lg:col-span-2">
                              <span className="font-medium">Body</span>
                              <textarea
                                className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                                value={contact.body ?? ""}
                                onChange={(event) =>
                                  updateAboutBlock("contact", {
                                    body: event.target.value,
                                  })
                                }
                              />
                            </label>
                          </div>
                          <div className="mt-4 grid gap-4 lg:grid-cols-3">
                            {(contact.items ?? []).map((item, index) => (
                              <div
                                key={`contact-${index}`}
                                className="rounded-md border bg-card p-3"
                              >
                                <input
                                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                                  value={item.label ?? ""}
                                  onChange={(event) =>
                                    updateAboutBlockItem("contact", index, {
                                      label: event.target.value,
                                    })
                                  }
                                  placeholder="Label"
                                />
                                <input
                                  className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                  value={item.value ?? ""}
                                  onChange={(event) =>
                                    updateAboutBlockItem("contact", index, {
                                      value: event.target.value,
                                    })
                                  }
                                  placeholder="Value"
                                />
                                <input
                                  className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                  value={item.href ?? ""}
                                  onChange={(event) =>
                                    updateAboutBlockItem("contact", index, {
                                      href: event.target.value,
                                    })
                                  }
                                  placeholder="Optional link"
                                />
                                <input
                                  className="mt-3 h-10 w-full rounded-md border bg-background px-3 text-sm"
                                  value={item.icon ?? ""}
                                  onChange={(event) =>
                                    updateAboutBlockItem("contact", index, {
                                      icon: event.target.value,
                                    })
                                  }
                                  placeholder="email, phone, address"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()
              : null}

            <Card>
              <CardHeader>
                <CardTitle>SEO and Content Blocks</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-2">
                <label className="block text-sm">
                  <span className="font-medium">Meta title</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedPage.metaTitle ?? ""}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        metaTitle: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Meta keywords</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={selectedPage.metaKeywords ?? ""}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        metaKeywords: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="block text-sm lg:col-span-2">
                  <span className="font-medium">Meta description</span>
                  <textarea
                    className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedPage.metaDescription ?? ""}
                    onChange={(event) =>
                      updatePage(selectedPage.key, {
                        metaDescription: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="block text-sm lg:col-span-2">
                  <span className="font-medium">Content blocks JSON</span>
                  <textarea
                    className="mt-2 min-h-40 w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
                    value={blocksText}
                    onChange={(event) => setBlocksText(event.target.value)}
                  />
                </label>
              </CardContent>
            </Card>

            <Button type="submit">
              <Save className="h-4 w-4" aria-hidden="true" />
              Save page
            </Button>
          </div>
        </form>
      ) : null}

      {activeTab === "hero" ? (
        <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
          <datalist id="hero-icon-options">
            {heroIconOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </datalist>
          <Card className="self-start">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" aria-hidden="true" />
                Add Hero Slide
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createHeroSlide}>
                <label className="block text-sm">
                  <span className="font-medium">Eyebrow</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={heroDraft.eyebrow}
                    onChange={(event) =>
                      setHeroDraft((current) => ({
                        ...current,
                        eyebrow: event.target.value,
                      }))
                    }
                    required={heroDraft.eyebrowVisible}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium">Eyebrow icon</span>
                    <span className="mt-2 flex h-10 items-center gap-2 rounded-md border bg-background px-3">
                      {heroIconValue(heroDraft.eyebrowIcon) !== "none" ? (
                        <Icon
                          icon={heroIconValue(heroDraft.eyebrowIcon)}
                          className="h-4 w-4 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      ) : null}
                      <input
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                        list="hero-icon-options"
                        value={heroDraft.eyebrowIcon}
                        onChange={(event) =>
                          setHeroDraft((current) => ({
                            ...current,
                            eyebrowIcon: event.target.value,
                          }))
                        }
                        placeholder="fa6-solid:graduation-cap"
                      />
                    </span>
                  </label>
                  <label className="mt-7 flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm">
                    <input
                      type="checkbox"
                      checked={heroDraft.eyebrowVisible}
                      onChange={(event) =>
                        setHeroDraft((current) => ({
                          ...current,
                          eyebrowVisible: event.target.checked,
                        }))
                      }
                    />
                    Show eyebrow line
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="font-medium">Title</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={heroDraft.title}
                    onChange={(event) =>
                      setHeroDraft((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Use | for line breaks"
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Body text</span>
                  <textarea
                    className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={heroDraft.body}
                    onChange={(event) =>
                      setHeroDraft((current) => ({
                        ...current,
                        body: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Image upload</span>
                  <input
                    className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => void uploadHeroImage(event)}
                  />
                </label>
                {heroDraft.imageUrl ? (
                  <div className="overflow-hidden rounded-md border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(heroDraft.imageUrl)}
                      alt=""
                      className="aspect-video w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium">Primary button</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={heroDraft.primaryLabel}
                      onChange={(event) =>
                        setHeroDraft((current) => ({
                          ...current,
                          primaryLabel: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Primary link</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={heroDraft.primaryHref}
                      onChange={(event) =>
                        setHeroDraft((current) => ({
                          ...current,
                          primaryHref: event.target.value,
                        }))
                      }
                    />
                  </label>
                </div>
                <Button type="submit">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add slide
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid content-start gap-3 [grid-auto-rows:max-content]">
            {heroSlides.length ? (
              heroSlides.map((slide) => (
                <Card
                  key={slide.id}
                  className="h-auto min-h-0 overflow-hidden rounded-md shadow-sm"
                >
                  <button
                    type="button"
                    className="grid h-auto min-h-0 w-full gap-3 px-4 py-3 text-left transition hover:bg-muted/55 sm:grid-cols-[84px_1fr_auto] sm:items-center"
                    onClick={() =>
                      setOpenHeroSlideId((current) =>
                        current === slide.id ? null : slide.id,
                      )
                    }
                    aria-expanded={openHeroSlideId === slide.id}
                  >
                    <span className="block h-14 w-20 overflow-hidden rounded-md border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrl(slide.imageUrl)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        {heroIconValue(slide.eyebrowIcon) !== "none" ? (
                          <Icon
                            icon={heroIconValue(slide.eyebrowIcon)}
                            className="h-4 w-4 shrink-0 text-primary"
                            aria-hidden="true"
                          />
                        ) : null}
                        <span className="truncate text-base font-semibold text-foreground">
                          {slide.title || "Untitled slide"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${slide.published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          {slide.published ? "Published" : "Draft"}
                        </span>
                        {!slide.eyebrowVisible ? (
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                            Eyebrow hidden
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block truncate text-sm text-muted-foreground">
                        {slide.eyebrow || "No eyebrow"} - Order{" "}
                        {slide.sortOrder}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-sm font-medium text-primary">
                      {openHeroSlideId === slide.id ? "Hide editor" : "Edit"}
                      <ChevronDown
                        className={`h-4 w-4 transition ${openHeroSlideId === slide.id ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  {openHeroSlideId === slide.id ? (
                    <CardContent className="grid gap-4 border-t bg-card/80 p-4 xl:grid-cols-[180px_1fr]">
                      <div className="space-y-3">
                        <div className="overflow-hidden rounded-md border bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaUrl(slide.imageUrl)}
                            alt=""
                            className="aspect-video w-full object-cover"
                          />
                        </div>
                        <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-3 text-xs font-semibold text-primary hover:bg-muted">
                          {uploadingHeroImageId === slide.id
                            ? "Uploading..."
                            : "Change image"}
                          <input
                            className="sr-only"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) =>
                              void uploadHeroImage(event, slide.id)
                            }
                          />
                        </label>
                      </div>
                      <div className="grid gap-3">
                        <div className="grid gap-3 lg:grid-cols-2">
                          <label className="block text-sm">
                            <span className="font-medium">Eyebrow</span>
                            <input
                              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                              value={slide.eyebrow}
                              onChange={(event) =>
                                updateHeroSlide(slide.id, {
                                  eyebrow: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="font-medium">Order</span>
                            <input
                              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                              type="number"
                              value={slide.sortOrder}
                              onChange={(event) =>
                                updateHeroSlide(slide.id, {
                                  sortOrder: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <label className="block text-sm">
                            <span className="font-medium">Eyebrow icon</span>
                            <span className="mt-2 flex h-10 items-center gap-2 rounded-md border bg-background px-3">
                              {heroIconValue(slide.eyebrowIcon) !== "none" ? (
                                <Icon
                                  icon={heroIconValue(slide.eyebrowIcon)}
                                  className="h-4 w-4 shrink-0 text-primary"
                                  aria-hidden="true"
                                />
                              ) : null}
                              <input
                                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                                list="hero-icon-options"
                                value={heroIconValue(slide.eyebrowIcon)}
                                onChange={(event) =>
                                  updateHeroSlide(slide.id, {
                                    eyebrowIcon: event.target.value,
                                  })
                                }
                                placeholder="fa6-solid:graduation-cap"
                              />
                            </span>
                          </label>
                          <label className="mt-7 flex h-10 items-center gap-2 rounded-md border bg-background px-3 text-sm">
                            <input
                              type="checkbox"
                              checked={slide.eyebrowVisible !== false}
                              onChange={(event) =>
                                updateHeroSlide(slide.id, {
                                  eyebrowVisible: event.target.checked,
                                })
                              }
                            />
                            Show eyebrow line
                          </label>
                        </div>
                        <label className="block text-sm">
                          <span className="font-medium">Title</span>
                          <input
                            className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                            value={slide.title}
                            onChange={(event) =>
                              updateHeroSlide(slide.id, {
                                title: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="font-medium">Body text</span>
                          <textarea
                            className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                            value={slide.body}
                            onChange={(event) =>
                              updateHeroSlide(slide.id, {
                                body: event.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <label className="block text-sm">
                            <span className="font-medium">Image position</span>
                            <input
                              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                              value={slide.imagePosition}
                              onChange={(event) =>
                                updateHeroSlide(slide.id, {
                                  imagePosition: event.target.value,
                                })
                              }
                            />
                          </label>
                          <label className="block text-sm">
                            <span className="font-medium">Accent class</span>
                            <input
                              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                              value={slide.accentClass}
                              onChange={(event) =>
                                updateHeroSlide(slide.id, {
                                  accentClass: event.target.value,
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-3">
                          {[
                            ["primaryLabel", "primaryHref", "Primary"],
                            ["secondaryLabel", "secondaryHref", "Secondary"],
                            ["tertiaryLabel", "tertiaryHref", "Tertiary"],
                          ].map(([labelKey, hrefKey, label]) => (
                            <div
                              key={label}
                              className="grid gap-2 rounded-md border p-3"
                            >
                              <span className="text-xs font-semibold text-muted-foreground">
                                {label} button
                              </span>
                              <input
                                className="h-9 rounded-md border bg-background px-3 text-sm"
                                value={String(
                                  slide[labelKey as keyof HomeHeroSlide] ?? "",
                                )}
                                onChange={(event) =>
                                  updateHeroSlide(slide.id, {
                                    [labelKey]: event.target.value,
                                  } as Partial<HomeHeroSlide>)
                                }
                                placeholder="Text"
                              />
                              <input
                                className="h-9 rounded-md border bg-background px-3 text-sm"
                                value={String(
                                  slide[hrefKey as keyof HomeHeroSlide] ?? "",
                                )}
                                onChange={(event) =>
                                  updateHeroSlide(slide.id, {
                                    [hrefKey]: event.target.value,
                                  } as Partial<HomeHeroSlide>)
                                }
                                placeholder="/link"
                              />
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={slide.published}
                              onChange={(event) =>
                                updateHeroSlide(slide.id, {
                                  published: event.target.checked,
                                })
                              }
                            />
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            Published
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void saveHeroSlide(slide)}
                          >
                            <Save className="h-4 w-4" aria-hidden="true" />
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-red-200 bg-white text-red-700 hover:bg-red-50"
                            onClick={() => void removeHeroSlide(slide)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  ) : null}
                </Card>
              ))
            ) : (
              <p className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                No hero slides added yet. The home page will use default slides
                until you publish one.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "voices" ? (
        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <Card className="self-start">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" aria-hidden="true" />
                Add Voice / Testimonial
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-3" onSubmit={createVoice}>
                <label className="block text-sm">
                  <span className="font-medium">Name</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={newVoice.name}
                    onChange={(event) =>
                      setNewVoice({ ...newVoice, name: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Role</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={newVoice.role}
                    onChange={(event) =>
                      setNewVoice({ ...newVoice, role: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Affiliation</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={newVoice.affiliation}
                    onChange={(event) =>
                      setNewVoice({
                        ...newVoice,
                        affiliation: event.target.value,
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Photo upload</span>
                  <input
                    className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => void uploadVoicePhoto(event)}
                  />
                </label>
                {newVoice.imageUrl ? (
                  <div className="flex items-center gap-3 rounded-md border bg-muted p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={mediaUrl(newVoice.imageUrl)}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                      {uploadingVoicePhotoId === "new"
                        ? "Uploading..."
                        : "Photo selected"}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="shrink-0 border-red-200 bg-white text-red-700 hover:bg-red-50"
                      onClick={() => void removeVoicePhoto()}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                ) : null}
                <label className="block text-sm">
                  <span className="font-medium">Initials</span>
                  <input
                    className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={newVoice.initials}
                    onChange={(event) =>
                      setNewVoice({ ...newVoice, initials: event.target.value })
                    }
                    placeholder="Auto from name"
                  />
                </label>
                <label className="block text-sm">
                  <span className="font-medium">Quote</span>
                  <textarea
                    className="mt-2 min-h-28 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={newVoice.quote}
                    onChange={(event) =>
                      setNewVoice({ ...newVoice, quote: event.target.value })
                    }
                    required
                  />
                </label>
                <Button type="submit">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add testimonial
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="grid content-start gap-3 [grid-auto-rows:max-content]">
            {voices.length ? (
              voices.map((voice) => (
                <Card
                  key={voice.id}
                  className="h-auto min-h-0 overflow-hidden rounded-md shadow-sm"
                >
                  <button
                    type="button"
                    className="grid h-auto min-h-0 w-full gap-3 px-4 py-3 text-left transition hover:bg-muted/55 sm:grid-cols-[48px_1fr_auto] sm:items-center"
                    onClick={() =>
                      setOpenVoiceId((current) =>
                        current === voice.id ? null : voice.id,
                      )
                    }
                    aria-expanded={openVoiceId === voice.id}
                  >
                    <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border bg-muted text-xs font-bold text-primary">
                      {voice.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={mediaUrl(voice.imageUrl)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        voice.initials || voice.name.slice(0, 2).toUpperCase()
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-base font-semibold text-foreground">
                          {voice.name || "Untitled voice"}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${voice.published ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          {voice.published ? "Published" : "Draft"}
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-sm text-muted-foreground">
                        {voice.role || "No role"}
                        {voice.affiliation ? ` - ${voice.affiliation}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 text-sm font-medium text-primary">
                      {openVoiceId === voice.id ? "Hide editor" : "Edit"}
                      <ChevronDown
                        className={`h-4 w-4 transition ${openVoiceId === voice.id ? "rotate-180" : ""}`}
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                  {openVoiceId === voice.id ? (
                    <CardContent className="grid gap-4 border-t bg-card/80 p-4 lg:grid-cols-[120px_1fr_1fr]">
                      <div className="lg:row-span-4">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border bg-muted text-xl font-bold text-primary">
                          {voice.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mediaUrl(voice.imageUrl)}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            voice.initials ||
                            voice.name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <div className="mt-3 grid w-24 gap-2">
                          <label className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md border bg-background px-2 text-xs font-semibold text-primary hover:bg-muted">
                            {voice.imageUrl ? "Change" : "Upload"}
                            <input
                              className="sr-only"
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={(event) =>
                                void uploadVoicePhoto(event, voice.id)
                              }
                            />
                          </label>
                          {voice.imageUrl ? (
                            <button
                              type="button"
                              className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => void removeVoicePhoto(voice.id)}
                            >
                              Remove
                            </button>
                          ) : null}
                        </div>
                      </div>
                      <label className="block text-sm">
                        <span className="font-medium">Name</span>
                        <input
                          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={voice.name}
                          onChange={(event) =>
                            updateVoice(voice.id, { name: event.target.value })
                          }
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="font-medium">Role</span>
                        <input
                          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={voice.role}
                          onChange={(event) =>
                            updateVoice(voice.id, { role: event.target.value })
                          }
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="font-medium">Affiliation</span>
                        <input
                          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={voice.affiliation}
                          onChange={(event) =>
                            updateVoice(voice.id, {
                              affiliation: event.target.value,
                            })
                          }
                        />
                      </label>
                      <div className="rounded-md border bg-muted/45 p-3 text-sm text-muted-foreground">
                        {uploadingVoicePhotoId === voice.id
                          ? "Uploading photo..."
                          : voice.imageUrl
                            ? "Photo uploaded. Use Change to replace it."
                            : "No photo uploaded. Use Upload to add one."}
                      </div>
                      <label className="block text-sm">
                        <span className="font-medium">Initials</span>
                        <input
                          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                          value={voice.initials}
                          onChange={(event) =>
                            updateVoice(voice.id, {
                              initials: event.target.value,
                            })
                          }
                        />
                      </label>
                      <label className="block text-sm">
                        <span className="font-medium">Order</span>
                        <input
                          className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                          type="number"
                          value={voice.sortOrder}
                          onChange={(event) =>
                            updateVoice(voice.id, {
                              sortOrder: Number(event.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="block text-sm lg:col-span-2">
                        <span className="font-medium">Quote</span>
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                          value={voice.quote}
                          onChange={(event) =>
                            updateVoice(voice.id, { quote: event.target.value })
                          }
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-2 lg:col-span-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={voice.published}
                            onChange={(event) =>
                              updateVoice(voice.id, {
                                published: event.target.checked,
                              })
                            }
                          />
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Published
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void saveVoice(voice)}
                        >
                          <Save className="h-4 w-4" aria-hidden="true" />
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-red-200 bg-white text-red-700 hover:bg-red-50"
                          onClick={() => void removeVoice(voice)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  ) : null}
                </Card>
              ))
            ) : (
              <p className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">
                No voices/testimonials added yet.
              </p>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === "gallery" ? (
        <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" aria-hidden="true" />
                  New Album
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={createAlbum}>
                  <label className="block text-sm">
                    <span className="font-medium">Album title</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={newAlbumTitle}
                      onChange={(event) => setNewAlbumTitle(event.target.value)}
                      required
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Description</span>
                    <textarea
                      className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={newAlbumDescription}
                      onChange={(event) =>
                        setNewAlbumDescription(event.target.value)
                      }
                    />
                  </label>
                  <Button type="submit">
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add album
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Albums</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {albums.length ? (
                  albums.map((album) => (
                    <button
                      key={album.id}
                      type="button"
                      className={`rounded-md border px-3 py-2 text-left text-sm ${album.id === selectedAlbum?.id ? "border-primary bg-muted font-medium" : "bg-card text-muted-foreground"}`}
                      onClick={() => setSelectedAlbumId(album.id)}
                    >
                      {album.title}
                      <span className="mt-1 block text-xs">
                        {album.photos.length} photo
                        {album.photos.length === 1 ? "" : "s"}
                      </span>
                    </button>
                  ))
                ) : (
                  <p className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                    No albums yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {selectedAlbum ? (
            <div className="space-y-5">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" aria-hidden="true" />
                    Album Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium">Title</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={selectedAlbum.title}
                      onChange={(event) =>
                        updateAlbum(selectedAlbum.id, {
                          title: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Order</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      type="number"
                      value={selectedAlbum.sortOrder}
                      onChange={(event) =>
                        updateAlbum(selectedAlbum.id, {
                          sortOrder: Number(event.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="block text-sm lg:col-span-2">
                    <span className="font-medium">Description</span>
                    <textarea
                      className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={selectedAlbum.description ?? ""}
                      onChange={(event) =>
                        updateAlbum(selectedAlbum.id, {
                          description: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedAlbum.published}
                      onChange={(event) =>
                        updateAlbum(selectedAlbum.id, {
                          published: event.target.checked,
                        })
                      }
                    />
                    <Eye className="h-4 w-4" aria-hidden="true" />
                    Published
                  </label>
                  <div className="flex flex-wrap gap-2 lg:col-span-2">
                    <Button
                      type="button"
                      onClick={() => void saveAlbum(selectedAlbum)}
                    >
                      <Save className="h-4 w-4" aria-hidden="true" />
                      Save album
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-red-200 bg-white text-red-700 hover:bg-red-50"
                      onClick={() => void removeAlbum(selectedAlbum)}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      Remove album
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" aria-hidden="true" />
                    Add Photo
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-2">
                  <label className="block text-sm">
                    <span className="font-medium">Photo title</span>
                    <input
                      className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm"
                      value={photoTitle}
                      onChange={(event) => setPhotoTitle(event.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium">Upload image</span>
                    <input
                      className="mt-2 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(event) => void uploadPhoto(event)}
                    />
                  </label>
                  <label className="block text-sm lg:col-span-2">
                    <span className="font-medium">Caption</span>
                    <textarea
                      className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                      value={photoCaption}
                      onChange={(event) => setPhotoCaption(event.target.value)}
                    />
                  </label>
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                {selectedAlbum.photos.length ? (
                  selectedAlbum.photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="overflow-hidden rounded-md border bg-card"
                    >
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mediaUrl(photo.thumbnailUrl)}
                          alt=""
                          className={`aspect-video w-full object-cover ${photo.uploading ? "opacity-70" : ""}`}
                          loading="lazy"
                        />
                        {photo.uploading ? (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-medium text-white">
                            Uploading...
                          </div>
                        ) : null}
                      </div>
                      <div className="grid gap-3 p-4">
                        <label className="block text-sm">
                          <span className="text-xs text-muted-foreground">
                            Title
                          </span>
                          <input
                            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                            value={photo.title}
                            onChange={(event) =>
                              updatePhoto(photo.id, {
                                title: event.target.value,
                              })
                            }
                          />
                        </label>
                        <label className="block text-sm">
                          <span className="text-xs text-muted-foreground">
                            Caption
                          </span>
                          <textarea
                            className="mt-1 min-h-16 w-full rounded-md border bg-background px-3 py-2 text-sm"
                            value={photo.caption ?? ""}
                            onChange={(event) =>
                              updatePhoto(photo.id, {
                                caption: event.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block text-sm">
                            <span className="text-xs text-muted-foreground">
                              Order
                            </span>
                            <input
                              className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
                              type="number"
                              value={photo.sortOrder}
                              onChange={(event) =>
                                updatePhoto(photo.id, {
                                  sortOrder: Number(event.target.value),
                                })
                              }
                            />
                          </label>
                          <label className="flex items-center gap-2 self-end text-sm">
                            <input
                              type="checkbox"
                              checked={photo.published}
                              onChange={(event) =>
                                updatePhoto(photo.id, {
                                  published: event.target.checked,
                                })
                              }
                            />
                            Published
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {photo.width && photo.height
                            ? `${photo.width} x ${photo.height}, `
                            : ""}
                          {(photo.fileSize / 1024).toFixed(0)} KB
                          {photo.uploading ? " selected" : ""}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            disabled={photo.uploading}
                            onClick={() => void savePhoto(photo)}
                          >
                            <Save className="h-4 w-4" aria-hidden="true" />
                            Save
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={photo.uploading}
                            className="border-red-200 bg-white text-red-700 hover:bg-red-50"
                            onClick={() => void removePhoto(photo)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border bg-muted p-4 text-sm text-muted-foreground xl:col-span-2">
                    No photos in this album yet.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
              Create an album to start adding gallery photos.
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
