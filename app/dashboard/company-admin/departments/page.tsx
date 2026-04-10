"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Pencil, Trash2, X, Loader2 } from "lucide-react";

type Department = { id: string; name: string };
type Host = { id: string; name: string; phone: string; email: string; department_id: string };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Create Form States
  const [newDeptName, setNewDeptName] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [newHost, setNewHost] = useState({ name: "", phone: "", email: "" });

  // Edit Department States
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingDeptName, setEditingDeptName] = useState("");
  const [isUpdatingDept, setIsUpdatingDept] = useState(false);

  // Edit Host States
  const [editingHostId, setEditingHostId] = useState<string | null>(null);
  const [editingHostData, setEditingHostData] = useState({ name: "", phone: "", email: "" });
  const [isUpdatingHost, setIsUpdatingHost] = useState(false);

  useEffect(() => {
    fetchCompanyData();
  }, []);

  const fetchCompanyData = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("No session found", sessionError);
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        alert(`Error fetching profile: ${profileError.message}`);
        setIsLoading(false);
        return;
      }

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
        await loadDepartmentsAndHosts(profile.company_id);
      } else {
        alert("Warning: Your profile does not have an assigned company_id.");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDepartmentsAndHosts = async (compId: string) => {
    try {
      const deptsRes = await fetch(`/api/departments?company_id=${compId}`);
      if (deptsRes.ok) {
        const deptsJson = await deptsRes.json();
        if (deptsJson.data) setDepartments(deptsJson.data);
      }

      const hostsRes = await fetch(`/api/hosts?company_id=${compId}`);
      if (hostsRes.ok) {
        const hostsJson = await hostsRes.json();
        if (hostsJson.data) setHosts(hostsJson.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  // --- DEPARTMENT CRUD ---
  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !newDeptName.trim()) return;

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, name: newDeptName })
      });
      
      const result = await response.json();
      if (!response.ok) return alert(`Failed to save: ${result.error}`);

      if (result.data) {
        setDepartments([...departments, result.data]);
        setNewDeptName("");
      }
    } catch (err) {
      alert("An unexpected error occurred while saving.");
    }
  };

  const handleUpdateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDeptId || !editingDeptName.trim()) return;

    setIsUpdatingDept(true);
    try {
      const response = await fetch('/api/departments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingDeptId, name: editingDeptName })
      });

      const result = await response.json();
      if (!response.ok) {
        alert(`Failed to update department: ${result.error}`);
        return;
      }

      setDepartments(departments.map(d => d.id === editingDeptId ? { ...d, name: editingDeptName } : d));
      setEditingDeptId(null);
    } catch (error) {
      alert("An error occurred while updating the department.");
    } finally {
      setIsUpdatingDept(false);
    }
  };

  const handleDeleteDepartment = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the "${name}" department?\n\nAny hosts inside this department will also be removed.`)) return;

    try {
      const response = await fetch(`/api/departments?id=${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) return alert(`Failed to delete: ${result.error}`);

      setDepartments(departments.filter(d => d.id !== id));
      setHosts(hosts.filter(h => h.department_id !== id)); // Remove associated hosts locally
    } catch (error) {
      alert("An error occurred while deleting.");
    }
  };

  // --- HOST CRUD ---
  const handleAddHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !selectedDeptId || !newHost.name) return;

    try {
      const response = await fetch('/api/hosts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          company_id: companyId, 
          department_id: selectedDeptId, 
          name: newHost.name, 
          phone: newHost.phone, 
          email: newHost.email 
        })
      });
      
      const result = await response.json();
      if (!response.ok) return alert(`Failed to save host: ${result.error}`);

      if (result.data) {
        setHosts([...hosts, result.data]);
        setNewHost({ name: "", phone: "", email: "" });
        setSelectedDeptId(null);
      }
    } catch (err) {
      alert("An unexpected error occurred while saving.");
    }
  };

  const handleUpdateHost = async (hostId: string) => {
    if (!editingHostData.name.trim()) return alert("Host name is required.");

    setIsUpdatingHost(true);
    try {
      const response = await fetch('/api/hosts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: hostId, 
          name: editingHostData.name,
          phone: editingHostData.phone,
          email: editingHostData.email
        })
      });

      const result = await response.json();
      if (!response.ok) {
        alert(`Failed to update host: ${result.error}`);
        return;
      }

      setHosts(hosts.map(h => h.id === hostId ? { ...h, ...editingHostData } : h));
      setEditingHostId(null);
    } catch (error) {
      alert("An error occurred while updating the host.");
    } finally {
      setIsUpdatingHost(false);
    }
  };

  const handleDeleteHost = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the host "${name}"?`)) return;

    try {
      const response = await fetch(`/api/hosts?id=${id}`, { method: 'DELETE' });
      const result = await response.json();

      if (!response.ok) return alert(`Failed to delete: ${result.error}`);

      setHosts(hosts.filter(h => h.id !== id));
    } catch (error) {
      alert("An error occurred while deleting.");
    }
  };


  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading your workspace...</div>;
  }

  // Smart Filter Logic
  const filteredDepartments = departments.map(dept => {
    const matchesDept = dept.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchingHosts = hosts.filter(h => 
      h.department_id === dept.id && 
      (
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.phone && h.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.email && h.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );
    
    const hostsToDisplay = matchesDept ? hosts.filter(h => h.department_id === dept.id) : matchingHosts;
    
    return {
      ...dept,
      hostsToDisplay,
      isVisible: matchesDept || matchingHosts.length > 0
    };
  }).filter(d => d.isVisible);

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Departments & Hosts</h1>
        <p className="text-gray-500">Manage your organization structure so visitors can easily find who they are visiting.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add New Department</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDepartment} className="flex gap-4 items-end">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="deptName">Department Name</Label>
              <Input 
                id="deptName" 
                placeholder="e.g. Human Resources" 
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="bg-zinc-900 text-white hover:bg-zinc-800">Create</Button>
          </form>
        </CardContent>
      </Card>

      {/* SEARCH FILTER */}
      {departments.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-zinc-400" />
          <Input 
            placeholder="Search by department, host name, phone, or email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 bg-white text-base shadow-sm border-zinc-300 focus-visible:ring-blue-600"
          />
        </div>
      )}

      <div className="space-y-6">
        {departments.length === 0 && (
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
            No departments created yet. Create one above to get started!
          </div>
        )}
        
        {filteredDepartments.map((dept) => (
          <Card key={dept.id} className="overflow-hidden">
            
            {/* DEPARTMENT HEADER WITH EDIT/DELETE */}
            <CardHeader className="bg-zinc-50 border-b py-3 px-4 sm:px-6">
              {editingDeptId === dept.id ? (
                <form onSubmit={handleUpdateDepartment} className="flex flex-1 gap-2 items-center">
                  <Input 
                    value={editingDeptName} 
                    onChange={(e) => setEditingDeptName(e.target.value)} 
                    className="h-9 max-w-sm bg-white"
                    autoFocus
                  />
                  <Button type="submit" size="sm" disabled={isUpdatingDept} className="h-9 bg-blue-600 hover:bg-blue-700 text-white">
                    {isUpdatingDept ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingDeptId(null)} className="h-9">
                    <X className="w-4 h-4" />
                  </Button>
                </form>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg m-0">{dept.name}</CardTitle>
                    <div className="flex items-center gap-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-blue-600 hover:bg-blue-50"
                        onClick={() => { setEditingDeptId(dept.id); setEditingDeptName(dept.name); }}
                        title="Edit Department"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 w-7 p-0 text-zinc-400 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleDeleteDepartment(dept.id, dept.name)}
                        title="Delete Department"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setSelectedDeptId(dept.id)} className="w-fit">
                    + Add Host
                  </Button>
                </div>
              )}
            </CardHeader>
            
            <CardContent className="p-0 sm:p-6 sm:pt-4">
              
              {/* ADD HOST FORM */}
              {selectedDeptId === dept.id && (
                <form onSubmit={handleAddHost} className="m-4 sm:m-0 sm:mb-6 p-4 bg-blue-50/50 rounded-lg border border-blue-100 flex gap-4 items-end flex-wrap">
                  <div className="grid gap-1.5 flex-1 min-w-[200px]">
                    <Label>Host Name *</Label>
                    <Input required value={newHost.name} onChange={(e) => setNewHost({ ...newHost, name: e.target.value })} placeholder="John Doe" className="bg-white" />
                  </div>
                  <div className="grid gap-1.5 flex-1 min-w-[200px]">
                    <Label>Phone Number</Label>
                    <Input value={newHost.phone} onChange={(e) => setNewHost({ ...newHost, phone: e.target.value })} placeholder="+2547..." className="bg-white" />
                  </div>
                  <div className="grid gap-1.5 flex-1 min-w-[200px]">
                    <Label>Email</Label>
                    <Input type="email" value={newHost.email} onChange={(e) => setNewHost({ ...newHost, email: e.target.value })} placeholder="john@example.com" className="bg-white" />
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button type="submit" className="flex-1 sm:flex-none">Save Host</Button>
                    <Button type="button" variant="ghost" onClick={() => setSelectedDeptId(null)}>Cancel</Button>
                  </div>
                </form>
              )}

              {/* HOSTS TABLE */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50/50">
                      <TableHead>Host Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dept.hostsToDisplay.map(host => (
                      editingHostId === host.id ? (
                        /* INLINE EDIT HOST ROW */
                        <TableRow key={host.id} className="bg-blue-50/30">
                          <TableCell className="p-2 align-top">
                            <Input value={editingHostData.name} onChange={e => setEditingHostData({...editingHostData, name: e.target.value})} className="h-9 min-w-[120px] bg-white"/>
                          </TableCell>
                          <TableCell className="p-2 align-top">
                            <Input value={editingHostData.phone} onChange={e => setEditingHostData({...editingHostData, phone: e.target.value})} className="h-9 min-w-[120px] bg-white"/>
                          </TableCell>
                          <TableCell className="p-2 align-top">
                            <Input value={editingHostData.email} onChange={e => setEditingHostData({...editingHostData, email: e.target.value})} className="h-9 min-w-[120px] bg-white"/>
                          </TableCell>
                          <TableCell className="p-2 text-right align-top whitespace-nowrap">
                             <Button size="sm" onClick={() => handleUpdateHost(host.id)} disabled={isUpdatingHost} className="h-9 bg-blue-600 hover:bg-blue-700 text-white mr-1">
                               {isUpdatingHost ? <Loader2 className="w-3 h-3 animate-spin"/> : "Save"}
                             </Button>
                             <Button size="sm" variant="ghost" onClick={() => setEditingHostId(null)} className="h-9 px-2">
                               <X className="w-4 h-4"/>
                             </Button>
                          </TableCell>
                        </TableRow>
                      ) : (
                        /* NORMAL HOST ROW */
                        <TableRow key={host.id}>
                          <TableCell className="font-medium text-zinc-900">{host.name}</TableCell>
                          <TableCell className="text-zinc-600">{host.phone || "-"}</TableCell>
                          <TableCell className="text-zinc-600">{host.email || "-"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2.5 text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={() => {
                                  setEditingHostId(host.id);
                                  setEditingHostData({ name: host.name, phone: host.phone || "", email: host.email || "" });
                                }}
                              >
                                <Pencil className="w-3.5 h-3.5 sm:mr-1" />
                                <span className="hidden sm:inline">Edit</span>
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-8 px-2.5 text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleDeleteHost(host.id, host.name)}
                              >
                                <Trash2 className="w-3.5 h-3.5 sm:mr-1" />
                                <span className="hidden sm:inline">Delete</span>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    ))}
                    {dept.hostsToDisplay.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-gray-500 py-6 border-b-0">
                          {searchQuery ? "No matching hosts found in this department." : "No hosts added to this department yet."}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Empty state when searching yields no results */}
        {departments.length > 0 && filteredDepartments.length === 0 && (
          <div className="text-center py-10 text-zinc-500 bg-white rounded-lg border">
            <p className="font-medium text-zinc-900 mb-1">No results found</p>
            <p>No departments or hosts matched "{searchQuery}"</p>
            <Button variant="link" onClick={() => setSearchQuery("")} className="text-blue-600 mt-2">
              Clear search
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}