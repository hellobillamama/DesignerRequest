"use client";

import { useEffect, useState } from "react";
import { getDashboardStatsLocal } from "@/lib/local-storage";
import { MaterialRequest } from "@/lib/types";
import { getStatusColor, getPriorityColor, getProcessTypeColor, isDelayed, timeAgo, getSLARemaining } from "@/lib/utils";
import { HiClock, HiExclamation, HiTruck, HiCog } from "react-icons/hi";

interface DashboardProps {
  onOpenRequest: (id: string) => void;
  onFilterByStatus: (status: string) => void;
}

interface Stats {
  totalPending: number;
  delayed: number;
  ordered: number;
  inProcess: number;
  recentUpdates: MaterialRequest[];
}

export default function Dashboard({ onOpenRequest, onFilterByStatus }: DashboardProps) {
  const [stats, setStats] = useState<Stats>({
    totalPending: 0,
    delayed: 0,
    ordered: 0,
    inProcess: 0,
    recentUpdates: [],
  });

  useEffect(() => {
    const data = getDashboardStatsLocal();
    setStats(data);
  }, []);

  const statCards = [
    {
      label: "Pending",
      value: stats.totalPending,
      icon: <HiClock size={20} />,
      color: "bg-blue-50 text-blue-600",
      borderColor: "border-blue-200",
      filterStatus: "all",
    },
    {
      label: "Delayed",
      value: stats.delayed,
      icon: <HiExclamation size={20} />,
      color: "bg-red-50 text-red-600",
      borderColor: "border-red-200",
      filterStatus: "delayed",
    },
    {
      label: "Ordered",
      value: stats.ordered,
      icon: <HiTruck size={20} />,
      color: "bg-orange-50 text-orange-600",
      borderColor: "border-orange-200",
      filterStatus: "Ordered",
    },
    {
      label: "In Process",
      value: stats.inProcess,
      icon: <HiCog size={20} />,
      color: "bg-purple-50 text-purple-600",
      borderColor: "border-purple-200",
      filterStatus: "In Process",
    },
  ];

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Material Tracker</h1>
        <p className="text-sm text-gray-500 mt-1">Dashboard Overview</p>
      </div>

      {/* Stats Grid - Clickable */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => onFilterByStatus(card.filterStatus)}
            className={`card border ${card.borderColor} ${card.color} flex items-center gap-3 w-full text-left active:scale-95 transition-transform`}
          >
            <div className="p-2 rounded-lg bg-white/60">{card.icon}</div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-xs opacity-80">{card.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Recent Updates - Only pending items, priority on top */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">
          Recent Updates
        </h2>
        <div className="space-y-2">
          {stats.recentUpdates.length === 0 ? (
            <div className="card text-center py-8 text-gray-400">
              <p>No pending requests</p>
              <p className="text-sm mt-1">Create your first material request</p>
            </div>
          ) : (
            stats.recentUpdates.map((req) => {
              const sla = getSLARemaining(req.expected_return_date, req.status);
              return (
                <button
                  key={req.request_id}
                  onClick={() => onOpenRequest(req.request_id)}
                  className={`card w-full text-left active:bg-gray-50 transition-colors ${
                    isDelayed(req.expected_return_date, req.status)
                      ? "border-red-200 bg-red-50/30"
                      : ""
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0 mr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900 truncate">
                          {req.material_name}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {req.process_type} &bull; {req.quantity} {req.unit}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`status-badge ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                      <span className={`status-badge ${getPriorityColor(req.priority)}`}>
                        {req.priority}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>
                      {req.current_holder ? `📍 ${req.current_holder}` : `By: ${req.requested_by}`}
                    </span>
                    <span>
                      {sla.isOverdue ? (
                        <span className="text-red-500 font-medium">⚠️ {sla.text}</span>
                      ) : sla.text ? (
                        <span className="text-gray-500">⏱ {sla.text}</span>
                      ) : (
                        timeAgo(req.updated_at)
                      )}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
