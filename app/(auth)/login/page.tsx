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
        // Changed to maybeSingle() so it doesn't crash instantly if the row is missing
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("Error fetching profile:", profileError);
          throw new Error(`Database error: ${profileError.message}`);
        }

        // If the row doesn't exist, tell the user exactly what ID they need to use!
        if (!profile) {
          throw new Error(`Profile not found! Please check your database. Your exact Auth UUID is: ${authData.user.id}`);
        }

        // 3. The Magic: Dynamic Routing based on Role
        if (profile?.role === "super_admin" || profile?.role === "superadmin") {
          router.push("/dashboard/superadmin");
        } else if (profile?.role === "admin" || profile?.role === "company_admin") {
          router.push("/dashboard/company-admin");
        } else if (profile?.role === "guard") {
          router.push("/dashboard/guard");
        } else {
          setError(`Your account has an unknown role: ${profile.role}`);
          // Sign them back out if they are invalid
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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-sm shadow-lg border-t-4 border-t-zinc-900">
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