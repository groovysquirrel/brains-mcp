import { FlowData, FlowVersion } from '../types';

interface LastOpenFlow {
  name: string;
  version: string;
  data?: FlowData;
  versions?: FlowVersion[];
  lastVersionsFetch?: number;
}

class SettingsManager {
  private readonly LAST_OPEN_FLOW_KEY = 'lastOpenFlow';
  private readonly VERSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  getLastOpenFlow(): LastOpenFlow | null {
    const stored = localStorage.getItem(this.LAST_OPEN_FLOW_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  }

  updateLastOpenFlow(
    name: string,
    version: string,
    data?: FlowData,
    versions?: FlowVersion[]
  ): void {
    const lastOpenFlow: LastOpenFlow = {
      name,
      version,
      data,
      versions,
      lastVersionsFetch: versions ? Date.now() : undefined
    };
    localStorage.setItem(this.LAST_OPEN_FLOW_KEY, JSON.stringify(lastOpenFlow));
  }

  shouldFetchVersions(flowName: string): boolean {
    const lastOpenFlow = this.getLastOpenFlow();
    if (!lastOpenFlow || lastOpenFlow.name !== flowName) return true;
    if (!lastOpenFlow.lastVersionsFetch) return true;
    return Date.now() - lastOpenFlow.lastVersionsFetch > this.VERSION_CACHE_TTL;
  }
}

export const settingsManager = new SettingsManager(); 