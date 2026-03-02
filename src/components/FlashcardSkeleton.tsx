"use client";

import { motion } from "framer-motion";

export default function FlashcardSkeleton() {
    return (
        <div
            className="w-full h-40 rounded-2xl bg-zinc-900/40 border border-white/5 relative overflow-hidden flex flex-col p-5 shadow-sm"
        >
            {/* Custom Shimmer Effect */}
            <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.08] to-transparent pointer-events-none" />

            <div className="flex-1 space-y-3">
                {/* Title Placeholder */}
                <div className="h-5 w-2/3 bg-zinc-800/80 rounded-md" />

                {/* Info Lines */}
                <div className="space-y-2 mt-4">
                    <div className="h-2.5 w-1/3 bg-zinc-800/40 rounded-md" />
                    <div className="h-2.5 w-1/4 bg-zinc-800/20 rounded-md" />
                </div>
            </div>

            <div className="mt-auto flex items-center justify-between pointer-events-none">
                {/* Category Badge Placeholder */}
                <div className="h-7 w-24 bg-zinc-800/60 rounded-full" />

                {/* Small indicator placeholder */}
                <div className="h-4 w-4 bg-zinc-800/40 rounded-sm opacity-50" />
            </div>
        </div>
    );
}
