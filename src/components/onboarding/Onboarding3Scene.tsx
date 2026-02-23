/**
 * Onboarding3Scene — "Earn real f*ckin money."
 *
 * Shows the dead phone, pot of gold with coins, bitcoins,
 * dollar signs, halo, and sparkle effects.
 *
 * The hero blob (from BlobsScene) acts as the peach character
 * sitting in the pot — this scene draws everything AROUND it.
 *
 * All SVG artwork uses EXACT paths from Figma exports.
 * Positions mapped from Figma 400x844. Scaled by sf = size / 400.
 */

import React from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { DebugLayoutProvider, DraggableGroup } from "./DebugLayoutEditor";

// ── Set to true to enable drag-to-position debug mode ──
const DEBUG_LAYOUT = false;
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { SvgXml } from "react-native-svg";

const FIGMA_W = 400;
const FIGMA_Y_OFF = 200;

interface Onboarding3SceneProps {
  scrollX: SharedValue<number>;
  pageWidth: number;
  size: number;
}

// ============================================================
//  EXACT FIGMA SVG STRINGS
//  Filters stripped (not supported by react-native-svg).
//  CSS variables replaced with fallback color values.
// ============================================================

/** Dead phone — exact Figma export (filter stripped) */
const DEAD_PHONE_SVG = `<svg viewBox="0 0 137.711 186.026" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<g>
<path d="M26.9861 52.4094C28.2839 42.9094 32.8215 34.6027 39.5663 29.3801L47.9396 22.8964L63.698 10.6943C72.2063 4.10606 82.0034 3.55313 90.5265 7.23481C97.1445 10.0935 102.994 15.5053 106.876 22.6272C110.242 28.8024 112.129 36.2632 111.754 44.4602L108.281 120.408C107.714 132.79 104.745 144.373 95.4594 149.847L63.1148 168.383C51.4836 175.24 37.0312 171.144 28.034 162.445C19.8136 154.497 14.7638 141.881 16.6693 127.932L26.9861 52.4094Z" fill="#8F9EFF"/>
<path d="M111.754 44.4602L108.281 120.408C107.714 132.79 104.745 144.373 95.4594 149.847L63.1148 168.383C51.4836 175.24 37.0312 171.144 28.034 162.445C41.7165 180.78 51.5458 183.461 73.1963 173.707L104.11 155.413L104.172 155.369C113.496 148.613 118.743 144.811 118.386 129.921L121.101 53.2597C121.352 24.0739 113.608 14.7926 90.5265 7.23481C97.1445 10.0935 102.994 15.5053 106.876 22.6272C110.242 28.8024 112.129 36.2632 111.754 44.4602Z" fill="black"/>
<path d="M28.034 162.445C37.0312 171.144 51.4836 175.24 63.1148 168.383L95.4594 149.847C104.745 144.373 107.714 132.79 108.281 120.408L111.754 44.4602C112.129 36.2632 110.242 28.8024 106.876 22.6272C102.994 15.5053 97.1445 10.0935 90.5265 7.23481M28.034 162.445C19.8136 154.497 14.7638 141.881 16.6693 127.932L26.9861 52.4094C28.2839 42.9094 32.8215 34.6027 39.5663 29.3801L47.9396 22.8964L63.698 10.6943C72.2063 4.10606 82.0034 3.55313 90.5265 7.23481M28.034 162.445C41.7165 180.78 51.5458 183.461 73.1963 173.707L104.11 155.413M104.11 155.413L104.172 155.369M104.11 155.413C104.131 155.399 104.151 155.384 104.172 155.369M90.5265 7.23481C113.608 14.7926 121.352 24.0739 121.101 53.2597L118.386 129.921C118.743 144.811 113.496 148.613 104.172 155.369" stroke="black" stroke-width="2.46021"/>
</g>
<rect x="47.3865" y="77.9195" width="4.5548" height="4.5548" transform="rotate(-7.24599 47.3865 77.9195)" fill="black"/>
<rect x="51.2182" y="72.9017" width="4.5548" height="4.5548" transform="rotate(-7.24599 51.2182 72.9017)" fill="black"/>
<rect x="35.9511" y="32.0051" width="3.21119" height="3.21119" fill="black"/>
<rect x="39.1627" y="32.0047" width="3.21119" height="3.21119" fill="black"/>
<rect x="39.1626" y="34.1457" width="3.21119" height="3.21119" fill="black"/>
<rect x="42.3737" y="33.0752" width="3.21119" height="3.21119" fill="black"/>
<rect x="42.3075" y="44.8954" width="3.21119" height="3.21119" fill="black"/>
<rect x="42.5024" y="38.3557" width="3.21119" height="3.21119" fill="black"/>
<rect x="45.0793" y="39.7416" width="3.21119" height="3.21119" fill="black"/>
<rect x="44.6787" y="31.2206" width="3.21119" height="3.21119" fill="black"/>
<rect x="44.1915" y="47.5698" width="3.21119" height="3.21119" fill="black"/>
<rect x="40.2329" y="37.357" width="3.21119" height="3.21119" fill="black"/>
<rect x="38.0921" y="40.5682" width="3.21119" height="3.21119" fill="black"/>
<rect x="40.2327" y="43.7796" width="3.21119" height="3.21119" fill="black"/>
<rect x="24.4976" y="152.637" width="3.27726" height="3.27726" fill="black"/>
<rect x="23.9363" y="153.818" width="3.27726" height="3.27726" fill="black"/>
<rect x="26.6821" y="149.36" width="3.27726" height="3.27726" fill="black"/>
<rect x="28.8671" y="151.545" width="3.27726" height="3.27726" fill="black"/>
<rect x="31.0522" y="149.36" width="3.27726" height="3.27726" fill="black"/>
<rect x="31.8645" y="155.726" width="3.27726" height="3.27726" fill="black"/>
<rect x="29.0913" y="158.671" width="3.27726" height="3.27726" fill="black"/>
<rect x="34.3292" y="152.638" width="3.27726" height="3.27726" fill="black"/>
<rect x="36.5138" y="150.453" width="3.27726" height="3.27726" fill="black"/>
<rect x="38.6993" y="147.175" width="3.27726" height="3.27726" fill="black"/>
<rect x="37.6064" y="143.898" width="3.27726" height="3.27726" fill="black"/>
<rect x="39.7912" y="140.621" width="3.27726" height="3.27726" fill="black"/>
<rect x="41.976" y="141.713" width="3.27726" height="3.27726" fill="black"/>
<rect x="44.1607" y="139.529" width="3.27726" height="3.27726" fill="black"/>
<rect x="47.4383" y="141.713" width="3.27726" height="3.27726" fill="black"/>
<rect x="103.651" y="101.378" width="3.36943" height="3.36943" fill="black"/>
<rect x="105.484" y="104.087" width="3.36943" height="3.36943" fill="black"/>
<rect x="101.404" y="103.625" width="3.36943" height="3.36943" fill="black"/>
<rect x="98.0349" y="101.378" width="3.36943" height="3.36943" fill="black"/>
<rect x="95.7885" y="103.625" width="3.36943" height="3.36943" fill="black"/>
<rect x="96.9119" y="106.994" width="3.36943" height="3.36943" fill="black"/>
<rect x="93.542" y="109.241" width="3.36943" height="3.36943" fill="black"/>
<rect x="95.7887" y="112.61" width="3.36943" height="3.36943" fill="black"/>
<rect x="93.5423" y="114.856" width="3.36943" height="3.36943" fill="black"/>
<rect x="93.5425" y="112.609" width="3.36943" height="3.36943" fill="black"/>
<rect x="91.2962" y="145.181" width="3.36943" height="3.36943" fill="black"/>
<rect x="93.867" y="145.937" width="3.36943" height="3.36943" fill="black"/>
<rect x="89.0497" y="144.058" width="3.36943" height="3.36943" fill="black"/>
<rect x="87.9269" y="141.811" width="3.36943" height="3.36943" fill="black"/>
<rect x="89.0496" y="138.442" width="3.36943" height="3.36943" fill="black"/>
<rect x="85.6801" y="137.319" width="3.36943" height="3.36943" fill="black"/>
<rect x="83.434" y="133.949" width="3.36943" height="3.36943" fill="black"/>
<rect x="85.6801" y="130.58" width="3.36943" height="3.36943" fill="black"/>
<rect x="83.4341" y="127.21" width="3.36943" height="3.36943" fill="black"/>
<rect x="84.2611" y="37.7824" width="4.36256" height="4.36256" fill="black"/>
<rect x="85.7152" y="34.8741" width="4.36256" height="4.36256" fill="black"/>
<rect x="87.1694" y="42.1451" width="4.36256" height="4.36256" fill="black"/>
<rect x="91.5317" y="39.2369" width="4.36256" height="4.36256" fill="black"/>
<rect x="94.4402" y="42.1453" width="4.36256" height="4.36256" fill="black"/>
<rect x="92.9856" y="46.5082" width="4.36256" height="4.36256" fill="black"/>
<rect x="92.9856" y="46.5082" width="4.36256" height="4.36256" fill="black"/>
<rect x="69.9102" y="11.1462" width="3.20616" height="3.20616" fill="black"/>
<rect x="68.1562" y="7.98602" width="3.20616" height="3.20616" fill="black"/>
<rect x="67.7725" y="13.2839" width="3.20616" height="3.20616" fill="black"/>
<rect x="69.9098" y="15.4216" width="3.20616" height="3.20616" fill="black"/>
<rect x="66.7037" y="17.5589" width="3.20616" height="3.20616" fill="black"/>
<rect x="68.841" y="19.6965" width="3.20616" height="3.20616" fill="black"/>
<rect x="66.7038" y="21.8337" width="3.20616" height="3.20616" fill="black"/>
<rect x="72.0474" y="20.765" width="3.20616" height="3.20616" fill="black"/>
<rect x="74.1848" y="21.8338" width="3.20616" height="3.20616" fill="black"/>
<rect x="75.2528" y="25.0406" width="3.20616" height="3.20616" fill="black"/>
<rect x="78.4595" y="22.9027" width="3.20616" height="3.20616" fill="black"/>
<rect x="80.5971" y="18.6277" width="3.20616" height="3.20616" fill="black"/>
<rect x="80.5972" y="20.765" width="3.20616" height="3.20616" fill="black"/>
<rect x="65.6348" y="25.0402" width="3.20616" height="3.20616" fill="black"/>
<rect x="65.635" y="28.246" width="3.20616" height="3.20616" fill="black"/>
<rect x="68.8409" y="27.1776" width="3.20616" height="3.20616" fill="black"/>
<rect x="70.9789" y="30.3832" width="3.20616" height="3.20616" fill="black"/>
<rect x="70.9789" y="30.3832" width="3.20616" height="3.20616" fill="black"/>
<rect x="97.3485" y="39.2369" width="4.36256" height="4.36256" fill="black"/>
<rect x="100.257" y="36.3287" width="4.36256" height="4.36256" fill="black"/>
<rect x="98.8031" y="31.9655" width="4.36256" height="4.36256" fill="black"/>
<rect x="101.711" y="29.0574" width="4.36256" height="4.36256" fill="black"/>
<rect x="98.8033" y="26.1486" width="4.36256" height="4.36256" fill="black"/>
<rect x="101.711" y="21.7868" width="4.36256" height="4.36256" fill="black"/>
<rect x="49.6231" y="138.436" width="3.27726" height="3.27726" fill="black"/>
<rect x="51.8079" y="136.251" width="3.27726" height="3.27726" fill="black"/>
<rect x="49.6228" y="130.789" width="3.27726" height="3.27726" fill="black"/>
<rect x="51.8081" y="132.974" width="3.27726" height="3.27726" fill="black"/>
<rect x="36.5142" y="129.697" width="3.27726" height="3.27726" fill="black"/>
<rect x="41.976" y="141.713" width="3.27726" height="3.27726" fill="black"/>
<rect x="37.6066" y="137.343" width="3.27726" height="3.27726" fill="black"/>
<rect x="38.6994" y="132.973" width="3.27726" height="3.27726" fill="black"/>
<rect x="39.7914" y="135.159" width="3.27726" height="3.27726" fill="black"/>
<rect x="43.4345" y="82.9531" width="4.5548" height="4.5548" transform="rotate(-7.24599 43.4345 82.9531)" fill="black"/>
<rect x="52.3522" y="81.8187" width="4.5548" height="4.5548" transform="rotate(-7.24599 52.3522 81.8187)" fill="black"/>
<rect x="42.3012" y="74.0352" width="4.5548" height="4.5548" transform="rotate(-7.24599 42.3012 74.0352)" fill="black"/>
<rect x="68.9896" y="70.6421" width="4.5548" height="4.5548" transform="rotate(-7.24599 68.9896 70.6421)" fill="black"/>
<rect x="70.1232" y="79.5595" width="4.5548" height="4.5548" transform="rotate(-7.24599 70.1232 79.5595)" fill="black"/>
<rect x="74.0149" y="74.534" width="4.5548" height="4.5548" transform="rotate(-7.24599 74.0149 74.534)" fill="black"/>
<rect x="77.9066" y="69.5087" width="4.5548" height="4.5548" transform="rotate(-7.24599 77.9066 69.5087)" fill="black"/>
<rect x="79.0406" y="78.4255" width="4.5548" height="4.5548" transform="rotate(-7.24599 79.0406 78.4255)" fill="black"/>
<rect width="7.65036" height="6.3753" transform="matrix(0.992014 -0.12613 -0.12613 -0.992014 48.2297 110.556)" fill="black"/>
<rect width="7.65036" height="7.01283" transform="matrix(0.992014 -0.12613 -0.12613 -0.992014 55.0149 103.267)" fill="black"/>
<rect width="7.65036" height="7.01283" transform="matrix(0.992014 -0.12613 -0.12613 -0.992014 62.6043 102.302)" fill="black"/>
<rect width="7.65036" height="7.01283" transform="matrix(0.992014 -0.12613 -0.12613 -0.992014 70.1936 101.337)" fill="black"/>
<rect width="7.65036" height="6.3753" transform="matrix(0.992014 -0.12613 -0.12613 -0.992014 78.5871 106.696)" fill="black"/>
<rect x="24.197" y="82.715" width="3.77978" height="3.77978" fill="black"/>
<rect x="26.9887" y="85.8211" width="3.77978" height="3.77978" fill="black"/>
<rect x="29.5089" y="89.6004" width="3.77978" height="3.77978" fill="black"/>
<rect x="32.0288" y="93.3802" width="3.77978" height="3.77978" fill="black"/>
<rect x="29.5088" y="94.6403" width="3.77978" height="3.77978" fill="black"/>
<rect x="30.7686" y="95.9003" width="3.77978" height="3.77978" fill="black"/>
<rect x="28.2489" y="99.68" width="3.77978" height="3.77978" fill="black"/>
<rect x="30.7686" y="102.2" width="3.77978" height="3.77978" fill="black"/>
<rect x="29.5086" y="105.98" width="3.77978" height="3.77978" fill="black"/>
<rect x="33.2881" y="109.76" width="3.77978" height="3.77978" fill="black"/>
<rect x="33.2881" y="109.76" width="3.77978" height="3.77978" fill="black"/>
<rect x="33.2881" y="109.76" width="3.77978" height="3.77978" fill="black"/>
<rect x="30.7686" y="113.539" width="3.77978" height="3.77978" fill="black"/>
<rect x="32.0285" y="116.059" width="3.77978" height="3.77978" fill="black"/>
</g>
</svg>`;

