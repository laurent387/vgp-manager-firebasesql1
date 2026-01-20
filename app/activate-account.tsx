import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useData } from '@/providers/DataProvider';
import { APP_COLORS } from '@/constants/vgp';
import { CheckCircle, AlertCircle, Lock } from 'lucide-react-native';

export default function ActivateAccountScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams();
  const { users, updateUser } = useData();

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [activating, setActivating] = useState<boolean>(false);
  const [validToken, setValidToken] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const validateToken = async () => {
      console.log('[ActivateAccount] Validating token:', token);
      
      if (!token || typeof token !== 'string') {
        console.log('[ActivateAccount] No token provided');
        setLoading(false);
        return;
      }

      const user = users.find(
        (u) =>
          u.activationToken === token &&
          u.activationTokenExpiry &&
          new Date(u.activationTokenExpiry) > new Date()
      );

      console.log('[ActivateAccount] User found:', user?.email);

      if (user) {
        setValidToken(true);
        setUserEmail(user.email);
        setUserId(user.id);
      } else {
        setValidToken(false);
      }

      setLoading(false);
    };

    validateToken();
  }, [token, users]);

  const handleActivate = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    setActivating(true);
    try {
      await updateUser(userId, {
        password,
        isActivated: true,
        activationToken: undefined,
        activationTokenExpiry: undefined,
      });

      Alert.alert(
        'Compte activé',
        'Votre compte a été activé avec succès. Vous pouvez maintenant vous connecter.',
        [
          {
            text: 'Se connecter',
            onPress: () => router.replace('/'),
          },
        ]
      );
    } catch (error) {
      console.error('Error activating account:', error);
      Alert.alert('Erreur', 'Une erreur est survenue lors de l&apos;activation de votre compte');
    } finally {
      setActivating(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Activation de compte',
          headerStyle: {
            backgroundColor: APP_COLORS.primary,
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600' as const,
          },
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={APP_COLORS.primary} />
            <Text style={styles.loadingText}>Vérification...</Text>
          </View>
        ) : validToken ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <CheckCircle size={64} color={APP_COLORS.success} />
              </View>
              <Text style={styles.title}>Créez votre mot de passe</Text>
              <Text style={styles.subtitle}>
                Compte : {userEmail}
              </Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Mot de passe *</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color={APP_COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Minimum 6 caractères"
                    placeholderTextColor={APP_COLORS.textSecondary}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!activating}
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirmer le mot de passe *</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color={APP_COLORS.textSecondary} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirmez votre mot de passe"
                    placeholderTextColor={APP_COLORS.textSecondary}
                    secureTextEntry
                    autoCapitalize="none"
                    editable={!activating}
                  />
                </View>
              </View>

              <View style={styles.passwordHints}>
                <Text style={styles.hintTitle}>Votre mot de passe doit contenir :</Text>
                <Text style={styles.hintItem}>• Au moins 6 caractères</Text>
                <Text style={styles.hintItem}>• Une combinaison de lettres et chiffres recommandée</Text>
              </View>

              <TouchableOpacity
                style={[styles.button, activating && styles.buttonDisabled]}
                onPress={handleActivate}
                disabled={activating}
              >
                {activating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.buttonText}>Activer mon compte</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.errorContainer}>
            <View style={styles.iconContainer}>
              <AlertCircle size={64} color={APP_COLORS.error} />
            </View>
            <Text style={styles.errorTitle}>Lien invalide ou expiré</Text>
            <Text style={styles.errorMessage}>
              Ce lien d&apos;activation n&apos;est plus valide. Il a peut-être expiré ou déjà été utilisé.
            </Text>
            <Text style={styles.errorMessage}>
              Veuillez contacter l&apos;administrateur pour obtenir un nouveau lien d&apos;activation.
            </Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => router.replace('/')}
            >
              <Text style={styles.buttonText}>Retour à l&apos;accueil</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    marginTop: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    marginTop: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: APP_COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginLeft: 12,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 12,
    fontSize: 16,
    color: APP_COLORS.text,
  },
  passwordHints: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: APP_COLORS.primary,
  },
  hintTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: APP_COLORS.primary,
    marginBottom: 8,
  },
  hintItem: {
    fontSize: 13,
    color: '#1E40AF',
    marginBottom: 4,
  },
  button: {
    backgroundColor: APP_COLORS.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600' as const,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: APP_COLORS.error,
    marginBottom: 16,
    marginTop: 24,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: APP_COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 24,
  },
});
