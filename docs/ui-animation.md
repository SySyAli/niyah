# UI & Animation

> Animation libraries, onboarding architecture, and visual plans.
> See also: [Architecture](./architecture.md) | [Roadmap](./roadmap.md)

## Styling Conventions

- `StyleSheet.create()` for all styles, defined at bottom of file
- `useColors()` hook for current theme colors (dark/light)
- Colors: `src/constants/colors.ts` (`DarkColors`, `LightColors`)
- 8px spacing grid: `Spacing.xs/sm/md/lg/xl/xxl`
- Fonts: `Font.regular/medium/semibold/bold/heavy` (SF Pro Rounded on iOS)
- Radius: `Radius` constants for border radii

## Installed Animation Libraries

| Library                        | Version | Status                                       |
| ------------------------------ | ------- | -------------------------------------------- |
| `react-native-reanimated`      | 4.1.7   | Installed, used in some onboarding scenes    |
| `react-native-gesture-handler` | 2.28.0  | Installed, used internally by expo-router    |
| `expo-linear-gradient`         | 15.0.8  | Installed, not used in any component         |
| `react-native-svg`             | 15.15.3 | In use (Timer, onboarding SVG blobs)         |
| `expo-haptics`                 | 15.0.8  | In use (Button, Card, NumPad press feedback) |

## Components Using Legacy Animated API

These should be migrated to Reanimated for better performance:

| Component                      | Current                              | Target                                          |
| ------------------------------ | ------------------------------------ | ----------------------------------------------- |
| `Button.tsx`                   | `Animated.spring` scale 1->0.97      | `useSharedValue` + `Gesture.Tap` + `withSpring` |
| `Card.tsx`                     | `Animated.timing` fade + press scale | `withTiming` entrance + `withSpring` press      |
| `(tabs)/_layout.tsx` tab icons | `Animated.sequence` bounce           | `withSequence(withTiming(), withSpring())`      |
| `Confetti.tsx`                 | `Animated` particle system           | Reanimated shared values                        |

## Onboarding

### Current State

8 scene components in `src/components/onboarding/`:

- `BlobsScene.tsx` -- SVG blob characters
- `ContinuousScene.tsx`, `GardenScene.tsx`, `GrowthScene.tsx`
- `Onboarding2Scene.tsx`, `Onboarding3Scene.tsx`
- `ShieldScene.tsx`, `StakeScene.tsx`

### Architecture Goal

One shared value (gesture progress) drives every animation through `interpolate()`:

```
PanGesture -> progress (0 to N pages)
  |- Background color interpolation
  |- Scene scale/rotation transforms
  |- Parallax layer offsets
  +- Text opacity/translateY
```

### Migration Plan

1. Convert all onboarding scenes to Reanimated shared values
2. Implement gesture-driven page transitions
3. Polish timing curves and spring configs

## 3D Gem Onboarding (Post-Launch)

Replace flat SVG blob characters with photorealistic 3D gemstones via SceneKit:

| Blob     | Color   | Gem Type | Material                          |
| -------- | ------- | -------- | --------------------------------- |
| plum     | #5C415D | Amethyst | Deep purple glass, high clearcoat |
| blue     | #329DD8 | Sapphire | Blue glass, strong specular       |
| red      | #E07A5F | Sunstone | Warm peach glass, inner glow      |
| yellow   | #B8860B | Topaz    | Golden glass, metallic tint       |
| offWhite | #F2EDE4 | Diamond  | Near-clear, rainbow caustics      |
| green    | #40916C | Emerald  | Deep green glass                  |

## Tooling Summary

| Tool                         | Role                        | Cost            | Status                      |
| ---------------------------- | --------------------------- | --------------- | --------------------------- |
| Firebase (Auth + Firestore)  | Backend, auth, data         | Free tier       | Implemented (RNFB)          |
| Firebase Cloud Functions     | Server-side logic, payments | Free tier       | 24 functions deployed       |
| EAS Build                    | iOS/Android builds          | Free tier       | Configured and in use       |
| react-native-reanimated      | Animations                  | Free            | Partially used (onboarding) |
| react-native-gesture-handler | Gesture tracking            | Free            | Used by router              |
| react-native-svg             | SVG illustrations           | Free            | In use                      |
| expo-haptics                 | Tactile feedback            | Free            | In use                      |
| Jest + jest-expo             | Testing                     | Free            | 1018 tests passing          |
| ESLint 9 + Prettier          | Linting + formatting        | Free            | Configured, 0 errors        |
| Stripe                       | Payments                    | Per-transaction | Integrated (test mode)      |