/** Phone shadow — exact Figma export (filter stripped, gradient kept) */
const PHONE_SHADOW_SVG = `<svg viewBox="0 0 388 116" fill="none" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="194" cy="54" rx="190" ry="54" fill="url(#paint0_linear_110_241)" fill-opacity="0.28"/>
<defs>
<linearGradient id="paint0_linear_110_241" x1="4" y1="54" x2="384" y2="54" gradientUnits="userSpaceOnUse">
<stop/>
<stop offset="0.495192" stop-color="#666666"/>
</linearGradient>
</defs>
</svg>`;

/**
 * Full peach-blob-in-pot — exact Figma export (filter stripped, eyes removed).
 * Includes the red blob body, brown pot, and combined outline.
 * BlobsScene hero blob overlays on top of this as the animated character.
 */
const BLOB_IN_POT_SVG = `<svg viewBox="0 0 583.561 608.935" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<g>
<path d="M306.315 165.183C343.094 199.981 400.136 215.838 403.88 235.659C407.624 255.26 357.63 278.605 321.071 310.319C309.767 320.125 299.726 330.731 290.623 340.64C270.285 362.778 254.629 381.436 240.024 379.914C234.338 379.263 228.827 375.569 223.2 369.9C207.904 354.487 191.751 324.475 168.887 301.29C166.83 299.219 164.721 297.203 162.574 295.238C131.84 267.114 93.3218 249.374 89.8223 228.171C86.0783 205.487 122.417 179.058 153.691 144.481C184.965 109.904 211.393 66.958 232.536 72.2436C253.899 77.3091 269.756 130.606 306.315 165.183Z" fill="#EC6B6B"/>
<path d="M130.109 366.522C118.568 386.327 116.52 395.272 127.255 404.201C134.225 408.163 141.39 411.01 149.165 412.644C183.512 419.862 229.772 403.415 323.77 354.898C400.097 309.775 425.489 285.829 452.515 244.535C453.931 240.783 455.144 237.303 456.145 234.077C465.261 204.693 456.83 196.384 424.736 196.419L428.467 207.447C437.942 235.785 416.024 261.856 290.623 340.64C270.285 362.778 254.629 381.436 240.024 379.914C234.338 379.263 228.827 375.569 223.2 369.9C168.014 398.687 139.098 391.889 142.966 370.524C134.63 370.208 131.367 366.812 128.355 354.352L130.109 366.522Z" fill="#3E281B"/>
<path d="M452.515 244.535C425.489 285.829 400.097 309.775 323.77 354.898C229.772 403.415 183.512 419.862 149.165 412.644C152.984 513.594 214.067 565.596 297.982 554.055C349.6 546.957 409.856 515.816 470.739 457.236C519.574 411.418 531.8 380.533 527.414 316.419C521.549 292.561 494.933 256.782 456.145 234.077C455.144 237.303 453.931 240.783 452.515 244.535Z" fill="#3E281B"/>
<!-- Eyes: droopy half-circles (content expression) -->
<path d="M 235 200 A 15 15 0 0 1 205 200 L 220 200 Z" fill="black"/>
<path d="M 285 200 A 15 15 0 0 1 255 200 L 270 200 Z" fill="black"/>
<path d="M424.736 196.419L428.467 207.447C437.942 235.785 416.024 261.856 290.623 340.64M424.736 196.419C456.83 196.384 465.261 204.693 456.145 234.077M424.736 196.419C393.56 200.234 380.097 202.997 369.288 209.976M140.973 325.975L156.792 298.576L162.574 295.238M162.574 295.238C164.721 297.203 166.83 299.219 168.887 301.29C191.751 324.475 207.904 354.487 223.2 369.9M162.574 295.238C131.84 267.114 93.3218 249.374 89.8223 228.171C86.0783 205.487 122.417 179.058 153.691 144.481C184.965 109.904 211.393 66.958 232.536 72.2436C253.899 77.3091 269.756 130.606 306.315 165.183C343.094 199.981 400.136 215.838 403.88 235.659C407.624 255.26 357.63 278.605 321.071 310.319C309.767 320.125 299.726 330.731 290.623 340.64M223.2 369.9C228.827 375.569 234.338 379.263 240.024 379.914C254.629 381.436 270.285 362.778 290.623 340.64M223.2 369.9C168.014 398.687 139.098 391.889 142.966 370.524C134.63 370.208 131.367 366.812 128.355 354.352L130.109 366.522C118.568 386.327 116.52 395.272 127.255 404.201C134.225 408.163 141.39 411.01 149.165 412.644M456.145 234.077C455.144 237.303 453.931 240.783 452.515 244.535C425.489 285.829 400.097 309.775 323.77 354.898C229.772 403.415 183.512 419.862 149.165 412.644M456.145 234.077C494.933 256.782 521.549 292.561 527.414 316.419C531.8 380.533 519.574 411.418 470.739 457.236C409.856 515.816 349.6 546.957 297.982 554.055C214.067 565.596 152.984 513.594 149.165 412.644" stroke="black" stroke-width="7.61088"/>
</g>
</g>
</svg>`;

