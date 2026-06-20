"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormSectionSummary } from "@mms/shared";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  ClipboardCheck,
  CreditCard,
  FileText,
  Globe2,
  GraduationCap,
  Handshake,
  IdCard,
  Mail,
  Phone,
  ShieldCheck,
  Upload,
  User,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicPageHeader } from "@/components/public/public-page-header";
import { apiRequest, fetchCurrentUser, refreshSession } from "@/lib/auth-client";
import { getMemberDashboardUrl } from "@/lib/domains";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const fileTypes = ["file", "image", "document"];
const inputClass =
  "h-11 w-full rounded-md border bg-card/70 px-4 text-xs shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 md:h-12 md:text-sm";
const fieldLabelClass = "block space-y-2 text-sm font-semibold";

function apiUrl(path: string) {
  return `${apiBaseUrl}${path}`;
}

async function fetchJsonWithFallback<T>(path: string, init?: RequestInit) {
  const primary = await fetch(apiUrl(path), init);
  const data = await primary.json();
  if (Array.isArray(data) && data.length === 0) {
    const fallback = await fetch(path, init);
    if (fallback.ok) return (await fallback.json()) as T;
  }
  return data as T;
}

function normalizeSections(sections: unknown): FormSectionSummary[] {
  return Array.isArray(sections) ? (sections as FormSectionSummary[]) : [];
}

