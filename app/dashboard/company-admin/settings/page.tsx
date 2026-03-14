"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, User, ShieldCheck, Loader2, Camera } from "lucide-react";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [companyId, setCompanyId] = useState("");
  
  // Rule States
  const [requirePhoto, setRequirePhoto] = useState(false);
  
  const [updatingRules, setUpdatingRules] = useState(false);
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
          .select("full_name, company_id")
          .eq("id", authData.user.id)
          .single();
          
        if (profile?.company_id) {
          setUserName(profile.full_name || "");
          setCompanyId(profile.company_id);

          // Fetch the company's specific rules
          const { data: company } = await supabase
            .from("companies")
            .select("require_photo")
            .eq("id", profile.company_id)
            .single();
            
          if (company) {
            setRequirePhoto(company.require_photo || false);
          }
        }
      }
    };
    fetchProfile();
  }, []);

  // --- AUTO-SAVE HANDLER FOR NATIVE CSS TOGGLE ---
  const handleTogglePhoto = async (checked: boolean) => {
    setRequirePhoto(checked);
    setUpdatingRules(true);
    setMessage(null);

    const { error } = await supabase.from("companies").update({ require_photo: checked }).eq("id", companyId);

    if (error) {
      setMessage({ type: "error", text: "Failed to update photo requirement." });
      setRequirePhoto(!checked); // Revert UI if it failed
    } else {
      setMessage({ type: "success", text: "Auto-saved successfully!" });
      setTimeout(() => setMessage(null), 2000);
    }
    setUpdatingRules(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (newPassword.length < 6) return setMessage({ type: "error", text: "Password must be 6+ chars." });
    if (newPassword !== confirmPassword) return setMessage({ type: "error", text: "Passwords don't match." });

    setLoadingPass(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setMessage({ type: "error", text: error.message });
    else {
      setMessage({ type: "success", text: "Password updated!" });
      setNewPassword(""); setConfirmPassword("");
    }
    setLoadingPass(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="border-b border-zinc-200 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Account Settings</h1>
            <p className="text-zinc-500 mt-1">Manage your profile, security, and building access rules.</p>
          </div>
          {updatingRules && <div className="flex items-center text-sm font-medium text-blue-600 animate-pulse"><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Saving...</div>}
        </div>

        {message && !updatingRules && (
          <div className={`p-4 rounded-lg text-sm font-medium border animate-in fade-in slide-in-from-top-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="space-y-6">
            <Card className="shadow-sm border-none bg-white">
              <CardHeader>
                <CardTitle className="text-lg">Profile Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 text-sm text-zinc-600 bg-zinc-50 p-3 rounded-md">
                  <User className="h-4 w-4 text-zinc-400" />
                  <span className="font-medium">{userName || "Loading..."}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-zinc-600 bg-zinc-50 p-3 rounded-md overflow-hidden">
                  <Mail className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                  <span className="truncate">{userEmail || "Loading..."}</span>
                </div>
              </CardContent>
            </Card>

            {/* BUILDING RULES CONTROLS */}
            <Card className="shadow-sm border-none bg-white border-l-4 border-l-blue-600">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <ShieldCheck className="mr-2 h-5 w-5 text-blue-600" /> Building Rules
                </CardTitle>
                <CardDescription>Changes automatically save instantly.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                
                {/* NATIVE SELFIE TOGGLE */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg border border-zinc-100 transition-colors">
                  <div className="space-y-0.5 pr-4">
                    <Label className="text-sm font-bold flex items-center gap-2 cursor-pointer" htmlFor="photo-toggle">
                      <Camera className="w-4 h-4 text-zinc-600"/> Require Photo
                    </Label>
                    <p className="text-[10px] text-zinc-500">Force visitors to take a selfie.</p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      id="photo-toggle"
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={requirePhoto}
                      onChange={(e) => handleTogglePhoto(e.target.checked)}
                      disabled={updatingRules}
                    />
                    <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
              </CardContent>
            </Card>
          </div>

          {/* Security */}
          <Card className="md:col-span-2 shadow-sm border-none bg-white h-fit">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <KeyRound className="mr-2 h-5 w-5 text-zinc-400" /> Security & Password
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <Input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label>Confirm New Password</Label>
                  <Input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="h-11" />
                </div>
                <Button type="submit" disabled={loadingPass} className="w-full md:w-auto px-8 h-11 bg-zinc-900 hover:bg-zinc-800 font-bold">
                  {loadingPass ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}