/** Bitcoin coin — exact Figma export (all 3 variants share same paths) */
const BITCOIN_SVG = `<svg viewBox="0 0 61.3772 59.0815" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<g>
<path d="M4.05675 29.1602C4.05675 23.0045 6.03189 17.3101 9.38299 12.6762C-5.83735 28.3992 1.77355 49.7096 15.4731 58.0815C15.4731 58.0815 17.7437 54.2761 18.4803 53.7486C9.87415 48.9303 4.05675 39.7246 4.05675 29.1602Z" fill="#E8C375"/>
<path d="M32.217 6.4947C19.6991 6.4947 9.55141 16.6424 9.55141 29.1603C9.55141 38.5678 15.2828 46.6367 23.4443 50.0657C29.0094 46.7127 34.7863 46.0948 44.0637 48.4871C50.554 44.5003 54.8825 37.3358 54.8825 29.1603C54.8825 16.6424 44.7348 6.4947 32.217 6.4947Z" fill="#FBA43D"/>
<path d="M9.55141 29.1603C9.55141 16.6424 19.6991 6.4947 32.217 6.4947C44.7348 6.4947 54.8825 16.6424 54.8825 29.1603C54.8825 37.3358 50.554 44.5003 44.0637 48.4871C46.0754 49.0058 48.2516 49.6661 50.6259 50.4707C56.5982 45.307 60.3772 37.6749 60.3772 29.1602C60.3772 13.6078 47.7695 1 32.217 1C22.8202 1 14.4985 5.60251 9.38299 12.6762C6.03189 17.3101 4.05675 23.0045 4.05675 29.1602C4.05675 39.7246 9.87415 48.9303 18.4803 53.7486C20.1731 52.2867 21.7995 51.0567 23.4443 50.0657C15.2828 46.6367 9.55141 38.5678 9.55141 29.1603Z" fill="#E8C375"/>
<path d="M15.4731 58.0815C1.77355 49.7096 -5.83735 28.3992 9.38299 12.6762M15.4731 58.0815H1.77355M15.4731 58.0815C15.4731 58.0815 17.7437 54.2761 18.4803 53.7486M9.38299 12.6762C6.03189 17.3101 4.05675 23.0045 4.05675 29.1602C4.05675 39.7246 9.87415 48.9303 18.4803 53.7486M9.38299 12.6762C14.4985 5.60251 22.8202 1 32.217 1C47.7695 1 60.3772 13.6078 60.3772 29.1602C60.3772 37.6749 56.5982 45.307 50.6259 50.4707M18.4803 53.7486C20.1731 52.2867 21.7995 51.0567 23.4443 50.0657M50.6259 50.4707L58.8425 53.7486M50.6259 50.4707C48.2516 49.6661 46.0754 49.0058 44.0637 48.4871M23.4443 50.0657C15.2828 46.6367 9.55141 38.5678 9.55141 29.1603C9.55141 16.6424 19.6991 6.4947 32.217 6.4947C44.7348 6.4947 54.8825 16.6424 54.8825 29.1603C54.8825 37.3358 50.554 44.5003 44.0637 48.4871M23.4443 50.0657C29.0094 46.7127 34.7863 46.0948 44.0637 48.4871" stroke="black" stroke-width="2"/>
</g>
<path d="M31.2694 42.4039L30.5376 39.6728L26.4409 40.7705L25.7091 38.0393L28.4402 37.3075L24.7812 23.6517L22.05 24.3835L21.3182 21.6524L25.4149 20.5547L24.6831 17.8235L27.4143 17.0917L28.1461 19.8229L30.8772 19.091L30.1454 16.3599L32.8766 15.6281L33.6541 18.5299C34.923 18.5314 36.074 18.9122 37.107 19.6721C38.14 20.4321 38.8273 21.4493 39.1688 22.7238C39.3456 23.3839 39.4011 24.0459 39.3351 24.7101C39.2691 25.3742 39.0953 26.0001 38.8137 26.5878C39.7383 26.8523 40.5551 27.3287 41.264 28.0169C41.9728 28.7052 42.4615 29.55 42.7298 30.5514C43.1323 32.0535 42.942 33.4828 42.1589 34.8391C41.3758 36.1954 40.2332 37.0748 38.7311 37.4773L39.4629 40.2085L36.7317 40.9403L35.9999 38.2092L33.2688 38.941L34.0006 41.6721L31.2694 42.4039ZM28.9759 28.3822L34.4383 26.9186C35.1893 26.7174 35.7606 26.2777 36.1522 25.5995C36.5437 24.9213 36.6389 24.2067 36.4376 23.4556C36.2364 22.7046 35.7967 22.1333 35.1185 21.7417C34.4403 21.3502 33.7257 21.2551 32.9746 21.4563L27.5123 22.9199L28.9759 28.3822ZM31.1714 36.5757L37.9993 34.7462C38.7503 34.5449 39.3217 34.1052 39.7132 33.4271C40.1047 32.7489 40.1999 32.0343 39.9986 31.2832C39.7974 30.5321 39.3577 29.9608 38.6795 29.5693C38.0013 29.1778 37.2867 29.0826 36.5357 29.2839L29.7078 31.1134L31.1714 36.5757Z" fill="black"/>
<path d="M46.5856 26.3057C43.3528 29.3365 45.3848 22.4876 42.1322 19.4384C38.8796 16.3891 31.5742 18.2941 34.807 15.2633C38.0399 12.2325 43.2973 12.2475 46.5499 15.2968C49.8024 18.3461 49.8184 23.2749 46.5856 26.3057Z" fill="white" fill-opacity="0.21"/>
</g>
</svg>`;

