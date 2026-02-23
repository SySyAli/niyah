/**
 * Onboarding2Scene — "Take your focus to the next level"
 *
 * All positions mapped from Figma's 400×844 coordinate system.
 * Scaled by `sf = size / 400`, Y offset by FIGMA_Y_OFF.
 */

import React from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import Svg, {
  Path,
  Circle,
  Rect,
  Ellipse,
  Line,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  G,
} from "react-native-svg";

const FIGMA_W = 400;
const FIGMA_Y_OFF = 280;

interface Onboarding2SceneProps {
  scrollX: SharedValue<number>;
  pageWidth: number;
  size: number;
}

// ============================================================
//  SVG CHARACTER COMPONENTS
// ============================================================

/** Peach blob (annoyed) — unused, kept for reference */
const PeachBlobAnnoyed: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Svg width={w} height={h} viewBox="0 0 140.225 137.573" fill="none">
    <Path
      d="M57.8862 3.24414C60.2144 1.74549 62.1205 1.27635 63.7456 1.68262L63.7544 1.68457L63.7631 1.6875C65.4838 2.09548 67.3059 3.54389 69.3833 6.1084C71.4327 8.63855 73.5332 11.9974 75.895 15.8506C80.5714 23.48 86.175 32.89 94.0229 40.3125C101.909 47.7736 111.942 53.1821 120.003 57.6836C124.076 59.9579 127.606 61.9778 130.216 63.9277C132.892 65.9264 134.238 67.5961 134.514 69.0557V69.0586C134.769 70.3927 134.159 72.0645 132.256 74.252C130.389 76.3985 127.552 78.7263 124.08 81.2891C117.241 86.3359 107.992 92.2346 100.265 98.9375C92.5203 105.656 86.1091 113.325 80.7251 118.981C77.9981 121.846 75.5543 124.179 73.2885 125.737C71.0171 127.3 69.1153 127.951 67.4252 127.776C65.7095 127.576 63.8623 126.495 61.767 124.484C59.6834 122.484 57.5268 119.736 55.1743 116.513C50.523 110.14 45.1734 101.992 38.5053 95.2305L38.5014 95.2266L37.8676 94.5967C31.2848 88.1286 23.5325 82.9176 17.3715 78.3135C14.1565 75.9108 11.39 73.6868 9.33638 71.5078C7.27442 69.3199 6.06693 67.3162 5.74654 65.375C5.43025 63.458 5.93723 61.3363 7.26021 58.8984C8.58522 56.4569 10.6554 53.8327 13.2563 50.9746C15.8524 48.1218 18.908 45.1098 22.1704 41.8691C25.4206 38.6405 28.8613 35.2 32.1733 31.5381C35.4841 27.8775 38.6621 24.0004 41.6831 20.3086C44.7151 16.6033 47.5802 13.0949 50.3071 10.1113C53.0435 7.11731 55.5646 4.73851 57.8862 3.24414Z"
      fill="#E07A5F"
      stroke="black"
      strokeWidth={3.08}
    />
    <Path
      d="M59.1519 56.1296C59.1519 56.9747 58.9855 57.8116 58.6621 58.5923C58.3387 59.3731 57.8646 60.0826 57.267 60.6801C56.6694 61.2777 55.96 61.7518 55.1792 62.0752C54.3984 62.3986 53.5616 62.565 52.7165 62.565C51.8714 62.565 51.0345 62.3986 50.2538 62.0752C49.473 61.7518 48.7635 61.2777 48.1659 60.6801C47.5684 60.0826 47.0943 59.3731 46.7709 58.5923C46.4475 57.8116 46.2811 56.9747 46.2811 56.1296L52.7165 56.1296H59.1519Z"
      fill="#0F0000"
    />
    <Path
      d="M79.7454 56.1296C79.7454 57.8364 79.0674 59.4733 77.8605 60.6801C76.6536 61.887 75.0167 62.565 73.31 62.565C71.6032 62.565 69.9663 61.887 68.7594 60.6802C67.5525 59.4733 66.8745 57.8364 66.8745 56.1296L73.31 56.1296H79.7454Z"
      fill="#0F0000"
    />
  </Svg>
);

