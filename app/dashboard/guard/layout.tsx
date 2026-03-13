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
            .select("is_locked")
            .eq("id", profile.company_id)
            .single();

          if (company?.is_locked) {
            setIsLocked(true);
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

  // THE GUARD LOCKOUT SCREEN
  if (isLocked) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 p-6 rounded-full mb-6">
          <AlertOctagon className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">SYSTEM OFFLINE</h1>
        <p className="text-xl text-zinc-400 max-w-md mb-8">
          The Visitor Management System has been paused for your building. Please contact your Building Manager or Security Supervisor to restore access.
        </p>
        <Button size="lg" variant="outline" onClick={handleLogout} className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
          <LogOut className="w-5 h-5 mr-2" /> Sign Out of Tablet
        </Button>
      </div>
    );
  }

  return <>{children}</>;
}