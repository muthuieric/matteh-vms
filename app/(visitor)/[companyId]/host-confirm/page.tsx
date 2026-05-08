"use client";

import { useState, Suspense } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, UserCircle, Search, ShieldCheck, ArrowLeft } from "lucide-react";

function HostConfirmContent() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [step, setStep] = useState<1 | 2 | 3>(1); 
  const [otpInput, setOtpInput] = useState("");
  const [visitor, setVisitor] = useState<any>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSearchVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput || otpInput.trim().length < 4) return;
    
    setErrorMsg("");
    setIsLoading(true);

    const { data, error } = await supabase
      .from("visitors")
      .select("*")
      .eq("company_id", companyId)
      .eq("otp_code", otpInput.trim())
      .order("created_at", { ascending: false }) 
      .limit(1)
      .single();

    setIsLoading(false);

    if (error || !data) {
      setErrorMsg("No active visitor found with this OTP code.");
      return;
    }

    setVisitor(data);

    // If already confirmed by the host, skip to success
    if (data.host_confirmed === true || data.status === "approved" || data.status === "visited") {
      setStep(3);
    } else {
      setStep(2);
    }
  };

  const handleConfirmVisit = async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      // Call our secure backend API to update the database
      const response = await fetch('/api/host-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorId: visitor.id, companyId })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to confirm visitor.");
      }

      // Success! Go to step 3
      setStep(3); 
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to confirm visit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 3) {
    return (
      <Card className="w-full max-w-md border-zinc-200 shadow-xl text-center p-8 bg-white/90 backdrop-blur-sm">
        <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
        <CardTitle className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Visit Confirmed!</CardTitle>
        <p className="text-zinc-500 font-medium leading-relaxed">
          You have successfully confirmed that <strong>{visitor?.name || "this visitor"}</strong> visited you at the office. The system has been updated.
        </p>
        <Button 
          variant="outline" 
          className="mt-8 w-full font-bold" 
          onClick={() => {
            setOtpInput("");
            setVisitor(null);
            setStep(1);
          }}
        >
          Confirm Another Visitor
        </Button>
      </Card>
    );
  }

  if (step === 2 && visitor) {
    return (
      <Card className="w-full max-w-md shadow-2xl relative border-t-4 border-t-blue-600 bg-white/95 backdrop-blur-sm z-10">
        <CardHeader className="text-center pb-6">
          <CardDescription className="uppercase tracking-widest font-bold text-xs text-blue-600 mb-1">Step 2: Review</CardDescription>
          <CardTitle className="text-2xl font-black text-zinc-900 tracking-tight">Confirm Arrival</CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="bg-zinc-50 rounded-xl p-6 border border-zinc-200 mb-6 flex flex-col items-center text-center">
            {visitor.photo_url ? (
              <Image 
                src={visitor.photo_url} 
                alt="Visitor" 
                width={80} height={80} 
                className="rounded-full object-cover border-2 border-white shadow-sm mb-4 h-20 w-20"
                unoptimized
              />
            ) : (
              <UserCircle className="w-20 h-20 text-zinc-300 mb-4" />
            )}
            <h3 className="text-xl font-bold text-zinc-900">{visitor.name}</h3>
            <p className="text-sm font-medium text-zinc-500 mt-1">Phone: {visitor.phone}</p>
            <p className="text-sm text-zinc-500 mt-1">Purpose: {visitor.purpose || "No stated purpose"}</p>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-md mb-4">{errorMsg}</p>
          )}

          <div className="flex gap-3">
            <Button 
              type="button" 
              variant="outline"
              className="flex-1 h-14 font-bold border-zinc-300 text-zinc-600" 
              onClick={() => setStep(1)}
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <Button 
              type="button" 
              className="flex-1 h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg transition-transform active:scale-[0.98]" 
              onClick={handleConfirmVisit}
              disabled={isLoading}
            >
              {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Updating...</> : <><ShieldCheck className="mr-2 h-5 w-5" /> Confirm Visitor Arrived</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md shadow-2xl relative border-t-4 border-t-blue-600 bg-white/95 backdrop-blur-sm z-10">
      <CardHeader className="text-center pb-6">
        <CardDescription className="uppercase tracking-widest font-bold text-xs text-blue-600 mb-1">Host Portal</CardDescription>
        <CardTitle className="text-2xl font-black text-zinc-900 tracking-tight">Lookup Visitor</CardTitle>
        <p className="text-sm text-zinc-500 mt-2">Enter the gate code the visitor received via SMS to verify their identity.</p>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSearchVisitor} className="space-y-4">
          <div>
            <Label className="mb-1 block font-semibold text-zinc-700 text-center">
              Visitor OTP Code
            </Label>
            <Input 
              required 
              value={otpInput} 
              onChange={(e) => setOtpInput(e.target.value)} 
              placeholder="e.g. 123456" 
              className="h-14 text-center text-2xl tracking-widest font-bold bg-zinc-50" 
            />
          </div>

          {errorMsg && (
            <p className="text-sm text-red-500 font-medium text-center bg-red-50 p-3 rounded-md">{errorMsg}</p>
          )}

          <Button type="submit" className="w-full h-14 text-lg font-bold bg-zinc-900 hover:bg-zinc-800 text-white shadow-lg transition-transform active:scale-[0.98]" disabled={isLoading || otpInput.length < 4}>
            {isLoading ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Searching...</> : <><Search className="mr-2 h-5 w-5" /> Find Visitor</>}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function HostConfirmWrapper() {
  return (
    <div className="min-h-screen bg-zinc-50 p-4 py-8 flex items-center justify-center relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-amber-400/20 blur-[100px] pointer-events-none" />
      
      <Suspense fallback={
        <div className="flex flex-col items-center z-10">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        </div>
      }>
        <HostConfirmContent />
      </Suspense>
    </div>
  );
}