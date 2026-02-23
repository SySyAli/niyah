/**
 * DebugLayoutEditor — Visual layout tool for positioning scene elements.
 *
 * When DEBUG_LAYOUT is true in Onboarding3Scene, each element group becomes
 * draggable. Tap a group to select it, then use the panel to adjust z-order,
 * scale, and rotation. Press "Log All" to print positions to console.
 *
 * DELETE THIS FILE before shipping to production.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  PropsWithChildren,
} from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

// ── Types ──────────────────────────────────────────────────────────────

export interface ElementState {
  id: string;
  label: string;
  /** Offset from original position in screen pixels */
  dx: number;
  dy: number;
  /** z-index override (higher = in front) */
  zIndex: number;
  /** Scale multiplier (1 = original) */
  scale: number;
  /** Rotation in degrees (added to existing rotation) */
  rotate: number;
}

interface DebugContextValue {
  enabled: boolean;
  elements: Record<string, ElementState>;
  selectedId: string | null;
  lockedIds: Set<string>;
  select: (id: string) => void;
  deselect: () => void;
  toggleLock: (id: string) => void;
  update: (id: string, patch: Partial<ElementState>) => void;
  logAll: () => void;
  /** Scale factor (sf) for converting px offsets back to Figma units */
  sf: number;
}

// ── Context ────────────────────────────────────────────────────────────

const DebugContext = createContext<DebugContextValue>({
  enabled: false,
  elements: {},
  selectedId: null,
  lockedIds: new Set(),
  select: () => {},
  deselect: () => {},
  toggleLock: () => {},
  update: () => {},
  logAll: () => {},
  sf: 1,
});

export const useDebugLayout = () => useContext(DebugContext);

// ── Provider ───────────────────────────────────────────────────────────

interface ProviderProps {
  enabled: boolean;
  /** Scale factor (sf = size / FIGMA_W) so we can convert back to Figma units in logs */
  sf: number;
  /** FIGMA_Y_OFF used in the scene, so we can report proper fy() values */
  figmaYOff: number;
}

export const DebugLayoutProvider: React.FC<
  PropsWithChildren<ProviderProps>