/** Phone in trenchcoat — flipped via scaleX:-1 in render */
const PhoneTrenchcoat: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Svg width={w} height={h} viewBox="0 0 190.499 194.16" fill="none">
    <Path
      d="M97.7542 0.98401H42.6816C36.2478 5.39304 34.1315 7.86191 33.5751 12.2587V52.891L42.6816 56.9239C62.8174 90.6151 68.1467 113.232 67.3992 160.564L99.9224 157.095C108.31 154.124 110.794 150.924 111.197 142.351V54.7557V30.038V12.2587C109.396 5.52891 106.519 3.0121 97.7542 0.98401Z"
      fill="#8F9EFF"
    />
    <Path
      d="M33.5751 12.2587C34.1315 7.86191 36.2478 5.39304 42.6816 0.98401C32.3271 0.275919 28.4589 2.64457 25.3359 12.2587L25.8291 33.5072L26.2032 49.6263L33.5751 52.891V12.2587Z"
      fill="#485291"
    />
    <Path
      d="M4.52109 177.043C28.7944 186.159 42.6269 186.858 67.3992 186.149V173.357V160.564C68.1467 113.232 62.8174 90.6151 42.6816 56.9239L33.5751 52.891L26.2032 49.6263L12.3267 43.481C22.69 94.0955 19.6931 123.488 4.52109 177.043Z"
      fill="#2F4342"
    />
    <Path
      d="M111.197 54.7557C133.174 65.5866 146.014 70.8502 171.907 75.5705C154.133 67.0382 135.481 50.8529 132.879 50.8529C130.277 50.8528 125.901 50.4023 119.87 52.891C121.048 43.8523 124.151 39.9584 130.711 33.5072C124.518 29.9052 120.191 29.2254 111.197 30.038V54.7557Z"
      fill="#2F4342"
    />
    <Path
      d="M99.9224 157.095L67.3992 160.564V173.357C130.7 162.064 155.554 160.527 183.182 165.334C189.032 126.718 186.772 107.299 171.907 75.5705C146.014 70.8502 133.174 65.5866 111.197 54.7557V142.351C110.794 150.924 108.31 154.124 99.9224 157.095Z"
      fill="#182625"
    />
    <Path
      d="M11.0257 39.1445C10.0969 41.4802 10.2966 42.465 12.3267 43.481L26.2032 49.6263L25.8291 33.5072H22.7341C16.5315 33.8293 14.0465 35.154 11.0257 39.1445Z"
      fill="#182625"
    />
    <Path
      d="M42.6816 0.98401H97.7542C106.519 3.0121 109.396 5.52891 111.197 12.2587V30.038M42.6816 0.98401C36.2478 5.39304 34.1315 7.86191 33.5751 12.2587V52.891M42.6816 0.98401C32.3271 0.275919 28.4589 2.64457 25.3359 12.2587L25.8291 33.5072M67.3992 160.564L99.9224 157.095C108.31 154.124 110.794 150.924 111.197 142.351V54.7557M67.3992 160.564V173.357M67.3992 160.564C68.1467 113.232 62.8174 90.6151 42.6816 56.9239L33.5751 52.891M12.3267 43.481C10.2966 42.465 10.0969 41.4802 11.0257 39.1445C14.0465 35.154 16.5315 33.8293 22.7341 33.5072H25.8291M12.3267 43.481L26.2032 49.6263M12.3267 43.481C22.69 94.0955 19.6931 123.488 4.52109 177.043C28.7944 186.159 42.6269 186.858 67.3992 186.149V173.357M33.5751 52.891L26.2032 49.6263M26.2032 49.6263L25.8291 33.5072M67.3992 173.357C130.7 162.064 155.554 160.527 183.182 165.334C189.032 126.718 186.772 107.299 171.907 75.5705M171.907 75.5705C146.014 70.8502 133.174 65.5866 111.197 54.7557M171.907 75.5705C154.133 67.0382 135.481 50.8529 132.879 50.8529C130.277 50.8528 125.901 50.4023 119.87 52.891C121.048 43.8523 124.151 39.9584 130.711 33.5072C124.518 29.9052 120.191 29.2254 111.197 30.038M111.197 54.7557V30.038"
      stroke="black"
      strokeWidth={1.73}
    />
    {/* Pixel face */}
    <Rect x={65} y={42} width={8} height={8} fill="black" />
    <Rect x={80} y={43} width={8} height={8} fill="black" />
    <Rect x={88} y={61} width={8} height={8} fill="black" />
    <Rect x={80} y={69} width={8} height={8} fill="black" />
    <Rect x={72} y={69} width={8} height={8} fill="black" />
    <Rect x={64} y={69} width={8} height={8} fill="black" />
    <Rect x={56} y={61} width={8} height={8} fill="black" />
  </Svg>
);

/** Inside pocket overlay */
const InsidePocket: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Svg width={w} height={h} viewBox="0 0 69.771 47.3041" fill="none">
    <Path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M62.4605 1.08065C42.8677 6.64367 29.6851 7.61939 4.35248 7.58527C4.90122 37.5451 13.4812 45.425 51.1858 35.3384C66.2174 32.9472 68.2133 24.8436 62.4605 1.08065Z"
      fill="#182625"
    />
    <Path
      d="M4.35248 7.58527C29.6851 7.61939 42.8677 6.64367 62.4605 1.08065C68.2133 24.8436 66.2174 32.9472 51.1858 35.3384C13.4812 45.425 4.90122 37.5451 4.35248 7.58527Z"
      fill="#2F4342"
      stroke="black"
      strokeWidth={1.73}
    />
  </Svg>
);

