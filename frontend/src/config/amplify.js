import { Amplify } from 'aws-amplify';

const region = import.meta.env.VITE_COGNITO_REGION;
const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID;
const userPoolClientId = import.meta.env.VITE_COGNITO_APP_CLIENT_ID;

export function configureAmplify() {
  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        region,
        loginWith: { email: true },
      },
    },
  });
}
