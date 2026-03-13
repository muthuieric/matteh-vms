"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ShieldAlert, Trash2, X, Plus } from "lucide-react";

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
          .eq("role", "guard");

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
    const confirmDelete = window.confirm(`Are you sure you want to permanently revoke access for ${name}?`);
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
      <div className="p-6 text-red-600 font-medium flex items-center">
        <ShieldAlert className="mr-2" /> Error: Could not verify your building manager profile.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex justify-between items-end border-b border-zinc-200 pb-4">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 flex items-center">
              <Shield className="mr-3 h-8 w-8 text-blue-600" />
              Security Team
            </h1>
            <p className="text-zinc-500 mt-1">Manage gate access accounts for your guards.</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Add Guard
          </Button>
        </div>

        {/* Guards Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Active Guard Accounts</CardTitle>
            <CardDescription>Personnel authorized to log into the Gate Dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-zinc-500 py-4">Loading security profiles...</p>
            ) : guards.length === 0 ? (
              <div className="text-center py-10 bg-zinc-50 rounded-lg border border-dashed border-zinc-200">
                <p className="text-zinc-500 font-medium">No guards registered yet.</p>
                <p className="text-sm text-zinc-400 mt-1">Click "Add Guard" to create their login credentials.</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader className="bg-zinc-50">
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>System ID</TableHead>
                      <TableHead>Account Status</TableHead>
                      <TableHead className="text-right">Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guards.map((guard) => (
                      <TableRow key={guard.id}>
                        <TableCell className="font-semibold text-zinc-900">
                          {guard.full_name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-zinc-500">
                          {guard.id.substring(0, 8)}...
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                            Active
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteGuard(guard.id, guard.full_name)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      {/* --- ADD GUARD MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative">
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-black"
            >
              <X size={20} />
            </button>
            <CardHeader>
              <CardTitle>Create Guard Account</CardTitle>
              <CardDescription>They will use these credentials to log into the gate tablet.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGuard} className="space-y-4">
                <div>
                  <Label>Full Name</Label>
                  <Input 
                    required 
                    placeholder="e.g. David Ochieng" 
                    value={newGuard.name} 
                    onChange={(e) => setNewGuard({...newGuard, name: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input 
                    required 
                    type="email" 
                    placeholder="david@building.com" 
                    value={newGuard.email} 
                    onChange={(e) => setNewGuard({...newGuard, email: e.target.value})} 
                  />
                </div>
                <div>
                  <Label>Initial Password</Label>
                  <Input 
                    required 
                    type="password" 
                    placeholder="Min 6 characters"
                    minLength={6}
                    value={newGuard.password} 
                    onChange={(e) => setNewGuard({...newGuard, password: e.target.value})} 
                  />
                </div>
                
                <div className="pt-4">
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                    {isSubmitting ? "Creating Account..." : "Create Account"}
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