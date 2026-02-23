"use client";

import { useState, useEffect, useCallback } from "react";
import { customFormsApi } from "@/services/api";
import PageHeader from "@/components/ui/PageHeader";
import {
  ClipboardList,
  Plus,
  Trash2,
  Eye,
  RefreshCw,
  FileText,
  CheckCircle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormTemplate {
  template_id: number;
  name: string;
  description: string | null;
  form_type: string;
  fields: any[];
  status: string;
  requires_signature: boolean;
  submission_count: number;
  created_at: string | null;
}

interface FormSubmission {
  submission_id: number;
  template_id: number;
  template_name: string | null;
  site_name: string | null;
  submitted_by: string | null;
  data: Record<string, any>;
  submitted_at: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONF: Record<string, { label: string; classes: string }> = {
  draft:    { label: "Draft",    classes: "bg-gray-100 text-gray-700" },
  active:   { label: "Active",   classes: "bg-green-100 text-green-800" },
  archived: { label: "Archived", classes: "bg-gray-100 text-gray-600" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-ZA", { dateStyle: "medium" });
}

// ---------------------------------------------------------------------------
// Create Template Modal
// ---------------------------------------------------------------------------

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formType, setFormType] = useState("checklist");
  const [fieldName, setFieldName] = useState("");
  const [fieldType, setFieldType] = useState("text");
  const [fields, setFields] = useState<{ name: string; type: string; required: boolean }[]>([]);
  const [saving, setSaving] = useState(false);

  const addField = () => {
    if (!fieldName.trim()) return;
    setFields([...fields, { name: fieldName, type: fieldType, required: false }]);
    setFieldName("");
  };

  const removeField = (idx: number) => {
    setFields(fields.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await customFormsApi.createTemplate({
        name, description, form_type: formType,
        fields, status: "active",
      });
      onCreated();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">New Form Template</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1">Form Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Site Inspection Checklist" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Description</label>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Type</label>
            <select value={formType} onChange={(e) => setFormType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-blue-500 focus:border-blue-500">
              <option value="checklist">Checklist</option>
              <option value="inspection">Inspection</option>
              <option value="report">Report</option>
              <option value="audit">Audit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Fields</label>
            <div className="flex gap-2 mb-2">
              <input type="text" value={fieldName} onChange={(e) => setFieldName(e.target.value)}
                placeholder="Field name" className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400" />
              <select value={fieldType} onChange={(e) => setFieldType(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900">
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="checkbox">Checkbox</option>
                <option value="select">Select</option>
                <option value="textarea">Textarea</option>
              </select>
              <button onClick={addField} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700">
                <Plus size={14} />
              </button>
            </div>
            {fields.length > 0 && (
              <div className="space-y-1">
                {fields.map((f, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-sm text-gray-700">
                    <span>{f.name} ({f.type})</span>
                    <button onClick={() => removeField(i)} className="text-red-500 hover:text-red-700"><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !name.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Creating..." : "Create Template"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Submissions Modal
// ---------------------------------------------------------------------------

function SubmissionsModal({ template, onClose }: { template: FormTemplate; onClose: () => void }) {
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    customFormsApi.listSubmissions({ template_id: template.template_id, limit: 50 })
      .then(res => setSubmissions(res.data || []))
      .catch(() => setSubmissions([]))
      .finally(() => setLoading(false));
  }, [template.template_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{template.name} — Submissions</h3>
            <p className="text-sm text-gray-500">{template.submission_count} total</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-lg">&times;</button>
        </div>
        {loading ? (
          <div className="flex justify-center py-4"><div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" /></div>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No submissions yet</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((s) => (
              <div key={s.submission_id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-900">{s.submitted_by}</span>
                  <span className="text-xs text-gray-400">{fmtDate(s.submitted_at)}</span>
                </div>
                {s.site_name && <p className="text-xs text-gray-500 mb-2">{s.site_name}</p>}
                <div className="text-xs text-gray-600 bg-white rounded-lg border border-gray-200 p-2">
                  <pre className="whitespace-pre-wrap">{JSON.stringify(s.data, null, 2)}</pre>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:bg-gray-100">Close</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function FormsPage() {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<FormTemplate | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await customFormsApi.listTemplates();
      setTemplates(res.data || []);
    } catch { setTemplates([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this form template and all its submissions?")) return;
    setDeletingId(id);
    try { await customFormsApi.deleteTemplate(id); await loadData(); } catch {} finally { setDeletingId(null); }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        backHref="/dashboard"
        backLabel="Back to Dashboard"
        title="Custom Forms"
        subtitle="Create and manage digital forms for inspections, checklists, and reports"
        icon={<ClipboardList className="text-blue-600" size={28} />}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <RefreshCw size={14} /> Refresh
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus size={14} /> New Form
            </button>
          </div>
        }
      />

      {templates.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <FileText size={48} className="mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No Form Templates</h3>
          <p className="text-sm text-gray-500 mt-1">Create a form template to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => {
            const statusConf = STATUS_CONF[t.status] || STATUS_CONF.draft;
            return (
              <div key={t.template_id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-900">{t.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${statusConf.classes}`}>{statusConf.label}</span>
                </div>
                {t.description && <p className="text-xs text-gray-500 mb-2">{t.description}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                  <span className="capitalize">{t.form_type}</span>
                  <span>{t.fields.length} fields</span>
                  <span className="flex items-center gap-1"><CheckCircle size={10} /> {t.submission_count} submitted</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setViewing(t)} className="flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50">
                    <Eye size={12} /> View Submissions
                  </button>
                  <button onClick={() => handleDelete(t.template_id)} disabled={deletingId === t.template_id} className="text-red-500 hover:text-red-700 p-1.5">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && <CreateTemplateModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadData(); }} />}
      {viewing && <SubmissionsModal template={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
