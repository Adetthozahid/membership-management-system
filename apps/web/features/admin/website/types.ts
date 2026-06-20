export type Tab =
  | "general"
  | "id-card"
  | "navigation"
  | "pages"
  | "hero"
  | "voices"
  | "gallery";

export type WebsiteGeneral = {
  id: string;
  siteTitle: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  metaKeywords: string | null;
  metaDescription: string | null;
  idCardSignatures: IdCardSignatureSetting[];
  idCardFields: IdCardFieldSetting[];
};

export type IdCardSignatureSetting = {
  key: "president" | "secretary" | string;
  label: string;
  name: string;
  signatureType: "text" | "image";
  text: string;
  imageUrl: string | null;
  showOnCard: boolean;
};

export type IdCardFieldSetting = {
  key: string;
  label: string;
  showOnCard: boolean;
};

export type WebsiteSection = {
  id: string;
  key: string;
  label: string;
  href: string;
  active: boolean;
  navVisible: boolean;
  sortOrder: number;
};

export type WebsitePage = {
  id: string;
  key: string;
  title: string;
  route: string;
  status: "draft" | "published" | "hidden";
  layout: "standard" | "landing" | "sidebar" | "custom";
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  body: string | null;
  customTemplate: string | null;
  contentBlocks: unknown;
  sortOrder: number;
};

export type GalleryPhoto = {
  id: string;
  albumId: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  originalFileName?: string;
  mimeType?: string;
  fileSize: number;
  width: number;
  height: number;
  published: boolean;
  sortOrder: number;
  uploading?: boolean;
};

export type GalleryAlbum = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  published: boolean;
  sortOrder: number;
  photos: GalleryPhoto[];
};

export type AlumniVoice = {
  id: string;
  name: string;
  role: string;
  affiliation: string;
  quote: string;
  initials: string;
  imageUrl?: string | null;
  published: boolean;
  sortOrder: number;
};

export type HomeHeroSlide = {
  id: string;
  eyebrow: string;
  eyebrowIcon: string;
  eyebrowVisible: boolean;
  title: string;
  body: string;
  imageUrl: string;
  imagePosition: string;
  primaryLabel: string | null;
  primaryHref: string | null;
  secondaryLabel: string | null;
  secondaryHref: string | null;
  tertiaryLabel: string | null;
  tertiaryHref: string | null;
  accentClass: string;
  published: boolean;
  sortOrder: number;
};

export type AboutBlockItem = {
  label?: string;
  title?: string;
  body?: string;
  value?: string;
  icon?: string;
  href?: string;
};

export type AboutBlock = {
  type: string;
  eyebrow?: string;
  title?: string;
  body?: string;
  bodySecondary?: string;
  imageUrl?: string;
  imageAlt?: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  highlight?: string;
  highlightIcon?: string;
  ctaTitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  items?: AboutBlockItem[];
};
