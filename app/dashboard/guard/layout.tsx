"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { AlertOctagon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GuardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyGuardAccess = async () => {
      const { data: authData } = await supabase.auth.getUser();
      
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", authData.user.id)
          .single();

        if (profile?.company_id) {
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

    verifyGuardAccess();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 font-medium animate-pulse">Initializing Scanner...</p>
      </div>
    );
  }

  // SOFT LOCKOUT: Show a banner but still render the system
  if (isLocked) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="bg-red-600 text-white text-center py-2 text-sm font-semibold flex items-center justify-center gap-2 shrink-0 z-50">
          <AlertOctagon className="w-4 h-4" /> System Unpaid - Limited Functionality. Please contact administration.
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}