"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ShieldCheck, Activity } from "lucide-react";

export default function SuperadminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalVisitors: 0, totalGuards: 0, totalCompanies: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      
      // Fetch global counts using Supabase's exact count feature for performance
      const { count: compCount } = await supabase.from("companies").select("*", { count: "exact", head: true });
      const { count: visitorCount } = await supabase.from("visitors").select("*", { count: "exact", head: true });
      const { count: guardCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "guard");

      setStats({
        totalCompanies: compCount || 0,
        totalVisitors: visitorCount || 0,
        totalGuards: guardCount || 0,
      });
      
      setLoading(false);
    };

    fetchStats();
  }, []);

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-zinc-200 pb-4">
        <h1 className="text-3xl font-bold text-zinc-900 capitalize">Platform Overview</h1>
        <p className="text-zinc-500 mt-1">
          Global command center for your Visitor Management SaaS.
        </p>
      </div>

      {loading ? (
        <p className="text-zinc-500">Loading global platform data...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-t-4 border-t-amber-500 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                <Building2 size={16}/> Total Companies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-zinc-900">{stats.totalCompanies}</div>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-blue-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                <Activity size={16}/> Total Visitors Processed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-zinc-900">{stats.totalVisitors}</div>
            </CardContent>
          </Card>
          
          <Card className="border-t-4 border-t-emerald-600 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-zinc-500 flex items-center gap-2">
                <ShieldCheck size={16}/> Active Guard Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-zinc-900">{stats.totalGuards}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}