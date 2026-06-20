"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import type { FormOption, FormFieldType } from "@mms/shared";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fileTypes = ["file", "image", "document"];

interface CorrectionField {
  id: string;
  label: string;
  key: string;
  type: FormFieldType;
  required: boolean;
  helpText: string | null;
  placeholder: string | null;
  options: FormOption[] | null;
}

interface CorrectionForm {
  applicationId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  values: Record<string, unknown>;
  fields: CorrectionField[];
  latestRequest: {
    id: string;
    message: string;
    fieldKeys: string[];
    documentTypes: string[];
    createdAt: string;
  } | null;
}

export default function CorrectionPage({
  params,
}: {
  params: { token: string };
}) {
  const [form, setForm] = useState<CorrectionForm | null>(null);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(
      `${apiBaseUrl}/api/public/applications/${params.token}/correction-form`,
      { cache: "no-store" },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not load correction request.");
        return response.json() as Promise<CorrectionForm>;
      })
      .then((data) => {
        setForm(data);
        setValues(data.values);
      })
      .catch((error: Error) => setNotice(error.message));
  }, [params.token]);

  async function uploadFile(fieldKey: string, file: File) {
    const body = new FormData();
    body.append("file", file);
    const response = await fetch(
      `${apiBaseUrl}/api/public/registration-form/uploads/${fieldKey}`,
      {
        method: "POST",
        body,
      },
    );
    if (!response.ok) {
      setErrors((current) => ({
        ...current,
        [fieldKey]: "Upload failed validation.",
      }));
      return;
    }
    const data = (await response.json()) as { value: unknown };
    setValues((current) => ({ ...current, [fieldKey]: data.value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[fieldKey];
      return next;
    });
  }

  function setFieldValue(key: string, value: unknown) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch(
      `${apiBaseUrl}/api/public/applications/${params.token}/corrections`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, values }),
      },
    );
    if (!response.ok) {
      setNotice("Correction could not be submitted.");
      return;
    }
    setNotice("Correction submitted. Your application is back under review.");
  }

  if (!form) {
    return (
      <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
        {notice ?? "Loading correction request..."}
      </div>
    );
  }

  const requested = new Set(form.latestRequest?.fieldKeys ?? []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PublicPageHeader
        eyebrow="Correction"
        title={`Application Correction for ${form.fullName}`}
        subtitle="Update the requested information so your Sociology Alumni Association of SUST membership application can continue review."
      />
      <Card>
        <CardHeader>
          <CardTitle>Correction request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            {form.latestRequest?.message ??
              "Please update the requested information."}
          </p>
          <div className="rounded-md border bg-muted p-3">
            <div className="text-xs text-muted-foreground">Application ID</div>
            <div className="mt-1 break-all font-medium">
              {form.applicationId}
            </div>
          </div>
        </CardContent>
      </Card>
      <form className="space-y-6" onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Submitted fields</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {form.fields.map((field) => (
              <label
                key={field.id}
                className="block space-y-1 text-sm font-medium"
              >
                <span>
                  {field.label}
                  {requested.has(field.key) ? " *" : ""}
                </span>
                {field.helpText ? (
                  <span className="block text-xs font-normal text-muted-foreground">
                    {field.helpText}
                  </span>
                ) : null}
                {field.type === "textarea" ? (
                  <textarea
                    className="min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={String(values[field.key] ?? "")}
                    onChange={(event) =>
                      setFieldValue(field.key, event.target.value)
                    }
                  />
                ) : field.type === "dropdown" ? (
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    value={String(values[field.key] ?? "")}
                    onChange={(event) =>
                      setFieldValue(field.key, event.target.value)
                    }
                  >
                    <option value="">Select</option>
                    {(field.options ?? []).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <div className="flex flex-wrap gap-3">
                    {(field.options ?? []).map((option) => (
                      <label
                        key={option.value}
                        className="flex items-center gap-2 font-normal"
                      >
                        <input
                          type="checkbox"
                          value={option.value}
                          checked={
                            Array.isArray(values[field.key]) &&
                            (values[field.key] as string[]).includes(
                              option.value,
                            )
                          }
                          onChange={(event) => {
                            const current = Array.isArray(values[field.key])
                              ? (values[field.key] as string[])
                              : [];
                            setFieldValue(
                              field.key,
                              event.target.checked
                                ? [...current, option.value]
                                : current.filter(
                                    (value) => value !== option.value,
                                  ),
                            );
                          }}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                ) : fileTypes.includes(field.type) ? (
                  <input
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    type="file"
                    accept={field.type === "image" ? "image/*" : undefined}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      event.target.files?.[0] &&
                      void uploadFile(field.key, event.target.files[0])
                    }
                  />
                ) : (
                  <input
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    type={field.type === "phone" ? "tel" : field.type}
                    value={String(values[field.key] ?? "")}
                    onChange={(event) =>
                      setFieldValue(field.key, event.target.value)
                    }
                  />
                )}
                {errors[field.key] ? (
                  <span className="text-xs text-red-600">
                    {errors[field.key]}
                  </span>
                ) : null}
              </label>
            ))}
            <label className="block space-y-1 text-sm font-medium">
              <span>Message</span>
              <textarea
                className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>
          </CardContent>
        </Card>
        {notice ? (
          <div className="rounded-md border bg-muted p-3 text-sm">{notice}</div>
        ) : null}
        <Button type="submit">Submit correction</Button>
      </form>
    </div>
  );
}
