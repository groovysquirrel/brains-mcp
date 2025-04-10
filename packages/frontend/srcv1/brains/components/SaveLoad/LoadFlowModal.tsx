import React, { useEffect, useState } from 'react';
import { Icon } from '@blueprintjs/core';
import './LoadFlowModal.css';
import { get } from '@aws-amplify/api';
import { settingsManager } from '../../../utils/settingsManager';

interface Flow {
  name: string;
  versions: Array<{
    version: string;
    createdAt: string;
  }>;
}

interface FlowListResponse {
  success: boolean;
  items: Flow[];
}

interface LoadFlowModalProps {
  onSelect: (flowName: string, version: string) => Promise<void>;
  onCancel: () => void;
}

const LoadFlowModal: React.FC<LoadFlowModalProps> = ({ onSelect, onCancel }) => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [selectedFlow, setSelectedFlow] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingFlow, setIsLoadingFlow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentFlows, setRecentFlows] = useState(settingsManager.getRecentFlows());

  // Refresh recent flows list whenever the modal is opened
  useEffect(() => {
    setRecentFlows(settingsManager.getRecentFlows());
  }, []);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const restOperation = get({
        apiName: "brainsOS",
        path: "/latest/resources/user/flows"
      });
      
      const response = await restOperation.response;
      const rawData = await response.body.json();
      
      const isFlowListResponse = (data: unknown): data is FlowListResponse => {
        return (
          typeof data === 'object' && 
          data !== null &&
          'success' in data &&
          'items' in data &&
          Array.isArray((data as any).items)
        );
      };

      if (isFlowListResponse(rawData)) {
        if (rawData.success) {
          setFlows(rawData.items);
        } else {
          setError('Failed to load flows');
        }
      } else {
        setError('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching flows:', error);
      setError('Error loading flows. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelect = async (flowName: string, version: string) => {
    try {
      setIsLoadingFlow(true);
      setError(null);
      await onSelect(flowName, version);
      // Update recent flows list after successful load
      setRecentFlows(settingsManager.getRecentFlows());
      onCancel();
    } catch (error) {
      console.error('Error loading flow:', error);
      setError('Failed to load flow');
    } finally {
      setIsLoadingFlow(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content load-flow-modal">
        <header>
          <h2>Load Flow</h2>
          <button className="close-button" onClick={onCancel}>
            <Icon icon="cross" />
          </button>
        </header>

        <div className="modal-body">
          {/* Recent Flows Section */}
          {recentFlows.length > 0 && (
            <section className="recent-flows">
              <h3>
                <Icon icon="history" />
                Recent Flows
              </h3>
              <div className="recent-flow-grid">
                {recentFlows.map(flow => (
                  <button
                    key={`${flow.name}-${flow.version}`}
                    onClick={() => handleSelect(flow.name, flow.version)}
                    className="recent-flow-item"
                  >
                    <span className="flow-name">{flow.name}</span>
                    <span className="flow-version">v{flow.version}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Flow Library Section */}
          <section className="flow-library">
            <h3>
              <Icon icon="book" />
              Flow Library
            </h3>
            
            {isLoading ? (
              <div className="loading-state">
                <Icon icon="refresh" className="spin" />
                <span>Loading flows...</span>
              </div>
            ) : error ? (
              <div className="error-state">
                <Icon icon="error" />
                <span>{error}</span>
                <button onClick={fetchFlows}>Retry</button>
              </div>
            ) : flows.length === 0 ? (
              <div className="empty-state">
                <Icon icon="info-sign" />
                <span>No flows available</span>
              </div>
            ) : (
              <div className="flow-selector">
                <div className="select-group">
                  <label>Flow Name</label>
                  <select 
                    value={selectedFlow} 
                    onChange={(e) => {
                      setSelectedFlow(e.target.value);
                      setSelectedVersion('');
                    }}
                  >
                    <option value="">Select a flow...</option>
                    {flows.map(flow => (
                      <option key={flow.name} value={flow.name}>
                        {flow.name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedFlow && (
                  <div className="select-group">
                    <label>Version</label>
                    <select 
                      value={selectedVersion}
                      onChange={(e) => setSelectedVersion(e.target.value)}
                    >
                      <option value="">Select version...</option>
                      {flows
                        .find(f => f.name === selectedFlow)
                        ?.versions.map(v => {
                          const date = new Date(v.createdAt);
                          const formattedDate = date.toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          });
                          return (
                            <option key={v.version} value={v.version}>
                              {v.version} • {formattedDate}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        <footer className="modal-actions">
          <button className="secondary" onClick={onCancel}>Cancel</button>
          <button 
            className="primary"
            onClick={() => handleSelect(selectedFlow, selectedVersion)}
            disabled={!selectedFlow || !selectedVersion || isLoadingFlow}
          >
            {isLoadingFlow ? (
              <>
                <Icon icon="refresh" className="spin" />
                Loading...
              </>
            ) : (
              'Load Flow'
            )}
          </button>
        </footer>

        {isLoadingFlow && (
          <div className="loading-overlay">
            <Icon icon="refresh" className="spin" size={20} />
            <span>Loading flow...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadFlowModal; 