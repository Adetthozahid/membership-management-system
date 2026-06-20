"use client";

import { useMemo, useState } from "react";
import { Download, Edit3, Save, X } from "lucide-react";
import { useMemberEndpoint, type MemberRegistrationData } from "@/components/member/member-data";
import { MemberEmpty } from "@/components/member/member-empty";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/auth-client";

function valueLabel(value: unknown, fileName: string | null) {
  if (fileName) return fileName;
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function draftValue(value: unknown, fileName: string | null) {
  if (fileName) return fileName;
  if (value === null || value === undefined) return "";
  return value;
}

function draftEquals(current: unknown, original: unknown) {
  return JSON.stringify(current ?? "") === JSON.stringify(original ?? "");
}

function isFileField(type: string) {
  return ["file", "image", "document"].includes(type);
}

function hasPrintableValue(field: PrintableField) {
  return valueLabel(field.value, field.fileName) !== "-";
}

function isCoreIdentityField(field: PrintableField) {
  return ["fullName", "email", "phone"].includes(field.key);
}

function absoluteFileUrl(fileUrl: string | null) {
  if (!fileUrl) return null;
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  return `${apiBaseUrl}${fileUrl}`;
}

type RegistrationOption = NonNullable<PrintableField["options"]>[number];

function fieldOptions(field: PrintableField): RegistrationOption[] {
  if (field.options?.length) return field.options;

  const key = field.key.toLowerCase();
  if (key === "gender") {
    return [
      { label: "Male", value: "male" },
      { label: "Female", value: "female" },
      { label: "Other", value: "other" },
      { label: "Prefer not to say", value: "prefer_not_to_say" }
    ];
  }
  if (key === "blood_group") {
    return [
      { label: "A+", value: "a_positive" },
      { label: "A-", value: "a_negative" },
      { label: "B+", value: "b_positive" },
      { label: "B-", value: "b_negative" },
      { label: "AB+", value: "ab_positive" },
      { label: "AB-", value: "ab_negative" },
      { label: "O+", value: "o_positive" },
      { label: "O-", value: "o_negative" },
      { label: "Unknown", value: "unknown" }
    ];
  }
  if (key === "degree_completed") {
    return [
      { label: "Honours", value: "honours" },
      { label: "Masters", value: "masters" },
      { label: "MPhil", value: "mphil" },
      { label: "PhD", value: "phd" }
    ];
  }
  if (key === "payment_method") {
    return [
      { label: "bKash", value: "bkash" },
      { label: "Nagad", value: "nagad" },
      { label: "Bank Transfer", value: "bank_transfer" },
      { label: "Cash", value: "cash" }
    ];
  }
  if (key === "information_declaration") {
    return [{ label: "I confirm that the information provided is correct.", value: "confirmed" }];
  }
  if (key === "contact_consent") {
    return [{ label: "I agree to be contacted by the alumni association.", value: "agreed" }];
  }

  return [];
}

export default function RegistrationDetailsPage() {
  const { data, error, refetch } = useMemberEndpoint<MemberRegistrationData>("/member/registration-data");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const correctionFields = useMemo(
    () => data?.sections.flatMap((section) => section.fields).filter((field) => !isFileField(field.type)) ?? [],
    [data]
  );
  const printableSections = useMemo(() => data?.sections.map((section) => ({
    ...section,
    fields: section.fields.filter((field) => !isFileField(field.type) && (hasPrintableValue(field) || isCoreIdentityField(field)))
  })).filter((section) => section.fields.length) ?? [], [data]);
  const profilePhotoUrl = useMemo(() => {
    const field = data?.sections
      .flatMap((section) => section.fields)
      .find((item) => item.type === "image" && `${item.key} ${item.label}`.toLowerCase().includes("photo") && item.fileUrl);
    return absoluteFileUrl(field?.fileUrl ?? null);
  }, [data]);

  const startEditing = () => {
    if (!data) return;
    setDraft(
      Object.fromEntries(
        correctionFields.map((field) => [field.key, draftValue(field.value, field.fileName)])
      )
    );
    setMessage("");
    setFormError(null);
    setNotice(null);
    setEditing(true);
  };

  const submitCorrections = async () => {
    if (!data) return;
    const values = Object.fromEntries(
      correctionFields
        .filter((field) => !draftEquals(draft[field.key], draftValue(field.value, field.fileName)))
        .map((field) => [field.key, draft[field.key] ?? ""])
    );

    if (!Object.keys(values).length && !message.trim()) {
      setFormError("Please change at least one field or write a correction note.");
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const result = await apiRequest<{ message: string }>("/member/registration-corrections", {
        method: "POST",
        body: JSON.stringify({ values, message })
      });
      setNotice(result.message);
      setEditing(false);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not submit correction request.");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!data) return <div className="rounded-md border bg-card p-5 text-sm text-muted-foreground">Loading registration details...</div>;

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @page {
          size: A4;
          margin: 0.5in;
        }

        .registration-sheet {
          display: none;
          color: #151515;
          font-family: Arial, Helvetica, sans-serif;
        }

        .registration-sheet,
        .registration-sheet * {
          box-sizing: border-box;
          print-color-adjust: exact;
          -webkit-print-color-adjust: exact;
        }

        .registration-sheet__page {
          position: relative;
          width: calc(210mm - 1in);
          min-height: calc(297mm - 1in - 3mm);
          overflow: hidden;
          border: 1px solid #d9d9d9;
          background: #ffffff;
          padding: 16mm 12mm 11mm;
          box-shadow: 0 12px 34px rgba(15, 23, 42, 0.12);
        }

        .registration-sheet__page::before,
        .registration-sheet__page::after {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          height: 28px;
          background: #84c63a;
        }

        .registration-sheet__page::before {
          top: 0;
        }

        .registration-sheet__page::after {
          bottom: 0;
        }

        .registration-sheet__accent {
          position: absolute;
          right: 0;
          top: 0;
          width: 54%;
          height: 28px;
          background: #2b2b2d;
          clip-path: polygon(8% 0, 100% 0, 100% 100%, 0 100%);
        }

        .registration-sheet__slant {
          position: absolute;
          left: 36%;
          top: 0;
          width: 76px;
          height: 28px;
          background: #ffffff;
          transform: skewX(-39deg);
        }

        .registration-sheet__header {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 1fr 110px;
          gap: 24px;
          align-items: start;
        }

        .registration-sheet__content {
          position: relative;
          z-index: 1;
          display: flex;
          min-height: calc(297mm - 64mm - 1in);
          flex-direction: column;
          padding-bottom: 34mm;
        }

        .registration-sheet__sections {
          display: flex;
          flex: 1;
          flex-direction: column;
          justify-content: space-evenly;
          min-height: 118mm;
        }

        .registration-sheet__brand {
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .registration-sheet__mark {
          display: grid;
          width: 56px;
          height: 56px;
          place-items: center;
          border: 4px solid #84c63a;
          border-radius: 18px 18px 26px 26px;
          color: #84c63a;
          font-size: 30px;
          font-weight: 800;
          line-height: 1;
        }

        .registration-sheet__brand-name {
          margin: 0;
          font-size: 13px;
          font-weight: 800;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .registration-sheet__brand-subtitle {
          margin: 2px 0 0;
          max-width: 220px;
          color: #4b5563;
          font-size: 9px;
          font-weight: 700;
          line-height: 1.3;
          text-transform: uppercase;
        }

        .registration-sheet__photo {
          width: 74px;
          height: 84px;
          justify-self: end;
          border: 2px dashed #111827;
          background: #f8fafc;
          object-fit: cover;
        }

        .registration-sheet__title {
          margin: 18px 0 10px;
          font-size: 28px;
          font-weight: 900;
          letter-spacing: 0;
          line-height: 1;
          text-align: center;
          text-transform: uppercase;
        }

        .registration-sheet__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 16px;
        }

        .registration-sheet__line {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: end;
          gap: 4px;
          min-height: 23px;
          font-size: 11px;
          break-inside: avoid;
        }

        .registration-sheet__line--wide {
          grid-column: 1 / -1;
        }

        .registration-sheet__label {
          font-weight: 700;
          white-space: nowrap;
        }

        .registration-sheet__check-row {
          display: flex;
          grid-column: 1 / -1;
          align-items: flex-start;
          gap: 7px;
          min-height: 18px;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.35;
        }

        .registration-sheet__checkbox {
          display: inline-grid;
          width: 11px;
          height: 11px;
          margin-top: 1px;
          flex: 0 0 auto;
          place-items: center;
          border: 1px solid #111827;
          font-size: 8px;
          font-weight: 900;
          line-height: 1;
        }

        .registration-sheet__value {
          min-height: 17px;
          overflow-wrap: anywhere;
          border-bottom: 1px solid #5f6368;
          font-weight: 600;
          line-height: 1.25;
        }

        .registration-sheet__note {
          margin: 8mm 0 0;
          color: #202124;
          font-size: 8.8px;
          font-weight: 600;
          line-height: 1.35;
          text-align: justify;
        }

        .registration-sheet__signatures {
          position: absolute;
          right: 12mm;
          bottom: 22mm;
          left: 12mm;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 130px;
          margin: 0;
          z-index: 1;
        }

        .registration-sheet__signature {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr);
          align-items: end;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
        }

        .registration-sheet__rule {
          border-top: 1px dashed #555;
          margin: 14px 0 10px;
        }

        .registration-sheet__section-title {
          margin: 12px 0 7px;
          font-size: 12px;
          font-weight: 900;
          text-align: center;
          text-transform: uppercase;
        }

        .registration-sheet__compact {
          gap: 5px 16px;
        }

        .registration-sheet__compact .registration-sheet__line {
          min-height: 20px;
          font-size: 10px;
        }

        .registration-sheet__footer {
          position: absolute;
          right: 12mm;
          bottom: 9mm;
          left: 12mm;
          display: flex;
          justify-content: space-between;
          color: #4b5563;
          font-size: 8px;
          font-weight: 700;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
            width: calc(210mm - 1in);
            height: calc(297mm - 1in - 3mm);
            margin: 0 !important;
            overflow: hidden !important;
          }
          body * {
            visibility: hidden;
          }
          #registration-print-area,
          #registration-print-area * {
            visibility: visible;
          }
          #registration-print-area {
            position: absolute;
            inset: 0;
            width: calc(210mm - 1in);
            height: calc(297mm - 1in - 3mm);
            overflow: hidden;
            padding: 0;
            page-break-after: avoid;
            page-break-inside: avoid;
            break-after: avoid;
            break-inside: avoid;
          }
          .no-print {
            display: none !important;
          }
          .registration-sheet {
            display: block;
            width: calc(210mm - 1in);
            height: calc(297mm - 1in - 3mm);
            overflow: hidden;
          }
          .registration-sheet__page {
            width: calc(210mm - 1in);
            height: calc(297mm - 1in - 3mm);
            min-height: calc(297mm - 1in - 3mm);
            border: 0;
            box-shadow: none;
            overflow: hidden;
            page-break-after: avoid;
            page-break-inside: avoid;
            break-after: avoid;
            break-inside: avoid;
          }
        }

        @media screen and (max-width: 720px) {
          .registration-sheet__page {
            min-height: auto;
            padding: 44px 22px 36px;
          }
          .registration-sheet__header {
            grid-template-columns: 1fr 82px;
          }
          .registration-sheet__photo {
            width: 66px;
            height: 76px;
          }
          .registration-sheet__title {
            font-size: 22px;
          }
          .registration-sheet__grid,
          .registration-sheet__signatures {
            grid-template-columns: 1fr;
          }
          .registration-sheet__signatures {
            gap: 18px;
          }
          .registration-sheet__footer {
            position: static;
            margin-top: 18px;
          }
        }
      `}</style>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-primary">Registration</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">View Registration Form</h1>
          <p className="mt-2 text-sm text-muted-foreground">This view and PDF download always use your current approved registration data.</p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PDF
          </Button>
          {correctionFields.length ? (
            <Button type="button" onClick={startEditing} disabled={editing}>
              <Edit3 className="h-4 w-4" aria-hidden="true" />
              {editing ? "Editing Registration" : "Request Correction"}
            </Button>
          ) : null}
        </div>
      </div>

      {notice ? <div className="no-print rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div> : null}
      {formError ? <div className="no-print rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{formError}</div> : null}

      {editing ? (
        <Card className="no-print">
          <CardHeader className="pb-3">
            <CardTitle>Correction note</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="grid gap-1 text-sm">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="rounded-md border bg-background px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2"
                placeholder="Explain what needs to be corrected. Changed fields below will be submitted for admin approval."
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={submitCorrections} disabled={saving}>
                <Save className="h-4 w-4" aria-hidden="true" />
                {saving ? "Submitting..." : "Submit for Approval"}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditing(false)} disabled={saving}>
                <X className="h-4 w-4" aria-hidden="true" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {data.sections.length ? (
        <div className="no-print space-y-4">
          {data.sections.map((section) => (
            <Card key={section.id}>
              <CardHeader>
                <CardTitle>{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm md:grid-cols-2">
                {section.fields.map((field) => (
                  <RegistrationFieldCard
                    key={field.id}
                    draft={draft[field.key] ?? ""}
                    editing={editing}
                    field={field}
                    onChange={(value) => setDraft((current) => ({ ...current, [field.key]: value }))}
                  />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <MemberEmpty title="No registration values available" body="No member-visible dynamic registration fields are available for your membership record." />
      )}

      {data.sections.length ? (
        <div id="registration-print-area" className="registration-sheet">
          <div className="registration-sheet__page">
            <div className="registration-sheet__slant" aria-hidden="true" />
            <div className="registration-sheet__accent" aria-hidden="true" />
            <div className="registration-sheet__header">
              <div className="registration-sheet__brand">
                <div className="registration-sheet__mark">S</div>
                <div>
                  <p className="registration-sheet__brand-name">Sociology Alumni Association</p>
                  <p className="registration-sheet__brand-subtitle">Shahjalal University of Science & Technology</p>
                </div>
              </div>
              {profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="registration-sheet__photo" src={profilePhotoUrl} alt="Applicant" />
              ) : (
                <div className="registration-sheet__photo" aria-label="Applicant photo placeholder" />
              )}
            </div>

            <div className="registration-sheet__content">
              <h2 className="registration-sheet__title">Registration Form</h2>

              <div className="registration-sheet__sections">
                {printableSections.map((section) => (
                  <div key={section.id}>
                    <h3 className="registration-sheet__section-title">{section.title}</h3>
                    <div className="registration-sheet__grid registration-sheet__compact">
                      {isDeclarationSection(section.title) ? (
                        <PrintDeclarationFields fields={section.fields} />
                      ) : (
                        section.fields.map((field) => (
                          <PrintLine key={field.id} field={field} wide={isLongPrintField(field.label, field.value)} />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="registration-sheet__note">
                I hereby declare that the information provided in this registration form is true and correct to the best of my knowledge. I agree to follow the rules, decisions and membership guidelines of the association.
              </p>

              <div className="registration-sheet__signatures">
                <div className="registration-sheet__signature">
                  <span>Applicant:</span>
                  <span className="registration-sheet__value" />
                </div>
                <div className="registration-sheet__signature">
                  <span>Authorized by:</span>
                  <span className="registration-sheet__value" />
                </div>
              </div>
            </div>

            <div className="registration-sheet__footer">
              <span>Generated from member portal</span>
              <span>Member ID: {data.memberId || "-"}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type PrintableField = MemberRegistrationData["sections"][number]["fields"][number];

function RegistrationFieldCard({
  draft,
  editing,
  field,
  onChange
}: {
  draft: unknown;
  editing: boolean;
  field: PrintableField;
  onChange: (value: unknown) => void;
}) {
  const wide = field.type === "textarea" || isFileField(field.type) || isLongPrintField(field.label, field.value);

  if (editing && !isFileField(field.type)) {
    return (
      <label className={`grid gap-2 text-sm ${wide ? "md:col-span-2" : ""}`}>
        <span className="font-medium">
          {field.label}
          {field.required ? <span className="text-red-600"> *</span> : null}
        </span>
        {field.helpText ? <span className="text-xs text-muted-foreground">{field.helpText}</span> : null}
        <EditableRegistrationInput field={field} value={draft} onChange={onChange} />
      </label>
    );
  }

  return (
    <div className={`rounded-md border ${editing && isFileField(field.type) ? "border-dashed bg-background p-4" : "p-3"} ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <div className={editing && isFileField(field.type) ? "text-sm font-medium" : "text-xs text-muted-foreground"}>
          {field.label}
          {field.required ? <span className="text-red-600"> *</span> : null}
        </div>
      </div>
      {field.helpText && editing && isFileField(field.type) ? <div className="mt-1 text-xs text-muted-foreground">{field.helpText}</div> : null}
      <div className="mt-2 break-words text-sm font-medium">{valueLabel(field.value, field.fileName)}</div>
      {editing && isFileField(field.type) ? (
        <div className="mt-2 text-xs text-muted-foreground">File changes need to be requested in the correction note.</div>
      ) : null}
    </div>
  );
}

