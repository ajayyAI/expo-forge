import { useIsFocused } from "expo-router";
import { Platform } from "react-native";
import { SystemBars } from "react-native-edge-to-edge";
import { useUniwind } from "uniwind";

interface Props {
  hidden?: boolean;
}
export function FocusAwareStatusBar({ hidden = false }: Props) {
  const isFocused = useIsFocused();
  const { theme } = useUniwind();

  if (Platform.OS === "web") return null;

  return isFocused ? (
    <SystemBars hidden={hidden} style={theme === "light" ? "dark" : "light"} />
  ) : null;
}
