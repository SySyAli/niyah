/**
 * BlobsScene — Polished, ethereal blob characters for onboarding.
 *
 * Each blob is layered SVG: gradient fill → inner shadow → specular
 * highlight → stroke → eyes, with a colored iOS shadow for a soft glow.
 *
 * Animations: staggered entrance, subtle breathing idle, critically-damped
 * tap spring, smooth scroll fade.
 */

import React, { useEffect } from "react";
import { View, Pressable, StyleSheet, Platform } from "react-native";
import Animated, {
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  Extrapolation,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  Easing,
} from "react-native-reanimated";
import Svg, {
  Path,
  Circle,
  Rect,
  Defs,
  ClipPath,
  LinearGradient,
  Stop,
  G,
  Ellipse,
} from "react-native-svg";
import * as Haptics from "expo-haptics";

// ============================================================
//  BLOB DATA
// ============================================================

interface BlobEye {
  type: "circle" | "path";
  cx?: number;
  cy?: number;
  r?: number;
  d?: string;
}

interface BlobConfig {
  id: string;
  /** Base fill color */
  color: string;
  /** Lighter variant for gradient highlight edge */
  highlightColor: string;
  viewBox: string;
  /** Position & size as fractions of scene `size` */
  x: number;
  y: number;
  w: number;
  h: number;
  bodyPath: string;
  strokeWidth: number;
  eyes: BlobEye[];
  /** Happy eyes shown when blob is hero on page 1 */
  happyEyes?: BlobEye[];
  /** Base rotation in degrees */
  baseRot: number;
  /** Ambient float amplitude (px) — kept very subtle */
  floatAmp: number;
  /** Rotation kick on tap (degrees) */
  tapRotDeg: number;
  /** Which float channel to use (0, 1, or 2) */
  floatIdx: number;
  /** Whether this blob is the hero for page 1 transition */
  isHero?: boolean;
  /** Fly-out direction as fractions of scene size (non-hero blobs) */
  flyOutX?: number;
  flyOutY?: number;
}

