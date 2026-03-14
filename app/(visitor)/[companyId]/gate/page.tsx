"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldAlert, ScanLine, Loader2, Camera, UserCircle } from "lucide-react";

export default function GateCheckIn() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [companyName, setCompanyName] = useState<string>("Loading...");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  // --- BUILDING RULE STATE ---
  const [requirePhoto, setRequirePhoto] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    documentType: "National ID",
    idNumber: "",
  });

  const [isScanningId, setIsScanningId] = useState(false);
  const idInputRef = useRef<HTMLInputElement>(null);
  
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchCompany = async () => {
      const { data } = await supabase
        .from("companies")
        .select("name, logo_url, require_photo")
        .eq("id", companyId)
        .single();

      if (data) {
        setCompanyName(data.name);
        setLogoUrl(data.logo_url);
        setRequirePhoto(data.require_photo || false);
      }
    };
    if (companyId) fetchCompany();
  }, [companyId]);

  const handleIdScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningId(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        const response = await fetch("/api/ocr", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64data }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          setFormData(prev => ({
            ...prev,
            name: result.data.FullName || prev.name,
            idNumber: result.data.IDNumber || prev.idNumber,
          }));
        } else {
          alert("Could not read the ID clearly. Please type your details manually.");
        }
        setIsScanningId(false);
      };
    } catch (error) {
      console.error(error);
      setIsScanningId(false);
      alert("Error scanning ID. Please enter your details manually.");
    }
  };

  const handleSelfieCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelfieFile(file);
      setSelfiePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict Check: Did the Admin require a photo, but the visitor skipped it?
    if (requirePhoto && !selfieFile) {
      alert("A security photo (selfie) is required by this building's management.");
      return;
    }

    setIsSubmitting(true);
    let uploadedPhotoUrl = null;

    try {
      if (selfieFile) {
        const formDataPayload = new FormData();
        formDataPayload.append("file", selfieFile);
        formDataPayload.append("companyId", companyId);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formDataPayload,
        });
        
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          uploadedPhotoUrl = uploadData.url;
        } else {
          console.error("Cloudflare upload failed:", uploadData.error);
          throw new Error("Failed to securely upload security photo.");
        }
      }

      // Name, Phone, and ID are mandatory for all visitors again.
      const { error } = await supabase.from("visitors").insert([
        {
          company_id: companyId,
          name: formData.name,
          phone: formData.phone,
          document_type: formData.documentType,
          id_number: formData.idNumber,
          status: "pending",
          photo_url: uploadedPhotoUrl
        }
      ]);

      if (!error) {
        setSuccess(true);
      } else {
        throw error;
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to register. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-t-8 border-t-green-600 shadow-2xl text-center p-8 space-y-4">
          <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-zinc-900">Registration Sent</CardTitle>
          <CardDescription className="text-lg">
            Please proceed to the security desk and show your physical ID to the guard to complete check-in.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 px-4">
      
      <div className="text-center mb-8 space-y-4">
        {logoUrl ? (
          <img src={logoUrl} alt={`${companyName} Logo`} className="h-20 mx-auto object-contain drop-shadow-sm" />
        ) : (
          <div className="w-16 h-16 bg-blue-600 text-white rounded-xl flex items-center justify-center text-2xl font-bold mx-auto shadow-lg">
            {companyName.charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-bold text-zinc-900">{companyName}</h1>
        <p className="text-zinc-500 font-medium">Visitor Check-in Portal</p>
      </div>

      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-blue-600">
        <CardContent className="pt-6">
          
          <div className="mb-6">
            <input 
              type="file" accept="image/*" capture="environment" 
              className="hidden" ref={idInputRef} onChange={handleIdScan} 
            />
            <Button 
              type="button"
              variant="outline" 
              className="w-full border-dashed border-2 py-6 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors"
              onClick={() => idInputRef.current?.click()}
              disabled={isScanningId}
            >
              {isScanningId ? (
                <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Scanning ID Card...</>
              ) : (
                <><ScanLine className="mr-2 h-5 w-5" /> Auto-Fill using ID Card</>
              )}
            </Button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-500">Or enter manually</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input required placeholder="Enter your official name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input required type="tel" placeholder="e.g. 0712345678" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label>Document Type</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  value={formData.documentType}
                  onChange={(e) => setFormData({...formData, documentType: e.target.value})}
                >
                  <option value="National ID">National ID</option>
                  <option value="Passport">Passport</option>
                  <option value="Driver's License">Driver's License</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Document Number</Label>
                <Input required placeholder="Enter ID/Passport Number" value={formData.idNumber} onChange={(e) => setFormData({...formData, idNumber: e.target.value})} />
              </div>
            </div>

            {/* DYNAMIC FIELD: SECURITY SELFIE - ONLY COMES UP IF ADMIN TOGGLES IT */}
            {requirePhoto && (
              <div className="space-y-3 pt-2 animate-in fade-in slide-in-from-top-2">
                <Label className="flex justify-between items-center">
                  Security Photo (Selfie)
                  <span className="text-xs text-red-500 font-semibold">* Required</span>
                </Label>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden shrink-0">
                    {selfiePreview ? (
                      <img src={selfiePreview} alt="Selfie preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle className="w-8 h-8 text-zinc-300" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <input 
                      type="file" accept="image/*" capture="user" 
                      className="hidden" ref={selfieInputRef} onChange={handleSelfieCapture} 
                    />
                    <Button 
                      type="button" variant="secondary" className="w-full text-xs bg-zinc-100 hover:bg-zinc-200"
                      onClick={() => selfieInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" /> Take Photo
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button type="submit" className="w-full h-12 text-lg bg-blue-600 hover:bg-blue-700" disabled={isSubmitting}>
                {isSubmitting ? "Sending to Security..." : "Submit Registration"}
              </Button>
            </div>
            
            <p className="text-xs text-zinc-500 text-center mt-4 px-2 leading-relaxed">
              By submitting, I consent to my details {requirePhoto ? "and image " : ""}being securely stored for <strong>7 days</strong> for building security purposes, after which they are permanently deleted in compliance with data privacy laws.
            </p>
          </form>
        </CardContent>
      </Card>
      
      <p className="mt-8 text-xs text-zinc-400">Powered by VMS Global Secure Entry</p>
    </div>
  );
}