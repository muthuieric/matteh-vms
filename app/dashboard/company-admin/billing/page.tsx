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
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  
  // New states to debug the exact issue
  const [isInitializing, setIsInitializing] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBillingData = async () => {
      setIsInitializing(true);
      setProfileError(null);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;

        if (authData?.user) {
          const { data: profile, error: dbError } = await supabase
            .from("profiles")
            .select("company_id")
            .eq("id", authData.user.id)
            .single();

          if (dbError) {
            throw new Error(`Database Error: ${dbError.message}`);
          }

          if (!profile?.company_id) {
            throw new Error("Your account profile exists, but it has no 'company_id' assigned to it.");
          }

          setCompanyId(profile.company_id);
          
          const { data: company, error: compError } = await supabase
            .from("companies")
            .select("subscription_status")
            .eq("id", profile.company_id)
            .single();
            
          if (compError) throw compError;

          if (company) {
            setSubscriptionStatus(company.subscription_status || "trial");
          }
        }
      } catch (error: any) {
        console.error("Initialization failed:", error);
        setProfileError(error.message || "An unknown error occurred loading your profile.");
      } finally {
        setIsInitializing(false);
      }
    };
    
    fetchBillingData();
  }, []);

  const handlePayment = async () => {
    if (!companyId) return;
    setIsPaying(true);

    try {
      // FIX: Pointing to the API route you ACTUALLY have!
      const response = await fetch("/api/payments/pesapal/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }), 
      });

      const data = await response.json();

      if (data.redirect_url) {
        setPaymentUrl(data.redirect_url); // Opens the PesaPal Iframe
      } else {
        console.error("Backend Error:", data);
        alert(`Payment initialization failed: ${data.error || "Unknown error"}. Check server console.`);
      }
    } catch (error) {
      console.error("Fetch Error:", error);
      alert("An error occurred starting the payment. Please check your network connection.");
    } finally {
      setIsPaying(false);
    }
  };

  if (paymentUrl) {
    return (
      <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
        <div className="max-w-4xl mx-auto space-y-4">
          <Button variant="outline" onClick={() => setPaymentUrl(null)} className="mb-2">
            <ArrowLeft className="mr-2 h-4 w-4" /> Cancel Checkout
          </Button>
          <Card className="shadow-2xl overflow-hidden border-t-4 border-t-amber-600 p-0">
            <iframe src={paymentUrl} className="w-full h-[700px] border-0 bg-white" title="Pesapal Secure Checkout" />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="border-b border-zinc-200 pb-4">
          <h1 className="text-3xl font-bold text-zinc-900">Billing & Subscription</h1>
          <p className="text-zinc-500 mt-1">Manage your building's active plan and payment methods.</p>
        </div>

        {/* --- ERROR DISPLAY --- */}
        {profileError && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 font-medium flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Could not load your company profile:</p>
              <p className="text-sm mt-1 text-red-600">{profileError}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  {isInitializing ? <Loader2 className="w-6 h-6 animate-spin" /> : subscriptionStatus === 'paid' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-zinc-900">
                    {isInitializing ? 'Loading...' : subscriptionStatus === 'paid' ? 'Active - Standard' : subscriptionStatus === 'trial' ? 'Trial Period' : 'Unpaid / Suspended'}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {isInitializing ? 'Fetching status from database' : subscriptionStatus === 'paid' ? 'All features unlocked.' : 'Please pay to ensure uninterrupted access.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                disabled={isPaying || isInitializing || !companyId} 
                className="w-full h-12 text-lg bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isInitializing ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Verifying Profile...</>
                ) : isPaying ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating Secure Checkout...</>
                ) : (
                  <><CreditCard className="w-5 h-5 mr-2" /> Pay Now via Pesapal</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}