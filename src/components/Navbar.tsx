"use client";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import UserDropdown from "./UserDropdown";
import { Profile } from "@/types/flashcard";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export default function Navbar() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        setProfile(data);
      } else {
        setProfile(null);
      }
    };

    fetchProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile();
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

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
          {profile?.role === "admin" && (
            <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse">
              ADMIN
            </span>
          )}
        </Link>

        <div className="flex items-center gap-4">
          <UserDropdown />
        </div>
      </div>
    </nav>
  );
}
