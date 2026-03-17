"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Copy, CheckCircle2, QrCode, LogOut, Loader2 } from "lucide-react";

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

  // Bulletproof copy function (works in all browsers and secure iframes)
  const handleCopy = (text: string, setCopiedState: (val: boolean) => void) => {
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedState(true);
      setTimeout(() => setCopiedState(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  if (loading) {
    return (
      <div className="h-full p-4 flex flex-col items-center justify-center text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
        <p className="font-medium">Generating your secure QR codes...</p>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="h-full p-4 flex flex-col items-center justify-center">
        <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-200 text-center max-w-md">
          <p className="font-bold text-lg mb-1">Profile Error</p>
          <p className="text-sm">Could not verify your building assignment. Please try logging in again.</p>
        </div>
      </div>
    );
  }

  const gateQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=20&data=${encodeURIComponent(gateUrl)}`;
  const checkoutQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&margin=20&data=${encodeURIComponent(checkoutUrl)}`;

  return (
    <div className="h-full bg-zinc-50 p-4 md:p-6 flex flex-col items-center">
      
      {/* Print CSS to make them print on separate pages beautifully */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page { size: A4 portrait; margin: 0; }
          body { background-color: white !important; -webkit-print-color-adjust: exact; }
          .hide-on-print { display: none !important; }
          .print-poster-container { 
            max-width: 100% !important; 
            box-shadow: none !important; 
            border: none !important; 
            break-inside: avoid; 
            page-break-after: always;
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .print-poster-container:last-child { page-break-after: auto; }
        }
      `}} />

      <div className="max-w-5xl w-full space-y-4 md:space-y-6">

        {/* --- HEADER --- */}
        <div className="border-b border-zinc-200 pb-3 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-3 hide-on-print">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-zinc-900">Printable Gate Codes</h1>
            <p className="text-xs md:text-sm text-zinc-500 mt-0.5">Display these posters at your building's entrance and exit points.</p>
          </div>
          <Button onClick={handlePrint} size="sm" className="bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm w-full sm:w-auto h-9 px-4 text-xs font-medium">
            <Printer className="mr-2 h-4 w-4" /> Print Posters
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          
          {/* --- ENTRY POSTER --- */}
          <div className="space-y-3">
            {/* The print: classes ensure it expands to massive size ONLY when printing */}
            <Card className="print-poster-container shadow-md border-0 border-t-4 print:border-t-8 border-t-blue-600 bg-white overflow-hidden rounded-xl">
              <CardHeader className="text-center pb-0 pt-5 print:pt-10">
                <div className="w-12 h-12 print:w-16 print:h-16 bg-blue-50 rounded-xl print:rounded-2xl flex items-center justify-center mx-auto mb-2 print:mb-4 hide-on-print">
                  <QrCode className="w-6 h-6 print:w-8 print:h-8 text-blue-600" />
                </div>
                <CardTitle className="text-2xl print:text-5xl font-black tracking-tight uppercase text-zinc-900">
                  Visitor Check-In
                </CardTitle>
                <CardDescription className="text-xs print:text-xl text-zinc-600 mt-1 print:mt-4 font-medium max-w-[280px] print:max-w-sm mx-auto leading-snug print:leading-relaxed">
                  Scan this code with your phone camera to register before entering.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4 print:space-y-10 pt-4 print:pt-8 pb-6 print:pb-14">
                <div className="p-2 bg-white border-4 print:border-8 border-zinc-100 rounded-2xl print:rounded-3xl shadow-sm inline-block">
                  <img src={gateQrCodeUrl} alt="Gate Check-in QR" className="w-36 h-36 print:w-72 print:h-72 object-contain rounded-lg print:rounded-xl" />
                </div>
                
                <div className="w-full max-w-[240px] print:max-w-xs space-y-2 print:space-y-3 text-left bg-zinc-50 p-3 print:p-6 rounded-xl print:rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-2 print:gap-3">
                    <span className="flex items-center justify-center w-5 h-5 print:w-6 print:h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] print:text-xs">1</span>
                    <p className="text-[11px] print:text-sm font-bold text-zinc-700 uppercase tracking-wide">Scan with Camera</p>
                  </div>
                  <div className="flex items-center gap-2 print:gap-3">
                    <span className="flex items-center justify-center w-5 h-5 print:w-6 print:h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] print:text-xs">2</span>
                    <p className="text-[11px] print:text-sm font-bold text-zinc-700 uppercase tracking-wide">Enter Your Details</p>
                  </div>
                  <div className="flex items-center gap-2 print:gap-3">
                    <span className="flex items-center justify-center w-5 h-5 print:w-6 print:h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] print:text-xs">3</span>
                    <p className="text-[11px] print:text-sm font-bold text-zinc-700 uppercase tracking-wide">Show Screen to Guard</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hide-on-print shadow-sm border-zinc-200">
              <CardHeader className="p-3 pb-1.5">
                <CardTitle className="text-xs font-bold text-zinc-800">Direct Entry Link</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 flex gap-2">
                <Input value={gateUrl} readOnly className="bg-zinc-50 font-mono text-[10px] sm:text-xs h-8 text-zinc-600 focus-visible:ring-0" />
                <Button 
                  variant={copiedGate ? "default" : "outline"} 
                  size="sm"
                  className={`h-8 px-2.5 ${copiedGate ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : "text-zinc-700"}`}
                  onClick={() => handleCopy(gateUrl, setCopiedGate)}
                >
                  {copiedGate ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* --- EXIT POSTER --- */}
          <div className="space-y-3">
            <Card className="print-poster-container shadow-md border-0 border-t-4 print:border-t-8 border-t-amber-500 bg-white overflow-hidden rounded-xl">
              <CardHeader className="text-center pb-0 pt-5 print:pt-10">
                <div className="w-12 h-12 print:w-16 print:h-16 bg-amber-50 rounded-xl print:rounded-2xl flex items-center justify-center mx-auto mb-2 print:mb-4 hide-on-print">
                  <LogOut className="w-6 h-6 print:w-8 print:h-8 text-amber-600" />
                </div>
                <CardTitle className="text-2xl print:text-5xl font-black tracking-tight uppercase text-zinc-900">
                  Fast-Track Exit
                </CardTitle>
                <CardDescription className="text-xs print:text-xl text-zinc-600 mt-1 print:mt-4 font-medium max-w-[280px] print:max-w-sm mx-auto leading-snug print:leading-relaxed">
                  Scan this code to securely check out using your SMS exit pin.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center space-y-4 print:space-y-10 pt-4 print:pt-8 pb-6 print:pb-14">
                <div className="p-2 bg-white border-4 print:border-8 border-zinc-100 rounded-2xl print:rounded-3xl shadow-sm inline-block">
                  <img src={checkoutQrCodeUrl} alt="Gate Checkout QR" className="w-36 h-36 print:w-72 print:h-72 object-contain rounded-lg print:rounded-xl" />
                </div>
                
                <div className="w-full max-w-[240px] print:max-w-xs space-y-2 print:space-y-3 text-left bg-zinc-50 p-3 print:p-6 rounded-xl print:rounded-2xl border border-zinc-100">
                  <div className="flex items-center gap-2 print:gap-3">
                    <span className="flex items-center justify-center w-5 h-5 print:w-6 print:h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] print:text-xs">1</span>
                    <p className="text-[11px] print:text-sm font-bold text-zinc-700 uppercase tracking-wide">Scan with Camera</p>
                  </div>
                  <div className="flex items-center gap-2 print:gap-3">
                    <span className="flex items-center justify-center w-5 h-5 print:w-6 print:h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] print:text-xs">2</span>
                    <p className="text-[11px] print:text-sm font-bold text-zinc-700 uppercase tracking-wide">Enter SMS OTP</p>
                  </div>
                  <div className="flex items-center gap-2 print:gap-3">
                    <span className="flex items-center justify-center w-5 h-5 print:w-6 print:h-6 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] print:text-xs">3</span>
                    <p className="text-[11px] print:text-sm font-bold text-zinc-700 uppercase tracking-wide">Exit Securely</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hide-on-print shadow-sm border-zinc-200">
              <CardHeader className="p-3 pb-1.5">
                <CardTitle className="text-xs font-bold text-zinc-800">Direct Checkout Link</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0 flex gap-2">
                <Input value={checkoutUrl} readOnly className="bg-zinc-50 font-mono text-[10px] sm:text-xs h-8 text-zinc-600 focus-visible:ring-0" />
                <Button 
                  variant={copiedCheckout ? "default" : "outline"} 
                  size="sm"
                  className={`h-8 px-2.5 ${copiedCheckout ? "bg-green-600 hover:bg-green-700 text-white border-green-600" : "text-zinc-700"}`}
                  onClick={() => handleCopy(checkoutUrl, setCopiedCheckout)}
                >
                  {copiedCheckout ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
              </CardContent>
            </Card>
          </div>
          
        </div>
      </div>
    </div>
  );
}