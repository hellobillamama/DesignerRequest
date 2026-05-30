"use client";

import { HiHome, HiPlus, HiClock, HiSearch, HiCheckCircle } from "react-icons/hi";

type Tab = "home" | "new" | "pending" | "search" | "closed";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <HiHome size={22} /> },
    { id: "new", label: "New", icon: <HiPlus size={22} /> },
    { id: "pending", label: "Pending", icon: <HiClock size={22} /> },
    { id: "closed", label: "Closed", icon: <HiCheckCircle size={22} /> },
    { id: "search", label: "Search", icon: <HiSearch size={22} /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div
        className="flex justify-around items-center h-16 max-w-lg mx-auto px-1"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`nav-item flex-1 ${
              activeTab === tab.id ? "nav-item-active" : "nav-item-inactive"
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