const BLOBS: BlobConfig[] = [
  {
    id: "plum",
    color: "#5C415D",
    highlightColor: "#816280",
    viewBox: "0 0 127.175 102.375",
    x: 0.105,
    y: 0.227,
    w: 0.298,
    h: 0.236,
    strokeWidth: 2.63,
    bodyPath:
      "M63.8255 1.89648C72.7109 1.59745 81.5718 1.0091 89.6195 1.5127C97.6648 2.01618 104.646 3.60365 109.807 7.48438L109.811 7.4873C115.01 11.3664 118.576 17.6784 120.543 25.0693C122.507 32.4489 122.842 40.7903 121.679 48.5596C119.344 64.1517 111.119 77.2475 100.618 82.2559L100.614 82.2578C95.4133 84.7571 89.5314 85.3089 82.7806 85.5205C76.0931 85.7301 68.5596 85.6043 60.4368 86.8936C56.3687 87.5393 52.149 88.5373 47.9788 89.5771C43.7899 90.6217 39.6659 91.7041 35.7093 92.5459C31.7549 93.3873 28.0381 93.9718 24.6946 94.0332C21.3487 94.0946 18.4626 93.6297 16.1146 92.4463C11.4346 90.0873 8.40215 84.6026 6.66828 77.166C4.94709 69.7835 4.58388 60.8 4.9632 51.9492L4.96223 51.9482C5.38362 43.1077 6.5408 34.54 8.85773 27.1943C11.1777 19.8391 14.6274 13.8156 19.5599 9.92578C24.4975 6.03194 31.0634 4.14381 38.7239 3.17969C46.3945 2.21435 54.9422 2.19544 63.8255 1.89648Z",
    eyes: [
      {
        type: "path" as const,
        d: "M57.7152 40.5685C57.7152 39.9299 57.5895 39.2975 57.3451 38.7075C57.1007 38.1174 56.7424 37.5813 56.2909 37.1298C55.8393 36.6782 55.3032 36.32 54.7132 36.0756C54.1231 35.8312 53.4908 35.7054 52.8521 35.7054C52.2135 35.7054 51.5811 35.8312 50.9911 36.0756C50.4011 36.32 49.865 36.6782 49.4134 37.1298C48.9618 37.5813 48.6036 38.1174 48.3592 38.7075C48.1148 39.2975 47.989 39.9299 47.989 40.5685L52.8521 40.5685H57.7152Z",
      },
      {
        type: "path" as const,
        d: "M85.1929 40.5685C85.1929 39.9299 85.0671 39.2975 84.8227 38.7075C84.5783 38.1174 84.2201 37.5813 83.7685 37.1298C83.3169 36.6782 82.7808 36.32 82.1908 36.0756C81.6008 35.8312 80.9684 35.7054 80.3298 35.7054C79.6912 35.7054 79.0588 35.8312 78.4688 36.0756C77.8787 36.32 77.3426 36.6782 76.891 37.1298C76.4395 37.5813 76.0813 38.1174 75.8369 38.7075C75.5925 39.2975 75.4667 39.9299 75.4667 40.5685L80.3298 40.5685H85.1929Z",
      },
    ],
    baseRot: 0,
    floatAmp: 2,
    tapRotDeg: -4,
    floatIdx: 0,
    flyOutX: -1.2,
    flyOutY: -0.3,
  },
  {
    id: "blue",
    color: "#329DD8",
    highlightColor: "#64BFEE",
    viewBox: "0 0 164.974 135.849",
    x: 0.42,
    y: 0.127,
    w: 0.41,
    h: 0.338,
    strokeWidth: 2.63,
    bodyPath:
      "M142.227 49.3495C150.515 62.9462 153.999 79.3861 148.81 91.1557L148.804 91.1703C143.706 103.105 129.624 110.707 116.497 114.39L116.479 114.395C103.6 118.199 92.249 117.827 78.5918 116.435C64.9279 115.042 49.6553 112.738 35.2242 101.63L35.22 101.627C28.0233 96.1331 21.0531 88.4945 16.5071 80.573C11.9324 72.6015 9.96805 64.6286 12.2521 58.3027C14.5449 51.9525 21.2482 46.8762 30.1427 42.5507C38.9741 38.2559 49.6006 34.8675 59.2971 31.6882C69.041 28.5937 77.5803 25.8054 85.4634 24.1146C93.3303 22.4273 100.449 21.8567 107.323 23.1484L107.323 23.1487L107.962 23.2734C121.354 26.0188 133.927 36.1056 142.225 49.3502L142.227 49.3495Z",
    eyes: [
      {
        type: "path" as const,
        d: "M87.1484 61.6537C87.1484 60.8112 87.3422 59.98 87.7148 59.2244C88.0874 58.4688 88.6289 57.8091 89.2973 57.2962C89.9656 56.7834 90.743 56.4311 91.5693 56.2668C92.3956 56.1024 93.2486 56.1303 94.0624 56.3484L92.6408 61.6537H87.1484Z",
      },
      {
        type: "path" as const,
        d: "M75.5229 67.7275C74.7048 67.5266 73.8514 67.5165 73.0287 67.6982C72.2061 67.8798 71.4362 68.2483 70.7788 68.775C70.1213 69.3018 69.5938 69.9727 69.2371 70.736C68.8804 71.4992 68.7041 72.3342 68.7217 73.1765L74.2129 73.0614L75.5229 67.7275Z",
      },
    ],
    baseRot: 0,
    floatAmp: 2.5,
    tapRotDeg: 3,
    floatIdx: 1,
    flyOutX: 1.0,
    flyOutY: -1.2,
  },
  {
    id: "red",
    color: "#E07A5F",
    highlightColor: "#F0A090",
    viewBox: "0 0 119.677 117.413",
    x: 0.348,
    y: 0.421,
    w: 0.281,
    h: 0.274,
    strokeWidth: 2.63,
    bodyPath:
      "M49.4036 2.76855C51.3905 1.48963 53.0168 1.08995 54.4036 1.43652L54.4114 1.43848L54.4193 1.43945C55.8877 1.78765 57.4433 3.02425 59.2161 5.21289C60.9652 7.37218 62.7572 10.239 64.7728 13.5273C68.6393 19.8354 73.2493 27.57 79.6234 33.8066L80.2454 34.4053C86.976 40.773 95.5382 45.3896 102.418 49.2314C105.894 51.1725 108.907 52.8953 111.135 54.5596C113.418 56.2654 114.568 57.6908 114.803 58.9365V58.9385C115.021 60.0771 114.499 61.5042 112.875 63.3711C111.282 65.203 108.861 67.1898 105.898 69.377C100.061 73.6843 92.1674 78.7187 85.5726 84.4395C78.9627 90.1733 73.4909 96.7181 68.8958 101.546C66.5684 103.991 64.4829 105.982 62.5491 107.313C60.6146 108.643 58.9941 109.199 57.554 109.053C56.0872 108.884 54.508 107.963 52.7161 106.243C50.9377 104.536 49.097 102.19 47.0892 99.4395C43.1195 94.0006 38.5536 87.0466 32.8626 81.2754L32.8597 81.2725L32.3187 80.7344C26.7006 75.2143 20.0845 70.7673 14.8265 66.8379C12.0825 64.7873 9.7208 62.8891 7.96809 61.0293C6.20847 59.1622 5.17815 57.4525 4.90461 55.7959C4.63456 54.1597 5.0674 52.3483 6.1966 50.2676C7.32746 48.1838 9.09408 45.9441 11.3138 43.5049C13.5294 41.0701 16.1369 38.4992 18.9212 35.7334C21.6952 32.9779 24.6316 30.0413 27.4583 26.916C30.284 23.7919 32.9962 20.4838 35.5745 17.333C38.1623 14.1706 40.6075 11.1763 42.9349 8.62988C45.2704 6.07452 47.4222 4.04397 49.4036 2.76855Z",
    eyes: [
      { type: "circle" as const, cx: 44.9916, cy: 47.9045, r: 5.49241 },
      { type: "circle" as const, cx: 62.5673, cy: 47.9045, r: 5.49241 },
    ],
    happyEyes: [
      // Left happy eye — upward arc (^)
      {
        type: "path" as const,
        d: "M 38.5 50.5 Q 45 42 51.5 50.5",
      },
      // Right happy eye — upward arc (^)
      {
        type: "path" as const,
        d: "M 56 50.5 Q 62.6 42 69 50.5",
      },
    ],
    baseRot: 0,
    floatAmp: 1.8,
    tapRotDeg: -5,
    floatIdx: 2,
    isHero: true,
  },
  {
    id: "yellow",
    color: "#B8860B",
    highlightColor: "#D4A530",
    viewBox: "0 0 129.037 117.861",
    x: 0.622,
    y: 0.366,
    w: 0.321,
    h: 0.293,
    strokeWidth: 2.63,
    bodyPath:
      "M9.81436 66.3252C9.25192 59.645 10.6816 53.1759 14.2462 48.5297C17.8086 43.9082 23.6647 40.9459 30.5459 38.4194C33.9718 37.1616 37.5794 36.0356 41.2263 34.8563C44.8569 33.6823 48.514 32.4586 51.9621 31.0234C58.8218 28.1681 64.8701 24.4717 69.9428 21.8055C72.5115 20.4555 74.8283 19.3677 76.9451 18.7097C79.0591 18.0527 80.8871 17.8525 82.5085 18.187C85.7845 18.863 88.7806 21.8408 91.9321 26.4903C95.0654 31.1131 98.0507 36.8967 101.568 42.8227C105.072 48.7784 108.849 54.441 111.565 59.8242C114.287 65.2179 115.713 69.9221 114.818 73.8644C113.891 77.7802 110.583 81.3279 105.807 84.5307C101.064 87.7119 95.1 90.4024 89.264 92.6855C78.0004 97.092 67.5942 99.8357 55.0873 99.5702L53.8705 99.5345C40.6429 98.9619 25.4831 95.0472 17.1035 84.8373C12.9169 79.7363 10.3762 72.9971 9.81436 66.3252Z",
    eyes: [
      {
        type: "path" as const,
        d: "M50.5298 60.4644C50.5298 60.9801 50.4282 61.4907 50.2309 61.9671C50.0336 62.4435 49.7443 62.8764 49.3797 63.241C49.0151 63.6056 48.5822 63.8949 48.1058 64.0922C47.6294 64.2895 47.1188 64.3911 46.6031 64.3911C46.0875 64.3911 45.5769 64.2895 45.1004 64.0922C44.624 63.8949 44.1912 63.6056 43.8265 63.241C43.4619 62.8764 43.1727 62.4435 42.9753 61.9671C42.778 61.4907 42.6764 60.9801 42.6764 60.4644L46.6031 60.4644H50.5298Z",
      },
      {
        type: "path" as const,
        d: "M68.1998 60.4644C68.1998 61.5058 67.7861 62.5046 67.0497 63.241C66.3133 63.9774 65.3146 64.3911 64.2732 64.3911C63.2317 64.3911 62.233 63.9774 61.4966 63.241C60.7602 62.5046 60.3465 61.5058 60.3465 60.4644L64.2732 60.4644H68.1998Z",
      },
    ],
    baseRot: 0,
    floatAmp: 2,
    tapRotDeg: 4,
    floatIdx: 0,
    flyOutX: 1.2,
    flyOutY: 0.2,
  },
  {
    id: "offWhite",
    color: "#F2EDE4",
    highlightColor: "#FFFFFF",
    viewBox: "0 0 143.036 150.723",
    x: 0.105,
    y: 0.484,
    w: 0.356,
    h: 0.375,
    strokeWidth: 2.77,
    bodyPath:
      "M50.2605 19.2575C51.17 16.3146 52.3271 13.8954 53.9278 12.1282L53.9367 12.1187C57.0781 8.58467 62.3083 7.25746 67.5106 8.04548C72.7073 8.83273 77.5397 11.685 79.8606 16.0609L79.8625 16.0654C81.0157 18.2244 81.5999 20.8633 81.8863 23.9546C82.1733 27.0513 82.1532 30.4717 82.1727 34.1931C82.2112 41.5653 82.4003 49.9641 85.7077 58.1113L85.7114 58.1225C89.0669 66.1921 95.455 73.9842 100.876 80.9191C103.616 84.4238 106.111 87.7074 107.948 90.7677C109.794 93.8435 110.876 96.5363 110.967 98.8706C111.075 103.402 107.369 107.438 100.737 110.988C94.2052 114.484 85.3632 117.215 76.375 119.325C67.4692 121.413 58.5782 122.864 50.5047 122.858C42.4221 122.852 35.283 121.383 29.7721 117.754L29.7708 117.755C24.2386 114.053 20.2079 108.101 18.1072 101.576C16.0038 95.0414 15.8787 88.0653 17.9925 82.3779L17.9962 82.3676C20.0735 76.6417 24.4488 72.0899 29.3107 67.2235C34.0984 62.4312 39.3389 57.3513 42.5481 50.729L42.5468 50.7294C45.7614 44.2041 46.8962 36.2116 48.1073 29.1374C48.7209 25.5534 49.3519 22.1975 50.2605 19.2575Z",
    eyes: [
      {
        type: "path" as const,
        d: "M69.7786 32.6955C69.7786 33.4168 69.6366 34.131 69.3605 34.7974C69.0845 35.4637 68.68 36.0692 68.1699 36.5792C67.6599 37.0892 67.0544 37.4938 66.3881 37.7698C65.7217 38.0458 65.0075 38.1879 64.2862 38.1879C63.5649 38.1879 62.8507 38.0458 62.1844 37.7698C61.518 37.4938 60.9125 37.0892 60.4025 36.5792C59.8925 36.0692 59.4879 35.4637 59.2119 34.7974C58.9359 34.131 58.7938 33.4168 58.7938 32.6955L64.2862 32.6955H69.7786Z",
      },
    ],
    baseRot: -18.55,
    floatAmp: 2.5,
    tapRotDeg: 5,
    floatIdx: 1,
    flyOutX: -1.0,
    flyOutY: 0.8,
  },
  {
    id: "green",
    color: "#40916C",
    highlightColor: "#5CB88A",
    viewBox: "0 0 130.501 89.2802",
    x: 0.47,
    y: 0.661,
    w: 0.313,
    h: 0.209,
    strokeWidth: 2.63,
    bodyPath:
      "M113.588 1.69517C116.545 1.51505 118.897 1.88595 120.609 2.90073C122.298 3.9018 123.563 5.65416 124.413 8.07956C125.263 10.5078 125.664 13.5206 125.675 16.8716C125.698 23.573 124.164 31.3776 121.912 37.9785C117.327 51.1128 110.036 59.4818 102.302 67.1279L102.295 67.1339C98.4097 71.0288 94.505 74.6485 90.6738 77.2142C86.8251 79.7915 83.2237 81.1869 79.9115 80.9082L79.9017 80.9075L79.8909 80.9068C76.4802 80.6721 73.1219 78.7238 68.3192 75.6925C63.8893 72.8965 58.4191 69.321 50.9374 65.9099L49.4136 65.23L49.4037 65.2254C45.2518 63.4516 40.515 61.7463 35.7366 60.0526C30.9427 58.3534 26.1072 56.6659 21.6981 54.9118C17.2823 53.155 13.3636 51.358 10.3941 49.4593C7.37815 47.5309 5.5835 45.6479 5.02862 43.8185C4.49801 42.0689 5.00896 40.0035 6.66217 37.6313C8.30794 35.2697 10.9588 32.8002 14.2712 30.3881C20.8854 25.5719 29.8612 21.1796 37.8021 18.4562L37.803 18.4562L37.8098 18.454C45.7151 15.6905 52.5597 14.6379 59.3427 13.8168C66.1096 12.9976 72.8951 12.4031 80.4801 10.533L80.4811 10.533C84.2455 9.5991 88.2032 8.35484 92.1154 7.1035C96.0433 5.84717 99.921 4.58551 103.587 3.58772C107.257 2.58885 110.647 1.8744 113.588 1.69517Z",
    eyes: [
      {
        type: "path" as const,
        d: "M72.1864 36.2056C72.1864 35.3631 71.9926 34.5319 71.62 33.7764C71.2474 33.0208 70.7059 32.361 70.0376 31.8482C69.3692 31.3353 68.5918 30.9831 67.7655 30.8187C66.9392 30.6544 66.0862 30.6823 65.2725 30.9003L66.694 36.2056H72.1864Z",
      },
      {
        type: "path" as const,
        d: "M83.8119 42.2795C84.63 42.0785 85.4834 42.0685 86.3061 42.2501C87.1287 42.4317 87.8986 42.8002 88.5561 43.327C89.2135 43.8537 89.741 44.5247 90.0977 45.2879C90.4544 46.0511 90.6308 46.8862 90.6131 47.7285L85.1219 47.6133L83.8119 42.2795Z",
      },
    ],
    baseRot: 0,
    floatAmp: 1.5,
    tapRotDeg: -3,
    floatIdx: 2,
    flyOutX: 0.6,
    flyOutY: 1.2,
  },
];

