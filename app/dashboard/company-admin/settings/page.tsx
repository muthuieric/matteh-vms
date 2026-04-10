"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, User, Loader2, CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loadingPass, setLoadingPass] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        setUserEmail(authData.user.email || "");
        
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", authData.user.id)
          .single();
          
        if (profile) {
          setUserName(profile.full_name || "");
        }
      }
    };
    fetchProfile();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 6) return setMessage({ type: "error", text: "Password must be at least 6 characters long." });
    if (newPassword !== confirmPassword) return setMessage({ type: "error", text: "New passwords do not match." });

    setLoadingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Password updated successfully!" });
      setNewPassword(""); 
      setConfirmPassword("");
    }
    setLoadingPass(false);
  };

  // Helper to get initials for the avatar
  const getInitials = (name: string) => {
    if (!name) return "";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-zinc-200 pb-4 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Account Settings</h1>
            <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage your profile details and security credentials.</p>
          </div>
        </div>

        {/* Global Message Banner */}
        {message && (
          <div className={`p-4 rounded-xl text-sm font-medium border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />}
            <div>
              <p className="font-bold">{message.type === 'success' ? 'Success' : 'Action Failed'}</p>
              <p className="mt-0.5">{message.text}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8">
          
          {/* Profile Details Column (Left side on desktop) */}
          <div className="md:col-span-5 lg:col-span-4 space-y-6">
            <Card className="shadow-sm border-zinc-200 bg-white overflow-hidden">
              <div className="h-24 bg-zinc-900 w-full relative">
                 {/* Decorative background pattern */}
                 <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white to-transparent"></div>
              </div>
              <CardContent className="px-6 pb-6 pt-0 relative">
                
                {/* Floating Avatar */}
                <div className="h-20 w-20 rounded-full bg-white border-4 border-white shadow-md flex items-center justify-center text-2xl font-bold text-zinc-900 -mt-10 relative z-10 mx-auto md:mx-0">
                  {userName ? getInitials(userName) : <User className="w-8 h-8 text-zinc-400" />}
                </div>

                <div className="mt-4 text-center md:text-left">
                  <h3 className="text-xl font-bold text-zinc-900">{userName || "Loading..."}</h3>
                  <p className="text-sm font-medium text-blue-600 flex items-center justify-center md:justify-start gap-1.5 mt-1">
                    <ShieldCheck className="w-4 h-4" /> System Administrator
                  </p>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-4 transition-colors hover:bg-zinc-100/80">
                    <div className="h-10 w-10 rounded-full bg-white shadow-sm border border-zinc-200 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Full Name</p>
                      <p className="font-semibold text-zinc-900 truncate">{userName || "—"}</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-4 transition-colors hover:bg-zinc-100/80">
                    <div className="h-10 w-10 rounded-full bg-white shadow-sm border border-zinc-200 flex items-center justify-center shrink-0">
                      <Mail className="h-5 w-5 text-zinc-500" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-0.5">Email Address</p>
                      <p className="font-semibold text-zinc-900 truncate">{userEmail || "—"}</p>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>
          </div>

          {/* Password Update Column (Right side on desktop) */}
          <div className="md:col-span-7 lg:col-span-8">
            <Card className="shadow-sm border-zinc-200 bg-white h-full">
              <CardHeader className="pb-6 border-b border-zinc-100/60 mb-6">
                <CardTitle className="flex items-center text-xl font-bold">
                  <KeyRound className="mr-2 h-5 w-5 text-zinc-500" /> Security Settings
                </CardTitle>
                <CardDescription>Ensure your account is using a long, random password to stay secure.</CardDescription>
              </CardHeader>
              <CardContent className="max-w-md">
                <form onSubmit={handleUpdatePassword} className="space-y-5">
                  <div className="space-y-2">
                    <Label className="font-semibold text-zinc-700">New Password</Label>
                    <Input 
                      type="password" 
                      required 
                      value={newPassword} 
                      onChange={(e) => setNewPassword(e.target.value)} 
                      className="h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-colors" 
                      placeholder="Enter at least 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold text-zinc-700">Confirm New Password</Label>
                    <Input 
                      type="password" 
                      required 
                      value={confirmPassword} 
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      className="h-11 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900 transition-colors" 
                      placeholder="Type password again"
                    />
                  </div>
                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={loadingPass || !newPassword || !confirmPassword} 
                      className="w-full sm:w-auto h-11 px-8 text-sm font-bold bg-zinc-900 hover:bg-zinc-800 text-white transition-transform active:scale-[0.98] shadow-sm"
                    >
                      {loadingPass ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}