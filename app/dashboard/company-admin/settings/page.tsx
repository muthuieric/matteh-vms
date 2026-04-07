"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, User, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

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

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-zinc-200 pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Account Settings</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage your profile details and security credentials.</p>
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

        <div className="space-y-6">
          {/* Profile Details */}
          <Card className="shadow-sm border-zinc-200 bg-white">
            <CardHeader className="pb-4 border-b border-zinc-100 mb-4">
              <CardTitle className="text-xl font-bold flex items-center">
                <User className="mr-2 h-6 w-6 text-zinc-400" /> Profile Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-zinc-500 font-semibold">Full Name</Label>
                <div className="flex items-center space-x-3 text-base text-zinc-900 bg-zinc-50 p-4 rounded-xl border border-zinc-200 shadow-inner">
                  <span className="font-semibold">{userName || "Loading..."}</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-500 font-semibold">Email Address</Label>
                <div className="flex items-center space-x-3 text-base text-zinc-900 bg-zinc-50 p-4 rounded-xl border border-zinc-200 shadow-inner">
                  <Mail className="h-5 w-5 text-zinc-400 shrink-0" />
                  <span className="font-semibold">{userEmail || "Loading..."}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Update */}
          <Card className="shadow-sm border-zinc-200 bg-white">
            <CardHeader className="pb-6 border-b border-zinc-100 mb-4">
              <CardTitle className="flex items-center text-xl font-bold">
                <KeyRound className="mr-2 h-6 w-6 text-zinc-400" /> Security & Password
              </CardTitle>
              <CardDescription>Update your login credentials securely.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-5">
                <div className="space-y-2">
                  <Label className="font-semibold text-zinc-700">New Password</Label>
                  <Input 
                    type="password" 
                    required 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="h-12 bg-zinc-50 focus:ring-2 focus:ring-blue-600" 
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
                    className="h-12 bg-zinc-50 focus:ring-2 focus:ring-blue-600" 
                    placeholder="Type password again"
                  />
                </div>
                <div className="pt-2">
                  <Button 
                    type="submit" 
                    disabled={loadingPass || !newPassword || !confirmPassword} 
                    className="w-full md:w-auto px-8 h-12 text-base font-bold bg-zinc-900 hover:bg-zinc-800 transition-transform active:scale-95 shadow-sm"
                  >
                    {loadingPass ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Updating...</>
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
  );
}