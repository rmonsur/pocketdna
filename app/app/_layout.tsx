/** Root layout: fonts, query client, dark stack. */
import { Inter_400Regular, Inter_800ExtraBold, useFonts } from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "../global.css";

const client = new QueryClient();

export default function Layout(): React.JSX.Element | null {
  const [loaded] = useFonts({ Inter_400Regular, Inter_800ExtraBold });
  if (!loaded) return null;
  return (
    <QueryClientProvider client={client}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0A0908" } }} />
    </QueryClientProvider>
  );
}
