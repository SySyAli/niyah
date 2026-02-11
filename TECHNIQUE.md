# Technique: Adaptive Smartphone Overuse JITAI with Human-AI Loop

## Research Origin

**Domain**: Human-in-the-Loop AI for Smartphone Addiction Interventions  
**Key Papers**:

- Shin & Dey (2023) — "Beyond Screen Time: Contextual Just-In-Time Adaptive Interventions for Smartphone Overuse"
- Okeke et al. (2018) — "Good Vibrations: Can a Digital Nudge Reduce Digital Technology Overuse?"
- Mishra et al. (2021) — "Detecting Smartphone Use During Driving Using Smartwatch Sensors"

## Technique Summary

This variant implements an **adaptive phone usage detection system** combined with a **human-AI feedback loop** that learns when interventions help vs. annoy. The core insight is that not all phone pickups are problematic — context determines whether usage is compulsive or intentional. The human-in-the-loop component lets users correct the AI's context judgments, creating a personalized model.

### Key Components

1. **Usage Pattern Detector**: Monitors phone pickup frequency, session duration, app category, and time-of-day patterns to identify compulsive vs. intentional usage episodes. Uses a sliding window analysis.

2. **Context Classifier**: Classifies the current usage context (work break, social, commute, boredom, habit loop) using temporal and behavioral features. This determines whether intervention is appropriate.

3. **Intervention Delivery Engine**: Delivers graduated interventions (awareness nudge → friction → lock) based on usage severity and context. Respects "do not disturb" periods.

4. **Human Feedback Collector**: After each intervention, collects lightweight feedback ("Was this helpful?") that updates the context classifier. This is the "human-in-the-loop" — the AI proposes, the human corrects, and the model adapts.

5. **Adaptation Engine**: Thompson Sampling-based policy that balances exploration (trying new intervention strategies) with exploitation (using what works for this user).

## Integration with NIYA

- **Usage awareness**: Shows users their phone pickup patterns and how they correlate with focus session outcomes
- **Smart blocking**: During active sessions, uses context-aware blocking instead of blanket blocking — allows intentional use (e.g., looking up a recipe) while blocking compulsive patterns
- **Post-session insights**: After sessions, shows which usage patterns occurred and which interventions helped
- **Feedback integration**: User feedback on intervention helpfulness feeds directly into the adaptation engine

## Complexity

**Implementation**: High  
**Dependencies**: Simulated usage data (demo mode), no actual Screen Time API  
**New files**: `src/jitai/types.ts`, `src/jitai/usageDetector.ts`, `src/jitai/contextClassifier.ts`, `src/jitai/interventionEngine.ts`, `src/jitai/humanFeedbackLoop.ts`
