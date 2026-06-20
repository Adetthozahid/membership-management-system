export const APP_NAME = "Membership Management System";

export const MEMBER_STATUSES = [
  "pending",
  "under_review",
  "correction_requested",
  "approved",
  "rejected",
  "active",
  "inactive",
  "suspended",
  "expired"
] as const;

export const USER_ROLES = [
  "super-admin",
  "admin",
  "accountant",
  "committee-manager",
  "content-manager",
  "election-officer",
  "member"
] as const;

export const AUTH_STORAGE_KEY = "mms_access_token";
