// pages/EmailTemplates.tsx — Email Template Master list (Admin only)
import { Copy, Edit, Mail, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { CommonTable, type Column } from "@/components/ui/table";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { getModulePermissions } from "@/utils/permission";
import { useEmailTemplates, useEmailUseFor, type EmailTemplate } from "@/hooks/useEmailTemplate";

type Row = EmailTemplate & { id: string };

export const EmailTemplates = () => {
  const navigate = useNavigate();
  const { permissions, user } = useAuth();
  const { isAdmin } = getModulePermissions(permissions, user, "Email Templates");
  const { data: templates = [], isLoading, isError } = useEmailTemplates();
  const { data: useFors = [] } = useEmailUseFor();

  if (!isAdmin) {
    return <div className="p-6 text-gray-600">Email templates can only be managed by an administrator.</div>;
  }

  const displayNameOf = (key: string) => useFors.find((u) => u.key === key)?.displayName ?? key;
  const rows: Row[] = templates.map((t) => ({ ...t, id: t.templateKey }));

  const columns: Column<Row>[] = [
    { key: "templateName", label: "Template Name" },
    { key: "templateKey", label: "Template Key", render: (r) => <code className="text-xs">{r.templateKey}</code> },
    {
      key: "useFor",
      label: "Use For",
      render: (r) => (
        <div>
          <div>{displayNameOf(r.useFor)}</div>
          <code className="text-xs text-gray-500">{r.useFor}</code>
        </div>
      ),
    },
    {
      key: "isActive",
      label: "Active",
      render: (r) =>
        r.isActive ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">Active</span>
        ) : (
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Inactive</span>
        ),
    },
    { key: "version", label: "Version", render: (r) => `v${r.version}` },
    {
      key: "updatedAt",
      label: "Updated",
      render: (r) => (
        <span className="text-xs text-gray-600">
          {new Date(r.updatedAt).toLocaleString()}
          {r.updatedBy ? ` · ${r.updatedBy}` : ""}
        </span>
      ),
    },
  ];

  return (
    <div className="min-h-full bg-gray-50">
      <PageHeader
        title="Email Templates"
        subtitle="Email content used by the application. Exactly one active template per Use For is sent."
        icon={<Mail className="w-7 h-7 text-[#b08d28]" />}
        rightActions={
          <Button onClick={() => navigate("/admin/email-templates/new")}>
            <Plus className="mr-1 h-4 w-4" /> New Template
          </Button>
        }
      />
      <div className="max-w-7xl mx-auto p-6">
        {isError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">Email templates could not be loaded.</div>
        ) : (
          <CommonTable<Row>
            columns={columns}
            data={rows}
            loading={isLoading}
            emptyMessage="No email templates."
            actions={[
              {
                label: "Edit",
                tooltip: "Edit template",
                variant: "ghost",
                icon: <Edit className="h-4 w-4" />,
                onClick: (r) => navigate(`/admin/email-templates/edit/${encodeURIComponent(r.templateKey)}`),
              },
              {
                label: "Duplicate",
                tooltip: "New inactive template with the same subject, HTML and parameters",
                variant: "ghost",
                icon: <Copy className="h-4 w-4" />,
                onClick: (r) => navigate(`/admin/email-templates/new?from=${encodeURIComponent(r.templateKey)}`),
              },
            ]}
          />
        )}
      </div>
    </div>
  );
};
