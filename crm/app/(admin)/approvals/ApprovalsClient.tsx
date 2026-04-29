'use client'

// app/(admin)/approvals/ApprovalsClient.tsx
// The interactive review panel for Master Admin to approve/reject pending changes.

import { useState, useTransition } from 'react'
import { Plus, X } from 'lucide-react'
import { approveChange, rejectChange, PendingChange } from '@/app/(admin)/change-requests.actions'
import { Toast, useToast } from '@/components/ui/Toast'

const ENTITY_ICONS: Record<string, string> = {
  client:     '👤',
  consultant: '🤝',
  booking:    '📋',
  payment:    '💰',
  expense:    '🧾',
  plot:       '🏗️',
}

const OPERATION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100  text-blue-800',
  delete: 'bg-red-100   text-red-800',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── Payload diff viewer ──────────────────────────────────────────────────────

// ─── Payload diff viewer ──────────────────────────────────────────────────────

function PayloadViewer({ payload }: { payload: Record<string, any> }) {
  const [open, setOpen] = useState(false)
  const entries = Object.entries(payload)
  if (!entries.length) return <span className="text-gray-400 text-xs italic">No data</span>

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-800 transition-colors"
      >
        {open ? <><X size={12} /> Hide Details</> : <><Plus size={12} /> View {entries.length} Field(s)</>}
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50/50 overflow-hidden text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100/50">
                <th className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-tight w-1/3">Field</th>
                <th className="px-4 py-2 text-left font-bold text-gray-500 uppercase tracking-tight">Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(([key, val]) => (
                <tr key={key} className="hover:bg-white transition-colors">
                  <td className="px-4 py-2.5 font-mono text-gray-500 bg-gray-50/30">{key}</td>
                  <td className="px-4 py-2.5 text-gray-900 break-all font-medium">
                    {val === null ? <span className="text-gray-300 italic">null</span>
                      : val === '' ? <span className="text-gray-300 italic">empty</span>
                      : String(val)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── Single change card ───────────────────────────────────────────────────────

function ChangeCard({
  change,
  onApprove,
  onReject,
}: {
  change: PendingChange
  onApprove: (id: string) => void
  onReject: (id: string) => void
}) {
  return (
    <div className="group bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-xl shadow-inner group-hover:scale-110 transition-transform">
            {ENTITY_ICONS[change.entity_type] || '📄'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-900 capitalize text-base">{change.entity_type}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${OPERATION_COLORS[change.operation]}`}>
                {change.operation}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-medium">{formatDate(change.submitted_at)}</p>
          </div>
        </div>
        
        {change.entity_id && (
          <span className="px-2 py-1 bg-gray-50 rounded-lg font-mono text-[10px] text-gray-400 border border-gray-100">
            ID: {change.entity_id.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="bg-gray-50/50 rounded-xl p-3 border border-gray-100/50">
        <p className="text-sm text-gray-700 leading-relaxed font-medium">{change.description}</p>
      </div>

      {/* Submitted by */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600 uppercase">
            {change.submitter_name?.charAt(0) || 'U'}
          </div>
          <span className="text-xs text-gray-500 font-medium">
            By <span className="text-gray-900">{change.submitter_name}</span>
          </span>
        </div>
        
        <PayloadViewer payload={change.payload} />
      </div>

      {/* Actions (only shown for pending) */}
      {change.status === 'pending' && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => onApprove(change.id)}
            className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98]"
          >
            Approve Change
          </button>
          <button
            onClick={() => onReject(change.id)}
            className="flex-1 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 text-sm font-bold transition-all active:scale-[0.98]"
          >
            Reject
          </button>
        </div>
      )}

      {/* Rejection reason */}
      {change.status === 'rejected' && change.rejection_reason && (
        <div className="bg-red-50/50 border border-red-100 rounded-xl px-4 py-3 text-xs text-red-700">
          <span className="font-bold uppercase tracking-wider opacity-60 block mb-1 text-[10px]">Rejection Reason</span>
          <p className="font-medium italic leading-relaxed">{change.rejection_reason}</p>
        </div>
      )}
    </div>
  )
}

// ─── Reject modal ─────────────────────────────────────────────────────────────

function RejectModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="font-semibold text-lg text-gray-900">Reject Change Request</h3>
        <p className="text-sm text-gray-600">
          Provide a reason so the employee understands what to fix.
        </p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Missing supporting document, incorrect amount..."
          className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
          rows={3}
        />
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim()}
            className="px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-40"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

type Tab = 'pending' | 'approved' | 'rejected'

function TabBar({
  active,
  onChange,
  counts,
}: {
  active: Tab
  onChange: (t: Tab) => void
  counts: Record<Tab, number>
}) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'pending',  label: 'Pending' },
    { key: 'approved', label: 'Approved' },
    { key: 'rejected', label: 'Rejected' },
  ]

  return (
    <div className="flex border-b border-gray-200">
      {tabs.map(tab => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            active === tab.key
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
          {counts[tab.key] > 0 && (
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
              tab.key === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
            }`}>
              {counts[tab.key]}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ApprovalsClient({
  initialPending,
  initialApproved,
  initialRejected,
}: {
  initialPending: PendingChange[]
  initialApproved: PendingChange[]
  initialRejected: PendingChange[]
}) {
  const [activeTab, setActiveTab]     = useState<Tab>('pending')
  const [pending, setPending]         = useState(initialPending)
  const [approved, setApproved]       = useState(initialApproved)
  const [rejected, setRejected]       = useState(initialRejected)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const { toast, showToast, hideToast } = useToast()

  function handleApprove(id: string) {
    startTransition(async () => {
      const result = await approveChange(id)
      if (result.success) {
        const change = pending.find(c => c.id === id)!
        setPending(prev => prev.filter(c => c.id !== id))
        setApproved(prev => [{ ...change, status: 'approved' }, ...prev])
        showToast('Change approved and applied to database.', 'success')
      } else {
        showToast(`Error: ${result.error}`, 'error')
      }
    })
  }

  function handleRejectConfirm(reason: string) {
    if (!rejectTarget) return
    const id = rejectTarget
    setRejectTarget(null)
    startTransition(async () => {
      const result = await rejectChange(id, reason)
      if (result.success) {
        const change = pending.find(c => c.id === id)!
        setPending(prev => prev.filter(c => c.id !== id))
        setRejected(prev => [{
          ...change,
          status: 'rejected',
          rejection_reason: reason,
        }, ...prev])
        showToast('Change request rejected.', 'success')
      } else {
        showToast(`Error: ${result.error}`, 'error')
      }
    })
  }

  const lists: Record<Tab, PendingChange[]> = { pending, approved, rejected }
  const currentList = lists[activeTab]

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Change Approvals</h1>
        <p className="text-sm text-gray-500 mt-1">
          Review, approve, or reject changes submitted by employees before they hit the database.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <TabBar
          active={activeTab}
          onChange={setActiveTab}
          counts={{ pending: pending.length, approved: approved.length, rejected: rejected.length }}
        />

        <div className="p-4 space-y-3">
          {isPending && (
            <div className="text-center py-6 text-sm text-gray-400 animate-pulse">Processing…</div>
          )}

          {!isPending && currentList.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">
                {activeTab === 'pending' ? '✅' : activeTab === 'approved' ? '📂' : '🗃️'}
              </div>
              <p className="text-sm">
                {activeTab === 'pending'
                  ? 'No pending changes — all clear!'
                  : `No ${activeTab} items to show.`}
              </p>
            </div>
          )}

          {!isPending && currentList.map(change => (
            <ChangeCard
              key={change.id}
              change={change}
              onApprove={handleApprove}
              onReject={setRejectTarget}
            />
          ))}
        </div>
      </div>

      {/* Reject modal */}
      {rejectTarget && (
        <RejectModal
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={hideToast} />}
    </div>
  )
}
