"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Camera, Loader2, X } from "lucide-react";

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
};

export default function GuardDashboard() {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // NEW: State to securely hold the logged-in guard's assigned building/company
  const [companyId, setCompanyId] = useState<string | null>(null);

  // OTP State
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");

  // Add Visitor Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVisitor, setNewVisitor] = useState({ name: "", phone: "", id_number: "", doc_type: "National ID" });
  
  // OCR Camera State
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      // 3. Save it to state!
      const currentCompanyId = profileData.company_id;
      setCompanyId(currentCompanyId);

      // 4. Fetch ONLY the visitors for this specific guard's building
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const { data: visitorData, error: visitorError } = await supabase
        .from("visitors")
        .select("*")
        .eq("company_id", currentCompanyId) // SECURITY: Filtering applied here!
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
          // If you have Supabase RLS policies enabled, it will automatically
          // prevent guards from receiving broadcast events for other buildings.
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

  // --- OCR SCANNING LOGIC ---
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64data }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          setNewVisitor((prev) => ({
            ...prev,
            name: result.data.FullName,
            id_number: result.data.IDNumber,
          }));
        } else {
          alert("Could not read the ID clearly. Please type it manually.");
        }
        setIsScanning(false);
      };
    } catch (error) {
      console.error(error);
      setIsScanning(false);
      alert("Error scanning ID. Please try manually.");
    }
  };

  // --- ADD VISITOR LOGIC ---
  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Safety check to make sure the companyId is loaded before allowing registration
    if (!companyId) {
      alert("Could not identify your building assignment. Please refresh the page.");
      return;
    }

    const { error } = await supabase.from("visitors").insert([
      {
        company_id: companyId, // Dynamically assigning the company!
        name: newVisitor.name,
        phone: newVisitor.phone,
        document_type: newVisitor.doc_type,
        id_number: newVisitor.id_number,
        status: "pending",
      }
    ]);

    if (error) {
      alert("Failed to add visitor.");
    } else {
      setShowAddModal(false);
      setNewVisitor({ name: "", phone: "", id_number: "", doc_type: "National ID" });
    }
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

  if (!companyId && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-red-600 font-medium">Error: Could not load guard profile. Are you logged in?</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 relative">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Gate Dashboard</h1>
            <p className="text-zinc-500">Live visitor monitoring and verification.</p>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-blue-600 hover:bg-blue-700">
            + New Visitor
          </Button>
        </div>

        {/* Live Visitor Table */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Active Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-zinc-500 py-4">Loading secure data...</p>
            ) : visitors.length === 0 ? (
              <p className="text-zinc-500 py-4">No active visitors at the moment.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitors.map((visitor) => (
                    <TableRow key={visitor.id}>
                      <TableCell className="font-medium text-zinc-500">
                        {new Date(visitor.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="font-semibold">{visitor.name}</TableCell>
                      <TableCell>{visitor.phone}</TableCell>
                      <TableCell>
                        {visitor.status === "pending" ? (
                          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Pending</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">Checked In</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {visitor.status === "pending" ? (
                          verifyingId === visitor.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <input 
                                type="text" maxLength={4} placeholder="OTP"
                                className="w-16 rounded border px-2 py-1 text-center text-sm"
                                value={otpInput} onChange={(e) => setOtpInput(e.target.value)}
                              />
                              <Button size="sm" onClick={() => handleConfirmOTP(visitor)}>Confirm</Button>
                              <Button size="sm" variant="ghost" onClick={() => setVerifyingId(null)}>Cancel</Button>
                            </div>
                          ) : (
                            <Button size="sm" onClick={() => handleSendOTP(visitor.id, visitor.phone)}>Verify & Send OTP</Button>
                          )
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => handleCheckOut(visitor.id)}>Check Out</Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- ADD VISITOR MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black">
              <X size={20} />
            </button>
            <CardHeader>
              <CardTitle>Register Visitor</CardTitle>
            </CardHeader>
            <CardContent>
              {/* HIDDEN FILE INPUT (Triggers Camera on mobile) */}
              <input 
                type="file" accept="image/*" capture="environment" 
                className="hidden" ref={fileInputRef} onChange={handleImageCapture} 
              />
              
              <Button 
                variant="outline" 
                className="w-full mb-6 border-dashed border-2 py-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
                onClick={() => fileInputRef.current?.click()}
                disabled={isScanning}
              >
                {isScanning ? (
                  <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing ID Card...</>
                ) : (
                  <><Camera className="mr-2 h-5 w-5" /> Tap to Scan ID Card</>
                )}
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-500">Or enter manually</span></div>
              </div>

              <form onSubmit={handleAddVisitor} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input required value={newVisitor.name} onChange={(e) => setNewVisitor({...newVisitor, name: e.target.value})} placeholder="e.g. John Doe" />
                </div>
                <div>
                  <Label>Phone Number</Label>
                  <Input required type="tel" value={newVisitor.phone} onChange={(e) => setNewVisitor({...newVisitor, phone: e.target.value})} placeholder="0700000000" />
                </div>
                <div>
                  <Label>ID Number</Label>
                  <Input value={newVisitor.id_number} onChange={(e) => setNewVisitor({...newVisitor, id_number: e.target.value})} placeholder="Optional if scanning" />
                </div>
                <Button type="submit" className="w-full mt-4">Add to Pending List</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}