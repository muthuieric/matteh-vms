"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ShieldAlert, Trash2, X, Plus, Loader2, UserX } from "lucide-react";

type GuardProfile = {
  id: string;
  full_name: string;
  role: string;
};

export default function ManageGuards() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [guards, setGuards] = useState<GuardProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newGuard, setNewGuard] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    fetchGuards();
  }, []);

  const fetchGuards = async () => {
    setLoading(true);
    // 1. Get logged-in Admin's profile
    const { data: authData } = await supabase.auth.getUser();
    
    if (authData?.user) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", authData.user.id)
        .single();

      if (profileData?.company_id) {
        setCompanyId(profileData.company_id);
        
        // 2. Fetch all profiles that belong to this building AND have the 'guard' role
        const { data: guardsData } = await supabase
          .from("profiles")
          .select("*")
          .eq("company_id", profileData.company_id)
          .eq("role", "guard")
          .order("created_at", { ascending: false });

        setGuards(guardsData || []);
      }
    }
    setLoading(false);
  };

  const handleCreateGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/guards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: newGuard.name,
          email: newGuard.email,
          password: newGuard.password,
          companyId: companyId,
        }),
      });

      const result = await response.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        // Clear form and refresh list
        setNewGuard({ name: "", email: "", password: "" });
        setShowModal(false);
        fetchGuards(); 
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong connecting to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuard = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to PERMANENTLY delete ${name}'s account?`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/guards?id=${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        // Remove from the screen instantly
        setGuards((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete guard.");
    }
  };

  if (!companyId && !loading) {
    return (
      <div className="min-h-screen p-6 md:p-10 flex items-center justify-center">
        <div className="bg-red-50 text-red-700 p-6 rounded-xl border border-red-200 flex flex-col items-center max-w-md text-center shadow-sm">
          <ShieldAlert className="w-10 h-10 mb-3" />
          <h2 className="font-bold text-lg">Profile Error</h2>
          <p className="text-sm mt-1">Could not verify your building manager profile. Please try logging out and back in.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-zinc-200 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg shrink-0">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Security Team</h1>
              <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage gate access accounts for your guards.</p>
            </div>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto h-11 shadow-sm">
            <Plus className="mr-2 h-5 w-5" /> Add New Guard
          </Button>
        </div>

        {/* Guards Table */}
        <Card className="shadow-sm border-zinc-200 bg-white">
          <CardHeader className="pb-4">
            <CardTitle>Active Guard Accounts</CardTitle>
            <CardDescription>Personnel authorized to log into the Gate Dashboard.</CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-6 sm:pt-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-600" />
                <p className="font-medium">Loading security profiles...</p>
              </div>
            ) : guards.length === 0 ? (
              <div className="text-center py-16 bg-zinc-50 sm:rounded-xl sm:border border-dashed border-zinc-200 m-0 sm:m-2">
                <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm border border-zinc-100">
                  <UserX className="w-8 h-8 text-zinc-400" />
                </div>
                <p className="text-zinc-900 font-bold text-lg">No guards registered</p>
                <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">Click "Add New Guard" to create login credentials for your security personnel.</p>
              </div>
            ) : (
              <div className="rounded-none sm:rounded-md border-y sm:border overflow-x-auto">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead className="whitespace-nowrap pl-4 sm:pl-6">Guard Details</TableHead>
                      <TableHead className="whitespace-nowrap">System ID</TableHead>
                      <TableHead className="whitespace-nowrap text-right pr-4 sm:pr-6">Manage Access</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guards.map((guard) => {
                      return (
                        <TableRow key={guard.id} className="hover:bg-zinc-50/80 transition-colors">
                          
                          {/* Name Column */}
                          <TableCell className="pl-4 sm:pl-6">
                            <div className="font-bold whitespace-nowrap text-zinc-900">
                              {guard.full_name}
                            </div>
                          </TableCell>
                          
                          <TableCell className="font-mono text-xs text-zinc-400 whitespace-nowrap">
                            {guard.id.substring(0, 8)}...
                          </TableCell>
                          
                          {/* Actions */}
                          <TableCell className="text-right pr-4 sm:pr-6 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleDeleteGuard(guard.id, guard.full_name)}
                                className="h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                                title="Permanently Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- ADD GUARD MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl relative border-0 rounded-xl overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full p-1.5 transition-colors"
            >
              <X size={18} />
            </button>
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-xl font-bold">Create Guard Account</CardTitle>
              <CardDescription>They will use these credentials to log into the gate tablet.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGuard} className="space-y-4">
                <div>
                  <Label className="font-semibold text-zinc-700">Full Name</Label>
                  <Input 
                    required 
                    placeholder="e.g. David Ochieng" 
                    value={newGuard.name} 
                    onChange={(e) => setNewGuard({...newGuard, name: e.target.value})} 
                    className="h-11 bg-zinc-50 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <Label className="font-semibold text-zinc-700">Email Address</Label>
                  <Input 
                    required 
                    type="email" 
                    placeholder="david@building.com" 
                    value={newGuard.email} 
                    onChange={(e) => setNewGuard({...newGuard, email: e.target.value})} 
                    className="h-11 bg-zinc-50 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <Label className="font-semibold text-zinc-700">Initial Password</Label>
                  <Input 
                    required 
                    type="password" 
                    placeholder="Min 6 characters"
                    minLength={6}
                    value={newGuard.password} 
                    onChange={(e) => setNewGuard({...newGuard, password: e.target.value})} 
                    className="h-11 bg-zinc-50 focus:bg-white transition-colors"
                  />
                </div>
                
                <div className="pt-4">
                  <Button type="submit" className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-sm transition-transform active:scale-[0.98]" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating Account...</>
                    ) : (
                      "Create Guard Account"
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