// ---- Gold coin variants (5 distinct shapes from Figma) ----

/** Standard elliptical coin (most common — coin-26 shape, viewBox 38.16x26.02) */
const GOLD_COIN_STD_SVG = `<svg viewBox="0 0 38.1611 26.0189" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M37.2939 15.4639C37.2937 17.9187 35.4839 20.3249 32.1523 22.168C28.8507 23.9944 24.2305 25.1514 19.0801 25.1514C13.9298 25.1513 9.3103 23.9944 6.00879 22.168C2.67724 20.3249 0.867423 17.9187 0.867188 15.4639V15.2627C1.92618 16.6193 3.41305 17.8069 5.16895 18.7783C8.77301 20.7721 13.6929 21.9784 19.0801 21.9785C24.4674 21.9785 29.388 20.7721 32.9922 18.7783C34.7481 17.8069 36.235 16.6193 37.2939 15.2627V15.4639ZM19.0801 0.867188C24.2304 0.867188 28.8507 2.02419 32.1523 3.85059C35.4841 5.69375 37.2939 8.1007 37.2939 10.5557C37.2939 13.0106 35.4841 15.4176 32.1523 17.2607C28.8507 19.0871 24.2304 20.2441 19.0801 20.2441C13.9299 20.2441 9.31028 19.0871 6.00879 17.2607C2.78096 15.4751 0.98215 13.1601 0.873047 10.7852L0.867188 10.5557L0.873047 10.3252C0.982505 7.95049 2.78132 5.63606 6.00879 3.85059C9.31029 2.02424 13.9299 0.86726 19.0801 0.867188Z" fill="#E8C375" stroke="black" stroke-width="1.7346"/>
</svg>`;

/** Taller elliptical coin (coin-42 shape, viewBox 38.16x29.21) */
const GOLD_COIN_TALL_SVG = `<svg viewBox="0 0 38.1611 29.2141" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M37.2939 17.3623C37.2939 20.2254 35.4228 22.9513 32.1152 25.0059C28.8204 27.0524 24.2135 28.3467 19.0801 28.3467C13.9469 28.3466 9.34066 27.0524 6.0459 25.0059C2.73829 22.9513 0.867198 20.2254 0.867188 17.3623V17.0732C1.9123 18.5632 3.37913 19.8806 5.13086 20.9688C8.74169 23.2116 13.6758 24.5712 19.0801 24.5713C24.4846 24.5713 29.4193 23.2117 33.0303 20.9688C34.782 19.8806 36.2488 18.5632 37.2939 17.0732V17.3623ZM19.0801 0.867188C24.2135 0.867188 28.8204 2.16142 32.1152 4.20801C35.4228 6.26256 37.2939 8.98847 37.2939 11.8516C37.2939 14.7147 35.4228 17.4405 32.1152 19.4951C28.8204 21.5417 24.2135 22.8359 19.0801 22.8359C13.9469 22.8359 9.34066 21.5416 6.0459 19.4951C2.73835 17.4405 0.867188 14.7147 0.867188 11.8516C0.867282 8.98847 2.73831 6.26256 6.0459 4.20801C9.34066 2.16149 13.9469 0.867269 19.0801 0.867188Z" fill="#E8C375" stroke="black" stroke-width="1.7346"/>
</svg>`;

/** Small elliptical coin (coin-48 shape, viewBox 32.92x22.45) */
const GOLD_COIN_SM_SVG = `<svg viewBox="0 0 32.9229 22.4474" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M0.748047 13.166C1.66172 14.3368 2.94366 15.3629 4.45898 16.2012C7.56844 17.9214 11.814 18.9619 16.4619 18.9619C21.1096 18.9618 25.3545 17.9213 28.4639 16.2012C29.9789 15.363 31.2612 14.3375 32.1748 13.167V13.3408C32.1748 15.4588 30.6136 17.5349 27.7393 19.125C24.8909 20.7007 20.9053 21.6992 16.4619 21.6992C12.0184 21.6992 8.03201 20.7008 5.18359 19.125C2.30932 17.5349 0.748057 15.4587 0.748047 13.3408V13.166ZM16.4619 0.748047C20.9053 0.748115 24.8909 1.74654 27.7393 3.32227C30.6135 4.91237 32.1747 6.98856 32.1748 9.10645C32.1748 11.2244 30.6137 13.3014 27.7393 14.8916C24.8909 16.4673 20.9052 17.4648 16.4619 17.4648C12.0184 17.4648 8.03201 16.4674 5.18359 14.8916C2.30916 13.3014 0.748047 11.2244 0.748047 9.10645C0.748147 6.98857 2.30935 4.91237 5.18359 3.32227C8.03201 1.74649 12.0184 0.748047 16.4619 0.748047Z" fill="#E8C375" stroke="black" stroke-width="1.4965"/>
</svg>`;

