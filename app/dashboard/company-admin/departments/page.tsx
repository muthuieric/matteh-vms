"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";

type Department = { id: string; name: string };
type Host = { id: string; name: string; phone: string; email: string; department_id: string };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");

  // Form States
  const [newDeptName, setNewDeptName] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const [newHost, setNewHost] = useState({ name: "", phone: "", email: "" });

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
      // Fetch departments via our secure API
      const deptsRes = await fetch(`/api/departments?company_id=${compId}`);
      if (deptsRes.ok) {
        const deptsJson = await deptsRes.json();
        if (deptsJson.data) setDepartments(deptsJson.data);
      }

      // Fetch hosts via our secure API
      const hostsRes = await fetch(`/api/hosts?company_id=${compId}`);
      if (hostsRes.ok) {
        const hostsJson = await hostsRes.json();
        if (hostsJson.data) setHosts(hostsJson.data);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
    }
  };

  const handleAddDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      alert("Error: Company ID is missing. Cannot create department.");
      return;
    }
    if (!newDeptName) return;

    try {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id: companyId, name: newDeptName })
      });
      
      const result = await response.json();

      if (!response.ok) {
        console.error("API Error:", result.error);
        alert(`Failed to save department: ${result.error}`);
        return;
      }

      if (result.data) {
        setDepartments([...departments, result.data]);
        setNewDeptName("");
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred while saving.");
    }
  };

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

      if (!response.ok) {
        console.error("API Error:", result.error);
        alert(`Failed to save host: ${result.error}`);
        return;
      }

      if (result.data) {
        setHosts([...hosts, result.data]);
        setNewHost({ name: "", phone: "", email: "" });
        setSelectedDeptId(null);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert("An unexpected error occurred while saving.");
    }
  };

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500">Loading your workspace...</div>;
  }

  // Smart Filter Logic
  const filteredDepartments = departments.map(dept => {
    // 1. Does the department name match?
    const matchesDept = dept.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // 2. Do any of the hosts inside this department match?
    const matchingHosts = hosts.filter(h => 
      h.department_id === dept.id && 
      (
        h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (h.phone && h.phone.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (h.email && h.email.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    );
    
    // If the department name matched, show all its hosts. Otherwise, show only the matching hosts.
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
            <Button type="submit">Create</Button>
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
          <Card key={dept.id}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-b">
              <CardTitle className="text-lg">{dept.name}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setSelectedDeptId(dept.id)}>
                + Add Host
              </Button>
            </CardHeader>
            <CardContent className="pt-4">
              
              {selectedDeptId === dept.id && (
                <form onSubmit={handleAddHost} className="mb-6 p-4 bg-gray-50 rounded-lg border flex gap-4 items-end flex-wrap">
                  <div className="grid gap-1.5 flex-1 min-w-[200px]">
                    <Label>Host Name</Label>
                    <Input required value={newHost.name} onChange={(e) => setNewHost({ ...newHost, name: e.target.value })} placeholder="John Doe" />
                  </div>
                  <div className="grid gap-1.5 flex-1 min-w-[200px]">
                    <Label>Phone Number</Label>
                    <Input value={newHost.phone} onChange={(e) => setNewHost({ ...newHost, phone: e.target.value })} placeholder="+2547..." />
                  </div>
                  <div className="grid gap-1.5 flex-1 min-w-[200px]">
                    <Label>Email (Optional)</Label>
                    <Input type="email" value={newHost.email} onChange={(e) => setNewHost({ ...newHost, email: e.target.value })} placeholder="john@example.com" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">Save</Button>
                    <Button type="button" variant="ghost" onClick={() => setSelectedDeptId(null)}>Cancel</Button>
                  </div>
                </form>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dept.hostsToDisplay.map(host => (
                    <TableRow key={host.id}>
                      <TableCell className="font-medium">{host.name}</TableCell>
                      <TableCell>{host.phone || "-"}</TableCell>
                      <TableCell>{host.email || "-"}</TableCell>
                    </TableRow>
                  ))}
                  {dept.hostsToDisplay.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-gray-500 py-4">
                        {searchQuery ? "No matching hosts found in this department." : "No hosts added to this department yet."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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