// ============================================================
//  INDIVIDUAL BLOB
// ============================================================

interface BlobProps {
  blob: BlobConfig;
  index: number;
  size: number;
  progress: SharedValue<number>;
  breathe: SharedValue<number>;
  floatA: SharedValue<number>;
  floatB: SharedValue<number>;
  floatC: SharedValue<number>;
}

const BlobCharacter: React.FC<BlobProps> = ({
  blob,
  index,
  size,
  progress,
  breathe,
  floatA,
  floatB,
  floatC,
}) => {
  const tapScale = useSharedValue(1);
  const tapRotate = useSharedValue(0);
  const entrance = useSharedValue(0);
  const blink = useSharedValue(1);

  // Per-blob blink patterns: varied timing, some double-blink
  // Patterns cycle: single, double, single, double, single, single
  const BLINK_PATTERNS: (() => number)[] = [
    // Single blink
    () => {
      blink.value = withSequence(
        withTiming(0.78, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      );
      return 5500 + index * 700;
    },
    // Double blink (rare)
    () => {
      blink.value = withSequence(
        withTiming(0.8, { duration: 140, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
        withTiming(0.78, { duration: 130, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
      );
      return 7000 + index * 600;
    },
    // Single blink, longer pause
    () => {
      blink.value = withSequence(
        withTiming(0.8, { duration: 150, easing: Easing.out(Easing.quad) }),
        withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) }),
      );
      return 6000 + index * 800;
    },
  ];

  useEffect(() => {
    // Each blob starts blinking at a staggered offset
    let patternIdx = index % BLINK_PATTERNS.length;
    let timeout: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const nextDelay = BLINK_PATTERNS[patternIdx]();
      patternIdx = (patternIdx + 1) % BLINK_PATTERNS.length;
      timeout = setTimeout(scheduleBlink, nextDelay);
    };

    // Stagger initial blink so blobs don't sync up
    timeout = setTimeout(scheduleBlink, 2500 + index * 900);

    return () => clearTimeout(timeout);
  }, []);

  // Staggered entrance: each blob fades in 80ms after the previous
  useEffect(() => {
    entrance.value = withDelay(
      index * 80,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) }),
    );
  }, []);

  const triggerTap = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Critically-damped press: quick in, slow deliberate release
    tapScale.value = withSequence(
      withTiming(0.95, { duration: 80, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 20, stiffness: 180, mass: 1 }),
    );

    // Tiny tilt, heavily damped
    tapRotate.value = withSequence(
      withTiming(blob.tapRotDeg, { duration: 80 }),
      withSpring(0, { damping: 20, stiffness: 160, mass: 1 }),
    );

    // Blink on tap
    blink.value = withSequence(
      withTiming(0.75, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 200, easing: Easing.out(Easing.cubic) }),
    );
  };

  const floats = [floatA, floatB, floatC];
  const primaryFloat = floats[blob.floatIdx % 3];

  // Compute target center position for hero blob (fractional offset from original pos)
  const heroCenterX = blob.isHero ? (0.5 - blob.x - blob.w / 2) * size : 0;
  const heroCenterY = blob.isHero ? (0.42 - blob.y - blob.h / 2) * size : 0;

  const animStyle = useAnimatedStyle(() => {
    // Gentle vertical float
    const floatY = interpolate(primaryFloat.value, [0, 1], [0, -blob.floatAmp]);

    // Ultra-subtle breathing scale (1.0 → 1.006)
    const breatheScale = interpolate(breathe.value, [0, 1], [1, 1.006]);

    if (blob.isHero) {
      // Hero blob: stays visible through page 1, scales up and centers
      const scrollOpacity = interpolate(
        progress.value,
        [0, 0.5, 1.0, 1.5, 2.0],
        [1, 1, 1, 0.5, 0],
        Extrapolation.CLAMP,
      );

      const heroScale = interpolate(
        progress.value,
        [0, 0.5, 1.0],
        [1, 1.5, 2.2],
        Extrapolation.CLAMP,
      );

      const moveX = interpolate(
        progress.value,
        [0, 0.5, 1.0],
        [0, heroCenterX * 0.5, heroCenterX],
        Extrapolation.CLAMP,
      );

      const moveY = interpolate(
        progress.value,
        [0, 0.5, 1.0],
        [0, heroCenterY * 0.5, heroCenterY],
        Extrapolation.CLAMP,
      );

      return {
        opacity: entrance.value * scrollOpacity,
        transform: [
          { translateX: moveX },
          { translateY: moveY + floatY },
          { rotate: `${blob.baseRot + tapRotate.value}deg` },
          { scale: tapScale.value * breatheScale * entrance.value * heroScale },
        ],
      };
    }

    // Non-hero blobs: fly out as progress goes 0→1
    const flyX = interpolate(
      progress.value,
      [0, 0.3, 0.8],
      [0, 0, (blob.flyOutX || 0) * size],
      Extrapolation.CLAMP,
    );

    const flyY = interpolate(
      progress.value,
      [0, 0.3, 0.8],
      [0, 0, (blob.flyOutY || 0) * size],
      Extrapolation.CLAMP,
    );

    const scrollOpacity = interpolate(
      progress.value,
      [0, 0.3, 0.7],
      [1, 0.8, 0],
      Extrapolation.CLAMP,
    );

    return {
      opacity: entrance.value * scrollOpacity,
      transform: [
        { translateX: flyX },
        { translateY: flyY + floatY },
        { rotate: `${blob.baseRot + tapRotate.value}deg` },
        { scale: tapScale.value * breatheScale * entrance.value },
      ],
    };
  });

  // Animated style for the glow — hero gets brighter glow on page 1
  const glowStyle = useAnimatedStyle(() => {
    if (!blob.isHero) return {};

    const glowIntensity = interpolate(
      progress.value,
      [0, 0.5, 1.0],
      [0.45, 0.55, 0.65],
      Extrapolation.CLAMP,
    );

    const glowRadius = interpolate(
      progress.value,
      [0, 0.5, 1.0],
      [16, 22, 30],
      Extrapolation.CLAMP,
    );

    return Platform.OS === "ios"
      ? { shadowOpacity: glowIntensity, shadowRadius: glowRadius }
      : {};
  });

  // Animated opacity for happy eyes crossfade (hero only)
  const happyEyeOpacity = useDerivedValue(() => {
    if (!blob.isHero) return 0;
    return interpolate(progress.value, [0.3, 0.7], [0, 1], Extrapolation.CLAMP);
  });

  const normalEyeOpacity = useDerivedValue(() => {
    if (!blob.isHero) return 1;
    return interpolate(progress.value, [0.3, 0.7], [1, 0], Extrapolation.CLAMP);
  });

  // Phone opacity (hero only, appears as blob moves to center)
  const phoneOpacity = useDerivedValue(() => {
    if (!blob.isHero) return 0;
    return interpolate(
      progress.value,
      [0.5, 0.9, 1.0, 1.5, 2.0],
      [0, 0.5, 1, 0.5, 0],
      Extrapolation.CLAMP,
    );
  });

  const phoneStyle = useAnimatedStyle(() => ({
    opacity: phoneOpacity.value,
  }));

  const happyEyeStyle = useAnimatedStyle(() => ({
    opacity: happyEyeOpacity.value,
  }));

  const normalEyeStyle = useAnimatedStyle(() => ({
    opacity: normalEyeOpacity.value,
    transform: [{ scaleY: blink.value }],
  }));

  const w = size * blob.w;
  const h = size * blob.h;

  // Derive highlight ellipse position from viewBox
  const vbParts = blob.viewBox.split(" ");
  const vbW = Number(vbParts[2]);
  const vbH = Number(vbParts[3]);
  const hlCx = vbW * 0.38;
  const hlCy = vbH * 0.28;
  const hlRx = vbW * 0.22;
  const hlRy = vbH * 0.18;

  // Phone dimensions (relative to blob size for hero)
  const phoneW = w * 0.35;
  const phoneH = w * 0.55;

  return (
    <Animated.View
      style={[
        styles.blob,
        {
          left: size * blob.x,
          top: size * blob.y,
          width: w,
          height: h,
          // Dark drop shadow for depth (iOS)
          ...Platform.select({
            ios: {
              shadowColor: "#000000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.45,
              shadowRadius: 16,
            },
            android: { elevation: 16 },
          }),
        },
        animStyle,
        glowStyle,
      ]}
    >
      <Pressable onPress={triggerTap} style={{ width: w, height: h }}>
        <Svg width={w} height={h} viewBox={blob.viewBox}>
          <Defs>
            {/* Clip to blob body for inner effects */}
            <ClipPath id={`body-${blob.id}`}>
              <Path d={blob.bodyPath} />
            </ClipPath>
            {/* Gradient: lighter top-left → base color bottom-right */}
            <LinearGradient
              id={`fill-${blob.id}`}
              x1="0.25"
              y1="0"
              x2="0.75"
              y2="1"
            >
              <Stop
                offset="0"
                stopColor={blob.highlightColor}
                stopOpacity={1}
              />
              <Stop offset="1" stopColor={blob.color} stopOpacity={1} />
            </LinearGradient>
          </Defs>

          {/* Layer 1: Body with gradient fill + stroke */}
          <Path
            d={blob.bodyPath}
            fill={`url(#fill-${blob.id})`}
            stroke="#111111"
            strokeWidth={blob.strokeWidth}
          />

          {/* Layer 2: Inner shadow — dark overlay shifted down-right, clipped */}
          <G clipPath={`url(#body-${blob.id})`}>
            <Path d={blob.bodyPath} fill="black" opacity={0.1} x={2} y={4} />
          </G>
        </Svg>

        {/* Normal eyes layer — fades out for hero */}
        <Animated.View
          style={[StyleSheet.absoluteFill, normalEyeStyle]}
          pointerEvents="none"
        >
          <Svg width={w} height={h} viewBox={blob.viewBox}>
            {blob.eyes.map((eye, i) =>
              eye.type === "circle" ? (
                <Circle
                  key={i}
                  cx={eye.cx}
                  cy={eye.cy}
                  r={eye.r}
                  fill="#0F0000"
                />
              ) : (
                <Path key={i} d={eye.d!} fill="#0F0000" />
              ),
            )}
          </Svg>
        </Animated.View>

        {/* Happy eyes layer — fades in for hero (^_^ arcs) */}
        {blob.isHero && blob.happyEyes && (
          <Animated.View
            style={[StyleSheet.absoluteFill, happyEyeStyle]}
            pointerEvents="none"
          >
            <Svg width={w} height={h} viewBox={blob.viewBox}>
              {blob.happyEyes.map((eye, i) => (
                <Path
                  key={`happy-${i}`}
                  d={eye.d!}
                  fill="none"
                  stroke="#0F0000"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                />
              ))}
              {/* Little smile */}
              <Path
                d="M 47 58 Q 54 65 61 58"
                fill="none"
                stroke="#0F0000"
                strokeWidth={2.5}
                strokeLinecap="round"
              />
            </Svg>
          </Animated.View>
        )}
      </Pressable>

      {/* Phone held by hero blob — appears on right side */}
      {blob.isHero && (
        <Animated.View
          style={[
            {
              position: "absolute",
              right: -phoneW * 0.6,
              top: h * 0.1,
              width: phoneW,
              height: phoneH,
            },
            phoneStyle,
          ]}
          pointerEvents="none"
        >
          <Svg width={phoneW} height={phoneH} viewBox="0 0 60 95">
            {/* Phone body */}
            <Rect
              x={0}
              y={0}
              width={60}
              height={95}
              rx={10}
              fill="#3A3A3A"
              opacity={0.9}
            />
            {/* Screen */}
            <Rect
              x={3}
              y={3}
              width={54}
              height={89}
              rx={8}
              fill="#1A1A2E"
              opacity={0.95}
            />
            {/* Screen glow */}
            <Rect
              x={8}
              y={14}
              width={44}
              height={60}
              rx={4}
              fill="#329DD8"
              opacity={0.15}
            />
            {/* Notch */}
            <Rect
              x={18}
              y={6}
              width={24}
              height={4}
              rx={2}
              fill="#0F0F0F"
              opacity={0.7}
            />
            {/* App icon placeholder 1 */}
            <Rect
              x={12}
              y={22}
              width={14}
              height={14}
              rx={4}
              fill="#E1306C"
              opacity={0.5}
            />
            {/* App icon placeholder 2 */}
            <Rect
              x={34}
              y={22}
              width={14}
              height={14}
              rx={4}
              fill="#1DA1F2"
              opacity={0.5}
            />
            {/* Content lines */}
            <Rect
              x={12}
              y={44}
              width={36}
              height={3}
              rx={1.5}
              fill="#F2EDE4"
              opacity={0.12}
            />
            <Rect
              x={12}
              y={52}
              width={24}
              height={3}
              rx={1.5}
              fill="#F2EDE4"
              opacity={0.08}
            />
          </Svg>
        </Animated.View>
      )}
    </Animated.View>
  );
};

// ============================================================
//  MAIN SCENE
// ============================================================

interface BlobsSceneProps {
  scrollX: SharedValue<number>;
  pageWidth: number;
  size: number;
}

export const BlobsScene: React.FC<BlobsSceneProps> = ({
  scrollX,
  pageWidth,
  size,
}) => {
  const progress = useDerivedValue(() => scrollX.value / pageWidth);

  // Ambient loops — slow, barely perceptible
  const floatA = useSharedValue(0);
  const floatB = useSharedValue(0);
  const floatC = useSharedValue(0);
  const breathe = useSharedValue(0);
  useEffect(() => {
    floatA.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 5500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    floatB.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 6500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 6500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    floatC.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 7500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 7500, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
    // Shared breathing: very slow, very subtle
    breathe.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {BLOBS.map((blob, i) => (
        <BlobCharacter
          key={blob.id}
          blob={blob}
          index={i}
          size={size}
          progress={progress}
          breathe={breathe}
          floatA={floatA}
          floatB={floatB}
          floatC={floatC}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignSelf: "center",
  },
  blob: {
    position: "absolute",
  },
});
