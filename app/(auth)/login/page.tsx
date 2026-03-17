"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      // 2. Fetch the user's specific role from the profiles table
      if (authData.user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profileError) {
          throw new Error(`Database error: ${profileError.message}`);
        }

        if (!profile) {
          throw new Error(`Profile not found! Please check your database. Your exact Auth UUID is: ${authData.user.id}`);
        }

        // Clean up the role to avoid invisible space or capitalization bugs
        const rawRole = profile?.role || "";
        const userRole = rawRole.trim().toLowerCase();

        // 3. The Magic: Dynamic Routing based on Role
        // Using window.location.href for a hard refresh to bypass Next.js route caching
        if (userRole === "super_admin" || userRole === "superadmin") {
          window.location.href = "/dashboard/superadmin";
        } else if (userRole === "admin" || userRole === "company_admin") {
          window.location.href = "/dashboard/company-admin";
        } else if (userRole === "guard") {
          window.location.href = "/dashboard/guard";
        } else {
          setError(`Your account has an unknown role: "${rawRole}"`);
          await supabase.auth.signOut(); 
        }
      }
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Invalid login credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-50 p-4 overflow-hidden">
      
      {/* --- ENHANCED BACKGROUND --- */}
      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      {/* Soft Ambient Light Orbs */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-zinc-400/20 blur-[100px] pointer-events-none" />
      {/* --------------------------- */}

      <Card className="relative z-10 w-full max-w-sm shadow-2xl border-t-4 border-t-zinc-900 bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">VMS Portal</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-200 break-words">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@building.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in & Verifying Role..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}