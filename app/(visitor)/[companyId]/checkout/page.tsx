"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertOctagon, CheckCircle2, LogOut, KeyRound } from "lucide-react";

export default function PublicGateCheckOut() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  
  // Form State
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // 2-Step State
  const [visitorDetails, setVisitorDetails] = useState<any | null>(null);
  const [checkedOutName, setCheckedOutName] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!companyId) return;

      const { data: company, error } = await supabase
        .from("companies")
        .select("name, is_locked, subscription_ends_at")
        .eq("id", companyId)
        .single();

      if (error || !company) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setCompanyName(company.name);
      setLoading(false);
    };

    fetchCompanyData();
  }, [companyId]);

  // --- Step 1: Search for the visitor using their OTP code ---
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/visitors/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, otp: otp.trim(), action: 'verify' }) // ACTION = VERIFY
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to find visit.");
      }

      // Success! Show details on screen.
      setVisitorDetails(result.visitor);

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Step 2: Actually check them out ---
  const handleCheckout = async () => {
    if (!visitorDetails) return;
    
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await fetch('/api/visitors/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId, otp: otp.trim(), action: 'checkout' }) // ACTION = CHECKOUT
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to check out.");
      }

      // Success! Show goodbye screen.
      setCheckedOutName(result.visitorName || visitorDetails.name);

    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
          <p className="text-zinc-500 font-medium">Loading checkout portal...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-900 bg-zinc-900 text-zinc-100 shadow-2xl text-center p-6">
          <AlertOctagon className="w-16 h-16 text-red-50 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-white mb-2">System Unavailable</CardTitle>
          <CardDescription className="text-zinc-400 text-base">
            This building's self-service system is currently offline. Please speak directly to the security guard at the gate to check out.
          </CardDescription>
        </Card>
      </div>
    );
  }

  // --- View 3: Goodbye Screen (After Checkout) ---
  if (checkedOutName) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4 py-8 relative overflow-hidden">
        <Card className="max-w-md w-full border-t-4 border-t-green-500 shadow-xl text-center p-8 bg-white/95 backdrop-blur-sm z-10">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <CardTitle className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Goodbye, {checkedOutName.split(' ')[0]}!</CardTitle>
          <p className="text-zinc-500 font-medium leading-relaxed">
            You have successfully checked out of <strong className="text-zinc-900">{companyName}</strong>. Safe travels!
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 py-8 flex items-center justify-center relative overflow-hidden">
      
      <Card className="w-full max-w-md shadow-2xl relative border-t-4 border-t-zinc-900 bg-white z-10">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-12 h-12 bg-zinc-100 text-zinc-900 rounded-full flex items-center justify-center mb-4">
            <LogOut className="w-6 h-6 ml-1" />
          </div>
          <CardDescription className="uppercase tracking-widest font-bold text-xs text-zinc-500 mb-1">{companyName}</CardDescription>
          <CardTitle className="text-2xl font-black text-zinc-900 tracking-tight">Visitor Check-Out</CardTitle>
          <p className="text-sm text-zinc-500 mt-2">Enter the gate code you received upon entry.</p>
        </CardHeader>
        
        <CardContent>
          {!visitorDetails ? (
            // --- View 1: Search Form ---
            <form onSubmit={handleSearch} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 text-center mb-4">
                  {errorMsg}
                </div>
              )}

              <div>
                <Label className="mb-2 block font-semibold text-zinc-700 text-center">Your 4-Digit Exit Code</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
                  <Input 
                    required 
                    value={otp} 
                    onChange={(e) => setOtp(e.target.value)} 
                    placeholder="e.g. 8492" 
                    className="h-14 pl-11 bg-zinc-50 text-2xl tracking-widest text-center font-bold shadow-inner" 
                  />
                </div>
              </div>

              <Button type="submit" className="w-full mt-6 h-14 text-lg font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg transition-transform active:scale-[0.98]" disabled={isSubmitting || !otp.trim()}>
                {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Locating Visit...</> : "Verify Code"}
              </Button>
            </form>
          ) : (
            // --- View 2: Confirm Details & Checkout ---
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-xl space-y-3 shadow-sm">
                
                {/* Image display if available */}
                {visitorDetails.photo_url && (
                  <div className="flex justify-center mb-4">
                    <img src={visitorDetails.photo_url} alt="Visitor" className="w-20 h-20 rounded-full object-cover border-2 border-zinc-200 shadow-sm" />
                  </div>
                )}

                <div className="flex justify-between border-b border-zinc-200/60 pb-2">
                  <span className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Name</span>
                  <span className="font-bold text-zinc-900">{visitorDetails.name}</span>
                </div>
                {visitorDetails.phone && (
                  <div className="flex justify-between border-b border-zinc-200/60 pb-2">
                    <span className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Phone</span>
                    <span className="font-bold text-zinc-900">{visitorDetails.phone}</span>
                  </div>
                )}
                <div className="flex justify-between pb-1">
                  <span className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Arrived At</span>
                  <span className="font-bold text-blue-600">
                    {visitorDetails.created_at ? new Date(visitorDetails.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                  </span>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-sm font-medium rounded-lg border border-red-200 text-center">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-3">
                <Button 
                  onClick={handleCheckout} 
                  className="w-full h-14 text-lg font-bold bg-red-600 hover:bg-red-700 text-white shadow-lg transition-transform active:scale-[0.98]" 
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <><Loader2 className="animate-spin mr-2 h-5 w-5" /> Processing...</> : "Confirm & Sign Out"}
                </Button>
                <Button 
                  onClick={() => { setVisitorDetails(null); setOtp(""); }} 
                  variant="outline" 
                  className="w-full h-12 font-bold text-zinc-600 hover:bg-zinc-100"
                  disabled={isSubmitting}
                >
                  Not Me? Try Again
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}