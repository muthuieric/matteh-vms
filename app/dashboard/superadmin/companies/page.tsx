"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Eye, Lock, Unlock, UserPlus } from "lucide-react";

type Company = {
  id: string;
  name: string;
  created_at: string;
  subscription_status: string;
  is_locked: boolean;
};

export default function ManageCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [planType, setPlanType] = useState<"none" | "trial_1" | "trial_2">("trial_1");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Creation Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [adminForm, setAdminForm] = useState({ fullName: "", email: "", password: "" });
  const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

  // View Data Modal State (Count Only)
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [loadingVisitors, setLoadingVisitors] = useState(false);
  const [viewingCompanyName, setViewingCompanyName] = useState("");

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false });

    const formattedCompanies = (data || []).map((c: any) => ({
      ...c,
      subscription_status: c.subscription_status || "trial",
      is_locked: c.is_locked || false,
    }));

    setCompanies(formattedCompanies);
    setLoading(false);
  };

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    let status = "unpaid";
    let endsAt = null;
    let startLocked = true; // Default to explicitly locked if "No Trial"

    if (planType === "trial_1" || planType === "trial_2") {
      status = "trial";
      startLocked = false; // Unlock if they selected a trial
      const expiryDate = new Date();
      // Add 1 or 2 months to today's date
      const monthsToAdd = planType === "trial_1" ? 1 : 2;
      expiryDate.setMonth(expiryDate.getMonth() + monthsToAdd);
      endsAt = expiryDate.toISOString();
    }
    
    const { error } = await supabase
      .from("companies")
      .insert([{ 
        name: newCompanyName,
        subscription_status: status,
        subscription_ends_at: endsAt,
        is_locked: startLocked,
        amount_paid: 0
      }]);

    if (error) {
      console.error("Database Insert Error:", error);
      alert(`Failed to create company: ${error.message}`);
    } else {
      setNewCompanyName("");
      setPlanType("trial_1");
      setShowAddModal(false);
      fetchCompanies();
    }
    setIsSubmitting(false);
  };

  const openAdminModal = (companyId: string) => {
    setSelectedCompanyId(companyId);
    setAdminForm({ fullName: "", email: "", password: "" });
    setShowAdminModal(true);
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAdmin(true);

    try {
      const response = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adminForm, companyId: selectedCompanyId }),
      });

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        const result = await response.json();

        if (result.error) {
          alert(`Error: ${result.error}`);
        } else {
          alert("Admin account created successfully! They can now log in.");
          setShowAdminModal(false);
        }
      } else {
        const textResponse = await response.text();
        console.error("Server returned non-JSON response:", textResponse);
        alert(`Server Error (${response.status}): Please ensure the 'app/api/admins/route.ts' file exists and your Service Role Key is in .env.local.`);
      }
    } catch (error: any) {
      console.error("Network Error:", error);
      alert(`Network/Connection failed: ${error.message}`);
    } finally {
      setIsCreatingAdmin(false);
    }
  };

  const viewCompanyVisitors = async (companyId: string, companyName: string) => {
    setViewingCompanyName(companyName);
    setShowVisitorsModal(true);
    setLoadingVisitors(true);

    const { count, error } = await supabase
      .from("visitors")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);

    if (error) {
      console.error("Error fetching count:", error);
      setVisitorCount(0);
    } else {
      setVisitorCount(count || 0);
    }
    
    setLoadingVisitors(false);
  };

  const toggleCompanyLock = async (companyId: string, currentLockStatus: boolean) => {
    const action = currentLockStatus ? "Unlock" : "Lock";
    if (!window.confirm(`Are you sure you want to ${action} this company's account?`)) return;

    const { error } = await supabase
      .from("companies")
      .update({ is_locked: !currentLockStatus })
      .eq("id", companyId);

    if (error) {
      console.error("Lock Update Error:", error);
      alert(`Failed to update lock status: ${error.message}`);
    } else {
      fetchCompanies();
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-3xl font-bold text-zinc-900">Client Companies</h1>
        <p className="text-zinc-500 mt-1">Manage organizations registered on your platform.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Registered Buildings/Companies</CardTitle>
            <CardDescription>All organizations currently using your platform.</CardDescription>
          </div>
          <Button onClick={() => setShowAddModal(true)} className="bg-zinc-900 hover:bg-zinc-800">
            <Plus className="mr-2 h-4 w-4" /> New Company
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 py-4">Loading companies...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-semibold text-zinc-900">
                        {company.name}
                        {company.is_locked && <span className="ml-2 text-xs text-red-600 font-bold">(LOCKED)</span>}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          company.subscription_status === 'paid' ? 'bg-green-100 text-green-800' : 
                          company.subscription_status === 'trial' ? 'bg-amber-100 text-amber-800' : 
                          'bg-red-100 text-red-800'
                        }`}>
                          {company.subscription_status.toUpperCase()}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-600">
                        {new Date(company.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => openAdminModal(company.id)}>
                          <UserPlus className="h-4 w-4 mr-1" /> Add Admin
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => viewCompanyVisitors(company.id, company.name)}>
                          <Eye className="h-4 w-4 mr-1" /> View Data
                        </Button>
                        <Button 
                          size="sm" 
                          variant={company.is_locked ? "default" : "destructive"} 
                          onClick={() => toggleCompanyLock(company.id, company.is_locked)}
                        >
                          {company.is_locked ? <><Unlock className="h-4 w-4 mr-1"/> Unlock</> : <><Lock className="h-4 w-4 mr-1"/> Lock</>}
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

      {/* --- ADD COMPANY MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black"><X size={20} /></button>
            <CardHeader>
              <CardTitle>Onboard New Company</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <Label>Company / Building Name</Label>
                  <Input required placeholder="e.g. Skyline Towers" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} />
                </div>
                <div>
                  <Label>Initial Subscription Plan</Label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as any)}
                    className="w-full mt-1 border border-zinc-300 rounded-md p-2.5 bg-white text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                  >
                    <option value="trial_1">1 Month Free Trial</option>
                    <option value="trial_2">2 Months Free Trial</option>
                    <option value="none">No Trial (Starts Unpaid & Locked)</option>
                  </select>
                </div>
                <div className="pt-4">
                  <Button type="submit" className="w-full bg-zinc-900 hover:bg-zinc-800" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Workspace"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- ADD ADMIN MODAL --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative border-t-4 border-t-blue-600">
            <button onClick={() => setShowAdminModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black"><X size={20} /></button>
            <CardHeader>
              <CardTitle>Create Company Admin</CardTitle>
              <CardDescription>Generate credentials for the Building Manager.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <Label>Admin Full Name</Label>
                  <Input required placeholder="e.g. Jane Doe" value={adminForm.fullName} onChange={(e) => setAdminForm({...adminForm, fullName: e.target.value})} />
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input required type="email" placeholder="manager@building.com" value={adminForm.email} onChange={(e) => setAdminForm({...adminForm, email: e.target.value})} />
                </div>
                <div>
                  <Label>Initial Password</Label>
                  <Input required type="password" placeholder="Min 6 characters" minLength={6} value={adminForm.password} onChange={(e) => setAdminForm({...adminForm, password: e.target.value})} />
                </div>
                <div className="pt-4">
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isCreatingAdmin}>
                    {isCreatingAdmin ? "Creating..." : "Create Admin Account"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- VIEW VISITORS MODAL --- */}
      {showVisitorsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-sm shadow-2xl relative">
            <button onClick={() => setShowVisitorsModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black transition-colors"><X size={20} /></button>
            <CardHeader className="border-b text-center pb-4">
              <CardTitle className="text-xl">{viewingCompanyName}</CardTitle>
              <CardDescription>Total Lifetime Visitors</CardDescription>
            </CardHeader>
            <CardContent className="p-8 text-center">
              {loadingVisitors ? (
                <p className="text-zinc-500 animate-pulse">Calculating...</p>
              ) : (
                <div className="space-y-2">
                  <div className="text-6xl font-black text-blue-600 tracking-tighter">
                    {visitorCount.toLocaleString()}
                  </div>
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
                    Records Processed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}