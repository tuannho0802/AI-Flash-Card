"use client";
import {
  useEffect,
  useState,
  useRef,
} from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  LogOut,
  User as UserIcon,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  motion,
  AnimatePresence,
} from "framer-motion";

export default function UserDropdown() {
  const [user, setUser] = useState<User | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef =
    useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent,
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node,
        )
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener(
      "mousedown",
      handleClickOutside,
    );
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsOpen(false);
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse flex items-center justify-center">
        <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="px-4 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
      >
        Sign In
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md hover:shadow-lg transition-shadow"
      >
        {user.user_metadata.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.user_metadata.avatar_url}
            alt="Avatar"
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-sm font-bold">
            {user.email?.[0].toUpperCase()}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{
              opacity: 0,
              y: 10,
              scale: 0.95,
            }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
            }}
            exit={{
              opacity: 0,
              y: 10,
              scale: 0.95,
            }}
            transition={{ duration: 0.1 }}
            className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50"
          >
            <div className="p-4 border-b border-gray-100">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.user_metadata.full_name ||
                  "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user.email}
              </p>
            </div>

            <div className="p-1">
              <Link
                href="/profile"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <UserIcon className="w-4 h-4" />
                Profile & Stats
              </Link>

              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors mt-1"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