/** Large elliptical coin (coin-54 shape, viewBox 44x30) */
const GOLD_COIN_LG_SVG = `<svg viewBox="0 0 44 30" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M43 17.8291C43 20.6597 40.9138 23.4354 37.0723 25.5605C33.2655 27.6665 27.9385 29 22 29C16.0615 29 10.7345 27.6665 6.92773 25.5605C3.08619 23.4354 1 20.6597 1 17.8291V17.5977C2.22103 19.1618 3.93535 20.5313 5.95996 21.6514C10.1156 23.9502 15.7884 25.3408 22 25.3408C28.2116 25.3408 33.8844 23.9502 38.04 21.6514C40.0647 20.5313 41.779 19.1618 43 17.5977V17.8291ZM22 1C27.9385 1 33.2655 2.33354 37.0723 4.43945C40.9138 6.56464 43 9.34031 43 12.1709C42.9999 15.0014 40.9137 17.7763 37.0723 19.9014C33.2655 22.0073 27.9386 23.3408 22 23.3408C16.0614 23.3408 10.7345 22.0073 6.92773 19.9014C3.20615 17.8425 1.13173 15.1738 1.00586 12.4355L1 12.1709L1.00586 11.9053C1.13193 9.16712 3.2063 6.49819 6.92773 4.43945C10.7345 2.33354 16.0615 1 22 1Z" fill="#E8C375" stroke="black" stroke-width="2"/>
</svg>`;

/** Circular coin (coin-59 shape, viewBox 44x44) */
const GOLD_COIN_CIRCLE_SVG = `<svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="22" cy="22" r="21" fill="#E8C375" stroke="black" stroke-width="2"/>
</svg>`;

/** Circular coin small (coin-58 shape, viewBox 35x35) */
const GOLD_COIN_CIRCLE_SM_SVG = `<svg viewBox="0 0 35 35" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M17.5 1C26.6127 1 34 8.3873 34 17.5C34 26.6127 26.6127 34 17.5 34C8.3873 34 1 26.6127 1 17.5C1 8.3873 8.3873 1 17.5 1Z" fill="#E8C375" stroke="black" stroke-width="2"/>
</svg>`;

// ---- Stars ----

/** Star variant A (star-02, no stroke) */
const STAR_A_SVG = `<svg viewBox="0 0 12.5223 11.9094" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M6.26117 0L7.73923 4.549H12.5223L8.65272 7.36044L10.1308 11.9094L6.26117 9.09801L2.39155 11.9094L3.86961 7.36044L0 4.549H4.78311L6.26117 0Z" fill="#C2AF86" stroke="black"/>
</svg>`;

/** Star variant B (star-08, with stroke) */
const STAR_B_SVG = `<svg viewBox="0 0 12.5223 11.9094" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.26372 4.70312L7.37603 5.04883H10.9835L8.35845 6.95605L8.06451 7.16992L8.17681 7.51465L9.17974 10.5996L6.55474 8.69336L6.26079 8.47949L5.96685 8.69336L3.34185 10.5996L4.34478 7.51465L4.45708 7.16992L4.16314 6.95605L1.53814 5.04883H5.14654L5.25884 4.70312L6.26079 1.61719L7.26372 4.70312Z" fill="#C2AF86" stroke="black"/>
</svg>`;

/** Star variant C (star-09, slightly taller) */
const STAR_C_SVG = `<svg viewBox="0 0 12.3637 12.6631" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M7.16234 4.98145L7.26976 5.33691H10.9133L8.2346 7.43262L7.96605 7.64355L8.06468 7.9707L9.06761 11.2969L6.49046 9.28027L6.18187 9.03906L5.87327 9.28027L3.29515 11.2969L4.29905 7.9707L4.39769 7.64355L4.12913 7.43262L1.45042 5.33691H5.09398L5.2014 4.98145L6.18187 1.73047L7.16234 4.98145Z" fill="#C2AF86" stroke="black"/>
</svg>`;

const STAR_SVGS = [STAR_A_SVG, STAR_B_SVG, STAR_C_SVG];

// ---- Starlines (orbit rings — black stroke variants) ----

/** Starline small (starlines-01) */
const STARLINE_01_SVG = `<svg viewBox="0 0 73.449 17.8501" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<path d="M73.2054 9.5889C73.2054 12.7012 67.3369 15.4598 58.2997 17.168C70.1246 15.0661 73.6928 13.307 73.2054 9.5889Z" fill="black"/>
<path d="M17.2728 17.5074C7.15477 15.8401 0.445646 12.9167 0.445646 9.5889C-0.84867 13.3569 2.72976 15.1425 17.2728 17.5074Z" fill="black"/>
<path d="M73.2054 9.5889C73.2054 4.40385 56.9176 0.200541 36.8255 0.200541C16.7335 0.200541 0.445646 4.40385 0.445646 9.5889M73.2054 9.5889C73.2054 12.7012 67.3369 15.4598 58.2997 17.168M73.2054 9.5889C73.6928 13.307 70.1246 15.0661 58.2997 17.168M0.445646 9.5889C0.445646 12.9167 7.15477 15.8401 17.2728 17.5074M0.445646 9.5889C-0.84867 13.3569 2.72976 15.1425 17.2728 17.5074M17.8155 17.5951C17.6329 17.5658 17.452 17.5365 17.2728 17.5074M58.2997 17.168C57.4051 17.327 56.4632 17.488 55.4723 17.6519C56.4451 17.5018 57.3885 17.3402 58.2997 17.168Z" stroke="black" stroke-width="0.401082"/>
</g>
</svg>`;

/** Starline medium (starlines-02) */
const STARLINE_02_SVG = `<svg viewBox="0 0 75.9801 18.4652" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<path d="M75.7281 9.91934C75.7281 13.1389 69.6574 15.9926 60.3088 17.7596C72.5411 15.5853 76.2323 13.7656 75.7281 9.91934Z" fill="black"/>
<path d="M17.868 18.1107C7.40133 16.3859 0.461004 13.3618 0.461004 9.91934C-0.877916 13.8172 2.82383 15.6643 17.868 18.1107Z" fill="black"/>
<path d="M75.7281 9.91934C75.7281 4.55561 58.879 0.207452 38.0946 0.207452C17.3101 0.207452 0.461004 4.55561 0.461004 9.91934M75.7281 9.91934C75.7281 13.1389 69.6574 15.9926 60.3088 17.7596M75.7281 9.91934C76.2323 13.7656 72.5411 15.5853 60.3088 17.7596M0.461004 9.91934C0.461004 13.3618 7.40133 16.3859 17.868 18.1107M0.461004 9.91934C-0.877916 13.8172 2.82383 15.6643 17.868 18.1107M18.4294 18.2014C18.2406 18.1711 18.0534 18.1409 17.868 18.1107M60.3088 17.7596C59.3833 17.9241 58.409 18.0906 57.3839 18.2602C58.3903 18.1049 59.3662 17.9378 60.3088 17.7596Z" stroke="black" stroke-width="0.414904"/>
</g>
</svg>`;

