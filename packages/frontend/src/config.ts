const isDemoMode = ['demo', 'demonstration'].includes(import.meta.env.VITE_STAGE || '');

const config = {
  // Backend config
  s3: {
    REGION: import.meta.env.VITE_REGION,
    BUCKET: import.meta.env.VITE_BUCKET,
  },
  apiGateway: {
    REGION: import.meta.env.VITE_REGION,
    URL: import.meta.env.VITE_API_URL,
  },
  cognito: {
    REGION: import.meta.env.VITE_REGION,
    USER_POOL_ID: import.meta.env.VITE_USER_POOL_ID,
    APP_CLIENT_ID: import.meta.env.VITE_USER_POOL_CLIENT_ID,
    IDENTITY_POOL_ID: import.meta.env.VITE_IDENTITY_POOL_ID,
  },
  isDemo: isDemoMode,
  allowedRoutes: isDemoMode 
    ? ['/', '/prompt', '/visualize', '/operate', '/help', '/login', '/test', '/floweditor', '/signup']
    : ['/', '/prompt', '/visualize', '/operate', '/help', '/login', '/signup', '/test', '/floweditor'],
  allowedMenuItems: isDemoMode
    ? ['Prompt', 'Visualize', 'Console', 'Help', 'Editor']
    : ['Prompt', 'Visualize', 'Console', 'Help', 'Editor']
};

export default config;