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

  const rorkUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (rorkUrl) {
    console.log('[tRPC] Using Rork API URL:', rorkUrl);
    return rorkUrl;
  }

  console.log('[tRPC] No API URL found, using relative path');
  return '';
};

const baseUrl = getBaseUrl();
console.log('[tRPC] Initialized with base URL:', baseUrl);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${baseUrl}/api/trpc`,
      transformer: superjson,
      async fetch(url, options) {
        console.log('[tRPC] Request:', url);
        const response = await fetch(url, {
          ...options,
          headers: {
            ...options?.headers,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        });
        
        if (!response.ok) {
          console.error('[tRPC] Response not OK:', response.status, response.statusText);
        }
        
        return response;
      },
    }),
  ],
});
