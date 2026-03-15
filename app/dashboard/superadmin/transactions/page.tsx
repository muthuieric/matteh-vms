"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Receipt, AlertCircle, Building2 } from "lucide-react";

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
      // Thanks to the RLS rule we wrote, Supabase knows this user is a superadmin 
      // and will return all rows without blocking them!
      const { data: txData, error: txError } = await supabase
        .from("transactions")
        .select("id, created_at, amount, tracking_id, status, companies(name)")
        .order("created_at", { ascending: false });

      if (txError) throw txError;

      setTransactions(txData || []);
    } catch (err: any) {
      console.error("Error fetching master transactions:", err);
      setError(err.message || "An error occurred while loading the global transaction history.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div className="border-b border-zinc-200 pb-4 flex items-center gap-3">
        <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
          <Receipt className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Master Ledger</h1>
          <p className="text-zinc-500 mt-1">View every successful transaction processed across all companies.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Global Transaction History</CardTitle>
          <CardDescription>Real-time PesaPal payment receipts.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-zinc-50">
              <TableRow>
                <TableHead className="pl-6 py-4 text-zinc-600">Date & Time</TableHead>
                <TableHead className="text-zinc-600">Company</TableHead>
                <TableHead className="text-zinc-600">Amount (KES)</TableHead>
                <TableHead className="text-zinc-600">Tracking ID</TableHead>
                <TableHead className="pr-6 text-zinc-600">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-emerald-600" />
                    Loading master ledger...
                  </TableCell>
                </TableRow>
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12 text-zinc-500">
                    <div className="bg-zinc-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Receipt className="w-8 h-8 text-zinc-400" />
                    </div>
                    <p className="font-medium text-zinc-900">No transactions found</p>
                    <p className="text-sm">No payments have been recorded on the platform yet.</p>
                  </TableCell>
                </TableRow>
              ) : (
                transactions.map((tx) => (
                  <TableRow key={tx.id} className="hover:bg-zinc-50 transition-colors">
                    <TableCell className="pl-6 text-sm text-zinc-600">
                      {new Date(tx.created_at).toLocaleDateString('en-GB', { 
                        day: 'numeric', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </TableCell>
                    <TableCell className="font-semibold text-zinc-900 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-zinc-400" />
                      {tx.companies?.name || "Unknown Company"}
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600 text-base">
                      {tx.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs text-zinc-500 font-mono tracking-tight">
                      {tx.tracking_id}
                    </TableCell>
                    <TableCell className="pr-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
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
  );
}