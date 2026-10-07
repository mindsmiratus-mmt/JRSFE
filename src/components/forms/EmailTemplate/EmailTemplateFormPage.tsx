// components/forms/EmailTemplate/EmailTemplateFormPage.tsx — create / edit one Email Template Master row (Admin only)
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Loader2, Mail, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/ui/PageHeader";
import { toast } from "@/components/ui/toast";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";
import {
  useCreateEmailTemplate,
  useEmailTemplate,
  useEmailUseFor,
  usePreviewEmailTemplate,
  useUpdateEmailTemplate,
  type EmailTemplate,
  type EmailTemplateParameter,
  type EmailTemplatePreview,
} from "@/hooks/useEmailTemplate";
import { apiErrors, apiStatus, insertAtSelection, tokenFor, unselectedTokens, wrapInBlock } from "@/utils/emailTemplate";
import { EmailPreviewDialog } from "./EmailPreviewDialog";

type Field = "subject" | "html";

export const EmailTemplateFormPage = () => {
  const { key } = useParams<{ key?: string }>();
  const isEdit = !!key;
  /** New template prefilled from an existing one (list → Duplicate). */
  const [searchParams] = useSearchParams();
  const duplicateOf = isEdit ? null : searchParams.get("from");
  const navigate = useNavigate();
  const { permissions, user } = useAuth();
  const { isAdmin } = getModulePermissions(permissions, user, "Email Templates");

  const { data: template, isLoading, refetch } = useEmailTemplate(isEdit ? key! : duplicateOf);
  const { data: useFors = [], isLoading: useForLoading } = useEmailUseFor();
  const create = useCreateEmailTemplate();
  const update = useUpdateEmailTemplate(key ?? "");
  const preview = usePreviewEmailTemplate();

  const [templateKey, setTemplateKey] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [useFor, setUseFor] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [version, setVersion] = useState(1);
  /** Selected parameters → their per-template Required flag. Not selected = not in ParameterJson. */
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [conflict, setConflict] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<EmailTemplatePreview | null>(null);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [lastField, setLastField] = useState<Field>("html");
  const subjectRef = useRef<HTMLInputElement>(null);
  const htmlRef = useRef<HTMLTextAreaElement>(null);

  const load = (t: EmailTemplate) => {
    setTemplateKey(t.templateKey);
    setTemplateName(t.templateName);
    setUseFor(t.useFor);
    setMailSubject(t.mailSubject);
    setHtmlBody(t.htmlBody);
    setIsActive(t.isActive);
    setVersion(t.version);
    setSelected(Object.fromEntries(t.parameters.map((p) => [p.name, p.required])));
    setErrors([]);
    setConflict(false);
  };

  useEffect(() => {
    if (!template) return;
    load(template);
    if (!isEdit) {
      // Duplicate: a new, inactive template with the same content; key and name are edited before saving.
      setTemplateKey(`${template.templateKey}Copy`.slice(0, 64));
      setTemplateName(`${template.templateName} - Copy`);
      setIsActive(false);
      setVersion(1);
    }
  }, [template, isEdit]);

  useEffect(() => {
    if (!isEdit && !useFor && useFors.length > 0) setUseFor(useFors[0].key);
  }, [isEdit, useFor, useFors]);

  const registry = useMemo(() => useFors.find((u) => u.key === useFor), [useFors, useFor]);
  const parameters: EmailTemplateParameter[] = (registry?.parameters ?? [])
    .filter((p) => p.name in selected)
    .map((p) => ({ name: p.name, type: p.type, required: selected[p.name] }));

  /** Tokens still in Subject/HTML whose parameter is not selected — Save is blocked; tokens are never removed silently. */
  const strayTokens = unselectedTokens(`${mailSubject}\n${htmlBody}`, (registry?.parameters ?? []).map((p) => p.name),
    new Set(Object.keys(selected)));

  const toggleUse = (name: string) =>
    setSelected((s) => {
      const next = { ...s };
      if (name in next) delete next[name];
      else next[name] = false; // required is a deliberate per-template choice — never defaulted to true
      return next;
    });

  const setRequired = (name: string, required: boolean) => setSelected((s) => ({ ...s, [name]: required }));

  /** Inserts at the caret of the field last focused (subject or HTML). */
  const insert = (build: (text: string, start: number, end: number) => { text: string; caret: number }) => {
    const element = lastField === "subject" ? subjectRef.current : htmlRef.current;
    const value = lastField === "subject" ? mailSubject : htmlBody;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? value.length;
    const result = build(value, start, end);
    if (lastField === "subject") setMailSubject(result.text);
    else setHtmlBody(result.text);
    requestAnimationFrame(() => {
      element?.focus();
      element?.setSelectionRange(result.caret, result.caret);
    });
  };

  const save = async () => {
    setErrors([]);
    setConflict(false);
    if (strayTokens.length > 0) {
      setErrors(strayTokens.map((n) =>
        `${tokenFor(n)} is still used in the Subject or HTML, but ${n} is not a selected parameter. Select ${n} under Parameters, or remove its token.`));
      return;
    }
    const input ={ templateName, mailSubject, htmlBody, parameters, isActive };
    try {
      if (isEdit) {
        const saved = await update.mutateAsync({ ...input, version });
        load(saved);
        toast.success(`Saved ${saved.templateKey} (v${saved.version})`);
      } else {
        const saved = await create.mutateAsync({ ...input, templateKey: templateKey.trim(), useFor });
        toast.success(`Created ${saved.templateKey}`);
        navigate(`/admin/email-templates/edit/${encodeURIComponent(saved.templateKey)}`, { replace: true });
      }
    } catch (error) {
      if (isEdit && apiStatus(error) === 409) setConflict(true);
      setErrors(apiErrors(error));
    }
  };

  /** Previews the current form values — saving first is not needed. */
  const runPreview = async () => {
    setPreviewResult(null);
    setPreviewErrors([]);
    setPreviewOpen(true);
    try {
      setPreviewResult(await preview.mutateAsync({ useFor, mailSubject, htmlBody, parameters }));
    } catch (error) {
      setPreviewErrors(apiErrors(error));
    }
  };

  if (!isAdmin) return <div className="p-6 text-gray-600">Email templates can only be managed by an administrator.</div>;

  if (((isEdit || duplicateOf) && isLoading) || useForLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isEdit && !template) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-xl text-gray-600">Email template not found</p>
        <Button onClick={() => navigate("/admin/email-templates")}>Back to Email Templates</Button>
      </div>
    );
  }

  const saving = create.isPending || update.isPending;
  const deactivatingActive = isEdit && template?.isActive && !isActive;

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        title={isEdit ? `Edit Email Template - ${template?.templateName}` : "New Email Template"}
        subtitle={isEdit ? `${templateKey} · v${version}`
          : template ? `Duplicate of ${template.templateKey} — inactive until you switch it on. Change the key and name, preview, then save.`
          : "Created inactive unless you switch it on. Preview, save, then activate."}
        icon={<Mail className="w-7 h-7 text-[#b08d28]" />}
        onBack={() => navigate("/admin/email-templates")}
        rightActions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={runPreview} disabled={!useFor || preview.isPending}
              title="Render the current (unsaved) content with sample values — never sends">
              <Eye className="mr-1 h-4 w-4" /> Preview
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Save className="mr-1 h-4 w-4" />} Save
            </Button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {errors.length > 0 && (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <ul className="list-disc pl-5 space-y-1">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
            {conflict && (
              <Button variant="outline" size="sm" className="mt-3" onClick={async () => { const r = await refetch(); if (r.data) load(r.data); }}>
                Reload the latest version (your unsaved changes are discarded)
              </Button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Details + parameters */}
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-lg border bg-white p-5 space-y-4">
              <div className="space-y-1">
                <Label htmlFor="templateKey">Template Key</Label>
                <Input id="templateKey" value={templateKey} disabled={isEdit} placeholder="e.g. CustomerWelcomeV2"
                  onChange={(e) => setTemplateKey(e.target.value)} />
                <p className="text-xs text-gray-500">Stable identity; letters, digits, underscore. Cannot be changed later.</p>
              </div>
              <div className="space-y-1">
                <Label htmlFor="templateName">Template Name</Label>
                <Input id="templateName" value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="useFor">Use For</Label>
                <select id="useFor" value={useFor} disabled={isEdit}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm disabled:opacity-60"
                  onChange={(e) => { setUseFor(e.target.value); setSelected({}); }}>
                  {useFors.map((u) => <option key={u.key} value={u.key}>{u.displayName} ({u.key})</option>)}
                </select>
                <p className="text-xs text-gray-500">The business event that sends this email. Fixed after creation.</p>
              </div>
              <div className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div>
                  <Label htmlFor="isActive">Active</Label>
                  <p className="text-xs text-gray-500">Activating replaces the currently active template for this Use For.</p>
                  {deactivatingActive && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      With no active template, this email is not sent at all.
                    </p>
                  )}
                </div>
                <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </div>

            <div className="rounded-lg border bg-white p-5">
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <h3 className="font-semibold text-gray-800">Parameters</h3>
                <span className="text-xs text-gray-600">
                  {parameters.length} selected of {registry?.parameters.length ?? 0} available
                </span>
              </div>
              <p className="mb-3 text-xs text-gray-500">
                Supplied by the application for this Use For. Select the ones this template uses and decide, for each, whether
                it is required (missing required value → the email is not sent). Optional values belong in a block
                <code className="mx-1">{"{{#Name}}…{{/Name}}"}</code>that disappears when the value is absent; an optional
                link must be used inside its block.
              </p>
              {strayTokens.length > 0 && (
                <div className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                  Still used in the Subject/HTML but not selected: {strayTokens.map(tokenFor).join(", ")}. Select the
                  parameter again or remove its token — Save is blocked until then.
                </div>
              )}
              <div className="space-y-3">
                {(registry?.parameters ?? []).map((p) => {
                  const used = p.name in selected;
                  const required = !!selected[p.name];
                  return (
                    <div key={p.name} className={`rounded-md border p-3 ${used ? "" : "bg-gray-50"}`}>
                      <div className="flex items-center justify-between gap-2">
                        <label className={`flex items-center gap-2 text-sm font-medium ${used ? "" : "text-gray-500"}`}>
                          <input type="checkbox" checked={used} onChange={() => toggleUse(p.name)} />
                          {p.name}
                          <span className="rounded bg-gray-100 px-1.5 text-xs font-normal text-gray-600">{p.type}</span>
                        </label>
                        {used && (
                          <label className="flex items-center gap-1 text-xs">
                            <input type="checkbox" checked={required} onChange={(e) => setRequired(p.name, e.target.checked)} />
                            Required
                          </label>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{p.description}</p>
                      {used && (
                        <div className="mt-2 flex gap-2">
                          <Button type="button" size="sm" variant="outline" disabled={!required && p.type === "url"}
                            title={!required && p.type === "url" ? "An optional link must be inserted inside its block" : `Insert ${tokenFor(p.name)}`}
                            onClick={() => insert((t, s, e) => insertAtSelection(t, s, e, tokenFor(p.name)))}>
                            Insert {tokenFor(p.name)}
                          </Button>
                          {!required && (
                            <Button type="button" size="sm" variant="outline"
                              title="Wrap the selection in a block shown only when this value is present"
                              onClick={() => insert((t, s, e) => wrapInBlock(t, s, e, p.name, p.type))}>
                              Insert optional block
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-lg border bg-white p-5 space-y-4">
              <div className="space-y-1">
                <Label htmlFor="mailSubject">Subject</Label>
                <Input id="mailSubject" ref={subjectRef} value={mailSubject} onFocus={() => setLastField("subject")}
                  onChange={(e) => setMailSubject(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="htmlBody">HTML content</Label>
                <Textarea id="htmlBody" ref={htmlRef} value={htmlBody} spellCheck={false} onFocus={() => setLastField("html")}
                  onChange={(e) => setHtmlBody(e.target.value)} className="min-h-[480px] resize-y font-mono text-xs" />
                <p className="text-xs text-gray-500">
                  The content placed inside the shared brand frame (logo header and store footer are added automatically).
                  Only <code>{"{{Name}}"}</code> tokens of the selected parameters are allowed — no scripts or expressions are executed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EmailPreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} loading={preview.isPending}
        preview={previewResult} errors={previewErrors} />
    </div>
  );
};
