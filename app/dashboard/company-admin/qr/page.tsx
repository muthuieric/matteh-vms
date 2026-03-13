"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Copy, CheckCircle2 } from "lucide-react";

export default function QRCodeGenerator() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedGate, setCopiedGate] = useState(false);
  const [copiedCheckout, setCopiedCheckout] = useState(false);
  
  const [gateUrl, setGateUrl] = useState<string>("");
  const [checkoutUrl, setCheckoutUrl] = useState<string>("");

  useEffect(() => {
    const fetchCompanyId = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", authData.user.id)
          .single();

        if (profileData?.company_id) {
          setCompanyId(profileData.company_id);
          const baseUrl = window.location.origin;
          setGateUrl(`${baseUrl}/${profileData.company_id}/gate`);
          setCheckoutUrl(`${baseUrl}/${profileData.company_id}/checkout`);
        }
      }
      setLoading(false);
    };
    
    fetchCompanyId();
  }, []);

  const handlePrint = () => window.print();

  if (loading) return <div className="p-6 text-zinc-500">Loading your QR Codes...</div>;
  if (!companyId) return <div className="p-6 text-red-600 font-medium">Error: Could not verify your profile.</div>;

  const gateQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(gateUrl)}`;
  const checkoutQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(checkoutUrl)}`;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 flex flex-col items-center">
      
      {/* Print CSS to make them print on separate pages nicely */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background-color: white !important; }
          .hide-on-print { display: none !important; }
          .print-poster-container { max-width: 100% !important; box-shadow: none !important; border: none !important; break-inside: avoid; page-break-after: always; }
          .print-poster-container:last-child { page-break-after: auto; }
        }
      `}} />

      <div className="max-w-4xl w-full space-y-10">

        {/* Header (Hidden during print) */}
        <div className="flex justify-between items-center hide-on-print">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900">Gate & Exit QR Codes</h1>
            <p className="text-zinc-500 mt-1">Print these posters and display them at your entrance and exit.</p>
          </div>
          <Button onClick={handlePrint} className="bg-zinc-900 text-white hover:bg-zinc-800">
            <Printer className="mr-2 h-4 w-4" /> Print Posters
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ENTRY POSTER */}
          <div className="space-y-4">
            <Card className="print-poster-container shadow-lg border-t-8 border-t-blue-600 bg-white">
              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-4xl font-extrabold tracking-tight uppercase text-zinc-900">
                  Visitor Check-In
                </CardTitle>
                <CardDescription className="text-lg text-zinc-600 mt-4 font-medium max-w-sm mx-auto">
                  Scan to register before entering the building.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-8 pt-6 pb-12">
                <div className="p-4 bg-white border-4 border-zinc-200 rounded-2xl shadow-sm">
                  <img src={gateQrCodeUrl} alt="Gate Check-in QR" className="w-64 h-64 object-contain" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Step 1: Scan</p>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Step 2: Enter Details</p>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Step 3: Show Guard</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hide-on-print shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Direct Entry Link</CardTitle></CardHeader>
              <CardContent className="flex space-x-2">
                <Input value={gateUrl} readOnly className="bg-zinc-50 font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(gateUrl); setCopiedGate(true); setTimeout(()=>setCopiedGate(false), 2000); }}>
                  {copiedGate ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* EXIT POSTER */}
          <div className="space-y-4">
            <Card className="print-poster-container shadow-lg border-t-8 border-t-red-600 bg-white">
              <CardHeader className="text-center pb-2 pt-8">
                <CardTitle className="text-4xl font-extrabold tracking-tight uppercase text-zinc-900">
                  Fast-Track Exit
                </CardTitle>
                <CardDescription className="text-lg text-zinc-600 mt-4 font-medium max-w-sm mx-auto">
                  Scan to check out securely using your SMS code.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-8 pt-6 pb-12">
                <div className="p-4 bg-white border-4 border-zinc-200 rounded-2xl shadow-sm">
                  <img src={checkoutQrCodeUrl} alt="Gate Checkout QR" className="w-64 h-64 object-contain" />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Step 1: Scan</p>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Step 2: Enter SMS OTP</p>
                  <p className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Step 3: Exit</p>
                </div>
              </CardContent>
            </Card>

            <Card className="hide-on-print shadow-sm">
              <CardHeader className="pb-2"><CardTitle className="text-sm">Direct Checkout Link</CardTitle></CardHeader>
              <CardContent className="flex space-x-2">
                <Input value={checkoutUrl} readOnly className="bg-zinc-50 font-mono text-xs" />
                <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(checkoutUrl); setCopiedCheckout(true); setTimeout(()=>setCopiedCheckout(false), 2000); }}>
                  {copiedCheckout ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}