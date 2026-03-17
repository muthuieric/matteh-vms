"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Eye, Lock, Unlock, UserPlus, Building2, Loader2, Search, CalendarDays, Clock, LogIn, LogOut } from "lucide-react";

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
  const [searchTerm, setSearchTerm] = useState("");

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

  // View Data Modal State (Enhanced Analytics)
  const [showVisitorsModal, setShowVisitorsModal] = useState(false);
  const [visitorStats, setVisitorStats] = useState({ total: 0, inside: 0, departed: 0, pending: 0 });
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

    // Fetch visitor statuses to calculate a quick analytics snapshot
    const { data, error } = await supabase
      .from("visitors")
      .select("status")
      .eq("company_id", companyId);

    if (error) {
      console.error("Error fetching stats:", error);
      setVisitorStats({ total: 0, inside: 0, departed: 0, pending: 0 });
    } else {
      setVisitorStats({
        total: data.length,
        inside: data.filter(v => v.status === "checked_in").length,
        departed: data.filter(v => v.status === "checked_out").length,
        pending: data.filter(v => v.status === "pending").length,
      });
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

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-6xl mx-auto space-y-6 md:space-y-8">
      
      {/* Header Section */}
      <div className="border-b border-zinc-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-lg shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Client Companies</h1>
            <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage organizations registered on your platform.</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="bg-zinc-900 hover:bg-zinc-800 text-white w-full sm:w-auto shadow-sm">
          <Plus className="mr-2 h-4 w-4" /> New Company
        </Button>
      </div>

      <Card className="shadow-sm border-zinc-200 bg-white/90 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-zinc-200/60 mb-2 space-y-5">
          <div>
            <CardTitle>Registered Buildings/Companies</CardTitle>
            <CardDescription>All organizations currently using your platform.</CardDescription>
          </div>

          {/* SEARCH BAR */}
          <div className="relative w-full md:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input 
              placeholder="Search company name..." 
              className="pl-9 bg-white/80 border-zinc-200 focus:ring-indigo-500 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 px-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" /> 
              <p>Loading companies...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 px-4">
              <div className="bg-white border border-zinc-200 shadow-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="font-bold text-zinc-900 text-lg">No companies found</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">Click "New Company" to onboard your first client.</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 px-4">
              <p className="font-bold text-zinc-900">No matching companies</p>
              <p className="text-sm mt-1">Try adjusting your search query.</p>
            </div>
          ) : (
            <>
              {/* --- DESKTOP VIEW (TABLE) --- */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-zinc-50/80">
                    <TableRow>
                      <TableHead className="pl-6 py-4 text-zinc-600 whitespace-nowrap">Company Name</TableHead>
                      <TableHead className="text-zinc-600 whitespace-nowrap">Status</TableHead>
                      <TableHead className="text-zinc-600 whitespace-nowrap">Date Added</TableHead>
                      <TableHead className="pr-6 text-right text-zinc-600 whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => (
                      <TableRow key={company.id} className="hover:bg-zinc-50/80 transition-colors">
                        <TableCell className="pl-6 font-semibold text-zinc-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[250px]">{company.name}</span>
                            {company.is_locked && <Lock className="inline h-3.5 w-3.5 text-red-600 shrink-0" title="Account Locked"/>}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold border ${
                            company.subscription_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                            company.subscription_status === 'trial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {company.subscription_status.toUpperCase()}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-zinc-600 whitespace-nowrap">
                          {new Date(company.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="pr-6 text-right space-x-2 whitespace-nowrap">
                          <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 bg-white" onClick={() => openAdminModal(company.id)}>
                            <UserPlus className="h-4 w-4 mr-1" /> Add Admin
                          </Button>
                          <Button size="sm" variant="outline" className="text-zinc-700 border-zinc-200 hover:bg-zinc-50 bg-white" onClick={() => viewCompanyVisitors(company.id, company.name)}>
                            <Eye className="h-4 w-4 mr-1" /> View Data
                          </Button>
                          <Button 
                            size="sm" 
                            variant={company.is_locked ? "default" : "destructive"} 
                            className={company.is_locked ? "bg-zinc-800 hover:bg-zinc-900 text-white" : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"}
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

              {/* --- MOBILE VIEW (STACKED CARDS) --- */}
              <div className="md:hidden divide-y divide-zinc-100">
                {filteredCompanies.map((company) => (
                  <div key={company.id} className="p-4 space-y-4 hover:bg-zinc-50/50 transition-colors">
                    
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-semibold text-zinc-900 flex items-start gap-2 leading-tight">
                        <Building2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{company.name}</span>
                        {company.is_locked && <Lock className="inline h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" title="Account Locked"/>}
                      </div>
                      <div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                          company.subscription_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                          company.subscription_status === 'trial' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {company.subscription_status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center text-sm text-zinc-500 gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                      Added: {new Date(company.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-100">
                      <Button size="sm" variant="outline" className="flex-1 text-blue-600 border-blue-200 hover:bg-blue-50 bg-white min-w-[120px]" onClick={() => openAdminModal(company.id)}>
                        <UserPlus className="h-4 w-4 mr-1" /> Add Admin
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 text-zinc-700 border-zinc-200 hover:bg-zinc-50 bg-white min-w-[120px]" onClick={() => viewCompanyVisitors(company.id, company.name)}>
                        <Eye className="h-4 w-4 mr-1" /> View Data
                      </Button>
                      <Button 
                        size="sm" 
                        variant={company.is_locked ? "default" : "destructive"} 
                        className={`w-full ${company.is_locked ? "bg-zinc-800 hover:bg-zinc-900 text-white" : "bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"}`}
                        onClick={() => toggleCompanyLock(company.id, company.is_locked)}
                      >
                        {company.is_locked ? <><Unlock className="h-4 w-4 mr-1"/> Unlock Account</> : <><Lock className="h-4 w-4 mr-1"/> Lock Account</>}
                      </Button>
                    </div>

                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* --- ADD COMPANY MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative border-0 overflow-hidden bg-white">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-black-600"></div>
            <button onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full p-1.5 transition-colors">
              <X size={18} />
            </button>
            <CardHeader className="pt-8 pb-4 border-b border-zinc-100/50">
              <CardTitle className="text-xl font-bold">Onboard New Company</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreateCompany} className="space-y-4">
                <div>
                  <Label className="font-semibold text-zinc-700">Company / Building Name</Label>
                  <Input 
                    required 
                    placeholder="e.g. Skyline Towers" 
                    value={newCompanyName} 
                    onChange={(e) => setNewCompanyName(e.target.value)} 
                    className="mt-1.5 h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <Label className="font-semibold text-zinc-700">Initial Subscription Plan</Label>
                  <select
                    value={planType}
                    onChange={(e) => setPlanType(e.target.value as any)}
                    className="w-full mt-1.5 border border-zinc-200 rounded-md h-11 px-3 bg-zinc-50 focus:bg-white text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-colors"
                  >
                    <option value="trial_1">1 Month Free Trial</option>
                    <option value="trial_2">2 Months Free Trial</option>
                    <option value="none">No Trial (Starts Unpaid & Locked)</option>
                  </select>
                </div>
                <div className="pt-4">
                  <Button type="submit" className="w-full h-11 text-base font-bold bg-zinc-900 hover:bg-zinc-800" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Creating...</> : "Create Workspace"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- ADD ADMIN MODAL --- */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative border-0 overflow-hidden bg-white">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-black-600"></div>
            <button onClick={() => setShowAdminModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full p-1.5 transition-colors">
              <X size={18} />
            </button>
            <CardHeader className="pt-8 pb-4 border-b border-zinc-100/50">
              <CardTitle className="text-xl font-bold">Create Company Admin</CardTitle>
              <CardDescription>Generate credentials for the Building Manager.</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleCreateAdmin} className="space-y-4">
                <div>
                  <Label className="font-semibold text-zinc-700">Admin Full Name</Label>
                  <Input 
                    required 
                    placeholder="e.g. Jane Doe" 
                    value={adminForm.fullName} 
                    onChange={(e) => setAdminForm({...adminForm, fullName: e.target.value})} 
                    className="mt-1.5 h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <Label className="font-semibold text-zinc-700">Email Address</Label>
                  <Input 
                    required 
                    type="email" 
                    placeholder="manager@building.com" 
                    value={adminForm.email} 
                    onChange={(e) => setAdminForm({...adminForm, email: e.target.value})} 
                    className="mt-1.5 h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div>
                  <Label className="font-semibold text-zinc-700">Initial Password</Label>
                  <Input 
                    required 
                    type="password" 
                    placeholder="Min 6 characters" 
                    minLength={6} 
                    value={adminForm.password} 
                    onChange={(e) => setAdminForm({...adminForm, password: e.target.value})} 
                    className="mt-1.5 h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
                <div className="pt-4">
                  <Button type="submit" className="w-full h-11 text-base font-bold bg-blue-600 hover:bg-blue-700" disabled={isCreatingAdmin}>
                    {isCreatingAdmin ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Creating...</> : "Create Admin Account"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* --- ENHANCED VIEW VISITORS MODAL --- */}
      {showVisitorsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative border-0 overflow-hidden bg-white">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-black-600"></div>
            <button onClick={() => setShowVisitorsModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 rounded-full p-1.5 transition-colors">
              <X size={18} />
            </button>
            <CardHeader className="pt-8 pb-4 border-b border-zinc-100/50">
              <CardTitle className="text-xl font-bold truncate pr-6 text-zinc-900">{viewingCompanyName}</CardTitle>
              <CardDescription>Real-time Visitor Analytics Snapshot</CardDescription>
            </CardHeader>
            <CardContent className="p-6 bg-zinc-50/50">
              {loadingVisitors ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
                  <p className="text-zinc-500 font-medium">Aggregating data...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Main Stat */}
                  <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm text-center">
                    <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-1">Total Lifetime Visitors</p>
                    <div className="text-5xl font-black text-indigo-600 tracking-tighter">
                      {visitorStats.total.toLocaleString()}
                    </div>
                  </div>

                  {/* Sub Stats Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-center flex flex-col items-center border-b-2 border-b-amber-400">
                      <div className="w-8 h-8 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-2">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-bold text-zinc-900">{visitorStats.pending}</div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1 tracking-wider">Pending</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-center flex flex-col items-center border-b-2 border-b-green-500">
                      <div className="w-8 h-8 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-2">
                        <LogIn className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-bold text-zinc-900">{visitorStats.inside}</div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1 tracking-wider">Inside</p>
                    </div>
                    
                    <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm text-center flex flex-col items-center border-b-2 border-b-zinc-400">
                      <div className="w-8 h-8 bg-zinc-100 text-zinc-600 rounded-full flex items-center justify-center mb-2">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <div className="text-xl font-bold text-zinc-900">{visitorStats.departed}</div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1 tracking-wider">Departed</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}