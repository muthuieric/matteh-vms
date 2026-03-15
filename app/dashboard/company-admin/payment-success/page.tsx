"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");

  useEffect(() => {
    // PesaPal attaches these to the URL when it redirects the user back
    const orderTrackingId = searchParams.get("OrderTrackingId");
    const merchantReference = searchParams.get("OrderMerchantReference");

    if (!orderTrackingId || !merchantReference) {
      setStatus("error");
      return;
    }

    const verifyPayment = async () => {
      try {
        const response = await fetch("/api/payments/pesapal/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderTrackingId, merchantReference }),
        });

        const data = await response.json();

        if (data.success) {
          setStatus("success");
        } else {
          setStatus("error");
        }
      } catch (error) {
        setStatus("error");
      }
    };

    verifyPayment();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
      <Card className={`max-w-md w-full shadow-2xl text-center p-8 space-y-4 border-t-8 ${status === 'success' ? 'border-t-green-600' : status === 'error' ? 'border-t-red-600' : 'border-t-blue-600'}`}>
        
        {status === "verifying" && (
          <>
            <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
              <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl font-bold">Verifying Payment...</CardTitle>
            <CardDescription>Please wait while we confirm with PesaPal. Do not close this window.</CardDescription>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 animate-in zoom-in">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-900">Payment Successful!</CardTitle>
            <CardDescription className="text-lg">Your standard plan is now fully active.</CardDescription>
            <Button onClick={() => router.push("/dashboard/company-admin/billing")} className="w-full mt-6 bg-green-600 hover:bg-green-700 h-12 text-lg">
              Return to Dashboard
            </Button>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-zinc-900">Verification Failed</CardTitle>
            <CardDescription className="text-lg">We couldn't verify this payment. If money was deducted, please contact support.</CardDescription>
            <Button onClick={() => router.push("/dashboard/company-admin/billing")} variant="outline" className="w-full mt-6 h-12 text-lg border-zinc-300">
              Go Back
            </Button>
          </>
        )}

      </Card>
    </div>
  );
}