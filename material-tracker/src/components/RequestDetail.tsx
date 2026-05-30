"use client";

import { useEffect, useState } from "react";
import {
  getRequestByIdLocal,
  updateRequestLocal,
  addStatusHistoryLocal,
  getHistoryByRequestIdLocal,
} from "@/lib/local-storage";
import { MaterialRequest, StatusHistory, Status, ALL_STATUSES } from "@/lib/types";
import {
  getStatusColor,
  getPriorityColor,
  getProcessTypeColor,
  formatDate,
  formatDateTime,
  isDelayed,
  generateHistoryId,
  getSLARemaining,
} from "@/lib/utils";
import { HiArrowLeft, HiClock, HiUser, HiLocationMarker } from "react-icons/hi";

interface RequestDetailProps {
  requestId: string;
  onBack: () => void;
}


export default function RequestDetail({ requestId, onBack }: RequestDetailProps) {
  const [request, setRequest] = useState<MaterialRequest | null>(null);
  const [history, setHistory] = useState<StatusHistory[]>([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState<Status>("Ordered");
  const [statusComment, setStatusComment] = useState("");
  const [newHolder, setNewHolder] = useState("");

  useEffect(() => {
    loadData();
  }, [requestId]);

  function loadData() {
    const req = getRequestByIdLocal(requestId);
    setRequest(req);
    const hist = getHistoryByRequestIdLocal(requestId);
    hist.sort(
      (a, b) => new Date(b.update_time).getTime() - new Date(a.update_time).getTime()
    );
    setHistory(hist);
  }

  async function handleAction(status: Status) {
    if (!request) return;
    const now = new Date().toISOString();

    await addStatusHistoryLocal({
      history_id: generateHistoryId(),
      request_id: request.request_id,
      old_status: request.status,
      new_status: status,
      updated_by: "Admin",
      update_time: now,
      comments: `Status changed to ${status}`,
    });

    await updateRequestLocal({
      ...request,
      status,
      updated_at: now,
    });

    loadData();
  }


  async function handleStatusUpdate() {
    if (!request) return;
    const now = new Date().toISOString();

    await addStatusHistoryLocal({
      history_id: generateHistoryId(),
      request_id: request.request_id,
      old_status: request.status,
      new_status: newStatus,
      updated_by: "Admin",
      update_time: now,
      comments: statusComment,
    });

    await updateRequestLocal({
      ...request,
      status: newStatus,
      current_holder: newHolder || request.current_holder,
      updated_at: now,
    });

    setShowStatusModal(false);
    setStatusComment("");
    setNewHolder("");
    loadData();
  }

  if (!request) {
    return (
      <div className="px-4 pt-6">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-600 mb-4">
          <HiArrowLeft size={20} /> Back
        </button>
        <div className="card text-center py-12 text-gray-400">
          <p>Request not found</p>
        </div>
      </div>
    );
  }

  const delayed = isDelayed(request.expected_return_date, request.status);
  const sla = getSLARemaining(request.expected_return_date, request.status);


  return (
    <div className="min-h-screen bg-gray-50 px-4 pt-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-gray-100 active:bg-gray-200"
        >
          <HiArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">{request.request_id}</h1>
          <p className="text-xs text-gray-500">{request.process_type}</p>
        </div>
        <span className={`status-badge ${getStatusColor(request.status)}`}>
          {request.status}
        </span>
      </div>

      {/* Delayed / SLA Warning */}
      {delayed && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 flex items-center gap-2">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-medium text-red-700">Material Delayed</p>
            <p className="text-xs text-red-500">{sla.text} — Due: {formatDate(request.expected_return_date)}</p>
          </div>
        </div>
      )}

      {/* SLA Timer */}
      {!delayed && sla.text && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4 flex items-center gap-2">
          <HiClock size={18} className="text-blue-600" />
          <div>
            <p className="text-sm font-medium text-blue-700">SLA: {sla.text}</p>
            <p className="text-xs text-blue-500">Due: {formatDate(request.expected_return_date)}</p>
          </div>
        </div>
      )}

      {/* Image */}
      {request.image_url && (
        <div className="mb-4 rounded-xl overflow-hidden border border-gray-200">
          <img src={request.image_url} alt="Material" className="w-full h-48 object-cover" />
        </div>
      )}


      {/* Material Info */}
      <div className="card mb-4">
        <h2 className="font-semibold text-base text-gray-900 mb-3">
          {request.material_name}
        </h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Process Type</p>
            <span className={`status-badge ${getProcessTypeColor(request.process_type)}`}>
              {request.process_type}
            </span>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Quantity</p>
            <p className="font-medium">{request.quantity} {request.unit}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Priority</p>
            <span className={`status-badge ${getPriorityColor(request.priority)}`}>
              {request.priority}
            </span>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Department</p>
            <p className="font-medium">{request.department || '-'}</p>
          </div>
        </div>
      </div>

      {/* People Info */}
      <div className="card mb-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <HiUser size={16} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Requested By</p>
              <p className="text-sm font-medium">{request.requested_by}</p>
            </div>
          </div>
          {request.approved_by && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <HiUser size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Approved By</p>
                <p className="text-sm font-medium">{request.approved_by}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <HiLocationMarker size={16} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Current Holder</p>
              <p className="text-sm font-medium">{request.current_holder || "Not assigned"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              <HiClock size={16} className="text-gray-600" />
            </div>
            <div>
              <p className="text-xs text-gray-400">Expected Return (SLA)</p>
              <p className={`text-sm font-medium ${delayed ? "text-red-600" : ""}`}>
                {formatDate(request.expected_return_date)}
              </p>
            </div>
          </div>
        </div>
      </div>


      {/* Remarks */}
      {request.remarks && (
        <div className="card mb-4">
          <p className="text-xs text-gray-400 mb-1">Remarks</p>
          <p className="text-sm text-gray-700">{request.remarks}</p>
        </div>
      )}

      {/* Action Buttons: Ordered, In Process, Received, Close */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
          Actions
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleAction("Ordered")}
            className="btn-primary text-sm py-3"
          >
            📦 Ordered
          </button>
          <button
            onClick={() => handleAction("In Process")}
            className="btn-warning text-sm py-3"
          >
            ⚙️ In Process
          </button>
          <button
            onClick={() => handleAction("Received")}
            className="btn-success text-sm py-3"
          >
            ✓ Received
          </button>
          <button
            onClick={() => handleAction("Closed")}
            className="btn-secondary text-sm py-3"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">
          Movement Timeline
        </p>
        {history.length === 0 ? (
          <div className="card text-center py-6 text-gray-400 text-sm">
            No history yet
          </div>
        ) : (
          <div className="space-y-0">
            {history.map((h, idx) => (
              <div key={h.history_id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-3 h-3 rounded-full ${idx === 0 ? "bg-blue-500" : "bg-gray-300"}`} />
                  {idx < history.length - 1 && (
                    <div className="w-0.5 h-full bg-gray-200 min-h-[2rem]" />
                  )}
                </div>
                <div className="pb-4 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`status-badge ${getStatusColor(h.new_status)}`}>
                      {h.new_status}
                    </span>
                    {h.old_status && (
                      <span className="text-xs text-gray-400">from {h.old_status}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {h.updated_by} &bull; {formatDateTime(h.update_time)}
                  </p>
                  {h.comments && (
                    <p className="text-xs text-gray-600 mt-0.5">{h.comments}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>


      {/* Dates */}
      <div className="card text-xs text-gray-400">
        <p>Created: {formatDateTime(request.created_at)}</p>
        <p>Updated: {formatDateTime(request.updated_at)}</p>
      </div>

      {/* Status Update Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-2xl p-6 animate-slide-up">
            <h3 className="text-lg font-bold mb-4">Update Status</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">New Status</label>
              <select
                className="input-field"
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as Status)}
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Current Holder</label>
              <input
                type="text"
                className="input-field"
                placeholder="Who has the material now?"
                value={newHolder}
                onChange={(e) => setNewHolder(e.target.value)}
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="Add a note..."
                value={statusComment}
                onChange={(e) => setStatusComment(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowStatusModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleStatusUpdate} className="btn-primary flex-1">Update</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
