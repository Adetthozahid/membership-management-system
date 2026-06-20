import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionGuard } from "../auth/permission.guard";
import { RequirePermission } from "../auth/permissions.decorator";
import type { AuthenticatedUser } from "../auth/auth.types";
import { PublicContentService } from "./public-content.service";

@Controller("public")
export class PublicContentController {
  constructor(private readonly content: PublicContentService) {}

  @Get("site")
  site() {
    return this.content.siteOverview();
  }

  @Get("navigation")
  navigation() {
    return this.content.navigation();
  }

  @Get("pages/:key")
  page(@Param("key") key: string) {
    return this.content.publicPage(key);
  }

  @Get("notices")
  notices() {
    return this.content.notices();
  }

  @Get("notices/:slug")
  noticeDetails(@Param("slug") slug: string) {
    return this.content.noticeDetails(slug);
  }

  @Get("events")
  events() {
    return this.content.events();
  }

  @Get("events/:slug")
  eventDetails(@Param("slug") slug: string) {
    return this.content.eventDetails(slug);
  }

  @Get("srithir-patha")
  posts() {
    return this.content.posts();
  }

  @Get("srithir-patha/:slug")
  postDetails(@Param("slug") slug: string) {
    return this.content.postDetails(slug);
  }

  @Get("smritir-pata")
  smritirPataPosts() {
    return this.content.posts();
  }

  @Get("smritir-pata/:slug")
  smritirPataPostDetails(@Param("slug") slug: string) {
    return this.content.postDetails(slug);
  }

  @Get("smritir-pata/:slug/comments")
  smritirPataPostComments(@Param("slug") slug: string) {
    return this.content.postComments(slug);
  }

  @Post("smritir-pata/:slug/comments")
  @UseGuards(JwtAuthGuard)
  createSmritirPataPostComment(
    @Param("slug") slug: string,
    @Body() body: { body?: string },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.content.createPostComment(slug, body, user);
  }

  @Post("smritir-pata/comments/:id/hide")
  @UseGuards(JwtAuthGuard)
  hideSmritirPataPostComment(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.content.hidePostComment(id, user);
  }

  @Post("smritir-pata/comments/:id/delete")
  @UseGuards(JwtAuthGuard)
  deleteSmritirPataPostComment(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.content.deletePostComment(id, user);
  }

  @Get("gallery")
  gallery() {
    return this.content.gallery();
  }

  @Get("home-hero-slides")
  homeHeroSlides() {
    return this.content.homeHeroSlides();
  }

  @Get("alumni-voices")
  alumniVoices() {
    return this.content.alumniVoices();
  }

  @Get("testimonials")
  testimonials() {
    return this.content.alumniVoices();
  }

  @Get("donations")
  donations() {
    return this.content.donations();
  }

  @Get("election-results")
  electionResults() {
    return this.content.electionResults();
  }

  @Get("committees/current")
  currentCommittee() {
    return this.content.currentCommittee();
  }

  @Get("committees/previous")
  previousCommittees() {
    return this.content.previousCommittees();
  }
}

@Controller("member")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class MemberContentController {
  constructor(private readonly content: PublicContentService) {}

  @Get("smritir-pata")
  @RequirePermission("member", "access")
  smritirPataPosts(@CurrentUser() user: AuthenticatedUser) {
    return this.content.memberSmritirPataPosts(user);
  }

  @Post("smritir-pata")
  @RequirePermission("member", "access")
  createSmritirPataPost(
    @Body()
    body: {
      title?: string;
      summary?: string;
      body?: string;
      category?: string;
      tags?: string[];
      status?: "draft" | "pending";
    },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.content.createMemberSmritirPataPost(body, user);
  }

  @Patch("smritir-pata/:id")
  @RequirePermission("member", "access")
  updateSmritirPataPost(
    @Param("id") id: string,
    @Body()
    body: {
      title?: string;
      summary?: string;
      body?: string;
      category?: string;
      tags?: string[];
      status?: "draft" | "pending";
    },
    @CurrentUser() user: AuthenticatedUser
  ) {
    return this.content.updateMemberSmritirPataPost(id, body, user);
  }

  @Post("smritir-pata/:id/trash")
  @RequirePermission("member", "access")
  trashSmritirPataPost(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.content.trashMemberSmritirPataPost(id, user);
  }

  @Post("smritir-pata/:id/restore")
  @RequirePermission("member", "access")
  restoreSmritirPataPost(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.content.restoreMemberSmritirPataPost(id, user);
  }

  @Delete("smritir-pata/:id")
  @RequirePermission("member", "access")
  deleteSmritirPataPost(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.content.deleteMemberSmritirPataPost(id, user);
  }

  @Get("smritir-pata/media")
  @RequirePermission("member", "access")
  smritirPataMedia(@Query() query: { search?: string; type?: string; page?: string; limit?: string }, @CurrentUser() user: AuthenticatedUser) {
    return this.content.memberMediaLibrary(query, user);
  }

  @Post("smritir-pata/media")
  @RequirePermission("member", "access")
  @UseInterceptors(FilesInterceptor("files", 10, { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 10 } }))
  uploadSmritirPataMedia(@UploadedFiles() files: Express.Multer.File[] | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.content.uploadMemberMedia(files, user);
  }
}

