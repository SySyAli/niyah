import React, { type ReactNode, type ComponentType } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { logger } from "../utils/logger";
import { Typography, Spacing, Font } from "../constants/colors";

interface Props {
  children: ReactNode;
  label?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    logger.error(
      `[ErrorBoundary${this.props.label ? `:${this.props.label}` : ""}] Uncaught error:`,
      error,
      info.componentStack,
    );
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The app hit an unexpected error. Tap below to try again.
        </Text>
        {__DEV__ && this.state.error ? (
          <Text style={styles.debug}>{String(this.state.error.message)}</Text>
        ) : null}
        <Pressable onPress={this.handleReset} style={styles.button}>
          <Text style={styles.buttonText}>Try Again</Text>
        </Pressable>
      </View>
    );
  }
}

export function withErrorBoundary<P extends object>(
  Component: ComponentType<P>,
  label?: string,
): ComponentType<P> {
  const Wrapped = (props: P) => (
    <ErrorBoundary label={label}>
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `WithErrorBoundary(${Component.displayName ?? Component.name ?? "Component"})`;
  return Wrapped;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
    backgroundColor: "#1A1714",
  },
  title: {
    fontSize: Typography.titleLarge,
    ...Font.bold,
    color: "#FFFFFF",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  body: {
    fontSize: Typography.bodyMedium,
    color: "#B8B3AD",
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  debug: {
    fontSize: Typography.bodySmall,
    color: "#D97757",
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  button: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: "#2D6A4F",
    borderRadius: 12,
  },
  buttonText: {
    fontSize: Typography.bodyMedium,
    ...Font.semibold,
    color: "#FFFFFF",
  },
});
