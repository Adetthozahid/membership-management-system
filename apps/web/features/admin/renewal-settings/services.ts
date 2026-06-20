import type { MembershipTypeSummary } from "@mms/shared";
import { apiRequest } from "@/lib/auth-client";

type RenewalSettingsInput = {
  renewalRequired: boolean;
  renewalFee: number;
  renewalCycle: string;
  gracePeriodDays: number;
  directoryVisibleWhenExpired: boolean;
  monthlyChandaRequired: boolean;
  monthlyChandaAmount: number;
};

export function getMembershipTypes() {
  return apiRequest<MembershipTypeSummary[]>("/membership-types");
}

export function updateMembershipTypeRenewalSettings(
  selectedId: string,
  form: RenewalSettingsInput,
) {
  return apiRequest(`/membership-types/${selectedId}`, {
    method: "PATCH",
    body: JSON.stringify(form),
  });
}
