import { Transition, Variants } from "framer-motion";

/**
 * Common Spring Transition for smooth, physical-feeling movement
 */
export const springTransition: Transition = {
    type: "spring",
    stiffness: 300,
    damping: 30,
};

/**
 * Standard Fade In & Scale variants for containers
 */
export const containerVariants: Variants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: {
            duration: 0.2,
            staggerChildren: 0.05
        }
    },
    exit: {
        opacity: 0,
        scale: 0.95,
        transition: { duration: 0.15 }
    }
};

/**
 * Simple Fade In for items
 */
export const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: springTransition
    }
};

/**
 * Smart scroll utility - Forced for study area and scroll container
 */
export const smartScrollToTop = () => {
    // Use a small timeout to ensure the DOM has updated (e.g. after setFlashcards)
    setTimeout(() => {
        // First try to find the specific study area root
        const studyRoot = document.getElementById('study-area-root');
        if (studyRoot) {
            studyRoot.scrollIntoView({ behavior: 'smooth', block: 'start' });
            return;
        }

        // Fallback to the main scrollable container
        const mainScroll = document.getElementById('main-scroll-container');
        if (mainScroll) {
            mainScroll.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, 100);
};

/**
 * Sound utility (Placeholder for future use)
 */
export const playClickSound = () => {
    // Logic for audio feedback can be added here
    // const audio = new Audio('/sounds/click.mp3');
    // audio.play().catch(() => {});
};
