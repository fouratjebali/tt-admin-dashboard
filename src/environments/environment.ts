export const environment = {
  apiBaseUrl: '/api/v1',
  microsoftAuth: {
    clientId: '',
    tenantId: 'common',
    redirectUri: '/login',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
  },
};
