"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"
import { Building2, LayoutDashboard, CreditCard, LogOut,Receipt, Settings } from "lucide-react";

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

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

  return (
    <div className="flex min-h-screen bg-zinc-50">
      {/* --- SUPERADMIN SIDEBAR --- */}
      <aside className="w-64 bg-zinc-900 text-zinc-300 hidden md:flex flex-col border-r border-zinc-800">
        <div className="p-6 border-b border-zinc-800 bg-black/20">
          <h2 className="text-xl font-extrabold text-white tracking-tight">VMS Global</h2>
          <p className="text-xs text-amber-500 font-bold uppercase tracking-wider mt-1">Superadmin</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link 
            href="/dashboard/superadmin"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/superadmin" ? "bg-amber-500/10 text-amber-500" : "hover:bg-zinc-800 hover:text-white"}`}
          >
            <LayoutDashboard size={18} /> Global Analytics
          </Link>
          <Link 
            href="/dashboard/superadmin/companies"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/superadmin/companies" ? "bg-amber-500/10 text-amber-500" : "hover:bg-zinc-800 hover:text-white"}`}
          >
            <Building2 size={18} /> Manage Companies
          </Link>
          <Link 
            href="/dashboard/superadmin/billing"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/superadmin/billing" ? "bg-amber-500/10 text-amber-500" : "hover:bg-zinc-800 hover:text-white"}`}
          >
            <CreditCard size={18} /> Subscriptions & Billing
          </Link>
          <Link 
            href="/dashboard/superadmin/transactions" 
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/superadmin/transactions" ? "bg-zinc-800 text-white" : "hover:bg-zinc-900 hover:text-white"}`}
          >
            <Receipt size={18} /> Master Ledger
          </Link>
          <Link 
            href="/dashboard/superadmin/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors font-medium text-sm ${pathname === "/dashboard/superadmin/settings" ? "bg-amber-500/10 text-amber-500" : "hover:bg-zinc-800 hover:text-white"}`}
          >
            <Settings size={18} /> Account Settings
          </Link>
        </nav>

        <div className="p-4 border-t border-zinc-800 bg-black/20">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full text-zinc-400 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors font-medium text-sm"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* --- MAIN PAGE CONTENT --- */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}