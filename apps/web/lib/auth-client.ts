"use client";

import { AUTH_STORAGE_KEY, type AuthResponse, type AuthUser } from "@mms/shared";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AUTH_STORAGE_KEY);
}

export function setAccessToken(token: string) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, token);
}

export function clearAccessToken() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export async function login(scope: "admin" | "member", email: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/api/auth/${scope}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    credentials: "include",
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    throw new Error("Invalid email or password.");
  }

  const data = (await response.json()) as AuthResponse;
  setAccessToken(data.accessToken);
  return data;
}

export async function refreshSession() {
  const response = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
    method: "POST",
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    clearAccessToken();
    throw new Error("Session expired.");
  }

  const data = (await response.json()) as AuthResponse;
  setAccessToken(data.accessToken);
  return data;
}

export async function fetchCurrentUser(token = getAccessToken()) {
  if (!token) {
    throw new Error("Authentication is required.");
  }

  const response = await fetch(`${apiBaseUrl}/api/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Authentication is required.");
  }

  return (await response.json()) as { user: AuthUser };
}

export async function verifyPermission(permission: string, token = getAccessToken()) {
  if (!token) {
    return { status: 401 };
  }

  const endpoint = permission === "admin:access" ? "admin/protected" : "me";
  const response = await fetch(`${apiBaseUrl}/api/auth/${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    return { status: response.status };
  }

  if (permission !== "admin:access") {
    const data = (await response.json()) as { user: AuthUser };
    const allowed = data.user.roles.includes("super-admin") || data.user.permissions.includes(permission);
    return { status: allowed ? 200 : 403 };
  }

  return { status: response.status };
}

export async function logout() {
  const token = getAccessToken();
  await fetch(`${apiBaseUrl}/api/auth/logout`, {
    method: "POST",
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : undefined,
    credentials: "include"
  }).catch(() => undefined);
  clearAccessToken();
}

export async function changePassword(input: { currentPassword: string; newPassword: string }) {
  return apiRequest<{ success: true }>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function submitMemberPayment(input: { purpose: string; amount: number; note?: string; proof?: File | null }) {
  const token = getAccessToken();
  const form = new FormData();
  form.append("purpose", input.purpose);
  form.append("amount", String(input.amount));
  if (input.note) form.append("note", input.note);
  if (input.proof) form.append("proof", input.proof);

  const response = await fetch(`${apiBaseUrl}/api/member/payments`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
    body: form
  });

  if (!response.ok) {
    throw new Error((await getApiErrorMessage(response)) ?? `API request failed: ${response.status}`);
  }

  return response.json();
}

export async function sendChatMessage(conversationId: string, input: { body?: string; attachment?: File | null }) {
  const token = getAccessToken();
  const form = new FormData();
  if (input.body) form.append("body", input.body);
  if (input.attachment) form.append("attachment", input.attachment);

  const response = await fetch(`${apiBaseUrl}/api/member/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
    body: form
  });

  if (!response.ok) {
    throw new Error((await getApiErrorMessage(response)) ?? `API request failed: ${response.status}`);
  }

  return response.json() as Promise<{ id: string }>;
}

export async function downloadChatAttachment(attachmentId: string) {
  const token = getAccessToken();
  const response = await fetch(`${apiBaseUrl}/api/member/chat/attachments/${attachmentId}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error((await getApiErrorMessage(response)) ?? `API request failed: ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  return {
    blob,
    fileName: match ? decodeURIComponent(match[1]) : "attachment"
  };
}

async function getApiErrorMessage(response: Response) {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(" ");
    }
    return data.message;
  } catch {
    return undefined;
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${apiBaseUrl}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers
    },
    credentials: "include",
    cache: "no-store"
  });

  if (response.status === 401) {
    const refreshed = await refreshSession();
    const retry = await fetch(`${apiBaseUrl}/api${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${refreshed.accessToken}`,
        ...init?.headers
      },
      credentials: "include",
      cache: "no-store"
    });

    if (!retry.ok) {
      throw new Error((await getApiErrorMessage(retry)) ?? `API request failed: ${retry.status}`);
    }

    return retry.json() as Promise<T>;
  }

  if (!response.ok) {
    throw new Error((await getApiErrorMessage(response)) ?? `API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function uploadWebsiteAsset(kind: "logo" | "favicon" | "signature", file: File) {
  const token = getAccessToken();
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${apiBaseUrl}/api/admin/website/assets/${kind}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
    body: form
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json() as Promise<{ url: string; fileName: string; mimeType: string; fileSize: number }>;
}

export async function uploadGalleryPhoto(albumId: string, file: File, input?: { title?: string; caption?: string; sortOrder?: number; published?: boolean }) {
  const token = getAccessToken();
  const form = new FormData();
  form.append("file", file);
  if (input?.title) form.append("title", input.title);
  if (input?.caption) form.append("caption", input.caption);
  if (input?.sortOrder !== undefined) form.append("sortOrder", String(input.sortOrder));
  if (input?.published !== undefined) form.append("published", String(input.published));
  const response = await fetch(`${apiBaseUrl}/api/admin/website/gallery/albums/${albumId}/photos`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    credentials: "include",
    body: form
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json() as Promise<{
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
  }>;
}

export async function uploadMediaFiles(files: File[]) {
  async function send(token = getAccessToken()) {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    return fetch(`${apiBaseUrl}/api/admin/website/media`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
      body: form
    });
  }

  let response = await send();
  if (response.status === 401) {
    const refreshed = await refreshSession();
    response = await send(refreshed.accessToken);
  }

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json() as Promise<{
    items: Array<{
      id: string;
      fileUrl: string;
      thumbnailUrl: string | null;
      title: string;
      mediaType: "image" | "video" | "document";
    }>;
  }>;
}
