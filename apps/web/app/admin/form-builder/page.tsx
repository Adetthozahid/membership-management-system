"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { FormFieldSummary, FormFieldType, FormSectionSummary, FormSummary } from "@mms/shared";
import { ArrowDown, ArrowUp, FileText, Layers3, Plus, Save, Trash2, X } from "lucide-react";
import { apiRequest } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const fieldTypes: FormFieldType[] = [
  "text",
  "textarea",
  "number",
  "date",
  "email",
  "phone",
  "dropdown",
  "radio",
  "checkbox",
  "file",
  "image",
  "document"
];

const optionFieldTypes: FormFieldType[] = ["dropdown", "radio", "checkbox"];
const fileFieldTypes: FormFieldType[] = ["file", "image", "document"];

const emptyField = {
  sectionId: "",
  label: "",
  key: "",
  placeholder: "",
  helpText: "",
  type: "text" as FormFieldType,
  required: false,
  publicVisible: true,
  memberEditable: false,
  adminOnly: false,
  membershipTypeSpecific: false,
  membershipTypeIds: [] as string[],
  validationRules: {} as Record<string, unknown>,
  options: [] as Array<{ label: string; value: string }>,
  sortOrder: 0,
  active: true
};

const inputClass = "h-10 w-full rounded-md border bg-background px-3 text-sm";
const textareaClass = "w-full rounded-md border bg-background px-3 py-2 text-sm";
const labelClass = "space-y-1.5 text-sm font-medium";
const hintClass = "text-xs font-normal text-muted-foreground";

