"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LifeBuoy, Loader2, MessageSquare, Send, Clock, CheckCircle2 } from "lucide-react";

type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: "pending" | "in_progress" | "resolved";
  created_at: string;
};

export default function SupportPage() {
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const { data: authData } = await supabase.auth.getUser();
    
    if (authData?.user) {
      setUserId(authData.user.id);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", authData.user.id)
        .single();

      if (profileData?.company_id) {
        setCompanyId(profileData.company_id);
        
        try {
          const res = await fetch(`/api/support?company_id=${profileData.company_id}`);
          if (res.ok) {
            const json = await res.json();
            if (json.data) setTickets(json.data);
          }
        } catch (err) {
          console.error("Error fetching tickets:", err);
        }
      }
    }
    setLoading(false);
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId || !userId || !subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          created_by: userId,
          subject,
          description
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setTickets([result.data, ...tickets]);
      setSubject("");
      setDescription("");
      alert("Ticket submitted successfully! Our team will review it shortly.");
    } catch (error: any) {
      console.error(error);
      alert(error.message || "Failed to submit ticket.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!companyId && !loading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-red-500 font-medium">Profile error. Please log in again.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6 pb-20">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end border-b border-zinc-200 pb-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 text-blue-700 rounded-lg shrink-0">
              <LifeBuoy className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Help Desk</h1>
              <p className="text-zinc-500 mt-1 text-sm md:text-base">Submit support requests or report issues directly to our team.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Create Ticket Form */}
          <div className="lg:col-span-1">
            <Card className="shadow-sm border-zinc-200 bg-white sticky top-6">
              <CardHeader className="bg-zinc-50/50 border-b border-zinc-100 pb-5">
                <CardTitle className="text-lg">Submit a Ticket</CardTitle>
                <CardDescription>Need assistance? Let us know below.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div>
                    <Label className="font-semibold text-zinc-700">Subject</Label>
                    <Input 
                      required 
                      placeholder="e.g. Need to add more gates" 
                      value={subject} 
                      onChange={(e) => setSubject(e.target.value)} 
                      className="h-11 bg-zinc-50 mt-1.5"
                    />
                  </div>
                  <div>
                    <Label className="font-semibold text-zinc-700">Description</Label>
                    <textarea 
                      required 
                      placeholder="Please describe the issue or request in detail..." 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      className="flex min-h-[120px] w-full rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm shadow-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 mt-1.5 resize-none"
                    />
                  </div>
                  <Button type="submit" className="w-full h-11 bg-zinc-900 hover:bg-zinc-800 text-white font-bold" disabled={isSubmitting || !subject.trim() || !description.trim()}>
                    {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Submit Ticket</>}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Ticket History List */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm border-zinc-200 bg-white h-full">
              <CardHeader className="bg-white border-b border-zinc-100 pb-5">
                <CardTitle className="text-xl">Your Support History</CardTitle>
                <CardDescription>Track the status of your previous requests.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 sm:p-6 sm:pt-6 bg-zinc-50/30">
                {loading ? (
                   <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-zinc-400" /></div>
                ) : tickets.length === 0 ? (
                   <div className="text-center py-16 text-zinc-500 bg-white sm:rounded-xl border border-dashed border-zinc-200 m-0 sm:m-2">
                     <div className="bg-zinc-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-100 shadow-sm">
                        <MessageSquare className="w-8 h-8 text-zinc-300" />
                     </div>
                     <p className="font-bold text-zinc-800 text-lg">No support tickets.</p>
                     <p className="text-sm mt-1 max-w-sm mx-auto text-zinc-500">You haven't submitted any requests yet.</p>
                   </div>
                ) : (
                  <div className="rounded-none sm:rounded-md border-y sm:border overflow-x-auto bg-white shadow-sm">
                    <Table>
                      <TableHeader className="bg-zinc-50">
                        <TableRow>
                          <TableHead className="whitespace-nowrap pl-4 sm:pl-6">Ticket Subject</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap text-right pr-4 sm:pr-6">Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tickets.map((ticket) => (
                          <TableRow key={ticket.id} className="hover:bg-zinc-50/50 transition-colors">
                            <TableCell className="pl-4 sm:pl-6 max-w-[250px]">
                              <p className="font-bold text-zinc-900 truncate">{ticket.subject}</p>
                              <p className="text-xs text-zinc-500 truncate mt-0.5">{ticket.description}</p>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {ticket.status === "pending" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                                  <Clock className="w-3.5 h-3.5" /> Pending Review
                                </span>
                              )}
                              {ticket.status === "in_progress" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> In Progress
                                </span>
                              )}
                              {ticket.status === "resolved" && (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 border border-green-200">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap pr-4 sm:pr-6 text-sm text-zinc-500">
                              {new Date(ticket.created_at).toLocaleDateString()}
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
          
        </div>
      </div>
    </div>
  );
}