"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Building2, User, Mail, Lock, ArrowRight, ShieldCheck, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    companyName: "",
    address: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match. Please try again.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.error) {
        alert(`Registration failed: ${data.error}`);
      } else {
        setSuccess(true);
      }
    } catch (error) {
      console.error(error);
      alert("A network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-zinc-100 p-8 text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border-8 border-green-500/10">
            <ShieldCheck className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Application Received</h2>
          <p className="text-zinc-500 leading-relaxed text-sm">
            Thank you for registering <strong>{formData.companyName}</strong>. Your account is currently under review by our administration team. 
          </p>
          <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm font-medium border border-blue-100">
            Once approved, you will receive an email and your <strong>1-Month Free Trial</strong> will begin instantly.
          </div>
          <Button className="w-full h-12 text-base font-bold" asChild>
            <Link href="/login">Return to Login</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10 h-screen overflow-y-auto">
        <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-zinc-100 my-auto">
          
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-6 shadow-md">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Register your Building</h2>
            <p className="text-zinc-500 mt-2 text-sm">Create an admin account to start your 1-month free trial.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 mt-8">
            <div className="space-y-1.5">
              <Label className="text-zinc-700 font-semibold">Company / Building Name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                <Input 
                  required 
                  placeholder="e.g. Skyline Towers" 
                  className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900"
                  value={formData.companyName}
                  onChange={(e) => setFormData({...formData, companyName: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-zinc-700 font-semibold">Physical Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                <Input 
                  required 
                  placeholder="e.g. Westlands, Nairobi" 
                  className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-2">
              <Label className="text-zinc-700 font-semibold">Admin Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                <Input 
                  required 
                  placeholder="John Doe" 
                  className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900"
                  value={formData.fullName}
                  onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-700 font-semibold">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                  <Input 
                    required 
                    type="email" 
                    placeholder="admin@building.com" 
                    className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-700 font-semibold">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                  <Input 
                    required 
                    type="tel" 
                    placeholder="+254 7..." 
                    className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-zinc-700 font-semibold">Secure Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                  <Input 
                    required 
                    type="password" 
                    minLength={6}
                    placeholder="Minimum 6 characters" 
                    className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-zinc-700 font-semibold">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-zinc-400" />
                  <Input 
                    required 
                    type="password" 
                    minLength={6}
                    placeholder="Retype password" 
                    className="pl-10 h-11 bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full h-12 mt-6 text-base font-bold bg-zinc-900 hover:bg-zinc-800 shadow-lg" disabled={loading}>
              {loading ? <><Loader2 className="w-5 h-5 mr-2 animate-spin"/> Processing...</> : <>Submit Application <ArrowRight className="w-5 h-5 ml-2"/></>}
            </Button>
          </form>

          <p className="text-center text-sm text-zinc-500 mt-6 pb-4">
            Already have an account? <Link href="/login" className="text-blue-600 font-semibold hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>

      {/* Right Side - Branding / Marketing */}
      <div className="hidden lg:flex flex-1 bg-zinc-900 text-white flex-col justify-center px-16 relative overflow-hidden">
        {/* Abstract Background Design */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />

        <div className="relative z-10 max-w-lg">
          <h1 className="text-5xl font-black tracking-tight mb-6 leading-tight">Modernize your visitor management.</h1>
          <p className="text-xl text-zinc-400 mb-10 leading-relaxed">
            Join the platform that secures buildings, streamlines check-ins, and provides real-time analytics.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Bank-Grade Security</h3>
                <p className="text-zinc-400 text-sm">Full digital logs and instantaneous guard alerts.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                <Building2 className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h3 className="font-bold text-lg">Multi-Tenant Architecture</h3>
                <p className="text-zinc-400 text-sm">Manage entire departments and rule sets seamlessly.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}