/** Phone fight — muscular phone with pixel eyes + fist (viewBox padded for stroke) */
const PhoneFight: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Svg width={w} height={h} viewBox="-3 -3 190.627 196.108" fill="none">
    <Path
      d="M43.6661 106.631C42.5361 133.039 47.6703 144.314 66.905 158.377C87.0217 147.513 95.0005 139.312 103.663 121.138C107.881 136.751 108.825 145.376 108.729 161.56C106.518 162.916 105.116 163.493 100.879 162.578C99.5853 156.081 97.3074 153.738 90.1252 152.186C85.592 152.332 83.4975 153.017 82.1896 157.508C81.1084 156.767 79.8505 156.98 76.2965 158.565C67.537 171.197 71.5659 184.271 85.4939 188.108C99.1686 188.108 99.6741 186.467 103.236 181.807C147.319 179.544 141.015 179.081 153.12 173.407C155.799 174.836 157.498 174.803 160.532 174.729C164.572 171.622 165.238 168.961 165.837 163.874C177.837 150.854 179.889 142.444 179.891 126.573C183.137 114.182 183.438 105.527 180.224 97.6941C177.799 91.7844 173.374 86.3425 166.703 80.1167L150.787 15.5982C146.784 5.85202 143.162 3.81699 134.546 5.53212L87.7311 17.0806C81.0138 20.2085 79.472 23.8198 81.9327 33.0152L91.6707 74.7053C84.3832 78.7638 82.2266 82.5812 82.3114 92.5262C69.5884 95.4131 65.6521 101.565 64.1403 120.35C62.0155 119.67 60.9287 119.774 59.0532 120.248C54.5374 113.687 51.2322 110.789 43.6661 106.631Z"
      fill="#8F9EFF"
      stroke="black"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M150.787 15.5982L166.703 80.1167C173.374 86.3425 177.799 91.7844 180.224 97.6941L155.849 6.16384C153.92 1.4551 151.082 0.270874 134.546 5.53212C143.162 3.81699 146.784 5.85202 150.787 15.5982Z"
      fill="#485291"
      stroke="black"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M108.729 161.56C108.825 145.376 107.881 136.751 103.663 121.138C95.0005 139.312 87.0217 147.513 66.905 158.377C47.6703 144.314 42.5361 133.039 43.6661 106.631C51.2322 110.789 54.5374 113.687 59.0532 120.248C60.9287 119.774 62.0155 119.67 64.1403 120.35C65.6521 101.565 69.5884 95.4131 82.3114 92.5262C82.2266 82.5812 84.3832 78.7638 91.6707 74.7053L81.9327 33.0152C79.472 23.8198 81.0138 20.2085 87.7311 17.0806L134.546 5.53212M108.729 161.56C106.518 162.916 105.116 163.493 100.879 162.578C99.5853 156.081 97.3074 153.738 90.1252 152.186C85.592 152.332 83.4975 153.017 82.1896 157.508M108.729 161.56C123.555 152.576 131.524 148.383 141.833 150.477C137.4 134.134 139.887 127.61 152.225 120.149C146.909 109.461 147.418 104.099 153.891 95.5199M82.1896 157.508L86.0481 160.325M82.1896 157.508C81.1084 156.767 79.8505 156.98 76.2965 158.565C67.537 171.197 71.5659 184.271 85.4939 188.108C99.1686 188.108 99.6741 186.467 103.236 181.807C147.319 179.544 141.015 179.081 153.12 173.407C155.799 174.836 157.498 174.803 160.532 174.729C164.572 171.622 165.238 168.961 165.837 163.874C177.837 150.854 179.889 142.444 179.891 126.573M161.445 128.946C162.813 137.493 161.536 141.52 155.6 147.228M179.891 126.573L174.327 130.768M179.891 126.573C183.137 114.182 183.438 105.527 180.224 97.6941M134.546 5.53212C143.162 3.81699 146.784 5.85202 150.787 15.5982L166.703 80.1167C173.374 86.3425 177.799 91.7844 180.224 97.6941M134.546 5.53212C151.082 0.270874 153.92 1.4551 155.849 6.16384L180.224 97.6941"
      stroke="black"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M18.5553 78.9233C7.40733 79.2874 3.94682 82.2587 3.0459 92.7874C3.67069 104.843 7.16251 110.651 18.2899 119.508L23.4124 106.731C34.4784 98.5744 36.3379 83.5599 18.5553 78.9233Z"
      fill="#8F9EFF"
      stroke="black"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Rect x={111.77} y={51.595} width={6.425} height={6.425} fill="black" />
    <Rect x={124.919} y={51.595} width={6.425} height={6.425} fill="black" />
    <Path
      d="M103.678 37.4341L110.103 37.4341L110.103 41.4801L114.149 41.4801L114.149 44.5145L120.218 44.5145L120.218 50.9402L113.793 50.9402L113.793 47.9057L107.724 47.9057L107.724 43.8598L103.678 43.8598L103.678 37.4341Z"
      fill="black"
    />
    <Path
      d="M121.885 50.9402L128.31 50.9402L128.31 46.8942L132.356 46.8942L132.356 43.8598L138.425 43.8598L138.425 37.4341L131.999 37.4341L131.999 40.4686L125.931 40.4686L125.931 44.5145L121.885 44.5145L121.885 50.9402Z"
      fill="black"
    />
    <Rect x={111.835} y={72.166} width={6.425} height={6.425} fill="black" />
    <Rect x={118.26} y={72.166} width={6.425} height={6.425} fill="black" />
    <Rect x={124.686} y={72.166} width={6.425} height={6.425} fill="black" />
    <Rect x={105.349} y={78.591} width={6.486} height={6.103} fill="black" />
    <Rect x={131.112} y={78.591} width={6.425} height={6.103} fill="black" />
  </Svg>
);

