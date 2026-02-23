"use client";

import { useState, useEffect, useCallback } from "react";
import { postOrdersApi, sitesApi } from "@/services/api";
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  Clock,
  Eye,
  RefreshCw,
  Users,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PostOrder {
  post_order_id: number;
  site_id: number;
  site_name: string | null;
  title: string;
  content: string;
  version: number;
  effective_from: string | null;
  effective_until: string | null;
  status: string;
  requires_acknowledgment: boolean;
  acknowledgment_count: number;
  created_at: string | null;
}

interface Acknowledgment {
  employee_id: number;
  employee_name: string;
  acknowledged_at: string | null;
}

interface Site {
  site_id: number;
  site_name: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_CONF: Record<string, { label: string; classes: string }> = {
  draft:    { label: "Draft",    classes: "bg-gray-700 text-gray-300" },
  active:   { label: "Active",   classes: "bg-green-900/50 text-green-300" },
  archived: { label: "Archived", classes: "bg-slate-700 text-slate-400" },
};

function fmtDate(iso: string | null): string {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("en-ZA", { dateStyle: "medium" });
}

// ---------------------------------------------------------------------------
// Create Modal
// ---------------------------------------------------------------------------

function CreateModal({ sites, onClose, onCreated }: { sites: Site[]; onClose: () => void; onCreated: () => void }) {
  const [siteId, setSiteId] = useState(sites[0]?.site_id || 0);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [orderStatus, setOrderStatus] = useState("draft");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await postOrdersApi.create({ site_id: siteId, title, content, status: orderStatus });
      onCreated();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-lg rounded-lg border border-slate-700 bg-slate-800 p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">New Post Order</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Site</label>
            <select value={siteId} onChange={(e) => setSiteId(Number(e.target.value))}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white">
              {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Gate Access Procedures" />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Instructions</label>
            <textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-blue-500 focus:outline-none"
              placeholder="Enter the post order instructions..." />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Status</label>
            <select value={orderStatus} onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white">
              <option value="draft">Draft</option>
              <option value="active">Active</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Cancel</button>
          <button onClick={handleSubmit} disabled={saving || !title.trim() || !content.trim()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? "Creating..." : "Create Post Order"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail Modal
// ---------------------------------------------------------------------------

function DetailModal({ order, onClose }: { order: PostOrder; onClose: () => void }) {
  const [acks, setAcks] = useState<Acknowledgment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    postOrdersApi.getAcknowledgments(order.post_order_id)
      .then(res => setAcks(res.data || []))
      .catch(() => setAcks([]))
      .finally(() => setLoading(false));
  }, [order.post_order_id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-800 p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">{order.title}</h3>
            <p className="text-sm text-slate-400">{order.site_name} — v{order.version}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-lg">&times;</button>
        </div>
        <div className="prose prose-invert prose-sm max-w-none bg-slate-900/50 rounded p-4 mb-4">
          <pre className="whitespace-pre-wrap text-sm text-slate-300">{order.content}</pre>
        </div>
        <h4 className="text-sm font-medium text-white flex items-center gap-2 mb-2">
          <Users size={14} /> Acknowledgments ({acks.length})
        </h4>
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : acks.length === 0 ? (
          <p className="text-sm text-slate-500">No acknowledgments yet</p>
        ) : (
          <div className="space-y-1">
            {acks.map((a) => (
              <div key={a.employee_id} className="flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle size={12} className="text-green-400" />
                {a.employee_name} — {fmtDate(a.acknowledged_at)}
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded px-4 py-2 text-sm text-slate-300 hover:bg-slate-700">Close</button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PostOrdersPage() {
  const [orders, setOrders] = useState<PostOrder[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [siteFilter, setSiteFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [viewing, setViewing] = useState<PostOrder | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ordersRes, sitesRes] = await Promise.all([
        postOrdersApi.list({
          status_filter: statusFilter || undefined,
          site_id: siteFilter ? Number(siteFilter) : undefined,
        }),
        sitesApi.getAll(),
      ]);
      setOrders(ordersRes.data || []);
      setSites(sitesRes.data || []);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, siteFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this post order?")) return;
    setDeletingId(id);
    try { await postOrdersApi.delete(id); await loadData(); } catch {} finally { setDeletingId(null); }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <FileText className="text-blue-400" size={28} />
            Post Orders
          </h1>
          <p className="mt-1 text-sm text-slate-400">Site instructions and standing orders for guards</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={loadData} className="flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-600">
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus size={14} /> New Post Order
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <select value={siteFilter} onChange={(e) => setSiteFilter(e.target.value)}
          className="rounded border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white">
          <option value="">All Sites</option>
          {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.site_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700 bg-slate-800/60 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Site</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Version</th>
              <th className="px-4 py-3">Acks</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {orders.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No post orders found</td></tr>
            ) : orders.map((o) => {
              const statusConf = STATUS_CONF[o.status] || STATUS_CONF.draft;
              return (
                <tr key={o.post_order_id} className="hover:bg-slate-800/40">
                  <td className="px-4 py-3 text-white font-medium">{o.title}</td>
                  <td className="px-4 py-3 text-slate-300">{o.site_name || "\u2014"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusConf.classes}`}>{statusConf.label}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-400">v{o.version}</td>
                  <td className="px-4 py-3 text-slate-400 flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-400" /> {o.acknowledgment_count}
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3 flex items-center gap-2">
                    <button onClick={() => setViewing(o)} className="text-blue-400 hover:text-blue-300">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => handleDelete(o.post_order_id)} disabled={deletingId === o.post_order_id} className="text-red-400 hover:text-red-300">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showCreate && <CreateModal sites={sites} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); loadData(); }} />}
      {viewing && <DetailModal order={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
