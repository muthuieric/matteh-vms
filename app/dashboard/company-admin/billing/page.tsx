"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function BillingPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("Loading...");
  
  // New state to hold the Pesapal Iframe URL (Step 3 of Pesapal Docs)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillingData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        // 1. Get Profile to find company ID
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", authData.user.id)
          .single();

        if (profile?.company_id) {
          setCompanyId(profile.company_id);
          
          // 2. Fetch the company's current subscription status
          const { data: company } = await supabase
            .from("companies")
            .select("subscription_status")
            .eq("id", profile.company_id)
            .single();
            
          if (company) {
            setSubscriptionStatus(company.subscription_status || "trial");
          }
        }
      }
    };

    fetchBillingData();
  }, []);

  // --- TRIGGER PESAPAL PAYMENT ---
  const handlePayment = async () => {
    if (!companyId) return;
    setIsPaying(true);

    try {
      const response = await fetch("/api/pesapal/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });

      const data = await response.json();

      if (data.redirect_url) {
        // Embed the payments page directly in the site via IFrame!
        setPaymentUrl(data.redirect_url);
      } else {
        alert("Payment initialization failed. Please try again later.");
        console.error("Pesapal Error:", data);
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred starting the payment.");
    } finally {
      setIsPaying(false);
    }
  };

  // If we have a payment URL, render the Pesapal Iframe!
  if (paymentUrl) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
        <div className="max-w-4xl mx-auto space-y-4">
          <Button variant="outline" onClick={() => setPaymentUrl(null)} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel Checkout
          </Button>
          <Card className="shadow-2xl overflow-hidden border-t-4 border-t-amber-600 p-0">
            <iframe 
              src={paymentUrl} 
              className="w-full h-[700px] border-0 bg-white" 
              title="Pesapal Secure Checkout"
            />
          </Card>
        </div>
      </div>
    );
  }

  // Normal Billing Dashboard Render
  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div className="border-b border-zinc-200 pb-4">
          <h1 className="text-3xl font-bold text-zinc-900">Billing & Subscription</h1>
          <p className="text-zinc-500 mt-1">Manage your building's active plan and payment methods.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Plan Card */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your organization's active tier</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-full ${
                  subscriptionStatus === 'paid' ? 'bg-green-100 text-green-600' : 
                  subscriptionStatus === 'trial' ? 'bg-amber-100 text-amber-600' : 
                  'bg-red-100 text-red-600'
                }`}>
                  {subscriptionStatus === 'paid' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-zinc-900">
                    {subscriptionStatus === 'paid' ? 'Active - Standard' : subscriptionStatus === 'trial' ? 'Trial Period' : 'Unpaid / Suspended'}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {subscriptionStatus === 'paid' ? 'All features unlocked.' : 'Please pay to ensure uninterrupted access.'}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100">
                <p className="text-sm font-medium text-zinc-600 mb-2">Plan includes:</p>
                <ul className="text-sm text-zinc-500 space-y-2">
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Unlimited Visitor Check-ins</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Unlimited Guard Accounts</li>
                  <li className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Data Export & Analytics</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Payment Card */}
          <Card className="shadow-sm border-t-4 border-t-amber-600">
            <CardHeader>
              <CardTitle>Make a Payment</CardTitle>
              <CardDescription>Secure checkout via Pesapal (M-Pesa, Card, etc.)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-zinc-50 p-4 rounded-md border border-zinc-200 flex justify-between items-center">
                <span className="font-medium text-zinc-700">Standard Plan Fee</span>
                <span className="font-bold text-lg text-zinc-900">KES 5,000</span>
              </div>
              
              <Button 
                onClick={handlePayment} 
                disabled={isPaying || !companyId} 
                className="w-full h-12 text-lg bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isPaying ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating Secure Iframe...</>
                ) : (
                  <><CreditCard className="w-5 h-5 mr-2" /> Pay Now via Pesapal</>
                )}
              </Button>
              <p className="text-xs text-center text-zinc-400">
                Payments are processed securely. Your account will be updated automatically upon success.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}