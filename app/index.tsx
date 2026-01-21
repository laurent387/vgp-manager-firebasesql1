import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { APP_COLORS, GROUPE_ADF_LOGO } from '@/constants/vgp';
import { Lock } from 'lucide-react-native';

export default function LoginScreen() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [logoFailed, setLogoFailed] = useState<boolean>(false);
  const { login } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    console.log('[Login] Using GROUPE_ADF_LOGO uri:', GROUPE_ADF_LOGO);
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      router.replace('/dashboard' as never);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.heroHeader} testID="login-hero-header">
            <View style={styles.heroDecorA} />
            <View style={styles.heroDecorB} />
            {!logoFailed ? (
              <Image
                testID="groupe-adf-logo"
                source={{ uri: GROUPE_ADF_LOGO }}
                style={styles.logo}
                resizeMode="contain"
                onLoad={() => {
                  console.log('[Login] Logo loaded successfully', { uri: GROUPE_ADF_LOGO });
                }}
                onError={(e) => {
                  console.error('[Login] Logo failed to load', {
                    uri: GROUPE_ADF_LOGO,
                    error: (e as unknown as { nativeEvent?: unknown })?.nativeEvent,
                  });
                  setLogoFailed(true);
                }}
              />
            ) : (
              <View style={styles.logoFallback} testID="logo-fallback">
                <Text style={styles.logoFallbackText}>VGP</Text>
              </View>
            )}
            <Text style={styles.title}>VGP Manager</Text>
          </View>

          <View style={styles.formCard} testID="login-form-card">
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                testID="login-email"
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.fr"
                placeholderTextColor={APP_COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Mot de passe</Text>
              <TextInput
                testID="login-password"
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={APP_COLORS.textSecondary}
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <TouchableOpacity
              testID="login-submit"
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Lock size={20} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Se connecter</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.demoInfo} testID="demo-accounts">
              <Text style={styles.demoTitle}>Comptes de démonstration :</Text>
              <Text style={styles.demoText}>
                Admin: admin@vgp.fr / admin123
              </Text>
              <Text style={styles.demoText}>
                Client: client@test.fr / client123
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070B13',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 28,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heroHeader: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 22,
    paddingHorizontal: 16,
    marginBottom: 18,
    borderRadius: 22,
    backgroundColor: '#0A2540',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 16,
  },
  heroDecorA: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(134, 188, 37, 0.20)',
  },
  heroDecorB: {
    position: 'absolute',
    bottom: -120,
    left: -90,
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(16, 185, 129, 0.18)',
  },
  logo: {
    width: 260,
    height: 86,
    marginBottom: 14,
  },
  logoFallback: {
    width: 260,
    height: 86,
    marginBottom: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoFallbackText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900' as const,
    letterSpacing: 1.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.4,
  },

  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  button: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 10,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
  demoInfo: {
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  demoTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: '#065F46',
    marginBottom: 10,
  },
  demoText: {
    fontSize: 13,
    color: '#047857',
    marginBottom: 4,
    fontWeight: '500' as const,
  },
});
