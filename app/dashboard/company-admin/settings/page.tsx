"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, User, ShieldCheck, Loader2, Camera, CheckCircle2, AlertCircle, Users, Briefcase, Car } from "lucide-react";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [companyId, setCompanyId] = useState("");
  
  // Dynamic Rule States
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [askHost, setAskHost] = useState(false);
  const [askPurpose, setAskPurpose] = useState(false);
  const [askVehicle, setAskVehicle] = useState(false);
  
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
            .select("require_photo, ask_host, ask_purpose, ask_vehicle")
            .eq("id", profile.company_id)
            .single();
            
          if (company) {
            setRequirePhoto(company.require_photo || false);
            setAskHost(company.ask_host || false);
            setAskPurpose(company.ask_purpose || false);
            setAskVehicle(company.ask_vehicle || false);
          }
        }
      }
    };
    fetchProfile();
  }, []);

  // --- REUSABLE AUTO-SAVE HANDLER ---
  const handleToggleRule = async (field: string, checked: boolean, setter: (val: boolean) => void) => {
    setter(checked);
    setUpdatingRules(true);
    setMessage(null);

    const { error } = await supabase.from("companies").update({ [field]: checked }).eq("id", companyId);

    if (error) {
      setMessage({ type: "error", text: `Failed to update the rule.` });
      setter(!checked); // Revert UI if it failed
    } else {
      setMessage({ type: "success", text: "Settings auto-saved successfully!" });
      setTimeout(() => setMessage(null), 3000);
    }
    setUpdatingRules(false);
  };

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
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-zinc-200 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Account Settings</h1>
            <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage your profile, security, and building access rules.</p>
          </div>
          {updatingRules && (
            <div className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full animate-pulse border border-blue-100">
              <Loader2 className="w-4 h-4 mr-2 animate-spin"/> Saving changes...
            </div>
          )}
        </div>

        {/* Global Message Banner */}
        {message && !updatingRules && (
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Profile & Rules */}
          <div className="space-y-6">
            
            {/* Profile Details */}
            <Card className="shadow-sm border-zinc-200 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Profile Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-3 text-sm text-zinc-700 bg-zinc-50 p-3.5 rounded-lg border border-zinc-100 shadow-inner">
                  <User className="h-5 w-5 text-zinc-400 shrink-0" />
                  <span className="font-semibold truncate">{userName || "Loading..."}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm text-zinc-700 bg-zinc-50 p-3.5 rounded-lg border border-zinc-100 shadow-inner">
                  <Mail className="h-5 w-5 text-zinc-400 shrink-0" />
                  <span className="font-semibold truncate">{userEmail || "Loading..."}</span>
                </div>
              </CardContent>
            </Card>

            {/* BUILDING RULES CONTROLS */}
            <Card className="shadow-sm border-0 border-l-4 border-l-blue-600 bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center">
                  <ShieldCheck className="mr-2 h-5 w-5 text-blue-600" /> Building Rules
                </CardTitle>
                <CardDescription className="text-xs">Changes apply instantly to the Guard Dashboard.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                
                {/* Ask Host Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 transition-colors shadow-sm hover:shadow-md">
                  <div className="space-y-1 pr-4">
                    <Label className="text-sm font-bold flex items-center gap-2 cursor-pointer text-zinc-900" htmlFor="host-toggle">
                      <Users className="w-4 h-4 text-zinc-500"/> Host Name
                    </Label>
                    <p className="text-xs text-zinc-500 leading-snug">Ask visitors who they are here to see.</p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      id="host-toggle" type="checkbox" className="sr-only peer" 
                      checked={askHost} onChange={(e) => handleToggleRule("ask_host", e.target.checked, setAskHost)} disabled={updatingRules}
                    />
                    <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Ask Purpose Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 transition-colors shadow-sm hover:shadow-md">
                  <div className="space-y-1 pr-4">
                    <Label className="text-sm font-bold flex items-center gap-2 cursor-pointer text-zinc-900" htmlFor="purpose-toggle">
                      <Briefcase className="w-4 h-4 text-zinc-500"/> Purpose of Visit
                    </Label>
                    <p className="text-xs text-zinc-500 leading-snug">Log the reason for the visitor's entry.</p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      id="purpose-toggle" type="checkbox" className="sr-only peer" 
                      checked={askPurpose} onChange={(e) => handleToggleRule("ask_purpose", e.target.checked, setAskPurpose)} disabled={updatingRules}
                    />
                    <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Ask Vehicle Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 transition-colors shadow-sm hover:shadow-md">
                  <div className="space-y-1 pr-4">
                    <Label className="text-sm font-bold flex items-center gap-2 cursor-pointer text-zinc-900" htmlFor="vehicle-toggle">
                      <Car className="w-4 h-4 text-zinc-500"/> Vehicle Reg
                    </Label>
                    <p className="text-xs text-zinc-500 leading-snug">Log the license plate if driving.</p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      id="vehicle-toggle" type="checkbox" className="sr-only peer" 
                      checked={askVehicle} onChange={(e) => handleToggleRule("ask_vehicle", e.target.checked, setAskVehicle)} disabled={updatingRules}
                    />
                    <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* Require Photo Toggle */}
                <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl border border-zinc-200 transition-colors shadow-sm hover:shadow-md">
                  <div className="space-y-1 pr-4">
                    <Label className="text-sm font-bold flex items-center gap-2 cursor-pointer text-zinc-900" htmlFor="photo-toggle">
                      <Camera className="w-4 h-4 text-zinc-500"/> Require Photo
                    </Label>
                    <p className="text-xs text-zinc-500 leading-snug">Guards must capture a selfie.</p>
                  </div>
                  
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      id="photo-toggle" type="checkbox" className="sr-only peer" 
                      checked={requirePhoto} onChange={(e) => handleToggleRule("require_photo", e.target.checked, setRequirePhoto)} disabled={updatingRules}
                    />
                    <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN: Security */}
          <Card className="md:col-span-2 shadow-sm border-zinc-200 bg-white h-fit">
            <CardHeader className="pb-6 border-b border-zinc-100 mb-4">
              <CardTitle className="flex items-center text-xl font-bold">
                <KeyRound className="mr-2 h-6 w-6 text-zinc-400" /> Security & Password
              </CardTitle>
              <CardDescription>Update your login credentials securely.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-5 max-w-md">
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