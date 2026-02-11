// JITAI Variant 3: Adaptive Smartphone Overuse JITAI with Human-AI Loop
// Barrel export for the JITAI module

export type {
  UsageEpisode,
  AppCategory,
  UsageContext,
  UsagePattern,
  ContextFeatures,
  InterventionLevel,
  Intervention,
  InterventionFeedback,
  InterventionOutcome,
  BanditArm,
  AdaptationState,
} from "./types";

export {
  simulateUsageEpisode,
  simulateDayHistory,
  analyzeUsagePattern,
  detectAnomalousUsage,
  computeDailySummary,
} from "./usageDetector";

export {
  extractFeatures,
  classifyContext,
  classifyEpisodes,
  updateWeightsFromFeedback,
} from "./contextClassifier";

export {
  selectIntervention,
  initializeAdaptation,
  updateAdaptation,
  getArmEstimates,
} from "./interventionEngine";

export {
  processFeedback,
  generateFeedbackPrompt,
  computeAdaptationMetrics,
  generateAdaptationSummary,
} from "./humanFeedbackLoop";
