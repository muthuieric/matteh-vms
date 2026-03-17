"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"
import { Building2, LayoutDashboard, CreditCard, LogOut, Receipt, Settings, Menu, X } from "lucide-react";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  
  // Mobile Menu State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // We put the security check in the layout so it automatically protects ALL superadmin pages!
    const verifySuperadmin = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .single();

        if (profile?.role === "superadmin" || profile?.role === "super_admin") {
          setIsAuthorized(true);
        } else {
          alert("Unauthorized access. Superadmin role required.");
          router.push("/login");
        }
      } else {
        router.push("/login");
      }
    };

    verifySuperadmin();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <p className="text-zinc-500 font-medium animate-pulse">Verifying secure credentials...</p>
      </div>
    );
  }

  // Helper function to keep links clean and consistent
  const getLinkClass = (path: string) => {
    return `flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${
      pathname === path 
        ? "text-amber-700 bg-amber-50/80 shadow-sm" 
        : "text-zinc-600 hover:bg-zinc-100/50"
    }`;
  };

  return (
    /* Changed to h-screen and overflow-hidden for independent scrolling */
    <div className="flex flex-col md:flex-row h-screen bg-transparent relative overflow-hidden">
      
      {/* --- MOBILE TOP BAR --- */}
      <div className="md:hidden flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-zinc-200/60 p-4 shrink-0 z-30 shadow-sm">
        <div>
          <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">VMS Global</h2>
          <p className="text-[10px] text-amber-600 font-bold uppercase tracking-wider mt-0.5">Superadmin</p>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
        >
          <Menu size={24} />
        </button>
      </div>

      {/* --- MOBILE NAVIGATION DRAWER --- */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop blur */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)} 
          />
          {/* Drawer Menu */}
          <div className="relative w-72 max-w-[80%] bg-white/95 backdrop-blur-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-zinc-200/60 flex items-center justify-between bg-zinc-50/50">
              <h2 className="text-lg font-extrabold text-zinc-900 tracking-tight">Menu</h2>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 text-zinc-500 hover:text-zinc-900 bg-zinc-200 hover:bg-zinc-300 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <Link href="/dashboard/superadmin" onClick={() => setIsMobileMenuOpen(false)} className={getLinkClass("/dashboard/superadmin")}>
                <LayoutDashboard size={18} /> Global Analytics
              </Link>
              <Link href="/dashboard/superadmin/companies" onClick={() => setIsMobileMenuOpen(false)} className={getLinkClass("/dashboard/superadmin/companies")}>
                <Building2 size={18} /> Manage Companies
              </Link>
              <Link href="/dashboard/superadmin/billing" onClick={() => setIsMobileMenuOpen(false)} className={getLinkClass("/dashboard/superadmin/billing")}>
                <CreditCard size={18} /> Subscriptions & Billing
              </Link>
              <Link href="/dashboard/superadmin/transactions" onClick={() => setIsMobileMenuOpen(false)} className={getLinkClass("/dashboard/superadmin/transactions")}>
                <Receipt size={18} /> Master Ledger
              </Link>
              <Link href="/dashboard/superadmin/settings" onClick={() => setIsMobileMenuOpen(false)} className={getLinkClass("/dashboard/superadmin/settings")}>
                <Settings size={18} /> Account Settings
              </Link>
            </nav>

            <div className="p-4 border-t border-zinc-200/60">
              <button 
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 w-full text-zinc-600 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors font-medium text-sm"
              >
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="w-64 bg-white/80 backdrop-blur-md border-r border-zinc-200/60 hidden md:flex flex-col shadow-sm z-20 h-full shrink-0">
        <div className="p-6 border-b border-zinc-200/60">
          <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">VMS Global</h2>
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wider mt-1">Superadmin</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <Link href="/dashboard/superadmin" className={getLinkClass("/dashboard/superadmin")}>
            <LayoutDashboard size={18} /> Global Analytics
          </Link>
          <Link href="/dashboard/superadmin/companies" className={getLinkClass("/dashboard/superadmin/companies")}>
            <Building2 size={18} /> Manage Companies
          </Link>
          <Link href="/dashboard/superadmin/billing" className={getLinkClass("/dashboard/superadmin/billing")}>
            <CreditCard size={18} /> Subscriptions & Billing
          </Link>
          <Link href="/dashboard/superadmin/transactions" className={getLinkClass("/dashboard/superadmin/transactions")}>
            <Receipt size={18} /> Master Ledger
          </Link>
          <Link href="/dashboard/superadmin/settings" className={getLinkClass("/dashboard/superadmin/settings")}>
            <Settings size={18} /> Account Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-200/60">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-zinc-600 rounded-md hover:bg-red-50 hover:text-red-600 transition-colors font-medium text-sm"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="flex-1 w-full relative z-10 h-full overflow-y-auto pb-10">
        {children}
      </main>
      
    </div>
  );
}