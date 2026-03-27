import React from "react";
import { Pressable, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Stop,
  ClipPath,
} from "react-native-svg";
import type {
  BlobAvatarColorPreset,
  BlobAvatarConfig,
  BlobAvatarEyesPreset,
  BlobAvatarShapePreset,
} from "../constants/blobAvatar";

interface BlobAvatarProps {
  size?: number;
  config: BlobAvatarConfig;
  onPress?: () => void;
}

type ShapeConfig = {
  viewBox: string;
  bodyPath: string;
  eyeCenterX: number;
  eyeCenterY: number;
  eyeGap: number;
  eyeRadius: number;
};

const SHAPES: Record<BlobAvatarShapePreset, ShapeConfig> = {
  peach: {
    viewBox: "0 0 140 130",
    bodyPath:
      "M49.4036 2.76855C51.3905 1.48963 53.0168 1.08995 54.4036 1.43652L54.4114 1.43848L54.4193 1.43945C55.8877 1.78765 57.4433 3.02425 59.2161 5.21289C60.9652 7.37218 62.7572 10.239 64.7728 13.5273C68.6393 19.8354 73.2493 27.57 79.6234 33.8066L80.2454 34.4053C86.976 40.773 95.5382 45.3896 102.418 49.2314C105.894 51.1725 108.907 52.8953 111.135 54.5596C113.418 56.2654 114.568 57.6908 114.803 58.9365V58.9385C115.021 60.0771 114.499 61.5042 112.875 63.3711C111.282 65.203 108.861 67.1898 105.898 69.377C100.061 73.6843 92.1674 78.7187 85.5726 84.4395C78.9627 90.1733 73.4909 96.7181 68.8958 101.546C66.5684 103.991 64.4829 105.982 62.5491 107.313C60.6146 108.643 58.9941 109.199 57.554 109.053C56.0872 108.884 54.508 107.963 52.7161 106.243C50.9377 104.536 49.097 102.19 47.0892 99.4395C43.1195 94.0006 38.5536 87.0466 32.8626 81.2754L32.8597 81.2725L32.3187 80.7344C26.7006 75.2143 20.0845 70.7673 14.8265 66.8379C12.0825 64.7873 9.7208 62.8891 7.96809 61.0293C6.20847 59.1622 5.17815 57.4525 4.90461 55.7959C4.63456 54.1597 5.0674 52.3483 6.1966 50.2676C7.32746 48.1838 9.09408 45.9441 11.3138 43.5049C13.5294 41.0701 16.1369 38.4992 18.9212 35.7334C21.6952 32.9779 24.6316 30.0413 27.4583 26.916C30.284 23.7919 32.9962 20.4838 35.5745 17.333C38.1623 14.1706 40.6075 11.1763 42.9349 8.62988C45.2704 6.07452 47.4222 4.04397 49.4036 2.76855Z",
    eyeCenterX: 62,
    eyeCenterY: 55,
    eyeGap: 20,
    eyeRadius: 4,
  },
  wave: {
    viewBox: "0 0 164.974 135.849",
    bodyPath:
      "M142.227 49.3495C150.515 62.9462 153.999 79.3861 148.81 91.1557L148.804 91.1703C143.706 103.105 129.624 110.707 116.497 114.39L116.479 114.395C103.6 118.199 92.249 117.827 78.5918 116.435C64.9279 115.042 49.6553 112.738 35.2242 101.63L35.22 101.627C28.0233 96.1331 21.0531 88.4945 16.5071 80.573C11.9324 72.6015 9.96805 64.6286 12.2521 58.3027C14.5449 51.9525 21.2482 46.8762 30.1427 42.5507C38.9741 38.2559 49.6006 34.8675 59.2971 31.6882C69.041 28.5937 77.5803 25.8054 85.4634 24.1146C93.3303 22.4273 100.449 21.8567 107.323 23.1484L107.323 23.1487L107.962 23.2734C121.354 26.0188 133.927 36.1056 142.225 49.3502L142.227 49.3495Z",
    eyeCenterX: 80,
    eyeCenterY: 62,
    eyeGap: 24,
    eyeRadius: 4.6,
  },
  petal: {
    viewBox: "0 0 130.501 89.2802",
    bodyPath:
      "M113.588 1.69517C116.545 1.51505 118.897 1.88595 120.609 2.90073C122.298 3.9018 123.563 5.65416 124.413 8.07956C125.263 10.5078 125.664 13.5206 125.675 16.8716C125.698 23.573 124.164 31.3776 121.912 37.9785C117.327 51.1128 110.036 59.4818 102.302 67.1279L102.295 67.1339C98.4097 71.0288 94.505 74.6485 90.6738 77.2142C86.8251 79.7915 83.2237 81.1869 79.9115 80.9082L79.9017 80.9075L79.8909 80.9068C76.4802 80.6721 73.1219 78.7238 68.3192 75.6925C63.8893 72.8965 58.4191 69.321 50.9374 65.9099L49.4136 65.23L49.4037 65.2254C45.2518 63.4516 40.515 61.7463 35.7366 60.0526C30.9427 58.3534 26.1072 56.6659 21.6981 54.9118C17.2823 53.155 13.3636 51.358 10.3941 49.4593C7.37815 47.5309 5.5835 45.6479 5.02862 43.8185C4.49801 42.0689 5.00896 40.0035 6.66217 37.6313C8.30794 35.2697 10.9588 32.8002 14.2712 30.3881C20.8854 25.5719 29.8612 21.1796 37.8021 18.4562L37.803 18.4562L37.8098 18.454C45.7151 15.6905 52.5597 14.6379 59.3427 13.8168C66.1096 12.9976 72.8951 12.4031 80.4801 10.533L80.4811 10.533C84.2455 9.5991 88.2032 8.35484 92.1154 7.1035C96.0433 5.84717 99.921 4.58551 103.587 3.58772C107.257 2.58885 110.647 1.8744 113.588 1.69517Z",
    eyeCenterX: 62,
    eyeCenterY: 40,
    eyeGap: 22,
    eyeRadius: 4,
  },
};

