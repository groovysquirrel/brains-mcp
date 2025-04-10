import { useState } from "react";
import "./LLMconfig.css";

/**
 * Interface representing the settings for a Language Learning Model (LLM) configuration
 * @interface LLMSettings
 * @property {string} name - Unique identifier for the LLM configuration
 * @property {string} friendlyName - Display name for the configuration
 * @property {string} url - API endpoint URL for the LLM service
 * @property {string} apiKey - Authentication key for the LLM service
 * @property {string} [originalName] - Original name for the configuration
 */
export interface LLMSettings {
  name: string;
  friendlyName: string;
  url: string;
  apiKey: string;
  originalName?: string;
}

/**
 * Props interface for the LLMConfig component
 * @interface LLMConfigProps
 * @property {string} id - Unique identifier for the configuration
 * @property {LLMSettings} [initialData] - Initial configuration data
 * @property {boolean} [initialEditState] - Whether to start in edit mode
 * @property {Function} onDelete - Callback function when configuration is deleted
 * @property {Function} onChange - Callback function when configuration is updated
 */
export interface LLMConfigProps {
  id: string;
  initialData?: LLMSettings;
  initialEditState?: boolean;
  onDelete: (id: string) => void;
  onChange: (id: string, data: LLMSettings) => Promise<void>;
}

/**
 * LLMConfig Component
 * Renders a configuration interface for LLM settings with edit and view modes
 * 
 * @component
 * @param {LLMConfigProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
export function LLMConfig({ 
  id, 
  initialData, 
  initialEditState = false, 
  onDelete, 
  onChange 
}: LLMConfigProps) {
  // State for managing configuration settings
  const [settings, setSettings] = useState<LLMSettings>(initialData || {
    name: '',
    friendlyName: '',
    url: '',
    apiKey: ''
  });
  
  // State for tracking edit mode
  const [isEditing, setIsEditing] = useState(initialEditState);
  const isNew = !initialData?.friendlyName;

  /**
   * Handles changes to individual settings fields
   * @param {keyof LLMSettings} field - Field being updated
   * @param {string} value - New value for the field
   */
  const handleChange = (field: keyof LLMSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  /**
   * Handles saving configuration changes
   */
  const handleSave = async () => {
    const updatedSettings = {
      ...settings,
      name: settings.name || settings.friendlyName.replace(/\s+/g, '_').toLowerCase(),
      originalName: initialData?.name // Track original name for edits
    };
    try {
      await onChange(id, updatedSettings);
      setIsEditing(false);
    } catch (error) {
      // Optionally handle error here
      console.error('Failed to save configuration:', error);
    }
  };

  /**
   * Handles configuration deletion
   */
  const handleDelete = () => {
    if (isNew) {
      // Just remove from list without API call
      onDelete(id);
    } else {
      // Trigger API deletion
      onDelete(settings.name);
    }
  };

  // Render edit mode
  if (isEditing) {
    return (
      <div className="llm-config">
        <div className="llm-config-header">
          <h3>LLM Configuration</h3>
          <div className="button-group">
            <button onClick={handleSave} className="save-btn">Save</button>
            <button onClick={handleDelete} className="delete-btn">{isNew ? "Cancel" : "Remove"}</button>
          </div>
        </div>
        <div className="llm-config-form">
          <div className="form-group">
            <label>Friendly Name:</label>
            <input
              type="text"
              value={settings.friendlyName}
              onChange={(e) => handleChange("friendlyName", e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label>API URL:</label>
            {/* Hidden email input to prevent autocomplete */}
            <input 
              type="email" 
              style={{ display: 'none' }} 
              tabIndex={-1}
            />
            <input
              type="url"
              value={settings.url}
              onChange={(e) => handleChange("url", e.target.value)}
              autoComplete="nope"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck="false"
              data-lpignore="true"
              data-form-type="other"
            />
          </div>
          <div className="form-group">
            <label>API Key:</label>
            <input
              type="password"
              value={settings.apiKey}
              onChange={(e) => handleChange("apiKey", e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
      </div>
    );
  }

  // Render view mode
  return (
    <div className="llm-config">
      <div className="llm-config-summary">
        <h3>{settings.friendlyName || "Unnamed Configuration"}</h3>
        <div className="summary-item">
          <span className="summary-value">{settings.url}</span>
        </div>
        <div className="button-group">
          <button onClick={() => setIsEditing(true)} className="edit-btn">Edit</button>
          <button onClick={handleDelete} className="delete-btn">Remove</button>
        </div>
      </div>
    </div>
  );
}
