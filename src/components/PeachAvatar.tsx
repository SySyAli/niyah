/**
 * PeachAvatar — standalone peach blob with colored oval backdrop.
 * Extracted from Onboarding2Scene / BlobsScene artwork.
 */

import React from "react";
import { Pressable, View } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  ClipPath,
  G,
} from "react-native-svg";
import { useColors } from "../hooks/useColors";

const BODY_PATH =
  "M57.8862 3.24414C60.2144 1.74549 62.1205 1.27635 63.7456 1.68262L63.7544 1.68457L63.7631 1.6875C65.4838 2.09548 67.3059 3.54389 69.3833 6.1084C71.4327 8.63855 73.5332 11.9974 75.895 15.8506C80.5714 23.48 86.175 32.89 94.0229 40.3125C101.909 47.7736 111.942 53.1821 120.003 57.6836C124.076 59.9579 127.606 61.9778 130.216 63.9277C132.892 65.9264 134.238 67.5961 134.514 69.0557V69.0586C134.769 70.3927 134.159 72.0645 132.256 74.252C130.389 76.3985 127.552 78.7263 124.08 81.2891C117.241 86.3359 107.992 92.2346 100.265 98.9375C92.5203 105.656 86.1091 113.325 80.7251 118.981C77.9981 121.846 75.5543 124.179 73.2885 125.737C71.0171 127.3 69.1153 127.951 67.4252 127.776C65.7095 127.576 63.8623 126.495 61.767 124.484C59.6834 122.484 57.5268 119.736 55.1743 116.513C50.523 110.14 45.1734 101.992 38.5053 95.2305L38.5014 95.2266L37.8676 94.5967C31.2848 88.1286 23.5325 82.9176 17.3715 78.3135C14.1565 75.9108 11.39 73.6868 9.33638 71.5078C7.27442 69.3199 6.06693 67.3162 5.74654 65.375C5.43025 63.458 5.93723 61.3363 7.26021 58.8984C8.58522 56.4569 10.6554 53.8327 13.2563 50.9746C15.8524 48.1218 18.908 45.1098 22.1704 41.8691C25.4206 38.6405 28.8613 35.2 32.1733 31.5381C35.4841 27.8775 38.6621 24.0004 41.6831 20.3086C44.7151 16.6033 47.5802 13.0949 50.3071 10.1113C53.0435 7.11731 55.5646 4.73851 57.8862 3.24414Z";

const LEFT_EYE =
  "M59.1519 56.1296C59.1519 56.9747 58.9855 57.8116 58.6621 58.5923C58.3387 59.3731 57.8646 60.0826 57.267 60.6801C56.6694 61.2777 55.96 61.7518 55.1792 62.0752C54.3984 62.3986 53.5616 62.565 52.7165 62.565C51.8714 62.565 51.0345 62.3986 50.2538 62.0752C49.473 61.7518 48.7635 61.2777 48.1659 60.6801C47.5684 60.0826 47.0943 59.3731 46.7709 58.5923C46.4475 57.8116 46.2811 56.9747 46.2811 56.1296L52.7165 56.1296H59.1519Z";
const RIGHT_EYE =
  "M79.7454 56.1296C79.7454 57.8364 79.0674 59.4733 77.8605 60.6801C76.6536 61.887 75.0167 62.565 73.31 62.565C71.6032 62.565 69.9663 61.887 68.7594 60.6802C67.5525 59.4733 66.8745 57.8364 66.8745 56.1296L73.31 56.1296H79.7454Z";

interface PeachAvatarProps {
  size?: number;
  onPress?: () => void;
}

export const PeachAvatar: React.FC<PeachAvatarProps> = ({
  size = 80,
  onPress,
}) => {
  const Colors = useColors();

  const inner = (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Oval backdrop — sits behind the blob, larger and offset down-right */}
      <View
        style={{
          position: "absolute",
          width: size * 1.05,
          height: size * 0.88,
          backgroundColor: "#608976",
          borderRadius: size * 0.42,
          opacity: 0.55,
          top: size * 0.12,
          left: size * 0.06,
        }}
      />

      {/* Peach blob */}
      <Svg width={size} height={size} viewBox="-2 -2 144 142" fill="none">
        <Defs>
          <LinearGradient
            id="peachAvatarGrad"
            x1="0.25"
            y1="0"
            x2="0.75"
            y2="1"
          >
            <Stop offset="0" stopColor="#F0A090" stopOpacity={1} />
            <Stop offset="1" stopColor="#E07A5F" stopOpacity={1} />
          </LinearGradient>
          <ClipPath id="peachAvatarClip">
            <Path d={BODY_PATH} />
          </ClipPath>
        </Defs>
        <Path
          d={BODY_PATH}
          fill="url(#peachAvatarGrad)"
          stroke="black"
          strokeWidth={3.08}
        />
        <G clipPath="url(#peachAvatarClip)">
          <Path d={BODY_PATH} fill="black" opacity={0.1} x={2} y={3} />
        </G>
        <Path d={LEFT_EYE} fill="#0F0000" />
        <Path d={RIGHT_EYE} fill="#0F0000" />
      </Svg>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8}>
        {inner}
      </Pressable>
    );
  }
  return inner;
};