/** Peach fight — muscular angry peach (viewBox padded for stroke) */
const PeachFight: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Svg width={w} height={h} viewBox="-3 -3 177 216.853" fill="none">
    <Defs>
      <LinearGradient id="peachFightGrad" x1="0.25" y1="0" x2="0.75" y2="1">
        <Stop offset="0" stopColor="#F0A090" stopOpacity={1} />
        <Stop offset="1" stopColor="#E07A5F" stopOpacity={1} />
      </LinearGradient>
    </Defs>
    <Path
      d="M35.5957 150.599C28.574 143.528 20.1046 137.983 13.4268 132.914C8.4969 137.718 7.17832 141.37 7.29622 149.504C7.12708 160.24 7.68183 165.973 9.89161 175.646C19.3971 185.106 25.7555 188.69 39.1182 191.73C39.1669 196.526 39.9265 198.906 42.8379 202.507C49.9008 210.089 54.0034 210.745 61.6607 205.179C71.2883 197.223 72.0151 192.552 65.7205 183.895C64.6416 183.771 63.5777 183.389 62.5175 182.789C61.2896 181.676 60.2227 180.782 59.1838 180.23C56.9284 179.031 54.8052 179.441 51.454 182.706C45.9643 172.635 44.481 170.319 34.5107 166.217C38.761 162.9 40.4773 161.039 41.8545 157.721C39.8984 155.268 37.8222 152.857 35.5957 150.599Z"
      fill="url(#peachFightGrad)"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M135.11 122.806C133.524 114.412 109.369 107.697 93.7934 92.9611C92.7072 91.9339 91.6642 90.8676 90.6606 89.7721C77.3576 75.2521 70.9615 55.5977 62.5494 53.6031C53.596 51.3647 42.4041 69.5515 29.1604 84.1942C15.9167 98.8368 0.527894 110.029 2.11341 119.635C2.86417 124.184 7.42084 128.356 13.4268 132.914C20.1046 137.983 28.574 143.528 35.5957 150.599C37.8222 152.857 39.8984 155.268 41.8545 157.721C48.6624 166.259 54.0154 175.313 59.1838 180.23C60.2227 180.782 61.2896 181.676 62.5175 182.789C63.5777 183.389 64.6416 183.771 65.7205 183.895C74.674 184.828 84.5601 167.853 100.042 154.423C115.524 140.993 136.696 131.107 135.11 122.806Z"
      fill="url(#peachFightGrad)"
      stroke="black"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M93.7934 92.9611C109.369 107.697 133.524 114.412 135.11 122.806C151.276 117.805 158.133 111.948 168.817 99.3575C164.411 81.1881 160.457 73.1395 151.577 61.4147C137.751 47.4962 130.167 39.5833 118.391 24.3344C119.713 12.1054 116.92 7.71093 107.217 3.1525C101.726 1.25273 98.8249 1.8183 93.7756 3.99482C87.0072 9.20191 84.8177 11.9508 87.5167 16.1486C114.463 12.3279 112.502 30.8577 112.78 41.0064C113.058 51.155 132.428 75.2996 129.525 78.3419L127.4 80.0706C114.524 74.7938 109.703 76.3016 103.028 89.8036C95.0518 86.2005 94.5046 86.5773 90.6606 89.7721C91.6642 90.8676 92.7072 91.9339 93.7934 92.9611Z"
      fill="url(#peachFightGrad)"
      stroke="black"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Path
      d="M35.5957 150.599C28.574 143.528 20.1046 137.983 13.4268 132.914C8.4969 137.718 7.17832 141.37 7.29622 149.504C7.12708 160.24 7.68183 165.973 9.89161 175.646C19.3971 185.106 25.7555 188.69 39.1182 191.73C39.1669 196.526 39.9265 198.906 42.8379 202.507C49.9008 210.089 54.0034 210.745 61.6607 205.179C71.2883 197.223 72.0151 192.552 65.7205 183.895M65.7205 183.895C64.6416 183.771 63.5777 183.389 62.5175 182.789C61.2896 181.676 60.2227 180.782 59.1838 180.23C56.9284 179.031 54.8052 179.441 51.454 182.706C45.9643 172.635 44.481 170.319 34.5107 166.217C38.761 162.9 40.4773 161.039 41.8545 157.721M135.11 122.806C133.524 114.412 109.369 107.697 93.7934 92.9611M135.11 122.806C151.276 117.805 158.133 111.948 168.817 99.3575C164.411 81.1881 160.457 73.1395 151.577 61.4147C137.751 47.4962 130.167 39.5833 118.391 24.3344C119.713 12.1054 116.92 7.71093 107.217 3.1525C101.726 1.25273 98.8249 1.8183 93.7756 3.99482C87.0072 9.20191 84.8177 11.9508 87.5167 16.1486C114.463 12.3279 112.502 30.8577 112.78 41.0064C113.058 51.155 132.428 75.2996 129.525 78.3419M135.11 122.806C136.696 131.107 115.524 140.993 100.042 154.423C84.5601 167.853 74.674 184.828 65.7205 183.895M2.11341 119.635C0.527894 110.029 15.9167 98.8368 29.1604 84.1942C42.4041 69.5515 53.596 51.3647 62.5494 53.6031C70.9615 55.5977 77.3576 75.2521 90.6606 89.7721M93.7934 92.9611C92.7072 91.9339 91.6642 90.8676 90.6606 89.7721M2.11341 119.635C2.86417 124.184 7.42084 128.356 13.4268 132.914C20.1046 137.983 28.574 143.528 35.5957 150.599C37.8222 152.857 39.8984 155.268 41.8545 157.721"
      stroke="black"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Circle cx={50.89} cy={116.556} r={6.494} fill="#0F0000" />
    <Circle cx={65.583} cy={101.863} r={6.494} fill="#0F0000" />
    <Line
      x1={34.315}
      y1={110.114}
      x2={53.287}
      y2={110.114}
      stroke="black"
      strokeWidth={4}
      strokeLinecap="round"
    />
    <Line
      x1={63.04}
      y1={83.18}
      x2={68.0}
      y2={101.7}
      stroke="black"
      strokeWidth={4}
      strokeLinecap="round"
    />
  </Svg>
);