function EditableRegistrationInput({
  field,
  onChange,
  value
}: {
  field: PrintableField;
  onChange: (value: unknown) => void;
  value: unknown;
}) {
  const inputClass = "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-primary/20 focus:ring-2";
  const normalized = `${field.key} ${field.label}`.toLowerCase();
  const stringValue = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const options = fieldOptions(field);

  if (field.type === "date") {
    return (
      <input
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 ${inputClass}`}
        type="date"
      />
    );
  }

  if (field.type === "textarea" || normalized.includes("address")) {
    return (
      <textarea
        value={stringValue}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className={inputClass}
        placeholder={field.placeholder ?? undefined}
      />
    );
  }

  if (field.type === "dropdown") {
    return (
      <select value={stringValue} onChange={(event) => onChange(event.target.value)} className={`h-10 ${inputClass}`}>
        <option value="">{field.placeholder ?? `Select ${field.label.toLowerCase()}`}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "radio") {
    return (
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
              stringValue === option.value ? "border-primary bg-primary/10 text-primary" : "bg-background"
            }`}
          >
            <input
              type="radio"
              name={field.key}
              value={option.value}
              checked={stringValue === option.value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    const selected = Array.isArray(value) ? value.map(String) : stringValue ? [stringValue] : [];
    return (
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.value} className="flex min-h-10 cursor-pointer items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-medium">
            <input
              type="checkbox"
              value={option.value}
              checked={selected.includes(option.value)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, option.value]
                    : selected.filter((item) => item !== option.value)
                )
              }
            />
            {option.label}
          </label>
        ))}
      </div>
    );
  }

  return (
    <input
      value={stringValue}
      onChange={(event) => onChange(event.target.value)}
      className={`h-10 ${inputClass}`}
      type={field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "number" ? "number" : "text"}
      placeholder={field.placeholder ?? undefined}
    />
  );
}

