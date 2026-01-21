import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const customUrl = process.env.EXPO_PUBLIC_API_URL;
  if (customUrl) {
    console.log('[tRPC] Using custom API URL:', customUrl);
    return customUrl;
  }

  if (__DEV__) {
    const rorkUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
    if (rorkUrl) {
      console.log('[tRPC] Using Rork API URL:', rorkUrl);
      return rorkUrl;
    }
    console.log('[tRPC] Using localhost');
    return 'http://localhost:3000';
  }

  console.log('[tRPC] Using production API URL: https://api.in-spectra.com');
  return 'https://api.in-spectra.com';
};

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});
