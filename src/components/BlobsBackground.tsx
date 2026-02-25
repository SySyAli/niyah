import React from "react";
import { View, StyleSheet } from "react-native";

// Simple SVG blobs using react-native-svg for demo purposes
import Svg, { Path, Defs, RadialGradient, Stop } from "react-native-svg";

const BlobsBackground: React.FC = () => {
  return (
    <View style={styles.absoluteFill} pointerEvents="none">
      {/* Blob 1 */}
      <Svg style={[styles.blob, styles.blob1]} width={320} height={320} viewBox="0 0 320 320">
        <Defs>
          <RadialGradient id="grad1" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#A5B4FC" stopOpacity="0.7" />
            <Stop offset="100%" stopColor="#6366F1" stopOpacity="0.2" />
          </RadialGradient>
        </Defs>
        <Path
          d="M160 0C230 0 320 70 320 160C320 250 230 320 160 320C90 320 0 250 0 160C0 70 90 0 160 0Z"
          fill="url(#grad1)"
        />
      </Svg>
      {/* Blob 2 */}
      <Svg style={[styles.blob, styles.blob2]} width={220} height={220} viewBox="0 0 220 220">
        <Defs>
          <RadialGradient id="grad2" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FBCFE8" stopOpacity="0.6" />
            <Stop offset="100%" stopColor="#F472B6" stopOpacity="0.15" />
          </RadialGradient>
        </Defs>
        <Path
          d="M110 0C170 0 220 50 220 110C220 170 170 220 110 220C50 220 0 170 0 110C0 50 50 0 110 0Z"
          fill="url(#grad2)"
        />
      </Svg>
      {/* Blob 3 */}
      <Svg style={[styles.blob, styles.blob3]} width={180} height={180} viewBox="0 0 180 180">
        <Defs>
          <RadialGradient id="grad3" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.5" />
            <Stop offset="100%" stopColor="#10B981" stopOpacity="0.12" />
          </RadialGradient>
        </Defs>
        <Path
          d="M90 0C140 0 180 40 180 90C180 140 140 180 90 180C40 180 0 140 0 90C0 40 40 0 90 0Z"
          fill="url(#grad3)"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  blob: {
    position: "absolute",
    opacity: 0.7,
    // blur effect is simulated by opacity and color blending
  },
  blob1: {
    top: -60,
    left: -40,
    transform: [{ rotate: "-15deg" }],
  },
  blob2: {
    top: 200,
    right: -60,
    transform: [{ rotate: "10deg" }],
  },
  blob3: {
    bottom: -40,
    left: 80,
    transform: [{ rotate: "-8deg" }],
  },
});

export default BlobsBackground;
