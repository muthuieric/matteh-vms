"use client";

import { useEffect, useState } from "react";
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
};

export default function AdminDashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchInitialData = async () => {
      // Fetch all visitors for the table (RLS automatically filters for this company)
      const { data, error } = await supabase
        .from("visitors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching visitors:", error);
      } else {
        setVisitors(data || []);
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
            setVisitors((prev) => [payload.new as Visitor, ...prev].slice(0, 50));
          } else if (payload.eventType === "UPDATE") {
            setVisitors((prev) =>
              prev.map((v) => (v.id === payload.new.id ? (payload.new as Visitor) : v))
            );
          } else if (payload.eventType === "DELETE") {
            setVisitors((prev) => prev.filter((v) => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filter visitors based on the search query
  const filteredVisitors = visitors.filter((v) => {
    const query = searchQuery.toLowerCase();
    return (
      v.name.toLowerCase().includes(query) ||
      v.phone.includes(query) ||
      (v.id_number && v.id_number.toLowerCase().includes(query))
    );
  });

  // Export to CSV Function
  const downloadCSV = () => {
    if (filteredVisitors.length === 0) {
      alert("No data available to download.");
      return;
    }

    const headers = ["Date", "Visitor Name", "Phone Number", "Document Type", "ID Number", "Status", "Time In", "Time Out"];
    const csvRows = filteredVisitors.map((v) => {
      const date = new Date(v.created_at).toLocaleDateString();
      const timeIn = new Date(v.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const timeOut = v.checked_out_at ? new Date(v.checked_out_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "--";
      
      return [
        `"${date}"`,
        `"${v.name}"`,
        `"${v.phone}"`,
        `"${v.document_type}"`,
        `"${v.id_number || 'N/A'}"`,
        `"${v.status.replace("_", " ").toUpperCase()}"`,
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
    
    const fileName = searchQuery 
      ? `Filtered_Report_${searchQuery}_${todayStr}.csv` 
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
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-zinc-200 pb-4 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Building Overview</h1>
            <p className="text-zinc-500 mt-1">Global analytics and visitor history.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="default" onClick={downloadCSV} className="shadow-sm">
              Download {searchQuery ? "Filtered" : "CSV"} Report
            </Button>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-t-4 border-t-blue-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Total Visitors Today</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-zinc-900">{totalToday}</div>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-green-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Currently Inside</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-600">{currentlyInside}</div>
            </CardContent>
          </Card>

          <Card className="border-t-4 border-t-purple-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 uppercase tracking-wider">Active Gate Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-purple-600">
                {visitors.filter(v => v.status === "pending").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Master Log Table */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Master Visitor Log</CardTitle>
              <CardDescription>Comprehensive record of all building access.</CardDescription>
            </div>
            <div className="w-full sm:w-72">
              <Input
                placeholder="Search name, phone, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white"
              />
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-zinc-500 py-4">Loading reports...</p>
            ) : filteredVisitors.length === 0 ? (
              <p className="text-zinc-500 py-4">
                {searchQuery ? "No matching visitors found." : "No records found."}
              </p>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Visitor Details</TableHead>
                      <TableHead>ID / Doc</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time In</TableHead>
                      <TableHead>Time Out</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisitors.map((visitor) => (
                      <TableRow key={visitor.id}>
                        <TableCell className="font-medium text-zinc-600">
                          {new Date(visitor.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-zinc-900">{visitor.name}</div>
                          <div className="text-xs text-zinc-500">{visitor.phone}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{visitor.document_type}</div>
                          <div className="text-xs text-zinc-500">{visitor.id_number || "N/A"}</div>
                        </TableCell>
                        <TableCell>
                          {visitor.status === "pending" && <span className="text-amber-600 text-xs font-bold uppercase">Pending</span>}
                          {visitor.status === "checked_in" && <span className="text-green-600 text-xs font-bold uppercase">Inside</span>}
                          {visitor.status === "checked_out" && <span className="text-zinc-500 text-xs font-bold uppercase">Departed</span>}
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(visitor.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                        <TableCell className="text-sm text-zinc-500">
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
    </div>
  );
}