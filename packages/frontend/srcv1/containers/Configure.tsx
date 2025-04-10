import { useState, useEffect } from "react";
import { LLMConfig, type LLMSettings } from "../components/LLMconfig";
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import "./css/Configure.css";

interface LLMContent {
  typename: string;
  content: LLMSettings;
}

export default function Configure() {
  // State for storing LLM configurations
  const [configs, setConfigs] = useState<LLMContent[]>([]);
  // State for error handling
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) throw new Error('No authentication tokens found');
      
      const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('@', '');
      const url = `${API_BASE_URL}/content?type=llm&userid=${currentUser.userId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.tokens.idToken.toString()}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch LLM configurations');
      }
      
      const data = await response.json();
      setConfigs(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching LLM configs:', err);
      setError(err instanceof Error ? err.message : 'Failed to load LLM configurations');
    }
  };

  /**
   * Fetches existing LLM configurations from the API
   * Loads default configurations if none exist
   */
  useEffect(() => {
    fetchConfigs();
  }, []);

  /**
   * Adds a new empty configuration to the list
   */
  const addConfig = () => {
    const newConfig: LLMContent = {
      typename: 'llm',
      content: {
        name: '',
        friendlyName: '',
        url: '',
        apiKey: ''
      }
    };
    
    setConfigs(prevConfigs => [...prevConfigs, newConfig]);
    
    // Scroll to the new configuration
    setTimeout(() => {
      const configsList = document.querySelector('.configs-list');
      if (configsList) {
        configsList.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }, 100);
  };

  // 1. Delete/Remove Configuration
  const removeConfig = async (name: string) => {
    try {
      // For new configs that haven't been saved, just remove from state
      if (!name) {
        setConfigs(prev => prev.filter(config => config.content.name !== name));
        return;
      }

      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) throw new Error('No authentication tokens found');
      
      const typename = name.startsWith('llm#') ? name : `llm#${name}`;
      const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('@', '');
      
      const response = await fetch(
        `${API_BASE_URL}/content?userid=${currentUser.userId}&typename=${encodeURIComponent(typename)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.tokens.idToken.toString()}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (!response.ok) throw new Error('Failed to delete configuration');
      
      // Update local state after successful deletion
      setConfigs(prev => prev.filter(config => config.typename !== typename));
      
    } catch (error) {
      console.error('Error deleting config:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete configuration');
      setTimeout(() => setError(null), 5000);
    }
  };

  // 2. Create/Update Configuration
  const createConfig = async (data: LLMSettings) => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      if (!session.tokens?.idToken) throw new Error('No authentication tokens found');
      
      const API_BASE_URL = import.meta.env.VITE_API_URL?.replace('@', '');
      
      const response = await fetch(`${API_BASE_URL}/content`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.tokens.idToken.toString()}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          userid: currentUser.userId,
          typename: `llm#${data.friendlyName.replace(/\s+/g, '_').toLowerCase()}`,
          content: {
            ...data,
            name: data.friendlyName.replace(/\s+/g, '_').toLowerCase()
          }
        })
      });

      if (!response.ok) throw new Error('Failed to save configuration');
      
      // Refresh the configurations list
      await fetchConfigs();
      
    } catch (error) {
      console.error('Failed to create configuration:', error);
      throw error;
    }
  };

  // 3. Handle Configuration Updates (Create + Delete)
  const handleConfigUpdate = async (_id: string, data: LLMSettings) => {
    try {
      // Optimistically update the UI first
      setConfigs(currentConfigs => {
        const newConfigs = currentConfigs.filter(c => c.content.name !== data.originalName);
        return [...newConfigs, {
          typename: `llm#${data.friendlyName.replace(/\s+/g, '_').toLowerCase()}`,
          content: {
            ...data,
            name: data.friendlyName.replace(/\s+/g, '_').toLowerCase()
          }
        }];
      });

      // Then handle the backend operations
      if (data.originalName) {
        await removeConfig(data.originalName);
      }
      await createConfig(data);
      
      // Optionally fetch to ensure sync (could skip if you're confident in optimistic update)
      // await fetchConfigs();
      
    } catch (error) {
      // On error, revert the optimistic update
      await fetchConfigs();
      setError(error instanceof Error ? error.message : 'Failed to update configuration');
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="configure-container">
      {error && <div className="error-message">{error}</div>}
      <div className="configs-list">
        {configs.map((config, index) => (
          <LLMConfig
            key={`${config.typename}-${index}`}
            id={config.content.name}
            initialData={config.content}
            initialEditState={!config.content.friendlyName}
            onDelete={removeConfig}
            onChange={handleConfigUpdate}
          />
        ))}
        <button onClick={addConfig} className="add-config-button">
          + Add New Configuration
        </button>
      </div>
    </div>
  );
}