@Controller("admin/website")
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminWebsiteController {
  constructor(private readonly content: PublicContentService) {}

  @Get("general")
  @RequirePermission("admin", "access")
  general() {
    return this.content.generalSettings();
  }

  @Patch("general")
  @RequirePermission("admin", "access")
  updateGeneral(
    @Body()
    body: {
      siteTitle?: string;
      logoUrl?: string | null;
      faviconUrl?: string | null;
      metaKeywords?: string | null;
      metaDescription?: string | null;
      idCardSignatures?: Array<{
        key?: string;
        label?: string;
        name?: string;
        signatureType?: string;
        text?: string;
        imageUrl?: string | null;
        showOnCard?: boolean;
      }>;
      idCardFields?: Array<{
        key?: string;
        label?: string;
        showOnCard?: boolean;
      }>;
    }
  ) {
    return this.content.updateGeneralSettings(body);
  }

  @Post("assets/:kind")
  @RequirePermission("admin", "access")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadAsset(@Param("kind") kind: string, @UploadedFile() file?: Express.Multer.File) {
    if (kind !== "logo" && kind !== "favicon" && kind !== "signature") throw new BadRequestException("Asset type is not supported.");
    return this.content.storeWebsiteAsset(file, kind);
  }

  @Get("sections")
  @RequirePermission("admin", "access")
  sections() {
    return this.content.websiteSections();
  }

  @Patch("sections")
  @RequirePermission("admin", "access")
  updateSections(
    @Body()
    body: {
      items: Array<{ key: string; label?: string; href?: string; active?: boolean; navVisible?: boolean; sortOrder?: number }>;
    }
  ) {
    return this.content.updateWebsiteSections(body.items ?? []);
  }

  @Get("pages")
  @RequirePermission("admin", "access")
  pages() {
    return this.content.websitePages();
  }

  @Patch("pages")
  @RequirePermission("admin", "access")
  updatePages(
    @Body()
    body: {
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
      }>;
    }
  ) {
    return this.content.updateWebsitePages(body.items ?? []);
  }

  @Get("gallery/albums")
  @RequirePermission("admin", "access")
  galleryAlbums() {
    return this.content.adminGalleryAlbums();
  }

  @Post("gallery/albums")
  @RequirePermission("admin", "access")
  createGalleryAlbum(@Body() body: { title?: string; description?: string | null; published?: boolean; sortOrder?: number }) {
    return this.content.createGalleryAlbum(body);
  }

  @Patch("gallery/albums/:id")
  @RequirePermission("admin", "access")
  updateGalleryAlbum(
    @Param("id") id: string,
    @Body() body: { title?: string; description?: string | null; coverUrl?: string | null; published?: boolean; sortOrder?: number }
  ) {
    return this.content.updateGalleryAlbum(id, body);
  }

  @Post("gallery/albums/:id/photos")
  @RequirePermission("admin", "access")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 12 * 1024 * 1024 } }))
  uploadGalleryPhoto(
    @Param("id") id: string,
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: { title?: string; caption?: string | null; published?: string | boolean; sortOrder?: string | number },
    @CurrentUser() user?: AuthenticatedUser
  ) {
    return this.content.storeGalleryPhoto(id, file, {
      title: body?.title,
      caption: body?.caption,
      published: body?.published === undefined ? undefined : body.published === true || body.published === "true",
      sortOrder: body?.sortOrder === undefined || body?.sortOrder === "" ? undefined : Number(body.sortOrder)
    }, user?.id);
  }

  @Patch("gallery/photos/:id")
  @RequirePermission("admin", "access")
  updateGalleryPhoto(
    @Param("id") id: string,
    @Body() body: { title?: string; caption?: string | null; published?: boolean; sortOrder?: number; albumId?: string }
  ) {
    return this.content.updateGalleryPhoto(id, body);
  }

  @Post("gallery/photos/:id/delete")
  @RequirePermission("admin", "access")
  deleteGalleryPhoto(@Param("id") id: string) {
    return this.content.deleteGalleryPhoto(id);
  }

  @Post("gallery/photos/:id/edit-image")
  @RequirePermission("admin", "access")
  editGalleryPhotoImage(
    @Param("id") id: string,
    @Body()
    body: {
      rotate?: number;
      flipHorizontal?: boolean;
      flipVertical?: boolean;
      resizeWidth?: number;
      crop?: { left: number; top: number; width: number; height: number };
      saveAsCopy?: boolean;
    }
  ) {
    return this.content.editGalleryPhotoImage(id, body);
  }

  @Post("gallery/photos/:id/restore-image")
  @RequirePermission("admin", "access")
  restoreGalleryPhotoImage(
    @Param("id") id: string,
    @Body() body: { imageUrl?: string; thumbnailUrl?: string; mimeType?: string; fileSize?: number; width?: number; height?: number }
  ) {
    return this.content.restoreGalleryPhotoImage(id, body);
  }

  @Get("home-hero-slides")
  @RequirePermission("admin", "access")
  homeHeroSlides() {
    return this.content.adminHomeHeroSlides();
  }

  @Post("home-hero-slides")
  @RequirePermission("admin", "access")
  createHomeHeroSlide(
    @Body()
    body: {
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
    return this.content.createHomeHeroSlide(body);
  }

  @Patch("home-hero-slides/:id")
  @RequirePermission("admin", "access")
  updateHomeHeroSlide(
    @Param("id") id: string,
    @Body()
    body: {
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
    return this.content.updateHomeHeroSlide(id, body);
  }

  @Post("home-hero-slides/:id/delete")
  @RequirePermission("admin", "access")
  deleteHomeHeroSlide(@Param("id") id: string) {
    return this.content.deleteHomeHeroSlide(id);
  }

  @Get("alumni-voices")
  @RequirePermission("admin", "access")
  alumniVoices() {
    return this.content.adminAlumniVoices();
  }

  @Get("testimonials")
  @RequirePermission("admin", "access")
  testimonials() {
    return this.content.adminAlumniVoices();
  }

  @Post("alumni-voices")
  @RequirePermission("admin", "access")
  createAlumniVoice(
    @Body()
    body: {
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
    return this.content.createAlumniVoice(body);
  }

  @Post("testimonials")
  @RequirePermission("admin", "access")
  createTestimonial(
    @Body()
    body: {
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
    return this.content.createAlumniVoice(body);
  }

  @Patch("alumni-voices/:id")
  @RequirePermission("admin", "access")
  updateAlumniVoice(
    @Param("id") id: string,
    @Body()
    body: {
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
    return this.content.updateAlumniVoice(id, body);
  }

  @Patch("testimonials/:id")
  @RequirePermission("admin", "access")
  updateTestimonial(
    @Param("id") id: string,
    @Body()
    body: {
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
    return this.content.updateAlumniVoice(id, body);
  }

  @Post("alumni-voices/:id/delete")
  @RequirePermission("admin", "access")
  deleteAlumniVoice(@Param("id") id: string) {
    return this.content.deleteAlumniVoice(id);
  }

  @Post("testimonials/:id/delete")
  @RequirePermission("admin", "access")
  deleteTestimonial(@Param("id") id: string) {
    return this.content.deleteAlumniVoice(id);
  }

  @Post("gallery/albums/:id/delete")
  @RequirePermission("admin", "access")
  deleteGalleryAlbum(@Param("id") id: string) {
    return this.content.deleteGalleryAlbum(id);
  }

  @Get("media")
  @RequirePermission("admin", "access")
  mediaLibrary(@Query() query: { search?: string; type?: string; month?: string; page?: string; limit?: string }) {
    return this.content.mediaLibrary(query);
  }

  @Get("media/:id")
  @RequirePermission("admin", "access")
  mediaDetails(@Param("id") id: string) {
    return this.content.mediaAssetDetails(id);
  }

  @Post("media")
  @RequirePermission("admin", "access")
  @UseInterceptors(FilesInterceptor("files", 20, { storage: memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 20 } }))
  uploadMedia(@UploadedFiles() files: Express.Multer.File[] | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.content.uploadMedia(files, user.id);
  }

  @Patch("media/:id")
  @RequirePermission("admin", "access")
  updateMedia(@Param("id") id: string, @Body() body: { title?: string; altText?: string | null; caption?: string | null; description?: string | null }) {
    return this.content.updateMediaAsset(id, body);
  }

  @Post("media/:id/replace")
  @RequirePermission("admin", "access")
  @UseInterceptors(FileInterceptor("file", { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }))
  replaceMedia(@Param("id") id: string, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.content.replaceMediaAsset(id, file, user.id);
  }

  @Post("media/:id/regenerate-thumbnails")
  @RequirePermission("admin", "access")
  regenerateMedia(@Param("id") id: string) {
    return this.content.regenerateMediaThumbnails(id);
  }

  @Post("media/:id/edit-image")
  @RequirePermission("admin", "access")
  editMediaImage(
    @Param("id") id: string,
    @Body()
    body: {
      rotate?: number;
      flipHorizontal?: boolean;
      flipVertical?: boolean;
      resizeWidth?: number;
      crop?: { left: number; top: number; width: number; height: number };
      saveAsCopy?: boolean;
      restoreOriginal?: boolean;
    }
  ) {
    return this.content.editMediaImage(id, body);
  }

  @Post("media/delete")
  @RequirePermission("admin", "access")
  deleteMediaItems(@Body() body: { ids?: string[] }) {
    return this.content.deleteMediaAssets(body.ids ?? []);
  }

  @Post("media/:id/delete")
  @RequirePermission("admin", "access")
  deleteMedia(@Param("id") id: string) {
    return this.content.deleteMediaAsset(id);
  }
}
