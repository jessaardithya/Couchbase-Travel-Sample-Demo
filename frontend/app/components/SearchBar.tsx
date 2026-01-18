"use client";
import { useState, useEffect } from "react";
import { Search, MapPin, Building2, Plane } from "lucide-react";

interface SearchBarProps {
  onSelect: (item: any) => void;
  onResults?: (results: any[]) => void; // New prop to pass full list
}

export default function SearchBar({ onSelect, onResults }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Debounce Logic
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 3) {
        performSearch(query);
      } else {
        setResults([]);
        if (onResults) onResults([]); // Clear parent
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async (term: string) => {
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:8080/api/search?q=${term}`);
      const data = await res.json();
      setResults(data);
      if (onResults) {
        onResults(data); 
        setShowDropdown(false); // Don't show dropdown if parent handles results
      } else {
        setShowDropdown(true);
      }
    } catch (err) {
      console.error("Search failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (item: any) => {
    setQuery(item.name || item.city); // Update input text
    setShowDropdown(false); // Close dropdown
    onSelect(item); // 👈 SEND DATA TO DASHBOARD
  };

  return (
    <div className="relative w-full z-50">
      {/* INPUT FIELD */}
      <div className="relative bg-slate-50 rounded-2xl border border-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          <Search className="w-5 h-5" />
        </div>
        <input
          type="text"
          placeholder="Search hotels, airports, or 'Breakfast'..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowDropdown(true);
          }}
          className="w-full pl-12 pr-4 py-4 bg-transparent font-bold text-slate-700 outline-none placeholder:text-slate-400"
        />
        {loading && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* DROPDOWN RESULTS */}
      {showDropdown && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-top-2 max-h-80 overflow-y-auto">
          <div className="p-2">
            <div className="text-[10px] font-black uppercase text-slate-300 px-3 py-2 tracking-wider">
              Best Matches
            </div>
            {results.map((item: any, i: number) => (
              <div
                key={i}
                onClick={() => handleSelect(item)}
                className="flex items-start gap-3 p-3 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors group"
              >
                {/* ICON */}
                <div
                  className={`mt-1 min-w-[32px] h-8 rounded-lg flex items-center justify-center ${
                    item.type === "airport"
                      ? "bg-sky-100 text-sky-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {item.type === "airport" ? (
                    <Plane className="w-4 h-4" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                </div>

                {/* TEXT */}
                <div className="flex-1 min-w-0">
                  <div
                    className="font-bold text-slate-800 text-sm group-hover:text-indigo-700 truncate"
                    dangerouslySetInnerHTML={{ __html: item.name }} // Handle Highlights
                  />
                  <div className="flex items-center gap-1 text-xs font-medium text-slate-400 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {item.city}, {item.country}
                  </div>
                  {/* SNIPPET (If found in description) */}
                  {item.description && (
                    <div className="mt-1 text-xs text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 italic">
                      "...{item.description}..."
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
