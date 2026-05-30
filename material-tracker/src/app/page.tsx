"use client";

import { useEffect, useState } from "react";
import BottomNav from "@/components/BottomNav";
import Dashboard from "@/components/Dashboard";
import NewRequest from "@/components/NewRequest";
import Pending from "@/components/Pending";
import Closed from "@/components/Closed";
import Search from "@/components/Search";
import RequestDetail from "@/components/RequestDetail";
import { seedDemoData, syncFromGoogleSheets, startAutoSync } from "@/lib/local-storage";
import { isGoogleSheetsConfigured } from "@/lib/sheets";

type Tab = "home" | "new" | "pending" | "search" | "closed";

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pendingFilter, setPendingFilter] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    if (isGoogleSheetsConfigured()) {
      // First load: fetch from Google Sheets
      setSyncing(true);
      syncFromGoogleSheets().then((synced) => {
        if (!synced) {
          seedDemoData();
        }
        setSyncing(false);
        refresh();
      });

      // Auto-refresh every 10 seconds to keep all 7 users in sync
      const stopSync = startAutoSync(() => {
        refresh();
      });

      return () => stopSync();
    } else {
      // No Google Sheets — use local demo data
      seedDemoData();
    }
  }, []);

  const openDetail = (id: string) => setSelectedRequestId(id);
  const closeDetail = () => {
    setSelectedRequestId(null);
    // Re-sync when coming back from detail
    if (isGoogleSheetsConfigured()) {
      syncFromGoogleSheets().then(() => refresh());
    } else {
      refresh();
    }
  };

  const handleFilterByStatus = (status: string) => {
    setPendingFilter(status);
    setActiveTab("pending");
  };

  const handleTabChange = (tab: Tab) => {
    if (tab === "pending") {
      setPendingFilter("all");
    }
    setActiveTab(tab);
  };

  if (selectedRequestId) {
    return (
      <RequestDetail
        requestId={selectedRequestId}
        onBack={closeDetail}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sync indicator */}
      {syncing && (
        <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white text-xs text-center py-1 z-50">
          Syncing...
        </div>
      )}

      <div className="pb-safe">
        {activeTab === "home" && (
          <Dashboard
            key={refreshKey}
            onOpenRequest={openDetail}
            onFilterByStatus={handleFilterByStatus}
          />
        )}
        {activeTab === "new" && (
          <NewRequest onSuccess={() => {
            setActiveTab("home");
            // Re-sync after creating
            if (isGoogleSheetsConfigured()) {
              setTimeout(() => syncFromGoogleSheets().then(() => refresh()), 1000);
            } else {
              refresh();
            }
          }} />
        )}
        {activeTab === "pending" && (
          <Pending
            key={`${refreshKey}-${pendingFilter}`}
            onOpenRequest={openDetail}
            initialFilter={pendingFilter}
          />
        )}
        {activeTab === "closed" && (
          <Closed key={refreshKey} onOpenRequest={openDetail} />
        )}
        {activeTab === "search" && (
          <Search onOpenRequest={openDetail} />
        )}
      </div>
      <BottomNav activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
