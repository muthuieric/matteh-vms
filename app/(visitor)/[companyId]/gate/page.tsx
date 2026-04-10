"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, Loader2, UserCircle, CheckCircle2, AlertOctagon, ScanLine } from "lucide-react";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/style.css";
import { compressImage } from "@/lib/image-compression";

// Define the structure for custom fields
type CustomField = {
  id: string;
  label: string;
  active: boolean;
};

// ADD THESE TWO TYPES:
type Department = { id: string; name: string };
type Host = { id: string; name: string; phone: string; email: string; department_id: string };

export default function PublicGateCheckIn() {
  const params = useParams();
  const companyId = params.companyId as string;

  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Company Rules State
  const [rules, setRules] = useState({
    requirePhoto: false,
    askPhone: true,
    askId: true,
    askHost: false,
    askPurpose: false,
    askVehicle: false
  });
  
  // State for Custom Fields and their Answers
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newVisitor, setNewVisitor] = useState({ 
    name: "", phone: "", id_number: "", doc_type: "National ID", host_id: "", purpose: "", vehicle_reg: "" 
  });

  // State for Departments and Hosts (REPLACE any[] WITH THE NEW TYPES)
  const [departments, setDepartments] = useState<Department[]>([]);
  const [hosts, setHosts] = useState<Host[]>([]);
  
  const [hostSearchQuery, setHostSearchQuery] = useState("");
  const [isHostDropdownOpen, setIsHostDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Photo & OCR State
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);
  
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close custom dropdown when clicking outside of it
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
    const fetchCompanyData = async () => {
      if (!companyId) return;

      // Fetch custom_fields and rules from companies table
      const { data: company, error } = await supabase
        .from("companies")
        .select("name, is_locked, subscription_ends_at, require_photo, ask_phone, ask_id, ask_host, ask_purpose, ask_vehicle, custom_fields")
        .eq("id", companyId)
        .single();

      if (error || !company) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      // Check if building subscription is active
      const isExpired = company.subscription_ends_at ? new Date(company.subscription_ends_at) < new Date() : false;
      if (company.is_locked || isExpired) {
        setAccessDenied(true);
        setLoading(false);
        return;
      }

      setCompanyName(company.name);
      setRules({
        requirePhoto: company.require_photo || false,
        askPhone: company.ask_phone !== false,
        askId: company.ask_id !== false,
        askHost: company.ask_host || false,
        askPurpose: company.ask_purpose || false,
        askVehicle: company.ask_vehicle || false
      });
      
      // Set active custom fields
      if (company.custom_fields) {
        const activeFields = (company.custom_fields as CustomField[]).filter(f => f.active);
        setCustomFields(activeFields);
      }

      // Fetch Departments and Hosts safely via API (bypassing RLS for public users)
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
      } catch (err) {
        console.error("Error fetching hosts/departments", err);
      }

      setLoading(false);
    };

    fetchCompanyData();
  }, [companyId]);

  // Compute filtered hosts based on the search query
  const filteredDepartments = departments.map(dept => {
    const deptHosts = hosts.filter(h => 
      h.department_id === dept.id && 
      h.name.toLowerCase().includes(hostSearchQuery.toLowerCase())
    );
    return { ...dept, hosts: deptHosts };
  }).filter(dept => dept.hosts.length > 0);

  // --- OCR SCANNING LOGIC ---
  const handleImageCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);

    try {
      const compressedFile = await compressImage(file);
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      
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
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rules.requirePhoto && !selfieFile) {
      alert("A security photo is required by building management.");
      return;
    }

    if (rules.askHost && !newVisitor.host_id) {
      alert("Please select a valid host from the dropdown list.");
      return;
    }

    setIsSubmitting(true);
    let uploadedPhotoUrl = null;

    try {
      // 1. Upload Selfie to Cloudflare R2 if present
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
          throw new Error(uploadData.error || uploadData.message || "Backend rejected the photo for an unknown reason.");
        }
      }

      // Format the phone number
      let finalPhone = null;
      if (rules.askPhone && newVisitor.phone) {
        finalPhone = newVisitor.phone.startsWith('+') ? newVisitor.phone : `+${newVisitor.phone}`;
      }

      // 2. Insert Visitor Record
      const { error } = await supabase.from("visitors").insert([
        {
          company_id: companyId,
          name: newVisitor.name,
          phone: finalPhone,
          document_type: rules.askId ? newVisitor.doc_type : null,
          id_number: rules.askId ? newVisitor.id_number : null,
          host_id: rules.askHost && newVisitor.host_id ? newVisitor.host_id : null,
          host_name: rules.askHost && newVisitor.host_id ? hostSearchQuery : null, // Saves exact name string for guards
          purpose: rules.askPurpose ? newVisitor.purpose : null,
          vehicle_reg: rules.askVehicle ? newVisitor.vehicle_reg : null,
          status: "pending",
          photo_url: uploadedPhotoUrl,
          custom_data: customAnswers // Save custom answers
        }
      ]);

      if (error) throw error;

      setSubmitted(true);

    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to submit registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
          <p className="text-zinc-500 font-medium">Loading building rules...</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-900 bg-zinc-900 text-zinc-100 shadow-2xl text-center p-6">
          <AlertOctagon className="w-16 h-16 text-red-50 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-white mb-2">Check-in Unavailable</CardTitle>
          <CardDescription className="text-zinc-400 text-base">
            This building's self-registration system is currently offline or suspended. Please speak directly to the security guard at the gate.
          </CardDescription>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-zinc-200 shadow-xl text-center p-8 bg-white/90 backdrop-blur-sm">
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <CardTitle className="text-2xl font-black text-zinc-900 tracking-tight mb-2">Registration Sent!</CardTitle>
          <p className="text-zinc-500 font-medium leading-relaxed">
            Your details have been securely transmitted. <strong className="text-zinc-900">Please wait for the security guard to approve your entry.</strong>
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 p-4 py-8 flex items-center justify-center relative overflow-hidden">
      
      {/* Ambient Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] h-[300px] w-[300px] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[300px] w-[300px] rounded-full bg-amber-400/20 blur-[100px] pointer-events-none" />
      
      <Card className="w-full max-w-md shadow-2xl relative border-t-4 border-t-blue-600 bg-white/95 backdrop-blur-sm z-10">
        <CardHeader className="text-center pb-6">
          <CardDescription className="uppercase tracking-widest font-bold text-xs text-blue-600 mb-1">Welcome To</CardDescription>
          <CardTitle className="text-2xl font-black text-zinc-900 tracking-tight">{companyName}</CardTitle>
          <p className="text-sm text-zinc-500 mt-2">Please fill out this form to register your visit.</p>
        </CardHeader>
        
        <CardContent>
          {/* HIDDEN FILE INPUT FOR ID CARD */}
          <input 
            type="file" accept="image/*" capture="environment" 
            className="hidden" ref={fileInputRef} onChange={handleImageCapture} 
          />
          
          <Button 
            variant="outline" 
            type="button"
            className="w-full mb-6 border-dashed border-2 py-8 text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100 shadow-sm"
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
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-zinc-200" /></div>
            <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider"><span className="bg-white px-2 text-zinc-400">Or enter manually</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="mb-1 block font-semibold text-zinc-700">Full Name <span className="text-red-500">*</span></Label>
              <Input required value={newVisitor.name} onChange={(e) => setNewVisitor({...newVisitor, name: e.target.value})} placeholder="e.g. John Doe" className="h-12 bg-zinc-50" />
            </div>

            {/* DYNAMIC FIELD: PHONE WITH REACT-PHONE-INPUT-2 */}
            {rules.askPhone && (
              <div>
                <Label className="mb-1 block font-semibold text-zinc-700">Phone Number <span className="text-red-500">*</span></Label>
                <PhoneInput 
                  country="ke" 
                  value={newVisitor.phone} 
                  onChange={phone => setNewVisitor({ ...newVisitor, phone })} 
                  inputClass="!w-full !h-12 !text-zinc-900 !bg-zinc-50 !rounded-md !border !border-zinc-300 focus:!ring-2 focus:!ring-blue-600 px-3" 
                  containerClass="w-full" 
                  buttonClass="!border-zinc-300 !bg-zinc-50 !rounded-l-md hover:!bg-zinc-100"
                />
              </div>
            )}

            {/* DYNAMIC FIELDS: ID DOCUMENTS (SIDE-BY-SIDE GRID) */}
            {rules.askId && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block font-semibold text-zinc-700">Document Type</Label>
                  <select
                    className="flex h-12 w-full rounded-md border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                    value={newVisitor.doc_type}
                    onChange={(e) => setNewVisitor({...newVisitor, doc_type: e.target.value})}
                  >
                    <option value="National ID">National ID</option>
                    <option value="Passport">Passport</option>
                    <option value="Driver's License">Driver's License</option>
                  </select>
                </div>
                <div>
                  <Label className="mb-1 block font-semibold text-zinc-700">ID Number</Label>
                  <Input 
                    value={newVisitor.id_number} 
                    onChange={(e) => setNewVisitor({...newVisitor, id_number: e.target.value})} 
                    placeholder="If applicable" 
                    className="h-12 bg-zinc-50"
                  />
                </div>
              </div>
            )}

            {/* SEARCHABLE HOST DROPDOWN */}
            {rules.askHost && (
              <div className="relative" ref={dropdownRef}>
                <Label className="mb-1 block font-semibold text-zinc-700">Who are you visiting?</Label>
                <Input
                  type="text"
                  placeholder="Type to search for a host..."
                  value={hostSearchQuery}
                  onChange={(e) => {
                    setHostSearchQuery(e.target.value);
                    setIsHostDropdownOpen(true);
                    setNewVisitor({ ...newVisitor, host_id: "" }); // Reset ID if they type to enforce selecting from list
                  }}
                  onFocus={() => setIsHostDropdownOpen(true)}
                  className="h-12 bg-zinc-50"
                  autoComplete="off"
                />
                
                {/* Hidden input to enforce standard HTML required validation */}
                <input type="text" className="hidden" required value={newVisitor.host_id} onChange={() => {}} />

                {isHostDropdownOpen && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-zinc-200 rounded-md shadow-xl max-h-60 overflow-y-auto">
                    {filteredDepartments.length === 0 ? (
                      <div className="p-4 text-sm text-zinc-500 text-center">No matching hosts found.</div>
                    ) : (
                      filteredDepartments.map((dept) => (
                        <div key={dept.id}>
                          <div className="px-3 py-2 text-xs font-bold bg-zinc-100/80 text-zinc-500 uppercase tracking-wider sticky top-0 backdrop-blur-sm">
                            {dept.name}
                          </div>
                          {dept.hosts.map((host) => (
                            <div
                              key={host.id}
                              className="px-4 py-3 text-sm text-zinc-900 hover:bg-blue-50 cursor-pointer border-b border-zinc-50 last:border-0 transition-colors"
                              onClick={() => {
                                setNewVisitor({ ...newVisitor, host_id: host.id });
                                setHostSearchQuery(host.name);
                                setIsHostDropdownOpen(false);
                              }}
                            >
                              <div className="font-medium">{host.name}</div>
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {rules.askPurpose && (
              <div>
                <Label className="mb-1 block font-semibold text-zinc-700">Purpose of Visit</Label>
                <Input 
                  value={newVisitor.purpose} 
                  onChange={(e) => setNewVisitor({...newVisitor, purpose: e.target.value})} 
                  placeholder="e.g. Meeting, Delivery, Interview" 
                  className="h-12 bg-zinc-50"
                />
              </div>
            )}

            {rules.askVehicle && (
              <div>
                <Label className="mb-1 block font-semibold text-zinc-700">Vehicle Registration</Label>
                <Input 
                  value={newVisitor.vehicle_reg} 
                  onChange={(e) => setNewVisitor({...newVisitor, vehicle_reg: e.target.value})} 
                  placeholder="e.g. KCA 123A (Leave blank if walk-in)" 
                  className="h-12 bg-zinc-50 uppercase"
                />
              </div>
            )}

            {/* DYNAMIC CUSTOM FIELDS RENDERING */}
            {customFields.map((field) => (
              <div key={field.id}>
                <Label className="mb-1 block font-semibold text-zinc-700">{field.label}</Label>
                <Input 
                  value={customAnswers[field.id] || ""} 
                  onChange={(e) => setCustomAnswers({...customAnswers, [field.id]: e.target.value})} 
                  placeholder={`Enter ${field.label.toLowerCase()}`} 
                  className="h-12 bg-zinc-50"
                />
              </div>
            ))}

            {/* SECURITY PHOTO - ONLY VISIBLE IF ADMIN TOGGLED IT ON */}
            {rules.requirePhoto && (
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
                      type="button" variant="outline" className="w-full text-sm h-12 bg-white hover:bg-zinc-100 shadow-sm border-zinc-300 text-zinc-700 font-bold"
                      onClick={() => selfieInputRef.current?.click()}
                    >
                      <Camera className="w-5 h-5 mr-2" /> Take Selfie
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full mt-6 h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg transition-transform active:scale-[0.98]" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-5 w-5 animate-spin"/> Processing...</> : "Submit Registration"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}