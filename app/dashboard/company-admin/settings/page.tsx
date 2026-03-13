"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Mail, User } from "lucide-react";

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
          
        if (profile) setUserName(profile.full_name || "");
      }
    };
    fetchProfile();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);

    // Supabase handles the secure password update automatically for the logged-in user
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setMessage({ type: "success", text: "Password updated successfully!" });
      setNewPassword("");
      setConfirmPassword("");
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-3xl mx-auto space-y-8">
        
        <div className="border-b border-zinc-200 pb-4">
          <h1 className="text-3xl font-bold text-zinc-900">Account Settings</h1>
          <p className="text-zinc-500 mt-1">Manage your profile and security credentials.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Profile Overview Card */}
          <Card className="md:col-span-1 shadow-sm h-fit">
            <CardHeader>
              <CardTitle className="text-lg">Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3 text-sm text-zinc-600">
                <User className="h-4 w-4 text-zinc-400" />
                <span className="font-medium">{userName || "Loading..."}</span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-zinc-600 overflow-hidden">
                <Mail className="h-4 w-4 text-zinc-400 flex-shrink-0" />
                <span className="truncate">{userEmail || "Loading..."}</span>
              </div>
            </CardContent>
          </Card>

          {/* Change Password Card */}
          <Card className="md:col-span-2 shadow-sm border-t-4 border-t-zinc-900">
            <CardHeader>
              <CardTitle className="flex items-center">
                <KeyRound className="mr-2 h-5 w-5 text-zinc-500" /> Security
              </CardTitle>
              <CardDescription>Update your account password to stay secure.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                
                {message && (
                  <div className={`p-3 rounded-md text-sm font-medium border ${
                    message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                </div>

                <Button type="submit" disabled={loading} className="mt-4">
                  {loading ? "Updating..." : "Update Password"}
                </Button>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}