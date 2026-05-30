"use client";

import { useEffect, useState } from "react";
import { getClosedRequestsLocal } from "@/lib/local-storage";
import { MaterialRequest } from "@/lib/types";
import { getProcessTypeColor, formatDate, timeAgo } from "@/lib/utils";

interface ClosedProps {
  onOpenRequest: (id: string) => void;
}

export default function Closed({ onOpenRequest }: ClosedProps) {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);

  useEffect(() => {
    const closed = getClosedRequestsLocal();
    setRequests(closed);
  }, []);

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Closed</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {requests.length} completed items
        </p>
      </div>

      {/* Closed List */}
      <div className="space-y-2">
        {requests.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            <p className="text-lg">No closed items</p>
            <p className="text-sm mt-1">Completed requests will appear here</p>
          </div>
        ) : (
          requests.map((req) => (
            <button
              key={req.request_id}
              onClick={() => onOpenRequest(req.request_id)}
              className="card w-full text-left active:bg-gray-50 transition-colors opacity-80"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 mr-2">
                  <p className="font-semibold text-sm text-gray-700 truncate">
                    {req.material_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {req.request_id} &bull; {req.quantity} {req.unit}
                  </p>
                </div>
                <span className={`status-badge ${getProcessTypeColor(req.process_type)}`}>
                  {req.process_type}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>By: {req.requested_by}</span>
                <span>Closed {timeAgo(req.updated_at)}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