const PALETTES: Record<
  BlobAvatarColorPreset,
  { start: string; end: string; backdrop: string }
> = {
  sunset: {
    start: "#F0A090",
    end: "#E07A5F",
    backdrop: "#725A50",
  },
  ocean: {
    start: "#64BFEE",
    end: "#329DD8",
    backdrop: "#2F5D78",
  },
  forest: {
    start: "#5CB88A",
    end: "#40916C",
    backdrop: "#2E5C49",
  },
  berry: {
    start: "#D38ECF",
    end: "#A65EA1",
    backdrop: "#5E3B66",
  },
  lemon: {
    start: "#F5D76E",
    end: "#E8B830",
    backdrop: "#8B7D3C",
  },
  coral: {
    start: "#FF8A80",
    end: "#E05555",
    backdrop: "#7A3535",
  },
};

const Eyes: React.FC<{
  eyesPreset: BlobAvatarEyesPreset;
  centerX: number;
  centerY: number;
  eyeGap: number;
  eyeRadius: number;
}> = ({ eyesPreset, centerX, centerY, eyeGap, eyeRadius }) => {
  const leftX = centerX - eyeGap / 2;
  const rightX = centerX + eyeGap / 2;

  if (eyesPreset === "happy") {
    return (
      <>
        <Path
          d={`M ${leftX - eyeRadius} ${centerY + 1} Q ${leftX} ${
            centerY - eyeRadius
          } ${leftX + eyeRadius} ${centerY + 1}`}
          stroke="#120505"
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${rightX - eyeRadius} ${centerY + 1} Q ${rightX} ${
            centerY - eyeRadius
          } ${rightX + eyeRadius} ${centerY + 1}`}
          stroke="#120505"
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (eyesPreset === "wink") {
    return (
      <>
        <Circle cx={leftX} cy={centerY} r={eyeRadius} fill="#120505" />
        <Path
          d={`M ${rightX - eyeRadius} ${centerY} L ${rightX + eyeRadius} ${
            centerY - eyeRadius * 0.35
          }`}
          stroke="#120505"
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (eyesPreset === "sleepy") {
    return (
      <>
        <Path
          d={`M ${leftX - eyeRadius} ${centerY} L ${leftX + eyeRadius} ${centerY}`}
          stroke="#120505"
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
        />
        <Path
          d={`M ${rightX - eyeRadius} ${centerY} L ${rightX + eyeRadius} ${centerY}`}
          stroke="#120505"
          strokeWidth={2.8}
          fill="none"
          strokeLinecap="round"
        />
      </>
    );
  }

  if (eyesPreset === "surprised") {
    return (
      <>
        <Circle
          cx={leftX}
          cy={centerY}
          r={eyeRadius * 1.5}
          stroke="#120505"
          strokeWidth={2.4}
          fill="none"
        />
        <Circle cx={leftX} cy={centerY} r={eyeRadius * 0.5} fill="#120505" />
        <Circle
          cx={rightX}
          cy={centerY}
          r={eyeRadius * 1.5}
          stroke="#120505"
          strokeWidth={2.4}
          fill="none"
        />
        <Circle cx={rightX} cy={centerY} r={eyeRadius * 0.5} fill="#120505" />
      </>
    );
  }

  return (
    <>
      <Circle cx={leftX} cy={centerY} r={eyeRadius} fill="#120505" />
      <Circle cx={rightX} cy={centerY} r={eyeRadius} fill="#120505" />
    </>
  );
};

export const BlobAvatar: React.FC<BlobAvatarProps> = ({
  size = 84,
  config,
  onPress,
}) => {
  const shape = SHAPES[config.shapePreset];
  const palette = PALETTES[config.colorPreset];
  const idSuffix = React.useRef(Math.random().toString(36).slice(2, 9)).current;

  const centerX = shape.eyeCenterX;

  const avatarBody = (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: size * 1.08,
          height: size * 0.9,
          backgroundColor: palette.backdrop,
          borderRadius: size * 0.42,
          opacity: 0.42,
          top: size * 0.1,
          left: size * 0.05,
        }}
      />

      <Svg width={size} height={size} viewBox={shape.viewBox} fill="none">
        <Defs>
          <LinearGradient
            id={`blobGrad-${idSuffix}`}
            x1="0.25"
            y1="0"
            x2="0.75"
            y2="1"
          >
            <Stop offset="0" stopColor={palette.start} stopOpacity={1} />
            <Stop offset="1" stopColor={palette.end} stopOpacity={1} />
          </LinearGradient>
          <ClipPath id={`blobClip-${idSuffix}`}>
            <Path d={shape.bodyPath} />
          </ClipPath>
        </Defs>

        <Path
          d={shape.bodyPath}
          fill={`url(#blobGrad-${idSuffix})`}
          stroke="#120505"
          strokeWidth={2.6}
        />

        <G clipPath={`url(#blobClip-${idSuffix})`}>
          <Path d={shape.bodyPath} fill="#000" opacity={0.1} x={2} y={3} />
        </G>

        <Eyes
          eyesPreset={config.eyesPreset}
          centerX={centerX}
          centerY={shape.eyeCenterY}
          eyeGap={shape.eyeGap}
          eyeRadius={shape.eyeRadius}
        />
      </Svg>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8}>
        {avatarBody}
      </Pressable>
    );
  }

  return avatarBody;
};
