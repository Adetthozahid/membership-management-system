"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  CalendarDays,
  ChevronDown,
  Eye,
  FileText,
  Image as ImageIcon,
  Italic,
  Link2,
  List,
  ListOrdered,
  Maximize2,
  Minus,
  Pilcrow,
  Pin,
  PlaySquare,
  Quote,
  Rows3,
  Save,
  Search,
  Trash2,
  Underline,
  Upload,
} from "lucide-react";
import { apiRequest, fetchCurrentUser, getAccessToken } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

type WebsitePage = {
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
};

type BlogPost = {
  id: string;
  title: string;
  summary: string;
  body: string;
  slug: string;
  date: string;
  status: "draft" | "pending" | "published" | "trash" | "correction_requested" | "rejected";
  category: string;
  taxonomies: string[];
  tags: string[];
  authorUserId: string;
  authorName: string;
  authorProfileUrl?: string;
  submittedByMemberId?: string;
  revisions: BlogPostRevision[];
  allowComments: boolean;
  submittedAt?: string;
  publishedAt?: string | null;
  correctionNote?: string | null;
  correctionRequestedAt?: string | null;
  rejectionNote?: string | null;
  rejectedAt?: string | null;
};

type BlogPostRevision = {
  id: string;
  savedAt: string;
  savedBy: string;
  title: string;
  body: string;
  status: "draft" | "pending" | "published" | "trash" | "correction_requested" | "rejected";
};

type MediaAsset = {
  id: string;
  title: string;
  fileUrl: string;
  mimeType: string;
  mediaType: "image" | "video" | "document";
  thumbnailUrl: string | null;
  altText: string | null;
};

type MediaLibraryResponse = {
  items: MediaAsset[];
  total: number;
};

type MediaAlignment = "none" | "left" | "center" | "right";
type MediaSize = "thumbnail" | "medium" | "large" | "full";
type MediaLinkType = "none" | "file" | "custom";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "application/pdf"]);
const maxFileSize = 2 * 1024 * 1024;
const safeSpecialCharacters = ["\u00a9", "\u00ae", "\u2122", "\u2014", "\u2013", "\u2022", "\u00a3", "\u20ac", "$", "\u09f3", "\u2192", "\u2190", "\u2713", "\u2715", "\u2605"];
const editorShortcodes = [
  `[gallery id="123"]`,
  "[event_list]",
  "[member_directory]",
  "[notice_board]",
  "[testimonials]",
  "[association_updates]",
  "[committee_members]",
  "[executive_committee]",
  "[contact_info]",
  "[donation_form]",
  "[member_login_button]"
];

function emptyPost(): BlogPost {
  return {
    id: "",
    title: "",
    summary: "",
    body: "",
    slug: "",
    date: new Date().toISOString().slice(0, 10),
    status: "published",
    category: "",
    taxonomies: [],
    tags: [],
    authorUserId: "",
    authorName: "",
    revisions: [],
    allowComments: true,
  };
}

function normalizePosts(value: unknown): BlogPost[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Partial<BlogPost> => Boolean(item) && typeof item === "object")
    .map((item) => ({
      id: typeof item.id === "string" && item.id ? item.id : crypto.randomUUID(),
      title: typeof item.title === "string" ? item.title : "Untitled",
      summary: typeof item.summary === "string" ? item.summary : "",
      body: typeof item.body === "string" ? item.body : "",
      slug: typeof item.slug === "string" ? item.slug : "",
      date: typeof item.date === "string" ? item.date : typeof item.submittedAt === "string" ? item.submittedAt.slice(0, 10) : new Date().toISOString().slice(0, 10),
      status: item.status === "draft" || item.status === "pending" || item.status === "trash" || item.status === "correction_requested" || item.status === "rejected" ? item.status : "published",
      category: typeof item.category === "string" ? item.category : "",
      taxonomies: Array.isArray(item.taxonomies)
        ? item.taxonomies.filter((taxonomy): taxonomy is string => typeof taxonomy === "string" && Boolean(taxonomy.trim()))
        : typeof item.category === "string" && item.category
          ? [item.category]
          : [],
      tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [],
      authorUserId: typeof item.authorUserId === "string" ? item.authorUserId : "",
      authorName: typeof item.authorName === "string" ? item.authorName : "",
      authorProfileUrl: typeof item.authorProfileUrl === "string" ? item.authorProfileUrl : "",
      submittedByMemberId: typeof item.submittedByMemberId === "string" ? item.submittedByMemberId : "",
      revisions: Array.isArray(item.revisions)
        ? item.revisions
            .filter((revision): revision is BlogPostRevision => Boolean(revision) && typeof revision === "object")
            .map((revision) => ({
              id: typeof revision.id === "string" ? revision.id : crypto.randomUUID(),
              savedAt: typeof revision.savedAt === "string" ? revision.savedAt : new Date().toISOString(),
              savedBy: typeof revision.savedBy === "string" ? revision.savedBy : "Admin",
              title: typeof revision.title === "string" ? revision.title : "",
              body: typeof revision.body === "string" ? revision.body : "",
              status: (revision.status === "draft" || revision.status === "pending" || revision.status === "trash" || revision.status === "correction_requested" || revision.status === "rejected" ? revision.status : "published") as BlogPost["status"]
            }))
            .slice(0, 20)
        : [],
      allowComments: item.allowComments !== false,
      submittedAt: typeof item.submittedAt === "string" ? item.submittedAt : undefined,
      publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : null,
      correctionNote: typeof item.correctionNote === "string" ? item.correctionNote : null,
      correctionRequestedAt: typeof item.correctionRequestedAt === "string" ? item.correctionRequestedAt : null,
      rejectionNote: typeof item.rejectionNote === "string" ? item.rejectionNote : null,
      rejectedAt: typeof item.rejectedAt === "string" ? item.rejectedAt : null,
    }));
}

function formatEditorDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function mediaUrl(url: string | null) {
  if (!url) return "";
  return url.startsWith("http") ? url : `${apiBaseUrl}${url}`;
}

function tagsToInput(tags: string[]) {
  return tags.join(", ");
}

function inputToTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

function uniqueSlug(baseValue: string, posts: BlogPost[], currentId: string) {
  const base = slugify(baseValue) || `post-${Date.now()}`;
  const used = new Set(posts.filter((post) => post.id !== currentId).map((post) => slugify(post.slug || post.title)));
  let slug = base;
  let count = 2;
  while (used.has(slug)) {
    slug = `${base}-${count}`;
    count += 1;
  }
  return slug;
}

function stripHtml(value: string) {
  if (typeof document === "undefined") return value;
  const div = document.createElement("div");
  div.innerHTML = value;
  return div.textContent?.trim() ?? "";
}

function wordCount(value: string) {
  const text = stripHtml(value);
  return text ? text.split(/\s+/).filter(Boolean).length : 0;
}

const allowedHtmlTags = new Set([
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "br",
  "hr",
  "span",
  "div",
  "figure",
  "figcaption",
  "video",
  "source"
]);

const allowedAttrs: Record<string, Set<string>> = {
  a: new Set(["href", "target", "rel", "title"]),
  img: new Set(["src", "alt", "title", "width", "height", "class", "style"]),
  video: new Set(["src", "controls", "preload", "width", "height", "class", "style"]),
  source: new Set(["src", "type"]),
  span: new Set(["class", "style"]),
  div: new Set(["class", "style"]),
  p: new Set(["class", "style"]),
  figure: new Set(["class", "style"]),
  figcaption: new Set(["class"])
};