export default function RegistrationForm({
  initialSections = [],
}: {
  initialSections?: FormSectionSummary[];
}) {
  const router = useRouter();
  const [sections, setSections] =
    useState<FormSectionSummary[]>(() => normalizeSections(initialSections));
  const [currentStep, setCurrentStep] = useState(0);
  const [core, setCore] = useState({ fullName: "", email: "", phone: "" });
  const [values, setValues] = useState<Record<string, unknown>>({
    department: "Department of Sociology",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [checkingMemberSession, setCheckingMemberSession] = useState(true);

  const orderedSections = useMemo(() => {
    const paymentSections = sections.filter(isPaymentSection);
    const otherSections = sections.filter(
      (section) => !isPaymentSection(section),
    );
    return [...otherSections, ...paymentSections];
  }, [sections]);

  const steps = useMemo(
    () => [
      { id: "identity", title: "Identity", section: null },
      ...orderedSections.map((section) => ({
        id: section.id,
        title: section.title,
        section,
      })),
    ],
    [orderedSections],
  );
  const activeStep = steps[currentStep] ?? steps[0];
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    let cancelled = false;

    async function redirectMemberSession() {
      try {
        let currentUser: Awaited<ReturnType<typeof fetchCurrentUser>>;
        try {
          currentUser = await fetchCurrentUser();
        } catch {
          const refreshed = await refreshSession();
          currentUser = await fetchCurrentUser(refreshed.accessToken);
        }

        const isMember =
          currentUser.user.roles.includes("member") ||
          currentUser.user.permissions.includes("member:access");
        if (!cancelled && isMember) {
          const profile = await apiRequest<{ id: string; memberId: string | null }>("/member/profile");
          router.replace(getMemberDashboardUrl(profile.memberId ?? profile.id));
          return;
        }
      } catch {
        // Public visitors should still be able to register when no member session exists.
      }

      if (!cancelled) {
        setCheckingMemberSession(false);
      }
    }

    void redirectMemberSession();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (initialSections.length > 0) return;
    fetchJsonWithFallback<FormSectionSummary[]>(
      "/api/public/registration-form",
      { cache: "no-store" },
    )
      .then((data) => setSections(normalizeSections(data)))
      .catch(() => setMessage("Could not load registration form."));
  }, [initialSections.length]);

  useEffect(() => {
    if (currentStep > Math.max(steps.length - 1, 0)) {
      setCurrentStep(Math.max(steps.length - 1, 0));
    }
  }, [currentStep, steps.length]);

  if (checkingMemberSession) {
    return (
      <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">
        Checking member session...
      </div>
    );
  }

  async function uploadFile(fieldKey: string, file: File) {
    const form = new FormData();
    form.append("file", file);
    const response = await fetch(
      apiUrl(`/api/public/registration-form/uploads/${fieldKey}`),
      {
        method: "POST",
        body: form,
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

  function clientValidate() {
    const nextErrors: Record<string, string> = {};
    if (!core.fullName.trim()) nextErrors.fullName = "Full name is required.";
    if (!core.email.trim()) nextErrors.email = "Email is required.";
    if (!core.phone.trim()) nextErrors.phone = "Phone is required.";
    for (const section of orderedSections) {
      for (const field of section.fields) {
        const value = values[field.key];
        if (
          field.required &&
          (value === undefined ||
            value === "" ||
            (Array.isArray(value) && value.length === 0))
        ) {
          nextErrors[field.key] = `${field.label} is required.`;
        }
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function validateStep(stepIndex = currentStep) {
    const step = steps[stepIndex];
    const nextErrors: Record<string, string> = {};

    if (!step || step.id === "identity") {
      if (!core.fullName.trim()) nextErrors.fullName = "Full name is required.";
      if (!core.email.trim()) nextErrors.email = "Email is required.";
      if (!core.phone.trim()) nextErrors.phone = "Phone is required.";
    } else if (step.section) {
      for (const field of step.section.fields) {
        const value = values[field.key];
        if (
          field.required &&
          (value === undefined ||
            value === "" ||
            (Array.isArray(value) && value.length === 0))
        ) {
          nextErrors[field.key] = `${field.label} is required.`;
        }
      }
    }

    setErrors((current) => {
      const scopedKeys = step?.section
        ? step.section.fields.map((field) => field.key)
        : ["fullName", "email", "phone"];
      const cleared = { ...current };
      for (const key of scopedKeys) delete cleared[key];
      return { ...cleared, ...nextErrors };
    });
    return Object.keys(nextErrors).length === 0;
  }

  function goNext() {
    setMessage(null);
    if (!validateStep()) return;
    setCurrentStep((step) => Math.min(step + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setMessage(null);
    setCurrentStep((step) => Math.max(step - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!clientValidate()) return;
    const validateResponse = await fetch(
      apiUrl("/api/public/registration-form/validate"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      },
    );
    const validation = await validateResponse.json();
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    const submitResponse = await fetch(
      apiUrl("/api/public/registration-form/submit"),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...core, values }),
      },
    );
    if (!submitResponse.ok) {
      setMessage("Registration could not be submitted.");
      return;
    }
    const result = (await submitResponse.json()) as {
      applicationId: string;
      correctionToken: string;
    };
    router.push(
      `/register/success?applicationId=${encodeURIComponent(result.applicationId)}&correctionToken=${encodeURIComponent(result.correctionToken)}`,
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 px-1 max-md:max-w-sm max-md:space-y-4">
      <PublicPageHeader
        eyebrow="Registration"
        title="Membership Registration of Sociology Alumni Association of SUST"
        subtitle="Submit your membership application and become part of the official alumni community."
      />

      <section className="hidden rounded-md border bg-card/80 p-5 shadow-sm md:block">
        <div className="grid gap-4 md:grid-cols-[110px_1fr_160px] md:items-center">
          <p className="text-base font-semibold text-primary">
            Step{" "}
            <span className="text-[hsl(var(--terracotta))]">
              {Math.min(currentStep + 1, steps.length)}
            </span>{" "}
            of {steps.length || 1}
          </p>
          <div className="h-3 overflow-hidden rounded-full bg-muted shadow-inner">
            <div
              className="relative h-full rounded-full bg-primary transition-all"
              style={{
                width: `${steps.length ? ((currentStep + 1) / steps.length) * 100 : 0}%`,
              }}
            >
              <span className="absolute right-0 top-1/2 h-5 w-5 -translate-y-1/2 translate-x-1/2 rounded-full border-4 border-primary bg-card shadow" />
            </div>
          </div>
          <p className="text-right text-base font-semibold text-primary">
            {activeStep?.title ?? "Identity"}
          </p>
        </div>
      </section>

      <section className="md:hidden">
        <div className="flex items-center justify-between text-primary">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full"
            onClick={goBack}
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="text-xs font-bold">
            Step{" "}
            <span className="text-[hsl(var(--terracotta))]">
              {currentStep + 1}
            </span>{" "}
            of {steps.length || 1}
          </p>
          <span className="flex h-9 w-9 items-center justify-center rounded-full">
            <IdCard className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              className={`h-1.5 rounded-full transition ${index === currentStep ? "bg-primary" : "bg-muted"}`}
              onClick={() => {
                setCurrentStep(index);
                setMessage(null);
              }}
              aria-label={`Go to ${step.title}`}
            />
          ))}
        </div>
      </section>

      <form
        className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]"
        onSubmit={submit}
      >
        <aside className="relative hidden overflow-hidden rounded-md bg-primary p-6 text-primary-foreground shadow-lg lg:block">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.16),transparent_36%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.09),transparent_42%)]" />
          <div className="relative space-y-1">
            {steps.map((step, index) => (
              <button
                key={step.id}
                type="button"
                className={`group relative flex w-full items-center gap-4 rounded-md py-3 text-left transition ${
                  index === currentStep
                    ? "bg-card px-4 text-primary shadow-xl"
                    : "px-3 text-primary-foreground/90 hover:bg-white/10"
                }`}
                onClick={() => {
                  setCurrentStep(index);
                  setMessage(null);
                }}
              >
                {index < steps.length - 1 ? (
                  <span className="absolute left-[29px] top-12 h-8 w-px bg-white/40" />
                ) : null}
                <span
                  className={`z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold shadow ${
                    index === currentStep
                      ? "bg-[hsl(var(--terracotta))] text-white"
                      : "bg-card text-primary"
                  }`}
                >
                  {index + 1}
                </span>
                <StepIcon title={step.title} className="h-5 w-5 shrink-0" />
                <span className="text-sm font-semibold leading-5">
                  {shortStepTitle(step.title)}
                </span>
              </button>
            ))}
          </div>
          <div className="relative mt-10 hidden h-20 opacity-35 lg:block">
            <div className="absolute bottom-0 left-16 h-20 w-px rotate-[-38deg] bg-white" />
            <div className="absolute bottom-5 left-20 h-14 w-px rotate-[54deg] bg-white" />
            <div className="absolute bottom-2 left-28 h-16 w-px rotate-[72deg] bg-white" />
          </div>
        </aside>

        <div className="space-y-5">
          <Card className="overflow-hidden border bg-card/90 shadow-sm max-md:border-0 max-md:bg-transparent max-md:shadow-none">
            {activeStep?.id === "identity" ? (
              <>
                <CardHeader className="items-center gap-3 p-0 pb-5 text-center md:gap-5 md:p-7 md:text-left lg:flex-row lg:items-center">
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md md:h-20 md:w-20">
                    <User
                      className="h-8 w-8 md:h-10 md:w-10"
                      aria-hidden="true"
                    />
                    <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[hsl(var(--terracotta))] text-white shadow md:h-8 md:w-8">
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="space-y-1 md:space-y-3">
                    <CardTitle className="text-xl text-primary md:text-3xl">
                      Tell us who you are
                    </CardTitle>
                    <div className="mx-auto h-0.5 w-10 bg-[hsl(var(--terracotta))] md:mx-0 md:w-12" />
                    <p className="mx-auto max-w-56 text-xs leading-5 text-muted-foreground md:max-w-none md:text-sm">
                      We need a few basic details to get started.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4 p-0 md:space-y-6 md:p-7 md:pt-0">
                  <div className="pt-0 md:border-t md:border-dashed md:pt-6">
                    <div className="grid gap-4 md:gap-5 lg:grid-cols-2">
                      <IdentityField
                        error={errors.fullName}
                        icon={<User className="h-5 w-5" aria-hidden="true" />}
                        label="Full name"
                        onChange={(value) =>
                          setCore((current) => ({
                            ...current,
                            fullName: value,
                          }))
                        }
                        placeholder="Enter your full name"
                        type="text"
                        value={core.fullName}
                      />
                      <IdentityField
                        error={errors.email}
                        icon={<Mail className="h-5 w-5" aria-hidden="true" />}
                        label="Email address"
                        onChange={(value) =>
                          setCore((current) => ({
                            ...current,
                            email: value,
                          }))
                        }
                        placeholder="Enter your email address"
                        type="email"
                        value={core.email}
                      />
                      <IdentityField
                        className="md:col-span-2"
                        error={errors.phone}
                        icon={<Phone className="h-5 w-5" aria-hidden="true" />}
                        label="Phone number"
                        onChange={(value) =>
                          setCore((current) => ({
                            ...current,
                            phone: value,
                          }))
                        }
                        placeholder="Enter your phone number"
                        type="tel"
                        value={core.phone}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-md border bg-muted/55 p-3 md:gap-4 md:p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground md:h-11 md:w-11">
                      <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-primary md:text-base">
                        Your information is safe with us.
                      </p>
                      <p className="text-xs text-muted-foreground md:text-sm">
                        We respect your privacy.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : null}

            {activeStep?.section ? (
              <>
                <CardHeader className="items-center gap-3 p-0 pb-5 text-center md:gap-5 md:p-7 md:text-left lg:flex-row lg:items-center">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md md:h-20 md:w-20">
                    <StepIcon
                      title={activeStep.section.title}
                      className="h-8 w-8 md:h-10 md:w-10"
                    />
                  </div>
                  <div className="space-y-1 md:space-y-3">
                    <CardTitle className="text-xl text-primary md:text-3xl">
                      {mobileStepHeading(activeStep.section.title)}
                    </CardTitle>
                    <div className="mx-auto h-0.5 w-10 bg-[hsl(var(--terracotta))] md:mx-0 md:w-12" />
                    {activeStep.section.description ? (
                      <p className="mx-auto max-w-64 text-xs leading-5 text-muted-foreground md:max-w-none md:text-sm">
                        {activeStep.section.description}
                      </p>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="grid gap-4 border-0 p-0 md:gap-5 md:border-t md:border-dashed md:p-7 lg:grid-cols-2">
                  {activeStep.section.fields.map((field) => (
                    <label
                      key={field.id}
                      className={`${fieldLabelClass} ${
                        field.type === "textarea" ||
                        field.type === "checkbox" ||
                        fileTypes.includes(field.type)
                          ? "md:col-span-2"
                          : ""
                      } ${
                        field.type === "checkbox"
                          ? "rounded-md border border-primary/10 bg-primary/[0.035] p-4 md:p-5"
                          : ""
                      }`}
                    >
                      <span className="text-xs font-semibold md:text-sm">
                        {field.label}
                        {field.required ? (
                          <span className="text-red-600"> *</span>
                        ) : null}
                      </span>
                      {field.helpText ? (
                        <span className="block text-xs font-normal text-muted-foreground">
                          {field.helpText}
                        </span>
                      ) : null}
                      {field.type === "textarea" ? (
                        <textarea
                          className="min-h-24 w-full rounded-md border bg-card/70 px-4 py-3 text-xs shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 md:min-h-28 md:text-sm"
                          placeholder={fieldPlaceholder(
                            field.label,
                            field.placeholder,
                          )}
                          value={String(values[field.key] ?? "")}
                          onChange={(event) =>
                            setFieldValue(field.key, event.target.value)
                          }
                        />
                      ) : field.type === "date" ? (
                        <input
                          className={inputClass}
                          type="date"
                          value={String(values[field.key] ?? "")}
                          onChange={(event) =>
                            setFieldValue(field.key, event.target.value)
                          }
                        />
                      ) : field.type === "dropdown" ? (
                        <select
                          className={inputClass}
                          value={String(values[field.key] ?? "")}
                          onChange={(event) =>
                            setFieldValue(field.key, event.target.value)
                          }
                        >
                          <option value="">
                            {fieldPlaceholder(field.label, null).replace(
                              "Enter",
                              "Select",
                            )}
                          </option>
                          {(field.options ?? []).map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "radio" ? (
                        <div className="grid grid-cols-2 gap-2">
                          {(field.options ?? []).map((option) => (
                            <label
                              key={option.value}
                              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border bg-card/70 px-3 py-2 text-sm font-semibold shadow-sm transition ${
                                values[field.key] === option.value
                                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                                  : "text-foreground hover:border-primary/40"
                              }`}
                            >
                              <input
                                className="sr-only"
                                type="radio"
                                name={field.key}
                                value={option.value}
                                checked={values[field.key] === option.value}
                                onChange={() =>
                                  setFieldValue(field.key, option.value)
                                }
                              />
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                                  values[field.key] === option.value
                                    ? "border-primary"
                                    : "border-muted-foreground/50"
                                }`}
                              >
                                {values[field.key] === option.value ? (
                                  <span className="h-2 w-2 rounded-full bg-primary" />
                                ) : null}
                              </span>
                              <span className="min-w-0 leading-5">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : field.type === "checkbox" ? (
                        <div
                          className={`grid gap-2 ${
                            (field.options ?? []).length > 1
                              ? "sm:grid-cols-2"
                              : "grid-cols-1"
                          }`}
                        >
                          {(field.options ?? []).map((option) => (
                            <label
                              key={option.value}
                              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm font-semibold shadow-sm transition ${
                                Array.isArray(values[field.key]) &&
                                (values[field.key] as string[]).includes(
                                  option.value,
                                )
                                  ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20"
                                  : "text-foreground hover:border-primary/40"
                              }`}
                            >
                              <input
                                className="sr-only"
                                type="checkbox"
                                value={option.value}
                                checked={
                                  Array.isArray(values[field.key]) &&
                                  (values[field.key] as string[]).includes(
                                    option.value,
                                  )
                                }
                                onChange={(event) => {
                                  const current = Array.isArray(
                                    values[field.key],
                                  )
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
                              <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                                  Array.isArray(values[field.key]) &&
                                  (values[field.key] as string[]).includes(
                                    option.value,
                                  )
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-muted-foreground/50"
                                }`}
                              >
                                {Array.isArray(values[field.key]) &&
                                (values[field.key] as string[]).includes(
                                  option.value,
                                ) ? (
                                  <span className="h-1.5 w-2.5 rotate-[-45deg] border-b-2 border-l-2 border-current" />
                                ) : null}
                              </span>
                              <span className="min-w-0 leading-5">
                                {option.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      ) : fileTypes.includes(field.type) ? (
                        <div className="rounded-md border border-dashed bg-card/70 p-4">
                          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
                            <Upload className="h-4 w-4" aria-hidden="true" />
                            Upload {field.label}
                          </div>
                          <input
                            className="w-full text-sm"
                            type="file"
                            accept={
                              field.type === "image" ? "image/*" : undefined
                            }
                            onChange={(event: ChangeEvent<HTMLInputElement>) =>
                              event.target.files?.[0] &&
                              void uploadFile(field.key, event.target.files[0])
                            }
                          />
                        </div>
                      ) : (
                        <input
                          className={inputClass}
                          type={field.type === "phone" ? "tel" : field.type}
                          placeholder={fieldPlaceholder(
                            field.label,
                            field.placeholder,
                          )}
                          value={String(values[field.key] ?? "")}
                          onChange={(event) =>
                            setFieldValue(field.key, event.target.value)
                          }
                        />
                      )}
                      {errors[field.key] ? (
                        <span className="text-sm font-medium text-red-600">
                          {errors[field.key]}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </CardContent>
              </>
            ) : null}
          </Card>

          {message ? (
            <div className="rounded-md border bg-muted p-3 text-sm">
              {message}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 max-md:hidden">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={currentStep === 0}
              className="h-12 min-w-32 bg-card"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>
            {isLastStep ? (
              <Button type="submit" className="h-12 min-w-44">
                Submit registration
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={goNext}
                disabled={!steps.length}
                className="h-12 min-w-32"
              >
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
          </div>
          <Button
            type={isLastStep ? "submit" : "button"}
            onClick={isLastStep ? undefined : goNext}
            disabled={!steps.length}
            className="h-12 w-full md:hidden"
          >
            {isLastStep ? "Submit registration" : "Continue"}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </form>

      <section className="hidden gap-4 rounded-md border bg-card/80 p-5 shadow-sm md:grid md:grid-cols-4">
        {[
          {
            title: "Stronger Together",
            copy: "A united community of Sociology graduates.",
            icon: Users,
          },
          {
            title: "Lifelong Connection",
            copy: "Reconnect, collaborate and grow together.",
            icon: Handshake,
          },
          {
            title: "Knowledge Sharing",
            copy: "Exchange ideas and inspire each other.",
            icon: BookOpen,
          },
          {
            title: "Build the Future",
            copy: "Together we contribute to a better society.",
            icon: Globe2,
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="flex gap-4 md:border-r md:pr-5 last:md:border-r-0"
            >
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted text-primary shadow-sm">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div>
                <p className="font-semibold text-primary">{item.title}</p>
                <p className="mt-1 text-sm leading-5 text-muted-foreground">
                  {item.copy}
                </p>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function shortStepTitle(title: string) {
  return title
    .replace("Profile & Contact Information", "Profile & Contact")
    .replace("Academic Information", "Academic Info")
    .replace("Professional Information", "Professional Info")
    .replace("Membership & Manual Payment", "Membership & Payment");
}

function mobileStepHeading(title: string) {
  if (title.includes("Profile")) return "Share your profile";
  if (title.includes("Academic")) return "Academic details";
  if (title.includes("Professional")) return "Professional details";
  if (title.includes("Emergency")) return "Emergency contact";
  if (title.includes("Declaration")) return "Confirm declaration";
  if (title.includes("Payment")) return "Payment information";
  return title;
}

function fieldPlaceholder(label: string, placeholder?: string | null) {
  if (placeholder?.trim()) return placeholder;
  return `Enter ${label.toLowerCase()}`;
}

function IdentityField({
  className = "",
  error,
  icon,
  label,
  onChange,
  placeholder,
  type,
  value,
}: {
  className?: string;
  error?: string;
  icon: React.ReactNode;
  label: string;
  onChange: (value: string) => void;
  placeholder: string;
  type: string;
  value: string;
}) {
  return (
    <label className={`${fieldLabelClass} ${className}`}>
      <span className="sr-only md:not-sr-only md:text-sm">
        {label} <span className="text-red-600">*</span>
      </span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-primary/80">
          {icon}
        </span>
        <input
          className={`${inputClass} pl-12`}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
      {error ? (
        <span className="text-sm font-medium text-red-600">{error}</span>
      ) : null}
    </label>
  );
}

function StepIcon({ title, className }: { title: string; className?: string }) {
  const normalized = title.toLowerCase();
  if (normalized.includes("identity")) return <User className={className} />;
  if (normalized.includes("profile")) return <IdCard className={className} />;
  if (normalized.includes("academic"))
    return <GraduationCap className={className} />;
  if (normalized.includes("professional"))
    return <BriefcaseBusiness className={className} />;
  if (normalized.includes("emergency")) return <Phone className={className} />;
  if (normalized.includes("declaration"))
    return <ClipboardCheck className={className} />;
  if (normalized.includes("payment"))
    return <CreditCard className={className} />;
  return <FileText className={className} />;
}

function isPaymentSection(section: FormSectionSummary) {
  const title = section.title.toLowerCase();
  return (
    title.includes("payment") ||
    section.fields.some(
      (field) =>
        field.key.includes("payment") || field.key.includes("transaction"),
    )
  );
}
