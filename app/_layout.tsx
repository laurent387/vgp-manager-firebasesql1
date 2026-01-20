import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from '@/providers/AuthProvider';
import { DataProvider, useData } from '@/providers/DataProvider';
import { trpc, trpcClient } from '@/lib/trpc';

function AppReadyWrapper({ children, setAppReady }: { children: React.ReactNode; setAppReady: (ready: boolean) => void }) {
  const { loading: authLoading } = useAuth();
  const { loading: dataLoading } = useData();

  useEffect(() => {
    console.log('[AppReadyWrapper] authLoading:', authLoading, 'dataLoading:', dataLoading);
    if (!authLoading && !dataLoading) {
      console.log('[AppReadyWrapper] App is ready!');
      setAppReady(true);
    }
  }, [authLoading, dataLoading, setAppReady]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('[AppReadyWrapper] Force showing app after timeout');
      setAppReady(true);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [setAppReady]);

  return <>{children}</>;
}

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    console.log('RootLayoutNav - loading:', loading, 'user:', user);
    if (loading) return;

    const isProtectedRoute = segments.length > 0 && segments[0] !== '+not-found';

    if (!user && isProtectedRoute) {
      console.log('Redirecting to login');
      router.replace('/' as never);
    } else if (user && !isProtectedRoute) {
      console.log('Redirecting to dashboard');
      router.replace('/dashboard' as never);
    }
  }, [user, loading, segments, router]);

  return (
    <Stack screenOptions={{ headerBackTitle: "Retour" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen 
        name="dashboard" 
        options={{ 
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="admin" 
        options={{ 
          title: 'Administration',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="client/[id]" 
        options={{ 
          title: 'Détails client',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="machine/[id]" 
        options={{ 
          title: 'Détails machine',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="control/session" 
        options={{ 
          title: 'Session de contrôle',
          headerShown: true,
        }} 
      />
      <Stack.Screen 
        name="gmao" 
        options={{ 
          title: 'GMAO',
          headerShown: true,
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [appReady, setAppReady] = React.useState(false);

  useEffect(() => {
    if (appReady) {
      console.log('Hiding splash screen');
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <DataProvider>
              <AppReadyWrapper setAppReady={setAppReady}>
                <RootLayoutNav />
              </AppReadyWrapper>
            </DataProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
