"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, X, UserCircle, ScanLine } from "lucide-react";

type AddVisitorModalProps = {
  isOpen: boolean;
  onClose: () => void;
  companyId: string | null;
  requirePhoto: boolean;
  askPhone: boolean;
  askId: boolean;
};

export default function AddVisitorModal({
  isOpen,
  onClose,
  companyId,
  requirePhoto,
  askPhone,
  askId,
}: AddVisitorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newVisitor, setNewVisitor] = useState({ name: "", phone: "", id_number: "", doc_type: "National ID" });
  
  // Phone Country Code State (Default to Kenya)
  const [countryCode, setCountryCode] = useState("+254");

  // Selfie State
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  // OCR Camera State
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // --- OCR SCANNING LOGIC ---
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

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
          setNewVisitor((prev) => ({
            ...prev,
            name: result.data.FullName || prev.name,
            id_number: result.data.IDNumber || prev.id_number,
          }));
        } else {
          alert("Could not read the ID clearly. Please type it manually.");
        }
        setIsScanning(false);
      };
    } catch (error) {
      console.error(error);
      setIsScanning(false);
      alert("Error scanning ID. Please try manually.");
    }
  };

  // --- ADD VISITOR LOGIC ---
  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      alert("Could not identify your building assignment. Please refresh the page.");
      return;
    }

    if (requirePhoto && !selfieFile) {
      alert("A security photo is required by building management.");
      return;
    }

    setIsSubmitting(true);
    let uploadedPhotoUrl = null;

    try {
      // 1. Upload Selfie to Cloudflare R2 if present
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
          throw new Error("Failed to securely upload security photo.");
        }
      }

      // Format the phone number to prevent "+2540700..." errors (removes leading zero)
      let finalPhone = null;
      if (askPhone && newVisitor.phone) {
        const cleanPhone = newVisitor.phone.replace(/^0+/, ''); 
        finalPhone = `${countryCode}${cleanPhone}`;
      }

      // 2. Insert Visitor Record
      const { error } = await supabase.from("visitors").insert([
        {
          company_id: companyId,
          name: newVisitor.name,
          phone: finalPhone,
          document_type: askId ? newVisitor.doc_type : null,
          id_number: askId ? newVisitor.id_number : null,
          status: "pending",
          photo_url: uploadedPhotoUrl
        }
      ]);

      if (error) throw error;

      // Reset form and close modal
      setNewVisitor({ name: "", phone: "", id_number: "", doc_type: "National ID" });
      setSelfieFile(null);
      setSelfiePreview(null);
      onClose();

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to add visitor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-black">
          <X size={20} />
        </button>
        <CardHeader>
          <CardTitle>Register Visitor</CardTitle>
        </CardHeader>
        <CardContent>
          {/* HIDDEN FILE INPUT FOR ID CARD (Triggers Camera on mobile) */}
          <input 
            type="file" accept="image/*" capture="environment" 
            className="hidden" ref={fileInputRef} onChange={handleImageCapture} 
          />
          
          <Button 
            variant="outline" 
            className="w-full mb-6 border-dashed border-2 py-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
          >
            {isScanning ? (
              <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analyzing ID Card...</>
            ) : (
              <><ScanLine className="mr-2 h-5 w-5" /> Auto-Fill using ID Card</>
            )}
          </Button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-zinc-500">Or enter manually</span></div>
          </div>

          <form onSubmit={handleAddVisitor} className="space-y-4">
            <div>
              <Label className="mb-1 block">Full Name</Label>
              <Input required value={newVisitor.name} onChange={(e) => setNewVisitor({...newVisitor, name: e.target.value})} placeholder="e.g. John Doe" />
            </div>

            {/* DYNAMIC FIELD: PHONE WITH COUNTRY CODE */}
            {askPhone && (
              <div>
                <Label className="mb-1 block">Phone Number</Label>
                <div className="flex gap-2">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="flex h-10 w-[110px] items-center justify-between rounded-md border border-input bg-background px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="+254">🇰🇪 +254</option>
                    <option value="+255">🇹🇿 +255</option>
                    <option value="+256">🇺🇬 +256</option>
                    <option value="+250">🇷🇼 +250</option>
                    <option value="+257">🇧🇮 +257</option>
                    <option value="+1">🇺🇸 +1</option>
                    <option value="+44">🇬🇧 +44</option>
                  </select>
                  <Input 
                    required 
                    type="tel" 
                    value={newVisitor.phone} 
                    onChange={(e) => setNewVisitor({...newVisitor, phone: e.target.value})} 
                    placeholder="712 345 678" 
                    className="flex-1"
                  />
                </div>
              </div>
            )}

            {/* DYNAMIC FIELDS: ID DOCUMENTS (SIDE-BY-SIDE GRID) */}
            {askId && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block">Document Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={newVisitor.doc_type}
                    onChange={(e) => setNewVisitor({...newVisitor, doc_type: e.target.value})}
                  >
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver's License">Driver's License</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block">ID / Document No.</Label>
                  <Input 
                    value={newVisitor.id_number} 
                    onChange={(e) => setNewVisitor({...newVisitor, id_number: e.target.value})} 
                    placeholder="Optional if scanning" 
                  />
                </div>
              </div>
            )}

            {/* SECURITY PHOTO - ONLY VISIBLE IF ADMIN TOGGLED IT ON */}
            {requirePhoto && (
              <div className="space-y-3 pt-2">
                <Label className="flex justify-between items-center">
                  Security Photo
                  <span className="text-xs text-red-500 font-semibold">* Required</span>
                </Label>
                
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-zinc-100 border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden shrink-0">
                    {selfiePreview ? (
                      <Image 
                        src={selfiePreview} 
                        alt="Selfie preview" 
                        width={64}
                        height={64}
                        className="w-full h-full object-cover" 
                        unoptimized
                      />
                    ) : (
                      <UserCircle className="w-8 h-8 text-zinc-300" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <input 
                      type="file" accept="image/*" capture="user" 
                      className="hidden" ref={selfieInputRef} onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setSelfieFile(file);
                          setSelfiePreview(URL.createObjectURL(file));
                        }
                      }} 
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

            <Button type="submit" className="w-full mt-4" disabled={isSubmitting}>
              {isSubmitting ? "Processing..." : "Add to Pending List"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}