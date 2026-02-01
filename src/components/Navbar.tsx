"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import UserDropdown from "./UserDropdown";

export default function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50">
      <div className="max-w-5xl mx-auto px-4 h-full flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 group"
        >
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center text-white group-hover:scale-105 transition-transform">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-bold text-lg tracking-tight">
            AI Flashcards
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <UserDropdown />
        </div>
      </div>
    </nav>
  );
}
