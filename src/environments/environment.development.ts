export const environment = {
  apiBaseUrl: 'http://localhost:8000/api/v1',
  microsoftAuth: {
    clientId: '',
    tenantId: 'common',
    redirectUri: 'http://localhost:4200/login',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
  },
};
