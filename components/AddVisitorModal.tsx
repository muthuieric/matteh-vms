"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, X, UserCircle, ScanLine } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { compressImage } from "@/lib/image-compression";

type CustomField = {
  id: string;
  label: string;
  active: boolean;
};

export interface AddVisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string | null;
  requirePhoto: boolean;
  askPhone: boolean;
  askId: boolean;
  askHost?: boolean;
  askPurpose?: boolean;
  askVehicle?: boolean;
  guardGateId?: string | null;
}

export default function AddVisitorModal({
  isOpen,
  onClose,
  companyId,
  requirePhoto,
  askPhone,
  askId,
  askHost = false,
  askPurpose = false,
  askVehicle = false,
  guardGateId = null,
}: AddVisitorModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newVisitor, setNewVisitor] = useState({ 
    name: "", phone: "", id_number: "", doc_type: "National ID", host_id: "", purpose: "", vehicle_reg: "" 
  });
  
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const [departments, setDepartments] = useState<any[]>([]);
  const [hosts, setHosts] = useState<any[]>([]);

  const [hostSearchQuery, setHostSearchQuery] = useState("");
  const [isHostDropdownOpen, setIsHostDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // NEW: Terms and Conditions State
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsHostDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchCustomFields = async () => {
      if (!companyId || !isOpen) return;
      const { data } = await supabase
        .from("companies")
        .select("custom_fields")
        .eq("id", companyId)
        .single();
        
      if (data?.custom_fields) {
        const activeFields = (data.custom_fields as CustomField[]).filter(f => f.active);
        setCustomFields(activeFields);
      }
    };

    const fetchDepartmentsAndHosts = async () => {
      if (!companyId || !isOpen) return;
      try {
        const deptsRes = await fetch(`/api/departments?company_id=${companyId}`);
        if (deptsRes.ok) {
          const deptsJson = await deptsRes.json();
          if (deptsJson.data) setDepartments(deptsJson.data);
        }

        const hostsRes = await fetch(`/api/hosts?company_id=${companyId}`);
        if (hostsRes.ok) {
          const hostsJson = await hostsRes.json();
          if (hostsJson.data) setHosts(hostsJson.data);
        }
      } catch (error) {
        console.error("Error fetching hosts/departments", error);
      }
    };

    fetchCustomFields();
    fetchDepartmentsAndHosts();
  }, [companyId, isOpen]);

  const filteredDepartments = departments.map(dept => {
    const deptHosts = hosts.filter(h => 
      h.department_id === dept.id && 
      h.name.toLowerCase().includes(hostSearchQuery.toLowerCase())
    );
    return { ...dept, hosts: deptHosts };
  }).filter(dept => dept.hosts.length > 0);

  if (!isOpen) return null;

  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const compressedFile = await compressImage(file);
      
      // FIX 1: Send as FormData instead of Base64 JSON to match the new backend
      const formDataPayload = new FormData();
      formDataPayload.append("file", compressedFile);

      const response = await fetch("/api/ocr", {
        method: "POST",
        body: formDataPayload,
      });

      const result = await response.json();

      if (result.success && result.data) {
        setNewVisitor((prev) => ({
          ...prev,
          // FIX 2: Use exact keys matching the new Google Cloud Vision route
          name: result.data.name || prev.name,
          id_number: result.data.id_number || prev.id_number,
        }));
      } else {
        alert("Could not read the ID clearly. Please type it manually.");
      }
      setIsScanning(false);
    } catch (error) {
      console.error(error);
      setIsScanning(false);
      alert("Error scanning ID. Please try manually.");
    }
  };
  
  const handleAddVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyId) {
      alert("Could not identify your building assignment. Please refresh the page.");
      return;
    }

    if (!agreedToTerms) {
      alert("You must agree to the Terms and Conditions to register.");
      return;
    }

    if (requirePhoto && !selfieFile) {
      alert("A security photo is required by building management.");
      return;
    }

    if (askHost && !newVisitor.host_id) {
      alert("Please select a valid host from the dropdown list.");
      return;
    }

    setIsSubmitting(true);
    let uploadedPhotoUrl = null;

    try {
      let finalPhone = null;
      if (askPhone && newVisitor.phone) {
        finalPhone = newVisitor.phone.startsWith('+') ? newVisitor.phone : `+${newVisitor.phone}`;
      }

      // 1. ROBUST BLACKLIST SECURITY CHECK
      const redFlagsRes = await fetch(`/api/red-flags?company_id=${companyId}`);
      if (redFlagsRes.ok) {
        const redFlagsJson = await redFlagsRes.json();
        const blacklisted = redFlagsJson.data || [];

        if (blacklisted.length > 0) {
          const isBanned = blacklisted.find((flag: any) => {
            const matchId = askId && flag.id_number && newVisitor.id_number && flag.id_number.trim() === newVisitor.id_number.trim();
            const matchPhone = askPhone && flag.phone && finalPhone && flag.phone.trim() === finalPhone.trim();
            const matchName = flag.name && newVisitor.name && flag.name.trim().toLowerCase() === newVisitor.name.trim().toLowerCase();
            
            if (matchId || matchPhone) return true;

            if (matchName) {
              const hasDifferentId = askId && newVisitor.id_number && flag.id_number && newVisitor.id_number.trim() !== flag.id_number.trim();
              const hasDifferentPhone = askPhone && finalPhone && flag.phone && finalPhone.trim() !== flag.phone.trim();
              if (hasDifferentId || hasDifferentPhone) return false;
              return true; 
            }
            return false;
          });

          if (isBanned) {
            alert(`⚠️ ACCESS DENIED: This visitor is restricted from entering the building.\n\nReason: ${isBanned.reason}`);
            setIsSubmitting(false);
            return; 
          }
        }
      }

      // 2. Upload Selfie
      if (selfieFile) {
        const compressedFile = await compressImage(selfieFile);
        
        const formDataPayload = new FormData();
        formDataPayload.append("file", compressedFile);
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

      // 3. Insert Visitor Record
      const finalGateId = guardGateId && guardGateId !== "" && guardGateId !== "unassigned" ? guardGateId : null;

      const { error } = await supabase.from("visitors").insert([
        {
          company_id: companyId,
          name: newVisitor.name,
          phone: finalPhone,
          document_type: askId ? newVisitor.doc_type : null,
          id_number: askId ? newVisitor.id_number : null,
          host_id: askHost && newVisitor.host_id ? newVisitor.host_id : null,
          host_name: askHost && newVisitor.host_id ? hostSearchQuery : null,
          purpose: askPurpose ? newVisitor.purpose : null,
          vehicle_reg: askVehicle ? newVisitor.vehicle_reg : null,
          status: "pending",
          photo_url: uploadedPhotoUrl,
          custom_data: customAnswers,
          gate_id: finalGateId 
        }
      ]);

      if (error) throw error;

      // Reset form
      setNewVisitor({ name: "", phone: "", id_number: "", doc_type: "National ID", host_id: "", purpose: "", vehicle_reg: "" });
      setHostSearchQuery(""); 
      setCustomAnswers({});
      setSelfieFile(null);
      setSelfiePreview(null);
      setAgreedToTerms(false);
      onClose();

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to add visitor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-black">
          <X size={20} />
        </button>
        <CardHeader>
          <CardTitle>Register Visitor</CardTitle>
        </CardHeader>
        <CardContent>
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
              <Label className="mb-1 block font-semibold text-zinc-700">Full Name <span className="text-red-500">*</span></Label>
              <Input required value={newVisitor.name} onChange={(e) => setNewVisitor({...newVisitor, name: e.target.value})} placeholder="e.g. John Doe" className="h-10 bg-zinc-50" />
            </div>

            {askPhone && (
              <div>
                <Label className="mb-1 block font-semibold text-zinc-700">Phone Number <span className="text-red-500">*</span></Label>
                <PhoneInput 
                  country="ke" 
                  value={newVisitor.phone} 
                  onChange={phone => setNewVisitor({ ...newVisitor, phone })} 
                  inputClass="!w-full !h-10 !text-zinc-900 !bg-zinc-50 !rounded-md !border !border-zinc-300 focus:!ring-2 focus:!ring-blue-600 px-3" 
                  containerClass="w-full" 
                  buttonClass="!border-zinc-300 !bg-zinc-50 !rounded-l-md hover:!bg-zinc-100"
                />
              </div>
            )}

            {askId && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block font-semibold text-zinc-700">Document Type</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={newVisitor.doc_type}
                    onChange={(e) => setNewVisitor({...newVisitor, doc_type: e.target.value})}
                  >
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver's License">Driver's License</option>
                  </select>
                </div>
                <div>
                  {/* CHANGED: Now required and visually indicated */}
                  <Label className="mb-1 block font-semibold text-zinc-700">ID / Document No. <span className="text-red-500">*</span></Label>
                  <Input 
                    required
                    value={newVisitor.id_number} 
                    onChange={(e) => setNewVisitor({...newVisitor, id_number: e.target.value})} 
                    placeholder="Enter ID number" 
                    className="h-10 bg-zinc-50"
                  />
                </div>
              </div>
            )}

            {askHost && (
              <div className="relative" ref={dropdownRef}>
                <Label className="mb-1 block font-semibold text-zinc-700">Who are you visiting?</Label>
                <Input
                  type="text"
                  placeholder="Type to search for a host..."
                  value={hostSearchQuery}
                  onChange={(e) => {
                    setHostSearchQuery(e.target.value);
                    setIsHostDropdownOpen(true);
                    setNewVisitor({ ...newVisitor, host_id: "" }); 
                  }}
                  onFocus={() => setIsHostDropdownOpen(true)}
                  className="h-10 bg-zinc-50"
                  autoComplete="off"
                />
                
                <input type="text" className="hidden" required value={newVisitor.host_id} onChange={() => {}} />

                {isHostDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {filteredDepartments.length === 0 ? (
                      <div className="p-3 text-sm text-zinc-500 text-center">No matching hosts found.</div>
                    ) : (
                      filteredDepartments.map((dept) => (
                        <div key={dept.id}>
                          <div className="px-3 py-1.5 text-xs font-bold bg-zinc-100 text-zinc-500 uppercase tracking-wider sticky top-0">
                            {dept.name}
                          </div>
                          {dept.hosts.map((host: any) => (
                            <div
                              key={host.id}
                              className="px-3 py-2 text-sm text-zinc-900 hover:bg-blue-50 cursor-pointer border-b border-zinc-50 last:border-0"
                              onClick={() => {
                                setNewVisitor({ ...newVisitor, host_id: host.id });
                                setHostSearchQuery(host.name);
                                setIsHostDropdownOpen(false);
                              }}
                            >
                              {host.name}
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {askPurpose && (
              <div>
                <Label className="mb-1 block font-semibold text-zinc-700">Purpose of Visit</Label>
                <Input 
                  value={newVisitor.purpose} 
                  onChange={(e) => setNewVisitor({...newVisitor, purpose: e.target.value})} 
                  placeholder="e.g. Meeting, Delivery, Interview" 
                  className="h-10 bg-zinc-50"
                />
              </div>
            )}

            {askVehicle && (
              <div>
                <Label className="mb-1 block font-semibold text-zinc-700">Vehicle Registration</Label>
                <Input 
                  value={newVisitor.vehicle_reg} 
                  onChange={(e) => setNewVisitor({...newVisitor, vehicle_reg: e.target.value})} 
                  placeholder="e.g. KCA 123A (Leave blank if walk-in)" 
                  className="h-10 bg-zinc-50 uppercase"
                />
              </div>
            )}

            {customFields.map((field) => (
              <div key={field.id}>
                <Label className="mb-1 block font-semibold text-zinc-700">{field.label}</Label>
                <Input 
                  value={customAnswers[field.id] || ""} 
                  onChange={(e) => setCustomAnswers({...customAnswers, [field.id]: e.target.value})} 
                  placeholder={`Enter ${field.label.toLowerCase()}`} 
                  className="h-10 bg-zinc-50"
                />
              </div>
            ))}

            {requirePhoto && (
              <div className="space-y-3 pt-2 pb-2">
                <Label className="flex justify-between items-center font-semibold text-zinc-700">
                  Security Photo
                  <span className="text-xs text-red-500 font-bold uppercase tracking-wider">* Required</span>
                </Label>
                
                <div className="flex items-center gap-4 bg-zinc-50 p-3 rounded-xl border border-zinc-200">
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-dashed border-zinc-300 flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
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
                      type="button" variant="outline" className="w-full text-xs h-10 bg-white hover:bg-zinc-100 shadow-sm border-zinc-300 text-zinc-700 font-bold"
                      onClick={() => selfieInputRef.current?.click()}
                    >
                      <Camera className="w-4 h-4 mr-2" /> Take Photo
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* NEW: Terms and Conditions Checkbox Area */}
            <div className="space-y-3 pt-4 border-t border-zinc-200">
              <div className="text-xs text-zinc-500 h-24 overflow-y-auto p-3 bg-zinc-50 border border-zinc-200 rounded-md leading-relaxed shadow-inner">
                <p className="font-bold mb-1 text-zinc-700">Terms and Conditions of Entry</p>
                <p>By registering, the visitor agrees to comply with all building security policies and procedures. The visitor consents to the collection, processing, and temporary storage of their personal data (including identification details and facial capture, if applicable) strictly for building security and safety audit purposes. Management reserves the right to deny entry, conduct searches, or escort individuals off the premises for non-compliance. Data is handled in accordance with local data protection laws.</p>
              </div>
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="terms"
                  required
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 shrink-0 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-600 cursor-pointer"
                />
                <Label htmlFor="terms" className="text-sm text-zinc-700 leading-snug cursor-pointer font-medium">
                  The visitor has agreed to the Terms and Conditions and consents to data processing. <span className="text-red-500">*</span>
                </Label>
              </div>
            </div>

            <Button type="submit" className="w-full mt-6 h-12 text-base font-bold bg-blue-600 hover:bg-blue-700 shadow-sm transition-transform active:scale-[0.98]" disabled={isSubmitting || !agreedToTerms}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Checking Security...</> : "Register Visitor"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}