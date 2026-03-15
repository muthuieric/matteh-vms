"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { LayoutDashboard, QrCode, Shield, LogOut, AlertOctagon, CreditCard, Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function CompanyAdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [monthsToPay, setMonthsToPay] = useState(1);

  useEffect(() => {
    const verifyAccountStatus = async () => {
      const { data: authData } = await supabase.auth.getUser();
      
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", authData.user.id)
          .single();

        if (profile?.company_id) {
          setCompanyId(profile.company_id);

          const { data: company } = await supabase
            .from("companies")
            .select("is_locked, subscription_ends_at")
            .eq("id", profile.company_id)
            .single();

          if (company) {
            const isExpired = company.subscription_ends_at 
              ? new Date(company.subscription_ends_at) < new Date() 
              : false; 

            if (company.is_locked || isExpired) {
              setIsLocked(true);
            }
          }
        }
      }
      setLoading(false);
    };

    verifyAccountStatus();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handlePayment = async () => {
    if (!companyId) return;
    setIsPaying(true);

    try {
      const response = await fetch("/api/payments/pesapal/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          companyId,
          amount: monthsToPay * 5000 
        }),
      });

      const data = await response.json();

      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert("Payment initialization failed. Please try again later.");
        console.error("Pesapal Error:", data);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred starting the payment.");
    } finally {
      setIsPaying(false);
    }
  };

  // FIX: Check if the user is currently on the payment-success page
  const isPaymentSuccessPage = pathname.includes("/payment-success");

  // FIX: Only show the lockout screen if they are NOT on the success page
  if (isLocked && !isPaymentSuccessPage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-900 bg-zinc-900 text-zinc-100 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <AlertOctagon className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Account Suspended</CardTitle>
            <CardDescription className="text-zinc-400">
              Your company's access to the VMS has expired or been paused.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <p className="text-sm text-center text-zinc-300">
              Please settle your balance to instantly restore access for you and your security team.
            </p>
            
            <div className="bg-black/50 p-4 rounded-lg border border-zinc-800 space-y-3">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider font-bold mb-1 block">Renew Subscription</label>
                <select 
                  value={monthsToPay} 
                  onChange={(e) => setMonthsToPay(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded p-2 text-sm focus:ring-amber-500"
                >
                  <option value={1}>1 Month (KES 5,000)</option>
                  <option value={2}>2 Months (KES 10,000)</option>
                  <option value={6}>6 Months (KES 30,000)</option>
                  <option value={12}>1 Year (KES 60,000)</option>
                </select>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-zinc-800">
                <span className="text-sm text-zinc-400">Total</span>
                <span className="text-lg font-bold text-white">KES {(monthsToPay * 5000).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={handleLogout} disabled={isPaying} className="border-zinc-700 text-zinc-800 hover:bg-zinc-800 hover:text-white">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
              </Button>
              <Button onClick={handlePayment} disabled={isPaying} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[120px]">
                {isPaying ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><CreditCard className="w-4 h-4 mr-2" /> Pay Now</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-zinc-500 font-medium animate-pulse">Verifying secure credentials...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-zinc-50">
      
      <aside className="w-64 bg-white border-r border-zinc-200 hidden md:flex flex-col shadow-sm z-10">
        <div className="p-6 border-b border-zinc-200">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">VMS Portal</h2>
          <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider mt-1">Admin Dashboard</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link 
            href="/dashboard/company-admin" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/company-admin" ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            <LayoutDashboard size={18} /> Overview
          </Link>
          <Link 
            href="/dashboard/company-admin/qr" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/company-admin/qr" ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            <QrCode size={18} /> Gate QR Code
          </Link>
          <Link 
            href="/dashboard/company-admin/guards" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/company-admin/guards" ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            <Shield size={18} /> Security Team
          </Link>
          <Link 
            href="/dashboard/company-admin/billing" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/company-admin/billing" ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            <CreditCard size={18} /> Billing
          </Link>
          <Link 
            href="/dashboard/company-admin/settings" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/company-admin/settings" ? "text-blue-700 bg-blue-50" : "text-zinc-600 hover:bg-zinc-100"}`}
          >
            <Settings size={18} /> Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-200">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-zinc-600 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors font-medium text-sm"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        {children}
      </main>

    </div>
  );
}