/** Wooden table */
const Table: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Svg width={w} height={h} viewBox="0 0 124 60" fill="none">
    <Path
      d="M62 33.657C96.2417 33.657 124 26.1227 124 16.8285C124 7.53439 96.2417 0 62 0C27.7583 0 0 7.53439 0 16.8285C0 26.1227 27.7583 33.657 62 33.657Z"
      fill="#3E281B"
    />
    <Path
      d="M62 60C96.2417 60 124 52.4656 124 43.1715V16.8285C124 26.1227 96.2417 33.657 62 33.657C27.7583 33.657 0 26.1227 0 16.8285V43.1715C0 52.4656 27.7583 60 62 60Z"
      fill="#231F14"
    />
    <Path
      d="M62 33.657C96.2417 33.657 124 26.1227 124 16.8285C124 7.53439 96.2417 0 62 0C27.7583 0 0 7.53439 0 16.8285C0 26.1227 27.7583 33.657 62 33.657Z"
      stroke="black"
      strokeWidth={1.73}
    />
    <Path
      d="M62 60C96.2417 60 124 52.4656 124 43.1715V16.8285C124 26.1227 96.2417 33.657 62 33.657C27.7583 33.657 0 26.1227 0 16.8285V43.1715C0 52.4656 27.7583 60 62 60Z"
      stroke="black"
      strokeWidth={1.73}
    />
  </Svg>
);

/** Small peach blob — gradient + inner shadow to match hero blob */
const PeachBlobSmall: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const bodyPath =
    "M19.0703 1.25C19.8799 0.728851 20.5178 0.58218 21.0449 0.713867L21.0527 0.71582C21.6194 0.850187 22.2423 1.33462 22.9727 2.23633C23.6909 3.12312 24.4292 4.30307 25.2646 5.66602C26.8121 8.19064 28.6563 11.2848 31.1777 13.834L31.6914 14.3359C34.4918 16.9854 38.0524 18.9045 40.8975 20.4932C42.3382 21.2977 43.5784 22.008 44.4932 22.6914C45.436 23.3958 45.8766 23.9613 45.9648 24.4277L45.9658 24.4297C46.0447 24.8437 45.8607 25.396 45.1953 26.1611C44.545 26.9089 43.5516 27.7248 42.3252 28.6299C39.9185 30.406 36.6366 32.5004 33.9014 34.873C31.1585 37.2524 28.8827 39.9734 26.9873 41.9648C26.0243 42.9766 25.1676 43.7937 24.3779 44.3369C23.5857 44.8818 22.9431 45.0938 22.3877 45.0361C21.8214 44.9692 21.1934 44.6093 20.4609 43.9063C19.7329 43.2075 18.9766 42.2432 18.1455 41.1045C16.5067 38.8591 14.6072 35.9676 12.2422 33.5693L12.2402 33.5684L11.7891 33.124C9.50466 30.9314 6.86043 29.1489 4.75977 27.5791C3.62415 26.7304 2.65352 25.9493 1.93555 25.1875C1.2141 24.422 0.805777 23.736 0.698242 23.085C0.592495 22.4443 0.759391 21.7223 1.21973 20.874C1.68094 20.0241 2.40522 19.1054 3.32227 18.0977C4.23717 17.0923 5.31392 16.03 6.46777 14.8838C7.61635 13.7429 8.8349 12.5253 10.0078 11.2285C11.1803 9.93223 12.3056 8.55932 13.373 7.25488C14.4451 5.94471 15.4551 4.70763 16.416 3.65625C17.381 2.60044 18.2635 1.7694 19.0703 1.25Z";
  return (
    <Svg width={w} height={h} viewBox="0 0 46.6507 45.7131" fill="none">
      <Defs>
        <LinearGradient id="peachSmGrad" x1="0.25" y1="0" x2="0.75" y2="1">
          <Stop offset="0" stopColor="#F0A090" stopOpacity={1} />
          <Stop offset="1" stopColor="#E07A5F" stopOpacity={1} />
        </LinearGradient>
        <ClipPath id="peachSmClip">
          <Path d={bodyPath} />
        </ClipPath>
      </Defs>
      <Path
        d={bodyPath}
        fill="url(#peachSmGrad)"
        stroke="black"
        strokeWidth={1.34}
      />
      <G clipPath="url(#peachSmClip)">
        <Path d={bodyPath} fill="black" opacity={0.1} x={1} y={2} />
      </G>
    </Svg>
  );
};