/** Starline large (starlines-03) */
const STARLINE_03_SVG = `<svg viewBox="0 0 91.0947 22.1385" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<path d="M90.7927 11.8926C90.7927 15.7526 83.5143 19.174 72.3059 21.2925C86.9716 18.6857 91.3971 16.5039 90.7927 11.8926Z" fill="black"/>
<path d="M21.4225 21.7135C8.87367 19.6456 0.552711 16.0198 0.552711 11.8926C-1.05256 16.5658 3.38557 18.7804 21.4225 21.7135Z" fill="black"/>
<path d="M90.7927 11.8926C90.7927 5.46185 70.5917 0.24872 45.6727 0.24872C20.7536 0.24872 0.552711 5.46185 0.552711 11.8926M90.7927 11.8926C90.7927 15.7526 83.5143 19.174 72.3059 21.2925M90.7927 11.8926C91.3971 16.5039 86.9716 18.6857 72.3059 21.2925M0.552711 11.8926C0.552711 16.0198 8.87367 19.6456 21.4225 21.7135M0.552711 11.8926C-1.05256 16.5658 3.38557 18.7804 21.4225 21.7135M22.0956 21.8222C21.8691 21.7859 21.6448 21.7496 21.4225 21.7135M72.3059 21.2925C71.1964 21.4897 70.0282 21.6894 68.7992 21.8927C70.0058 21.7065 71.1758 21.5061 72.3059 21.2925Z" stroke="black" stroke-width="0.49744"/>
</g>
</svg>`;

/** Starline XL (starlines-04) */
const STARLINE_04_SVG = `<svg viewBox="0 0 108.877 26.4601" fill="none" xmlns="http://www.w3.org/2000/svg">
<g>
<path d="M108.516 14.2141C108.516 18.8276 99.8167 22.9168 86.4204 25.4489C103.949 22.3332 109.238 19.7256 108.516 14.2141Z" fill="black"/>
<path d="M25.6043 25.952C10.6059 23.4805 0.660603 19.147 0.660603 14.2141C-1.25802 19.7995 4.04645 22.4464 25.6043 25.952Z" fill="black"/>
<path d="M108.516 14.2141C108.516 6.52804 84.3716 0.297271 54.5882 0.297271C24.8048 0.297271 0.660603 6.52804 0.660603 14.2141M108.516 14.2141C108.516 18.8276 99.8167 22.9168 86.4204 25.4489M108.516 14.2141C109.238 19.7256 103.949 22.3332 86.4204 25.4489M0.660603 14.2141C0.660603 19.147 10.6059 23.4805 25.6043 25.952M0.660603 14.2141C-1.25802 19.7995 4.04645 22.4464 25.6043 25.952M26.4087 26.082C26.1381 26.0386 25.87 25.9952 25.6043 25.952M86.4204 25.4489C85.0943 25.6846 83.6981 25.9233 82.2292 26.1663C83.6713 25.9437 85.0698 25.7042 86.4204 25.4489Z" stroke="black" stroke-width="0.594543"/>
</g>
</svg>`;

const STARLINE_SVGS = [
  STARLINE_01_SVG,
  STARLINE_02_SVG,
  STARLINE_03_SVG,
  STARLINE_04_SVG,
];

/** Gold glow ellipse (from starlines-07, filter stripped — simple filled ellipse) */
const GOLD_GLOW_SVG = `<svg viewBox="0 0 100.886 25.5303" fill="none" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="50.4432" cy="12.7651" rx="48.4432" ry="10.7651" fill="#94793E"/>
</svg>`;

/** Bright glow ellipse (from starlines-09, filter stripped) */
const BRIGHT_GLOW_SVG = `<svg viewBox="0 0 113.688 31.6042" fill="none" xmlns="http://www.w3.org/2000/svg">
<ellipse cx="56.8442" cy="15.8021" rx="55.8442" ry="14.8021" fill="#EBF22A"/>
</svg>`;

/** White ring glow (from starlines-06, filter stripped — just the stroked ellipse) */
const WHITE_RING_SVG = `<svg viewBox="0 0 115.976 35.284" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M57.9883 4.5C72.8676 4.50003 86.3217 6.02454 96.041 8.48047C100.904 9.70934 104.804 11.1643 107.477 12.7607C110.181 14.3762 111.476 16.0414 111.476 17.6416C111.476 19.2419 110.181 20.9068 107.477 22.5225C104.804 24.1189 100.904 25.5748 96.041 26.8037C86.3217 29.2596 72.8676 30.7842 57.9883 30.7842C43.109 30.7842 29.6549 29.2596 19.9355 26.8037C15.072 25.5748 11.1714 24.119 8.49902 22.5225C5.79483 20.9069 4.5 19.2418 4.5 17.6416C4.50022 16.0414 5.79491 14.3762 8.49902 12.7607C11.1714 11.1643 15.0721 9.70939 19.9355 8.48047C29.6549 6.02456 43.109 4.5 57.9883 4.5Z" stroke="white"/>
</svg>`;

// ============================================================
//  COIN POSITION DATA (from Figma export positions)
// ============================================================

interface CoinPos {
  x: number;
  y: number;
  w: number;
  h: number;
  rot?: number;
  /** Coin variant: 0=std, 1=tall, 2=small, 3=large, 4=circle, 5=circle-sm */
  v?: number;
  /** 'back' = behind pot, 'front' (default) = in front of pot */
  layer?: "back" | "front";
}

// Gold coin positions from Figma — representative set covering full scene
const GOLD_COINS: CoinPos[] = [
  // Bottom-left cluster
  { x: 23, y: 630, w: 44, h: 30, v: 3 },
  { x: 28, y: 635, w: 38, h: 26, v: 0 },
  { x: 63, y: 630, w: 44, h: 30, v: 3 },
  { x: 45, y: 650, w: 44, h: 30, v: 3 },
  { x: 76, y: 652, w: 44, h: 30, v: 3 },
  { x: 20, y: 660, w: 38, h: 26, rot: -15, v: 0 },
  { x: 46, y: 667, w: 38, h: 26, rot: -15, v: 0 },
  { x: 74, y: 671, w: 38, h: 26, rot: -15, v: 0 },
  { x: 96, y: 684, w: 38, h: 26, rot: -15, v: 0 },
  // Center-left
  { x: 99, y: 662, w: 38, h: 26, rot: 15, v: 0 },
  { x: 100, y: 629, w: 38, h: 26, rot: -15, v: 0 },
  { x: 116, y: 642, w: 38, h: 26, rot: -15, v: 0 },
  { x: 133, y: 669, w: 38, h: 26, rot: -15, v: 0 },
  { x: 136, y: 621, w: 38, h: 26, rot: -15, v: 0 },
  { x: 148, y: 637, w: 38, h: 26, v: 0 },
  { x: 151, y: 647, w: 38, h: 26, rot: 15, v: 0 },
  { x: 150, y: 682, w: 38, h: 29, rot: 30, v: 1 },
  { x: 165, y: 663, w: 38, h: 26, rot: -15, v: 0 },
  // Center
  { x: 184, y: 645, w: 38, h: 26, v: 0 },
  { x: 182, y: 685, w: 38, h: 26, v: 0 },
  { x: 199, y: 663, w: 38, h: 26, v: 0 },
  // Center-right
  { x: 215, y: 634, w: 38, h: 26, rot: 30, v: 0 },
  { x: 220, y: 649, w: 38, h: 26, v: 0 },
  { x: 234, y: 668, w: 38, h: 26, v: 0 },
  { x: 243, y: 689, w: 38, h: 26, v: 0 },
  { x: 253, y: 652, w: 38, h: 26, v: 0 },
  { x: 266, y: 675, w: 38, h: 26, v: 0 },
  { x: 272, y: 636, w: 38, h: 26, rot: 30, v: 0 },
  { x: 286, y: 660, w: 38, h: 26, v: 0 },
  { x: 297, y: 682, w: 38, h: 26, v: 0 },
  // Right edge
  { x: 312, y: 628, w: 38, h: 26, v: 0 },
  { x: 314, y: 644, w: 38, h: 26, v: 0 },
  { x: 311, y: 660, w: 38, h: 26, rot: 10, v: 0 },
  { x: 329, y: 668, w: 38, h: 26, v: 0 },
  { x: 335, y: 641, w: 38, h: 26, rot: -30, v: 0 },
  { x: 342, y: 629, w: 38, h: 26, rot: 10, v: 0 },
  // Bottom row
  { x: 118, y: 698, w: 38, h: 26, rot: -15, v: 0 },
  { x: 140, y: 700, w: 38, h: 26, rot: -15, v: 0 },
  { x: 185, y: 698, w: 38, h: 26, v: 0 },
  { x: 218, y: 700, w: 38, h: 26, v: 0 },
  { x: 269, y: 694, w: 38, h: 26, v: 0 },
  // Outlier coins (scattered)
  { x: 346, y: 750, w: 33, h: 22, rot: 15, v: 2 },
  { x: 67, y: 718, w: 33, h: 22, rot: -60, v: 2 },
  { x: 261, y: 733, w: 33, h: 22, rot: -60, v: 2 },
  { x: 7, y: 514, w: 38, h: 26, rot: -135, v: 0 },
  { x: 7, y: 585, w: 38, h: 26, rot: -75, v: 0 },
  { x: 358, y: 548, w: 38, h: 26, rot: -45, v: 0 },
  { x: 310, y: 545, w: 38, h: 26, rot: 15, v: 0 },
  { x: 126, y: 653, w: 38, h: 26, rot: -15, v: 0 },
  { x: 98, y: 619, w: 38, h: 26, v: 0 },
  { x: 129, y: 687, w: 38, h: 26, v: 0 },
  { x: 37, y: 736, w: 33, h: 22, rot: -105, v: 2 },
  { x: 15, y: 775, w: 33, h: 23, rot: 30, v: 2 },
  { x: 302, y: 792, w: 38, h: 29, rot: 15, v: 1 },
  { x: 212, y: 682, w: 38, h: 26, v: 0 },
];

