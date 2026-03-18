"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Filter, Info, X, UserCircle } from "lucide-react";

// Define the shape of our Visitor data
type Visitor = {
  id: string;
  name: string;
  phone: string;
  document_type: string;
  id_number: string;
  status: "pending" | "checked_in" | "checked_out" | "auto_checked_out";
  created_at: string;
  checked_out_at?: string;
  host_name?: string;
  purpose?: string;
  vehicle_reg?: string;
  photo_url?: string; // ADDED: For displaying the security selfie
};

export default function AdminDashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [lifetimeVisitors, setLifetimeVisitors] = useState(0);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal States
  const [infoModalVisitor, setInfoModalVisitor] = useState<Visitor | null>(null);
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null); // ADDED: State for photo lightbox

  useEffect(() => {
    const fetchInitialData = async () => {
      // --- AUTO-CHECKOUT SCRIPT ---
      // Automatically check out any 'pending' or 'checked_in' visitors from previous days
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      try {
        await supabase
          .from("visitors")
          .update({ 
            status: "auto_checked_out", 
            checked_out_at: new Date().toISOString() 
          })
          .in("status", ["pending", "checked_in"])
          .lt("created_at", startOfToday.toISOString());
      } catch (err) {
        console.error("Auto-checkout script failed:", err);
      }
      // ----------------------------

      // 1. Fetch up to 2000 visitors so historical date filtering works properly in the table
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (error) {
        console.error("Error fetching visitors:", error);
      } else {
        setVisitors(data || []);
      }

      // 2. Fetch the exact lifetime count for the all-time stat card (bypasses the 2000 limit)
      const { count, error: countError } = await supabase
        .from("visitors")
        .select("*", { count: "exact", head: true });

      if (!countError && count !== null) {
        setLifetimeVisitors(count);
      }

      setLoading(false);
    };

    fetchInitialData();

    // Subscribe to real-time changes so the admin sees live gate activity
    const channel = supabase
      .channel("admin-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visitors" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setVisitors((prev) => [payload.new as Visitor, ...prev]);
            setLifetimeVisitors((prev) => prev + 1); // Instantly update lifetime count
          } else if (payload.eventType === "UPDATE") {
            setVisitors((prev) =>
              prev.map((v) => (v.id === payload.new.id ? (payload.new as Visitor) : v))
            );
          } else if (payload.eventType === "DELETE") {
            setVisitors((prev) => prev.filter((v) => v.id !== payload.old.id));
            setLifetimeVisitors((prev) => Math.max(0, prev - 1)); // Deduct from lifetime count safely
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter visitors based on search, status, and date range
  const filteredVisitors = visitors.filter((v) => {
    // 1. Search Query
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      v.name.toLowerCase().includes(query) ||
      v.phone?.includes(query) ||
      (v.id_number && v.id_number.toLowerCase().includes(query)) ||
      (v.host_name && v.host_name.toLowerCase().includes(query)) ||
      (v.vehicle_reg && v.vehicle_reg.toLowerCase().includes(query));

    // 2. Status Filter
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;

    // 3. Date Range Filter
    let matchesDate = true;
    const visitorTime = new Date(v.created_at).getTime();
    
    if (startDate) {
      const start = new Date(startDate).getTime();
      if (visitorTime < start) matchesDate = false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Set to the very end of the selected day
      if (visitorTime > end.getTime()) matchesDate = false;
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  // Export to CSV Function
  const downloadCSV = () => {
    if (filteredVisitors.length === 0) {
      alert("No data available to download.");
      return;
    }

    const headers = ["Date", "Visitor Name", "Phone Number", "Document Type", "ID Number", "Host Name", "Purpose", "Vehicle Reg", "Status", "Time In", "Time Out"];
    const csvRows = filteredVisitors.map((v) => {
      const date = new Date(v.created_at).toLocaleDateString();
      const timeIn = new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const timeOut = v.checked_out_at ? new Date(v.checked_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--";
      
      return [
        `"${date}"`,
        `"${v.name}"`,
        `"${v.phone || 'N/A'}"`,
        `"${v.document_type || 'N/A'}"`,
        `"${v.id_number || 'N/A'}"`,
        `"${v.host_name || 'N/A'}"`,
        `"${v.purpose || 'N/A'}"`,
        `"${v.vehicle_reg || 'N/A'}"`,
        `"${v.status.replace(/_/g, " ").toUpperCase()}"`,
        `"${timeIn}"`,
        `"${timeOut}"`
      ].join(",");
    });

    const csvContent = [headers.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const todayStr = new Date().toISOString().split('T')[0];
    
    const fileName = searchQuery || startDate || statusFilter !== "all"
      ? `Filtered_Report_${todayStr}.csv` 
      : `Building_Visitor_Log_${todayStr}.csv`;
      
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalToday = visitors.filter(v => {
    const today = new Date().toISOString().split('T')[0];
    return v.created_at.startsWith(today);
  }).length;
  
  const currentlyInside = visitors.filter(v => v.status === "checked_in").length;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-zinc-200 pb-4 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Building Overview</h1>
            <p className="text-zinc-500 mt-1 text-sm md:text-base">Global analytics and visitor history.</p>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="default" onClick={downloadCSV} className="shadow-sm bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto">
              <Download className="w-4 h-4 mr-2" />
              Download {searchQuery || startDate || statusFilter !== "all" ? "Filtered" : "CSV"} Report
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-t-4 border-t-blue-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-zinc-500 uppercase tracking-wider">Total Visitors Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold text-zinc-900">{totalToday}</div>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-green-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-zinc-500 uppercase tracking-wider">Currently Inside</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold text-green-600">{currentlyInside}</div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-purple-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-zinc-500 uppercase tracking-wider">Active Gate Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold text-purple-600">
                {visitors.filter(v => v.status === "pending").length}
              </div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-zinc-900 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs md:text-sm font-medium text-zinc-500 uppercase tracking-wider">Lifetime Visitors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl md:text-4xl font-bold text-zinc-900">
                {lifetimeVisitors.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Master Log Table */}
        <Card className="shadow-sm">
          <CardHeader className="space-y-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <CardTitle>Master Visitor Log</CardTitle>
                <CardDescription>Comprehensive record of all building access.</CardDescription>
              </div>
              <div className="w-full md:w-80">
                <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">Search Records</label>
                <Input
                  placeholder="Search name, host, or vehicle..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white h-10 w-full"
                />
              </div>
            </div>

            {/* RESPONSIVE FILTERS SECTION */}
            <div className="bg-zinc-50/50 p-4 rounded-xl border border-zinc-100">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-700 mb-4">
                <Filter className="w-4 h-4 text-zinc-500" /> Filter Options
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Status Dropdown */}
                <div className="space-y-1.5 w-full">
                  <label className="text-xs font-medium text-zinc-500 block">Status</label>
                  <select
                    className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 text-zinc-700 font-medium"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="checked_in">Inside (Checked In)</option>
                    <option value="checked_out">Departed (Checked Out)</option>
                    <option value="auto_checked_out">Auto Checked Out</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="space-y-1.5 w-full">
                  <label className="text-xs font-medium text-zinc-500 block">From Date</label>
                  <Input
                    type="date"
                    className="h-10 w-full bg-white text-zinc-700"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                {/* End Date */}
                <div className="space-y-1.5 w-full">
                  <label className="text-xs font-medium text-zinc-500 block">To Date</label>
                  <Input
                    type="date"
                    className="h-10 w-full bg-white text-zinc-700"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>

              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {loading ? (
              <p className="text-zinc-500 py-6 text-center">Loading reports...</p>
            ) : filteredVisitors.length === 0 ? (
              <p className="text-zinc-500 py-6 text-center">
                {(searchQuery || startDate || statusFilter !== "all") ? "No matching visitors found for these filters." : "No records found."}
              </p>
            ) : (
              <div className="rounded-none sm:rounded-md border-y sm:border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Date</TableHead>
                      <TableHead className="whitespace-nowrap">Visitor Details</TableHead>
                      <TableHead className="whitespace-nowrap">ID / Doc</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                      <TableHead className="whitespace-nowrap">Time In</TableHead>
                      <TableHead className="whitespace-nowrap">Time Out</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisitors.map((visitor) => (
                      <TableRow key={visitor.id}>
                        <TableCell className="font-medium text-zinc-600 whitespace-nowrap">
                          {new Date(visitor.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {/* NEW: DISPLAY PHOTO OR PLACEHOLDER */}
                            {visitor.photo_url ? (
                              <Image 
                                src={visitor.photo_url} 
                                alt={`${visitor.name}'s photo`} 
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover border-2 border-zinc-200 cursor-pointer hover:opacity-80 transition-opacity bg-white shrink-0"
                                onClick={() => setEnlargedPhoto(visitor.photo_url!)}
                                unoptimized
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center border-2 border-zinc-200 text-zinc-400 shrink-0">
                                <UserCircle className="w-6 h-6" />
                              </div>
                            )}

                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-zinc-900 whitespace-nowrap">{visitor.name}</span>
                                {/* INFO BUTTON MODAL TRIGGER */}
                                {(visitor.host_name || visitor.purpose || visitor.vehicle_reg) && (
                                  <button
                                    onClick={() => setInfoModalVisitor(visitor)}
                                    className="text-blue-600 bg-blue-50 hover:bg-blue-100 p-1.5 rounded-full transition-colors shrink-0 shadow-sm border border-blue-100"
                                    title="View Visit Info"
                                  >
                                    <Info className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="text-xs text-zinc-500 whitespace-nowrap">{visitor.phone || "—"}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm whitespace-nowrap">{visitor.document_type || "—"}</div>
                          <div className="text-xs text-zinc-500 whitespace-nowrap">{visitor.id_number || "N/A"}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {visitor.status === "pending" && <span className="text-amber-600 text-xs font-bold uppercase">Pending</span>}
                          {visitor.status === "checked_in" && <span className="text-green-600 text-xs font-bold uppercase">Inside</span>}
                          {visitor.status === "checked_out" && <span className="text-zinc-500 text-xs font-bold uppercase">Departed</span>}
                          {visitor.status === "auto_checked_out" && <span className="text-purple-600 text-xs font-bold uppercase">Auto-Departed</span>}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(visitor.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500 whitespace-nowrap">
                          {visitor.checked_out_at 
                            ? new Date(visitor.checked_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                            : "--"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* --- EXTRA VISIT INFO MODAL --- */}
      {infoModalVisitor && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-sm shadow-2xl relative border-0 overflow-hidden bg-white">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-500"></div>
            <button onClick={() => setInfoModalVisitor(null)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full p-1.5 transition-colors">
              <X size={18} />
            </button>
            <CardHeader className="pt-8 pb-4 border-b border-zinc-100/50">
              <CardTitle className="text-xl font-bold">Visit Details</CardTitle>
              <CardDescription>Extra information provided by {infoModalVisitor.name}.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-5 bg-zinc-50/50">
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Host Name</p>
                <p className="font-medium text-zinc-900 text-lg leading-snug">{infoModalVisitor.host_name || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Purpose of Visit</p>
                <p className="font-medium text-zinc-900 text-lg leading-snug">{infoModalVisitor.purpose || "—"}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Vehicle Registration</p>
                <p className="font-mono font-medium text-zinc-900 text-lg leading-snug">{infoModalVisitor.vehicle_reg || "—"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- ENLARGED PHOTO LIGHTBOX MODAL --- */}
      {enlargedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-[80] flex flex-col items-center justify-center p-4 cursor-pointer backdrop-blur-sm" 
          onClick={() => setEnlargedPhoto(null)}
        >
          <div className="relative max-w-2xl w-full flex flex-col items-center">
            <button 
              className="absolute -top-12 right-0 text-white/70 hover:text-white transition-colors p-2"
              onClick={(e) => { e.stopPropagation(); setEnlargedPhoto(null); }}
            >
              <X size={32} />
            </button>
            <Image 
              src={enlargedPhoto} 
              alt="Enlarged security photo" 
              width={1000}
              height={1000}
              className="w-full h-auto rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-zinc-800 object-contain max-h-[85vh]" 
              onClick={(e) => e.stopPropagation()} 
              unoptimized
            />
          </div>
        </div>
      )}

    </div>
  );
}