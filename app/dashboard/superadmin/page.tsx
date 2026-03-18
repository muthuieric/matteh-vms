"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Building2, 
  ShieldCheck, 
  Activity, 
  CreditCard, 
  Banknote, 
  Loader2, 
  BarChart3, 
  CalendarClock,
  Clock,
  LogIn,
  ArrowUpRight,
  Crown,
  TrendingUp,
  CheckCircle2
} from "lucide-react";

type TopCompany = {
  id: string;
  name: string;
  visitors: number;
};

export default function SuperadminOverview() {
  const [loading, setLoading] = useState(true);
  const [topCompanies, setTopCompanies] = useState<TopCompany[]>([]);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalRevenue: 0,
    totalVisitors: 0,
    todayVisitors: 0,
    totalGuards: 0,
    pendingVisitors: 0,
    insideVisitors: 0
  });

  useEffect(() => {
    const fetchGlobalStats = async () => {
      setLoading(true);
      
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      try {
        // 1. Company Stats (Total & Active)
        const { data: companiesData } = await supabase
          .from("companies")
          .select("id, name, is_locked, subscription_ends_at");
          
        const totalCompanies = companiesData?.length || 0;
        const activeCompanies = (companiesData || []).filter(c => {
          const isExpired = c.subscription_ends_at ? new Date(c.subscription_ends_at) < new Date() : true;
          return !c.is_locked && !isExpired;
        }).length;

        // 2. Revenue Stats
        const { data: txData } = await supabase
          .from("transactions")
          .select("amount")
          .ilike("status", "%completed%");
          
        const totalRevenue = (txData || []).reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

        // 3. Visitor Stats
        const { count: visitorCount } = await supabase.from("visitors").select("*", { count: "exact", head: true });
        const { count: todayVisitorCount } = await supabase.from("visitors").select("*", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString());
        const { count: pendingCount } = await supabase.from("visitors").select("*", { count: "exact", head: true }).eq("status", "pending");
        const { count: insideCount } = await supabase.from("visitors").select("*", { count: "exact", head: true }).eq("status", "checked_in");

        // 4. Guard Stats
        const { count: guardCount } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("role", "guard");

        // 5. Calculate Top Companies Leaderboard (The Competition)
        const { data: visitorIds } = await supabase.from("visitors").select("company_id");
        
        const companyCounts: Record<string, number> = {};
        (visitorIds || []).forEach(v => {
          if (v.company_id) {
            companyCounts[v.company_id] = (companyCounts[v.company_id] || 0) + 1;
          }
        });

        const leaderboard = (companiesData || [])
          .map(c => ({
            id: c.id,
            name: c.name,
            visitors: companyCounts[c.id] || 0
          }))
          .sort((a, b) => b.visitors - a.visitors)
          .slice(0, 6); // Top 6 for the grid

        setStats({
          totalCompanies,
          activeCompanies,
          totalRevenue,
          totalVisitors: visitorCount || 0,
          todayVisitors: todayVisitorCount || 0,
          totalGuards: guardCount || 0,
          pendingVisitors: pendingCount || 0,
          insideVisitors: insideCount || 0
        });
        
        setTopCompanies(leaderboard);

      } catch (error) {
        console.error("Failed to fetch global stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalStats();
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-10 max-w-7xl mx-auto space-y-6 md:space-y-8">
      
      {/* Header Section */}
      <div className="border-b border-zinc-200 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Platform Pulse</h1>
            <p className="text-zinc-500 mt-1 text-sm md:text-base">Real-time global analytics for your VMS network.</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-zinc-500">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-amber-500" />
          <p className="font-bold text-xl text-zinc-900">Synchronizing Global Data...</p>
          <p className="text-sm mt-1 text-zinc-500">Connecting to secure ledgers and active gates.</p>
        </div>
      ) : (
        <div className="space-y-6 md:space-y-8">
          
          {/* --- TOP TIER: High Level KPI Grid --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            
            <Card className="border-0 border-l-4 border-l-emerald-500 shadow-sm bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Revenue</p>
                   <Banknote className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-emerald-600">KES</span>
                  <span className="text-3xl font-black text-zinc-900 tracking-tight">{stats.totalRevenue.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 font-bold">Total Platform Earnings</p>
              </CardContent>
            </Card>

            <Card className="border-0 border-l-4 border-l-blue-500 shadow-sm bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Clients</p>
                   <Building2 className="w-4 h-4 text-blue-500" />
                </div>
                <div className="text-3xl font-black text-zinc-900 tracking-tight">{stats.totalCompanies}</div>
                <div className="flex items-center gap-1.5 mt-1">
                   <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                   <p className="text-[10px] text-zinc-500 font-bold uppercase">{stats.activeCompanies} Active Subscriptions</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 border-l-4 border-l-indigo-500 shadow-sm bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Guards</p>
                   <ShieldCheck className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="text-3xl font-black text-zinc-900 tracking-tight">{stats.totalGuards}</div>
                <p className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-tight">Active Accounts Deployed</p>
              </CardContent>
            </Card>

            <Card className="border-0 border-l-4 border-l-zinc-900 shadow-sm bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                   <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Lifetime Visitors</p>
                   <Activity className="w-4 h-4 text-zinc-900" />
                </div>
                <div className="text-3xl font-black text-zinc-900 tracking-tight">{stats.totalVisitors.toLocaleString()}</div>
                <p className="text-[10px] text-zinc-400 mt-1 font-bold uppercase tracking-tight">Records Processed to Date</p>
              </CardContent>
            </Card>

          </div>

          {/* --- MIDDLE TIER: Visual Analytics & Competitions --- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            
            {/* 1. Workspace Competition (The Leaderboard) */}
            <Card className="lg:col-span-2 shadow-sm border-zinc-200/60 bg-white/90 backdrop-blur-sm overflow-hidden">
              <CardHeader className="border-b border-zinc-100/50 pb-4 bg-zinc-50/50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" /> Workspace Leaderboard
                    </CardTitle>
                    <CardDescription>Most active client buildings by visitor traffic.</CardDescription>
                  </div>
                  <div className="px-2 py-1 bg-amber-50 border border-amber-100 rounded-md text-[10px] font-bold text-amber-600 uppercase tracking-wider">
                    Platform Rank
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {topCompanies.map((company, index) => {
                    const maxVis = topCompanies[0]?.visitors || 1;
                    const percentage = Math.max((company.visitors / maxVis) * 100, 5);

                    return (
                      <div key={company.id} className="relative p-4 rounded-xl bg-white border border-zinc-100 overflow-hidden shadow-sm group">
                        {/* Relative Progress Bar */}
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-blue-50/70 z-0 transition-all duration-1000 ease-out" 
                          style={{ width: `${percentage}%` }} 
                        />
                        
                        <div className="relative z-10 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            {index === 0 ? (
                              <Crown className="text-amber-500 w-5 h-5 drop-shadow-sm animate-bounce" />
                            ) : (
                              <div className="w-5 text-center font-bold text-zinc-300 text-sm">{index + 1}</div>
                            )}
                            <span className="font-bold text-zinc-900 text-sm truncate max-w-[120px]">{company.name}</span>
                          </div>
                          <div className="text-right">
                             <div className="font-black text-blue-600 text-lg leading-none">{company.visitors.toLocaleString()}</div>
                             <p className="text-[9px] font-bold text-zinc-400 uppercase mt-0.5">Visits</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {topCompanies.length === 0 && (
                    <div className="col-span-2 py-10 text-center text-zinc-400 italic">No visitor data accumulated yet.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* 2. Live Global Pulse (Traffic Flow) */}
            <Card className="shadow-sm border-zinc-200/60 bg-white/90 backdrop-blur-sm flex flex-col">
              <CardHeader className="border-b border-zinc-100/50 pb-4 bg-zinc-50/50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-500" /> Global Pulse
                </CardTitle>
                <CardDescription>Real-time entrance overview.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col justify-around">
                
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> Pending at Gates</p>
                    <p className="text-4xl font-black text-zinc-900">{stats.pendingVisitors.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-amber-500">
                    <ArrowUpRight className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-2xl border border-green-100">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-green-600 uppercase tracking-widest flex items-center gap-1.5"><LogIn className="w-3.5 h-3.5"/> Currently Inside</p>
                    <p className="text-4xl font-black text-zinc-900">{stats.insideVisitors.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-green-500">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-zinc-100 mt-2">
                   <div className="text-center flex-1">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Daily Check-ins</p>
                      <p className="text-xl font-bold text-zinc-800">{stats.todayVisitors.toLocaleString()}</p>
                   </div>
                   <div className="w-px h-8 bg-zinc-100 mx-4"></div>
                   <div className="text-center flex-1">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase">Avg Daily MRR</p>
                      <p className="text-xl font-bold text-zinc-800">KES {Math.round(stats.totalRevenue / 30).toLocaleString()}</p>
                   </div>
                </div>

              </CardContent>
            </Card>

          </div>

        </div>
      )}
    </div>
  );
}