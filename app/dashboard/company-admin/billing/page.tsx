"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { CreditCard, Loader2, CheckCircle2, Clock, XCircle, Receipt, Calendar, ArrowRight, Activity, ShieldCheck } from "lucide-react";

type Transaction = {
  id: string;
  created_at: string;
  amount: number;
  tracking_id: string;
  status: string;
};

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  
  // Synchronized Billing States
  const [visitorCount, setVisitorCount] = useState(0);
  const [amountDue, setAmountDue] = useState(0);
  const [periodStart, setPeriodStart] = useState<Date | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const fetchBillingData = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData?.user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", authData.user.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);

        // 1. Fetch All Transactions for History Table
        const { data: txData } = await supabase
          .from("transactions")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false });

        setTransactions(txData || []);

        // 2. SYNCHRONIZED CALCULATION LOGIC
        const { data: company } = await supabase.from("companies").select("created_at").eq("id", profile.company_id).single();
        let countStartDate = company?.created_at || new Date(0).toISOString();
        let displayStartDate = new Date(countStartDate);

        if (txData && txData.length > 0) {
          // Find the latest successful payment
          const lastPaid = txData.find(tx => 
            tx.status && (tx.status.toUpperCase() === 'COMPLETED' || tx.status.toUpperCase() === 'SUCCESS' || tx.status.toUpperCase() === 'PAID')
          );

          if (lastPaid) {
            countStartDate = lastPaid.created_at;
            displayStartDate = new Date(lastPaid.created_at);
          }
        }
        
        setPeriodStart(displayStartDate);

        // 3. Count UNPAID visitors since the calculated reset date
        const { count } = await supabase
          .from("visitors")
          .select("*", { count: "exact", head: true })
          .eq("company_id", profile.company_id)
          .gte("created_at", countStartDate);

        const unpaidVisitors = count || 0;
        setVisitorCount(unpaidVisitors);
        
        // 4. Calculate Total Due
        setAmountDue(unpaidVisitors * 3); // 3 KES per visitor
      }
      setLoading(false);
    };

    fetchBillingData();
  }, []);

  const handlePayment = async () => {
    if (!companyId) return;
    setIsPaying(true);

    try {
      // NOTE ON SECURITY: 
      // Passing the amount from the frontend can be manipulated in DevTools. 
      // Your backend (/api/payments/pesapal/initiate) MUST replicate the visitor * 3 calculation 
      // securely and ignore the amount passed here to guarantee zero financial loss.
      const response = await fetch("/api/payments/pesapal/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, amount: amountDue }), 
      });

      const data = await response.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        alert("Payment initialization failed.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred starting the payment.");
    } finally {
      setIsPaying(false);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(date));
  };

  const formatDateTime = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-200 pb-5 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Billing & Wallet</h1>
            <p className="text-zinc-500 mt-1.5 text-base">Manage your usage, view outstanding balances, and transaction history.</p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
            <ShieldCheck className="w-4 h-4" /> Secure SSL Connection
          </div>
        </div>

        {loading ? (
          // SKELETON LOADER UI
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
            <div className="lg:col-span-1 space-y-4">
              <div className="h-64 bg-zinc-200 rounded-xl w-full"></div>
            </div>
            <div className="lg:col-span-2 space-y-4">
              <div className="h-12 bg-zinc-200 rounded-xl w-full"></div>
              <div className="h-96 bg-zinc-200 rounded-xl w-full"></div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* CURRENT OUTSTANDING BALANCE CARD */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="shadow-lg border-0 ring-1 ring-zinc-200 h-fit overflow-hidden">
                <div className={`h-1.5 w-full ${amountDue > 0 ? "bg-amber-500" : "bg-green-500"}`} />
                <CardHeader className="pb-4 bg-zinc-50/80 border-b border-zinc-100">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Receipt className="w-5 h-5 text-zinc-600" /> 
                      Current Statement
                    </CardTitle>
                    {amountDue > 0 ? (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                        <Activity className="w-3.5 h-3.5" /> Due
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6 space-y-6 bg-white">
                  
                  {/* Billing Period Indicator */}
                  <div className="bg-zinc-50 rounded-lg p-3 border border-zinc-100 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-zinc-600">
                      <Calendar className="w-4 h-4" />
                      <span className="font-medium">Period Start</span>
                    </div>
                    <span className="font-semibold text-zinc-900">
                      {periodStart ? formatDate(periodStart) : "N/A"}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">Unpaid Visitors</span>
                      <span className="text-zinc-900 font-bold text-base">{visitorCount}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500 font-medium">Rate per Visitor</span>
                      <span className="text-zinc-900 font-bold text-base">KES 3.00</span>
                    </div>
                    
                    <div className="pt-4 border-t border-dashed border-zinc-200">
                      <div className="flex justify-between items-end">
                        <span className="text-zinc-900 font-bold">Total Due</span>
                        <span className={`text-3xl font-black tracking-tight ${amountDue > 0 ? "text-amber-600" : "text-green-600"}`}>
                          KES {amountDue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handlePayment} 
                    disabled={isPaying || amountDue <= 0} 
                    className={`w-full font-bold h-12 shadow-md transition-all active:scale-[0.98] ${
                      amountDue > 0 
                        ? "bg-zinc-900 hover:bg-zinc-800 text-white" 
                        : "bg-zinc-100 text-zinc-400 cursor-not-allowed"
                    }`}
                  >
                    {isPaying ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Processing Securely...</>
                    ) : amountDue <= 0 ? (
                      <><CheckCircle2 className="w-5 h-5 mr-2" /> Account Settled</>
                    ) : (
                      <><CreditCard className="w-5 h-5 mr-2" /> Pay KES {amountDue.toLocaleString()}</>
                    )}
                  </Button>
                  
                  {amountDue <= 0 && (
                    <div className="text-center">
                      <p className="text-sm text-green-600 font-semibold mt-2">
                        Your account is fully active!
                      </p>
                      <p className="text-xs text-zinc-500 mt-1">
                        No action required until new visitors arrive.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* TRANSACTION HISTORY TABLE */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg border-0 ring-1 ring-zinc-200">
                <CardHeader className="border-b border-zinc-100 bg-zinc-50/50 pb-5">
                  <CardTitle className="text-lg">Payment History</CardTitle>
                  <CardDescription>A complete chronological log of your past top-ups and settlements.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                      <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                        <Receipt className="w-8 h-8 text-zinc-300" />
                      </div>
                      <h3 className="text-lg font-semibold text-zinc-900">No Transactions Yet</h3>
                      <p className="text-sm text-zinc-500 max-w-sm mt-1">
                        When you make your first payment for visitor check-ins, the receipt will appear here.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-zinc-50/80">
                          <TableRow className="border-zinc-200">
                            <TableHead className="font-semibold text-zinc-600">Date & Time</TableHead>
                            <TableHead className="font-semibold text-zinc-600">Reference ID</TableHead>
                            <TableHead className="font-semibold text-zinc-600 text-right">Amount</TableHead>
                            <TableHead className="font-semibold text-zinc-600 text-center">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {transactions.map((tx) => {
                            const statusUpper = tx.status?.toUpperCase() || "PENDING";
                            let StatusIcon = Clock;
                            let statusColor = "text-amber-700 bg-amber-50 ring-amber-200";

                            if (statusUpper === "COMPLETED" || statusUpper === "SUCCESS" || statusUpper === "PAID") {
                              StatusIcon = CheckCircle2;
                              statusColor = "text-green-700 bg-green-50 ring-green-200";
                            } else if (statusUpper === "FAILED" || statusUpper === "CANCELLED") {
                              StatusIcon = XCircle;
                              statusColor = "text-red-700 bg-red-50 ring-red-200";
                            }

                            return (
                              <TableRow key={tx.id} className="hover:bg-zinc-50/80 transition-colors border-zinc-100">
                                <TableCell className="whitespace-nowrap">
                                  <div className="font-medium text-zinc-900">
                                    {formatDate(tx.created_at)}
                                  </div>
                                  <div className="text-xs text-zinc-500 mt-0.5">
                                    {new Date(tx.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-zinc-500">
                                  {tx.tracking_id || "—"}
                                </TableCell>
                                <TableCell className="font-bold text-zinc-900 whitespace-nowrap text-right">
                                  KES {Number(tx.amount || 0).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset ${statusColor} whitespace-nowrap`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {tx.status || "PENDING"}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}