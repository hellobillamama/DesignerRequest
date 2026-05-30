"use client";

import { useState, useEffect, useRef } from "react";
import { searchRequestsLocal } from "@/lib/local-storage";
import { MaterialRequest } from "@/lib/types";
import { getStatusColor, isDelayed, timeAgo, getSLARemaining } from "@/lib/utils";
import { HiSearch, HiX } from "react-icons/hi";

interface SearchProps {
  onOpenRequest: (id: string) => void;
}

export default function Search({ onOpenRequest }: SearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MaterialRequest[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    if (query.trim().length === 0) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      const found = searchRequestsLocal(query.trim());
      setResults(found);
      setHasSearched(true);
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="px-4 pt-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Search</h1>
        <p className="text-sm text-gray-500 mt-0.5">Find materials instantly</p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <HiSearch
          size={20}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          ref={inputRef}
          type="text"
          className="input-field pl-11 pr-10"
          placeholder="Search material, process, name..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400"
          >
            <HiX size={18} />
          </button>
        )}
      </div>

      {/* Quick Search Suggestions */}
      {!hasSearched && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">
            Quick Search
          </p>
          <div className="flex flex-wrap gap-2">
            {["Plating", "Dying", "Purchase", "Ordered", "In Process", "MR-"].map((term) => (
              <button
                key={term}
                onClick={() => setQuery(term)}
                className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600 font-medium active:bg-gray-200"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <div>
          <p className="text-xs text-gray-400 mb-3">
            {results.length} result{results.length !== 1 ? "s" : ""} found
          </p>
          <div className="space-y-2">
            {results.length === 0 ? (
              <div className="card text-center py-12 text-gray-400">
                <p className="text-lg">No results</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              results.map((req) => {
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
                        <p className="font-semibold text-sm text-gray-900 truncate">
                          {req.material_name}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {req.process_type} &bull; {req.request_id}
                        </p>
                      </div>
                      <span className={`status-badge ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-gray-400">
                      <span>
                        {req.current_holder
                          ? `📍 ${req.current_holder}`
                          : `By: ${req.requested_by}`}
                      </span>
                      <span>
                        {sla.isOverdue ? (
                          <span className="text-red-500 font-medium">⚠️ {sla.text}</span>
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
      )}
    </div>
  );
}
