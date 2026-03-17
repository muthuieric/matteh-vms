"use client";

import React, { useEffect, useState } from "react";
import { Lock, Loader2, CreditCard, Building2, CalendarDays, Search, Filter } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

type Company = {
  id: string;
  name: string;
  subscription_status: "trial" | "paid" | "unpaid";
  amount_paid: number;
  is_locked: boolean;
  subscription_ends_at: string | null;
};

export default function SuperadminBillingPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchCompanies();

    const channel = supabase
      .channel("companies_billing_changes")
      .on(
        "postgres_changes",
        {
          event: "*", 
          schema: "public",
          table: "companies",
        },
        () => {
          fetchCompanies();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCompanies = async () => {
    if (companies.length === 0) setLoading(true);
    
    const { data, error } = await supabase
      .from("companies")
      .select("id, name, subscription_status, amount_paid, is_locked, created_at, subscription_ends_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching companies:", error);
      setLoading(false);
      return;
    }

    const formattedCompanies = (data || []).map((c: any) => ({
      ...c,
      subscription_status: (c.subscription_status?.toLowerCase() || "trial") as Company["subscription_status"],
      amount_paid: c.amount_paid || 0,
      is_locked: c.is_locked || false,
    }));

    setCompanies(formattedCompanies);
    setLoading(false);
  };

  // --- FILTER LOGIC ---
  const filteredCompanies = companies.filter((company) => {
    const isExpired = company.subscription_ends_at 
      ? new Date(company.subscription_ends_at) < new Date() 
      : true;

    // 1. Search filter
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase());

    // 2. Status filter
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "expired") {
        matchesStatus = isExpired;
      } else if (statusFilter === "paid") {
        matchesStatus = company.subscription_status === "paid" && !isExpired;
      } else if (statusFilter === "trial") {
        matchesStatus = company.subscription_status === "trial" && !isExpired;
      }
    }

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-6xl mx-auto space-y-6 md:space-y-8">
      
      {/* Header Section */}
      <div className="border-b border-zinc-200 pb-4 flex items-center gap-3">
        <div className="p-3 bg-blue-100 text-blue-700 rounded-lg shrink-0">
          <CreditCard className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Billing & Revenue</h1>
          <p className="text-zinc-500 mt-1 text-sm md:text-base">Manage subscriptions, view expiry dates, and track platform revenue.</p>
        </div>
      </div>

      {/* Main Billing Card */}
      <Card className="shadow-sm border-zinc-200 bg-white/90 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-4 border-b border-zinc-200/60 mb-2 space-y-5">
          <div>
            <CardTitle>Company Subscriptions</CardTitle>
            <CardDescription>Live payment and access statuses synchronized with your database.</CardDescription>
          </div>

          {/* SEARCH AND FILTERS */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input 
                placeholder="Search company name..." 
                className="pl-9 bg-white/80 border-zinc-200 focus:ring-blue-500 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <select
                className="w-full sm:w-48 h-10 pl-9 pr-8 rounded-md border border-zinc-200 bg-white/80 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none font-medium text-zinc-700"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="paid">Active (Paid)</option>
                <option value="trial">Active (Trial)</option>
                <option value="expired">Expired / Unpaid</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500 px-4">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" /> 
              <p>Loading billing profiles...</p>
            </div>
          ) : companies.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 px-4">
              <div className="bg-white border border-zinc-200 shadow-sm w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-zinc-400" />
              </div>
              <p className="font-bold text-zinc-900 text-lg">No companies found</p>
              <p className="text-sm mt-1 max-w-sm mx-auto">There are no registered companies on the platform yet.</p>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 px-4">
              <p className="font-bold text-zinc-900">No matching companies</p>
              <p className="text-sm mt-1">Try adjusting your search or filters to find what you're looking for.</p>
            </div>
          ) : (
            <>
              {/* --- DESKTOP VIEW (TABLE) --- */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader className="bg-zinc-50/80">
                    <TableRow>
                      <TableHead className="pl-6 py-4 text-zinc-600 whitespace-nowrap">Company Name</TableHead>
                      <TableHead className="text-zinc-600 whitespace-nowrap">Valid Until</TableHead>
                      <TableHead className="text-zinc-600 whitespace-nowrap">Account Status</TableHead>
                      <TableHead className="pr-6 text-zinc-600 whitespace-nowrap">Total Paid (KES)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompanies.map((company) => {
                      const isExpired = company.subscription_ends_at 
                        ? new Date(company.subscription_ends_at) < new Date() 
                        : true;

                      return (
                        <TableRow key={company.id} className="hover:bg-zinc-50/80 transition-colors">
                          <TableCell className="pl-6 font-semibold text-zinc-900 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Building2 className="w-4 h-4 text-zinc-400 shrink-0" />
                              <span className="truncate max-w-[250px]">{company.name}</span>
                              {(company.is_locked || isExpired) && <Lock className="inline h-3.5 w-3.5 text-red-600 shrink-0" title="Account Locked"/>}
                            </div>
                          </TableCell>
                          
                          <TableCell className="whitespace-nowrap">
                            {company.subscription_ends_at ? (
                              <span className={isExpired ? "text-red-600 font-bold" : "text-zinc-600 font-medium"}>
                                {new Date(company.subscription_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            ) : (
                              <span className="text-zinc-400 italic">Unpaid / No Trial</span>
                            )}
                          </TableCell>
                          
                          <TableCell className="whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                              isExpired ? 'bg-red-50 text-red-700 border-red-200' : 
                              company.subscription_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isExpired ? 'Expired' : company.subscription_status}
                            </span>
                          </TableCell>
                          
                          <TableCell className="pr-6 text-sm font-bold text-emerald-600 whitespace-nowrap">
                            {company.amount_paid.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* --- MOBILE VIEW (STACKED CARDS) --- */}
              <div className="md:hidden divide-y divide-zinc-100">
                {filteredCompanies.map((company) => {
                  const isExpired = company.subscription_ends_at 
                    ? new Date(company.subscription_ends_at) < new Date() 
                    : true;

                  return (
                    <div key={company.id} className="p-4 space-y-3 hover:bg-zinc-50/50 transition-colors">
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-semibold text-zinc-900 flex items-start gap-2 leading-tight">
                          <Building2 className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{company.name}</span>
                          {(company.is_locked || isExpired) && <Lock className="inline h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" title="Account Locked"/>}
                        </div>
                        <div className="font-bold text-emerald-600 text-right whitespace-nowrap">
                          {company.amount_paid.toLocaleString()} <span className="text-xs font-medium text-emerald-600/70">KES</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-sm pt-1">
                        <div className="flex items-center text-zinc-500 gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                          {company.subscription_ends_at ? (
                            <span className={isExpired ? "text-red-600 font-bold text-xs sm:text-sm" : "text-zinc-600 font-medium text-xs sm:text-sm"}>
                              {new Date(company.subscription_ends_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-zinc-400 italic text-xs">Unpaid / No Trial</span>
                          )}
                        </div>
                        
                        <div>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                            isExpired ? 'bg-red-50 text-red-700 border-red-200' : 
                            company.subscription_status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isExpired ? 'Expired' : company.subscription_status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

        </CardContent>
      </Card>
    </div>
  );
}