/** Sweat droplet */
const SweatDrop: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Svg width={w} height={h} viewBox="0 0 5.491 8.2365" fill="none">
    <Path
      d="M0 2.7455C0 1.2292 1.2292 0 2.7455 0C4.2618 0 5.491 1.2292 5.491 2.7455C5.491 3.23207 5.36443 3.68908 5.14241 4.0854L2.74551 8.2365L0.348596 4.0854C0.126575 3.68908 0 3.23207 0 2.7455Z"
      fill="#64AFFF"
    />
  </Svg>
);

/** Dollar bill */
const DollarBill: React.FC<{ w: number; h: number }> = ({ w, h }) => (
  <Svg width={w} height={h} viewBox="0 0 36.5 16.85" fill="none">
    <Rect
      x={0.37}
      y={0.37}
      width={35.75}
      height={16.1}
      fill="#40916C"
      stroke="black"
      strokeWidth={0.75}
    />
    <Ellipse
      cx={18.25}
      cy={8.42}
      rx={4.5}
      ry={6.3}
      fill="#71B797"
      opacity={0.6}
    />
    <Circle cx={18.25} cy={4.2} r={2.5} fill="#D9D9D9" opacity={0.5} />
  </Svg>
);

// ============================================================
//  MAIN SCENE COMPONENT
// ============================================================

