"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function VisitorCheckout() {
  const params = useParams<{ companyId: string }>();

  // Form State
  const [otp, setOtp] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!params?.companyId) {
      setError("Invalid checkout link. Company ID is missing.");
      setLoading(false);
      return;
    }

    try {
      // 1. Find the active visitor record using ONLY the OTP code
      const { data: visitors, error: fetchError } = await supabase
        .from("visitors")
        .select("*")
        .eq("company_id", params.companyId)
        .eq("otp_code", otp.trim())
        .eq("status", "checked_in") // Only look for people currently inside
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) throw fetchError;

      if (!visitors || visitors.length === 0) {
        setError("Invalid verification code or no active check-in found.");
        setLoading(false);
        return;
      }

      const activeVisitor = visitors[0];

      // 2. Check them out!
      const { error: updateError } = await supabase
        .from("visitors")
        .update({
          status: "checked_out",
          checked_out_at: new Date().toISOString()
        })
        .eq("id", activeVisitor.id);

      if (updateError) throw updateError;

      // 3. Show success screen
      setSuccess(true);
    } catch (err: any) {
      console.error("Checkout Error:", err);
      setError(err.message || "Failed to process checkout. Please try again or see the guard.");
    } finally {
      setLoading(false);
    }
  };

  // What the user sees AFTER successfully checking out
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <Card className="w-full max-w-md text-center shadow-lg border-t-4 border-t-green-600">
          <CardHeader>
            <CardTitle className="text-green-600 text-2xl">Checked Out Successfully</CardTitle>
            <CardDescription className="text-base mt-2 text-zinc-600">
              Thank you for visiting. You may now proceed through the exit. Safe travels!
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // The main checkout form
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-red-600">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Fast-Track Exit</CardTitle>
          <CardDescription>
            Enter the SMS code you received earlier to check out.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCheckout} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-200 text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="otp">4-Digit SMS Code</Label>
              <Input
                id="otp"
                type="text"
                maxLength={4}
                placeholder="e.g. 1234"
                required
                className="text-center text-2xl tracking-widest py-6"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            </div>

            <Button type="submit" variant="destructive" className="w-full text-base py-6" disabled={loading}>
              {loading ? "Verifying..." : "Confirm Departure"}
            </Button>
            
          </form>
        </CardContent>
      </Card>
    </div>
  );
}