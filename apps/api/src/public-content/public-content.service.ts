import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MediaType, type Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import sharp from "sharp";
import type { AuthenticatedUser } from "../auth/auth.types";
import { MemberAccessService } from "../auth/member-access.service";
import { PrismaService } from "../prisma/prisma.service";

const defaultSections = [
  { key: "home", label: "Home", href: "/", sortOrder: 10 },
  { key: "about", label: "About", href: "/about", sortOrder: 20 },
  { key: "members", label: "Members", href: "/members", sortOrder: 30 },
  { key: "committees_current", label: "Current Committees", href: "/committees/current", sortOrder: 40 },
  { key: "committees_previous", label: "Previous Committees", href: "/committees/previous", sortOrder: 50 },
  { key: "notices", label: "Notices", href: "/notices", sortOrder: 60 },
  { key: "events", label: "Events", href: "/events", sortOrder: 70 },
  { key: "srithir_patha", label: "Smritir Pata", href: "/smritir-pata", sortOrder: 80 },
  { key: "gallery", label: "Gallery", href: "/gallery", sortOrder: 90 },
  { key: "donation", label: "Donation", href: "/donation", sortOrder: 100 },
  { key: "election_results", label: "Election Results", href: "/election-results", sortOrder: 110 },
  { key: "verify", label: "Member Verification", href: "/verify", sortOrder: 120 },
  { key: "registration", label: "Become a member", href: "/register", sortOrder: 130 },
  { key: "login", label: "Login", href: "/login", sortOrder: 140 }
];

const defaultPages = defaultSections.map((section) => ({
  key: section.key,
  title: section.label,
  route: section.href,
  sortOrder: section.sortOrder,
  heroTitle: section.label,
  heroSubtitle: `${section.label} content is managed from the Sociology Alumni Association of SUST dashboard.`,
  body: ""
}));
const websiteUploadRoot = join(process.cwd(), "uploads", "website");
const galleryUploadRoot = join(process.cwd(), "uploads", "gallery");
const mediaUploadRoot = join(process.cwd(), "uploads", "media");
const allowedWebsiteAssetMimeTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"];
const allowedGalleryMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const allowedMediaMimeTypes = new Set(["image/png", "image/jpeg", "image/webp", "video/mp4", "video/webm", "application/pdf"]);
const maxMediaUploadBytes = 5 * 1024 * 1024;
const maxMediaBatchFiles = 20;

const defaultIdCardSignatures = [
  {
    key: "president",
    label: "President",
    name: "President",
    signatureType: "text",
    text: "Demo Sign",
    imageUrl: null,
    showOnCard: true
  },
  {
    key: "secretary",
    label: "Secretary",
    name: "Secretary",
    signatureType: "text",
    text: "Demo Sign",
    imageUrl: null,
    showOnCard: true
  }
];

const defaultIdCardFields = [
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
  { key: "signatures", label: "Signatures", showOnCard: true }
];

type IdCardSignatureInput = {
  key?: string;
  label?: string;
  name?: string;
  signatureType?: string;
  text?: string;
  imageUrl?: string | null;
  showOnCard?: boolean;
};

type IdCardFieldInput = {
  key?: string;
  label?: string;
  showOnCard?: boolean;
};

