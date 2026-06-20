"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemberNotificationsResponse, MemberPaymentHistory, MemberSelfProfile, MemberSelfRegistrationData, PublicCollection, RenewalSummary } from "@mms/shared";
import { apiRequest } from "@/lib/auth-client";

export function useMemberEndpoint<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(() => {
    setData(null);
    setError(null);
    return apiRequest<T>(path)
      .then((value) => {
        setData(value);
        return value;
      })
      .catch((err) => {
        setError("Could not load this member data.");
        throw err;
      });
  }, [path]);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    void apiRequest<T>(path)
      .then((value) => {
        if (!cancelled) setData(value);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this member data.");
      });
    return () => {
      cancelled = true;
      };
  }, [path]);

  return { data, error, refetch };
}

export type MemberProfileData = MemberSelfProfile;
export type MemberRegistrationData = MemberSelfRegistrationData;
export type MemberRenewalData = RenewalSummary;
export type MemberPaymentsData = MemberPaymentHistory;
export type MemberCollectionData = PublicCollection;
export type MemberNotificationsData = MemberNotificationsResponse;