// Group offset for all coins — tweak these to shift coins as a group
const COINS_OFFSET_X = -0.3; // Figma units, positive = right
const COINS_OFFSET_Y = -164.6; // Figma units, negative = up (was -160, debug added -4.6)

// Group offset for bitcoin coins
const BTC_OFFSET_X = 0; // Figma units, positive = right
const BTC_OFFSET_Y = -150; // Figma units, negative = up

/** Map variant index to SVG string */
const COIN_SVG_MAP: Record<number, string> = {
  0: GOLD_COIN_STD_SVG,
  1: GOLD_COIN_TALL_SVG,
  2: GOLD_COIN_SM_SVG,
  3: GOLD_COIN_LG_SVG,
  4: GOLD_COIN_CIRCLE_SVG,
  5: GOLD_COIN_CIRCLE_SM_SVG,
};

// ============================================================
//  MAIN SCENE
// ============================================================

export const Onboarding3Scene: React.FC<Onboarding3SceneProps> = ({
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
  const sceneH = fd(650);

  // Pre-compute values used inside worklets (can't call fd/fx/fy on UI thread)
  const slideInOffset = fd(80);
  const potRiseOffset = fd(60);
  const dollarRiseOffset = fd(30);

  // ---- Animated styles ----

  // Scene visibility: fade in during page 1->2, full at page 2
  const sceneStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [1.3, 1.8, 2, 2.3, 2.8],
      [0, 0.6, 1, 0.6, 0],
      Extrapolation.CLAMP,
    ),
  }));

  // Dead phone slides in from top-right
  const phoneAnim = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [1.3, 2.0],
          [-slideInOffset, 0],
          Extrapolation.CLAMP,
        ),
      },
      {
        translateX: interpolate(
          progress.value,
          [1.3, 2.0],
          [slideInOffset * 0.5, 0],
          Extrapolation.CLAMP,
        ),
      },
      { scale: 0.8 },
    ],
  }));

  // Pot and coins rise from below
  const potAnim = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [1.4, 1.9],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [1.4, 1.0],
          [potRiseOffset, 0],
          Extrapolation.CLAMP,
        ),
      },
      // { rotate: "30deg" },
    ],
  }));

  // Dollar signs float in
  const dollarAnim = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [1.6, 2.0],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateY: interpolate(
          progress.value,
          [1.6, 2.0],
          [dollarRiseOffset, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Halo / glow appears
  const haloAnim = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [1.7, 2.0],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  // Sparkles twinkle in
  const sparkleAnim = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [1.5, 1.9],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <DebugLayoutProvider enabled={DEBUG_LAYOUT} sf={sf} figmaYOff={FIGMA_Y_OFF}>
      <Animated.View
        style={[styles.scene, { width: sceneW, height: sceneH }, sceneStyle]}
      >
        {/* Phone shadow — exact Figma ellipse */}
        <DraggableGroup id="phoneShadow" label="Phone Shadow">
          <Animated.View
            style={[
              styles.abs,
              {
                left: fx(7.7),
                top: fy(208.4),
                width: fd(380),
                height: fd(108),
                zIndex: 3,
              },
              phoneAnim,
            ]}
          >
            <SvgXml xml={PHONE_SHADOW_SVG} width={fd(380)} height={fd(108)} />
          </Animated.View>
        </DraggableGroup>

        {/* Dead phone — rotated 61.73deg, exact Figma SVG */}
        <DraggableGroup id="deadPhone" label="Dead Phone">
          <Animated.View
            style={[
              styles.abs,
              {
                left: fx(80.4),
                top: fy(167.6),
                width: fd(227),
                height: fd(208),
                justifyContent: "center",
                alignItems: "center",
                zIndex: 11,
              },
              phoneAnim,
            ]}
          >
            <View style={{ transform: [{ rotate: "61.73deg" }] }}>
              <SvgXml xml={DEAD_PHONE_SVG} width={fd(138)} height={fd(184)} />
            </View>
          </Animated.View>
        </DraggableGroup>

        {/* Sparkle stars around dead phone — exact Figma positions */}
        <DraggableGroup id="stars" label="Stars">
          <Animated.View
            style={[
              styles.abs,
              {
                left: fx(-11.9),
                top: fy(200 - 54.4),
                zIndex: 19,
                transform: [{ scale: 0.85 }],
              },
              sparkleAnim,
            ]}
          >
            {[
              { x: 237.82, y: 224.98, w: 13, h: 14, v: 2 },
              { x: 247.73, y: 243.12, w: 18, h: 18, v: 1 },
              { x: 267.72, y: 238.23, w: 18, h: 18, v: 1 },
              { x: 282.35, y: 273.35, w: 18, h: 18, v: 1 },
              { x: 305.76, y: 298.22, w: 18, h: 18, v: 1 },
              { x: 301.37, y: 274.81, w: 18, h: 18, v: 1 },
              { x: 324.77, y: 271.88, w: 18, h: 18, v: 1 },
              { x: 296.98, y: 251.4, w: 18, h: 18, v: 0 },
            ].map((sp, i) => (
              <View
                key={`sp-${i}`}
                style={[
                  styles.abs,
                  {
                    left: fx(sp.x),
                    top: fy(sp.y),
                  },
                ]}
              >
                <SvgXml
                  xml={STAR_SVGS[sp.v]}
                  width={fd(sp.w)}
                  height={fd(sp.h)}
                />
              </View>
            ))}
          </Animated.View>
        </DraggableGroup>

        {/* Star lines / orbit rings around dead phone — exact Figma positions */}
        <DraggableGroup id="starlines" label="Starlines">
          <Animated.View
            style={[
              styles.abs,
              {
                left: fx(21.2),
                top: fy(200 - 107.1),
                zIndex: 6,
                transform: [{ rotate: "30deg" }],
              },
              sparkleAnim,
            ]}
          >
            {[
              { x: 245.5, y: 252.86, w: 74.58, h: 25.79, v: 0 },
              { x: 258.11, y: 272.68, w: 77.07, h: 43.59, v: 1 },
              { x: 252.84, y: 234.45, w: 87.12, h: 68.78, v: 2 },
              { x: 241.02, y: 220.68, w: 95.71, h: 93.99, v: 3 },
            ].map((sl, i) => (
              <View
                key={`sl-${i}`}
                style={[
                  styles.abs,
                  {
                    left: fx(sl.x),
                    top: fy(sl.y),
                    width: fd(sl.w),
                    height: fd(sl.h),
                  },
                ]}
              >
                <SvgXml
                  xml={STARLINE_SVGS[sl.v]}
                  width={fd(sl.w)}
                  height={fd(sl.h)}
                />
              </View>
            ))}
          </Animated.View>
        </DraggableGroup>

        {/* Glow ellipses (halo-like effects) — Figma starlines-06/07/09 (filters stripped).
          Positioned near blob/pot area per Figma metadata (y~449-452). */}
        <DraggableGroup id="glows" label="Glows">
          <Animated.View
            style={[
              styles.abs,
              {
                left: fx(-110.1),
                top: fy(200 - 88.6),
                zIndex: 9,
                transform: [{ scale: 0.8 }, { rotate: "-20deg" }],
              },
              haloAnim,
            ]}
          >
            {/* Bright yellow glow (starlines-09) */}
            <View
              style={[
                styles.abs,
                {
                  left: fx(96),
                  top: fy(451.57),
                  width: fd(115.37),
                  height: fd(62.72),
                  opacity: 0.35,
                },
              ]}
            >
              <SvgXml
                xml={BRIGHT_GLOW_SVG}
                width={fd(115.37)}
                height={fd(62.72)}
              />
            </View>
            {/* Gold glow (starlines-07) */}
            <View
              style={[
                styles.abs,
                {
                  left: fx(104.93),
                  top: fy(452.91),
                  width: fd(98.79),
                  height: fd(50.46),
                  opacity: 0.5,
                },
              ]}
            >
              <SvgXml
                xml={GOLD_GLOW_SVG}
                width={fd(98.79)}
                height={fd(50.46)}
              />
            </View>
            {/* White ring glow (starlines-06) */}
            <View
              style={[
                styles.abs,
                {
                  left: fx(97),
                  top: fy(449.42),
                  width: fd(111.12),
                  height: fd(59.37),
                  opacity: 0.3,
                },
              ]}
            >
              <SvgXml
                xml={WHITE_RING_SVG}
                width={fd(111.12)}
                height={fd(59.37)}
              />
            </View>
          </Animated.View>
        </DraggableGroup>

        {/* Gold coins BEHIND pot — layer='back' */}
        <DraggableGroup id="coinsBack" label="Coins (Back)">
          <Animated.View
            style={[
              styles.abs,
              {
                left: fx(COINS_OFFSET_X),
                top: fy(FIGMA_Y_OFF + COINS_OFFSET_Y),
                width: sceneW,
                height: sceneH,
              },
              potAnim,
            ]}
          >
            {GOLD_COINS.filter((c) => c.layer === "back").map((coin, i) => (
              <View
                key={`gc-b-${i}`}
                style={[
                  styles.abs,
                  {
                    left: fx(coin.x),
                    top: fy(coin.y),
                    width: fd(coin.w),
                    height: fd(coin.h),
                    transform: coin.rot
                      ? [{ rotate: `${coin.rot}deg` }]
                      : undefined,
                  },
                ]}
              >
                <SvgXml
                  xml={COIN_SVG_MAP[coin.v ?? 0]}
                  width={fd(coin.w)}
                  height={fd(coin.h)}
                />
              </View>
            ))}
          </Animated.View>
        </DraggableGroup>

        {/* Peach blob in pot — full combined Figma SVG. */}

        <DraggableGroup id="pot" label="Pot + Blob">
          <Animated.View
            style={[
              styles.abs,
              {
                left: fx(-87),
                top: fy(212.9),
                width: fd(583.561),
                height: fd(608.935),
              },
              potAnim,
            ]}
          >
            <View
              style={{
                width: fd(583.561),
                height: fd(608.935),
                transform: [{ rotate: "30deg" }],
              }}
            >
              <SvgXml
                xml={BLOB_IN_POT_SVG}
                width={fd(583.561)}
                height={fd(608.935)}
              />
            </View>
          </Animated.View>
        </DraggableGroup>

        {/* Bitcoin coins — behind gold coins */}
        <DraggableGroup id="btcCoins" label="BTC Coins">
          <Animated.View
            style={[
              styles.abs,
              { left: fx(BTC_OFFSET_X), top: fy(FIGMA_Y_OFF + BTC_OFFSET_Y) },
              potAnim,
            ]}
          >
            <View style={[styles.abs, { left: fx(43), top: fy(593) }]}>
              <SvgXml xml={BITCOIN_SVG} width={fd(59)} height={fd(57)} />
            </View>
            <View
              style={[
                styles.abs,
                {
                  left: fx(157),
                  top: fy(597),
                  transform: [{ rotate: "45deg" }],
                },
              ]}
            >
              <SvgXml xml={BITCOIN_SVG} width={fd(60)} height={fd(58)} />
            </View>
            <View
              style={[
                styles.abs,
                {
                  left: fx(263),
                  top: fy(595),
                  transform: [{ rotate: "19.75deg" }],
                },
              ]}
            >
              <SvgXml xml={BITCOIN_SVG} width={fd(60)} height={fd(58)} />
            </View>
          </Animated.View>
        </DraggableGroup>

        {/* Gold coins IN FRONT of pot — layer='front' (default) */}
        <DraggableGroup id="coinsFront" label="Coins (Front)">
          <Animated.View
            style={[
              styles.abs,
              {
                left: fx(COINS_OFFSET_X),
                top: fy(FIGMA_Y_OFF + COINS_OFFSET_Y),
                width: sceneW,
                height: sceneH,
              },
              potAnim,
            ]}
          >
            {GOLD_COINS.filter((c) => c.layer !== "back").map((coin, i) => (
              <View
                key={`gc-f-${i}`}
                style={[
                  styles.abs,
                  {
                    left: fx(coin.x),
                    top: fy(coin.y),
                    width: fd(coin.w),
                    height: fd(coin.h),
                    transform: coin.rot
                      ? [{ rotate: `${coin.rot}deg` }]
                      : undefined,
                  },
                ]}
              >
                <SvgXml
                  xml={COIN_SVG_MAP[coin.v ?? 0]}
                  width={fd(coin.w)}
                  height={fd(coin.h)}
                />
              </View>
            ))}
          </Animated.View>
        </DraggableGroup>

        {/* Dollar signs */}
        <DraggableGroup id="dollars" label="Dollar Signs">
          <Animated.View
            style={[
              styles.abs,
              { left: fx(31.5), top: fy(200 - 111.8) },
              dollarAnim,
            ]}
          >
            <View
              style={[
                styles.abs,
                {
                  left: fx(291),
                  top: fy(453),
                  transform: [{ rotate: "15deg" }],
                },
              ]}
            >
              <Text style={[styles.dollarSign, { fontSize: fd(60) }]}>$</Text>
            </View>
            <View
              style={[
                styles.abs,
                {
                  left: fx(259),
                  top: fy(466),
                  transform: [{ rotate: "15deg" }],
                },
              ]}
            >
              <Text style={[styles.dollarSign, { fontSize: fd(42) }]}>$</Text>
            </View>
            <View
              style={[
                styles.abs,
                {
                  left: fx(272),
                  top: fy(513),
                  transform: [{ rotate: "15deg" }],
                },
              ]}
            >
              <Text style={[styles.dollarSign, { fontSize: fd(30) }]}>$</Text>
            </View>
          </Animated.View>
        </DraggableGroup>
      </Animated.View>
    </DebugLayoutProvider>
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
  dollarSign: {
    color: "#00B324",
    fontWeight: "700",
    fontFamily: Platform.OS === "ios" ? "ui-rounded" : undefined,
  },
});
