"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SearchBar from "./components/SearchBar"; // 👈 IMPORT THE NEW COMPONENT
import {
  Plane,
  Hotel,
  Map,
  LogOut,
  Search,
  ArrowRightLeft,
  Briefcase,
  Menu,
  X,
  Sparkles,
  PlaneTakeoff,
  PlaneLanding,
} from "lucide-react";

export default function Home() {
  const router = useRouter();

  // Auth State
  const [token, setToken] = useState("");
  const [username, setUsername] = useState("");

  // App State
  const [activeTab, setActiveTab] = useState("flight");
  const [id, setId] = useState(""); // Kept for internal logic if needed, but UI uses SearchBar
  const [from, setFrom] = useState("LHR");
  const [to, setTo] = useState("LAX");
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. PROTECT ROUTE: Check Login on Load
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("username");

    if (!savedToken) {
      router.push("/auth"); // Redirect to Login Page
    } else {
      setToken(savedToken);
      setUsername(savedUser || "User");
    }
  }, [router]);

  // 2. AUTO-FETCH MY TRIPS
  useEffect(() => {
    if (activeTab === "my-trips" && token) {
      handleSearch();
    }
  }, [activeTab, token]);

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    router.push("/auth"); // Redirect to Login
  };

  const handleSearch = async () => {
    setLoading(true);
    setError("");
    setData(null);

    try {
      let endpoint = "";
      if (activeTab === "flight") {
        endpoint = `http://localhost:8080/api/flight?from=${from}&to=${to}`;
      } else if (activeTab === "my-trips") {
        endpoint = `http://localhost:8080/api/my-bookings`;
      } else {
        // Fallback for ID search if specific ID is typed manually (legacy)
        if (!id) throw new Error("ID Required");
        endpoint = `http://localhost:8080/api/${activeTab}?id=${id}`;
      }

      // Add Token Header
      const headers: any = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(endpoint, { headers });
      if (!res.ok) throw new Error("No results found");

      const result = await res.json();
      setTimeout(() => {
        setData(result);
        setLoading(false);
      }, 500); // Slight delay for smoother animation
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const bookFlight = async (flight: any) => {
    if (!confirm("Confirm booking?")) return;

    try {
      const res = await fetch("http://localhost:8080/api/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(flight),
      });

      if (!res.ok) throw new Error("Booking failed");
      setActiveTab("my-trips");
    } catch (err) {
      alert("Error booking flight.");
    }
  };

  const swapLocations = () => {
    setFrom(to);
    setTo(from);
  };

  if (!token) return null;

  const NavItem = ({ tab, label, icon: Icon }: any) => (
    <button
      onClick={() => {
        setActiveTab(tab);
        setData(null);
        setError("");
        setMobileMenuOpen(false);
        // Reset ID defaults if needed, though SearchBar handles selection now
        if (tab === "hotel") setId("10025");
        if (tab === "airline") setId("10");
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
        activeTab === tab
          ? "bg-indigo-600/10 text-indigo-600 shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
      }`}
    >
      <Icon
        className={`w-5 h-5 ${
          activeTab === tab ? "text-indigo-600" : "text-slate-400"
        }`}
      />
      <span>{label}</span>
      {activeTab === tab && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
      )}
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 h-full p-6">
        <div className="flex items-center gap-3 px-2 mb-10">
          <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-200">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">
            Super App
          </span>
        </div>

        <nav className="space-y-1 flex-1">
          <NavItem tab="flight" label="Flights" icon={Plane} />
          <NavItem tab="hotel" label="Hotels" icon={Hotel} />
          <NavItem tab="airline" label="Airlines" icon={Map} />
          <NavItem tab="my-trips" label="My Trips" icon={Briefcase} />
        </nav>

        <div className="border-t border-slate-100 pt-6">
          <div className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900 truncate">
                {username}
              </p>
              <p className="text-xs text-slate-500">Premium Member</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 z-20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-600 rounded-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900">Super App</span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600"
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </header>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden absolute inset-0 z-10 bg-white pt-20 px-6 pb-6">
            <nav className="space-y-2">
              <NavItem tab="flight" label="Flights" icon={Plane} />
              <NavItem tab="hotel" label="Hotels" icon={Hotel} />
              <NavItem tab="airline" label="Airlines" icon={Map} />
              <NavItem tab="my-trips" label="My Trips" icon={Briefcase} />
            </nav>
            <div className="mt-8 border-t border-slate-100 pt-6">
              <button
                onClick={logout}
                className="flex items-center gap-2 text-red-500 font-medium"
              >
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 lg:p-12 scrollbar-hide">
          <div className="max-w-5xl mx-auto w-full">
            <header className="mb-10">
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 mb-2">
                {activeTab === "my-trips"
                  ? "Your journey"
                  : `Find your next ${activeTab}`}
              </h1>
              <p className="text-slate-500 text-lg">
                {activeTab === "my-trips"
                  ? "Manage your upcoming flights and bookings here."
                  : "Discover the best options for your travel plans."}
              </p>
            </header>

            {/* SEARCH INTERFACE */}
            {activeTab !== "my-trips" && (
              <div className="bg-white rounded-3xl p-6 lg:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 mb-10">
                {activeTab === "flight" ? (
                  // FLIGHT SEARCH INPUTS
                  <div className="flex flex-col lg:flex-row gap-4 items-center">
                    <div className="flex-1 w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1">
                        <PlaneTakeoff className="w-3 h-3" /> From
                      </label>
                      <input
                        value={from}
                        onChange={(e) => setFrom(e.target.value.toUpperCase())}
                        className="w-full bg-transparent font-black text-2xl text-slate-800 outline-none placeholder:text-slate-300"
                        placeholder="LHR"
                        maxLength={3}
                      />
                    </div>

                    <button
                      onClick={swapLocations}
                      className="p-3 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:scale-105 active:scale-95 transition-all"
                    >
                      <ArrowRightLeft className="w-5 h-5" />
                    </button>

                    <div className="flex-1 w-full bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-1">
                        <PlaneLanding className="w-3 h-3" /> To
                      </label>
                      <input
                        value={to}
                        onChange={(e) => setTo(e.target.value.toUpperCase())}
                        className="w-full bg-transparent font-black text-2xl text-slate-800 outline-none placeholder:text-slate-300"
                        placeholder="LAX"
                        maxLength={3}
                      />
                    </div>
                  </div>
                ) : (
                  // 👇 REPLACED WITH SEARCH BAR COMPONENT FOR HOTELS/AIRLINES 👇
                  <div className="w-full">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase mb-2">
                      <Search className="w-3 h-3" /> Smart Search
                    </label>
                    <SearchBar
                      onSelect={(item) => {
                        setData(item); // 👈 Updates the main dashboard data immediately
                        setError("");
                      }}
                    />
                  </div>
                )}

                {/* SEARCH BUTTON (Only for Flights now) */}
                {activeTab === "flight" && (
                  <button
                    onClick={handleSearch}
                    disabled={loading}
                    className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:scale-100"
                  >
                    {loading ? (
                      <>Searching...</>
                    ) : (
                      <>
                        <Search className="w-5 h-5" />
                        <span>Search Flights</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* RESULTS AREA */}
            <div className="space-y-4">
              {error && (
                <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center gap-2 font-medium animate-in fade-in slide-in-from-top-2">
                  <span className="text-lg">⚠️</span> {error}
                </div>
              )}

              {/* Flight Results */}
              {activeTab === "flight" && data && Array.isArray(data) && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  {data.map((f: any, i: number) => (
                    <div
                      key={i}
                      className="group bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-xs font-bold uppercase tracking-wider mb-2">
                            {f.airline}
                          </span>
                          <h3 className="font-bold text-slate-900">
                            {f.flight}
                          </h3>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-slate-900">
                            $250
                          </p>
                          <p className="text-xs text-slate-400 font-medium">
                            per person
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl mb-6">
                        <div className="text-center">
                          <p className="text-2xl font-black text-slate-800">
                            {f.sourceairport}
                          </p>
                          <p className="text-xs text-slate-400 font-bold uppercase">
                            Departure
                          </p>
                        </div>
                        <div className="flex-1 flex justify-center px-4">
                          <div className="h-[2px] w-full bg-slate-200 relative flex items-center justify-center">
                            <Plane className="w-4 h-4 text-slate-300 absolute bg-slate-50 px-1" />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-black text-slate-800">
                            {f.destinationairport}
                          </p>
                          <p className="text-xs text-slate-400 font-bold uppercase">
                            Arrival
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => bookFlight(f)}
                        className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-sm transition-colors"
                      >
                        Book Flight
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* My Trips */}
              {activeTab === "my-trips" && data && Array.isArray(data) && (
                <div className="grid gap-4">
                  {data.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                      <div className="inline-flex p-4 bg-slate-50 rounded-full mb-4">
                        <Plane className="w-8 h-8 text-slate-300" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">
                        No trips found
                      </h3>
                      <p className="text-slate-500">
                        You haven't booked any flights yet.
                      </p>
                    </div>
                  ) : (
                    data.map((b: any, i: number) => (
                      <div
                        key={i}
                        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-center gap-6"
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-emerald-500"></div>
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-full tracking-wide">
                              Confirmed
                            </span>
                            <span className="text-slate-400 text-xs font-mono">
                              #{b.id}
                            </span>
                          </div>
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="text-2xl font-black text-slate-900">
                                {b.flight_info?.sourceairport || "N/A"}
                              </p>
                            </div>
                            <ArrowRightLeft className="w-4 h-4 text-slate-300" />
                            <div>
                              <p className="text-2xl font-black text-slate-900">
                                {b.flight_info?.destinationairport || "N/A"}
                              </p>
                            </div>
                          </div>
                          <p className="text-slate-500 text-sm mt-1">
                            {b.flight_info?.airline} &bull;{" "}
                            {b.flight_info?.flight}
                          </p>
                        </div>

                        <div className="w-full sm:w-auto border-t sm:border-t-0 sm:border-l border-slate-100 pt-4 sm:pt-0 sm:pl-6 flex sm:flex-col gap-2">
                          <button className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg transition-colors">
                            Details
                          </button>
                          <button className="flex-1 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg transition-colors">
                            Check-in
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Other Results (Hotel/Airline from SearchBar) */}
              {!Array.isArray(data) && data && (
                <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-lg text-center animate-in slide-in-from-bottom-4">
                  <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-black">
                    {data.name?.charAt(0) || "?"}
                  </div>
                  <h2 className="text-2xl font-black text-slate-900">
                    {data.name}
                  </h2>
                  <p className="text-slate-500 font-medium">
                    {data.city || data.callsign}
                  </p>

                  {/* SHOW DESCRIPTION IF AVAILABLE (Context Search) */}
                  {data.description && (
                    <p className="mt-4 text-sm text-slate-600 italic bg-slate-50 p-4 rounded-xl border border-slate-100">
                      "{data.description}"
                    </p>
                  )}

                  <div className="mt-6 grid grid-cols-2 gap-4 text-left">
                    {Object.entries(data)
                      .slice(0, 6)
                      .map(([key, val]: any) => (
                        <div key={key} className="bg-slate-50 p-3 rounded-xl">
                          <p className="text-[10px] uppercase font-bold text-slate-400">
                            {key}
                          </p>
                          <p className="font-semibold text-slate-800 truncate">
                            {val}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!data && !loading && !error && activeTab !== "my-trips" && (
                <div className="text-center py-20 opacity-50">
                  <div className="inline-flex p-6 bg-slate-100 rounded-full mb-4">
                    <Search className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 font-medium">
                    Search for flights, hotels, or airlines above.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
