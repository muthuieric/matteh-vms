"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, QrCode, Shield, LogOut, AlertOctagon, 
  CreditCard, Loader2, Settings, Menu, X, ListPlus, Building2, LifeBuoy
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Payment & Billing States
  const [isPaying, setIsPaying] = useState(false);
  const [visitorCount, setVisitorCount] = useState(0);
  const [amountDue, setAmountDue] = useState(0); 

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const verifyAccountStatus = async () => {
      const { data: authData } = await supabase.auth.getUser();
      
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id, role")
          .eq("id", authData.user.id)
          .single();

        if (profile?.role === "guard") {
          router.replace("/dashboard/guard");
          return;
        }

        if (profile?.company_id) {
          setCompanyId(profile.company_id);

          // 1. Fetch Company Lock Status & Creation Date
          const { data: company } = await supabase
            .from("companies")
            .select("is_locked, created_at")
            .eq("id", profile.company_id)
            .single();

          let countStartDate = company?.created_at || new Date(0).toISOString();
          let lastPaymentDate = company?.created_at || new Date(0).toISOString();

          // 2. Fetch recent transactions to see if they paid recently
          const { data: recentTx } = await supabase
            .from("transactions")
            .select("created_at, status")
            .eq("company_id", profile.company_id)
            .order("created_at", { ascending: false })
            .limit(10); 

          if (recentTx && recentTx.length > 0) {
            // Find the latest successful payment
            const lastPaid = recentTx.find(tx => 
              tx.status && (tx.status.toUpperCase() === 'COMPLETED' || tx.status.toUpperCase() === 'SUCCESS' || tx.status.toUpperCase() === 'PAID')
            );

            if (lastPaid) {
              countStartDate = lastPaid.created_at;
              lastPaymentDate = lastPaid.created_at;
            }
          }

          // 3. Count visitors since the calculated start date
          const { count } = await supabase
            .from("visitors")
            .select("*", { count: "exact", head: true })
            .eq("company_id", profile.company_id)
            .gte("created_at", countStartDate);

          const unpaidVisitors = count || 0;
          const calculatedAmountDue = unpaidVisitors * 3; // 3 KES per visitor

          setVisitorCount(unpaidVisitors);
          setAmountDue(calculatedAmountDue);

          // 4. Lock account ONLY if it's been > 30 days since last payment AND they owe money
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          let accountLocked = company?.is_locked === true;
          const isOverdue = new Date(lastPaymentDate) < thirtyDaysAgo;

          if (calculatedAmountDue > 0 && isOverdue) {
            accountLocked = true;
          }

          setIsLocked(accountLocked);
        }
      }
      setLoading(false);
    };

    verifyAccountStatus();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const handlePayment = async () => {
    if (!companyId) return;
    setIsPaying(true);

    try {
      const response = await fetch("/api/payments/pesapal/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, amount: amountDue }),
      });

      const data = await response.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert("Payment initialization failed.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred starting the payment.");
    } finally {
      setIsPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent">
        <p className="text-zinc-500 font-medium animate-pulse">Verifying billing status...</p>
      </div>
    );
  }

  // Remove trailing slashes for clean matching
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const isPaymentSuccessPage = normalizedPath.includes("/payment-success");

  // EXACT ROUTE MATCHING FOR RESTRICTION
  const isExactAdminPage = normalizedPath === "/dashboard/company-admin";
  const isDepartmentsPage = normalizedPath.includes("/departments");
  const isBlacklistPage = normalizedPath.includes("/blacklist");
  
  const isRestrictedRoute = isExactAdminPage || isDepartmentsPage || isBlacklistPage;

  // Trigger lockdown block completely hiding the children components
  const showLockdownPopup = isLocked && isRestrictedRoute && !isPaymentSuccessPage;

  return (
    <div className="flex flex-col md:flex-row h-screen bg-transparent relative overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-zinc-200/60 p-4 shrink-0 z-30 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">VMS Portal</h2>
          <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mt-0.5">Admin Dashboard</p>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors">
          <Menu size={24} />
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="relative w-72 max-w-[80%] bg-white/95 backdrop-blur-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-zinc-200/60 flex items-center justify-between bg-zinc-50/50">
              <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">Menu</h2>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-zinc-500 hover:text-zinc-900 bg-zinc-200 hover:bg-zinc-300 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <Link href="/dashboard/company-admin" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors font-medium text-sm ${normalizedPath === "/dashboard/company-admin" ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100/50"}`}><LayoutDashboard size={20} /> Overview</Link>
              <Link href="/dashboard/company-admin/qr" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/qr") ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100/50"}`}><QrCode size={20} /> Gate QR Code</Link>
              <Link href="/dashboard/company-admin/guards" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/guards") ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100/50"}`}><Shield size={20} /> Security Team</Link>
              <Link href="/dashboard/company-admin/rules" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/rules") ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100/50"}`}><ListPlus size={20} /> Building Rules</Link>
              <Link href="/dashboard/company-admin/departments" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/departments") ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100/50"}`}><Building2 size={20} /> Departments</Link>
              <Link href="/dashboard/company-admin/blacklist" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/blacklist") ? "text-red-700 bg-red-50" : "text-zinc-600 hover:bg-zinc-100/50"}`}><AlertOctagon size={20} /> Blacklist</Link>
              <Link href="/dashboard/company-admin/billing" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/billing") ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100/50"}`}><CreditCard size={20} /> Billing</Link>
              <Link href="/dashboard/company-admin/support" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/support") ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100/50"}`}><LifeBuoy size={20} /> Help Desk</Link>
              <Link href="/dashboard/company-admin/settings" onClick={() => setIsMobileMenuOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/settings") ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100/50"}`}><Settings size={20} /> Settings</Link>
            </nav>
            <div className="p-4 border-t border-zinc-200/60">
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 w-full text-zinc-600 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors font-medium text-sm"><LogOut size={20} /> Sign Out</button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white/80 backdrop-blur-md border-r border-zinc-200/60 hidden md:flex flex-col shadow-sm z-20 h-full shrink-0">
        <div className="p-6 border-b border-zinc-200/60">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">VMS Portal</h2>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">Admin Dashboard</p>
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/dashboard/company-admin" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${normalizedPath === "/dashboard/company-admin" ? "text-blue-700 bg-blue-50/80 shadow-sm" : "text-zinc-600 hover:bg-zinc-100/50"}`}><LayoutDashboard size={18} /> Overview</Link>
          <Link href="/dashboard/company-admin/qr" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/qr") ? "text-blue-700 bg-blue-50/80 shadow-sm" : "text-zinc-600 hover:bg-zinc-100/50"}`}><QrCode size={18} /> Gate QR Code</Link>
          <Link href="/dashboard/company-admin/guards" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/guards") ? "text-blue-700 bg-blue-50/80 shadow-sm" : "text-zinc-600 hover:bg-zinc-100/50"}`}><Shield size={18} /> Security Team</Link>
          <Link href="/dashboard/company-admin/rules" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/rules") ? "text-blue-700 bg-blue-50/80 shadow-sm" : "text-zinc-600 hover:bg-zinc-100/50"}`}><ListPlus size={18} /> Building Rules</Link>
          <Link href="/dashboard/company-admin/departments" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/departments") ? "text-blue-700 bg-blue-50/80 shadow-sm" : "text-zinc-600 hover:bg-zinc-100/50"}`}><Building2 size={18} /> Departments</Link>
          <Link href="/dashboard/company-admin/blacklist" className={`flex items-center gap-3 py-2.5 px-3 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/blacklist") ? "text-red-700 bg-red-50/80 shadow-sm" : "text-zinc-600 hover:bg-zinc-100/50"}`}><AlertOctagon size={18} /> Blacklist</Link>
          <Link href="/dashboard/company-admin/billing" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/billing") ? "text-blue-700 bg-blue-50/80 shadow-sm" : "text-zinc-600 hover:bg-zinc-100/50"}`}><CreditCard size={18} /> Billing</Link>
          <Link href="/dashboard/company-admin/support" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/support") ? "text-blue-700 bg-blue-50/80 shadow-sm" : "text-zinc-600 hover:bg-zinc-100/50"}`}><LifeBuoy size={18} /> Help Desk</Link>
          <Link href="/dashboard/company-admin/settings" className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${normalizedPath.includes("/settings") ? "text-blue-700 bg-blue-50/80 shadow-sm" : "text-zinc-600 hover:bg-zinc-100/50"}`}><Settings size={18} /> Settings</Link>
        </nav>
        <div className="p-4 border-t border-zinc-200/60">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 w-full text-zinc-600 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors font-medium text-sm"><LogOut size={18} /> Sign Out</button>
        </div>
      </aside>

      <main className="flex-1 w-full relative z-10 h-full overflow-y-auto bg-zinc-50 flex flex-col">
        
        {/* Persistent Warning Banner */}
        {isLocked && !isPaymentSuccessPage && (
          <div className="bg-red-600 text-white text-center py-2.5 text-sm font-semibold shadow-md flex items-center justify-center gap-2 shrink-0 z-[60]">
            <AlertOctagon className="w-4 h-4" /> Your account has an outstanding balance. Essential features are locked.
          </div>
        )}

        {/* HARD BLOCK: 
            If showLockdownPopup is true, {children} is OMITTED entirely.
            React will not mount the page components. No data is fetched.
            DevTools cannot inspect what does not exist in the DOM.
        */}
        {showLockdownPopup ? (
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-zinc-100 border-l border-zinc-200/50 shadow-inner">
            <Card className="max-w-md w-full border border-red-900/50 bg-zinc-900 text-zinc-100 shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)] relative overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
              <div className="h-1.5 bg-red-600 w-full absolute top-0 left-0" />
              <CardHeader className="text-center pb-2 pt-8">
                <div className="mx-auto bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-4 ring-8 ring-zinc-900">
                  <AlertOctagon className="w-8 h-8 text-red-500" />
                </div>
                <CardTitle className="text-2xl font-bold text-white tracking-tight">Access Restricted</CardTitle>
                <CardDescription className="text-zinc-400 mt-2 px-2 leading-relaxed">
                  Management logs, departments, and blacklists are locked due to an outstanding balance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-4 px-6 pb-6">
                
                {/* DYNAMIC BILLING CALCULATION */}
                <div className="bg-black/40 p-5 rounded-xl border border-zinc-800 space-y-4 shadow-inner">
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-800/80">
                    <span className="text-sm text-zinc-400">Unpaid Visitors</span>
                    <span className="text-lg font-bold text-white">{visitorCount}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-zinc-800/80">
                    <span className="text-sm text-zinc-400">Rate per Visitor</span>
                    <span className="text-lg font-bold text-white">KES 3.00</span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="text-sm text-zinc-400 font-medium">Total Amount Due</span>
                    <span className="text-2xl font-black text-white">KES {amountDue > 0 ? amountDue.toLocaleString() : '0'}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <Button onClick={handlePayment} disabled={isPaying || amountDue <= 0} className="bg-amber-600 w-full hover:bg-amber-500 text-white font-bold h-12 rounded-lg text-base transition-all shadow-lg shadow-amber-900/20 active:scale-[0.98]">
                    {isPaying ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing...</> : <><CreditCard className="w-5 h-5 mr-2" /> Pay KES {amountDue.toLocaleString()} to Unlock</>}
                  </Button>
                  <Button variant="ghost" className="text-zinc-400 hover:text-white h-12 rounded-lg" asChild>
                    <Link href="/dashboard/company-admin/billing">View Billing History</Link>
                  </Button>
                </div>
                <p className="text-[10px] text-center text-zinc-500 font-medium leading-relaxed mt-1">
                  Calculation covers unpaid visitors in the last 30 days. The count resets immediately upon successful payment.
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="relative flex-1 w-full flex flex-col h-full pb-10">
            {children}
          </div>
        )}
      </main>
    </div>
  );
}