"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, Receipt, AlertCircle, Building2, Search, CalendarDays } from "lucide-react";

type Transaction = {
  id: string;
  created_at: string;
  amount: number;
  tracking_id: string;
  status: string;
  companies: { name: string } | null; // Supabase relation join
};

export default function SuperadminTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchTransactions();

    // Set up real-time listener for new transactions across the entire platform
    const channel = supabase
      .channel("global_transactions_changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "transactions",
        },
        () => {
          fetchTransactions(); // Auto-refresh when ANY new payment succeeds
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all transactions and JOIN the company name automatically.
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("id, created_at, amount, tracking_id, status, companies(name)")
        .order("created_at", { ascending: false });

      if (txError) throw txError;

      // Safely map and cast the returned data to satisfy TypeScript
      const formattedData: Transaction[] = (txData || []).map((tx: any) => ({
        id: tx.id,
        created_at: tx.created_at,
        amount: tx.amount,
        tracking_id: tx.tracking_id,
        status: tx.status,
        // Safely extract the object if Supabase returns an array
        companies: Array.isArray(tx.companies) ? tx.companies[0] : tx.companies,
      }));

      setTransactions(formattedData);
    } catch (err: any) {
      console.error("Error fetching master transactions:", err);
      setError(err.message || "An error occurred while loading the global transaction history.");
    } finally {
      setLoading(false);
    }
  };

  // --- FILTER LOGIC ---
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Search Query (matches company name or tracking ID)
    const query = searchTerm.toLowerCase();
    const matchesSearch = 
      (tx.companies?.name || "").toLowerCase().includes(query) ||
      tx.tracking_id.toLowerCase().includes(query);

    // 2. Date Range Filter
    let matchesDate = true;
    const txDate = new Date(tx.created_at).getTime();
    
    if (startDate) {
      const start = new Date(startDate).getTime();
      if (txDate < start) matchesDate = false;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Include entire end day
      if (txDate > end.getTime()) matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-6xl mx-auto space-y-6 md:space-y-8">
      
      {/* Header Section */}
      <div className="border-b border-zinc-200 pb-4 flex items-center gap-3">
        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
          <Receipt className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Master Ledger</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">View every successful transaction processed across all companies.</p>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-red-600" />
          <p className="font-medium text-sm leading-snug">{error}</p>
        </div>
      )}

      {/* Ledger Card */}
      <Card className="shadow-sm border-zinc-200 bg-white/90 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 space-y-5 border-b border-zinc-200/60 mb-2">
          <div>
            <CardTitle>Global Transaction History</CardTitle>
            <CardDescription>Real-time PesaPal payment receipts.</CardDescription>
          </div>

          {/* SEARCH AND FILTERS */}
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Search company or tracking ID..." 
                className="pl-9 bg-white/80 border-zinc-200 focus:ring-emerald-500 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-auto flex-1">
                <Input 
                  type="date" 
                  className="h-10 bg-white/80 w-full sm:w-[140px] text-zinc-600 text-xs sm:text-sm"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <span className="text-zinc-400 text-sm font-medium hidden sm:block">to</span>
              <div className="relative w-full sm:w-auto flex-1">
                <Input 
                  type="date" 
                  className="h-10 bg-white/80 w-full sm:w-[140px] text-zinc-600 text-xs sm:text-sm"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          
          {/* --- LOADING & EMPTY STATES --- */}
          {loading ? (
            <div className="text-center py-12 text-zinc-500">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
              Loading master ledger...
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 px-4">
              <div className="bg-white border border-zinc-200 shadow-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Receipt className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="font-bold text-zinc-900 text-lg">No transactions found</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">No payments have been recorded on the platform yet.</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 px-4">
              <p className="font-bold text-zinc-900">No matching results</p>
              <p className="text-sm mt-1">Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          ) : (
            <>
              {/* --- DESKTOP VIEW (TABLE) --- */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-zinc-50/80">
                    <TableRow>
                      <TableHead className="pl-6 py-4 text-zinc-600 whitespace-nowrap">Date & Time</TableHead>
                      <TableHead className="text-zinc-600 whitespace-nowrap">Company</TableHead>
                      <TableHead className="text-zinc-600 whitespace-nowrap">Amount (KES)</TableHead>
                      <TableHead className="text-zinc-600 whitespace-nowrap">Tracking ID</TableHead>
                      <TableHead className="pr-6 text-zinc-600 whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => (
                      <TableRow key={tx.id} className="hover:bg-zinc-50/80 transition-colors">
                        <TableCell className="pl-6 text-sm text-zinc-600 whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleDateString('en-GB', { 
                            day: 'numeric', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </TableCell>
                        <TableCell className="font-semibold text-zinc-900 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                            <span className="truncate max-w-[200px] block">{tx.companies?.name || "Unknown Company"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-emerald-600 text-base whitespace-nowrap">
                          {tx.amount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500 font-mono tracking-tight whitespace-nowrap">
                          {tx.tracking_id}
                        </TableCell>
                        <TableCell className="pr-6 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                            tx.status.toLowerCase() === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                            tx.status.toLowerCase() === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {tx.status}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* --- MOBILE VIEW (STACKED CARDS) --- */}
              <div className="md:hidden divide-y divide-zinc-100">
                {filteredTransactions.map((tx) => (
                  <div key={tx.id} className="p-4 space-y-3 hover:bg-zinc-50/50 transition-colors">
                    
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-semibold text-zinc-900 flex items-start gap-2 leading-tight">
                        <Building2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{tx.companies?.name || "Unknown Company"}</span>
                      </div>
                      <div className="font-bold text-emerald-600 text-right whitespace-nowrap">
                        {tx.amount.toLocaleString()} <span className="text-xs font-medium text-emerald-600/70">KES</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center text-zinc-500 gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {new Date(tx.created_at).toLocaleDateString('en-GB', { 
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          tx.status.toLowerCase() === 'completed' ? 'bg-green-50 text-green-700 border-green-200' :
                          tx.status.toLowerCase() === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between bg-zinc-50 p-2 rounded-md border border-zinc-100">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Ref ID</span>
                      <span className="text-xs text-zinc-600 font-mono tracking-tight">{tx.tracking_id}</span>
                    </div>

                  </div>
                ))}
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}