"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Lock, X } from "lucide-react";

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

  // Billing Modal State
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [editBilling, setEditBilling] = useState<{ id: string; status: string; amount: number } | null>(null);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("companies")
      .select("id, name, subscription_status, amount_paid, is_locked")
      .order("created_at", { ascending: false });

    // Safely map in case columns are missing
    const formattedCompanies = (data || []).map((c: any) => ({
      ...c,
      subscription_status: c.subscription_status || "trial",
      amount_paid: c.amount_paid || 0,
      is_locked: c.is_locked || false,
    }));

    setCompanies(formattedCompanies);
    setLoading(false);
  };

  const openBillingEditor = (company: Company) => {
    setEditBilling({ id: company.id, status: company.subscription_status, amount: company.amount_paid });
    setShowBillingModal(true);
  };

  const handleSaveBilling = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBilling) return;

    // Automatically lock account if set to unpaid
    const shouldLock = editBilling.status === "unpaid";

    const { error } = await supabase
      .from("companies")
      .update({ 
        subscription_status: editBilling.status, 
        amount_paid: editBilling.amount,
        is_locked: shouldLock 
      })
      .eq("id", editBilling.id);

    if (error) {
      alert("Failed to update billing details.");
    } else {
      setShowBillingModal(false);
      fetchCompanies(); // Refresh data
    }
  };

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-3xl font-bold text-zinc-900">Billing & Revenue</h1>
        <p className="text-zinc-500 mt-1">Manage subscriptions and view incoming payments.</p>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Pesapal & Billing Overview</CardTitle>
          <CardDescription>Manually update statuses or link with Pesapal IPN.</CardDescription>
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
                    <TableHead className="text-right">Manage Billing</TableHead>
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
                        <span className="text-xs font-bold uppercase tracking-wider text-purple-600 bg-purple-50 px-2 py-1 rounded-md">
                          {company.subscription_status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm font-mono font-medium text-emerald-600">
                        KES {company.amount_paid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openBillingEditor(company)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit Subscription
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- EDIT BILLING MODAL --- */}
      {showBillingModal && editBilling && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl relative">
            <button onClick={() => setShowBillingModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black transition-colors"><X size={20} /></button>
            <CardHeader>
              <CardTitle>Update Subscription</CardTitle>
              <CardDescription>Manually override Pesapal status.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveBilling} className="space-y-4">
                <div className="space-y-2">
                  <Label>Subscription Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editBilling.status}
                    onChange={(e) => setEditBilling({...editBilling, status: e.target.value})}
                  >
                    <option value="trial">Trial Period</option>
                    <option value="paid">Paid - Active</option>
                    <option value="unpaid">Unpaid (Will Auto-Lock)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Total Amount Paid (KES)</Label>
                  <Input 
                    type="number" 
                    value={editBilling.amount} 
                    onChange={(e) => setEditBilling({...editBilling, amount: parseFloat(e.target.value) || 0})} 
                  />
                </div>
                <div className="pt-4">
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">Save Billing Status</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}