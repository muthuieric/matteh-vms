"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"; // Added Table Imports
import { CreditCard, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Calendar, Receipt } from "lucide-react";

export default function BillingPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("Loading...");
  const [subscriptionEndsAt, setSubscriptionEndsAt] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [monthsToPay, setMonthsToPay] = useState(1);
  const [transactions, setTransactions] = useState<any[]>([]); // New State for History
  
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

          if (dbError) throw new Error(`Database Error: ${dbError.message}`);

          if (!profile?.company_id) {
            throw new Error("Your account profile exists, but it has no 'company_id' assigned to it.");
          }

          setCompanyId(profile.company_id);
          
          // 1. Fetch Company Status
          const { data: company, error: compError } = await supabase
            .from("companies")
            .select("subscription_status, subscription_ends_at")
            .eq("id", profile.company_id)
            .single();
            
          if (compError) throw compError;

          if (company) {
            setSubscriptionStatus(company.subscription_status || "trial");
            setSubscriptionEndsAt(company.subscription_ends_at);
          }

          // 2. Fetch Transaction History
          const { data: txData } = await supabase
            .from("transactions")
            .select("*")
            .eq("company_id", profile.company_id)
            .order("created_at", { ascending: false });

          if (txData) setTransactions(txData);
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
      const response = await fetch("/api/payments/pesapal/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          companyId,
          amount: monthsToPay * 5000 
        }), 
      });

      const data = await response.json();

      if (data.redirect_url) {
        setPaymentUrl(data.redirect_url);
      } else {
        console.error("Backend Error:", data);
        alert(`Payment initialization failed: ${data.error || "Unknown error"}.`);
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

  const isExpired = subscriptionEndsAt ? new Date(subscriptionEndsAt) < new Date() : false;

  return (
    <div className="min-h-screen bg-zinc-50 p-6 md:p-10">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="border-b border-zinc-200 pb-4">
          <h1 className="text-3xl font-bold text-zinc-900">Billing & Subscription</h1>
          <p className="text-zinc-500 mt-1">Manage your building's active plan and payment methods.</p>
        </div>

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
                  isExpired ? 'bg-red-100 text-red-600' :
                  subscriptionStatus === 'trial' ? 'bg-amber-100 text-amber-600' : 
                  'bg-green-100 text-green-600'
                }`}>
                  {isInitializing ? <Loader2 className="w-6 h-6 animate-spin" /> : !isExpired ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold uppercase tracking-wide text-zinc-900">
                    {isInitializing ? 'Loading...' : isExpired ? 'Unpaid / Expired' : subscriptionStatus === 'trial' ? 'Trial Period' : 'Active - Standard'}
                  </h3>
                  <p className="text-sm text-zinc-500">
                    {isInitializing ? 'Fetching status...' : !isExpired ? 'All features unlocked.' : 'Please pay to ensure uninterrupted access.'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center gap-3">
                <Calendar className="text-zinc-400 w-5 h-5" />
                <div>
                  <p className="text-sm font-medium text-zinc-600">Valid Until:</p>
                  <p className={`text-lg font-bold ${isExpired ? 'text-red-600' : 'text-zinc-900'}`}>
                    {isInitializing ? '...' : subscriptionEndsAt 
                      ? new Date(subscriptionEndsAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) 
                      : "No active subscription"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-t-4 border-t-amber-600">
            <CardHeader>
              <CardTitle>Make a Payment</CardTitle>
              <CardDescription>Secure checkout via Pesapal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-2">Select Subscription Duration</label>
                <select 
                  value={monthsToPay} 
                  onChange={(e) => setMonthsToPay(Number(e.target.value))}
                  className="w-full border border-zinc-300 rounded-md p-3 bg-white text-zinc-900 focus:ring-amber-500 focus:border-amber-500"
                >
                  <option value={1}>1 Month (KES 5,000)</option>
                  <option value={2}>2 Months (KES 10,000)</option>
                  <option value={3}>3 Months (KES 15,000)</option>
                  <option value={6}>6 Months (KES 30,000)</option>
                  <option value={12}>1 Year (KES 60,000)</option>
                </select>
              </div>

              <div className="bg-zinc-50 p-4 rounded-md border border-zinc-200 flex justify-between items-center">
                <span className="font-medium text-zinc-700">Total Due</span>
                <span className="font-bold text-xl text-zinc-900">KES {(monthsToPay * 5000).toLocaleString()}</span>
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

        {/* --- NEW TRANSACTION HISTORY TABLE --- */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-zinc-500" />
            <h2 className="text-xl font-bold text-zinc-900">Transaction History</h2>
          </div>
          
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead className="pl-6 py-3">Date</TableHead>
                    <TableHead>Amount (KES)</TableHead>
                    <TableHead>Tracking ID</TableHead>
                    <TableHead className="pr-6">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isInitializing ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-zinc-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Loading history...
                      </TableCell>
                    </TableRow>
                  ) : transactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-zinc-500">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    transactions.map((tx) => (
                      <TableRow key={tx.id}>
                        <TableCell className="pl-6 font-medium text-zinc-900">
                          {new Date(tx.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600">
                          {tx.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 font-mono">
                          {tx.tracking_id}
                        </TableCell>
                        <TableCell className="pr-6">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            {tx.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}