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
  useWindowDimensions,
  Platform,
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
  const { width, height } = useWindowDimensions();
  
  const isSmallScreen = height < 700;
  const isLargeScreen = width > 500;

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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        contentContainerStyle={[
          styles.scrollContent,
          isSmallScreen && styles.scrollContentSmall,
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[
          styles.content,
          isLargeScreen && styles.contentLarge,
        ]}>
          <View style={[
            styles.heroHeader,
            isSmallScreen && styles.heroHeaderSmall,
          ]} testID="login-hero-header">
            <View style={styles.heroDecorA} />
            <View style={styles.heroDecorB} />
            {!logoFailed ? (
              <Image
                testID="groupe-adf-logo"
                source={{ uri: GROUPE_ADF_LOGO }}
                style={[styles.logo, isSmallScreen && styles.logoSmall]}
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
            <Text style={[styles.title, isSmallScreen && styles.titleSmall]}>VGP Manager</Text>
          </View>

          <View style={[
            styles.formCard,
            isLargeScreen && styles.formCardLarge,
          ]} testID="login-form-card">
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
    paddingVertical: 32,
    paddingHorizontal: 4,
  },
  scrollContentSmall: {
    paddingVertical: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  contentLarge: {
    paddingHorizontal: 32,
  },
  heroHeader: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 28,
    paddingHorizontal: 20,
    marginBottom: 24,
    borderRadius: 24,
    backgroundColor: '#0A2540',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 22,
    elevation: 16,
  },
  heroHeaderSmall: {
    paddingTop: 16,
    paddingBottom: 18,
    marginBottom: 16,
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
    width: 240,
    height: 80,
    marginBottom: 16,
  },
  logoSmall: {
    width: 200,
    height: 66,
    marginBottom: 10,
  },
  logoFallback: {
    width: 240,
    height: 80,
    marginBottom: 16,
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
    fontSize: 28,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  titleSmall: {
    fontSize: 22,
  },

  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 12,
  },
  formCardLarge: {
    padding: 32,
  },
  inputContainer: {
    marginBottom: 18,
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
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 8,
    shadowColor: '#0B1220',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: 0.3,
  },
});