export const Onboarding2Scene: React.FC<Onboarding2SceneProps> = ({
  scrollX,
  pageWidth,
  size,
}) => {
  const progress = useDerivedValue(() => scrollX.value / pageWidth);

  const sf = size / FIGMA_W;
  const fx = (x: number) => x * sf;
  const fy = (y: number) => (y - FIGMA_Y_OFF) * sf;
  const fd = (d: number) => d * sf;

  const sceneW = size;
  const sceneH = fd(580);

  // Pre-computed for worklets (can't call fd/fx/fy on UI thread)
  const slideInOffset = fd(80);
  const fightRiseOffset = fd(60);

  // ---- Animated styles (scroll-driven) ----

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.3, 0.8, 1, 1.3, 1.8],
      [0, 0.6, 1, 0.6, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const phoneTrenchAnim = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0.3, 0.9],
          [slideInOffset, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const peachBgAnim = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.4, 0.9],
      [0, 0.46],
      Extrapolation.CLAMP,
    ),
  }));

  const fightAnim = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.5, 0.95],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [0.5, 1.0],
          [fightRiseOffset, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const textAnim = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.6, 1.0],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // ---- Render ----

  const iconSz = fd(26);

  return (
    <Animated.View
      style={[styles.scene, { width: sceneW, height: sceneH }, sceneStyle]}
    >
      {/* Phone trenchcoat — Figma: (182, 236), 182x185 */}
      <Animated.View
        style={[styles.abs, { left: fx(182), top: fy(260) }, phoneTrenchAnim]}
      >
        <View style={{ transform: [{ scaleX: -1 }] }}>
          <PhoneTrenchcoat w={fd(182)} h={fd(185)} />
        </View>

        {/* App icons in pocket */}
        <View
          style={[
            styles.abs,
            {
              left: fd(14.88),
              top: fd(76.71),
              width: iconSz,
              height: iconSz,
              transform: [{ rotate: "-30deg" }],
            },
          ]}
        >
          <View
            style={[
              styles.appIcon,
              { width: iconSz, height: iconSz, backgroundColor: "#000" },
            ]}
          >
            <Svg width={iconSz * 0.6} height={iconSz * 0.6} viewBox="0 0 24 24">
              <Path
                d="M16.6 5.82s.51.64 1.74.98V8.5c-1.29-.02-2.15-.38-2.74-.79V12c0 3.5-3.78 5.74-6.63 3.86-1.82-1.2-2.5-3.5-1.65-5.54.85-2.04 3.1-3.14 5.28-2.62v1.8c-.44-.12-1.52-.26-2.35.46-.83.72-1.02 1.96-.39 2.82.63.86 1.83 1.08 2.7.46.48-.34.74-.93.74-1.55V2h1.8c.16 1.68 1.22 3.15 2.5 3.82"
                fill="white"
              />
            </Svg>
          </View>
        </View>

        <View
          style={[
            styles.abs,
            {
              left: fd(42.36),
              top: fd(76.71),
              width: fd(27),
              height: iconSz,
              transform: [{ rotate: "15deg" }],
            },
          ]}
        >
          <View
            style={[
              styles.appIcon,
              { width: fd(27), height: iconSz, backgroundColor: "#FFF" },
            ]}
          >
            <Svg
              width={iconSz * 0.65}
              height={iconSz * 0.45}
              viewBox="0 0 28 20"
            >
              <Rect width={28} height={20} rx={5} fill="#FF0000" />
              <Path d="M11 5.5V14.5L19 10L11 5.5Z" fill="white" />
            </Svg>
          </View>
        </View>

        <View
          style={[
            styles.abs,
            {
              left: fd(35.49),
              top: fd(97.32),
              width: fd(24),
              height: fd(24),
              transform: [{ rotate: "-15deg" }],
            },
          ]}
        >
          <View
            style={[
              styles.appIcon,
              { width: fd(24), height: fd(24), backgroundColor: "#E1306C" },
            ]}
          >
            <Svg
              width={fd(24) * 0.55}
              height={fd(24) * 0.55}
              viewBox="0 0 24 24"
            >
              <Rect
                x={2}
                y={2}
                width={20}
                height={20}
                rx={5}
                stroke="white"
                strokeWidth={2}
                fill="none"
              />
              <Circle
                cx={12}
                cy={12}
                r={5}
                stroke="white"
                strokeWidth={2}
                fill="none"
              />
              <Circle cx={18} cy={6} r={1.5} fill="white" />
            </Svg>
          </View>
        </View>

        <View
          style={[
            styles.abs,
            {
              left: fd(13.74),
              top: fd(100.76),
              width: fd(23),
              height: fd(23),
              transform: [{ rotate: "15deg" }],
            },
          ]}
        >
          <View
            style={[
              styles.appIcon,
              { width: fd(23), height: fd(23), backgroundColor: "#000" },
            ]}
          >
            <Svg width={fd(23) * 0.5} height={fd(23) * 0.5} viewBox="0 0 24 24">
              <Path
                d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
                fill="white"
              />
            </Svg>
          </View>
        </View>

        {/* Inside pocket overlay — covers app icons */}
        <View
          style={[
            styles.abs,
            {
              left: fd(8.01),
              top: fd(116.79),
              transform: [{ scaleY: -1 }, { rotate: "180deg" }],
            },
          ]}
        >
          <InsidePocket w={fd(61)} h={fd(38)} />
        </View>
      </Animated.View>

      {/* Mid text */}
      <Animated.View
        style={[
          styles.abs,
          { left: 0, right: 0, top: fy(472), alignItems: "center" },
          textAnim,
        ]}
      >
        <Text style={styles.midText}>
          {"Fight against your bad habits,\nstarting with as little as "}
          <Text style={styles.midTextBold}>$1.</Text>
        </Text>
      </Animated.View>

      {/* Bottom fight zone */}
      <Animated.View
        style={[
          styles.abs,
          {
            left: 0,
            top: 0,
            width: sceneW,
            height: sceneH,
            overflow: "visible",
          },
          fightAnim,
        ]}
      >
        {/* Phone fight shadow */}
        <Animated.View
          style={[
            styles.abs,
            {
              left: fx(281.74),
              top: fy(491),
              width: fd(173),
              height: fd(250),
              transform: [{ rotate: "13.37deg" }],
            },
            peachBgAnim,
          ]}
        >
          <Svg
            width={fd(173)}
            height={fd(250)}
            viewBox="0 0 132 236"
            fill="none"
          >
            <Ellipse
              cx={66}
              cy={118}
              rx={62}
              ry={114}
              fill="black"
              opacity={0.46}
            />
          </Svg>
        </Animated.View>

        {/* Peach fight shadow */}
        <Animated.View
          style={[
            styles.abs,
            {
              left: fx(11.75),
              top: fy(646.31),
              width: fd(180.44),
              height: fd(180.44),
              transform: [{ rotate: "-45deg" }],
            },
            peachBgAnim,
          ]}
        >
          <Svg
            width={fd(180.44)}
            height={fd(180.44)}
            viewBox="0 0 98 173"
            fill="none"
          >
            <Ellipse
              cx={49}
              cy={86.5}
              rx={45}
              ry={82.5}
              fill="black"
              opacity={0.46}
            />
          </Svg>
        </Animated.View>

        {/* Table */}
        <View style={[styles.abs, { left: fx(39), top: fy(544) }]}>
          <Table w={fd(124)} h={fd(60)} />
        </View>

        {/* Phone on table (depth + face layers) */}
        <View
          style={[
            styles.abs,
            {
              left: fx(119),
              top: fy(520),
              width: fd(27),
              height: fd(43),
              backgroundColor: "#485291",
              borderRadius: fd(5),
              borderWidth: 1,
              borderColor: "black",
            },
          ]}
        />
        <View
          style={[
            styles.abs,
            {
              left: fx(117),
              top: fy(520),
              width: fd(25),
              height: fd(43),
              backgroundColor: "#8F9EFF",
              borderRadius: fd(5),
              borderWidth: 1,
              borderColor: "black",
            },
          ]}
        />

        {/* Phone table pixel face */}
        <View
          style={[
            styles.abs,
            {
              left: fx(120),
              top: fy(520),
              width: fd(19.5),
              height: fd(21.5),
              transform: [{ rotate: "15deg" }],
            },
          ]}
        >
          <Svg
            width={fd(19.5)}
            height={fd(21.5)}
            viewBox="0 0 15.42 18.14"
            fill="none"
          >
            <Rect x={3} y={4} width={3.5} height={3.5} fill="black" />
            <Rect x={9} y={4} width={3.5} height={3.5} fill="black" />
            <Rect x={2} y={11} width={3} height={3} fill="black" />
            <Rect x={5} y={13} width={3} height={3} fill="black" />
            <Rect x={8} y={13} width={3} height={3} fill="black" />
            <Rect x={11} y={11} width={3} height={3} fill="black" />
          </Svg>
        </View>

        {/* Small peach blob */}
        <View style={[styles.abs, { left: fx(22), top: fy(556.96) }]}>
          <PeachBlobSmall w={fd(47)} h={fd(46)} />
        </View>

        {/* Dollar bills */}
        <View
          style={[
            styles.abs,
            { left: fx(83), top: fy(530), transform: [{ rotate: "165deg" }] },
          ]}
        >
          <DollarBill w={fd(40)} h={fd(26)} />
        </View>
        <View
          style={[
            styles.abs,
            {
              left: fx(78),
              top: fy(556),
              transform: [{ rotate: "-165deg" }],
            },
          ]}
        >
          <DollarBill w={fd(40)} h={fd(26)} />
        </View>

        {/* $1 labels */}
        <View
          style={[
            styles.abs,
            { left: fx(87), top: fy(540), transform: [{ rotate: "-15deg" }] },
          ]}
        >
          <Text style={[styles.dollarText, { fontSize: fd(8) }]}>$1</Text>
        </View>
        <View
          style={[
            styles.abs,
            { left: fx(109), top: fy(534), transform: [{ rotate: "-15deg" }] },
          ]}
        >
          <Text style={[styles.dollarText, { fontSize: fd(8) }]}>$1</Text>
        </View>
        <View
          style={[
            styles.abs,
            { left: fx(82), top: fy(561), transform: [{ rotate: "15deg" }] },
          ]}
        >
          <Text style={[styles.dollarText, { fontSize: fd(8) }]}>$1</Text>
        </View>
        <View
          style={[
            styles.abs,
            { left: fx(104), top: fy(567), transform: [{ rotate: "15deg" }] },
          ]}
        >
          <Text style={[styles.dollarText, { fontSize: fd(8) }]}>$1</Text>
        </View>

        {/* Sweat drop */}
        <View
          style={[
            styles.abs,
            {
              left: fx(72.44),
              top: fy(575.96),
              transform: [{ rotate: "165deg" }],
            },
          ]}
        >
          <SweatDrop w={fd(7.4)} h={fd(9.4)} />
        </View>

        {/* Phone fight */}
        <View
          style={[
            styles.abs,
            { left: fx(172.65), top: fy(521.31), overflow: "visible" },
          ]}
        >
          <PhoneFight w={fd(190)} h={fd(190)} />
        </View>

        {/* Peach fight — rotated 39.12deg inside centering container */}
        <View
          style={[
            styles.abs,
            {
              left: fx(17),
              top: fy(531.27),
              width: fd(259.9),
              height: fd(265.7),
              justifyContent: "center",
              alignItems: "center",
              overflow: "visible",
            },
          ]}
        >
          <View style={{ transform: [{ rotate: "39.12deg" }] }}>
            <PeachFight w={fd(160)} h={fd(211)} />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  scene: {
    alignSelf: "center",
    overflow: "visible",
  },
  abs: {
    position: "absolute",
  },
  appIcon: {
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  midText: {
    fontSize: 16,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 22,
    fontFamily: Platform.OS === "ios" ? "ui-rounded" : undefined,
    fontWeight: "400",
  },
  midTextBold: {
    fontWeight: "800",
    fontFamily: Platform.OS === "ios" ? "ui-rounded" : undefined,
  },
  dollarText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "SF Compact Rounded" : undefined,
    textAlign: "center",
  },
});
