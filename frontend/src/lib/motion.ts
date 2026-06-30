// =============================================================================
// Kairos One — Motion System
// Codified animation constants and reusable Framer Motion variants.
// Every animation uses spring physics for a physical, premium feel.
// =============================================================================

import type { Transition, Variants } from "framer-motion";

// -----------------------------------------------------------------------------
// Spring Configurations
// -----------------------------------------------------------------------------

export const SPRING: Record<string, Transition> = {
  default: { type: "spring", stiffness: 300, damping: 30 },
  bouncy: { type: "spring", stiffness: 400, damping: 25 },
  gentle: { type: "spring", stiffness: 200, damping: 35 },
  slow: { type: "spring", stiffness: 150, damping: 30 },
  snappy: { type: "spring", stiffness: 500, damping: 35 },
} as const;

// -----------------------------------------------------------------------------
// Timing
// -----------------------------------------------------------------------------

export const DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.6,
  pipeline: 0.8,
  recovery: 4.0,
} as const;

export const STAGGER = {
  cards: 0.08,
  pipeline: 0.8,
  recovery: 0.6,
  list: 0.05,
  fast: 0.04,
} as const;

// -----------------------------------------------------------------------------
// Reusable Variants
// -----------------------------------------------------------------------------

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

export const slideFromRight: Variants = {
  initial: { x: "100%", opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: "100%", opacity: 0 },
};

export const slideFromLeft: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -20, opacity: 0 },
};

export const slideFromBottom: Variants = {
  initial: { y: "100%", opacity: 0 },
  animate: { y: 0, opacity: 1 },
  exit: { y: "100%", opacity: 0 },
};

// Stagger container — children use fadeInUp
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: STAGGER.cards,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: STAGGER.fast,
      delayChildren: 0.05,
    },
  },
};

// Card hover — used with whileHover
export const cardHover = {
  scale: 1.02,
  transition: SPRING.default,
};

// Pulse for risk indicators
export const pulse: Variants = {
  animate: {
    scale: [1, 1.15, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

// Agent pipeline sequential activation
export const pipelineNode: Variants = {
  idle: { scale: 1, opacity: 0.4 },
  working: {
    scale: 1.05,
    opacity: 1,
    transition: SPRING.bouncy,
  },
  finished: {
    scale: 1,
    opacity: 1,
    transition: SPRING.default,
  },
  error: {
    scale: 1,
    opacity: 1,
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};

// Pipeline connector arrow lighting up
export const pipelineConnector: Variants = {
  inactive: { opacity: 0.2, scaleX: 1 },
  active: {
    opacity: 1,
    scaleX: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

// Recovery overlay sequence
export const recoveryOverlay: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
};

// Number counting spring
export const numberSpring: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 30,
  mass: 1,
};

