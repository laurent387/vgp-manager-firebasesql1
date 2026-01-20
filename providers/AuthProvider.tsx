import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';
import { trpc } from '@/lib/trpc';

const AUTH_STORAGE_KEY = 'vgp_auth_user';

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedAuth = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (storedAuth) {
        const { user: storedUser, token: storedToken } = JSON.parse(storedAuth);
        setUser(storedUser);
        setToken(storedToken);
      }
    } catch (error) {
      console.error('[Auth] Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async (data) => {
      setUser(data.user);
      setToken(data.token);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
    },
  });

  const login = async (email: string, password: string): Promise<void> => {
    try {
      console.log('[Auth] Starting login for:', email);
      await loginMutation.mutateAsync({ email, password });
      console.log('[Auth] Login successful');
    } catch (error: any) {
      console.error('[Auth] Login error:', error);
      
      if (error.message?.includes('Failed to fetch')) {
        throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
      }
      
      if (error.data?.message) {
        throw new Error(error.data.message);
      }
      
      throw new Error(error.message || 'Erreur de connexion');
    }
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  };

  return {
    user,
    token,
    login,
    logout,
    loading,
    isLoggingIn: loginMutation.isPending,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isControleur: user?.role === 'controleur',
    isClient: user?.role === 'client',
    canManageUsers: user?.role === 'admin',
    canManageClients: user?.role === 'admin',
    canManageMachines: user?.role === 'admin',
    canAddMachines: user?.role === 'admin' || user?.role === 'controleur',
    canEditMachineFields: user?.role === 'admin',
    canAddCustomFields: user?.role === 'admin',
    canPerformControls: user?.role === 'admin' || user?.role === 'controleur',
    canViewAllClients: user?.role === 'admin' || user?.role === 'controleur',
  };
});
