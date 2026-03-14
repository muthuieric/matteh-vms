import Link from "next/link";
import { ShieldCheck, QrCode, Smartphone, Lock, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col font-sans">
      
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between p-6 md:px-12 bg-white border-b border-zinc-200 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-extrabold text-zinc-900 tracking-tight">VMS Global</span>
        </div>
        <div>
          <Link href="/login">
            <Button variant="outline" className="font-bold border-zinc-300 text-zinc-700 hover:bg-zinc-100">
              Sign In
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative py-20 md:py-32 overflow-hidden">
          <div className="max-w-6xl mx-auto px-6 text-center space-y-8 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-semibold mb-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
              Next-Generation Gate Security
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-zinc-900 tracking-tight max-w-4xl mx-auto leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
              Modernize your building's <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">visitor experience.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto font-medium animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
              Ditch the paper logbooks. VMS Global offers lightning-fast QR check-ins, AI-powered ID scanning, and real-time security dashboards for modern enterprises.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
              <Link href="/login">
                <Button className="h-14 px-8 text-lg bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-full shadow-lg shadow-blue-600/20 w-full sm:w-auto">
                  Access Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Button variant="outline" className="h-14 px-8 text-lg font-bold rounded-full w-full sm:w-auto border-zinc-300 text-zinc-700 hover:bg-zinc-100">
                Book a Demo
              </Button>
            </div>
          </div>
          
          {/* Decorative background elements */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-50 rounded-full blur-3xl -z-10 opacity-50"></div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-white border-t border-zinc-100">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-zinc-900">Enterprise-Grade Security Features</h2>
              <p className="text-zinc-500 mt-4">Everything you need to secure your premises and delight your guests.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-6">
                  <QrCode className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">QR Fast-Track</h3>
                <p className="text-zinc-600 leading-relaxed">
                  Visitors scan a poster at the gate to register on their own phones, completely eliminating desk queues and shared tablets.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-6">
                  <Smartphone className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">AI ID Scanning</h3>
                <p className="text-zinc-600 leading-relaxed">
                  Guests simply snap a picture of their National ID or Passport. Our AI instantly reads and auto-fills their details flawlessly.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="bg-zinc-50 p-8 rounded-2xl border border-zinc-100 hover:shadow-md transition-shadow">
                <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-6">
                  <Lock className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-3">Security Selfies</h3>
                <p className="text-zinc-600 leading-relaxed">
                  Mandate security photos for entry. Images are securely stored in the cloud and automatically permanently deleted after 7 days.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-zinc-900 text-center px-6">
          <div className="max-w-3xl mx-auto space-y-8">
            <Building2 className="h-16 w-16 text-blue-500 mx-auto" />
            <h2 className="text-4xl font-bold text-white">Ready to secure your building?</h2>
            <p className="text-xl text-zinc-400">
              Join top companies using VMS Global to streamline their front desk operations.
            </p>
            <Link href="/login">
              <Button className="h-14 px-10 text-lg bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full mt-4">
                Get Started Today
              </Button>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-zinc-950 text-zinc-500 py-8 text-center border-t border-zinc-800">
        <p className="text-sm">
          &copy; {new Date().getFullYear()} VMS Global Secure Entry. All rights reserved.
        </p>
      </footer>
    </div>
  );
}