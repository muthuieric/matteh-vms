"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
// Adjust the path to where your supabase.ts file is located
import { supabase } from "@/lib/supabase"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function GateRegistration() {
  // Grab the companyId securely from the URL
  const params = useParams<{ companyId: string }>();

  // Form State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [documentType, setDocumentType] = useState("National ID");
  const [idNumber, setIdNumber] = useState("");

  // UI State
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Safeguard to ensure we actually have the ID before sending to the database
    if (!params?.companyId) {
      setError("Invalid gate link. Company ID is missing.");
      setLoading(false);
      return;
    }

    try {
      // 1. Insert the new visitor into Supabase
      const { error: dbError } = await supabase
        .from("visitors")
        .insert([
          {
            company_id: params.companyId, 
            name: name,
            phone: phone,
            document_type: documentType,
            id_number: idNumber,
            status: "pending",
          },
        ]);

      if (dbError) throw dbError;

      // 2. Show the success screen
      setSuccess(true);
    } catch (err: any) {
      console.error("Database Error:", err);
      setError(err.message || "Failed to register visitor. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // What the user sees AFTER submitting successfully
  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
        <Card className="w-full max-w-md text-center shadow-lg">
          <CardHeader>
            <CardTitle className="text-green-600 text-2xl">Registration Complete!</CardTitle>
            <CardDescription className="text-base mt-2">
              Please proceed to the gate. The guard will verify your details and send you an OTP shortly.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // The main registration form
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-t-4 border-t-zinc-900">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Visitor Check-In</CardTitle>
          <CardDescription>
            Please enter your details to register your visit.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message Display */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-200">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. John Doe"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. 0712345678"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="documentType">Document Type</Label>
              {/* Using a styled native select for simplicity */}
              <select
                id="documentType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
              >
                <option value="National ID">National ID</option>
                <option value="Passport">Passport</option>
                <option value="None">None (No ID)</option>
              </select>
            </div>

            {/* Conditionally hide the ID input if they select "None" */}
            {documentType !== "None" && (
              <div className="space-y-2">
                <Label htmlFor="idNumber">
                  {documentType} Number
                </Label>
                <Input
                  id="idNumber"
                  placeholder={`Enter your ${documentType} number`}
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                />
              </div>
            )}

            <Button type="submit" className="w-full text-base py-6" disabled={loading}>
              {loading ? "Registering..." : "Submit Registration"}
            </Button>
            
            {/* ODPC Legal Compliance Disclaimer */}
            <p className="text-xs text-zinc-500 text-center mt-4 px-2 leading-relaxed">
              By submitting, I consent to my details being stored securely for 7 days for building security purposes in compliance with the Kenyan Data Protection Act.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}