"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertOctagon, Flag, Loader2, Plus, X } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";

type RedFlag = {
  id: string;
  name: string;
  id_number: string;
  phone: string;
  reason: string;
};

export default function BlacklistPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [redFlags, setRedFlags] = useState<RedFlag[]>([]);
  const [loading, setLoading] = useState(true);

  // Red Flag Form State
  const [showRedFlagModal, setShowRedFlagModal] = useState(false);
  const [isSubmittingRedFlag, setIsSubmittingRedFlag] = useState(false);
  const [newRedFlag, setNewRedFlag] = useState({ name: "", id_number: "", phone: "", reason: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    
    if (authData?.user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", authData.user.id)
        .single();

      if (profileData?.company_id) {
        setCompanyId(profileData.company_id);
        
        // Fetch via secure API Route instead of direct client-side query
        try {
          const res = await fetch(`/api/red-flags?company_id=${profileData.company_id}`);
          if (res.ok) {
            const json = await res.json();
            if (json.data) setRedFlags(json.data);
          }
        } catch (err) {
          console.error("Error fetching red flags:", err);
        }
      }
    }
    setLoading(false);
  };

  const handleCreateRedFlag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) return;

    setIsSubmittingRedFlag(true);
    try {
      // Format phone number before saving
      let finalPhone = newRedFlag.phone;
      if (finalPhone && !finalPhone.startsWith('+')) {
        finalPhone = `+${finalPhone}`;
      }

      // Securely create via API route to bypass RLS blocks
      const response = await fetch('/api/red-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          name: newRedFlag.name,
          id_number: newRedFlag.id_number,
          phone: finalPhone,
          reason: newRedFlag.reason
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setNewRedFlag({ name: "", id_number: "", phone: "", reason: "" });
      setShowRedFlagModal(false);
      fetchData(); // Refresh list
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to add red flag. Make sure the API route exists.");
    } finally {
      setIsSubmittingRedFlag(false);
    }
  };

  const handleDeleteRedFlag = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to remove the red flag for ${name}? They will be allowed to enter the building again.`);
    if (!confirmDelete) return;

    try {
      // Securely delete via API route
      const response = await fetch(`/api/red-flags?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setRedFlags((prev) => prev.filter((r) => r.id !== id));
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to remove red flag.");
    }
  };

  if (!companyId && !loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 text-center max-w-md shadow-sm">
          <AlertOctagon className="w-10 h-10 mb-3 mx-auto" />
          <h2 className="font-bold text-lg">Profile Error</h2>
          <p className="text-sm mt-1">Could not verify your building manager profile. Please log in again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-zinc-200 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 text-red-700 rounded-lg shrink-0">
              <AlertOctagon className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Restricted Access</h1>
              <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage blacklisted individuals blocked from checking in.</p>
            </div>
          </div>
          <Button onClick={() => setShowRedFlagModal(true)} variant="destructive" className="w-full sm:w-auto h-11 shadow-sm">
            <Plus className="mr-2 h-5 w-5" /> Add Red Flag
          </Button>
        </div>

        {/* RED FLAGS / BLACKLIST TABLE */}
        <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
          <CardHeader className="bg-white border-b border-zinc-100 pb-5">
            <CardTitle className="text-xl">Blacklisted Visitors</CardTitle>
            <CardDescription>These individuals will be strictly prohibited from passing the security gates.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-6 bg-zinc-50/30">
            {loading ? (
               <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>
            ) : redFlags.length === 0 ? (
               <div className="text-center py-16 text-zinc-500 bg-white sm:rounded-xl border border-dashed border-zinc-200 m-0 sm:m-2">
                 <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100 shadow-sm">
                    <Flag className="w-8 h-8 text-zinc-300" />
                 </div>
                 <p className="font-bold text-zinc-800 text-lg">No visitors blacklisted.</p>
                 <p className="text-sm mt-1 max-w-sm mx-auto text-zinc-500">Your building is safe and clear of any restricted individuals.</p>
               </div>
            ) : (
              <div className="rounded-none sm:rounded-md border-y sm:border overflow-x-auto bg-white shadow-sm">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="whitespace-nowrap pl-4 sm:pl-6">Name</TableHead>
                      <TableHead className="whitespace-nowrap">ID Number</TableHead>
                      <TableHead className="whitespace-nowrap">Phone Number</TableHead>
                      <TableHead className="whitespace-nowrap">Reason for Restriction</TableHead>
                      <TableHead className="whitespace-nowrap text-right pr-4 sm:pr-6">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {redFlags.map((flag) => (
                      <TableRow key={flag.id} className="hover:bg-red-50/30 transition-colors">
                        <TableCell className="font-bold text-zinc-900 whitespace-nowrap pl-4 sm:pl-6">{flag.name}</TableCell>
                        <TableCell className="font-mono text-zinc-600 whitespace-nowrap bg-zinc-50/50">{flag.id_number}</TableCell>
                        <TableCell className="font-mono text-zinc-600 whitespace-nowrap">{flag.phone}</TableCell>
                        <TableCell className="text-zinc-600 max-w-[300px] truncate" title={flag.reason}>{flag.reason}</TableCell>
                        <TableCell className="text-right whitespace-nowrap pr-4 sm:pr-6">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleDeleteRedFlag(flag.id, flag.name)}
                            className="h-8 px-3 text-zinc-600 border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900 transition-colors shadow-sm"
                            title="Remove from Blacklist"
                          >
                            <X className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline font-semibold">Pardon</span>
                          </Button>
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

      {/* --- ADD RED FLAG MODAL --- */}
      {showRedFlagModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl relative border-0 rounded-xl overflow-hidden bg-white">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-red-600"></div>
            <button 
              onClick={() => setShowRedFlagModal(false)} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full p-1.5 transition-colors"
            >
              <X size={18} />
            </button>
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-xl font-bold text-red-700 flex items-center gap-2">
                <AlertOctagon className="h-5 w-5" /> Block Visitor
              </CardTitle>
              <CardDescription className="text-zinc-500">Prevent a specific individual from registering at any gate.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRedFlag} className="space-y-4">
                <div>
                  <Label className="font-semibold text-zinc-700">Visitor Name <span className="text-red-500">*</span></Label>
                  <Input 
                    required 
                    placeholder="e.g. John Doe" 
                    value={newRedFlag.name} 
                    onChange={(e) => setNewRedFlag({...newRedFlag, name: e.target.value})} 
                    className="h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-red-600 transition-colors"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="font-semibold text-zinc-700">ID Number <span className="text-red-500">*</span></Label>
                    <Input 
                      required 
                      placeholder="e.g. 12345678" 
                      value={newRedFlag.id_number} 
                      onChange={(e) => setNewRedFlag({...newRedFlag, id_number: e.target.value})} 
                      className="h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-red-600 transition-colors"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-zinc-700">Phone Number <span className="text-red-500">*</span></Label>
                    <PhoneInput 
                      country="ke" 
                      value={newRedFlag.phone} 
                      onChange={phone => setNewRedFlag({ ...newRedFlag, phone })} 
                      inputClass="!w-full !h-11 !text-zinc-900 !bg-zinc-50 !rounded-md !border !border-zinc-300 focus:!ring-2 focus:!ring-red-600 px-3" 
                      containerClass="w-full" 
                      buttonClass="!border-zinc-300 !bg-zinc-50 !rounded-l-md hover:!bg-zinc-100"
                    />
                  </div>
                </div>

                <p className="text-xs text-zinc-500 mt-1.5 leading-snug">
                  The system will block future check-ins if the visitor matches ANY of these details.
                </p>

                <div>
                  <Label className="font-semibold text-zinc-700">Reason for Restriction <span className="text-red-500">*</span></Label>
                  <Input 
                    required 
                    placeholder="e.g. Hostile behavior, banned by management" 
                    value={newRedFlag.reason} 
                    onChange={(e) => setNewRedFlag({...newRedFlag, reason: e.target.value})} 
                    className="h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-red-600 transition-colors"
                  />
                </div>
                
                <div className="pt-4">
                  <Button type="submit" variant="destructive" className="w-full h-12 text-base font-bold shadow-sm transition-transform active:scale-[0.98]" disabled={isSubmittingRedFlag}>
                    {isSubmittingRedFlag ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      "Add to Blacklist"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}