import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, QrCode, LayoutDashboard, Users, ArrowRight, CheckCircle2 } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 selection:bg-blue-100 selection:text-blue-900 font-sans overflow-hidden relative">
      
      {/* --- ENHANCED BACKGROUND --- */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-blue-400/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-zinc-400/20 blur-[100px] pointer-events-none" />
      {/* --------------------------- */}

      {/* --- NAVBAR --- */}
      <nav className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center max-w-7xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center shadow-md">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <span className="text-xl font-bold text-zinc-900 tracking-tight">VMS Global</span>
        </div>
        <div>
          <Link href="/login">
            <Button variant="outline" className="border-zinc-200 text-zinc-900 hover:bg-zinc-100 font-bold bg-white/50 backdrop-blur-sm shadow-sm h-10 px-6">
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="relative z-10 container mx-auto px-6 pt-16 md:pt-24 pb-32 text-center flex flex-col items-center max-w-7xl">
        
        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tight max-w-4xl leading-[1.1] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
          Modern Security for the <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-zinc-900">
            Modern Workspace
          </span>
        </h1>
        
        {/* Subtitle */}
        <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mb-10 font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 leading-relaxed">
          Streamline visitor check-ins, generate fast-track QR codes, and monitor building access in real-time with our enterprise-grade platform.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
          <a href="https://forms.google.com/" target="_blank" rel="noopener noreferrer">
            <Button className="h-14 px-8 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-0.5 active:scale-95 w-full sm:w-auto">
              Book a Demo <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
          <Link href="/login">
            <Button variant="outline" className="h-14 px-8 text-lg font-bold bg-white border-zinc-200 text-zinc-900 hover:bg-zinc-50 rounded-xl shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 active:scale-95 w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>

        {/* --- FEATURE GRID --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mt-24 text-left w-full animate-in fade-in slide-in-from-bottom-12 duration-700 delay-500">
          
          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 border border-blue-100">
              <QrCode className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Smart QR Check-In</h3>
            <p className="text-zinc-500 font-medium leading-relaxed mb-4">
              Allow visitors to register instantly using printable QR posters at your entry gates.
            </p>
            <ul className="space-y-2 text-sm font-semibold text-zinc-700">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500"/> Contactless entry</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500"/> SMS OTP checkout</li>
            </ul>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 border border-amber-100">
              <LayoutDashboard className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Live Guard Dashboard</h3>
            <p className="text-zinc-500 font-medium leading-relaxed mb-4">
              Equip your security team with real-time logs, OCR ID scanning, and instant alert verifications.
            </p>
            <ul className="space-y-2 text-sm font-semibold text-zinc-700">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500"/> Live visitor tracking</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-amber-500"/> ID Auto-fill scanning</li>
            </ul>
          </div>

          <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-emerald-100">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Multi-Role Access</h3>
            <p className="text-zinc-500 font-medium leading-relaxed mb-4">
              Dedicated workflows and granular permissions for Managers and Guards.
            </p>
            <ul className="space-y-2 text-sm font-semibold text-zinc-700">
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Role-based dashboards</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500"/> Secure billing module</li>
            </ul>
          </div>

        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 border-t border-zinc-200/60 bg-white/50 backdrop-blur-sm py-8">
        <div className="container mx-auto px-6 text-center text-sm font-semibold text-zinc-400 max-w-7xl">
          <p>&copy; {new Date().getFullYear()} VMS Global Security. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}