function safeStyle(value: string) {
  return value
    .split(";")
    .map((part) => part.trim())
    .filter((part) => /^(color|background-color|text-align|width|max-width|height|aspect-ratio|object-fit|object-position|float|margin|display):\s*[-#(),.%/\w\s]+$/i.test(part))
    .join("; ");
}

function sanitizeHtml(value: string) {
  if (typeof document === "undefined") return value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  const template = document.createElement("template");
  template.innerHTML = value;

  function clean(node: Node) {
    if (node.nodeType === Node.COMMENT_NODE) {
      if (node.textContent?.trim() !== "more") node.parentNode?.removeChild(node);
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || !allowedHtmlTags.has(tag)) {
      const parent = element.parentNode;
      while (element.firstChild) parent?.insertBefore(element.firstChild, element);
      element.remove();
      return;
    }

    for (const attr of Array.from(element.attributes)) {
      const attrName = attr.name.toLowerCase();
      const allowed = allowedAttrs[tag]?.has(attrName) ?? false;
      const isUnsafeHandler = attrName.startsWith("on");
      const isUnsafeUrl = (attrName === "href" || attrName === "src") && /^(javascript|data:text\/html)/i.test(attr.value.trim());
      if (!allowed || isUnsafeHandler || isUnsafeUrl) {
        element.removeAttribute(attr.name);
        continue;
      }
      if (attrName === "style") {
        const style = safeStyle(attr.value);
        if (style) element.setAttribute("style", style);
        else element.removeAttribute("style");
      }
      if (tag === "a" && attrName === "target" && attr.value === "_blank") {
        element.setAttribute("rel", "noreferrer noopener");
      }
    }

    Array.from(element.childNodes).forEach(clean);
  }

  Array.from(template.content.childNodes).forEach(clean);
  return template.innerHTML;
}

function mediaHtml(item: MediaAsset) {
  const url = mediaUrl(item.fileUrl);
  if (item.mediaType === "image") {
    const alt = (item.altText || item.title).replace(/"/g, "&quot;");
    return `<figure><img src="${url}" alt="${alt}" /><figcaption>${item.title}</figcaption></figure><p><br></p>`;
  }
  if (item.mediaType === "video") {
    return `<figure><video src="${url}" controls preload="metadata"></video><figcaption>${item.title}</figcaption></figure><p><br></p>`;
  }
  return `<p><a href="${url}" target="_blank" rel="noreferrer">${item.title}</a></p>`;
}

function mediaHtmlWithOptions(
  item: MediaAsset,
  options: {
    altText?: string;
    caption?: string;
    alignment?: MediaAlignment;
    size?: MediaSize;
    linkType?: MediaLinkType;
    customUrl?: string;
  } = {}
) {
  const url = mediaUrl(item.fileUrl);
  const title = item.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  if (item.mediaType === "image") {
    const alignClass = options.alignment && options.alignment !== "none" ? `align${options.alignment}` : "alignnone";
    const sizeClass = `size-${options.size ?? "full"}`;
    const alt = (options.altText ?? item.altText ?? item.title).replace(/"/g, "&quot;");
    const image = `<img src="${url}" alt="${alt}" />`;
    const linkUrl = options.linkType === "file" ? url : options.linkType === "custom" ? options.customUrl?.trim() : "";
    const linkedImage = linkUrl ? `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">${image}</a>` : image;
    const caption = options.caption?.trim() ? `<figcaption>${options.caption.trim().replace(/</g, "&lt;").replace(/>/g, "&gt;")}</figcaption>` : "";
    return `<figure class="${alignClass} ${sizeClass}">${linkedImage}${caption}</figure><p><br></p>`;
  }
  if (item.mediaType === "video") {
    return `<figure><video src="${url}" controls preload="metadata"></video><figcaption>${title}</figcaption></figure><p><br></p>`;
  }
  return `<p><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></p>`;
}

function galleryShortcode(items: MediaAsset[]) {
  return `[gallery ids="${items.map((item) => item.id).join(",")}"]`;
}

function MediaThumb({ item }: { item: MediaAsset }) {
  if (item.mediaType === "image") {
    return <img src={mediaUrl(item.thumbnailUrl ?? item.fileUrl)} alt={item.altText ?? item.title} className="h-full w-full object-cover" />;
  }
  if (item.mediaType === "video") {
    return (
      <span className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
        <PlaySquare className="h-7 w-7" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="flex h-full w-full items-center justify-center bg-red-50 text-red-600">
      <FileText className="h-7 w-7" aria-hidden="true" />
    </span>
  );
}

function MetaBox({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children?: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border border-[#dcdcde] bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between border-b border-[#dcdcde] px-3 py-2 text-left text-sm font-semibold text-[#1d2327]"
        onClick={() => setOpen((value) => !value)}
      >
        {title}
        <ChevronDown className={`h-4 w-4 text-[#8c8f94] transition ${open ? "" : "-rotate-90"}`} aria-hidden="true" />
      </button>
      {open ? <div className="p-3">{children}</div> : null}
    </section>
  );
}

function ClassicEditor({
  value,
  onChange,
  onUploadClick,
  onOpenMedia,
  allowMedia = true,
}: {
  value: string;
  onChange: (value: string) => void;
  onUploadClick: () => void;
  onOpenMedia: () => void;
  allowMedia?: boolean;
}) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const draggedMediaRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<"visual" | "text">("visual");
  const [showAdvanced, setShowAdvanced] = useState(true);
  const [pastePlain, setPastePlain] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [linkNewTab, setLinkNewTab] = useState(true);
  const [specialOpen, setSpecialOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [selectionRange, setSelectionRange] = useState<Range | null>(null);
  const [selectedMediaElement, setSelectedMediaElement] = useState<HTMLImageElement | HTMLVideoElement | null>(null);
  const [selectedMediaKey, setSelectedMediaKey] = useState("");
  const [mediaWidth, setMediaWidth] = useState(100);
  const [active, setActive] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (mode === "visual" && editorRef.current && cleanEditorHtml(editorRef.current) !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [mode, value]);

  function rememberSelection() {
    const selection = window.getSelection();
    if (selection?.rangeCount) setSelectionRange(selection.getRangeAt(0).cloneRange());
  }

  function restoreSelection() {
    if (!selectionRange) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(selectionRange);
  }

  function updateActiveState() {
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      strikeThrough: document.queryCommandState("strikeThrough"),
      insertUnorderedList: document.queryCommandState("insertUnorderedList"),
      insertOrderedList: document.queryCommandState("insertOrderedList")
    });
  }

  function syncEditor() {
    onChange(editorRef.current ? cleanEditorHtml(editorRef.current) : "");
    updateActiveState();
  }

  function cleanEditorHtml(root: HTMLElement) {
    const clone = root.cloneNode(true) as HTMLElement;
    clone.querySelectorAll("[data-editor-media-handle]").forEach((node) => node.remove());
    clone.querySelectorAll("[data-editor-media-key]").forEach((node) => (node as HTMLElement).removeAttribute("data-editor-media-key"));
    clone?.querySelectorAll("[data-editor-selected-media]").forEach((node) => {
      const element = node as HTMLElement;
      element.removeAttribute("data-editor-selected-media");
      element.style.outline = "";
      element.style.outlineOffset = "";
      element.style.cursor = "";
      element.style.position = "";
      if (!element.getAttribute("style")) element.removeAttribute("style");
    });
    return clone.innerHTML;
  }

  function mediaContainer(element: HTMLImageElement | HTMLVideoElement) {
    return (element.closest("figure") as HTMLElement | null) ?? element;
  }

  function ensureFigure(element: HTMLImageElement | HTMLVideoElement) {
    const currentFigure = element.closest("figure") as HTMLElement | null;
    if (currentFigure) {
      normalizeMediaBlock(currentFigure, element);
      return currentFigure;
    }
    const figure = document.createElement("figure");
    const parentBlock = element.closest("p,h1,h2,h3,h4,blockquote,li,div") as HTMLElement | null;
    (parentBlock?.parentNode ?? element.parentNode)?.insertBefore(figure, parentBlock ?? element);
    figure.appendChild(element);
    normalizeMediaBlock(figure, element);
    return figure;
  }

  function normalizeMediaBlock(container: HTMLElement, element?: HTMLImageElement | HTMLVideoElement) {
    const media = element ?? (container.querySelector("img,video") as HTMLImageElement | HTMLVideoElement | null);
    container.style.display = "block";
    container.style.clear = "both";
    container.style.maxWidth = "100%";
    container.style.marginTop = container.style.marginTop || "8px";
    container.style.marginBottom = container.style.marginBottom || "8px";
    if (media) {
      media.style.maxWidth = "100%";
      if (!media.style.width) media.style.width = "100%";
      media.style.height = "auto";
    }
  }

  function selectMediaElement(element: HTMLImageElement | HTMLVideoElement | null) {
    editorRef.current?.querySelectorAll("[data-editor-media-handle]").forEach((node) => node.remove());
    editorRef.current?.querySelectorAll("[data-editor-selected-media]").forEach((node) => {
      (node as HTMLElement).removeAttribute("data-editor-selected-media");
      (node as HTMLElement).style.outline = "";
      (node as HTMLElement).style.outlineOffset = "";
      (node as HTMLElement).style.cursor = "";
      (node as HTMLElement).style.position = "";
    });
    if (element) {
      const key = element.dataset.editorMediaKey || (crypto.randomUUID ? crypto.randomUUID() : `media-${Date.now()}-${Math.round(Math.random() * 100000)}`);
      element.dataset.editorMediaKey = key;
      const container = ensureFigure(element);
      normalizeMediaBlock(container, element);
      container.setAttribute("draggable", "true");
      container.setAttribute("data-editor-selected-media", "true");
      container.style.outline = "2px solid #2271b1";
      container.style.outlineOffset = "2px";
      container.style.cursor = "move";
      container.style.position = "relative";
      setSelectedMediaKey(key);
      setMediaWidth(Math.min(100, Math.max(10, Math.round((container.getBoundingClientRect().width / Math.max(1, editorRef.current?.getBoundingClientRect().width ?? 1)) * 100))));
      createMediaResizeHandles(element, container);
    } else {
      setSelectedMediaKey("");
    }
    setSelectedMediaElement(element);
  }

  function createMediaResizeHandles(element: HTMLImageElement | HTMLVideoElement, container: HTMLElement) {
    const positions = [
      { key: "nw", cursor: "nwse-resize", className: "-left-1.5 -top-1.5" },
      { key: "ne", cursor: "nesw-resize", className: "-right-1.5 -top-1.5" },
      { key: "sw", cursor: "nesw-resize", className: "-bottom-1.5 -left-1.5" },
      { key: "se", cursor: "nwse-resize", className: "-bottom-1.5 -right-1.5" }
    ];
    positions.forEach((position) => {
      const handle = document.createElement("span");
      handle.dataset.editorMediaHandle = position.key;
      handle.className = `absolute z-10 h-3 w-3 rounded-full border border-[#2271b1] bg-white shadow ${position.className}`;
      handle.style.cursor = position.cursor;
      handle.setAttribute("contenteditable", "false");
      handle.setAttribute("title", "Drag to resize media");
      handle.onmousedown = (event) => {
        event.preventDefault();
        event.stopPropagation();
        container.setAttribute("draggable", "false");
        const startX = event.clientX;
        const startWidth = container.getBoundingClientRect().width;
        const editorWidth = Math.max(1, editorRef.current?.getBoundingClientRect().width ?? startWidth);
        const invert = position.key.endsWith("w") ? -1 : 1;
        const onMove = (moveEvent: MouseEvent) => {
          const width = Math.min(100, Math.max(10, Math.round(((startWidth + (moveEvent.clientX - startX) * invert) / editorWidth) * 100)));
          container.className = container.className.replace(/\bsize-(thumbnail|medium|large|full)\b/g, "").trim();
          container.style.width = `${width}%`;
          container.style.maxWidth = "100%";
          container.style.display = "block";
          container.style.clear = "both";
          element.style.width = "100%";
          element.style.maxWidth = "100%";
          element.removeAttribute("width");
          element.removeAttribute("height");
          setMediaWidth(width);
        };
        const onUp = () => {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          container.setAttribute("draggable", "true");
          selectMediaElement(element);
          syncEditor();
        };
        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      };
      container.appendChild(handle);
    });
  }

  function currentSelectedMedia() {
    const byKey = selectedMediaKey
      ? (editorRef.current?.querySelector(`[data-editor-media-key="${CSS.escape(selectedMediaKey)}"]`) as HTMLImageElement | HTMLVideoElement | null)
      : null;
    const byOutline = editorRef.current?.querySelector("[data-editor-selected-media] img, [data-editor-selected-media] video") as HTMLImageElement | HTMLVideoElement | null;
    return byKey ?? byOutline ?? selectedMediaElement;
  }

  function updateSelectedMedia(mutator: (element: HTMLImageElement | HTMLVideoElement, container: HTMLElement) => void) {
    const media = currentSelectedMedia();
    if (!media) return;
    const container = ensureFigure(media);
    mutator(media, container);
    selectMediaElement(media);
    syncEditor();
  }

  function applyMediaAlignment(alignment: MediaAlignment) {
    updateSelectedMedia((element, container) => {
      container.className = `${container.className.replace(/\balign(left|center|right|none)\b/g, "").trim()} align${alignment}`.trim();
      container.style.float = alignment === "left" || alignment === "right" ? alignment : "";
      container.style.textAlign = alignment === "center" ? "center" : "";
      container.style.margin = alignment === "center" ? "8px auto" : "8px 0";
      container.style.display = "block";
      container.style.clear = "both";
      if (alignment === "none") {
        container.style.float = "";
        container.style.textAlign = "";
        container.style.margin = "8px 0";
        container.style.display = "block";
      }
    });
  }

  function resizeSelectedMedia(size: MediaSize) {
    const widths: Record<MediaSize, string> = {
      thumbnail: "150px",
      medium: "300px",
      large: "640px",
      full: "100%"
    };
    updateSelectedMedia((element, container) => {
      container.className = `${container.className.replace(/\bsize-(thumbnail|medium|large|full)\b/g, "").trim()} size-${size}`.trim();
      container.style.width = widths[size];
      container.style.maxWidth = "100%";
      container.style.display = "block";
      container.style.clear = "both";
      element.style.width = "100%";
      element.style.maxWidth = "100%";
      element.removeAttribute("width");
      element.removeAttribute("height");
      setMediaWidth(size === "thumbnail" ? 20 : size === "medium" ? 40 : size === "large" ? 75 : 100);
    });
  }

  function setSelectedMediaWidth(width: number) {
    const nextWidth = Math.min(100, Math.max(10, width));
    setMediaWidth(nextWidth);
    updateSelectedMedia((element, container) => {
      container.className = container.className.replace(/\bsize-(thumbnail|medium|large|full)\b/g, "").trim();
      container.style.width = `${nextWidth}%`;
      container.style.maxWidth = "100%";
      container.style.display = "block";
      container.style.clear = "both";
      element.style.width = "100%";
      element.style.maxWidth = "100%";
      element.removeAttribute("width");
      element.removeAttribute("height");
    });
  }

  function cropSelectedMedia(mode: "none" | "square" | "wide") {
    updateSelectedMedia((element) => {
      if (mode === "none") {
        element.style.aspectRatio = "";
        element.style.objectFit = "";
        element.style.objectPosition = "";
        element.style.height = "";
        return;
      }
      element.style.width = "100%";
      element.style.aspectRatio = mode === "square" ? "1 / 1" : "16 / 9";
      element.style.objectFit = "cover";
      element.style.objectPosition = "center";
    });
  }

  function moveSelectedMedia(direction: "up" | "down") {
    const media = currentSelectedMedia();
    if (!media) return;
    const container = mediaContainer(media);
    const sibling = direction === "up" ? container.previousElementSibling : container.nextElementSibling;
    if (!sibling || !container.parentNode) return;
    if (direction === "up") container.parentNode.insertBefore(container, sibling);
    else container.parentNode.insertBefore(sibling, container);
    selectMediaElement(media);
    syncEditor();
  }

  function removeSelectedMedia() {
    const media = currentSelectedMedia();
    if (!media) return;
    mediaContainer(media).remove();
    setSelectedMediaElement(null);
    setSelectedMediaKey("");
    syncEditor();
  }

  function onEditorClick(event: React.MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const media = target.closest("img,video") as HTMLImageElement | HTMLVideoElement | null;
    selectMediaElement(media);
  }

  function onEditorDragStart(event: React.DragEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement;
    const media = target.closest("img,video") as HTMLImageElement | HTMLVideoElement | null;
    draggedMediaRef.current = media ? mediaContainer(media) : (target.closest("figure") as HTMLElement | null);
    event.dataTransfer.effectAllowed = "move";
  }

  function onEditorDrop(event: React.DragEvent<HTMLDivElement>) {
    const dragged = draggedMediaRef.current;
    if (!dragged || !editorRef.current) return;
    event.preventDefault();
    const targetMedia = (event.target as HTMLElement).closest("img,video") as HTMLImageElement | HTMLVideoElement | null;
    const targetFigure = targetMedia ? mediaContainer(targetMedia) : ((event.target as HTMLElement).closest("figure") as HTMLElement | null);
    if (dragged.contains(event.target as Node)) {
      draggedMediaRef.current = null;
      const media = dragged.querySelector("img,video") as HTMLImageElement | HTMLVideoElement | null;
      selectMediaElement(media);
      return;
    }
    if (targetFigure && targetFigure !== dragged && targetFigure.parentNode) {
      const targetRect = targetFigure.getBoundingClientRect();
      targetFigure.parentNode.insertBefore(dragged, event.clientY > targetRect.top + targetRect.height / 2 ? targetFigure.nextSibling : targetFigure);
    } else {
      const range = caretRangeFromPoint(event.clientX, event.clientY);
      if (range && editorRef.current.contains(range.commonAncestorContainer)) {
        const block = blockElementForRange(range);
        if (block && block !== dragged && block.parentNode && !dragged.contains(block)) {
          block.parentNode.insertBefore(dragged, event.clientY > block.getBoundingClientRect().top + block.getBoundingClientRect().height / 2 ? block.nextSibling : block);
        } else {
          editorRef.current.appendChild(dragged);
        }
      } else {
        editorRef.current.appendChild(dragged);
      }
    }
    draggedMediaRef.current = null;
    const media = dragged.querySelector("img,video") as HTMLImageElement | HTMLVideoElement | null;
    selectMediaElement(media);
    syncEditor();
  }

  function caretRangeFromPoint(x: number, y: number) {
    const doc = document as Document & {
      caretRangeFromPoint?: (x: number, y: number) => Range | null;
      caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    };
    if (doc.caretRangeFromPoint) return doc.caretRangeFromPoint(x, y);
    const position = doc.caretPositionFromPoint?.(x, y);
    if (!position) return null;
    const range = document.createRange();
    range.setStart(position.offsetNode, position.offset);
    range.collapse(true);
    return range;
  }

  function blockElementForRange(range: Range) {
    const start = range.startContainer.nodeType === Node.ELEMENT_NODE ? (range.startContainer as HTMLElement) : range.startContainer.parentElement;
    const block = start?.closest("p,h1,h2,h3,h4,blockquote,li,figure") as HTMLElement | null;
    return block && editorRef.current?.contains(block) ? block : null;
  }

  function run(command: string, argument?: string) {
    setMode("visual");
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      restoreSelection();
      document.execCommand(command, false, argument);
      syncEditor();
    });
  }

  function openLinkModal() {
    const selected = window.getSelection()?.toString() ?? "";
    rememberSelection();
    setLinkText(selected);
    setLinkUrl("");
    setLinkOpen(true);
  }

  function addLink() {
    if (!linkUrl.trim()) return;
    setMode("visual");
    requestAnimationFrame(() => {
      editorRef.current?.focus();
      restoreSelection();
      if (linkText.trim() && !window.getSelection()?.toString()) {
        const attrs = linkNewTab ? ` target="_blank" rel="noopener noreferrer"` : "";
        document.execCommand("insertHTML", false, `<a href="${linkUrl.trim()}"${attrs}>${linkText.trim()}</a>`);
      } else {
        document.execCommand("createLink", false, linkUrl.trim());
        const selection = window.getSelection();
        const node = selection?.anchorNode?.parentElement;
        if (node?.tagName.toLowerCase() === "a") {
          if (linkNewTab) {
            node.setAttribute("target", "_blank");
            node.setAttribute("rel", "noopener noreferrer");
          } else {
            node.removeAttribute("target");
            node.removeAttribute("rel");
          }
        }
      }
      syncEditor();
      setLinkOpen(false);
    });
  }

  function insertHtml(html: string) {
    run("insertHTML", html);
  }

  function formatBlock(value: string) {
    run("formatBlock", value);
  }

  function onPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (!pastePlain) return;
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    syncEditor();
  }

  function onEditorKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openLinkModal();
    }
  }

  function clearFormatting() {
    run("removeFormat");
  }

  const firstRowTools = [
    { label: "Bold", icon: Bold, command: "bold", action: () => run("bold") },
    { label: "Italic", icon: Italic, command: "italic", action: () => run("italic") },
    { label: "Bulleted list", icon: List, command: "insertUnorderedList", action: () => run("insertUnorderedList") },
    { label: "Numbered list", icon: ListOrdered, command: "insertOrderedList", action: () => run("insertOrderedList") },
    { label: "Blockquote", icon: Quote, action: () => run("formatBlock", "blockquote") },
    { label: "Align left", icon: AlignLeft, action: () => run("justifyLeft") },
    { label: "Align center", icon: AlignCenter, action: () => run("justifyCenter") },
    { label: "Align right", icon: AlignRight, action: () => run("justifyRight") },
    { label: "Insert/Edit link", icon: Link2, action: openLinkModal },
    { label: "Remove link", icon: Minus, action: () => run("unlink") },
    { label: "Insert Read More tag", icon: Rows3, action: () => insertHtml("<!--more-->") },
    { label: "Toolbar toggle", icon: Pilcrow, action: () => setShowAdvanced((current) => !current) }
  ];

  const secondRowTools = [
    { label: "Underline", icon: Underline, command: "underline", action: () => run("underline") },
    { label: "Strikethrough", icon: Minus, command: "strikeThrough", action: () => run("strikeThrough") },
    { label: "Horizontal line", icon: Maximize2, action: () => insertHtml("<hr>") },
    { label: "Clear formatting", icon: Underline, action: clearFormatting },
    { label: "Special character", icon: Quote, action: () => setSpecialOpen(true) },
    { label: "Decrease indent", icon: AlignLeft, action: () => run("outdent") },
    { label: "Increase indent", icon: AlignRight, action: () => run("indent") },
    { label: "Undo", icon: ArrowLeft, action: () => run("undo") },
    { label: "Redo", icon: AlignRight, action: () => run("redo") },
    { label: "Keyboard shortcuts", icon: FileText, action: () => setHelpOpen(true) }
  ];
  const specialCharacters = ["©", "®", "™", "—", "–", "•", "£", "€", "$", "৳", "→", "←", "✓", "✕", "★"];

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        {allowMedia ? (
          <>
            <Button type="button" variant="outline" size="sm" className="h-8 rounded-sm border-[#c3c4c7] bg-[#f6f7f7] px-2 text-[#1d2327]" onClick={onOpenMedia}>
              <ImageIcon className="h-4 w-4" aria-hidden="true" />
              Add Media
            </Button>
            <button type="button" className="hidden" onClick={onUploadClick} aria-label="Upload media" />
          </>
        ) : null}
      </div>
      <div className="overflow-hidden border border-[#dcdcde] bg-white">
        <div className="border-b border-[#dcdcde] bg-[#f6f7f7]">
          <div className="flex items-end justify-between">
            <div className="flex flex-wrap items-center gap-0.5 p-1.5">
              <select
                className="mr-1 h-7 rounded-sm border border-[#c3c4c7] bg-white px-2 text-xs text-[#1d2327]"
                defaultValue="p"
                onChange={(event) => formatBlock(event.target.value)}
                aria-label="Paragraph format"
              >
                <option value="p">Paragraph</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
                <option value="h4">Heading 4</option>
              </select>
              {firstRowTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = tool.command ? active[tool.command] : false;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-sm text-[#646970] hover:border hover:border-[#8c8f94] hover:bg-white hover:text-[#1d2327] ${isActive ? "border border-[#8c8f94] bg-white text-[#1d2327]" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={tool.action}
                    title={tool.label}
                    aria-label={tool.label}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
            <div className="mr-1 flex self-stretch pt-1">
              <button
                type="button"
                className={`border border-b-0 px-3 text-sm ${mode === "visual" ? "border-[#dcdcde] bg-white text-[#1d2327]" : "border-transparent text-[#50575e]"}`}
                onClick={() => setMode("visual")}
              >
                Visual
              </button>
              <button
                type="button"
                className={`border border-b-0 px-3 text-sm ${mode === "text" ? "border-[#dcdcde] bg-white text-[#1d2327]" : "border-transparent text-[#50575e]"}`}
                onClick={() => setMode("text")}
              >
                Text
              </button>
            </div>
          </div>
          {showAdvanced ? (
            <div className="flex flex-wrap items-center gap-0.5 border-t border-[#dcdcde] p-1.5">
              {secondRowTools.map((tool) => {
                const Icon = tool.icon;
                const isActive = tool.command ? active[tool.command] : false;
                return (
                  <button
                    key={tool.label}
                    type="button"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-sm text-[#646970] hover:border hover:border-[#8c8f94] hover:bg-white hover:text-[#1d2327] ${isActive ? "border border-[#8c8f94] bg-white text-[#1d2327]" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={tool.action}
                    title={tool.label}
                    aria-label={tool.label}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </button>
                );
              })}
              <label className="ml-1 inline-flex h-7 items-center gap-1 rounded-sm border border-[#c3c4c7] bg-white px-2 text-xs text-[#3c434a]">
                <span>Color</span>
                <input type="color" className="h-5 w-6 border-0 bg-transparent p-0" onChange={(event) => run("foreColor", event.target.value)} aria-label="Text color" />
              </label>
              <button
                type="button"
                className={`ml-1 h-7 rounded-sm border border-[#c3c4c7] px-2 text-xs ${pastePlain ? "bg-[#2271b1] text-white" : "bg-white text-[#3c434a]"}`}
                onClick={() => setPastePlain((current) => !current)}
              >
                Paste text
              </button>
              <select
                className="ml-1 h-7 rounded-sm border border-[#c3c4c7] bg-white px-2 text-xs text-[#3c434a]"
                defaultValue=""
                aria-label="Insert shortcode"
                onChange={(event) => {
                  if (!event.target.value) return;
                  // Shortcode rendering should be connected in the public content renderer when dynamic blocks are implemented.
                  insertHtml(event.target.value);
                  event.currentTarget.value = "";
                }}
              >
                <option value="">Shortcode</option>
                {editorShortcodes.map((shortcode) => (
                  <option key={shortcode} value={shortcode}>{shortcode}</option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
        {specialOpen ? (
          <div className="border-b border-[#dcdcde] bg-white p-2">
            <div className="flex flex-wrap gap-1">
              {safeSpecialCharacters.map((character) => (
                <button
                  key={character}
                  type="button"
                  className="h-8 min-w-8 rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-2 text-sm hover:bg-white"
                  onClick={() => {
                    insertHtml(character);
                    setSpecialOpen(false);
                  }}
                >
                  {character}
                </button>
              ))}
              <button type="button" className="ml-auto h-8 rounded-sm border border-[#c3c4c7] px-3 text-xs" onClick={() => setSpecialOpen(false)}>
                Close
              </button>
            </div>
          </div>
        ) : null}
        {mode === "visual" && selectedMediaElement ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-[#dcdcde] bg-white px-3 py-2 text-xs text-[#3c434a]">
            <span className="font-semibold text-[#1d2327]">Selected media</span>
            <label className="inline-flex items-center gap-1">
              Align
              <select className="h-7 rounded-sm border border-[#c3c4c7] bg-white px-2" defaultValue="none" onChange={(event) => applyMediaAlignment(event.target.value as MediaAlignment)} aria-label="Media alignment">
                <option value="none">None</option>
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-1">
              Size
              <select className="h-7 rounded-sm border border-[#c3c4c7] bg-white px-2" defaultValue="full" onChange={(event) => resizeSelectedMedia(event.target.value as MediaSize)} aria-label="Media size">
                <option value="thumbnail">Thumbnail</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
                <option value="full">Full</option>
              </select>
            </label>
            <label className="inline-flex min-w-[180px] items-center gap-2">
              Width
              <input
                type="range"
                min="10"
                max="100"
                value={mediaWidth}
                className="w-24 accent-[#2271b1]"
                onChange={(event) => setSelectedMediaWidth(Number(event.target.value))}
                aria-label="Media width"
              />
              <span className="w-8 tabular-nums">{mediaWidth}%</span>
            </label>
            <label className="inline-flex items-center gap-1">
              Crop
              <select className="h-7 rounded-sm border border-[#c3c4c7] bg-white px-2" defaultValue="none" onChange={(event) => cropSelectedMedia(event.target.value as "none" | "square" | "wide")} aria-label="Media crop">
                <option value="none">None</option>
                <option value="square">Square</option>
                <option value="wide">Wide</option>
              </select>
            </label>
            <button type="button" className="h-7 rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-2 hover:bg-white" onClick={() => moveSelectedMedia("up")} title="Move media up" aria-label="Move media up">
              Move up
            </button>
            <button type="button" className="h-7 rounded-sm border border-[#c3c4c7] bg-[#f6f7f7] px-2 hover:bg-white" onClick={() => moveSelectedMedia("down")} title="Move media down" aria-label="Move media down">
              Move down
            </button>
            <button type="button" className="h-7 rounded-sm border border-[#c3c4c7] bg-white px-2 text-[#b32d2e] hover:bg-[#fcf0f1]" onClick={removeSelectedMedia} title="Remove media" aria-label="Remove media">
              Remove
            </button>
          </div>
        ) : null}
        {mode === "visual" ? (
          <div
            ref={editorRef}
            className="prose prose-sm min-h-[340px] max-w-none bg-white px-4 py-3 text-sm leading-7 outline-none"
            contentEditable
            suppressContentEditableWarning
            onBlur={rememberSelection}
            onClick={onEditorClick}
            onDragStart={onEditorDragStart}
            onDragOver={(event) => event.preventDefault()}
            onDrop={onEditorDrop}
            onKeyUp={updateActiveState}
            onMouseUp={() => {
              rememberSelection();
              updateActiveState();
            }}
            onKeyDown={onEditorKeyDown}
            onPaste={onPaste}
            onInput={(event) => onChange(event.currentTarget.innerHTML)}
          />
        ) : (
          <textarea
            className="min-h-[340px] w-full resize-y border-0 bg-white p-3 font-mono text-sm leading-6 outline-none"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        <div className="border-t border-[#dcdcde] bg-[#f6f7f7] px-3 py-1 text-xs text-[#3c434a]">Path: p</div>
        <div className="border-t border-[#dcdcde] bg-[#f6f7f7] px-3 py-1 text-xs text-[#3c434a]">Word count: {wordCount(value)}</div>
      </div>
      {linkOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md border border-[#dcdcde] bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#1d2327]">Insert/Edit Link</h3>
            <label className="mt-4 block text-sm font-medium text-[#3c434a]">
              URL
              <input className="mt-1 h-10 w-full border border-[#c3c4c7] px-3 text-sm" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" />
            </label>
            <label className="mt-3 block text-sm font-medium text-[#3c434a]">
              Link text
              <input className="mt-1 h-10 w-full border border-[#c3c4c7] px-3 text-sm" value={linkText} onChange={(event) => setLinkText(event.target.value)} placeholder="Optional if text is selected" />
            </label>
            <label className="mt-3 flex items-center gap-2 text-sm text-[#3c434a]">
              <input type="checkbox" checked={linkNewTab} onChange={(event) => setLinkNewTab(event.target.checked)} />
              Open in new tab
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-sm border border-[#c3c4c7] px-3 py-1.5 text-sm" onClick={() => setLinkOpen(false)}>Cancel</button>
              <button type="button" className="rounded-sm border border-[#0073aa] bg-[#0085ba] px-3 py-1.5 text-sm font-medium text-white" onClick={addLink}>Add Link</button>
            </div>
          </div>
        </div>
      ) : null}
      {helpOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md border border-[#dcdcde] bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-[#1d2327]">Keyboard Shortcuts</h3>
            <dl className="mt-4 grid gap-2 text-sm text-[#3c434a]">
              {["Ctrl+B = Bold", "Ctrl+I = Italic", "Ctrl+Z = Undo", "Ctrl+Y = Redo", "Ctrl+K = Insert link", "Ctrl+Shift+V = Paste as plain text"].map((item) => (
                <div key={item} className="rounded-sm border border-[#dcdcde] bg-[#f6f7f7] px-3 py-2">{item}</div>
              ))}
            </dl>
            <div className="mt-5 flex justify-end">
              <button type="button" className="rounded-sm border border-[#c3c4c7] px-3 py-1.5 text-sm" onClick={() => setHelpOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function BlogPostEditor({ postId, mode = "admin" }: { postId?: string; mode?: "admin" | "member" }) {
  const router = useRouter();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [pages, setPages] = useState<WebsitePage[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [draft, setDraft] = useState<BlogPost>(emptyPost());
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [newTag, setNewTag] = useState("");
  const [taxonomyInput, setTaxonomyInput] = useState("");
  const [mediaItems, setMediaItems] = useState<MediaAsset[]>([]);
  const [mediaSearch, setMediaSearch] = useState("");
  const [mediaOpen, setMediaOpen] = useState(false);
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [mediaAltText, setMediaAltText] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [mediaAlignment, setMediaAlignment] = useState<MediaAlignment>("center");
  const [mediaSize, setMediaSize] = useState<MediaSize>("medium");
  const [mediaLinkType, setMediaLinkType] = useState<MediaLinkType>("none");
  const [mediaCustomUrl, setMediaCustomUrl] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const isMemberMode = mode === "member";
  const page = useMemo(() => pages.find((item) => item.key === "srithir_patha") ?? null, [pages]);
  const isEditing = Boolean(postId);
  const tagOptions = useMemo(
    () => Array.from(new Set(posts.flatMap((post) => post.tags).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [posts],
  );
  const taxonomyOptions = useMemo(
    () =>
      Array.from(
        new Set([
          "Uncategorized",
          ...draft.taxonomies,
          ...(draft.category ? [draft.category] : []),
          ...posts.flatMap((post) => (post.taxonomies?.length ? post.taxonomies : post.category ? [post.category] : [])),
        ]),
      ).sort((a, b) => (a === "Uncategorized" ? -1 : b === "Uncategorized" ? 1 : a.localeCompare(b))),
    [draft.category, draft.taxonomies, posts],
  );

  useEffect(() => {
    async function load() {
      if (isMemberMode) {
        try {
          const data = await apiRequest<{ items: BlogPost[] }>("/member/smritir-pata");
          const current = postId ? normalizePosts(data.items).find((item) => item.id === postId) : null;
          const nextDraft = current ?? {
            ...emptyPost(),
            status: "draft" as const,
            category: "Member Writing",
            taxonomies: ["Member Writing"]
          };
          setPosts(normalizePosts(data.items));
          setDraft({
            ...nextDraft,
            slug: nextDraft.slug || slugify(nextDraft.title),
            taxonomies: nextDraft.taxonomies?.length ? nextDraft.taxonomies : nextDraft.category ? [nextDraft.category] : ["Member Writing"],
          });
          setTagInput(current ? tagsToInput(current.tags) : "");
          setTaxonomyInput("");
          setSlugTouched(Boolean(current?.slug));
        } catch {
          setError("Could not load your Smritir Pata posts.");
        } finally {
          setLoading(false);
        }
        return;
      }
      try {
        const data = await apiRequest<WebsitePage[]>("/admin/website/pages");
        const selected = data.find((item) => item.key === "srithir_patha");
        const normalized = normalizePosts(selected?.contentBlocks);
        const current = postId ? normalized.find((item) => item.id === postId) : null;
        setPages(data);
        setPosts(normalized);
        const nextDraft = current ?? emptyPost();
        setDraft({
          ...nextDraft,
          slug: nextDraft.slug || slugify(nextDraft.title),
          taxonomies: nextDraft.taxonomies?.length ? nextDraft.taxonomies : nextDraft.category ? [nextDraft.category] : [],
        });
        setTagInput(current ? tagsToInput(current.tags) : "");
        setTaxonomyInput("");
        setSlugTouched(Boolean(current?.slug));
      } catch {
        setError("Could not load Smritir Pata posts.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [isMemberMode, postId]);

  async function loadMedia() {
    const query = new URLSearchParams();
    query.set("limit", "80");
    if (mediaSearch.trim()) query.set("search", mediaSearch.trim());
    const endpoint = isMemberMode ? `/member/smritir-pata/media?${query.toString()}` : `/admin/website/media?${query.toString()}`;
    const data = await apiRequest<MediaLibraryResponse>(endpoint);
    setMediaItems(data.items);
  }

  useEffect(() => {
    if (!mediaOpen) return;
    void loadMedia().catch(() => setError("Could not load media library."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaOpen]);

  const selectedMedia = useMemo(
    () => selectedMediaIds.map((id) => mediaItems.find((item) => item.id === id)).filter((item): item is MediaAsset => Boolean(item)),
    [mediaItems, selectedMediaIds],
  );
  const selectedImage = selectedMedia.length === 1 && selectedMedia[0].mediaType === "image" ? selectedMedia[0] : null;

  function toggleMediaSelection(item: MediaAsset) {
    setSelectedMediaIds((current) => {
      const exists = current.includes(item.id);
      const next = exists ? current.filter((id) => id !== item.id) : [...current, item.id];
      return next;
    });
    if (item.mediaType === "image") {
      setMediaAltText(item.altText ?? item.title);
      setMediaCaption(item.title);
    }
  }

  function insertSelectedMedia() {
    if (!selectedMedia.length) return;
    const imageItems = selectedMedia.filter((item) => item.mediaType === "image");
    const nonImageItems = selectedMedia.filter((item) => item.mediaType !== "image");
    const htmlParts: string[] = [];
    if (selectedMedia.length > 1 && imageItems.length > 1) {
      htmlParts.push(galleryShortcode(imageItems));
    } else {
      htmlParts.push(
        ...imageItems.map((item) =>
          mediaHtmlWithOptions(item, {
            altText: mediaAltText,
            caption: mediaCaption,
            alignment: mediaAlignment,
            size: mediaSize,
            linkType: mediaLinkType,
            customUrl: mediaCustomUrl
          })
        )
      );
    }
    htmlParts.push(...nonImageItems.map((item) => mediaHtmlWithOptions(item)));
    setDraft((current) => ({ ...current, body: `${current.body}${htmlParts.join("")}` }));
    setSelectedMediaIds([]);
    setMediaAltText("");
    setMediaCaption("");
    setMediaCustomUrl("");
    setMediaOpen(false);
  }

  function updateTitle(title: string) {
    setDraft((current) => ({
      ...current,
      title,
      slug: slugTouched ? current.slug : uniqueSlug(title, posts, current.id),
    }));
  }

  function updateSlug(value: string) {
    setSlugTouched(true);
    setDraft((current) => ({ ...current, slug: slugify(value) }));
  }

  function addTag() {
    const tag = newTag.trim();
    if (!tag) return;
    const next = Array.from(new Set([...inputToTags(tagInput), tag]));
    setTagInput(tagsToInput(next));
    setNewTag("");
  }

  function addTaxonomy() {
    const taxonomy = taxonomyInput.trim();
    if (!taxonomy) return;
    setDraft((current) => ({
      ...current,
      category: taxonomy,
      taxonomies: Array.from(new Set([...(current.taxonomies ?? []).filter((item) => item !== "Uncategorized"), taxonomy])),
    }));
    setTaxonomyInput("");
  }

  function toggleTaxonomy(taxonomy: string) {
    setDraft((current) => {
      const currentTaxonomies = current.taxonomies ?? [];
      const exists = currentTaxonomies.includes(taxonomy);
      const next = exists
        ? currentTaxonomies.filter((item) => item !== taxonomy)
        : taxonomy === "Uncategorized"
          ? ["Uncategorized"]
          : [...currentTaxonomies.filter((item) => item !== "Uncategorized"), taxonomy];
      return {
        ...current,
        taxonomies: next,
        category: next.find((item) => item !== "Uncategorized") ?? next[0] ?? "",
      };
    });
  }

  function previewPost() {
    setPreviewOpen(true);
  }

  async function uploadMedia(files: FileList | null) {
    const fileList = Array.from(files ?? []);
    if (!fileList.length) return;
    const invalid = fileList.find((file) => file.size > maxFileSize || !allowedTypes.has(file.type));
    if (invalid) {
      setError("Only JPG, PNG, WebP, MP4, WebM, or PDF files up to 2MB are allowed.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      fileList.forEach((file) => form.append("files", file));
      const token = getAccessToken();
      const uploadPath = isMemberMode ? "/api/member/smritir-pata/media" : "/api/admin/website/media";
      const response = await fetch(`${apiBaseUrl}${uploadPath}`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: "include",
        body: form,
      });
      if (!response.ok) throw new Error("Upload failed.");
      const uploaded = (await response.json()) as { items: MediaAsset[] };
      if (mediaOpen) {
        setMediaItems((current) => [...uploaded.items, ...current]);
        setSelectedMediaIds(uploaded.items.map((item) => item.id));
      } else {
        const html = uploaded.items.map((item) => mediaHtmlWithOptions(item)).join("");
        setDraft((current) => ({ ...current, body: `${current.body}${html}` }));
      }
      setMessage(`${uploaded.items.length} media item${uploaded.items.length === 1 ? "" : "s"} uploaded.`);
      if (mediaOpen) await loadMedia();
    } catch {
      setError("Media upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (uploadInputRef.current) uploadInputRef.current.value = "";
    }
  }

  async function save(status?: BlogPost["status"]) {
    if (isMemberMode) {
      if (!draft.title.trim()) {
        setError("Post title is required.");
        return;
      }
      const targetStatus = status === "draft" ? "draft" : "pending";
      if (targetStatus === "pending" && !draft.body.trim()) {
        setError("Post body is required.");
        return;
      }
      setError(null);
      const category = (draft.taxonomies.find((taxonomy) => taxonomy !== "Uncategorized") ?? draft.category.trim()) || "Member Writing";
      const editingId = postId ?? draft.id;
      const response = await apiRequest<{ id: string; message: string; status: "draft" | "pending" }>(
        editingId ? `/member/smritir-pata/${encodeURIComponent(editingId)}` : "/member/smritir-pata",
        {
        method: editingId ? "PATCH" : "POST",
        body: JSON.stringify({
          title: draft.title.trim(),
          summary: draft.summary.trim() || stripHtml(draft.body).slice(0, 180),
          body: sanitizeHtml(draft.body.trim()),
          category,
          tags: inputToTags(tagInput),
          status: targetStatus
        })
      });
      const nextDraft = {
        ...emptyPost(),
        status: "draft" as const,
        category: "Member Writing",
        taxonomies: ["Member Writing"]
      };
      setDraft(nextDraft);
      setTagInput("");
      setTaxonomyInput("");
      setSlugTouched(false);
      window.sessionStorage.setItem("mms_member_smritir_flash", response.message || (targetStatus === "draft" ? "Draft saved." : "Your writing has been submitted for admin review."));
      router.replace("/member/smritir-pata");
      return;
    }
    if (!page) {
      setError("Smritir Pata page settings were not found.");
      return;
    }
    if (!draft.title.trim()) {
      setError("Post title is required.");
      return;
    }
    const itemId = postId ?? (draft.id || crypto.randomUUID());
    const currentUser = await fetchCurrentUser().catch(() => null);
    const previous = posts.find((post) => post.id === itemId);
    const changedContent = Boolean(previous && (previous.title !== draft.title || previous.body !== draft.body || previous.status !== draft.status));
    const revisions = changedContent && previous
      ? [
          {
            id: crypto.randomUUID(),
            savedAt: new Date().toISOString(),
            savedBy: currentUser?.user.fullName || "Admin",
            title: previous.title,
            body: previous.body,
            status: previous.status
          },
          ...(previous.revisions ?? [])
        ].slice(0, 20)
      : draft.revisions;
    const item: BlogPost = {
      ...draft,
      id: itemId,
      title: draft.title.trim(),
      slug: uniqueSlug(draft.slug || draft.title, posts, itemId),
      summary: draft.summary.trim() || stripHtml(draft.body).slice(0, 180),
      body: sanitizeHtml(draft.body.trim()),
      taxonomies: draft.taxonomies.length ? draft.taxonomies : [draft.category.trim() || "Uncategorized"],
      category: (draft.taxonomies.find((taxonomy) => taxonomy !== "Uncategorized") ?? draft.category.trim()) || "Uncategorized",
      tags: inputToTags(tagInput),
      authorUserId: draft.authorUserId || currentUser?.user.id || "",
      authorName: draft.authorName || currentUser?.user.fullName || "Admin",
      revisions,
      status: status ?? draft.status,
    };
    const nextPosts = postId || posts.some((post) => post.id === item.id)
      ? posts.map((post) => (post.id === item.id ? item : post))
      : [item, ...posts];
    await apiRequest<WebsitePage[]>("/admin/website/pages", {
      method: "PATCH",
      body: JSON.stringify({ items: [{ ...page, contentBlocks: nextPosts }] }),
    });
    setPosts(nextPosts);
    setDraft(item);
    setTaxonomyInput("");
    setSlugTouched(true);
    setMessage(status === "draft" ? "Draft saved." : item.status === "published" && (postId || draft.id) ? "Post updated and live page updated." : "Post published and live page updated.");
    if (!postId) {
      router.replace(`/admin/smritir-pata/${item.id}`);
    }
  }

  async function moveToTrash() {
    if (isMemberMode) {
      const editingId = postId ?? draft.id;
      if (!editingId) {
        const nextDraft = {
          ...emptyPost(),
          status: "draft" as const,
          category: "Member Writing",
          taxonomies: ["Member Writing"]
        };
        setDraft(nextDraft);
        setTagInput("");
        setTaxonomyInput("");
        setSlugTouched(false);
        setMessage("Draft cleared.");
        return;
      }
      if (!window.confirm("Move this post to trash?")) return;
      const response = await apiRequest<{ message: string }>(`/member/smritir-pata/${encodeURIComponent(editingId)}/trash`, { method: "POST" });
      window.sessionStorage.setItem("mms_member_smritir_flash", response.message || "Post moved to trash.");
      router.replace("/member/smritir-pata");
      return;
    }
    if (!postId && !draft.id) {
      router.push("/admin/smritir-pata");
      return;
    }
    if (!page) {
      setError("Smritir Pata page settings were not found.");
      return;
    }
    if (!window.confirm("Move this post to trash?")) return;
    const currentId = postId ?? draft.id;
    const nextPosts = posts.filter((post) => post.id !== currentId);
    await apiRequest<WebsitePage[]>("/admin/website/pages", {
      method: "PATCH",
      body: JSON.stringify({ items: [{ ...page, contentBlocks: nextPosts }] }),
    });
    setMessage("Post moved to trash.");
    router.push("/admin/smritir-pata");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void save(draft.status);
  }

  function restoreRevision(revision: BlogPostRevision) {
    setDraft((current) => ({
      ...current,
      title: revision.title,
      body: revision.body,
      status: revision.status
    }));
    setMessage("Revision restored in the editor. Click Update to save it.");
  }

  if (loading) return <div className="border border-[#dcdcde] bg-white p-5 text-sm text-[#646970]">Loading editor...</div>;

  if (!isMemberMode && draft.submittedByMemberId) {
    return (
      <div className="-m-3 bg-[#f1f1f1] p-3 text-[#1d2327] sm:-m-4 sm:p-5 xl:-m-5 xl:p-6">
        <Button asChild variant="ghost" className="mb-4 h-auto px-0 text-[#2271b1] hover:bg-transparent hover:text-[#135e96]">
          <Link href="/admin/smritir-pata">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Posts
          </Link>
        </Button>
        <div className="border-l-4 border-amber-500 bg-white p-4 text-sm text-amber-900">
          Member-submitted Smritir Pata posts cannot be edited by admin. Please use Preview, Approve, or Request correction from the Smritir Pata list.
        </div>
        <article className="mt-5 border border-[#dcdcde] bg-white p-6">
          <p className="text-sm font-medium uppercase tracking-wide text-[#2271b1]">Review only</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#1d2327]">{draft.title || "Untitled"}</h1>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#646970]">
            <span className="capitalize">Status {draft.status.replace("_", " ")}</span>
            <span>Written by {draft.authorName || "Member"}</span>
          </div>
          {draft.correctionNote ? <div className="mt-4 rounded-sm border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{draft.correctionNote}</div> : null}
          <div className="prose prose-sm mt-5 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.body) }} />
        </article>
      </div>
    );
  }

  const memberDateLabel = draft.status === "published" ? "Published date" : "Request date";
  const memberDateValue = draft.status === "published" ? (draft.publishedAt ?? draft.date) : (draft.submittedAt ?? draft.date);

  return (
    <form className="-m-3 bg-[#f1f1f1] p-3 text-[#1d2327] sm:-m-4 sm:p-5 xl:-m-5 xl:p-6" onSubmit={onSubmit}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <Button asChild variant="ghost" className="mb-1 h-auto px-0 text-[#2271b1] hover:bg-transparent hover:text-[#135e96]">
            <Link href={isMemberMode ? "/member/smritir-pata" : "/admin/smritir-pata"}>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {isMemberMode ? "Back to My Articles" : "Back to Posts"}
              </Link>
          </Button>
          <h1 className="text-2xl font-normal text-[#1d2327]">{isMemberMode ? (isEditing ? "Edit Smritir Pata" : "Write Smritir Pata") : isEditing ? "Edit Post" : "Add New Post"}</h1>
        </div>
      </div>

      {message ? <div className="mb-4 border-l-4 border-green-500 bg-white p-3 text-sm text-green-800">{message}</div> : null}
      {error ? <div className="mb-4 border-l-4 border-red-500 bg-white p-3 text-sm text-red-700">{error}</div> : null}
      {isMemberMode && draft.status === "correction_requested" && draft.correctionNote ? (
        <div className="mb-4 border-l-4 border-amber-500 bg-white p-3 text-sm text-amber-900">
          <p className="font-semibold">Admin correction request</p>
          <p className="mt-1">{draft.correctionNote}</p>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <main className="min-w-0 space-y-5">
          <input
            className="h-[38px] w-full border border-[#dcdcde] bg-white px-3 text-2xl font-normal text-[#1d2327] outline-none placeholder:text-[#72777c] focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
            placeholder="Enter title here"
            value={draft.title}
            onChange={(event) => updateTitle(event.target.value)}
          />
          <div className="-mt-3 flex flex-wrap items-center gap-2 rounded-sm border border-[#dcdcde] bg-white px-3 py-2 text-sm text-[#3c434a]">
            <span>Permalink:</span>
            <span className="text-[#646970]">domain.com/smritir-pata/</span>
            <input
              className="h-7 min-w-[180px] flex-1 rounded-sm border border-[#c3c4c7] px-2 text-sm outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
              value={draft.slug}
              onChange={(event) => updateSlug(event.target.value)}
              placeholder="post-slug"
            />
          </div>

          <ClassicEditor
            value={draft.body}
            onChange={(body) => setDraft((current) => ({ ...current, body }))}
            onUploadClick={() => uploadInputRef.current?.click()}
            onOpenMedia={() => setMediaOpen(true)}
            allowMedia={true}
          />

          <MetaBox title="Excerpt">
            <textarea
              className="min-h-24 w-full border border-[#dcdcde] bg-white p-2 text-sm outline-none focus:border-[#2271b1] focus:ring-1 focus:ring-[#2271b1]"
              value={draft.summary}
              onChange={(event) => setDraft((current) => ({ ...current, summary: event.target.value }))}
            />
          </MetaBox>
          <MetaBox title="Discussion">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.allowComments}
                onChange={(event) => setDraft((current) => ({ ...current, allowComments: event.target.checked }))}
              />
              Allow comments
            </label>
          </MetaBox>
        </main>

        <aside className="space-y-5">
          <MetaBox title="Publish">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <button type="button" className="inline-flex items-center gap-1 border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-1 text-[#2271b1]" onClick={() => void save("draft")}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save Draft
                </button>
                <button type="button" className="border border-[#c3c4c7] bg-[#f6f7f7] px-3 py-1 text-[#2271b1]" onClick={previewPost}>Preview</button>
              </div>
              <div className="space-y-2 border-b border-[#dcdcde] pb-3 text-[#3c434a]">
                <p className="flex items-center gap-2">
                  <Pin className="h-4 w-4 text-[#8c8f94]" aria-hidden="true" />
                  Status: <strong className="capitalize">{draft.status}</strong>
                  {isMemberMode ? (
                    <span className="rounded-sm bg-[#f6f7f7] px-2 py-1 text-xs">Admin review required</span>
                  ) : (
                    <select
                      className="h-7 border border-[#dcdcde] bg-white px-1 text-xs"
                      value={draft.status}
                      onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as BlogPost["status"] }))}
                    >
                      <option value="draft">Draft</option>
                      <option value="pending">Pending Review</option>
                      <option value="published">Published</option>
                      <option value="trash">Trash</option>
                      <option value="correction_requested">Correction Requested</option>
                    </select>
                  )}
                </p>
                <p className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#8c8f94]" aria-hidden="true" />
                  Visibility: <strong>{isMemberMode ? "After approval" : "Public"}</strong> {!isMemberMode ? <button type="button" className="text-[#2271b1]">Edit</button> : null}
                </p>
                <p className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#8c8f94]" aria-hidden="true" />
                  {isMemberMode ? (
                    <>
                      <span>{memberDateLabel}:</span>
                      <strong>{formatEditorDate(memberDateValue)}</strong>
                    </>
                  ) : (
                    <>
                      Publish
                      <input
                        type="date"
                        className="h-7 min-w-0 flex-1 border border-[#dcdcde] px-1 text-xs"
                        value={draft.date}
                        onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                      />
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center justify-between pt-1">
                <button type="button" className="inline-flex items-center gap-1 text-red-600" onClick={() => void moveToTrash()}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  {isMemberMode && !isEditing ? "Clear" : "Move to Trash"}
                </button>
                <button type="button" className="rounded-sm border border-[#0073aa] bg-[#0085ba] px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-[#0073aa]" onClick={() => void save(isMemberMode ? "pending" : "published")}>
                  {isMemberMode ? "Submit for Review" : draft.status === "published" || isEditing ? "Update" : "Publish"}
                </button>
              </div>
            </div>
          </MetaBox>

          <MetaBox title="Taxonomy">
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 border-b border-[#dcdcde]">
                <button type="button" className="border border-b-0 border-[#dcdcde] bg-white px-2 py-1">All Taxonomies</button>
                <button type="button" className="px-2 py-1 text-[#2271b1]">Most Used</button>
              </div>
              <div className="max-h-40 overflow-y-auto rounded-sm border border-[#dcdcde] bg-white p-2">
                {taxonomyOptions.map((taxonomy) => (
                  <label key={taxonomy} className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      checked={taxonomy === "Uncategorized" ? !draft.taxonomies.length || draft.taxonomies.includes("Uncategorized") : draft.taxonomies.includes(taxonomy)}
                      onChange={() => toggleTaxonomy(taxonomy)}
                    />
                    {taxonomy}
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="h-9 min-w-0 flex-1 border border-[#dcdcde] px-2 text-sm"
                  placeholder="+ Add New Taxonomy"
                  value={taxonomyInput}
                  onChange={(event) => setTaxonomyInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTaxonomy();
                    }
                  }}
                />
                <button type="button" className="border border-[#c3c4c7] bg-[#f6f7f7] px-3 text-sm text-[#2271b1]" onClick={addTaxonomy}>Add</button>
              </div>
              <p className="text-xs text-[#646970]">Multiple taxonomies can be selected.</p>
            </div>
          </MetaBox>

          <MetaBox title="Tags">
            <div className="space-y-2">
              <div className="flex gap-2">
              <input
                  className="h-9 min-w-0 flex-1 border border-[#dcdcde] px-2 text-sm"
                  value={newTag}
                  list="smritir-tag-options"
                  onChange={(event) => setNewTag(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                />
                <button type="button" className="border border-[#c3c4c7] bg-[#f6f7f7] px-3 text-sm text-[#2271b1]" onClick={addTag}>Add</button>
              </div>
              <datalist id="smritir-tag-options">
                {tagOptions.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
              <textarea
                className="min-h-16 w-full border border-[#dcdcde] px-2 py-1 text-sm"
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
                placeholder="Separate tags with commas."
              />
              <p className="text-xs text-[#646970]">Existing tags are suggested automatically. Separate tags with commas.</p>
              <div className="flex flex-wrap gap-1">
                {inputToTags(tagInput).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="rounded-sm bg-[#f0f0f1] px-2 py-1 text-xs text-[#3c434a]"
                    onClick={() => setTagInput(tagsToInput(inputToTags(tagInput).filter((current) => current !== tag)))}
                  >
                    {tag} x
                  </button>
                ))}
              </div>
            </div>
          </MetaBox>

          <MetaBox title="Revisions" defaultOpen={false}>
            {draft.revisions.length ? (
              <div className="space-y-2 text-sm">
                {draft.revisions.map((revision) => (
                  <div key={revision.id} className="rounded-sm border border-[#dcdcde] bg-white p-2">
                    <p className="font-medium text-[#1d2327]">{revision.title || "Untitled"}</p>
                    <p className="mt-1 text-xs text-[#646970]">
                      {new Date(revision.savedAt).toLocaleString()} by {revision.savedBy}
                    </p>
                    <button type="button" className="mt-2 text-xs font-medium text-[#2271b1]" onClick={() => restoreRevision(revision)}>
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#646970]">No revisions yet.</p>
            )}
          </MetaBox>
        </aside>
      </div>

      <input ref={uploadInputRef} type="file" multiple accept=".jpg,.jpeg,.png,.webp,.mp4,.webm,.pdf" className="hidden" onChange={(event) => void uploadMedia(event.target.files)} />

      {mediaOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[86vh] w-full max-w-5xl flex-col overflow-hidden border border-[#dcdcde] bg-white shadow-2xl">
            <div className="flex flex-col gap-3 border-b border-[#dcdcde] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Insert Media</h2>
                <p className="mt-1 text-sm text-[#646970]">Choose an uploaded image, video, or document.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => uploadInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setMediaOpen(false)}>Close</Button>
              </div>
            </div>
            <form
              className="flex gap-2 border-b border-[#dcdcde] p-4"
              onSubmit={(event) => {
                event.preventDefault();
                void loadMedia();
              }}
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-[#646970]" />
                <input className="h-11 w-full border border-[#dcdcde] bg-white pl-9 pr-3 text-sm" placeholder="Search media" value={mediaSearch} onChange={(event) => setMediaSearch(event.target.value)} />
              </div>
              <Button type="submit">Search</Button>
            </form>
            <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="grid gap-3 overflow-y-auto p-5 sm:grid-cols-3 xl:grid-cols-4">
                {mediaItems.map((item) => {
                  const selected = selectedMediaIds.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`overflow-hidden border bg-white text-left shadow-sm transition hover:border-[#2271b1] ${selected ? "border-[#2271b1] ring-2 ring-[#2271b1]/25" : "border-[#dcdcde]"}`}
                      onClick={() => toggleMediaSelection(item)}
                    >
                      <span className="block aspect-video bg-[#f0f0f1]">
                        <MediaThumb item={item} />
                      </span>
                      <span className="block p-3">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="mt-1 block text-xs capitalize text-[#646970]">{item.mediaType}</span>
                        {selected ? <span className="mt-2 inline-block rounded-sm bg-[#2271b1] px-2 py-0.5 text-xs text-white">Selected</span> : null}
                      </span>
                    </button>
                  );
                })}
                {!mediaItems.length ? <div className="col-span-full border border-dashed border-[#c3c4c7] p-6 text-center text-sm text-[#646970]">No media found.</div> : null}
              </div>
              <aside className="border-t border-[#dcdcde] bg-[#f6f7f7] p-4 lg:border-l lg:border-t-0">
                <h3 className="text-sm font-semibold text-[#1d2327]">Attachment Details</h3>
                <p className="mt-1 text-xs text-[#646970]">{selectedMedia.length} selected</p>
                {selectedImage ? (
                  <div className="mt-4 space-y-3">
                    <label className="block text-xs font-medium text-[#3c434a]">
                      Alt text
                      <input className="mt-1 h-9 w-full border border-[#c3c4c7] bg-white px-2 text-sm" value={mediaAltText} onChange={(event) => setMediaAltText(event.target.value)} />
                    </label>
                    <label className="block text-xs font-medium text-[#3c434a]">
                      Caption
                      <input className="mt-1 h-9 w-full border border-[#c3c4c7] bg-white px-2 text-sm" value={mediaCaption} onChange={(event) => setMediaCaption(event.target.value)} />
                    </label>
                    <label className="block text-xs font-medium text-[#3c434a]">
                      Alignment
                      <select className="mt-1 h-9 w-full border border-[#c3c4c7] bg-white px-2 text-sm" value={mediaAlignment} onChange={(event) => setMediaAlignment(event.target.value as MediaAlignment)}>
                        <option value="none">None</option>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-[#3c434a]">
                      Size
                      <select className="mt-1 h-9 w-full border border-[#c3c4c7] bg-white px-2 text-sm" value={mediaSize} onChange={(event) => setMediaSize(event.target.value as MediaSize)}>
                        <option value="thumbnail">Thumbnail</option>
                        <option value="medium">Medium</option>
                        <option value="large">Large</option>
                        <option value="full">Full</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium text-[#3c434a]">
                      Link to
                      <select className="mt-1 h-9 w-full border border-[#c3c4c7] bg-white px-2 text-sm" value={mediaLinkType} onChange={(event) => setMediaLinkType(event.target.value as MediaLinkType)}>
                        <option value="none">None</option>
                        <option value="file">Media file</option>
                        <option value="custom">Custom URL</option>
                      </select>
                    </label>
                    {mediaLinkType === "custom" ? (
                      <input className="h-9 w-full border border-[#c3c4c7] bg-white px-2 text-sm" value={mediaCustomUrl} onChange={(event) => setMediaCustomUrl(event.target.value)} placeholder="https://example.com" />
                    ) : null}
                  </div>
                ) : selectedMedia.length > 1 && selectedMedia.some((item) => item.mediaType === "image") ? (
                  <p className="mt-4 rounded-sm border border-[#dcdcde] bg-white p-3 text-xs text-[#646970]">
                    Multiple images will be inserted as a gallery shortcode.
                  </p>
                ) : null}
                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setSelectedMediaIds([])} disabled={!selectedMediaIds.length}>Clear</Button>
                  <Button type="button" onClick={insertSelectedMedia} disabled={!selectedMediaIds.length}>Insert into editor</Button>
                </div>
              </aside>
            </div>
          </div>
        </div>
      ) : null}
      {previewOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden border border-[#dcdcde] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#dcdcde] p-4">
              <div>
                <h2 className="text-xl font-semibold text-[#1d2327]">Preview</h2>
                <p className="mt-1 text-sm text-[#646970]">This preview does not publish or update the live post.</p>
              </div>
              <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>Close</Button>
            </div>
            <article className="overflow-y-auto p-6">
              <p className="text-sm font-medium uppercase tracking-wide text-[#2271b1]">Smritir Pata</p>
              <h1 className="mt-2 text-3xl font-semibold text-[#1d2327]">{draft.title || "Untitled"}</h1>
              <div className="mt-4 flex flex-wrap gap-3 rounded-sm border border-[#dcdcde] bg-[#f6f7f7] p-3 text-sm text-[#3c434a]">
                <span>Published Date {draft.date}</span>
                <span>Written by {draft.authorName || "Admin"}</span>
                <span className="capitalize">Status {draft.status}</span>
              </div>
              <div
                className="prose prose-sm mt-5 max-w-none text-[#3c434a]"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(draft.body) }}
              />
            </article>
          </div>
        </div>
      ) : null}
    </form>
  );
}
