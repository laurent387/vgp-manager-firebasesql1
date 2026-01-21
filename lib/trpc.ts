import { httpLink } from "@trpc/client";
import { createTRPCReact } from "@trpc/react-query";
import superjson from "superjson";

import type { AppRouter } from "@/backend/trpc/app-router";

export const trpc = createTRPCReact<AppRouter>();

const getBaseUrl = () => {
  const customUrl = process.env.EXPO_PUBLIC_API_URL;
  if (customUrl) {
    return customUrl;
  }

  const rorkUrl = process.env.EXPO_PUBLIC_RORK_API_BASE_URL;
  if (rorkUrl) {
    return rorkUrl;
  }

  if (__DEV__) {
    return 'http://localhost:3000';
  }

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
