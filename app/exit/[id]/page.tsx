"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, AlertOctagon, CheckCircle2, ShieldCheck, DoorOpen } from "lucide-react";

type Visitor = {
  id: string;
  name: string;
  status: "pending" | "checked_in" | "checked_out" | "auto_checked_out";
  company_id: string;
};

export default function ExitPassPage() {
  const params = useParams();
  const visitorId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [visitor, setVisitor] = useState<Visitor | null>(null);
  const [companyName, setCompanyName] = useState<string>("Building Security");

  useEffect(() => {
    const fetchVisitorPass = async () => {
      if (!visitorId) return;

      // 1. Fetch the visitor details
      const { data: visitorData, error } = await supabase
        .from("visitors")
        .select("id, name, status, company_id")
        .eq("id", visitorId)
        .single();

      if (error || !visitorData) {
        console.error("Error fetching visitor:", error);
        setLoading(false);
        return;
      }

      setVisitor(visitorData);

      // 2. Fetch the building name
      const { data: companyData } = await supabase
        .from("companies")
        .select("name")
        .eq("id", visitorData.company_id)
        .single();

      if (companyData) {
        setCompanyName(companyData.name);
      }

      setLoading(false);
    };

    fetchVisitorPass();
  }, [visitorId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-zinc-400 mb-4" />
          <p className="text-zinc-500 font-medium tracking-widest uppercase text-sm">Loading Secure Pass...</p>
        </div>
      </div>
    );
  }

  if (!visitor) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-900 bg-zinc-900 text-zinc-100 shadow-2xl text-center p-6">
          <AlertOctagon className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-white mb-2">Pass Not Found</CardTitle>
          <CardDescription className="text-zinc-400 text-base">
            We couldn't find a valid exit pass for this link. The pass may have expired or the link is broken.
          </CardDescription>
        </Card>
      </div>
    );
  }

  const isCheckedOut = visitor.status === "checked_out" || visitor.status === "auto_checked_out";

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />

      <Card className="w-full max-w-sm shadow-2xl relative border-0 bg-white z-10 overflow-hidden rounded-3xl">
        {/* Top colored bar based on status */}
        <div className={`w-full h-3 ${isCheckedOut ? 'bg-zinc-400' : 'bg-blue-600'}`}></div>
        
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mb-4 border border-zinc-200 shadow-sm">
            <ShieldCheck className={`w-6 h-6 ${isCheckedOut ? 'text-zinc-400' : 'text-blue-600'}`} />
          </div>
          <CardDescription className="uppercase tracking-widest font-bold text-xs text-zinc-400 mb-1">
            {companyName}
          </CardDescription>
          <CardTitle className="text-3xl font-black text-zinc-900 tracking-tight">Digital Pass</CardTitle>
        </CardHeader>
        
        <CardContent className="flex flex-col items-center p-6 pt-0 space-y-6">
          
          <div className="text-center">
            <p className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-1">Visitor Name</p>
            <p className="text-xl font-bold text-zinc-900">{visitor.name}</p>
          </div>

          {/* DYNAMIC PASS STATE */}
          {isCheckedOut ? (
             <div className="w-full py-12 flex flex-col items-center justify-center bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200">
               <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center mb-4">
                 <DoorOpen className="w-8 h-8 text-zinc-500" />
               </div>
               <h3 className="font-bold text-xl text-zinc-900 mb-1">Checked Out</h3>
               <p className="text-zinc-500 text-sm font-medium text-center max-w-[200px]">This pass has already been used to exit the building.</p>
             </div>
          ) : (
            <>
              {/* QR Code Container */}
              <div className="p-4 bg-white border-2 border-zinc-200 rounded-3xl shadow-sm relative">
                {/* Generates a QR code containing the visitor's unique ID */}
                <Image 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${visitor.id}`}
                  alt="Exit Pass QR Code"
                  width={220}
                  height={220}
                  className="rounded-xl"
                  unoptimized
                />
                {/* Scanning overlay animation */}
                <div className="absolute top-0 left-0 w-full h-1 bg-blue-500/50 animate-[scan_2s_ease-in-out_infinite] shadow-[0_0_15px_rgba(59,130,246,0.5)]"></div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 w-full flex items-start gap-3">
                <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="font-bold text-xs">i</span>
                </div>
                <p className="text-sm text-blue-800 font-medium leading-relaxed">
                  Present this QR code to the security guard or automated gate scanner when exiting the premises.
                </p>
              </div>
            </>
          )}

        </CardContent>
      </Card>
      
      <p className="text-zinc-600 text-xs font-medium uppercase tracking-widest mt-8 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-zinc-500" /> Secure Entry System
      </p>

      {/* Global style for the scanning animation */}
      {/* <style dangerouslySetContent={{__html: `
        @keyframes scan {
          0% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}} /> */}
    </div>
  );
}