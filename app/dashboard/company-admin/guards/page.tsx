"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield, ShieldAlert, Trash2, X, Plus, Loader2, UserX, DoorOpen, Pencil } from "lucide-react";

type GuardProfile = {
  id: string;
  full_name: string;
  role: string;
  gate_id: string | null;
};

type Gate = {
  id: string;
  name: string;
};

export default function ManageGuards() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [guards, setGuards] = useState<GuardProfile[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Guard Modal State
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newGuard, setNewGuard] = useState({ name: "", email: "", password: "", gateId: "" });

  // Edit Guard Modal State
  const [showEditGuardModal, setShowEditGuardModal] = useState(false);
  const [isEditingGuard, setIsEditingGuard] = useState(false);
  const [editingGuardData, setEditingGuardData] = useState({ id: "", name: "", gateId: "" });

  // Gate Form State
  const [newGateName, setNewGateName] = useState("");
  const [isCreatingGate, setIsCreatingGate] = useState(false);
  
  // Gate Edit State
  const [editingGateId, setEditingGateId] = useState<string | null>(null);
  const [editingGateName, setEditingGateName] = useState("");
  const [isUpdatingGate, setIsUpdatingGate] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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

        // 3. Fetch all gates for this company
        try {
          const gatesRes = await fetch(`/api/gates?company_id=${profileData.company_id}`);
          if (gatesRes.ok) {
             const gatesJson = await gatesRes.json();
             if (gatesJson.data) setGates(gatesJson.data);
          }
        } catch (error) {
           console.error("Error fetching gates:", error);
        }
      }
    }
    setLoading(false);
  };

  // --- GATE CRUD FUNCTIONS ---
  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newGateName.trim()) return;

    setIsCreatingGate(true);
    try {
      const response = await fetch('/api/gates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, name: newGateName })
      });
      
      const result = await response.json();

      if (!response.ok) {
        console.error("API Error:", result.error);
        alert(`Failed to create gate: ${result.error}`);
        return;
      }

      if (result.data) {
        setGates([...gates, result.data]);
        setNewGateName("");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred while creating the gate.");
    } finally {
      setIsCreatingGate(false);
    }
  };

  const handleUpdateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGateId || !editingGateName.trim()) return;

    setIsUpdatingGate(true);
    try {
      const response = await fetch('/api/gates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingGateId, name: editingGateName })
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Failed to update gate: ${result.error}`);
        return;
      }

      // Update UI locally
      setGates(gates.map(g => g.id === editingGateId ? { ...g, name: editingGateName } : g));
      setEditingGateId(null);
      setEditingGateName("");

    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred while updating the gate.");
    } finally {
      setIsUpdatingGate(false);
    }
  };

  const handleDeleteGate = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete the gate "${name}"?\n\nAny guards assigned to this gate will become Unassigned.`);
    if (!confirmDelete) return;

    try {
      const response = await fetch(`/api/gates?id=${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        alert(`Failed to delete gate: ${result.error}`);
        return;
      }

      // Remove the gate from the screen instantly
      setGates((prev) => prev.filter((g) => g.id !== id));
      
      // Update any guards that were assigned to this gate locally to show as "Unassigned"
      setGuards((prev) => prev.map(g => g.gate_id === id ? { ...g, gate_id: null } : g));

    } catch (error) {
      console.error("Unexpected error:", error);
      alert("An unexpected error occurred while deleting the gate.");
    }
  };

  // --- GUARD CRUD FUNCTIONS ---
  const handleCreateGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("Session expired. Please log in again.");
        return;
      }

      const response = await fetch("/api/guards", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({
          fullName: newGuard.name,
          email: newGuard.email,
          password: newGuard.password,
          companyId: companyId,
          gateId: newGuard.gateId === "" ? null : newGuard.gateId, 
        }),
      });

      const result = await response.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        setNewGuard({ name: "", email: "", password: "", gateId: "" });
        setShowModal(false);
        fetchData(); 
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong connecting to the server.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGuard = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditingGuard(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("Session expired. Please log in again.");
        return;
      }

      const response = await fetch("/api/guards", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}` 
        },
        body: JSON.stringify({
          id: editingGuardData.id,
          fullName: editingGuardData.name,
          gateId: editingGuardData.gateId === "" ? null : editingGuardData.gateId, 
        }),
      });

      const result = await response.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        setShowEditGuardModal(false);
        fetchData(); // Refresh the list
      }
    } catch (error) {
      console.error(error);
      alert("Something went wrong updating the guard.");
    } finally {
      setIsEditingGuard(false);
    }
  };

  const handleDeleteGuard = async (id: string, name: string) => {
    const confirmDelete = window.confirm(`Are you sure you want to PERMANENTLY delete ${name}'s account?`);
    if (!confirmDelete) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("Session expired. Please log in again.");
        return;
      }

      const response = await fetch(`/api/guards?id=${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${session.access_token}` 
        }
      });

      const result = await response.json();

      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        setGuards((prev) => prev.filter((g) => g.id !== id));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to delete guard.");
    }
  };

  const getGateName = (gateId: string | null) => {
    if (!gateId) return "Unassigned";
    const gate = gates.find(g => g.id === gateId);
    return gate ? gate.name : "Unknown Gate";
  };

  const openEditGuardModal = (guard: GuardProfile) => {
    setEditingGuardData({
      id: guard.id,
      name: guard.full_name,
      gateId: guard.gate_id || "",
    });
    setShowEditGuardModal(true);
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
            <div className="p-3 bg-zinc-200 text-zinc-900 rounded-lg shrink-0">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Security Team</h1>
              <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage gates and guard access accounts.</p>
            </div>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto h-11 shadow-sm">
            <Plus className="mr-2 h-5 w-5" /> Add New Guard
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Gates Management Section */}
            <Card className="shadow-sm border-zinc-200 bg-white md:col-span-1 h-fit">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <DoorOpen className="h-5 w-5" /> Building Gates
                    </CardTitle>
                    <CardDescription>Define entry points.</CardDescription>
                </CardHeader>
                <CardContent>
                     <form onSubmit={handleCreateGate} className="flex gap-2 mb-6">
                        <Input 
                            placeholder="e.g. Main Gate" 
                            value={newGateName}
                            onChange={(e) => setNewGateName(e.target.value)}
                            required
                        />
                        <Button type="submit" disabled={isCreatingGate || !newGateName.trim()} className="bg-zinc-900 hover:bg-zinc-800 text-white">
                            {isCreatingGate ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                        </Button>
                     </form>

                     <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        {gates.length === 0 ? (
                             <p className="text-sm text-zinc-500 text-center py-4 border rounded-md border-dashed">No gates created yet.</p>
                        ) : (
                            gates.map((gate) => (
                                <div key={gate.id} className="p-3 border border-zinc-200 rounded-md bg-zinc-50 flex flex-col justify-center transition-colors">
                                  {editingGateId === gate.id ? (
                                    <form onSubmit={handleUpdateGate} className="flex gap-2 w-full items-center">
                                      <Input 
                                        value={editingGateName} 
                                        onChange={(e) => setEditingGateName(e.target.value)} 
                                        className="h-8 text-sm"
                                        autoFocus
                                      />
                                      <Button type="submit" size="sm" disabled={isUpdatingGate} className="h-8 px-2 bg-blue-600 hover:bg-blue-700 text-white">
                                        Save
                                      </Button>
                                      <Button type="button" size="sm" variant="ghost" onClick={() => setEditingGateId(null)} className="h-8 px-2">
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </form>
                                  ) : (
                                    <div className="flex items-center justify-between w-full">
                                      <span className="font-medium text-sm text-zinc-900">{gate.name}</span>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => {
                                            setEditingGateId(gate.id);
                                            setEditingGateName(gate.name);
                                          }}
                                          className="h-7 w-7 p-0 text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-all"
                                          title="Edit Gate"
                                        >
                                          <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDeleteGate(gate.id, gate.name)}
                                          className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 transition-all"
                                          title="Delete Gate"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                            ))
                        )}
                     </div>
                </CardContent>
            </Card>

            {/* Guards Table Section */}
            <Card className="shadow-sm border-zinc-200 bg-white md:col-span-2">
            <CardHeader className="pb-4">
                <CardTitle>Active Guard Accounts</CardTitle>
                <CardDescription>Personnel authorized to log into the Gate Dashboard.</CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6 sm:pt-0">
                {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-3 text-zinc-900" />
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
                        <TableHead className="whitespace-nowrap">Assigned Gate</TableHead>
                        <TableHead className="whitespace-nowrap text-right pr-4 sm:pr-6">Actions</TableHead>
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
                            
                            {/* Assigned Gate Column */}
                            <TableCell className="whitespace-nowrap">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${guard.gate_id ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10' : 'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20'}`}>
                                    {getGateName(guard.gate_id)}
                                </span>
                            </TableCell>
                            
                            {/* Actions */}
                            <TableCell className="text-right pr-4 sm:pr-6 whitespace-nowrap">
                                <div className="flex items-center justify-end gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => openEditGuardModal(guard)}
                                    className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                                    title="Edit Guard"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
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
      </div>

      {/* --- ADD GUARD MODAL --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl relative border-0 rounded-xl overflow-hidden bg-white">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-zinc-900"></div>
            <button 
              onClick={() => setShowModal(false)} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full p-1.5 transition-colors"
            >
              <X size={18} />
            </button>
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-xl font-bold text-zinc-900">Create Guard Account</CardTitle>
              <CardDescription className="text-zinc-500">They will use these credentials to log into the gate tablet.</CardDescription>
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
                    className="h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-colors"
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
                    className="h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-colors"
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
                    className="h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-colors"
                  />
                </div>
                
                {/* Gate Assignment Dropdown */}
                <div>
                    <Label className="font-semibold text-zinc-700">Assign to Gate</Label>
                    <select
                        className="flex h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 transition-colors"
                        value={newGuard.gateId}
                        onChange={(e) => setNewGuard({...newGuard, gateId: e.target.value})}
                    >
                        <option value="">Unassigned (Can access all)</option>
                        {gates.map((gate) => (
                            <option key={gate.id} value={gate.id}>
                                {gate.name}
                            </option>
                        ))}
                    </select>
                     <p className="text-xs text-zinc-500 mt-1">Select which gate this guard will manage.</p>
                </div>
                
                <div className="pt-4">
                  <Button type="submit" className="w-full h-12 text-base font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm transition-transform active:scale-[0.98]" disabled={isSubmitting}>
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

      {/* --- EDIT GUARD MODAL --- */}
      {showEditGuardModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md shadow-2xl relative border-0 rounded-xl overflow-hidden bg-white">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600"></div>
            <button 
              onClick={() => setShowEditGuardModal(false)} 
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full p-1.5 transition-colors"
            >
              <X size={18} />
            </button>
            <CardHeader className="pt-8 pb-4">
              <CardTitle className="text-xl font-bold text-zinc-900">Edit Guard Profile</CardTitle>
              <CardDescription className="text-zinc-500">Update the guard's name or assigned gate location.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateGuard} className="space-y-4">
                <div>
                  <Label className="font-semibold text-zinc-700">Full Name</Label>
                  <Input 
                    required 
                    value={editingGuardData.name} 
                    onChange={(e) => setEditingGuardData({...editingGuardData, name: e.target.value})} 
                    className="h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-600 transition-colors"
                  />
                </div>
                
                {/* Gate Assignment Dropdown */}
                <div>
                    <Label className="font-semibold text-zinc-700">Assigned Gate</Label>
                    <select
                        className="flex h-11 w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 transition-colors"
                        value={editingGuardData.gateId}
                        onChange={(e) => setEditingGuardData({...editingGuardData, gateId: e.target.value})}
                    >
                        <option value="">Unassigned (Can access all)</option>
                        {gates.map((gate) => (
                            <option key={gate.id} value={gate.id}>
                                {gate.name}
                            </option>
                        ))}
                    </select>
                </div>
                
                <div className="pt-4">
                  <Button type="submit" className="w-full h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-transform active:scale-[0.98]" disabled={isEditingGuard}>
                    {isEditingGuard ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      "Save Changes"
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