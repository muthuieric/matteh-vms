"use client";

import React, { useState, useEffect, useRef } from "react";
import { MessageSquare, X, Send } from "lucide-react";

export default function SmartChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! 👋 I'm the matteh-vms assistant. Ask me about pricing, how it works, type 'register' to get started, or type 'support' to report an issue.", sender: "bot" }
  ]);
  const [inputValue, setInputValue] = useState("");
  
  // Advanced State Machine for Routing
  const [flowState, setFlowState] = useState<
    "idle" | 
    "awaiting_problem_company" | 
    "awaiting_problem_desc" |
    "awaiting_reg_name" |
    "awaiting_reg_company" |
    "awaiting_reg_location" |
    "awaiting_reg_industry"
  >("idle");
  
  const [tempData, setTempData] = useState({ 
    name: "", 
    company: "", 
    location: "", 
    industry: "", 
    problem: "" 
  });
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;

    // Add User Message immediately
    setMessages(prev => [...prev, { id: Date.now(), text, sender: "user" }]);
    setInputValue("");

    // Simulate thinking delay
    setTimeout(() => {
      
      // ==========================================
      // FLOW 1: SUPPORT TICKET (High Priority)
      // ==========================================
      if (flowState === "awaiting_problem_company") {
        setTempData(prev => ({ ...prev, company: text }));
        setFlowState("awaiting_problem_desc");
        setMessages(prev => [...prev, { id: Date.now(), text: "Thanks. Now, please describe the exact issue or problem you are facing.", sender: "bot" }]);
        return;
      }

      if (flowState === "awaiting_problem_desc") {
        const problem = text;
        setFlowState("idle"); // Reset flow
        
        const waText = encodeURIComponent(`*Support Ticket*\nCompany: ${tempData.company}\nIssue: ${problem}`);
        const waLink = `https://wa.me/254706123513?text=${waText}`;
        
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "I've drafted your support ticket. Click the button below to send it directly to our technical team on WhatsApp so we can resolve this immediately.", 
          sender: "bot",
          action: { label: "Send Ticket to Support", url: waLink }
        }]);
        setTempData({ name: "", company: "", location: "", industry: "", problem: "" });
        return;
      }

      // ==========================================
      // FLOW 2: REGISTRATION & SALES QUALIFICATION
      // ==========================================
      if (flowState === "awaiting_reg_name") {
        setTempData(prev => ({ ...prev, name: text }));
        setFlowState("awaiting_reg_company");
        setMessages(prev => [...prev, { id: Date.now(), text: `Nice to meet you, ${text}! What is the name of your Company or Building?`, sender: "bot" }]);
        return;
      }

      if (flowState === "awaiting_reg_company") {
        setTempData(prev => ({ ...prev, company: text }));
        setFlowState("awaiting_reg_location");
        setMessages(prev => [...prev, { id: Date.now(), text: "Got it. Where is your company located?", sender: "bot" }]);
        return;
      }

      if (flowState === "awaiting_reg_location") {
        setTempData(prev => ({ ...prev, location: text }));
        setFlowState("awaiting_reg_industry");
        setMessages(prev => [...prev, { id: Date.now(), text: "And finally, what does your company do? (e.g., Commercial Real Estate, Tech Hub, School)", sender: "bot" }]);
        return;
      }

      if (flowState === "awaiting_reg_industry") {
        const industry = text;
        setFlowState("idle"); // Reset flow
        
        const waText = encodeURIComponent(`*New Client Registration Request*\nName: ${tempData.name}\nCompany: ${tempData.company}\nLocation: ${tempData.location}\nIndustry: ${industry}\n\n*Note:* Client completed the chatbot intake. Let's get them set up!`);
        const waLink = `https://wa.me/254706123513?text=${waText}`;
        
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "Perfect! I have all your details. Click the button below to connect directly with our sales team on WhatsApp to finalize your registration.", 
          sender: "bot",
          action: { label: "Chat with Sales", url: waLink }
        }]);
        setTempData({ name: "", company: "", location: "", industry: "", problem: "" });
        return;
      }

      // ==========================================
      // FLOW 3: IDLE KEYWORD RECOGNITION & FALLBACK
      // ==========================================
      const lowerInput = text.toLowerCase();
      
      // Catch Greetings first
      if (lowerInput.match(/\b(hi|hello|hey|hii|heya|greetings)\b/)) {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "Hello! 👋 How can I help you today? You can ask me about pricing, how the system works, or type 'register' to get started.", 
          sender: "bot" 
        }]);
      }
      else if (lowerInput.includes("support") || lowerInput.includes("problem") || lowerInput.includes("issue") || lowerInput.includes("ticket") || lowerInput.includes("help") || lowerInput.includes("error")) {
        setFlowState("awaiting_problem_company");
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "I'm sorry to hear you're experiencing an issue. Let's create a support ticket for you. First, what is your Company or Building Name?", 
          sender: "bot" 
        }]);
      }
      else if (lowerInput.includes("pric") || lowerInput.includes("cost") || lowerInput.includes("pay") || lowerInput.includes("plan") || lowerInput.includes("subscription")) {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "Our pricing uses a flexible **Per-Visitor Model**. You only pay for the exact volume of people entering your facility. Base features include unlimited guards and gates. Type 'Register' to start setting up your account and get a custom quote!", 
          sender: "bot"
        }]);
      } 
      else if (lowerInput.includes("how") || lowerInput.includes("work") || lowerInput.includes("feature") || lowerInput.includes("detail") || lowerInput.includes("about")) {
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "matteh-vms can do it all! Visitors self-register via QR code, the system checks blacklists automatically, and guards use a live dashboard for instant approvals. Zero hardware required.", 
          sender: "bot" 
        }]);
      } 
      else if (lowerInput.includes("register") || lowerInput.includes("buy") || lowerInput.includes("trial") || lowerInput.includes("sales") || lowerInput.includes("start")) {
        setFlowState("awaiting_reg_name");
        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "Let's get your building secured! To start the setup process, what is your Name?", 
          sender: "bot"
        }]);
      } 
      // FALLBACK: WhatsApp Routing for unknown questions
      else {
        const waText = encodeURIComponent(`Hi, I have a question from the website: "${text}"`);
        const waLink = `https://wa.me/254706123513?text=${waText}`;

        setMessages(prev => [...prev, { 
          id: Date.now(), 
          text: "I'm just a simple bot and I'm not sure how to answer that! Please click the button below to ask our team directly on WhatsApp.", 
          sender: "bot",
          action: { label: "Ask on WhatsApp", url: waLink }
        }]);
      }

    }, 600);
  };

  const quickActions = [
    { label: "Report a Problem", text: "I need support for a problem" },
    { label: "Check Pricing", text: "Tell me about pricing" },
    { label: "Register Account", text: "I want to register an account" }
  ];

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      {isOpen && (
        <div className="w-[320px] sm:w-[380px] h-[500px] bg-white border border-zinc-200 shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-[2rem] flex flex-col overflow-hidden mb-4 animate-in slide-in-from-bottom-5 duration-300">
          
          {/* Chat Header */}
          <div className="bg-zinc-900 p-5 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center font-black tracking-tighter text-xs shrink-0">
                m-vms
              </div>
              <div>
                <h3 className="font-bold text-sm">matteh-vms Assistant</h3>
                <p className="text-[11px] text-zinc-400">Usually replies instantly</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-zinc-50">
            {messages.map((msg: any) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] flex flex-col gap-2 ${msg.sender === "user" ? "items-end" : "items-start"}`}>
                  <div className={`p-3.5 rounded-2xl text-sm font-medium leading-relaxed shadow-sm ${
                    msg.sender === "user" 
                    ? "bg-zinc-900 text-white rounded-br-sm" 
                    : "bg-white border border-zinc-200 text-zinc-800 rounded-bl-sm"
                  }`}>
                    <span dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                  </div>
                  {msg.action && (
                    <a 
                      href={msg.action.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-[#25D366] text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md hover:scale-105 transition-transform active:scale-95 inline-flex items-center gap-1.5"
                    >
                      <MessageSquare size={14} fill="white" /> {msg.action.label}
                    </a>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-white border-t border-zinc-100">
            {/* Quick Actions (Only show if bot is idle) */}
            {flowState === "idle" && (
              <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
                {quickActions.map((action, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setInputValue(action.text);
                      handleSendMessage({ preventDefault: () => {} } as any);
                    }}
                    className="whitespace-nowrap px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold rounded-full transition-colors border border-zinc-200"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}

            <form onSubmit={handleSendMessage} className="relative">
              <input 
                type="text" 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your reply..." 
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-3 pl-4 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-zinc-900"
              />
              <button type="submit" disabled={!inputValue.trim()} className="absolute right-1.5 top-1.5 p-1.5 bg-zinc-900 text-white rounded-lg hover:bg-zinc-700 disabled:opacity-50 transition-colors">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 ${
          isOpen ? "bg-zinc-800 rotate-90" : "bg-zinc-900"
        }`}
      >
        {isOpen ? (
          <X className="text-white w-6 h-6" />
        ) : (
          <MessageSquare className="text-white w-6 h-6" />
        )}
      </button>

      {/* Tailwind utility to hide scrollbars cleanly */}
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}