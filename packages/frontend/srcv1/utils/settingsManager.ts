interface FlowSettings {
  recentFlows: {
    name: string;
    version: string;
    lastAccessed: number;
  }[];
  lastOpenFlow?: {
    name: string;
    version: string;
    data: any;
    versions?: Array<{
      version: string;
      displayName: string;
      createdAt: string;
      createdBy: string;
      itemId: string;
    }>;
    versionsLastFetched?: number;
  };
  lastOpenModel?: {
    name: string;
    version: string;
    data?: any;
    versions?: any[];
    lastFetch?: number;
  };
  preferences?: {
    theme?: 'light' | 'dark';
    autoSave?: boolean;
    defaultModel?: string;
  };
}

const STORAGE_KEY = 'brainsOS_settings';
const MAX_RECENT_FLOWS = 5;
const VERSIONS_CACHE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export const settingsManager = {
  getSettings: (): FlowSettings => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : { recentFlows: [] };
  },

  saveSettings: (settings: FlowSettings) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  },

  updateLastOpenFlow: (name: string, version: string, data: any, versions?: any[]) => {
    const settings = settingsManager.getSettings();
    
    // Reset execution state for all nodes if data contains nodes
    if (data && Array.isArray(data.nodes)) {
      data.nodes = data.nodes.map((node: any) => ({
        ...node,
        data: {
          ...node.data,
          status: 'idle',
          error: undefined,
          metadata: {}
        }
      }));
    }
    
    settings.lastOpenFlow = { 
      name, 
      version, 
      data,
      versions,
      versionsLastFetched: versions ? Date.now() : undefined
    };
    
    // Update recent flows
    const existingIndex = settings.recentFlows.findIndex(f => f.name === name);
    if (existingIndex !== -1) {
      settings.recentFlows.splice(existingIndex, 1);
    }
    
    settings.recentFlows.unshift({
      name,
      version,
      lastAccessed: Date.now()
    });

    settings.recentFlows = settings.recentFlows.slice(0, MAX_RECENT_FLOWS);
    
    settingsManager.saveSettings(settings);
  },

  getLastOpenFlow: () => {
    const settings = settingsManager.getSettings();
    return settings.lastOpenFlow;
  },

  getRecentFlows: () => {
    const settings = settingsManager.getSettings();
    return settings.recentFlows;
  },

  updatePreferences: (preferences: FlowSettings['preferences']) => {
    const settings = settingsManager.getSettings();
    settings.preferences = { ...settings.preferences, ...preferences };
    settingsManager.saveSettings(settings);
  },

  getPreferences: () => {
    const settings = settingsManager.getSettings();
    return settings.preferences;
  },

  shouldFetchVersions: (flowName: string): boolean => {
    const settings = settingsManager.getSettings();
    const lastOpenFlow = settings.lastOpenFlow;
    
    if (!lastOpenFlow || lastOpenFlow.name !== flowName) return true;
    if (!lastOpenFlow.versions || !lastOpenFlow.versionsLastFetched) return true;
    
    const timeSinceLastFetch = Date.now() - lastOpenFlow.versionsLastFetched;
    return timeSinceLastFetch > VERSIONS_CACHE_TIMEOUT;
  },

  updateLastOpenModel: (name: string, version: string, data: any, versions?: any[]) => {
    const settings = settingsManager.getSettings();
    settings.lastOpenModel = {
      name,
      version,
      data,
      versions,
      lastFetch: versions ? Date.now() : settings.lastOpenModel?.lastFetch
    };
    settingsManager.saveSettings(settings);
  },

  getLastOpenModel: () => {
    const settings = settingsManager.getSettings();
    return settings.lastOpenModel;
  },

  shouldFetchModelVersions: (_modelName: string) => {
    const settings = settingsManager.getSettings();
    const lastFetch = settings.lastOpenModel?.lastFetch;
    return !lastFetch || Date.now() - lastFetch > 5 * 60 * 1000; // 5 minutes
  }
}; 