function PrintDeclarationFields({ fields }: { fields: PrintableField[] }) {
  const signatureFields = fields.filter((field) => `${field.key} ${field.label}`.toLowerCase().includes("signature"));
  const consentFields = fields.filter((field) => !signatureFields.includes(field));

  return (
    <>
      {consentFields.map((field) => (
        <div key={field.id} className="registration-sheet__check-row">
          <span className="registration-sheet__checkbox">{hasPrintableValue(field) ? "X" : ""}</span>
          <span>{declarationText(field)}</span>
        </div>
      ))}
      {signatureFields.map((field) => (
        <PrintLine key={field.id} field={field} wide />
      ))}
    </>
  );
}

function PrintLine({
  field,
  wide = false
}: {
  field: PrintableField;
  wide?: boolean;
}) {
  return (
    <div className={`registration-sheet__line ${wide ? "registration-sheet__line--wide" : ""}`}>
      <span className="registration-sheet__label">{field.label}:</span>
      <span className="registration-sheet__value">{valueLabel(field.value, field.fileName)}</span>
    </div>
  );
}

function isDeclarationSection(title: string) {
  return title.toLowerCase().includes("declaration");
}

function declarationText(field: PrintableField) {
  const text = `${field.key} ${field.label}`.toLowerCase();
  if (text.includes("contact")) {
    return "I agree to be contacted by the alumni association for membership communication.";
  }
  return "I confirm that the information provided in this registration form is true and correct to the best of my knowledge.";
}

function isLongPrintField(label: string, value: unknown) {
  const text = valueLabel(value, null);
  return label.length > 28 || text.length > 42 || Array.isArray(value) || typeof value === "object";
}
