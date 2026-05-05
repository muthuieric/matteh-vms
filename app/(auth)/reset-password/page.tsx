"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Check if passwords match
    if (password !== confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    // 2. ENHANCED SECURITY: Check password strength to match Supabase settings
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      alert("Weak Password: It must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.");
      return;
    }

    setLoading(true);

    try {
      // Supabase automatically establishes a session from the recovery link hash
      // We just need to update the user's password for this active session
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        alert("Password successfully updated! You can now log in.");
        router.push("/login");
      }
    } catch (error) {
      console.error(error);
      alert("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-zinc-50 items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-zinc-100">
        <div className="text-center">
          <div className="mx-auto w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-6 shadow-md">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Set New Password</h2>
          <p className="text-zinc-500 mt-2 text-sm">Please enter a strong new password below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 mt-8">
          <div className="space-y-1.5">
            <Label className="text-zinc-700 font-semibold">New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
              <Input 
                required 
                type="password" 
                minLength={8}
                placeholder="Min 8 chars, 1 uppercase, 1 symbol" 
                className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-700 font-semibold">Confirm New Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
              <Input 
                required 
                type="password" 
                minLength={8}
                placeholder="Retype new password" 
                className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-12 mt-6 text-base font-bold bg-zinc-900 hover:bg-zinc-800 shadow-lg" disabled={loading}>
            {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Updating...</> : <>Update Password <ArrowRight className="w-5 h-5 ml-2"/></>}
          </Button>
        </form>
      </div>
    </div>
  );
}