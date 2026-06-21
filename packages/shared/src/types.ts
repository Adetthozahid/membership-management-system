import type { MEMBER_STATUSES, USER_ROLES } from "./constants";

export type MemberStatus = (typeof MEMBER_STATUSES)[number];

export type UserRole = (typeof USER_ROLES)[number];

export interface ApiHealthResponse {
  status: "ok";
  database: "connected";
  timestamp: string;
  service: string;
}

export interface MemberSummary {
  id: string;
  userId: string | null;
  memberId: string | null;
  memberNumber: string | null;
  fullName: string;
  email: string;
  phone: string | null;
  status: MemberStatus;
  membershipTypeId: string | null;
  membershipType: {
    id: string;
    name: string;
    code: string;
  } | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedMembersResponse {
  items: MemberSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CorrectionSubmissionSummary {
  id: string;
  requestId: string | null;
  memberId: string;
  member: MemberSummary;
  message: string | null;
  values: Record<string, unknown>;
  fieldLabels: Record<string, string>;
  documents: unknown[];
  createdAt: string;
}

export interface PaginatedCorrectionSubmissionsResponse {
  items: CorrectionSubmissionSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MemberStatusLogSummary {
  id: string;
  fromStatus: MemberStatus | null;
  toStatus: MemberStatus;
  note: string | null;
  changedByUserId: string | null;
  createdAt: string;
}

export interface MemberDetails extends MemberSummary {
  photo: string | null;
  approvalNote: string | null;
  rejectionReason: string | null;
  correctionRequestedAt: string | null;
  correctionNote: string | null;
  approvedByUserId: string | null;
  rejectedByUserId: string | null;
  correctionByUserId: string | null;
  approvedAt: string | null;
  expiredAt: string | null;
  statusLogs: MemberStatusLogSummary[];
  documents: Array<{
    id: string;
    memberId: string;
    documentType: string;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
    fileSize: number | null;
    uploadedByUserId: string | null;
    createdAt: string;
  }>;
  formValues: Array<{
    id: string;
    fieldId: string;
    key: string;
    label: string;
    type: FormFieldType;
    value: unknown;
    fileUrl: string | null;
    fileName: string | null;
    mimeType: string | null;
    fileSize: number | null;
    createdAt: string;
    updatedAt: string;
  }>;
  correctionRequests: Array<{
    id: string;
    message: string;
    fieldKeys: string[];
    documentTypes: string[];
    requestedByUserId: string | null;
    resolvedAt: string | null;
    createdAt: string;
  }>;
  correctionSubmissions: Array<{
    id: string;
    requestId: string | null;
    message: string | null;
    values: Record<string, unknown>;
    fieldLabels: Record<string, string>;
    documents: unknown[];
    createdAt: string;
  }>;
}

export interface MembershipTypeSummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  renewalRequired: boolean;
  renewalFee: number;
  renewalCycle: string | null;
  gracePeriodDays: number;
  directoryVisibleWhenExpired: boolean;
  monthlyChandaRequired: boolean;
  monthlyChandaAmount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type FormFieldType =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "dropdown"
  | "radio"
  | "checkbox"
  | "file"
  | "image"
  | "document";

export interface FormOption {
  label: string;
  value: string;
}

export interface FormFieldSummary {
  id: string;
  sectionId: string;
  label: string;
  key: string;
  placeholder: string | null;
  helpText: string | null;
  type: FormFieldType;
  required: boolean;
  publicVisible: boolean;
  memberEditable: boolean;
  adminOnly: boolean;
  membershipTypeSpecific: boolean;
  membershipTypeIds: string[] | null;
  validationRules: Record<string, unknown> | null;
  options: FormOption[] | null;
  sortOrder: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormSummary {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  system: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FormSectionSummary {
  id: string;
  formId: string;
  title: string;
  description: string | null;
  sortOrder: number;
  active: boolean;
  fields: FormFieldSummary[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  mustChangePassword: boolean;
  roles: UserRole[];
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}

export interface RenewalSummary {
  member: {
    id: string;
    userId: string | null;
    memberId: string | null;
    fullName: string;
    email: string;
    phone: string | null;
    status: MemberStatus;
    joinedAt: string | null;
    expiredAt: string | null;
  };
  membershipType: null | {
    id: string;
    name: string;
    code: string;
    renewalRequired: boolean;
    renewalFee: number;
    renewalCycle: string | null;
    gracePeriodDays: number;
    directoryVisibleWhenExpired: boolean;
    monthlyChandaRequired: boolean;
    monthlyChandaAmount: number;
  };
  renewal: {
    required: boolean;
    status: "not_required" | "current" | "due" | "expired";
    cycle: string | null;
    fee: number;
    periodStartsAt: string | null;
    periodEndsAt: string | null;
    graceEndsAt: string | null;
    daysUntilDue: number | null;
    latestMembership: null | {
      id: string;
      startsAt: string;
      endsAt: string;
      status: MemberStatus;
    };
  };
  chanda: {
    required: boolean;
    monthlyAmount: number;
    monthsDue: number;
    totalDue: number;
    paidTotal: number;
    balance: number;
  };
  directoryVisible: boolean;
}

export interface PublicMemberSummary {
  id: string;
  memberId: string | null;
  fullName: string;
  photo: string | null;
  email: string | null;
  phone: string | null;
  status: MemberStatus;
  joinedAt: string | null;
  membershipType: {
    id: string;
    name: string;
    code: string;
  } | null;
  renewal: {
    status: "not_required" | "current" | "due" | "expired";
    required: boolean;
  };
  publicFields: Array<{
    key: string;
    label: string;
    type: FormFieldType;
    value: unknown;
  }>;
}

export interface PaginatedPublicMembersResponse {
  items: PublicMemberSummary[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  filters: {
    membershipTypes: Array<{
      id: string;
      name: string;
      code: string;
    }>;
  };
}

export interface PublicCollection<T = PublicContentItem> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PublicContentItem {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  body?: string | null;
  publishedAt?: string | null;
  startsAt?: string | null;
  location?: string | null;
  mapQuery?: string | null;
  mapUrl?: string | null;
  category?: string | null;
  authorUserId?: string | null;
  authorName?: string | null;
  authorProfileUrl?: string | null;
  taxonomies?: string[];
  tags?: string[];
  allowComments?: boolean;
  imageUrl?: string | null;
}

export interface BlogPostCommentSummary {
  id: string;
  postId: string;
  postSlug: string;
  parentId?: string | null;
  authorUserId?: string;
  body: string;
  authorName: string;
  authorRole: string;
  authorPhoto?: string | null;
  authorProfileUrl?: string | null;
  createdAt: string;
}

export interface BlogPostCommentsResponse {
  items: BlogPostCommentSummary[];
  total: number;
}

export interface PublicGalleryPhoto {
  id: string;
  albumId: string;
  title: string;
  caption: string | null;
  imageUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileSize: number;
  published: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface PublicGalleryAlbum {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  coverUrl: string | null;
  published: boolean;
  sortOrder: number;
  photos: PublicGalleryPhoto[];
}

export interface PublicSiteOverview {
  organization: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    message: string;
  };
  website: {
    siteTitle: string;
    websiteSubtitle: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    metaKeywords: string | null;
    metaDescription: string | null;
    idCardSignatures: IdCardSignatureSetting[];
    idCardFields: IdCardFieldSetting[];
  };
  stats: {
    membersTotal: number;
    activeMembers: number;
  };
  currentCommittee: unknown | null;
  sponsors: Array<{ id: string; name: string; url?: string | null; logoUrl?: string | null }>;
  notices: PublicCollection;
  events: PublicCollection;
}

export type IdCardSignatureType = "text" | "image";

export interface IdCardSignatureSetting {
  key: "president" | "secretary" | string;
  label: string;
  name: string;
  signatureType: IdCardSignatureType;
  text: string;
  imageUrl: string | null;
  showOnCard: boolean;
}

export interface IdCardFieldSetting {
  key:
    | "photo"
    | "memberName"
    | "memberId"
    | "bloodGroup"
    | "phone"
    | "address"
    | "qrCode"
    | "approvedSeal"
    | "organizationAddress"
    | "returnNotice"
    | "signatures"
    | string;
  label: string;
  showOnCard: boolean;
}

export interface PublicMemberVerification {
  verified: true;
  member: PublicMemberSummary;
}

export interface MemberSelfProfile {
  id: string;
  userId: string;
  memberId: string | null;
  memberNumber: string | null;
  fullName: string;
  email: string;
  username: string;
  mustChangePassword: boolean;
  phone: string | null;
  photo: string | null;
  status: MemberStatus;
  membershipTypeId: string | null;
  membershipType: {
    id: string;
    name: string;
    code: string;
  } | null;
  joinedAt: string | null;
  approvedAt: string | null;
  expiredAt: string | null;
  createdAt: string;
  updatedAt: string;
  socialLinks: Array<{
    key: string;
    label: string;
    value: unknown;
  }>;
  editing: {
    directEditAllowed: boolean;
    updateRequestAvailable: boolean;
    message: string;
  };
}

export interface MemberSelfRegistrationData {
  memberId: string;
  sections: Array<{
    id: string;
    title: string;
    description: string | null;
    sortOrder: number;
    fields: Array<{
      id: string;
      key: string;
      label: string;
      type: FormFieldType;
      placeholder: string | null;
      helpText: string | null;
      required: boolean;
      memberEditable: boolean;
      options: FormOption[] | null;
      value: unknown;
      fileUrl: string | null;
      fileName: string | null;
      mimeType: string | null;
      fileSize: number | null;
      updatedAt: string;
    }>;
  }>;
}

export interface MemberPaymentHistoryItem {
  id: string;
  amount: number;
  amountCents: number;
    purpose: "renewal" | "chanda" | "donation" | "registration_fee" | "other";
    status: "pending" | "paid" | "failed" | "refunded";
    note: string | null;
    proofUrl: string | null;
    proofFileName: string | null;
    proofMimeType: string | null;
    proofFileSize: number | null;
    paidAt: string | null;
  createdAt: string;
  membership: null | {
    id: string;
    startsAt: string;
    endsAt: string;
    membershipType: {
      id: string;
      name: string;
      code: string;
    };
  };
}

export interface MemberPaymentHistory {
  items: MemberPaymentHistoryItem[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export type MemberNotificationType = "notice" | "event" | "post" | "gallery" | "website";

export interface MemberNotificationPreferences {
  noticeEnabled: boolean;
  eventEnabled: boolean;
  postEnabled: boolean;
  galleryEnabled: boolean;
  websiteEnabled: boolean;
  lastSeenAt: string | null;
}

export interface MemberNotificationItem {
  id: string;
  type: MemberNotificationType;
  title: string;
  message: string;
  href: string;
  createdAt: string;
}

export interface MemberNotificationsResponse {
  items: MemberNotificationItem[];
  unreadCount: number;
  preferences: MemberNotificationPreferences;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
