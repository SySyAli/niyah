import React, { createContext, useContext } from "react";
import { useSharedValue, type SharedValue } from "react-native-reanimated";

interface ScrollContextType {
  scrollY: SharedValue<number>;
  isScrolling: SharedValue<boolean>;
}

const ScrollContext = createContext<ScrollContextType | null>(null);

export const ScrollProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const scrollY = useSharedValue(0);
  const isScrolling = useSharedValue(false);

  return (
    <ScrollContext.Provider value={{ scrollY, isScrolling }}>
      {children}
    </ScrollContext.Provider>
  );
};

export const useScrollContext = () => {
  const ctx = useContext(ScrollContext);
  if (!ctx)
    throw new Error("useScrollContext must be used within ScrollProvider");
  return ctx;
};
