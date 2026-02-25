import { ThemeColorMap, type ThemeColors } from "../constants/colors";
import { useThemeStore } from "../store/themeStore";

/**
 * Returns the Colors object for the current theme.
 * Components should call this inside the component body and use the
 * returned value in place of the static `Colors` import.
 *
 *   const Colors = useColors();
 *   const styles = useMemo(() => StyleSheet.create({ ... }), [Colors]);
 */
export const useColors = (): ThemeColors => {
  const theme = useThemeStore((s) => s.theme);
  return ThemeColorMap[theme];
};