function toFieldKey(label: string) {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function fieldTypeLabel(type: FormFieldType) {
  return type.replace("_", " ");
}

function StatusPill({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border bg-muted px-2 py-0.5 text-xs text-muted-foreground">{children}</span>;
}

export default function FormBuilderPage() {
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [selectedFormCode, setSelectedFormCode] = useState("registration");
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [sections, setSections] = useState<FormSectionSummary[]>([]);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionDescription, setSectionDescription] = useState("");
  const [field, setField] = useState(emptyField);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldKeyEdited, setFieldKeyEdited] = useState(false);
  const [optionsText, setOptionsText] = useState("");
  const [rulesText, setRulesText] = useState("{}");
  const [error, setError] = useState<string | null>(null);

  const selectedForm = forms.find((item) => item.code === selectedFormCode);
  const totalFields = useMemo(() => sections.reduce((count, section) => count + section.fields.length, 0), [sections]);
  const usesOptions = optionFieldTypes.includes(field.type);
  const usesUploadRules = fileFieldTypes.includes(field.type);

  const load = useCallback(async () => {
    const [formsData, data] = await Promise.all([
      apiRequest<FormSummary[]>("/form-builder/forms"),
      apiRequest<FormSectionSummary[]>(`/form-builder/sections?formCode=${encodeURIComponent(selectedFormCode)}`)
    ]);
    setForms(formsData);
    setSections(data);
    if (data[0]) {
      setField((current) => (data.some((section) => section.id === current.sectionId) ? current : { ...current, sectionId: data[0].id }));
    } else {
      setField((current) => ({ ...current, sectionId: "" }));
    }
  }, [selectedFormCode]);

  useEffect(() => {
    void load().catch(() => setError("Could not load form builder."));
  }, [load]);

  async function createSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const activeForm = forms.find((item) => item.code === selectedFormCode);
    await apiRequest<FormSectionSummary>("/form-builder/sections", {
      method: "POST",
      body: JSON.stringify({
        formId: activeForm?.id,
        title: sectionTitle,
        description: sectionDescription,
        sortOrder: sections.length,
        active: true
      })
    }).catch(() => setError("Could not save section."));
    setSectionTitle("");
    setSectionDescription("");
    await load();
  }

  async function createForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const normalizedCode = toFieldKey(formCode || formName);
    const created = await apiRequest<FormSummary>("/form-builder/forms", {
      method: "POST",
      body: JSON.stringify({
        name: formName,
        code: normalizedCode,
        description: formDescription,
        active: true
      })
    }).catch(() => {
      setError("Could not save form. Use a unique form code.");
      return null;
    });
    if (!created) return;
    setFormName("");
    setFormCode("");
    setFormDescription("");
    setSelectedFormCode(created.code);
  }

  async function saveField(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    let parsedRules: Record<string, unknown> = {};
    try {
      parsedRules = rulesText.trim() ? JSON.parse(rulesText) : {};
    } catch {
      setError("Validation rules must be valid JSON.");
      return;
    }

    const parsedOptions = optionsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, value] = line.includes("|") ? line.split("|") : [line, line];
        return { label: label.trim(), value: value.trim() };
      });

    const payload = {
      ...field,
      validationRules: parsedRules,
      options: usesOptions ? parsedOptions : []
    };

    await apiRequest<FormFieldSummary>(editingFieldId ? `/form-builder/fields/${editingFieldId}` : "/form-builder/fields", {
      method: editingFieldId ? "PATCH" : "POST",
      body: JSON.stringify(payload)
    }).catch(() => setError("Could not save field."));
    setEditingFieldId(null);
    setField((current) => ({ ...emptyField, sectionId: current.sectionId }));
    setFieldKeyEdited(false);
    setOptionsText("");
    setRulesText("{}");
    await load();
  }

  async function moveSection(section: FormSectionSummary, direction: -1 | 1) {
    const ordered = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((item) => item.id === section.id);
    const swap = ordered[index + direction];
    if (!swap) return;
    [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    await apiRequest<FormSectionSummary[]>("/form-builder/sections/reorder", {
      method: "POST",
      body: JSON.stringify({ items: ordered.map((item, sortOrder) => ({ id: item.id, sortOrder })) })
    });
    await load();
  }

  async function moveField(section: FormSectionSummary, item: FormFieldSummary, direction: -1 | 1) {
    const ordered = [...section.fields].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex((fieldItem) => fieldItem.id === item.id);
    const swap = ordered[index + direction];
    if (!swap) return;
    [ordered[index], ordered[index + direction]] = [ordered[index + direction], ordered[index]];
    await apiRequest<FormSectionSummary[]>(`/form-builder/sections/${section.id}/fields/reorder`, {
      method: "POST",
      body: JSON.stringify({ items: ordered.map((fieldItem, sortOrder) => ({ id: fieldItem.id, sortOrder })) })
    });
    await load();
  }

  async function deleteSection(section: FormSectionSummary) {
    if (!window.confirm(`Hide section "${section.title}"?`)) return;
    await apiRequest<FormSectionSummary>(`/form-builder/sections/${section.id}`, { method: "DELETE" }).catch(() => setError("Could not delete section."));
    await load();
  }

  async function deleteField(item: FormFieldSummary) {
    if (!window.confirm(`Hide field "${item.label}"?`)) return;
    await apiRequest<FormFieldSummary>(`/form-builder/fields/${item.id}`, { method: "DELETE" }).catch(() => setError("Could not delete field."));
    if (editingFieldId === item.id) resetFieldForm();
    await load();
  }

  function resetFieldForm() {
    setEditingFieldId(null);
    setField((current) => ({ ...emptyField, sectionId: current.sectionId || sections[0]?.id || "" }));
    setFieldKeyEdited(false);
    setOptionsText("");
    setRulesText("{}");
    setError(null);
  }

  function editField(item: FormFieldSummary) {
    setEditingFieldId(item.id);
    setFieldKeyEdited(true);
    setField({
      sectionId: item.sectionId,
      label: item.label,
      key: item.key,
      placeholder: item.placeholder ?? "",
      helpText: item.helpText ?? "",
      type: item.type,
      required: item.required,
      publicVisible: item.publicVisible,
      memberEditable: item.memberEditable,
      adminOnly: item.adminOnly,
      membershipTypeSpecific: item.membershipTypeSpecific,
      membershipTypeIds: item.membershipTypeIds ?? [],
      validationRules: item.validationRules ?? {},
      options: item.options ?? [],
      sortOrder: item.sortOrder,
      active: item.active
    });
    setOptionsText((item.options ?? []).map((option) => `${option.label}|${option.value}`).join("\n"));
    setRulesText(JSON.stringify(item.validationRules ?? {}, null, 2));
  }

  function updateFieldLabel(label: string) {
    setField((current) => ({
      ...current,
      label,
      key: editingFieldId || fieldKeyEdited ? current.key : toFieldKey(label)
    }));
  }

  function updateFormName(name: string) {
    setFormName(name);
    if (!formCode) setFormCode(toFieldKey(name));
  }

  function switchForm(code: string) {
    setSelectedFormCode(code);
    setEditingFieldId(null);
    setFieldKeyEdited(false);
    setField(emptyField);
    setOptionsText("");
    setRulesText("{}");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Form builder</p>
          <h1 className="text-2xl font-semibold">{selectedForm?.name ?? "Registration"}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusPill>code: {selectedForm?.code ?? selectedFormCode}</StatusPill>
            <StatusPill>{sections.length} sections</StatusPill>
            <StatusPill>{totalFields} fields</StatusPill>
            {selectedForm?.system ? <StatusPill>required</StatusPill> : null}
          </div>
        </div>
        <label className={labelClass}>
          Active form
          <select className={inputClass} value={selectedFormCode} onChange={(event) => switchForm(event.target.value)}>
            {forms.map((form) => (
              <option key={form.id} value={form.code}>
                {form.name}
                {form.code === "registration" ? " (required)" : ""}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="flex flex-col gap-6 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <Card className="order-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4" aria-hidden="true" />
                Reusable Forms
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={createForm}>
                <label className={labelClass}>
                  Name
                  <input className={inputClass} placeholder="Event registration" value={formName} onChange={(event) => updateFormName(event.target.value)} required />
                </label>
                <label className={labelClass}>
                  Code
                  <input className={inputClass} placeholder="event_registration" value={formCode} onChange={(event) => setFormCode(toFieldKey(event.target.value))} required />
                </label>
                <label className={labelClass}>
                  Description
                  <textarea className={`${textareaClass} min-h-16`} value={formDescription} onChange={(event) => setFormDescription(event.target.value)} />
                </label>
                <Button className="w-full" type="submit" variant="outline">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add form
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="order-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers3 className="h-4 w-4" aria-hidden="true" />
                Section
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={createSection}>
                <label className={labelClass}>
                  Title
                  <input className={inputClass} placeholder="Personal information" value={sectionTitle} onChange={(event) => setSectionTitle(event.target.value)} required />
                </label>
                <label className={labelClass}>
                  Description
                  <textarea className={`${textareaClass} min-h-20`} value={sectionDescription} onChange={(event) => setSectionDescription(event.target.value)} />
                </label>
                <Button className="w-full" type="submit">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add section
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="order-1">
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>{editingFieldId ? "Edit Field" : "New Field"}</CardTitle>
              {editingFieldId ? (
                <Button type="button" variant="outline" size="sm" onClick={resetFieldForm}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  New
                </Button>
              ) : null}
            </CardHeader>
            <CardContent>
              <form className="space-y-4" onSubmit={saveField}>
                <label className={labelClass}>
                  Section
                  <select className={inputClass} value={field.sectionId} onChange={(event) => setField((current) => ({ ...current, sectionId: event.target.value }))} required>
                    <option value="">Choose section</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
                  <label className={labelClass}>
                    Label
                    <input className={inputClass} placeholder="Father name" value={field.label} onChange={(event) => updateFieldLabel(event.target.value)} required />
                  </label>
                  <label className={labelClass}>
                    Key name
                    <input
                      className={`${inputClass} font-mono`}
                      placeholder="father_name"
                      value={field.key}
                      onChange={(event) => {
                        setFieldKeyEdited(true);
                        setField((current) => ({ ...current, key: toFieldKey(event.target.value) }));
                      }}
                      required
                    />
                  </label>
                </div>

                <label className={labelClass}>
                  Field type
                  <select className={inputClass} value={field.type} onChange={(event) => setField((current) => ({ ...current, type: event.target.value as FormFieldType }))}>
                    {fieldTypes.map((type) => (
                      <option key={type} value={type}>
                        {fieldTypeLabel(type)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className={labelClass}>
                  Placeholder
                  <input className={inputClass} value={field.placeholder} onChange={(event) => setField((current) => ({ ...current, placeholder: event.target.value }))} />
                </label>

                <label className={labelClass}>
                  Help text
                  <textarea className={`${textareaClass} min-h-16`} value={field.helpText} onChange={(event) => setField((current) => ({ ...current, helpText: event.target.value }))} />
                </label>

                {usesOptions ? (
                  <label className={labelClass}>
                    Options
                    <span className={hintClass}>One per line, like Label|value</span>
                    <textarea className={`${textareaClass} min-h-28 font-mono text-xs`} placeholder={"Male|male\nFemale|female"} value={optionsText} onChange={(event) => setOptionsText(event.target.value)} />
                  </label>
                ) : null}

                <label className={labelClass}>
                  Validation JSON
                  <span className={hintClass}>{usesUploadRules ? "Example: { \"maxSizeMb\": 2 }" : "Example: { \"minLength\": 3 }"}</span>
                  <textarea className={`${textareaClass} min-h-24 font-mono text-xs`} value={rulesText} onChange={(event) => setRulesText(event.target.value)} />
                </label>

                <div className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
                  {[
                    ["required", "Required"],
                    ["publicVisible", "Public"],
                    ["memberEditable", "Member editable"],
                    ["adminOnly", "Admin only"],
                    ["membershipTypeSpecific", "Membership type specific"],
                    ["active", "Active"]
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={Boolean(field[key as keyof typeof field])} onChange={(event) => setField((current) => ({ ...current, [key]: event.target.checked }))} />
                      {label}
                    </label>
                  ))}
                </div>

                <Button className="w-full" type="submit" disabled={!sections.length}>
                  <Save className="h-4 w-4" aria-hidden="true" />
                  {editingFieldId ? "Update field" : "Create field"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {sections.length === 0 ? (
            <Card>
              <CardContent className="p-5">
                <div className="rounded-md border bg-muted p-4 text-sm text-muted-foreground">No sections yet.</div>
              </CardContent>
            </Card>
          ) : null}

          {sections.map((section) => (
            <Card key={section.id}>
              <CardHeader className="gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <CardTitle>{section.title}</CardTitle>
                  {section.description ? <p className="text-sm text-muted-foreground">{section.description}</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <StatusPill>{section.fields.length} fields</StatusPill>
                    {!section.active ? <StatusPill>inactive</StatusPill> : null}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="icon" onClick={() => moveSection(section, -1)} aria-label="Move section up">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => moveSection(section, 1)} aria-label="Move section down">
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" onClick={() => deleteSection(section)} aria-label="Delete section">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {section.fields.length === 0 ? (
                  <div className="rounded-md border bg-muted p-3 text-sm text-muted-foreground">No fields yet.</div>
                ) : (
                  section.fields.map((item) => (
                    <div key={item.id} className="grid gap-3 rounded-md border p-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{item.label}</span>
                          <StatusPill>{item.type}</StatusPill>
                          {item.required ? <StatusPill>required</StatusPill> : null}
                          {item.publicVisible ? <StatusPill>public</StatusPill> : <StatusPill>private</StatusPill>}
                          {!item.active ? <StatusPill>inactive</StatusPill> : null}
                        </div>
                        <div className="font-mono text-xs text-muted-foreground">{item.key}</div>
                        {item.options?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {item.options.map((option) => (
                              <span key={`${item.id}-${option.value}`} className="rounded border px-2 py-0.5 text-xs text-muted-foreground">
                                {option.label}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => moveField(section, item, -1)}>
                          Up
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => moveField(section, item, 1)}>
                          Down
                        </Button>
                        <Button type="button" size="sm" onClick={() => editField(item)}>
                          Edit
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => deleteField(item)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
