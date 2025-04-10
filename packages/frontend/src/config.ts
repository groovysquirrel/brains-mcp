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
  allowedRoutes: [
    "/",
    "/about",
    "/console",
    "/cost-manager",
    "/prompt-studio",
    "/help",
    "/login",
    "/signup"
  ],
  allowedMenuItems: [
    "Console",
    "Cost Manager",
    "Prompt Studio",
    "Help"
  ],
  api: {
    websocket: import.meta.env.VITE_WEBSOCKET_URL || 'wss://api.your-domain.com/ws'
  }
};

export default config;