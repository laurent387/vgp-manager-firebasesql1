import { Amplify } from 'aws-amplify';

export function configureAmplify() {
  Amplify.configure({
    API: {
      GraphQL: {
        endpoint: 'https://hknmkqozknde7mdh72qwmhkrii.appsync-api.us-east-1.amazonaws.com/graphql',
        region: 'us-east-1',
        defaultAuthMode: 'userPool',
      }
    },
    Auth: {
      Cognito: {
        userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID || '',
        userPoolClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID || '',
        identityPoolId: process.env.EXPO_PUBLIC_COGNITO_IDENTITY_POOL_ID || '',
        signUpVerificationMethod: 'code',
        loginWith: {
          email: true,
        }
      }
    }
  });
}
