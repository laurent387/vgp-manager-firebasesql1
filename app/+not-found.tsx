import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { APP_COLORS } from "@/constants/vgp";
import { AlertCircle } from "lucide-react-native";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Page introuvable" }} />
      <View style={styles.container}>
        <AlertCircle size={64} color={APP_COLORS.textSecondary} />
        <Text style={styles.title}>Page introuvable</Text>
        <Text style={styles.message}>
          Cette page n&apos;existe pas ou a été déplacée.
        </Text>

        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Retour à l&apos;accueil</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: APP_COLORS.background,
  },
  title: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: APP_COLORS.text,
    marginTop: 24,
  },
  message: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
  link: {
    marginTop: 32,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: APP_COLORS.primary,
    borderRadius: 12,
  },
  linkText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#FFFFFF",
  },
});