> = ({ enabled, sf, figmaYOff, children }) => {
  const [elements, setElements] = useState<Record<string, ElementState>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [lockedIds, setLockedIds] = useState<Set<string>>(new Set());

  const select = useCallback((id: string) => setSelectedId(id), []);
  const deselect = useCallback(() => setSelectedId(null), []);
  const toggleLock = useCallback((id: string) => {
    setLockedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const update = useCallback((id: string, patch: Partial<ElementState>) => {
    setElements((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }, []);

  const register = useCallback((id: string, label: string) => {
    setElements((prev) => {
      if (prev[id]) return prev;
      return {
        ...prev,
        [id]: { id, label, dx: 0, dy: 0, zIndex: 0, scale: 1, rotate: 0 },
      };
    });
  }, []);

  const logAll = useCallback(() => {
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║   DEBUG LAYOUT — ELEMENT POSITIONS       ║");
    console.log("╚══════════════════════════════════════════╝\n");
    Object.values(elements).forEach((el) => {
      const fxOffset = el.dx / sf;
      const fyOffset = el.dy / sf;
      console.log(`── ${el.label} (${el.id}) ──`);
      console.log(
        `   dx: ${el.dx.toFixed(1)}px  →  ${fxOffset.toFixed(1)} Figma units`,
      );
      console.log(
        `   dy: ${el.dy.toFixed(1)}px  →  ${fyOffset.toFixed(1)} Figma units`,
      );
      console.log(`   zIndex: ${el.zIndex}`);
      console.log(`   scale: ${el.scale.toFixed(2)}`);
      console.log(`   rotate: ${el.rotate.toFixed(1)}°`);
      console.log("");
    });
    console.log("── Copy-paste offsets ──");
    Object.values(elements).forEach((el) => {
      const fxOff = (el.dx / sf).toFixed(1);
      const fyOff = (el.dy / sf).toFixed(1);
      console.log(
        `${el.id}: { fx: ${fxOff}, fy: ${fyOff}, z: ${el.zIndex}, scale: ${el.scale.toFixed(2)}, rotate: ${el.rotate.toFixed(1)} }`,
      );
    });
    console.log("");
  }, [elements, sf]);

  const ctx = useMemo<DebugContextValue>(
    () =>
      ({
        enabled,
        elements,
        selectedId,
        lockedIds,
        select,
        deselect,
        toggleLock,
        update,
        logAll,
        sf,
        _register: register,
      }) as DebugContextValue & { _register: typeof register },
    [
      enabled,
      elements,
      selectedId,
      lockedIds,
      select,
      deselect,
      toggleLock,
      update,
      logAll,
      sf,
      register,
    ],
  );

  return (
    <DebugContext.Provider value={ctx}>
      {children}
      {enabled && <DebugPanel />}
    </DebugContext.Provider>
  );
};

// ── DraggableGroup ─────────────────────────────────────────────────────

interface DraggableGroupProps {
  id: string;
  label: string;
  children: React.ReactNode;
}

export const DraggableGroup: React.FC<DraggableGroupProps> = ({
  id,
  label,
  children,
}) => {
  const ctx = useDebugLayout() as DebugContextValue & {
    _register?: (id: string, label: string) => void;
  };

  // Register on first render
  React.useEffect(() => {
    if (ctx.enabled && ctx._register) {
      ctx._register(id, label);
    }
  }, [ctx.enabled]);

  if (!ctx.enabled) return <>{children}</>;

  return (
    <DraggableInner id={id} label={label} ctx={ctx}>
      {children}
    </DraggableInner>
  );
};

const DraggableInner: React.FC<
  DraggableGroupProps & { ctx: DebugContextValue }
> = ({ id, label, ctx, children }) => {
  const el = ctx.elements[id];
  const isSelected = ctx.selectedId === id;
  const isLocked = ctx.lockedIds.has(id);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  const selectThis = useCallback(() => ctx.select(id), [ctx, id]);

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(ctx.update)(id, {
        dx: translateX.value,
        dy: translateY.value,
      });
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(selectThis)();
  });

  const gesture = Gesture.Simultaneous(panGesture, tapGesture);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: el?.scale ?? 1 },
      { rotate: `${el?.rotate ?? 0}deg` },
    ],
    zIndex: el?.zIndex ?? 0,
  }));

  // Locked groups: no gestures, pointerEvents="none" so touches pass through
  if (isLocked) {
    return (
      <Animated.View style={animStyle} pointerEvents="none">
        {children}
        <View style={[debugStyles.badge, debugStyles.badgeLocked]}>
          <Text style={debugStyles.badgeText}>{label} 🔒</Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={animStyle}>
        {children}
        {/* Label badge */}
        <View
          style={[debugStyles.badge, isSelected && debugStyles.badgeSelected]}
        >
          <Text style={debugStyles.badgeText}>{label}</Text>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

// ── Debug Panel ────────────────────────────────────────────────────────

const DebugPanel: React.FC = () => {
  const ctx = useDebugLayout();
  const el = ctx.selectedId ? ctx.elements[ctx.selectedId] : null;

  const adjust = (field: keyof ElementState, delta: number) => {
    if (!ctx.selectedId || !el) return;
    ctx.update(ctx.selectedId, { [field]: (el[field] as number) + delta });
  };

  const allGroups = Object.values(ctx.elements);

  return (
    <View style={debugStyles.panel}>
      {/* Group selector chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 8 }}
      >
        <View style={{ flexDirection: "row", gap: 6 }}>
          {allGroups.map((g) => {
            const isSel = ctx.selectedId === g.id;
            const isLck = ctx.lockedIds.has(g.id);
            return (
              <Pressable
                key={g.id}
                style={[
                  debugStyles.chip,
                  isSel && debugStyles.chipSelected,
                  isLck && debugStyles.chipLocked,
                ]}
                onPress={() => ctx.select(g.id)}
              >
                <Text
                  style={[
                    debugStyles.chipText,
                    isSel && debugStyles.chipTextSelected,
                  ]}
                >
                  {isLck ? `${g.label} 🔒` : g.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Header with lock/deselect/log */}
      <View style={debugStyles.panelHeader}>
        <Text style={debugStyles.panelTitle}>
          {el ? `${el.label}` : "Tap a group"}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {el && ctx.selectedId && (
            <Pressable
              style={[
                debugStyles.lockBtn,
                ctx.lockedIds.has(ctx.selectedId) && debugStyles.lockBtnActive,
              ]}
              onPress={() => ctx.toggleLock(ctx.selectedId!)}
            >
              <Text style={debugStyles.lockBtnText}>
                {ctx.lockedIds.has(ctx.selectedId) ? "UNLOCK" : "LOCK"}
              </Text>
            </Pressable>
          )}
          {el && (
            <Pressable style={debugStyles.deselectBtn} onPress={ctx.deselect}>
              <Text style={debugStyles.deselectBtnText}>X</Text>
            </Pressable>
          )}
          <Pressable style={debugStyles.logBtn} onPress={ctx.logAll}>
            <Text style={debugStyles.logBtnText}>LOG ALL</Text>
          </Pressable>
        </View>
      </View>

      {/* Controls for selected group */}
      {el && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={debugStyles.controls}>
            <ControlGroup
              label="Z"
              value={el.zIndex}
              onMinus={() => adjust("zIndex", -1)}
              onPlus={() => adjust("zIndex", 1)}
            />
            <ControlGroup
              label="Scale"
              value={el.scale}
              format={(v) => v.toFixed(2)}
              onMinus={() => adjust("scale", -0.05)}
              onPlus={() => adjust("scale", 0.05)}
            />
            <ControlGroup
              label="Rot"
              value={el.rotate}
              format={(v) => `${v.toFixed(0)}°`}
              onMinus={() => adjust("rotate", -5)}
              onPlus={() => adjust("rotate", 5)}
            />
            <View style={debugStyles.posInfo}>
              <Text style={debugStyles.posText}>
                dx: {(el.dx / ctx.sf).toFixed(0)}
              </Text>
              <Text style={debugStyles.posText}>
                dy: {(el.dy / ctx.sf).toFixed(0)}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

// ── Control Group ──────────────────────────────────────────────────────

const ControlGroup: React.FC<{
  label: string;
  value: number;
  format?: (v: number) => string;
  onMinus: () => void;
  onPlus: () => void;
}> = ({ label, value, format, onMinus, onPlus }) => (
  <View style={debugStyles.controlGroup}>
    <Text style={debugStyles.controlLabel}>{label}</Text>
    <View style={debugStyles.controlRow}>
      <Pressable style={debugStyles.controlBtn} onPress={onMinus}>
        <Text style={debugStyles.controlBtnText}>−</Text>
      </Pressable>
      <Text style={debugStyles.controlValue}>
        {format ? format(value) : value}
      </Text>
      <Pressable style={debugStyles.controlBtn} onPress={onPlus}>
        <Text style={debugStyles.controlBtnText}>+</Text>
      </Pressable>
    </View>
  </View>
);

// ── Styles ─────────────────────────────────────────────────────────────

const debugStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 0,
    left: 0,
    backgroundColor: "rgba(255,0,0,0.7)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    zIndex: 9999,
  },
  badgeSelected: {
    backgroundColor: "rgba(0,150,255,0.9)",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  panel: {
    position: "absolute",
    bottom: 40,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.88)",
    borderRadius: 12,
    padding: 10,
    zIndex: 99999,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  panelTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  logBtn: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  logBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "800",
  },
  deselectBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 32,
    height: 32,
    borderRadius: 6,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  deselectBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  badgeLocked: {
    backgroundColor: "rgba(100,100,100,0.7)",
  },
  lockBtn: {
    backgroundColor: "rgba(255,165,0,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  lockBtnActive: {
    backgroundColor: "rgba(0,180,0,0.8)",
  },
  lockBtnText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800" as const,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  chipSelected: {
    backgroundColor: "rgba(0,150,255,0.5)",
    borderColor: "rgba(0,150,255,0.9)",
  },
  chipLocked: {
    opacity: 0.5,
  },
  chipText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  chipTextSelected: {
    color: "#fff",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  controlGroup: {
    alignItems: "center",
  },
  controlLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
  },
  controlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  controlBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  controlBtnText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
  },
  controlValue: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    minWidth: 40,
    textAlign: "center",
  },
  posInfo: {
    marginLeft: 8,
  },
  posText: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "600",
  },
});
