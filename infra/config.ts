// Base domain configuration
// domain must be registered in Route53
export const baseDomain = "brainsos.ai";

interface DomainConfig {
  api: {
    latest: {
      prod: string;
      demo: string;
      dev: string;
    };

  };
  websocket: {
    latest: {
      prod: string;
      demo: string;
      dev: string;
    }
  };
  frontend: {
    latest: {
      prod: string;
      demo: string;
      dev: string;
    }
  }
}

interface BrainsOSVersionConfig {
  latest: string;
}

// Update interface to be stage-specific
interface CorsConfig {
  additionalDev: string[];  // for localhost and any other dev-only URLs
}

interface EmailConfig {
  prod: string;
  demo: string;
  dev: string;
}



export const emails: EmailConfig = {
  prod: `system@prod.${baseDomain}`,
  demo: `system@demo.${baseDomain}`,
  dev: `system@dev.${baseDomain}`
};

export const cors: CorsConfig = {
  additionalDev: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ]
};

export const LoadDefaults = true;

export const domains: DomainConfig = {
  api: {
    latest: {
      prod: `api.${baseDomain}`,
      demo: `demo-api.${baseDomain}`,
      dev: `dev-api.${baseDomain}`
    },
  },
  websocket: {
    latest: {
      prod: `wss.${baseDomain}`,
      demo: `demo-wss.${baseDomain}`,
      dev: `dev-wss.${baseDomain}`
    },
  },
  frontend: {
    latest: {
      prod: `www.${baseDomain}`,
      demo: `demo.${baseDomain}`,
      dev: `dev.${baseDomain}`
    }
  }
};

export const version : BrainsOSVersionConfig = {
  latest: "1.0.0",
}

export function getVersion(versionKey: 'latest' | 'v1' | 'v2', stage: string): string {
  return version[versionKey];
}

export function getDomainName(
  type: 'api' | 'frontend' | 'websocket',
  version: 'latest' | 'v1' | 'v2',
  stage: string
): string {
  // Normalize stage by removing any 'stage=' prefix and trimming whitespace
  const normalizedStage = stage.replace('stage=', '').trim();
  
  // Map stage aliases to standard stage names
  const stageMap = getStageMap(normalizedStage)
  const stageKey = stageMap[normalizedStage] || 'dev';
  const domain = domains[type][version][stageKey];
  
  console.log(`Domain name for ${type}(${version}) in stage ${normalizedStage} is ${domain}`);
  
  return domain;
}

export function getStageMap(stage: string): Record<string, 'prod' | 'demo' | 'dev'> {
  
  const stageMap: Record<string, 'prod' | 'demo' | 'dev'> = {
    'prod': 'prod',
    'production': 'prod',
    'demo': 'demo',
    'demonstration': 'demo',
    'dev': 'dev',
    'development': 'dev'
  };
  
  return stageMap;

}

// Add helper function to get CORS origins
export function getCorsOrigins(stage: string): string[] {
  console.log('getCorsOrigins called with stage:', stage);

  const normalizedStage = stage.replace('stage=', '').trim();
  console.log('normalizedStage:', normalizedStage);
  
  const isProduction = ['prod', 'production'].includes(normalizedStage);
  const isDemo = ['demo', 'demonstration'].includes(normalizedStage);

  // Get the appropriate domain config based on stage
  const stageKey = isProduction ? 'prod' : isDemo ? 'demo' : 'dev';
  console.log('stageKey:', stageKey);

  // Generate URLs from domains config
  const allowedOrigins = [
    `https://${domains.frontend.latest[stageKey]}`,
  ];

  // Only add development URLs for dev environment
  if (!isProduction && !isDemo) {
    console.log('Adding dev origins:', cors.additionalDev);
    allowedOrigins.push(...cors.additionalDev);
  }

  console.log('Final allowedOrigins:', allowedOrigins);
  return allowedOrigins;
}

// Add helper function to get email based on stage
export function getEmail(stage: string): string {
  const normalizedStage = stage.replace('stage=', '').trim();
  const stageMap = getStageMap(normalizedStage);
  const stageKey = stageMap[normalizedStage] || 'dev';
  const email = emails[stageKey];

  console.log(`Email for stage ${normalizedStage} is ${email}`);
  
  return email;
}
