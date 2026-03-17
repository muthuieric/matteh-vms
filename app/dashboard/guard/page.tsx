"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { X, UserCircle, LogOut, Search, Clock, CheckCircle2, UserPlus } from "lucide-react";

// Import the new modal component
import AddVisitorModal from "@/components/AddVisitorModal";

type Visitor = {
  id: string;
  name: string;
  phone: string;
  status: "pending" | "checked_in" | "checked_out" | "auto_checked_out";
  created_at: string;
  document_type: string;
  id_number?: string;
  otp_code?: string;
  company_id: string;
  photo_url?: string;
};

export default function GuardDashboard() {
  const router = useRouter();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to securely hold the logged-in guard's assigned building/company
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "checked_in">("all");

  // Dynamic Form Rules
  const [requirePhoto, setRequirePhoto] = useState<boolean>(false);
  const [askPhone, setAskPhone] = useState<boolean>(true);
  const [askId, setAskId] = useState<boolean>(true);

  // OTP State
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");

  // Add Visitor Modal State
  const [showAddModal, setShowAddModal] = useState(false);

  // Image Enlarger State
  const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null);
  
  useEffect(() => {
    const initializeDashboard = async () => {
      // 1. Get the currently logged-in guard's authentication session
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authData.user) {
        console.error("Authentication error:", authError);
        setLoading(false);
        return;
      }

      // 2. Look up their assigned company_id in the profiles table
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profileData?.company_id) {
        console.error("Could not load guard profile:", profileError);
        setLoading(false);
        return;
      }

      const currentCompanyId = profileData.company_id;
      setCompanyId(currentCompanyId);

      // Fetch company rules (Photo, Phone, ID toggles)
      const { data: companyData } = await supabase
        .from("companies")
        .select("require_photo, ask_phone, ask_id")
        .eq("id", currentCompanyId)
        .single();
        
      if (companyData) {
        setRequirePhoto(companyData.require_photo || false);
        setAskPhone(companyData.ask_phone !== false);
        setAskId(companyData.ask_id !== false);
      }

      // 4. Fetch ONLY the visitors for this specific guard's building
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: visitorData, error: visitorError } = await supabase
        .from("visitors")
        .select("*")
        .eq("company_id", currentCompanyId) 
        .gte("created_at", startOfToday.toISOString())
        .in("status", ["pending", "checked_in"])
        .order("created_at", { ascending: false });

      if (!visitorError) {
        setVisitors(visitorData || []);
      }
      setLoading(false);
    };

    initializeDashboard();

    // Set up Real-time listener
    const channel = supabase
      .channel("guard-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visitors" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setVisitors((prev) => [payload.new as Visitor, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.status === "checked_out" || payload.new.status === "auto_checked_out") {
              setVisitors((prev) => prev.filter((v) => v.id !== payload.new.id));
            } else {
              setVisitors((prev) =>
                prev.map((v) => (v.id === payload.new.id ? (payload.new as Visitor) : v))
              );
            }
          } else if (payload.eventType === "DELETE") {
            setVisitors((prev) => prev.filter((v) => v.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  // --- OTP LOGIC ---
  const handleSendOTP = async (id: string, phone: string) => {
    let code = "";
    let isUnique = false;
    while (!isUnique) {
      code = Math.floor(1000 + Math.random() * 9000).toString();
      const { data } = await supabase.from("visitors").select("id").eq("otp_code", code).in("status", ["pending", "checked_in"]);
      if (!data || data.length === 0) isUnique = true; 
    }
    
    await supabase.from("visitors").update({ otp_code: code }).eq("id", id);
    setVerifyingId(id);
    setOtpInput("");

    try {
      await fetch("/api/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone, message: `Your building exit code is: ${code}` }),
      });
    } catch (err) {
      console.error(err);
      alert(`[SMS TEST] Code: ${code}`);
    }
  };

  const handleConfirmOTP = async (visitor: Visitor) => {
    const { data } = await supabase.from("visitors").select("otp_code").eq("id", visitor.id).single();
    if (!data || data.otp_code !== otpInput.trim()) return alert("Incorrect OTP.");
    
    await supabase.from("visitors").update({ status: "checked_in" }).eq("id", visitor.id);
    setVerifyingId(null);
  };

  const handleCheckOut = async (id: string) => {
    await supabase.from("visitors").update({ status: "checked_out", checked_out_at: new Date().toISOString() }).eq("id", id);
  };

  // --- UI Calculated Variables with Search & Status Filter ---
  const filteredVisitors = visitors.filter((v) => {
    const matchesSearch = v.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          v.phone?.includes(searchTerm) ||
                          v.id_number?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });
  
  const totalToday = visitors.length;
  const checkedInCount = visitors.filter(v => v.status === "checked_in").length;
  const pendingCount = visitors.filter(v => v.status === "pending").length;

  if (!companyId && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-red-600 font-medium">Error: Could not load guard profile. Are you logged in?</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 relative overflow-x-hidden">
      
      {/* --- ENHANCED BACKGROUND --- */}
      <div className="fixed inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      <div className="fixed top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[100px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-zinc-400/20 blur-[100px] pointer-events-none z-0" />
      {/* --------------------------- */}

      <div className="max-w-6xl mx-auto space-y-6 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Gate Dashboard</h1>
            <p className="text-zinc-500">Live visitor monitoring and verification.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={handleLogout} className="flex-1 sm:flex-initial border-zinc-200 text-zinc-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 bg-white/80 backdrop-blur-sm">
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
            <Button onClick={() => setShowAddModal(true)} className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 shadow-md">
              <UserPlus className="w-4 h-4 mr-2 hidden sm:inline-block" /> + New Visitor
            </Button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="bg-white/90 backdrop-blur-sm border-zinc-200/60 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">Total Today</p>
                <h3 className="text-3xl font-bold text-zinc-900 mt-1">{totalToday}</h3>
              </div>
              <div className="p-3 bg-zinc-100/80 text-zinc-600 rounded-full">
                <UserPlus className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur-sm border-zinc-200/60 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">Pending</p>
                <h3 className="text-3xl font-bold text-zinc-900 mt-1">{pendingCount}</h3>
              </div>
              <div className="p-3 bg-amber-100/80 text-amber-600 rounded-full">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/90 backdrop-blur-sm border-zinc-200/60 shadow-sm">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-zinc-500">Checked In</p>
                <h3 className="text-3xl font-bold text-zinc-900 mt-1">{checkedInCount}</h3>
              </div>
              <div className="p-3 bg-green-100/80 text-green-600 rounded-full">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Live Visitor Table */}
        <Card className="bg-white/90 backdrop-blur-sm border-zinc-200/60 shadow-sm">
          <CardHeader className="flex flex-col gap-4 border-b border-zinc-100/50 pb-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
              <CardTitle>Today's Active Visitors</CardTitle>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                  <Input 
                    placeholder="Search..." 
                    className="pl-9 w-full bg-white/80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex w-full sm:w-auto bg-zinc-100/80 p-1 rounded-md border border-zinc-200/60 overflow-x-auto">
                  <button
                    onClick={() => setStatusFilter("all")}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${statusFilter === "all" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500 hover:text-zinc-900"}`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setStatusFilter("pending")}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${statusFilter === "pending" ? "bg-white shadow-sm text-amber-700" : "text-zinc-500 hover:text-zinc-900"}`}
                  >
                    Pending
                  </button>
                  <button
                    onClick={() => setStatusFilter("checked_in")}
                    className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded transition-colors whitespace-nowrap ${statusFilter === "checked_in" ? "bg-white shadow-sm text-green-700" : "text-zinc-500 hover:text-zinc-900"}`}
                  >
                    Checked In
                  </button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {loading ? (
              <p className="text-zinc-500 py-4">Loading secure data...</p>
            ) : filteredVisitors.length === 0 ? (
              <p className="text-zinc-500 py-4">No active visitors match your search.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-zinc-200/50">
                      <TableHead>Time</TableHead>
                      <TableHead>Visitor Details</TableHead>
                      <TableHead>Phone & ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisitors.map((visitor) => (
                      <TableRow key={visitor.id} className="border-zinc-200/50 hover:bg-zinc-50/50">
                        <TableCell className="font-medium text-zinc-500">
                          {new Date(visitor.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </TableCell>
                        
                        {/* Photo and Name Column */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {visitor.photo_url ? (
                              <Image 
                                src={visitor.photo_url} 
                                alt={`${visitor.name}'s photo`} 
                                width={40}
                                height={40}
                                className="w-10 h-10 rounded-full object-cover border-2 border-zinc-200 cursor-pointer hover:opacity-80 transition-opacity bg-white"
                                onClick={() => setEnlargedPhoto(visitor.photo_url!)}
                                unoptimized
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center border-2 border-zinc-200 text-zinc-400">
                                <UserCircle className="w-6 h-6" />
                              </div>
                            )}
                            <span className="font-semibold whitespace-nowrap">{visitor.name}</span>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm">{visitor.phone || "—"}</div>
                          <div className="text-xs text-zinc-500">{visitor.id_number || "No ID"}</div>
                        </TableCell>
                        
                        <TableCell>
                          {visitor.status === "pending" ? (
                            <span className="inline-flex items-center rounded-full bg-amber-100/80 px-2.5 py-0.5 text-xs font-semibold text-amber-800 whitespace-nowrap border border-amber-200/50">Pending</span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-green-100/80 px-2.5 py-0.5 text-xs font-semibold text-green-800 whitespace-nowrap border border-green-200/50">Checked In</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right">
                          {visitor.status === "pending" ? (
                            verifyingId === visitor.id ? (
                              <div className="flex items-center justify-end gap-2">
                                <input 
                                  type="text" maxLength={4} placeholder="OTP"
                                  className="w-16 rounded border px-2 py-1 text-center text-sm bg-white"
                                  value={otpInput} onChange={(e) => setOtpInput(e.target.value)}
                                />
                                <Button size="sm" onClick={() => handleConfirmOTP(visitor)}>Confirm</Button>
                                <Button size="sm" variant="ghost" onClick={() => setVerifyingId(null)}>Cancel</Button>
                              </div>
                            ) : (
                              <Button size="sm" onClick={() => handleSendOTP(visitor.id, visitor.phone)} className="whitespace-nowrap bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-200 shadow-sm">Verify & Send OTP</Button>
                            )
                          ) : (
                            <Button size="sm" variant="secondary" onClick={() => handleCheckOut(visitor.id)} className="whitespace-nowrap bg-white/60 hover:bg-zinc-100 text-zinc-700 shadow-sm">Check Out</Button>
                          )}
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

      {/* --- ADD VISITOR MODAL COMPONENT --- */}
      <AddVisitorModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        companyId={companyId}
        requirePhoto={requirePhoto}
        askPhone={askPhone}
        askId={askId}
      />

      {/* --- ENLARGED PHOTO LIGHTBOX MODAL --- */}
      {enlargedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex flex-col items-center justify-center p-4 cursor-pointer backdrop-blur-sm" 
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