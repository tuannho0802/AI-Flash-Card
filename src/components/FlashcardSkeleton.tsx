"use client";

import { motion } from "framer-motion";

export default function FlashcardSkeleton() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Match exactly h-64 (256px) from FlashcardCard.tsx
            className="w-full h-64 rounded-2xl bg-zinc-900/40 border border-white/5 relative overflow-hidden flex flex-col p-6 shadow-xl"
        >
            {/* Subtle Shimmer Effect - Softened gradient and slower animation */}
            <div className="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />

            <div className="flex-1 flex flex-col justify-center items-center text-center space-y-4">
                {/* Placeholder for Front Text */}
                <div className="h-6 w-3/4 bg-zinc-800/50 rounded-lg" />
                <div className="h-6 w-1/2 bg-zinc-800/30 rounded-lg" />
            </div>

            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                {/* Category Badge Placeholder */}
                <div className="h-6 w-20 bg-zinc-800/60 rounded-full" />
                {/* Detail text placeholder */}
                <div className="h-3 w-24 bg-zinc-800/40 rounded-md" />
            </div>
        </motion.div>
    );
}
