import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center font-sans relative overflow-hidden selection:bg-zinc-200 selection:text-zinc-900">
      
      {/* Background Elements to match the main theme */}
      <div className="absolute inset-0 z-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-[20%] left-[20%] h-[400px] w-[400px] rounded-full bg-zinc-300/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] h-[400px] w-[400px] rounded-full bg-red-400/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 text-center px-6">
        {/* Animated Security Icon */}
        <div className="relative inline-block mb-8">
          <div className="absolute inset-0 bg-red-100 rounded-full blur-xl animate-pulse"></div>
          <div className="relative bg-white p-6 rounded-[2rem] border border-zinc-200 shadow-xl">
            <ShieldAlert className="w-16 h-16 text-zinc-900" />
          </div>
        </div>

        {/* 404 Typography */}
        <h1 className="text-7xl md:text-9xl font-black text-zinc-900 tracking-tight mb-2 leading-none">
          404
        </h1>
        <h2 className="text-2xl md:text-3xl font-bold text-zinc-800 mb-6 tracking-tight">
          Gate Not Found
        </h2>
        
        <p className="text-lg text-zinc-500 font-medium max-w-md mx-auto mb-10 leading-relaxed">
          The page you are looking for has been moved, deleted, or you don't have the proper clearance to access this sector.
        </p>

        {/* Return Button */}
        <Link href="/">
          <button className="bg-zinc-900 text-white px-8 py-4 rounded-xl font-bold hover:bg-zinc-800 transition-all active:scale-95 shadow-xl hover:shadow-zinc-900/20 inline-flex items-center gap-3">
            <ArrowLeft className="w-5 h-5" /> Return to Base
          </button>
        </Link>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-0 w-full text-center z-10">
        <span className="text-sm font-black tracking-tighter text-zinc-300">matteh-vms security</span>
      </div>
    </div>
  );
}