import React from "react";
import Link from "next/link";
import { 
  QrCode, 
  LayoutDashboard, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  Lock, 
  Globe, 
  Zap,
  ShieldAlert,
  Building2,
  Bell,
  ShieldCheck
} from "lucide-react";
import SmartChatbot from "@/components/SmartChatbot";

// --- REUSABLE BUTTON COMPONENT ---
const Button = ({ children, variant = "primary", className = "", ...props }: any) => {
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50";
  const variants: Record<string, string> = {
    primary: "bg-zinc-900 text-white hover:bg-zinc-800 shadow-xl hover:shadow-zinc-900/20",
    outline: "bg-white/50 backdrop-blur-sm border border-zinc-200 text-zinc-900 hover:bg-zinc-100 shadow-sm"
  };
  return (
    <button className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`} {...props}>
      {children}
    </button>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 selection:bg-zinc-200 selection:text-zinc-900 font-sans overflow-hidden relative">
      
      {/* --- ENHANCED BACKGROUND --- */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-zinc-300/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-zinc-400/20 blur-[100px] pointer-events-none" />

      {/* --- NAVBAR (SIGN IN RESTORED) --- */}
      <nav className="relative z-50 container mx-auto px-6 py-6 flex justify-between items-center max-w-7xl">
        <div className="flex items-center">
          <span className="text-xl md:text-2xl font-black tracking-tighter text-zinc-900">matteh-vms</span>
        </div>
        <div>
          <Link href="/login">
            <Button variant="outline" className="h-10 px-6 rounded-xl text-sm">Sign In</Button>
          </Link>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <main className="relative z-10 container mx-auto px-6 pt-16 md:pt-24 pb-20 text-center flex flex-col items-center max-w-7xl">
        
        <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tight max-w-5xl leading-[1.05] mb-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
          Building Security that moves at the <span className="text-transparent bg-clip-text bg-gradient-to-r from-zinc-500 to-zinc-900">Speed of Business.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mb-10 font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150 leading-relaxed">
          The ultra-modern visitor management system designed for automated gates, secure workspaces, and high-traffic facilities. Ditch the paper logbook forever.
        </p>
        
        <div className="flex flex-col sm:flex-row justify-center items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300 w-full sm:w-auto">
          <a href="https://wa.me/254706123513?text=Hi,%20I'm%20interested%20in%20setting%20up%20matteh-vms%20for%20my%20building." target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
            <Button className="h-14 px-8 text-lg w-full rounded-xl">
              Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </a>
          <p className="text-xs font-semibold text-zinc-400 mt-2 sm:mt-0 sm:ml-4">No hardware required.<br/>Setup in 5 minutes.</p>
        </div>

        {/* --- COMPREHENSIVE FEATURE GRID --- */}
        <div id="features" className="mt-32 w-full">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black text-zinc-900 mb-4 tracking-tight">Everything you need to secure your gates.</h2>
            <p className="text-zinc-500 font-medium text-lg max-w-2xl mx-auto">A complete suite of tools built for building managers and security guards.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 text-left animate-in fade-in slide-in-from-bottom-12 duration-700 delay-500">
            
            {/* Feature 1 */}
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mb-6 border border-zinc-200">
                <QrCode className="w-6 h-6 text-zinc-900" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Smart QR Check-In</h3>
              <p className="text-zinc-500 font-medium leading-relaxed">
                Eliminate queues with self-service registration posters. Visitors scan, fill, and get verified in seconds on their own phones.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-zinc-900 p-8 rounded-3xl border border-zinc-800 shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center mb-6">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Live Guard Dashboard</h3>
              <p className="text-zinc-400 font-medium leading-relaxed">
                Real-time monitoring for guards with OCR ID scanning, instant blacklist alerts, and 1-click checkout tools.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mb-6 border border-zinc-200">
                <ShieldAlert className="w-6 h-6 text-zinc-900" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Automated Blacklisting</h3>
              <p className="text-zinc-500 font-medium leading-relaxed">
                Automatically cross-reference every visitor ID against your building's custom restricted list to block threats instantly.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mb-6 border border-zinc-200">
                <Bell className="w-6 h-6 text-zinc-900" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Instant Notifications</h3>
              <p className="text-zinc-500 font-medium leading-relaxed">
                Send automated SMS OTP codes to visitors and alert hosts immediately when their guests arrive at the reception.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mb-6 border border-zinc-200">
                <Users className="w-6 h-6 text-zinc-900" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Role-Based Access</h3>
              <p className="text-zinc-500 font-medium leading-relaxed">
                Granular permissions mean Building Managers see analytics and billing, while Guards only see the tools they need.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-white/80 backdrop-blur-md p-8 rounded-3xl border border-zinc-200/60 shadow-sm hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mb-6 border border-zinc-200">
                <Building2 className="w-6 h-6 text-zinc-900" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 mb-3">Multi-Gate Support</h3>
              <p className="text-zinc-500 font-medium leading-relaxed">
                Manage multiple entry points, parking booms, and pedestrian gates all from one centralized cloud dashboard.
              </p>
            </div>

          </div>
        </div>

        {/* --- WORKFLOW SECTION --- */}
        <section id="workflow" className="mt-32 w-full text-left">
          <div className="bg-zinc-900 rounded-[3rem] p-8 md:p-16 text-white overflow-hidden relative shadow-2xl border border-zinc-800">
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none"><Zap size={400} /></div>
            <div className="relative z-10 max-w-3xl">
              <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight">Automation that works for your team.</h2>
              <div className="space-y-12">
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-white text-zinc-900 flex items-center justify-center font-black text-xl shrink-0">1</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Visitor Self-Registers</h4>
                    <p className="text-zinc-400 font-medium leading-relaxed">Scanning the QR code at the gate opens the mobile registration form instantly. No apps to download. They input their ID and Host details.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xl shrink-0">2</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Automated Verification</h4>
                    <p className="text-zinc-400 font-medium leading-relaxed">The system runs the ID number against your building's restricted list automatically. Guards get an alert immediately if a match is found.</p>
                  </div>
                </div>
                <div className="flex gap-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-xl shrink-0">3</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2">Instant Gate Entry</h4>
                    <p className="text-zinc-400 font-medium leading-relaxed">Once the guard clicks "Approve", the visitor is logged and receives an SMS entry code or digital pass for automated gate scanning.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* --- SECURITY & UI MOCKUP SECTION --- */}
        <div id="security" className="mt-32 w-full grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <h2 className="text-4xl font-black text-zinc-900 mb-6 leading-tight">Data Integrity <br/> & Privacy First.</h2>
            <p className="text-lg text-zinc-500 mb-8 font-medium">We understand that visitor data is highly sensitive. matteh-vms is built from the ground up with enterprise-grade encryption and strict data privacy protocols.</p>
            <div className="space-y-4">
              <div className="flex items-center gap-4 font-bold text-zinc-800 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="bg-zinc-100 p-2 rounded-lg"><Lock className="text-zinc-900 w-5 h-5" /></div> 
                AES-256 End-to-End Encryption
              </div>
              <div className="flex items-center gap-4 font-bold text-zinc-800 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="bg-zinc-100 p-2 rounded-lg"><Globe className="text-zinc-900 w-5 h-5" /></div> 
                Local Data Sovereignty Compliance
              </div>
              <div className="flex items-center gap-4 font-bold text-zinc-800 bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-zinc-200 shadow-sm">
                <div className="bg-zinc-100 p-2 rounded-lg"><ShieldAlert className="text-zinc-900 w-5 h-5" /></div> 
                Daily Automated Security Backups
              </div>
            </div>
          </div>
          
          {/* Dashboard CSS Mockup */}
          <div className="relative group perspective-[1000px]">
             <div className="absolute inset-0 bg-zinc-400 rounded-[2.5rem] blur-3xl opacity-10 transition-opacity"></div>
             <div className="relative bg-white border border-zinc-200 p-8 rounded-[2.5rem] shadow-2xl overflow-hidden transform transition-transform duration-500 hover:rotate-y-2 hover:scale-[1.02]">
                {/* Mock Browser Header */}
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-zinc-100">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                    <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  </div>
                  <div className="text-xs font-black text-zinc-400 uppercase tracking-widest">Live Guard Dashboard</div>
                </div>
                
                {/* Mock Content */}
                <div className="space-y-4">
                   <div className="flex justify-between items-end mb-6">
                     <div className="space-y-2 w-1/2">
                       <div className="h-4 bg-zinc-100 rounded-full w-full"></div>
                       <div className="h-4 bg-zinc-100 rounded-full w-2/3"></div>
                     </div>
                     <div className="h-8 w-24 bg-zinc-900 rounded-lg"></div>
                   </div>

                   {/* Mock Visitor Card */}
                   <div className="h-20 bg-zinc-50 rounded-2xl border border-zinc-200 flex items-center justify-between px-6 hover:border-zinc-300 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-200 animate-pulse"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-zinc-300 rounded-full w-24"></div>
                          <div className="h-2 bg-zinc-200 rounded-full w-16"></div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Approved
                      </div>
                   </div>
                   
                   {/* Mock Pending Card */}
                   <div className="h-20 bg-white rounded-2xl border border-zinc-100 flex items-center justify-between px-6 opacity-50">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-zinc-100"></div>
                        <div className="space-y-2">
                          <div className="h-3 bg-zinc-200 rounded-full w-32"></div>
                          <div className="h-2 bg-zinc-100 rounded-full w-20"></div>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-full uppercase tracking-wider border border-amber-100">
                        Pending
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* --- FINAL CTA SECTION --- */}
        <div className="mt-32 w-full bg-zinc-900 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
           <div className="absolute top-[-50%] left-[50%] -translate-x-1/2 w-full h-full bg-zinc-800 rounded-[100%] blur-[120px] pointer-events-none"></div>
           <div className="relative z-10">
             <h2 className="text-4xl md:text-5xl font-black text-white mb-6">Ready to upgrade your building's security?</h2>
             <p className="text-zinc-400 font-medium text-lg mb-10 max-w-2xl mx-auto">Join the hundreds of modern facilities that have permanently replaced their paper logbooks with matteh-vms.</p>
             <a href="https://wa.me/254706123513?text=Hi,%20I'd%20like%20to%20start%20my%20free%20trial." target="_blank" rel="noopener noreferrer">
                <Button className="h-14 px-10 text-lg bg-white text-zinc-900 hover:bg-zinc-100 shadow-xl rounded-xl">
                  Start Your Free Trial
                </Button>
             </a>
           </div>
        </div>

      </main>

      {/* --- FOOTER --- */}
      <footer className="relative z-10 border-t border-zinc-200/60 bg-white py-12 mt-12">
        <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6 text-center md:text-left">
          <div className="flex items-center">
            <span className="text-xl font-black tracking-tighter text-zinc-900">matteh-vms</span>
          </div>
          <div className="flex gap-6 text-sm font-bold text-zinc-400">
            <a href="#" className="hover:text-zinc-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-zinc-900 transition-colors">Support</a>
          </div>
          <p className="text-sm font-semibold text-zinc-400">
            &copy; {new Date().getFullYear()} matteh-vms. All rights reserved.
          </p>
        </div>
      </footer>

      {/* --- INJECT CHATBOT COMPONENT --- */}
      <SmartChatbot />

    </div>
  );
}