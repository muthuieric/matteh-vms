"use client";

import React, { useEffect, useState } from "react";
import { Lock } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Company = {
  id: string;
  name: string;
  subscription_status: "trial" | "paid" | "unpaid";
  amount_paid: number;
  is_locked: boolean;
};

export default function SuperadminBillingPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Initial Fetch
    fetchCompanies();

    // 2. Set up Supabase Realtime Listener for Live IPN updates
    const channel = supabase
      .channel("companies_billing_changes")
      .on(
        "postgres_changes",
        {
          event: "*", // Listen for all changes (INSERT, UPDATE, DELETE)
          schema: "public",
          table: "companies",
        },
        () => {
          // Whenever the IPN updates the companies table, re-fetch the data automatically!
          console.log("Database changed! Refreshing data...");
          fetchCompanies();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCompanies = async () => {
    // Only set loading on the first fetch to prevent UI flickering on realtime updates
    if (companies.length === 0) setLoading(true);
    
    const { data, error } = await supabase
      .from("companies")
      // Added created_at to the select query to ensure the order() function works flawlessly
      .select("id, name, subscription_status, amount_paid, is_locked, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching companies:", error);
      setLoading(false);
      return;
    }

    const formattedCompanies = (data || []).map((c: any) => ({
      ...c,
      // Force lowercase to avoid issues where the DB has "Paid" instead of "paid"
      subscription_status: (c.subscription_status?.toLowerCase() || "trial") as Company["subscription_status"],
      amount_paid: c.amount_paid || 0,
      is_locked: c.is_locked || false,
    }));

    setCompanies(formattedCompanies);
    setLoading(false);
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-3xl font-bold text-zinc-900">Billing & Revenue</h1>
        <p className="text-zinc-500 mt-1">Manage subscriptions and view incoming payments from PesaPal.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Pesapal & Billing Overview</CardTitle>
          <CardDescription>Live payment statuses synchronized with your IPN.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-zinc-500 py-4">Loading billing profiles...</p>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader className="bg-zinc-50">
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>Account Status</TableHead>
                    <TableHead>Total Paid (KES)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow key={company.id}>
                      <TableCell className="font-semibold text-zinc-900">
                        {company.name}
                        {company.is_locked && <Lock className="inline ml-2 h-3 w-3 text-red-600"/>}
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md ${
                          company.subscription_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-purple-50 text-purple-600'
                        }`}>
                          {company.subscription_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-mono font-medium text-emerald-600">
                        KES {company.amount_paid.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}