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
import { apiErrors, apiStatus, insertAtSelection, scanTokens, tokenFor, wrapInBlock } from "@/utils/emailTemplate";
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
  /**
   * Required flag chosen per parameter. Which parameters the template uses is NOT stored here — it is detected from the
   * Subject/HTML tokens. A flag is kept while its token is temporarily absent (e.g. mid-typing); only detected ones are sent.
   */
  const [required, setRequiredFlags] = useState<Record<string, boolean>>({});
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
    setRequiredFlags(Object.fromEntries(t.parameters.map((p) => [p.name, p.required])));
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
  const available = registry?.parameters ?? [];
  const tokens = scanTokens([mailSubject, htmlBody], available.map((p) => p.name));
  /** Detected parameters (registry order, registry type); a newly detected one is optional until marked Required. */
  const detected = available.filter((p) => tokens.used.includes(p.name));
  const parameters: EmailTemplateParameter[] = detected.map((p) => ({ name: p.name, type: p.type, required: !!required[p.name] }));
  const tokenProblems = [
    ...tokens.unknown.map((n) => `${n} is not available for this UseFor.`),
    ...tokens.malformed.map((t) => `Malformed token ${t} — use {{Name}}, {{#Name}} or {{/Name}} with no spaces.`),
  ];

  const setRequired = (name: string, value: boolean) => setRequiredFlags((r) => ({ ...r, [name]: value }));

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
    if (tokenProblems.length > 0) {
      setErrors(tokenProblems);
      return;
    }
    // JRS derives the parameter list from the content again; `parameters` carries the Required choices.
    const input = { templateName, mailSubject, htmlBody, parameters, isActive };
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
      <PageHeader fullWidth
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

      <div className="w-full p-4 sm:p-6 space-y-6">
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

        {/* Details */}
        <div className="grid grid-cols-1 gap-4 rounded-lg border bg-white p-5 md:grid-cols-2 xl:grid-cols-4">
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
              onChange={(e) => setUseFor(e.target.value)}>
              {useFors.map((u) => <option key={u.key} value={u.key}>{u.displayName} ({u.key})</option>)}
            </select>
            <p className="text-xs text-gray-500">The business event that sends this email. Fixed after creation.</p>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-md border p-3">
            <div>
              <Label htmlFor="isActive">Active</Label>
              <p className="text-xs text-gray-500">Activating replaces the currently active template for this Use For.</p>
              {deactivatingActive && (
                <p className="mt-1 text-xs font-medium text-amber-700">With no active template, this email is not sent at all.</p>
              )}
            </div>
            <Switch id="isActive" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        {/* Content */}
        <div className="rounded-lg border bg-white p-5 space-y-4">
          <div className="space-y-1">
            <Label htmlFor="mailSubject">Subject</Label>
            <Input id="mailSubject" ref={subjectRef} value={mailSubject} onFocus={() => setLastField("subject")}
              onChange={(e) => setMailSubject(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <Label htmlFor="htmlBody">HTML content</Label>
              <div className="flex flex-wrap gap-2">
                {/* Convenience only — loaded from the Use For registry; typing tokens by hand works the same. */}
                <select aria-label="Insert Parameter" value="" disabled={available.length === 0}
                  className="h-8 rounded-md border border-input bg-white px-2 text-sm"
                  onChange={(e) => {
                    const name = e.target.value;
                    if (name) insert((t, s, en) => insertAtSelection(t, s, en, tokenFor(name)));
                  }}>
                  <option value="">Insert Parameter…</option>
                  {available.map((p) => <option key={p.name} value={p.name}>{p.name} ({p.type})</option>)}
                </select>
                <select aria-label="Insert optional block" value="" disabled={available.length === 0}
                  className="h-8 rounded-md border border-input bg-white px-2 text-sm"
                  title="Wraps the selection in a block shown only when this value is present"
                  onChange={(e) => {
                    const p = available.find((x) => x.name === e.target.value);
                    if (p) insert((t, s, en) => wrapInBlock(t, s, en, p.name, p.type));
                  }}>
                  <option value="">Insert optional block…</option>
                  {available.map((p) => {
                    const requiredNow = !!required[p.name] && tokens.used.includes(p.name);
                    return (
                      <option key={p.name} value={p.name} disabled={requiredNow}>
                        {`{{#${p.name}}} … {{/${p.name}}}`}{requiredNow ? " (required — no block)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>
            <Textarea id="htmlBody" ref={htmlRef} value={htmlBody} spellCheck={false} onFocus={() => setLastField("html")}
              onChange={(e) => setHtmlBody(e.target.value)} className="min-h-[560px] resize-y font-mono text-xs" />
            <p className="text-xs text-gray-500">
              The content placed inside the shared brand frame (logo header and store footer are added automatically). Use
              <code className="mx-1">{"{{Name}}"}</code>for a value and<code className="mx-1">{"{{#Name}}…{{/Name}}"}</code>for a
              part shown only when an optional value is present (an optional link must be inside its block). No scripts or
              expressions are executed.
            </p>
          </div>
        </div>

        {/* Detected parameters — derived from the Subject/HTML tokens, never selected by hand */}
        <div className="rounded-lg border bg-white p-5">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-semibold text-gray-800">Detected Parameters: {detected.length}</h3>
            <span className="text-xs text-gray-600">{available.length} available for this Use For</span>
          </div>
          <p className="mb-3 text-xs text-gray-500">
            Detected automatically from the Subject and HTML: add a token and it appears, remove it and it disappears. Decide
            for each whether it is <strong>Required</strong> (a missing required value → the email is not sent). New
            parameters start optional.
          </p>
          {tokenProblems.length > 0 && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <ul className="list-disc pl-5 space-y-1">{tokenProblems.map((m) => <li key={m}>{m}</li>)}</ul>
              <p className="mt-1 text-xs">Save is blocked until these tokens are corrected or removed.</p>
            </div>
          )}
          {detected.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-gray-500">
              No parameters detected. Type a token such as <code>{"{{Name}}"}</code> or use Insert Parameter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-gray-500">
                    <th className="py-2 pr-4 font-medium">Parameter</th>
                    <th className="py-2 pr-4 font-medium">Type</th>
                    <th className="py-2 pr-4 font-medium">Description</th>
                    <th className="py-2 font-medium">Required</th>
                  </tr>
                </thead>
                <tbody>
                  {detected.map((p) => (
                    <tr key={p.name} className="border-b last:border-0">
                      <td className="py-2 pr-4 font-mono text-xs">{p.name}</td>
                      <td className="py-2 pr-4"><span className="rounded bg-gray-100 px-1.5 text-xs text-gray-600">{p.type}</span></td>
                      <td className="py-2 pr-4 text-xs text-gray-500">{p.description}</td>
                      <td className="py-2">
                        <input type="checkbox" aria-label={`${p.name} required`} checked={!!required[p.name]}
                          onChange={(e) => setRequired(p.name, e.target.checked)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <EmailPreviewDialog open={previewOpen} onClose={() => setPreviewOpen(false)} loading={preview.isPending}
        preview={previewResult} errors={previewErrors} />
    </div>
  );
};
