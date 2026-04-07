"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, Camera, CheckCircle2, AlertCircle, Users, Briefcase, Car, Plus, Trash2, ListPlus } from "lucide-react";

type CustomField = {
  id: string;
  label: string;
  active: boolean;
};

export default function BuildingRulesPage() {
  const [companyId, setCompanyId] = useState("");
  
  // Standard Rule States
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [askHost, setAskHost] = useState(false);
  const [askPurpose, setAskPurpose] = useState(false);
  const [askVehicle, setAskVehicle] = useState(false);
  
  // Custom Form Fields State
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldName, setNewFieldName] = useState("");

  const [updatingRules, setUpdatingRules] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error", text: string } | null>(null);

  useEffect(() => {
    const fetchRules = async () => {
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_id")
          .eq("id", authData.user.id)
          .single();
          
        if (profile?.company_id) {
          setCompanyId(profile.company_id);

          const { data: company } = await supabase
            .from("companies")
            .select("require_photo, ask_host, ask_purpose, ask_vehicle, custom_fields")
            .eq("id", profile.company_id)
            .single();
            
          if (company) {
            setRequirePhoto(company.require_photo || false);
            setAskHost(company.ask_host || false);
            setAskPurpose(company.ask_purpose || false);
            setAskVehicle(company.ask_vehicle || false);
            setCustomFields(company.custom_fields || []);
          }
        }
      }
    };
    fetchRules();
  }, []);

  // --- STANDARD RULES TOGGLE HANDLER ---
  const handleToggleRule = async (field: string, checked: boolean, setter: (val: boolean) => void) => {
    setter(checked);
    setUpdatingRules(true);
    setMessage(null);

    const { error } = await supabase.from("companies").update({ [field]: checked }).eq("id", companyId);

    if (error) {
      setMessage({ type: "error", text: `Failed to update the rule.` });
      setter(!checked); // Revert UI
    } else {
      setMessage({ type: "success", text: "Rules auto-saved successfully!" });
      setTimeout(() => setMessage(null), 3000);
    }
    setUpdatingRules(false);
  };

  // --- CUSTOM FIELDS HANDLERS ---
  const saveCustomFields = async (updatedFields: CustomField[]) => {
    setUpdatingRules(true);
    setMessage(null);
    const { error } = await supabase.from("companies").update({ custom_fields: updatedFields }).eq("id", companyId);
    
    if (error) {
      setMessage({ type: "error", text: `Failed to save custom fields.` });
    } else {
      setMessage({ type: "success", text: "Custom fields updated!" });
      setTimeout(() => setMessage(null), 3000);
    }
    setUpdatingRules(false);
  };

  const handleAddCustomField = async () => {
    if (!newFieldName.trim()) return;
    
    const newField: CustomField = {
      id: Date.now().toString(),
      label: newFieldName.trim(),
      active: true,
    };
    
    const updatedFields = [...customFields, newField];
    setCustomFields(updatedFields);
    setNewFieldName("");
    await saveCustomFields(updatedFields);
  };

  const handleToggleCustomField = async (id: string, active: boolean) => {
    const updatedFields = customFields.map(field => 
      field.id === id ? { ...field, active } : field
    );
    setCustomFields(updatedFields);
    await saveCustomFields(updatedFields);
  };

  const handleDeleteCustomField = async (id: string) => {
    const updatedFields = customFields.filter(field => field.id !== id);
    setCustomFields(updatedFields);
    await saveCustomFields(updatedFields);
  };

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header Section */}
        <div className="border-b border-zinc-200 pb-4 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-900">Building Rules & Forms</h1>
            <p className="text-zinc-500 mt-1 text-sm md:text-base">Customize the questions visitors are asked at the gate.</p>
          </div>
          {updatingRules && (
            <div className="flex items-center text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full animate-pulse border border-blue-100">
              <Loader2 className="w-4 h-4 mr-2 animate-spin"/> Saving changes...
            </div>
          )}
        </div>

        {message && !updatingRules && (
          <div className={`p-4 rounded-xl text-sm font-medium border flex items-start gap-3 animate-in fade-in shadow-sm ${
            message.type === 'success' ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0 text-green-600 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />}
            <div>
              <p className="font-bold">{message.type === 'success' ? 'Success' : 'Action Failed'}</p>
              <p className="mt-0.5">{message.text}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* STANDARD RULES */}
          <Card className="shadow-sm border-0 border-t-4 border-t-blue-600 bg-white h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center">
                <ShieldCheck className="mr-2 h-5 w-5 text-blue-600" /> Standard Questions
              </CardTitle>
              <CardDescription className="text-sm">Built-in fields you can quickly enable or disable.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              
              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200 transition-colors shadow-sm hover:shadow-md">
                <div className="space-y-1 pr-4">
                  <Label className="text-base font-bold flex items-center gap-2 cursor-pointer text-zinc-900" htmlFor="host-toggle">
                    <Users className="w-4 h-4 text-zinc-500"/> Host Name
                  </Label>
                  <p className="text-sm text-zinc-500 leading-snug">Ask visitors who they are here to see.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input id="host-toggle" type="checkbox" className="sr-only peer" checked={askHost} onChange={(e) => handleToggleRule("ask_host", e.target.checked, setAskHost)} disabled={updatingRules} />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200 transition-colors shadow-sm hover:shadow-md">
                <div className="space-y-1 pr-4">
                  <Label className="text-base font-bold flex items-center gap-2 cursor-pointer text-zinc-900" htmlFor="purpose-toggle">
                    <Briefcase className="w-4 h-4 text-zinc-500"/> Purpose of Visit
                  </Label>
                  <p className="text-sm text-zinc-500 leading-snug">Log the reason for the visitor's entry.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input id="purpose-toggle" type="checkbox" className="sr-only peer" checked={askPurpose} onChange={(e) => handleToggleRule("ask_purpose", e.target.checked, setAskPurpose)} disabled={updatingRules} />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200 transition-colors shadow-sm hover:shadow-md">
                <div className="space-y-1 pr-4">
                  <Label className="text-base font-bold flex items-center gap-2 cursor-pointer text-zinc-900" htmlFor="vehicle-toggle">
                    <Car className="w-4 h-4 text-zinc-500"/> Vehicle Reg
                  </Label>
                  <p className="text-sm text-zinc-500 leading-snug">Log the license plate if driving.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input id="vehicle-toggle" type="checkbox" className="sr-only peer" checked={askVehicle} onChange={(e) => handleToggleRule("ask_vehicle", e.target.checked, setAskVehicle)} disabled={updatingRules} />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200 transition-colors shadow-sm hover:shadow-md">
                <div className="space-y-1 pr-4">
                  <Label className="text-base font-bold flex items-center gap-2 cursor-pointer text-zinc-900" htmlFor="photo-toggle">
                    <Camera className="w-4 h-4 text-zinc-500"/> Require Photo
                  </Label>
                  <p className="text-sm text-zinc-500 leading-snug">Guards must capture a selfie before entry.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input id="photo-toggle" type="checkbox" className="sr-only peer" checked={requirePhoto} onChange={(e) => handleToggleRule("require_photo", e.target.checked, setRequirePhoto)} disabled={updatingRules} />
                  <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
            </CardContent>
          </Card>

          {/* CUSTOM FORM BUILDER */}
          <Card className="shadow-sm border-0 border-t-4 border-t-amber-500 bg-white h-fit">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg font-bold">
                <ListPlus className="mr-2 h-5 w-5 text-amber-500" /> Custom Form Builder
              </CardTitle>
              <CardDescription className="text-sm">Create unique questions (e.g. "Laptop Serial No", "Temperature").</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="flex gap-2">
                <Input 
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Enter new field name..." 
                  className="flex-1 bg-zinc-50 h-11"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomField()}
                />
                <Button onClick={handleAddCustomField} disabled={!newFieldName.trim() || updatingRules} className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 h-11">
                  <Plus className="w-4 h-4 mr-2" /> Add Field
                </Button>
              </div>

              <div className="space-y-3 mt-4">
                {customFields.length === 0 ? (
                  <div className="text-center p-6 border-2 border-dashed border-zinc-200 rounded-xl text-zinc-400 text-sm">
                    No custom fields created yet.
                  </div>
                ) : (
                  customFields.map((field) => (
                    <div key={field.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-xl border border-zinc-200 shadow-sm">
                      <span className="font-semibold text-base text-zinc-800">{field.label}</span>
                      
                      <div className="flex items-center gap-4">
                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                          <input 
                            type="checkbox" className="sr-only peer" 
                            checked={field.active} 
                            onChange={(e) => handleToggleCustomField(field.id, e.target.checked)} 
                            disabled={updatingRules}
                          />
                          <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                        </label>
                        
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleDeleteCustomField(field.id)}
                          disabled={updatingRules}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}