@Injectable()
export class PublicContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memberAccess: MemberAccessService
  ) {}

  async navigation() {
    const sections = await this.websiteSections();
    return {
      items: sections
        .filter((section) => section.active && section.navVisible)
        .map(({ key, label, href, sortOrder }) => ({ key, label, href, sortOrder }))
    };
  }

  async websiteSections() {
    await this.ensureDefaultSections();
    return this.prisma.websiteSectionSetting.findMany({
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }]
    });
  }

  async generalSettings() {
    return this.ensureGeneralSettings();
  }

  async updateGeneralSettings(input: {
    siteTitle?: string;
    logoUrl?: string | null;
    faviconUrl?: string | null;
    metaKeywords?: string | null;
    metaDescription?: string | null;
    idCardSignatures?: IdCardSignatureInput[];
    idCardFields?: IdCardFieldInput[];
  }) {
    const current = await this.ensureGeneralSettings();
    return this.prisma.websiteGeneralSetting.update({
      where: { id: current.id },
      data: {
        siteTitle: input.siteTitle?.trim() || current.siteTitle,
        logoUrl: this.optionalString(input.logoUrl),
        faviconUrl: this.optionalString(input.faviconUrl),
        metaKeywords: this.optionalString(input.metaKeywords),
        metaDescription: this.optionalString(input.metaDescription),
        idCardSignatures:
          input.idCardSignatures === undefined
            ? undefined
            : (this.normalizeIdCardSignatures(input.idCardSignatures) as Prisma.InputJsonValue),
        idCardFields:
          input.idCardFields === undefined
            ? undefined
            : (this.normalizeIdCardFields(input.idCardFields) as Prisma.InputJsonValue)
      }
    });
  }

  async storeWebsiteAsset(file: Express.Multer.File | undefined, kind: "logo" | "favicon" | "signature") {
    if (!file) {
      throw new BadRequestException("File is required.");
    }
    if (!allowedWebsiteAssetMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("Only PNG, JPG, WebP, SVG, or ICO images are allowed.");
    }
    if (kind === "signature" && !file.mimetype.startsWith("image/")) {
      throw new BadRequestException("Only image uploads are allowed for signatures.");
    }
    const maxBytes = kind === "favicon" ? 512 * 1024 : 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new BadRequestException(kind === "favicon" ? "Favicon must be 512KB or smaller." : "Image must be 2MB or smaller.");
    }

    await mkdir(websiteUploadRoot, { recursive: true });
    const extension = this.safeExtension(file.originalname, file.mimetype);
    const storedName = `${kind}-${randomUUID()}${extension}`;
    await writeFile(join(websiteUploadRoot, storedName), file.buffer);
    if (allowedMediaMimeTypes.has(file.mimetype) && file.mimetype.startsWith("image/")) {
      await this.mirrorImageUploadToMedia({
        sourceBuffer: file.buffer,
        originalBuffer: file.buffer,
        originalMimeType: file.mimetype,
        originalName: file.originalname,
        title: this.cleanBaseName(file.originalname),
        caption: `${kind === "logo" ? "Logo" : "Favicon"} upload`
      });
    }
    return {
      url: `/uploads/website/${storedName}`,
      fileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size
    };
  }

  async updateWebsiteSections(items: Array<{ key: string; label?: string; href?: string; active?: boolean; navVisible?: boolean; sortOrder?: number }>) {
    await this.ensureDefaultSections();
    const allowed = new Set(defaultSections.map((section) => section.key));
    await this.prisma.$transaction(
      items
        .filter((item) => allowed.has(item.key))
        .map((item) =>
          this.prisma.websiteSectionSetting.update({
            where: { key: item.key },
            data: {
              label: item.label,
              href: item.href,
              active: item.active,
              navVisible: item.navVisible,
              sortOrder: item.sortOrder
            }
          })
        )
    );
    return this.websiteSections();
  }

  async websitePages() {
    await this.ensureDefaultPages();
    return this.prisma.websitePageSetting.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }]
    });
  }

  async publicPage(key: string) {
    await this.ensureDefaultPages();
    const page = await this.prisma.websitePageSetting.findUnique({ where: { key } });
    if (!page || page.status !== "published") {
      throw new NotFoundException(`Page ${key} is not published.`);
    }
    return page;
  }

  async updateWebsitePages(
    items: Array<{
      key: string;
      title?: string;
      route?: string;
      status?: "draft" | "published" | "hidden";
      layout?: "standard" | "landing" | "sidebar" | "custom";
      metaTitle?: string | null;
      metaDescription?: string | null;
      metaKeywords?: string | null;
      heroTitle?: string | null;
      heroSubtitle?: string | null;
      body?: string | null;
      customTemplate?: string | null;
      contentBlocks?: unknown;
      sortOrder?: number;
    }>
  ) {
    await this.ensureDefaultPages();
    const allowed = new Set(defaultPages.map((page) => page.key));
    await this.prisma.$transaction(
      items
        .filter((item) => allowed.has(item.key))
        .map((item) =>
          this.prisma.websitePageSetting.update({
            where: { key: item.key },
            data: {
              title: item.title?.trim() || undefined,
              route: item.route?.trim() || undefined,
              status: item.status,
              layout: item.layout,
              metaTitle: this.optionalString(item.metaTitle),
              metaDescription: this.optionalString(item.metaDescription),
              metaKeywords: this.optionalString(item.metaKeywords),
              heroTitle: this.optionalString(item.heroTitle),
              heroSubtitle: this.optionalString(item.heroSubtitle),
              body: this.optionalString(item.body),
              customTemplate: this.optionalString(item.customTemplate),
              contentBlocks: item.contentBlocks === undefined || item.contentBlocks === null ? undefined : (item.contentBlocks as Prisma.InputJsonValue),
              sortOrder: item.sortOrder
            }
          })
        )
    );
    return this.websitePages();
  }

  async siteOverview() {
    const settings = await this.prisma.organizationSettings.findFirst({
      orderBy: { createdAt: "asc" }
    });
    const website = await this.ensureGeneralSettings();
    const [membersTotal, activeMembers] = await this.prisma.$transaction([
      this.prisma.member.count({ where: { status: { in: ["active", "expired"] } } }),
      this.prisma.member.count({ where: { status: "active" } })
    ]);

    const [notices, events] = await Promise.all([this.notices(), this.events()]);

    return {
      organization: {
        name: settings?.name ?? website.siteTitle,
        email: settings?.email ?? null,
        phone: settings?.phone ?? null,
        address: settings?.address ?? null,
        message: website.metaDescription ?? "Welcome to our public membership portal. This site connects members, announcements, events, and registration through the live membership system."
      },
      website: {
        siteTitle: website.siteTitle,
        logoUrl: website.logoUrl,
        faviconUrl: website.faviconUrl,
        metaKeywords: website.metaKeywords,
        metaDescription: website.metaDescription,
        idCardSignatures: this.normalizeIdCardSignatures(website.idCardSignatures),
        idCardFields: this.normalizeIdCardFields(website.idCardFields)
      },
      stats: {
        membersTotal,
        activeMembers
      },
      currentCommittee: null,
      sponsors: [],
      notices,
      events
    };
  }

  async notices() {
    return this.contentModuleCollection("notices", "notice");
  }

  async noticeDetails(slug: string) {
    const collection = await this.contentModuleCollection("notices", "notice", slug);
    if (!collection.items.length) throw new NotFoundException(`Notice ${slug} is not published.`);
    return collection;
  }

  async events() {
    return this.contentModuleCollection("events", "event");
  }

  async eventDetails(slug: string) {
    const collection = await this.contentModuleCollection("events", "event", slug);
    if (!collection.items.length) throw new NotFoundException(`Event ${slug} is not published.`);
    return collection;
  }

  async posts() {
    return this.contentModuleCollection("srithir_patha", "post");
  }

  async postDetails(slug: string) {
    const collection = await this.contentModuleCollection("srithir_patha", "post", slug);
    if (!collection.items.length) throw new NotFoundException(`Post ${slug} is not published.`);
    return collection;
  }

  async postComments(slug: string) {
    const post = await this.findPublishedPost(slug);
    const comments = await this.prisma.blogPostComment.findMany({
      where: {
        postSlug: post.slug,
        published: true
      },
      include: {
        member: {
          select: {
            id: true,
            memberId: true,
            photo: true
          }
        }
      },
      orderBy: { createdAt: "asc" }
    });
    return {
      items: comments.map((comment) => ({
        id: comment.id,
        postId: comment.postId,
        postSlug: comment.postSlug,
        parentId: comment.parentId,
        authorUserId: comment.userId,
        body: comment.body,
        authorName: comment.authorName,
        authorRole: comment.authorRole,
        authorPhoto: comment.member?.photo ?? null,
        authorProfileUrl: comment.member ? `/verify/${encodeURIComponent(comment.member.memberId ?? comment.member.id)}` : null,
        createdAt: comment.createdAt.toISOString()
      })),
      total: comments.length
    };
  }

  async createPostComment(slug: string, input: { body?: string; parentId?: string | null }, user: AuthenticatedUser) {
    const post = await this.findPublishedPost(slug);
    if (post.allowComments === false) {
      throw new ForbiddenException("Comments are closed for this post.");
    }
    const body = input.body?.trim();
    if (!body) {
      throw new BadRequestException("Comment is required.");
    }
    if (body.length > 1500) {
      throw new BadRequestException("Comment must be 1500 characters or fewer.");
    }
    const parentId = input.parentId?.trim() || null;
    if (parentId) {
      const parent = await this.prisma.blogPostComment.findFirst({
        where: {
          id: parentId,
          postSlug: post.slug,
          published: true
        }
      });
      if (!parent) {
        throw new BadRequestException("Reply target was not found.");
      }
    }

    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        member: true,
        roles: {
          include: { role: true }
        }
      }
    });
    if (!currentUser || !currentUser.isActive) {
      throw new ForbiddenException("Only members and admins can comment.");
    }

    const roleSlugs = currentUser.roles.map((assignment) => assignment.role.slug);
    const isAdmin = roleSlugs.includes("super-admin") || roleSlugs.includes("admin") || user.permissions.includes("admin:access");
    const isMember = Boolean(currentUser.member) || user.permissions.includes("member:access");
    if (!isAdmin && !isMember) {
      throw new ForbiddenException("Only members and admins can comment.");
    }

    const comment = await this.prisma.blogPostComment.create({
      data: {
        postId: post.id,
        postSlug: post.slug,
        body,
        authorName: currentUser.member?.fullName ?? currentUser.fullName,
        authorEmail: currentUser.member?.email ?? currentUser.email,
        authorRole: isAdmin ? "Admin" : "Member",
        userId: currentUser.id,
        memberId: currentUser.member?.id,
        parentId
      }
    });

    return {
      id: comment.id,
      postId: comment.postId,
      postSlug: comment.postSlug,
      parentId: comment.parentId,
      authorUserId: comment.userId,
      body: comment.body,
      authorName: comment.authorName,
      authorRole: comment.authorRole,
      authorPhoto: currentUser.member?.photo ?? null,
      authorProfileUrl: currentUser.member ? `/verify/${encodeURIComponent(currentUser.member.memberId ?? currentUser.member.id)}` : null,
      createdAt: comment.createdAt.toISOString()
    };
  }

  async createMemberSmritirPataPost(
    input: {
      title?: string;
      summary?: string;
      body?: string;
      category?: string;
      tags?: string[];
      status?: "draft" | "pending";
    },
    user: AuthenticatedUser
  ) {
    const member = await this.memberAccess.requirePortalMember(user.id, { user: true });
    const currentUser = member.user!;

    const title = input.title?.trim();
    const plainBody = input.body?.trim() ?? "";
    const status = input.status === "draft" ? "draft" : "pending";
    if (!title) {
      throw new BadRequestException("Post title is required.");
    }
    if (status === "pending" && !plainBody) {
      throw new BadRequestException("Post body is required.");
    }
    if (title.length > 160) {
      throw new BadRequestException("Post title must be 160 characters or fewer.");
    }
    if (plainBody.length > 12000) {
      throw new BadRequestException("Post body must be 12000 characters or fewer.");
    }

    await this.ensureDefaultPages();
    const page = await this.prisma.websitePageSetting.findUnique({ where: { key: "srithir_patha" } });
    if (!page) {
      throw new NotFoundException("Smritir Pata page settings were not found.");
    }

    const existingItems = Array.isArray(page.contentBlocks) ? page.contentBlocks : [];
    const existingSlugs = new Set(
      this.contentModuleItems(page.contentBlocks, "post").map((item) => item.slug)
    );
    const id = randomUUID();
    const slug = this.uniquePostSlug(this.slugify(title), existingSlugs);
    const summary = input.summary?.trim() || plainBody.replace(/\s+/g, " ").slice(0, 180);
    const category = input.category?.trim() || "Member Writing";
    const tags = Array.isArray(input.tags)
      ? input.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
      : [];
    const now = new Date();
    const post = {
      id,
      title,
      slug,
      summary,
      body: this.sanitizeMemberPostBody(plainBody),
      date: now.toISOString().slice(0, 10),
      time: "",
      status,
      category,
      taxonomies: [category],
      tags,
      authorUserId: currentUser.id,
      authorName: member.fullName || currentUser.fullName,
      authorProfileUrl: `/verify/${encodeURIComponent(member.memberId ?? member.id)}`,
      revisions: [],
      allowComments: true,
      submittedByMemberId: member.id,
      submittedAt: now.toISOString()
    };

    await this.prisma.websitePageSetting.update({
      where: { id: page.id },
      data: {
        contentBlocks: [post, ...existingItems] as Prisma.InputJsonValue
      }
    });

    return {
      id,
      slug,
      status,
      message: status === "draft" ? "Draft saved." : "Your writing has been submitted for admin review."
    };
  }

  async updateMemberSmritirPataPost(
    id: string,
    input: {
      title?: string;
      summary?: string;
      body?: string;
      category?: string;
      tags?: string[];
      status?: "draft" | "pending";
    },
    user: AuthenticatedUser
  ) {
    const { currentUser, page, items, index, post } = await this.requireOwnedMemberPost(id, user);
    const title = input.title?.trim();
    const plainBody = input.body?.trim() ?? "";
    const status = input.status === "draft" ? "draft" : "pending";

    if (!title) throw new BadRequestException("Post title is required.");
    if (status === "pending" && !plainBody) throw new BadRequestException("Post body is required.");
    if (title.length > 160) throw new BadRequestException("Post title must be 160 characters or fewer.");
    if (plainBody.length > 12000) throw new BadRequestException("Post body must be 12000 characters or fewer.");

    const existingSlugs = new Set(
      this.contentModuleItems(page.contentBlocks, "post")
        .filter((item) => item.id !== id)
        .map((item) => item.slug)
    );
    const now = new Date();
    const category = input.category?.trim() || this.stringValue(post.category) || "Member Writing";
    const tags = Array.isArray(input.tags)
      ? input.tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean).slice(0, 12)
      : [];
    const previousStatus = this.stringValue(post.status) || "draft";
    const revisions = Array.isArray(post.revisions) ? post.revisions : [];
    const changedContent =
      this.stringValue(post.title) !== title ||
      this.stringValue(post.body) !== plainBody ||
      previousStatus !== status;

    const updated = {
      ...post,
      id,
      title,
      slug: this.uniquePostSlug(this.slugify(this.stringValue(post.slug) || title), existingSlugs),
      summary: input.summary?.trim() || plainBody.replace(/\s+/g, " ").slice(0, 180),
      body: this.sanitizeMemberPostBody(plainBody),
      date: now.toISOString().slice(0, 10),
      status,
      category,
      taxonomies: [category],
      tags,
      authorUserId: currentUser.id,
      authorName: currentUser.member.fullName || currentUser.fullName,
      authorProfileUrl: `/verify/${encodeURIComponent(currentUser.member.memberId ?? currentUser.member.id)}`,
      revisions: changedContent
        ? [
            {
              id: randomUUID(),
              savedAt: now.toISOString(),
              savedBy: currentUser.fullName,
              title: this.stringValue(post.title) || "Untitled",
              body: this.stringValue(post.body) || "",
              status: previousStatus
            },
            ...revisions
          ].slice(0, 20)
        : revisions,
      allowComments: post.allowComments !== false,
      submittedByMemberId: currentUser.member.id,
      submittedAt: this.stringValue(post.submittedAt) || now.toISOString(),
      updatedAt: now.toISOString(),
      correctionNote: status === "pending" ? null : post.correctionNote,
      correctionRequestedAt: status === "pending" ? null : post.correctionRequestedAt,
      rejectionNote: status === "pending" ? null : post.rejectionNote,
      rejectedAt: status === "pending" ? null : post.rejectedAt,
      trashedAt: null
    };

    items[index] = updated;
    await this.prisma.websitePageSetting.update({
      where: { id: page.id },
      data: { contentBlocks: items as Prisma.InputJsonValue }
    });

    return {
      id,
      slug: updated.slug,
      status,
      message: status === "draft" ? "Draft saved." : "Your writing has been submitted for admin review."
    };
  }

  async trashMemberSmritirPataPost(id: string, user: AuthenticatedUser) {
    const { page, items, index, post } = await this.requireOwnedMemberPost(id, user);
    items[index] = {
      ...post,
      status: "trash",
      trashedAt: new Date().toISOString()
    };
    await this.prisma.websitePageSetting.update({
      where: { id: page.id },
      data: { contentBlocks: items as Prisma.InputJsonValue }
    });
    return { success: true, message: "Post moved to trash." };
  }

  async restoreMemberSmritirPataPost(id: string, user: AuthenticatedUser) {
    const { page, items, index, post } = await this.requireOwnedMemberPost(id, user);
    items[index] = {
      ...post,
      status: "draft",
      trashedAt: null
    };
    await this.prisma.websitePageSetting.update({
      where: { id: page.id },
      data: { contentBlocks: items as Prisma.InputJsonValue }
    });
    return { success: true, message: "Post restored as draft." };
  }

  async deleteMemberSmritirPataPost(id: string, user: AuthenticatedUser) {
    const { page, items, index } = await this.requireOwnedMemberPost(id, user);
    items.splice(index, 1);
    await this.prisma.websitePageSetting.update({
      where: { id: page.id },
      data: { contentBlocks: items as Prisma.InputJsonValue }
    });
    return { success: true, message: "Post permanently deleted." };
  }

  async memberSmritirPataPosts(user: AuthenticatedUser) {
    const member = await this.memberAccess.requirePortalMember(user.id, { user: true });
    const currentUser = member.user!;

    await this.ensureDefaultPages();
    const page = await this.prisma.websitePageSetting.findUnique({ where: { key: "srithir_patha" } });
    const rawItems: unknown[] = Array.isArray(page?.contentBlocks) ? (page.contentBlocks as unknown[]) : [];
    const posts = rawItems
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .filter((item) => this.stringValue(item.submittedByMemberId) === member.id || this.stringValue(item.authorUserId) === currentUser.id)
      .map((item) => {
        const title = this.stringValue(item.title) || "Untitled";
        const date = this.stringValue(item.submittedAt) || this.stringValue(item.date) || new Date().toISOString();
        const tags = Array.isArray(item.tags)
          ? item.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())).map((tag) => tag.trim())
          : [];
        const status = this.stringValue(item.status);
        return {
          id: this.stringValue(item.id) || this.slugify(title),
          title,
          slug: this.slugify(this.stringValue(item.slug) || title),
          summary: this.stringValue(item.summary),
          body: this.stringValue(item.body) || "",
          category: this.stringValue(item.category) || "Member Writing",
          tags,
          status:
            status === "published" ||
            status === "pending" ||
            status === "draft" ||
            status === "trash" ||
            status === "correction_requested" ||
            status === "rejected"
              ? status
              : "draft",
          correctionNote: this.stringValue(item.correctionNote),
          correctionRequestedAt: this.stringValue(item.correctionRequestedAt),
          rejectionNote: this.stringValue(item.rejectionNote),
          rejectedAt: this.stringValue(item.rejectedAt),
          submittedAt: date,
          publishedAt: this.stringValue(item.status) === "published" ? this.dateTimeIso(this.stringValue(item.date) || date.slice(0, 10), this.stringValue(item.time)) : null
        };
      })
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    return {
      items: posts,
      total: posts.length
    };
  }

  private async requireOwnedMemberPost(id: string, user: AuthenticatedUser) {
    const member = await this.memberAccess.requirePortalMember(user.id, { user: true });
    const currentUser = member.user!;

    await this.ensureDefaultPages();
    const page = await this.prisma.websitePageSetting.findUnique({ where: { key: "srithir_patha" } });
    if (!page) throw new NotFoundException("Smritir Pata page settings were not found.");

    const items: Array<Record<string, unknown>> = Array.isArray(page.contentBlocks)
      ? (page.contentBlocks as unknown[]).filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      : [];
    const index = items.findIndex((item) => this.stringValue(item.id) === id);
    if (index < 0) throw new NotFoundException("Smritir Pata post was not found.");

    const post = items[index];
    const ownerMatches =
      this.stringValue(post.submittedByMemberId) === member.id ||
      this.stringValue(post.authorUserId) === currentUser.id;
    if (!ownerMatches) {
      throw new ForbiddenException("You can only manage your own Smritir Pata posts.");
    }

    return { currentUser: { ...currentUser, member }, page, items, index, post };
  }

  async hidePostComment(id: string, user: AuthenticatedUser) {
    const comment = await this.requireOwnedComment(id, user);
    await this.prisma.blogPostComment.update({
      where: { id: comment.id },
      data: { published: false }
    });
    return { success: true };
  }

  async deletePostComment(id: string, user: AuthenticatedUser) {
    const comment = await this.requireOwnedComment(id, user);
    await this.prisma.blogPostComment.delete({
      where: { id: comment.id }
    });
    return { success: true };
  }

  async gallery() {
    const albums = await this.prisma.galleryAlbum.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        photos: {
          where: { published: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
        }
      }
    });
    return {
      items: albums.map((album) => ({
        id: album.id,
        title: album.title,
        slug: album.slug,
        description: album.description,
        coverUrl: album.coverUrl ?? album.photos[0]?.thumbnailUrl ?? null,
        published: album.published,
        sortOrder: album.sortOrder,
        photos: album.photos.map((photo) => ({
          id: photo.id,
          albumId: photo.albumId,
          title: photo.title,
          caption: photo.caption,
          imageUrl: photo.imageUrl,
          thumbnailUrl: photo.thumbnailUrl,
          width: photo.width,
          height: photo.height,
          fileSize: photo.fileSize,
          published: photo.published,
          sortOrder: photo.sortOrder,
          createdAt: photo.createdAt
        }))
      })),
      page: 1,
      limit: albums.length,
      total: albums.length,
      totalPages: albums.length ? 1 : 0
    };
  }

  async adminGalleryAlbums() {
    return this.prisma.galleryAlbum.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: {
        photos: {
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
        }
      }
    });
  }

  async homeHeroSlides() {
    const slides = await this.prisma.homeHeroSlide.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    return {
      items: slides.map((slide) => this.serializeHomeHeroSlide(slide)),
      page: 1,
      limit: slides.length || 12,
      total: slides.length,
      totalPages: slides.length ? 1 : 0
    };
  }

  async adminHomeHeroSlides() {
    const slides = await this.prisma.homeHeroSlide.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }]
    });
    return slides.map((slide) => this.serializeHomeHeroSlide(slide));
  }

  async createHomeHeroSlide(input: {
    eyebrow?: string;
    eyebrowIcon?: string;
    eyebrowVisible?: boolean;
    title?: string;
    body?: string;
    imageUrl?: string;
    imagePosition?: string;
    primaryLabel?: string | null;
    primaryHref?: string | null;
    secondaryLabel?: string | null;
    secondaryHref?: string | null;
    tertiaryLabel?: string | null;
    tertiaryHref?: string | null;
    accentClass?: string;
    published?: boolean;
    sortOrder?: number;
  }) {
    const eyebrow = input.eyebrow?.trim();
    const eyebrowVisible = input.eyebrowVisible ?? true;
    const title = input.title?.trim();
    const body = input.body?.trim();
    const imageUrl = input.imageUrl?.trim();
    if (eyebrowVisible && !eyebrow) throw new BadRequestException("Eyebrow text is required.");
    if (!title) throw new BadRequestException("Slide title is required.");
    if (!body) throw new BadRequestException("Slide body is required.");
    if (!imageUrl) throw new BadRequestException("Slide image is required.");

    const slide = await this.prisma.homeHeroSlide.create({
      data: {
        eyebrow: eyebrow || "",
        eyebrowIcon: input.eyebrowIcon?.trim() || "fa6-solid:graduation-cap",
        eyebrowVisible,
        title,
        body,
        imageUrl,
        imagePosition: input.imagePosition?.trim() || "center center",
        primaryLabel: this.optionalString(input.primaryLabel),
        primaryHref: this.optionalString(input.primaryHref),
        secondaryLabel: this.optionalString(input.secondaryLabel),
        secondaryHref: this.optionalString(input.secondaryHref),
        tertiaryLabel: this.optionalString(input.tertiaryLabel),
        tertiaryHref: this.optionalString(input.tertiaryHref),
        accentClass: input.accentClass?.trim() || "bg-[hsl(var(--cream))]",
        published: input.published ?? true,
        sortOrder: input.sortOrder ?? 0
      }
    });
    return this.serializeHomeHeroSlide(slide);
  }

  async updateHomeHeroSlide(
    id: string,
    input: {
      eyebrow?: string;
      eyebrowIcon?: string;
      eyebrowVisible?: boolean;
      title?: string;
      body?: string;
      imageUrl?: string;
      imagePosition?: string;
      primaryLabel?: string | null;
      primaryHref?: string | null;
      secondaryLabel?: string | null;
      secondaryHref?: string | null;
      tertiaryLabel?: string | null;
      tertiaryHref?: string | null;
      accentClass?: string;
      published?: boolean;
      sortOrder?: number;
    }
  ) {
    await this.requireHomeHeroSlide(id);
    const slide = await this.prisma.homeHeroSlide.update({
      where: { id },
      data: {
        eyebrow: input.eyebrow?.trim(),
        eyebrowIcon: input.eyebrowIcon?.trim() || undefined,
        eyebrowVisible: input.eyebrowVisible,
        title: input.title?.trim() || undefined,
        body: input.body?.trim() || undefined,
        imageUrl: input.imageUrl?.trim() || undefined,
        imagePosition: input.imagePosition?.trim() || undefined,
        primaryLabel: this.optionalString(input.primaryLabel),
        primaryHref: this.optionalString(input.primaryHref),
        secondaryLabel: this.optionalString(input.secondaryLabel),
        secondaryHref: this.optionalString(input.secondaryHref),
        tertiaryLabel: this.optionalString(input.tertiaryLabel),
        tertiaryHref: this.optionalString(input.tertiaryHref),
        accentClass: input.accentClass?.trim() || undefined,
        published: input.published,
        sortOrder: input.sortOrder
      }
    });
    return this.serializeHomeHeroSlide(slide);
  }

  async deleteHomeHeroSlide(id: string) {
    await this.requireHomeHeroSlide(id);
    await this.prisma.homeHeroSlide.delete({ where: { id } });
    return { deleted: true };
  }

  async alumniVoices() {
    const voices = await this.prisma.alumniVoice.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });
    return {
      items: voices.map((voice) => this.serializeAlumniVoice(voice)),
      page: 1,
      limit: voices.length || 12,
      total: voices.length,
      totalPages: voices.length ? 1 : 0
    };
  }

  async adminAlumniVoices() {
    const voices = await this.prisma.alumniVoice.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });
    return voices.map((voice) => this.serializeAlumniVoice(voice));
  }

  async createAlumniVoice(input: {
    name?: string;
    role?: string;
    affiliation?: string | null;
    quote?: string;
    initials?: string | null;
    imageUrl?: string | null;
    published?: boolean;
    sortOrder?: number;
  }) {
    const name = input.name?.trim();
    const role = input.role?.trim();
    const quote = input.quote?.trim();
    if (!name) throw new BadRequestException("Name is required.");
    if (!role) throw new BadRequestException("Role is required.");
    if (!quote) throw new BadRequestException("Quote is required.");

    const voice = await this.prisma.alumniVoice.create({
      data: {
        name,
        role,
        affiliation: this.optionalString(input.affiliation),
        quote,
        initials: this.optionalString(input.initials) ?? this.initialsForName(name),
        imageUrl: this.optionalString(input.imageUrl),
        published: input.published ?? true,
        sortOrder: input.sortOrder ?? 0
      }
    });
    return this.serializeAlumniVoice(voice);
  }

  async updateAlumniVoice(
    id: string,
    input: {
      name?: string;
      role?: string;
      affiliation?: string | null;
      quote?: string;
      initials?: string | null;
      imageUrl?: string | null;
      published?: boolean;
      sortOrder?: number;
    }
  ) {
    const existing = await this.requireAlumniVoice(id);
    const nextName = input.name?.trim();
    const voice = await this.prisma.alumniVoice.update({
      where: { id },
      data: {
        name: nextName || undefined,
        role: input.role?.trim() || undefined,
        affiliation: this.optionalString(input.affiliation),
        quote: input.quote?.trim() || undefined,
        initials: input.initials === undefined ? undefined : this.optionalString(input.initials) ?? this.initialsForName(nextName || existing.name),
        imageUrl: this.optionalString(input.imageUrl),
        published: input.published,
        sortOrder: input.sortOrder
      }
    });
    return this.serializeAlumniVoice(voice);
  }

  async deleteAlumniVoice(id: string) {
    await this.requireAlumniVoice(id);
    await this.prisma.alumniVoice.delete({ where: { id } });
    return { deleted: true };
  }

  async createGalleryAlbum(input: { title?: string; description?: string | null; published?: boolean; sortOrder?: number }) {
    const title = input.title?.trim();
    if (!title) throw new BadRequestException("Album title is required.");
    const slug = await this.uniqueAlbumSlug(this.slugify(title));
    return this.prisma.galleryAlbum.create({
      data: {
        title,
        slug,
        description: this.optionalString(input.description),
        published: input.published ?? true,
        sortOrder: input.sortOrder ?? 0
      },
      include: { photos: true }
    });
  }

  async updateGalleryAlbum(
    id: string,
    input: { title?: string; description?: string | null; coverUrl?: string | null; published?: boolean; sortOrder?: number }
  ) {
    await this.requireAlbum(id);
    return this.prisma.galleryAlbum.update({
      where: { id },
      data: {
        title: input.title?.trim() || undefined,
        description: this.optionalString(input.description),
        coverUrl: this.optionalString(input.coverUrl),
        published: input.published,
        sortOrder: input.sortOrder
      },
      include: { photos: { orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] } }
    });
  }

  async deleteGalleryAlbum(id: string) {
    await this.requireAlbum(id);
    await this.prisma.galleryAlbum.delete({ where: { id } });
    return { deleted: true };
  }

  async storeGalleryPhoto(
    albumId: string,
    file: Express.Multer.File | undefined,
    input: { title?: string; caption?: string | null; published?: boolean; sortOrder?: number },
    uploadedBy?: string
  ) {
    await this.requireAlbum(albumId);
    if (!file) throw new BadRequestException("File is required.");
    if (!allowedGalleryMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException("Only PNG, JPG, or WebP images are allowed.");
    }
    if (file.size > 12 * 1024 * 1024) {
      throw new BadRequestException("Gallery photo must be 12MB or smaller.");
    }

    await mkdir(galleryUploadRoot, { recursive: true });
    const baseName = `photo-${randomUUID()}`;
    const imageName = `${baseName}.webp`;
    const thumbName = `${baseName}-thumb.webp`;
    const imageBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 })
      .toBuffer();
    const thumbBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 640, height: 480, fit: "cover", withoutEnlargement: false })
      .webp({ quality: 70, effort: 4 })
      .toBuffer();
    const metadata = await sharp(imageBuffer).metadata();
    await Promise.all([writeFile(join(galleryUploadRoot, imageName), imageBuffer), writeFile(join(galleryUploadRoot, thumbName), thumbBuffer)]);

    const title = input.title?.trim() || file.originalname.replace(/\.[^.]+$/, "");
    const caption = this.optionalString(input.caption);
    const photo = await this.prisma.galleryPhoto.create({
      data: {
        albumId,
        title,
        caption,
        imageUrl: `/uploads/gallery/${imageName}`,
        thumbnailUrl: `/uploads/gallery/${thumbName}`,
        originalFileName: file.originalname,
        mimeType: "image/webp",
        fileSize: imageBuffer.length,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0,
        published: input.published ?? true,
        sortOrder: input.sortOrder ?? 0
      }
    });
    await this.mirrorImageUploadToMedia({
      sourceBuffer: imageBuffer,
      originalName: file.originalname,
      title,
      caption,
      uploadedBy
    });

    await this.syncAlbumCover(albumId);
    return photo;
  }

  async updateGalleryPhoto(
    id: string,
    input: { title?: string; caption?: string | null; published?: boolean; sortOrder?: number; albumId?: string }
  ) {
    const current = await this.requirePhoto(id);
    if (input.albumId && input.albumId !== current.albumId) await this.requireAlbum(input.albumId);
    const updated = await this.prisma.galleryPhoto.update({
      where: { id },
      data: {
        albumId: input.albumId,
        title: input.title?.trim() || undefined,
        caption: this.optionalString(input.caption),
        published: input.published,
        sortOrder: input.sortOrder
      }
    });
    await Promise.all([this.syncAlbumCover(current.albumId), updated.albumId !== current.albumId ? this.syncAlbumCover(updated.albumId) : Promise.resolve()]);
    return updated;
  }

  async editGalleryPhotoImage(
    id: string,
    input: {
      rotate?: number;
      flipHorizontal?: boolean;
      flipVertical?: boolean;
      resizeWidth?: number;
      crop?: { left: number; top: number; width: number; height: number };
      saveAsCopy?: boolean;
    }
  ) {
    const photo = await this.requirePhoto(id);
    await mkdir(galleryUploadRoot, { recursive: true });
    let pipeline = sharp(join(process.cwd(), photo.imageUrl.replace(/^\//, ""))).rotate(input.rotate ?? 0);
    if (input.flipVertical) pipeline = pipeline.flip();
    if (input.flipHorizontal) pipeline = pipeline.flop();
    if (input.crop && input.crop.width > 0 && input.crop.height > 0) {
      pipeline = pipeline.extract({
        left: Math.max(0, Math.round(input.crop.left)),
        top: Math.max(0, Math.round(input.crop.top)),
        width: Math.round(input.crop.width),
        height: Math.round(input.crop.height)
      });
    }
    if (input.resizeWidth && input.resizeWidth > 0) {
      pipeline = pipeline.resize({ width: Math.min(1600, Math.round(input.resizeWidth)), fit: "inside", withoutEnlargement: true });
    }

    const output = await pipeline.webp({ quality: 78, effort: 5 }).toBuffer();
    const metadata = await sharp(output).metadata();
    const baseName = `photo-${randomUUID()}`;
    const imageName = `${baseName}.webp`;
    const thumbName = `${baseName}-thumb.webp`;
    const thumbBuffer = await sharp(output)
      .resize({ width: 640, height: 480, fit: "cover", withoutEnlargement: false })
      .webp({ quality: 70, effort: 4 })
      .toBuffer();
    await Promise.all([writeFile(join(galleryUploadRoot, imageName), output), writeFile(join(galleryUploadRoot, thumbName), thumbBuffer)]);

    if (input.saveAsCopy) {
      const copy = await this.prisma.galleryPhoto.create({
        data: {
          albumId: photo.albumId,
          title: `${photo.title} copy`,
          caption: photo.caption,
          imageUrl: `/uploads/gallery/${imageName}`,
          thumbnailUrl: `/uploads/gallery/${thumbName}`,
          originalFileName: `Edited copy - ${photo.originalFileName}`,
          mimeType: "image/webp",
          fileSize: output.length,
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
          published: photo.published,
          sortOrder: photo.sortOrder + 1
        }
      });
      await this.mirrorImageUploadToMedia({
        sourceBuffer: output,
        originalName: `Edited copy - ${photo.originalFileName}`,
        title: `${photo.title} copy`,
        caption: photo.caption,
        uploadedBy: undefined
      });
      await this.syncAlbumCover(photo.albumId);
      return copy;
    }

    const updated = await this.prisma.galleryPhoto.update({
      where: { id },
      data: {
        imageUrl: `/uploads/gallery/${imageName}`,
        thumbnailUrl: `/uploads/gallery/${thumbName}`,
        mimeType: "image/webp",
        fileSize: output.length,
        width: metadata.width ?? 0,
        height: metadata.height ?? 0
      }
    });
    await this.syncAlbumCover(photo.albumId);
    return updated;
  }

  async restoreGalleryPhotoImage(
    id: string,
    input: { imageUrl?: string; thumbnailUrl?: string; mimeType?: string; fileSize?: number; width?: number; height?: number }
  ) {
    const photo = await this.requirePhoto(id);
    const imageUrl = input.imageUrl?.trim();
    const thumbnailUrl = input.thumbnailUrl?.trim();
    if (!imageUrl?.startsWith("/uploads/gallery/") || !thumbnailUrl?.startsWith("/uploads/gallery/")) {
      throw new BadRequestException("Only gallery image versions can be restored.");
    }
    const updated = await this.prisma.galleryPhoto.update({
      where: { id },
      data: {
        imageUrl,
        thumbnailUrl,
        mimeType: input.mimeType ?? "image/webp",
        fileSize: input.fileSize ?? photo.fileSize,
        width: input.width ?? photo.width,
        height: input.height ?? photo.height
      }
    });
    await this.syncAlbumCover(photo.albumId);
    return updated;
  }

  async deleteGalleryPhoto(id: string) {
    const current = await this.requirePhoto(id);
    await this.prisma.galleryPhoto.delete({ where: { id } });
    await this.syncAlbumCover(current.albumId);
    return { deleted: true };
  }

  async mediaLibrary(query: { search?: string; type?: string; month?: string; page?: string | number; limit?: string | number }) {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit ?? 80) || 80), 200);
    const mediaType = this.mediaTypeFromFilter(query.type);
    const monthRange = this.monthRange(query.month);
    const where: Prisma.MediaAssetWhereInput = {
      mediaType,
      createdAt: monthRange ? { gte: monthRange.start, lt: monthRange.end } : undefined,
      OR: query.search
        ? [
            { originalName: { contains: query.search, mode: "insensitive" } },
            { title: { contains: query.search, mode: "insensitive" } },
            { caption: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };

    const [items, total, allDates] = await this.prisma.$transaction([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.mediaAsset.count({ where }),
      this.prisma.mediaAsset.findMany({
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 500
      })
    ]);

    const months = Array.from(
      new Set(
        allDates.map((item) => {
          const year = item.createdAt.getFullYear();
          const month = String(item.createdAt.getMonth() + 1).padStart(2, "0");
          return `${year}-${month}`;
        })
      )
    );

    return {
      items: items.map((item) => this.serializeMediaAsset(item)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      months
    };
  }

  async uploadMedia(files: Express.Multer.File[] | undefined, uploadedBy?: string) {
    if (!files?.length) throw new BadRequestException("Please select at least one file.");
    if (files.length > maxMediaBatchFiles) throw new BadRequestException("Maximum 20 files allowed per upload.");

    const uploaded = [];
    for (const file of files) {
      uploaded.push(await this.storeMediaAsset(file, uploadedBy));
    }

    return {
      items: uploaded.map((item) => this.serializeMediaAsset(item)),
      message: "Media uploaded and optimized successfully."
    };
  }

  async memberMediaLibrary(query: { search?: string; type?: string; page?: string | number; limit?: string | number }, user: AuthenticatedUser) {
    await this.memberAccess.requirePortalMember(user.id, {});

    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.min(Math.max(1, Number(query.limit ?? 80) || 80), 100);
    const mediaType = this.mediaTypeFromFilter(query.type);
    const where: Prisma.MediaAssetWhereInput = {
      uploadedBy: user.id,
      mediaType,
      OR: query.search
        ? [
            { originalName: { contains: query.search, mode: "insensitive" } },
            { title: { contains: query.search, mode: "insensitive" } },
            { caption: { contains: query.search, mode: "insensitive" } }
          ]
        : undefined
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prisma.mediaAsset.count({ where })
    ]);

    return {
      items: items.map((item) => this.serializeMediaAsset(item)),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    };
  }

  async uploadMemberMedia(files: Express.Multer.File[] | undefined, user: AuthenticatedUser) {
    await this.memberAccess.requirePortalMember(user.id, {});
    if (!files?.length) throw new BadRequestException("Please select at least one file.");
    if (files.length > 10) throw new BadRequestException("Maximum 10 files allowed per upload.");

    const uploaded = [];
    for (const file of files) {
      uploaded.push(await this.storeMediaAsset(file, user.id));
    }

    return {
      items: uploaded.map((item) => this.serializeMediaAsset(item)),
      message: "Media uploaded successfully."
    };
  }

  async mediaAssetDetails(id: string) {
    return this.serializeMediaAsset(await this.requireMediaAsset(id));
  }

  async updateMediaAsset(id: string, input: { title?: string; altText?: string | null; caption?: string | null; description?: string | null }) {
    await this.requireMediaAsset(id);
    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        title: input.title?.trim() || undefined,
        altText: this.optionalString(input.altText),
        caption: this.optionalString(input.caption),
        description: this.optionalString(input.description)
      }
    });
    return this.serializeMediaAsset(updated);
  }

  async replaceMediaAsset(id: string, file: Express.Multer.File | undefined, uploadedBy?: string) {
    const current = await this.requireMediaAsset(id);
    if (!file) throw new BadRequestException("File is required.");
    const replacement = await this.prepareMediaFile(file);
    await this.removeStoredMediaFiles(current).catch(() => undefined);
    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        ...replacement,
        originalName: file.originalname,
        title: current.title || this.cleanBaseName(file.originalname),
        uploadedBy: current.uploadedBy ?? uploadedBy
      }
    });
    return this.serializeMediaAsset(updated);
  }

  async regenerateMediaThumbnails(id: string) {
    const asset = await this.requireMediaAsset(id);
    if (asset.mediaType !== MediaType.image) throw new BadRequestException("Thumbnails can only be regenerated for images.");
    const sourcePath = join(process.cwd(), asset.filePath);
    const buffer = await sharp(sourcePath).toBuffer();
    const baseName = `media-${randomUUID()}`;
    const thumbnailName = `${baseName}-300.webp`;
    const mediumName = `${baseName}-768.webp`;
    const largeName = `${baseName}-1200.webp`;
    await Promise.all([
      writeFile(join(mediaUploadRoot, thumbnailName), await this.imageVariant(buffer, 300)),
      writeFile(join(mediaUploadRoot, mediumName), await this.imageVariant(buffer, 768)),
      writeFile(join(mediaUploadRoot, largeName), await this.imageVariant(buffer, 1200))
    ]);
    await Promise.all(
      [asset.thumbnailPath, asset.mediumUrl?.replace(/^\//, ""), asset.largeUrl?.replace(/^\//, "")]
        .filter((value): value is string => Boolean(value))
        .map((path) => rm(join(process.cwd(), path), { force: true }).catch(() => undefined))
    );
    const updated = await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        thumbnailPath: join("uploads", "media", thumbnailName),
        thumbnailUrl: `/uploads/media/${thumbnailName}`,
        mediumUrl: `/uploads/media/${mediumName}`,
        largeUrl: `/uploads/media/${largeName}`
      }
    });
    return this.serializeMediaAsset(updated);
  }

  async editMediaImage(
    id: string,
    input: {
      rotate?: number;
      flipHorizontal?: boolean;
      flipVertical?: boolean;
      resizeWidth?: number;
      crop?: { left: number; top: number; width: number; height: number };
      saveAsCopy?: boolean;
      restoreOriginal?: boolean;
    }
  ) {
    const asset = await this.requireMediaAsset(id);
    if (asset.mediaType !== MediaType.image) throw new BadRequestException("Only images can be edited.");
    const sourceFile = input.restoreOriginal ? asset.originalPath : asset.filePath;
    if (!sourceFile) throw new BadRequestException("Original image is not available for this media.");
    let pipeline = sharp(join(process.cwd(), sourceFile)).rotate(input.restoreOriginal ? undefined : input.rotate ?? 0);
    if (input.flipVertical) pipeline = pipeline.flip();
    if (input.flipHorizontal) pipeline = pipeline.flop();
    if (input.crop && input.crop.width > 0 && input.crop.height > 0) {
      pipeline = pipeline.extract({
        left: Math.max(0, Math.round(input.crop.left)),
        top: Math.max(0, Math.round(input.crop.top)),
        width: Math.round(input.crop.width),
        height: Math.round(input.crop.height)
      });
    }
    if (input.resizeWidth && input.resizeWidth > 0) {
      pipeline = pipeline.resize({ width: Math.min(1600, Math.round(input.resizeWidth)), fit: "inside", withoutEnlargement: true });
    }
    const output = await pipeline.webp({ quality: 78, effort: 5 }).toBuffer();
    const metadata = await sharp(output).metadata();
    const baseName = `media-${randomUUID()}`;
    const mainName = `${baseName}.webp`;
    await writeFile(join(mediaUploadRoot, mainName), output);

    if (input.saveAsCopy) {
      const copy = await this.prisma.mediaAsset.create({
        data: {
          fileName: mainName,
          originalName: `Edited copy - ${asset.originalName}`,
          filePath: join("uploads", "media", mainName),
          fileUrl: `/uploads/media/${mainName}`,
          mimeType: "image/webp",
          mediaType: MediaType.image,
          fileSize: output.length,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          title: `${asset.title} copy`,
          altText: asset.altText,
          caption: asset.caption,
          description: asset.description,
          optimizedPath: join("uploads", "media", mainName),
          uploadedBy: asset.uploadedBy
        }
      });
      await this.regenerateMediaThumbnails(copy.id);
      return this.mediaAssetDetails(copy.id);
    }

    await this.removeGeneratedMediaFiles(asset).catch(() => undefined);
    await this.prisma.mediaAsset.update({
      where: { id },
      data: {
        fileName: mainName,
        filePath: join("uploads", "media", mainName),
        fileUrl: `/uploads/media/${mainName}`,
        mimeType: "image/webp",
        fileSize: output.length,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        optimizedPath: join("uploads", "media", mainName)
      }
    });
    await this.regenerateMediaThumbnails(id);
    return this.mediaAssetDetails(id);
  }

  async deleteMediaAsset(id: string) {
    const asset = await this.requireMediaAsset(id);
    await this.prisma.mediaAsset.delete({ where: { id } });
    await this.removeStoredMediaFiles(asset).catch(() => undefined);
    return { deleted: true };
  }

  async deleteMediaAssets(ids: string[]) {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));
    const assets = await this.prisma.mediaAsset.findMany({ where: { id: { in: uniqueIds } } });
    await this.prisma.mediaAsset.deleteMany({ where: { id: { in: uniqueIds } } });
    await Promise.all(assets.map((asset) => this.removeStoredMediaFiles(asset).catch(() => undefined)));
    return { deleted: assets.length };
  }

  donations() {
    return {
      enabled: false,
      message: "Donation information is not published yet.",
      methods: []
    };
  }

  electionResults() {
    return this.emptyCollection();
  }

  currentCommittee() {
    return {
      implemented: false,
      committee: null,
      members: []
    };
  }

  previousCommittees() {
    return this.emptyCollection();
  }

  private emptyCollection() {
    return {
      items: [],
      page: 1,
      limit: 12,
      total: 0,
      totalPages: 0
    };
  }

  private async contentModuleCollection(pageKey: "notices" | "events" | "srithir_patha", moduleType: "notice" | "event" | "post", slug?: string) {
    const page = await this.prisma.websitePageSetting.findUnique({ where: { key: pageKey } });
    let items = this.contentModuleItems(page?.contentBlocks, moduleType)
      .filter((item) => item.status === "published")
      .filter((item) => (slug ? item.slug === slug : true))
      .sort((a, b) => {
        const aDate = new Date(a.startsAt ?? a.publishedAt ?? 0).getTime();
        const bDate = new Date(b.startsAt ?? b.publishedAt ?? 0).getTime();
        return moduleType === "event" ? aDate - bDate : bDate - aDate;
      });
    if (moduleType === "post") {
      items = await this.enrichPostAuthors(items);
    }

    return {
      items,
      page: 1,
      limit: items.length || 12,
      total: items.length,
      totalPages: items.length ? 1 : 0
    };
  }

  private async findPublishedPost(slug: string) {
    const collection = await this.postDetails(slug);
    const post = collection.items[0];
    if (!post) throw new NotFoundException(`Post ${slug} is not published.`);
    return post;
  }

  private async enrichPostAuthors<T extends Array<{ authorUserId?: string | null; authorProfileUrl?: string | null }>>(items: T) {
    const userIds = Array.from(new Set(items.map((item) => item.authorUserId).filter((id): id is string => Boolean(id))));
    if (!userIds.length) return items;

    const members = await this.prisma.member.findMany({
      where: { userId: { in: userIds } },
      select: {
        userId: true,
        id: true,
        memberId: true
      }
    });
    const profileByUserId = new Map(
      members.map((member) => [
        member.userId,
        `/verify/${encodeURIComponent(member.memberId ?? member.id)}`
      ])
    );

    return items.map((item) => ({
      ...item,
      authorProfileUrl: item.authorProfileUrl ?? (item.authorUserId ? profileByUserId.get(item.authorUserId) ?? null : null)
    })) as T;
  }

  private async requireOwnedComment(id: string, user: AuthenticatedUser) {
    const comment = await this.prisma.blogPostComment.findUnique({ where: { id } });
    if (!comment) {
      throw new NotFoundException("Comment was not found.");
    }
    if (comment.userId !== user.id) {
      throw new ForbiddenException("You can only manage your own comments.");
    }
    return comment;
  }

  private contentModuleItems(value: Prisma.JsonValue | undefined, moduleType: "notice" | "event" | "post") {
    const rawItems: unknown[] = Array.isArray(value) ? value : [];
    return rawItems
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .map((item) => {
        const title = this.stringValue(item.title) || "Untitled";
        const id = this.stringValue(item.id) || this.slugify(title);
        const date = this.stringValue(item.date) || new Date().toISOString().slice(0, 10);
        const time = this.stringValue(item.time);
        const startsAt = moduleType === "event" ? this.dateTimeIso(date, time) : null;
        const publishedAt = moduleType === "notice" || moduleType === "post" ? this.dateTimeIso(date, time) : null;
        const tags = Array.isArray(item.tags)
          ? item.tags.filter((tag): tag is string => typeof tag === "string" && Boolean(tag.trim())).map((tag) => tag.trim())
          : [];
        const taxonomies = Array.isArray(item.taxonomies)
          ? item.taxonomies.filter((taxonomy): taxonomy is string => typeof taxonomy === "string" && Boolean(taxonomy.trim())).map((taxonomy) => taxonomy.trim())
          : [];
        const body = this.stringValue(item.body) || this.stringValue(item.summary);
        return {
          id,
          title,
          slug: moduleType === "post" ? this.slugify(this.stringValue(item.slug) || title) : this.uniqueContentSlug(this.stringValue(item.slug) || this.slugify(title), id),
          summary: this.stringValue(item.summary),
          body,
          publishedAt,
          startsAt,
          location: this.stringValue(item.location),
          mapQuery: this.stringValue(item.mapQuery),
          mapUrl: this.stringValue(item.mapUrl),
          category: taxonomies.find((taxonomy) => taxonomy !== "Uncategorized") ?? this.stringValue(item.category),
          authorUserId: this.stringValue(item.authorUserId),
          authorName: this.stringValue(item.authorName) ?? this.stringValue(item.writerName) ?? "Admin",
          authorProfileUrl: this.stringValue(item.authorProfileUrl),
          taxonomies,
          tags,
          allowComments: item.allowComments !== false,
          imageUrl: null,
          status: this.stringValue(item.status) === "published" ? "published" : "draft"
        };
      });
  }

  private uniqueContentSlug(baseSlug: string, id: string) {
    return `${baseSlug}-${id}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  }

  private uniquePostSlug(baseSlug: string, existingSlugs: Set<string>) {
    const base = baseSlug || `post-${Date.now()}`;
    let slug = base;
    let counter = 2;
    while (existingSlugs.has(slug)) {
      slug = `${base}-${counter}`;
      counter += 1;
    }
    return slug;
  }

  private sanitizeMemberPostBody(value: string) {
    const withoutScripts = value.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
    const withoutHandlers = withoutScripts.replace(/\s+on[a-z]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "");
    return withoutHandlers.replace(/\s+(href|src)\s*=\s*("|')\s*javascript:[\s\S]*?\2/gi, "");
  }

  private dateTimeIso(date: string, time?: string | null) {
    const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : new Date().toISOString().slice(0, 10);
    const safeTime = time && /^\d{2}:\d{2}$/.test(time) ? time : "00:00";
    return `${safeDate}T${safeTime}:00+06:00`;
  }

  private stringValue(value: unknown) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private async ensureDefaultSections() {
    await this.prisma.$transaction(
      defaultSections.map((section) =>
        this.prisma.websiteSectionSetting.upsert({
          where: { key: section.key },
          update: section.key === "srithir_patha" ? { label: section.label, href: section.href, sortOrder: section.sortOrder } : {},
          create: {
            ...section,
            active: true,
            navVisible: true
          }
        })
      )
    );
  }

  private async ensureGeneralSettings() {
    const existing = await this.prisma.websiteGeneralSetting.findFirst({
      orderBy: { createdAt: "asc" }
    });
    if (existing) {
      const needsSignatures = !Array.isArray(existing.idCardSignatures) || existing.idCardSignatures.length === 0;
      const needsFields = !Array.isArray(existing.idCardFields) || existing.idCardFields.length === 0;
      if (needsSignatures || needsFields) {
        return this.prisma.websiteGeneralSetting.update({
          where: { id: existing.id },
          data: {
            idCardSignatures: needsSignatures ? (defaultIdCardSignatures as Prisma.InputJsonValue) : undefined,
            idCardFields: needsFields ? (defaultIdCardFields as Prisma.InputJsonValue) : undefined
          }
        });
      }
      return existing;
    }
    return this.prisma.websiteGeneralSetting.create({
      data: {
        siteTitle: "Membership Organization",
        metaKeywords: "membership, organization, members, events, notices",
        metaDescription:
          "Official public website for membership registration, directory, notices, events, donation, and member verification.",
        idCardSignatures: defaultIdCardSignatures as Prisma.InputJsonValue,
        idCardFields: defaultIdCardFields as Prisma.InputJsonValue
      }
    });
  }

  private normalizeIdCardSignatures(value: unknown) {
    const items = Array.isArray(value) ? (value as IdCardSignatureInput[]) : [];
    return defaultIdCardSignatures.map((fallback) => {
      const item = items.find((entry) => entry?.key === fallback.key) ?? {};
      const signatureType = item.signatureType === "image" ? "image" : "text";
      return {
        key: fallback.key,
        label: item.label?.trim() || fallback.label,
        name: item.name?.trim() || fallback.name,
        signatureType,
        text: item.text?.trim() || fallback.text,
        imageUrl: this.optionalString(item.imageUrl),
        showOnCard: typeof item.showOnCard === "boolean" ? item.showOnCard : fallback.showOnCard
      };
    });
  }

  private normalizeIdCardFields(value: unknown) {
    const items = Array.isArray(value) ? (value as IdCardFieldInput[]) : [];
    return defaultIdCardFields.map((fallback) => {
      const item = items.find((entry) => entry?.key === fallback.key) ?? {};
      return {
        key: fallback.key,
        label: item.label?.trim() || fallback.label,
        showOnCard: typeof item.showOnCard === "boolean" ? item.showOnCard : fallback.showOnCard
      };
    });
  }

  private async ensureDefaultPages() {
    await this.prisma.$transaction(
      defaultPages.map((page) =>
        this.prisma.websitePageSetting.upsert({
          where: { key: page.key },
          update:
            page.key === "srithir_patha"
              ? {
                  title: page.title,
                  route: page.route,
                  heroTitle: page.heroTitle,
                  metaTitle: page.title,
                  metaDescription: page.heroSubtitle
                }
              : {},
          create: {
            ...page,
            status: "published",
            layout: "standard",
            metaTitle: page.title,
            metaDescription: page.heroSubtitle
          }
        })
      )
    );
  }

  private optionalString(value: string | null | undefined) {
    if (value === undefined) return undefined;
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private safeExtension(fileName: string, mimeType: string) {
    const extension = extname(fileName).toLowerCase();
    if (extension) return extension;
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/jpeg") return ".jpg";
    if (mimeType === "image/webp") return ".webp";
    if (mimeType === "image/svg+xml") return ".svg";
    return ".ico";
  }

  private async requireAlbum(id: string) {
    const album = await this.prisma.galleryAlbum.findUnique({ where: { id } });
    if (!album) throw new NotFoundException("Gallery album was not found.");
    return album;
  }

  private async requirePhoto(id: string) {
    const photo = await this.prisma.galleryPhoto.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException("Gallery photo was not found.");
    return photo;
  }

  private async requireAlumniVoice(id: string) {
    const voice = await this.prisma.alumniVoice.findUnique({ where: { id } });
    if (!voice) throw new NotFoundException("Alumni voice was not found.");
    return voice;
  }

  private async requireHomeHeroSlide(id: string) {
    const slide = await this.prisma.homeHeroSlide.findUnique({ where: { id } });
    if (!slide) throw new NotFoundException("Hero slide was not found.");
    return slide;
  }

  private serializeHomeHeroSlide(slide: {
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
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...slide,
      createdAt: slide.createdAt.toISOString(),
      updatedAt: slide.updatedAt.toISOString()
    };
  }

  private serializeAlumniVoice(voice: {
    id: string;
    name: string;
    role: string;
    affiliation: string | null;
    quote: string;
    initials: string | null;
    imageUrl: string | null;
    published: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...voice,
      affiliation: voice.affiliation ?? "",
      initials: voice.initials ?? this.initialsForName(voice.name),
      imageUrl: voice.imageUrl ?? undefined,
      createdAt: voice.createdAt.toISOString(),
      updatedAt: voice.updatedAt.toISOString()
    };
  }

  private initialsForName(name: string) {
    const initials = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
    return initials || "AV";
  }

  private async storeMediaAsset(file: Express.Multer.File, uploadedBy?: string) {
    const prepared = await this.prepareMediaFile(file);

    return this.prisma.mediaAsset.create({
      data: {
        ...prepared,
        originalName: file.originalname,
        title: this.cleanBaseName(file.originalname),
        uploadedBy
      }
    });
  }

  private async mirrorImageUploadToMedia(input: {
    sourceBuffer: Buffer;
    originalBuffer?: Buffer;
    originalMimeType?: string;
    originalName: string;
    title: string;
    caption?: string | null;
    uploadedBy?: string | null;
  }) {
    await mkdir(mediaUploadRoot, { recursive: true });
    const baseName = `media-${randomUUID()}`;
    const mainName = `${baseName}.webp`;
    const thumbnailName = `${baseName}-300.webp`;
    const mediumName = `${baseName}-768.webp`;
    const largeName = `${baseName}-1200.webp`;
    const mainBuffer = await sharp(input.sourceBuffer)
      .rotate()
      .resize({ width: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78, effort: 5 })
      .toBuffer();
    const metadata = await sharp(mainBuffer).metadata();
    const filesToWrite = [
      writeFile(join(mediaUploadRoot, mainName), mainBuffer),
      writeFile(join(mediaUploadRoot, thumbnailName), await this.imageVariant(mainBuffer, 300)),
      writeFile(join(mediaUploadRoot, mediumName), await this.imageVariant(mainBuffer, 768)),
      writeFile(join(mediaUploadRoot, largeName), await this.imageVariant(mainBuffer, 1200))
    ];
    let originalName: string | null = null;
    if (input.originalBuffer && input.originalBuffer.length <= maxMediaUploadBytes) {
      const originalExtension = this.safeMediaExtension(input.originalName, input.originalMimeType ?? "image/webp");
      originalName = `${baseName}-original${originalExtension}`;
      filesToWrite.push(writeFile(join(mediaUploadRoot, originalName), input.originalBuffer));
    }
    await Promise.all(filesToWrite);

    return this.prisma.mediaAsset.create({
      data: {
        fileName: mainName,
        originalName: input.originalName,
        filePath: join("uploads", "media", mainName),
        fileUrl: `/uploads/media/${mainName}`,
        mimeType: "image/webp",
        mediaType: MediaType.image,
        fileSize: mainBuffer.length,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        title: input.title.trim() || this.cleanBaseName(input.originalName),
        caption: input.caption ?? null,
        thumbnailPath: join("uploads", "media", thumbnailName),
        thumbnailUrl: `/uploads/media/${thumbnailName}`,
        mediumUrl: `/uploads/media/${mediumName}`,
        largeUrl: `/uploads/media/${largeName}`,
        optimizedPath: join("uploads", "media", mainName),
        originalPath: originalName ? join("uploads", "media", originalName) : null,
        originalUrl: originalName ? `/uploads/media/${originalName}` : null,
        uploadedBy: input.uploadedBy ?? null
      }
    });
  }

  private async prepareMediaFile(file: Express.Multer.File) {
    if (!allowedMediaMimeTypes.has(file.mimetype)) throw new BadRequestException("Unsupported file type.");
    if (file.size > maxMediaUploadBytes) throw new BadRequestException("Each file must be less than 5MB.");
    await mkdir(mediaUploadRoot, { recursive: true });
    const mediaType = this.mediaTypeForMime(file.mimetype);
    const baseName = `media-${randomUUID()}`;

    if (mediaType === MediaType.image) {
      const mainName = `${baseName}.webp`;
      const thumbnailName = `${baseName}-300.webp`;
      const mediumName = `${baseName}-768.webp`;
      const largeName = `${baseName}-1200.webp`;
      const originalExtension = this.safeMediaExtension(file.originalname, file.mimetype);
      const originalName = `${baseName}-original${originalExtension}`;
      const mainBuffer = await sharp(file.buffer)
        .rotate()
        .resize({ width: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78, effort: 5 })
        .toBuffer();
      const thumbnailBuffer = await this.imageVariant(file.buffer, 300);
      const mediumBuffer = await this.imageVariant(file.buffer, 768);
      const largeBuffer = await this.imageVariant(file.buffer, 1200);
      const metadata = await sharp(mainBuffer).metadata();
      await Promise.all([
        writeFile(join(mediaUploadRoot, originalName), file.buffer),
        writeFile(join(mediaUploadRoot, mainName), mainBuffer),
        writeFile(join(mediaUploadRoot, thumbnailName), thumbnailBuffer),
        writeFile(join(mediaUploadRoot, mediumName), mediumBuffer),
        writeFile(join(mediaUploadRoot, largeName), largeBuffer)
      ]);
      return {
          fileName: mainName,
          filePath: join("uploads", "media", mainName),
          fileUrl: `/uploads/media/${mainName}`,
          mimeType: "image/webp",
          mediaType,
          fileSize: mainBuffer.length,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          thumbnailPath: join("uploads", "media", thumbnailName),
          thumbnailUrl: `/uploads/media/${thumbnailName}`,
          mediumUrl: `/uploads/media/${mediumName}`,
          largeUrl: `/uploads/media/${largeName}`,
          optimizedPath: join("uploads", "media", mainName),
          originalPath: join("uploads", "media", originalName),
          originalUrl: `/uploads/media/${originalName}`
      };
    }

    const extension = this.safeMediaExtension(file.originalname, file.mimetype);
    const storedName = `${baseName}${extension}`;
    await writeFile(join(mediaUploadRoot, storedName), file.buffer);
    return {
        fileName: storedName,
        filePath: join("uploads", "media", storedName),
        fileUrl: `/uploads/media/${storedName}`,
        mimeType: file.mimetype,
        mediaType,
        fileSize: file.size,
        width: null,
        height: null,
        thumbnailPath: null,
        thumbnailUrl: null,
        mediumUrl: null,
        largeUrl: null,
        optimizedPath: null,
        originalPath: null,
        originalUrl: null
    };
  }

  private imageVariant(buffer: Buffer, width: number) {
    return sharp(buffer)
      .rotate()
      .resize({ width, fit: "inside", withoutEnlargement: true })
      .webp({ quality: width <= 300 ? 70 : 76, effort: 4 })
      .toBuffer();
  }

  private mediaTypeForMime(mimeType: string) {
    if (mimeType.startsWith("image/")) return MediaType.image;
    if (mimeType.startsWith("video/")) return MediaType.video;
    return MediaType.document;
  }

  private mediaTypeFromFilter(value?: string): MediaType | undefined {
    if (value === "image" || value === "images") return MediaType.image;
    if (value === "video" || value === "videos") return MediaType.video;
    if (value === "document" || value === "documents" || value === "pdf") return MediaType.document;
    return undefined;
  }

  private monthRange(month?: string) {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 1);
    return { start, end };
  }

  private cleanBaseName(fileName: string) {
    return fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "Untitled media";
  }

  private safeMediaExtension(fileName: string, mimeType: string) {
    const extension = extname(fileName).toLowerCase();
    if (mimeType === "image/png") return ".png";
    if (mimeType === "image/jpeg") return ".jpg";
    if (mimeType === "image/webp") return ".webp";
    if (mimeType === "video/mp4") return ".mp4";
    if (mimeType === "video/webm") return ".webm";
    if (mimeType === "application/pdf") return ".pdf";
    return extension || ".bin";
  }

  private serializeMediaAsset(asset: {
    id: string;
    fileName: string;
    originalName: string;
    fileUrl: string;
    mimeType: string;
    mediaType: MediaType;
    fileSize: number;
    width: number | null;
    height: number | null;
    altText: string | null;
    title: string;
    caption: string | null;
    description: string | null;
    thumbnailUrl: string | null;
    mediumUrl: string | null;
    largeUrl: string | null;
    originalPath: string | null;
    originalUrl: string | null;
    uploadedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      ...asset,
      mediaType: asset.mediaType,
      createdAt: asset.createdAt.toISOString(),
      updatedAt: asset.updatedAt.toISOString()
    };
  }

  private async requireMediaAsset(id: string) {
    const asset = await this.prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) throw new NotFoundException("Media item was not found.");
    return asset;
  }

  private async removeStoredMediaFiles(asset: {
    filePath: string;
    thumbnailPath: string | null;
    optimizedPath: string | null;
    originalPath?: string | null;
    mediumUrl: string | null;
    largeUrl: string | null;
  }) {
    const paths = [
      asset.filePath,
      asset.thumbnailPath,
      asset.optimizedPath,
      asset.originalPath,
      asset.mediumUrl ? asset.mediumUrl.replace(/^\//, "") : null,
      asset.largeUrl ? asset.largeUrl.replace(/^\//, "") : null
    ].filter((value): value is string => Boolean(value));
    await Promise.all(Array.from(new Set(paths)).map((path) => rm(join(process.cwd(), path), { force: true }).catch(() => undefined)));
  }

  private async removeGeneratedMediaFiles(asset: {
    filePath: string;
    thumbnailPath: string | null;
    optimizedPath: string | null;
    mediumUrl: string | null;
    largeUrl: string | null;
  }) {
    const paths = [
      asset.filePath,
      asset.thumbnailPath,
      asset.optimizedPath,
      asset.mediumUrl ? asset.mediumUrl.replace(/^\//, "") : null,
      asset.largeUrl ? asset.largeUrl.replace(/^\//, "") : null
    ].filter((value): value is string => Boolean(value));
    await Promise.all(Array.from(new Set(paths)).map((path) => rm(join(process.cwd(), path), { force: true }).catch(() => undefined)));
  }

  private async syncAlbumCover(albumId: string) {
    const album = await this.prisma.galleryAlbum.findUnique({ where: { id: albumId }, include: { photos: true } });
    if (!album) return;
    const coverStillExists = album.coverUrl && album.photos.some((photo) => photo.thumbnailUrl === album.coverUrl || photo.imageUrl === album.coverUrl);
    if (coverStillExists) return;
    const firstPhoto = await this.prisma.galleryPhoto.findFirst({
      where: { albumId, published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });
    await this.prisma.galleryAlbum.update({
      where: { id: albumId },
      data: { coverUrl: firstPhoto?.thumbnailUrl ?? null }
    });
  }

  private slugify(value: string) {
    const slug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return slug || `album-${Date.now()}`;
  }

  private async uniqueAlbumSlug(baseSlug: string) {
    let slug = baseSlug;
    let counter = 2;
    while (await this.prisma.galleryAlbum.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter += 1;
    }
    return slug;
  }
}
