import React, { useState } from 'react';
import { Icon } from '@blueprintjs/core';
import NewModelModal from './SaveLoad/NewModelModal';
import './ModelMenu.css';

// Types and Interfaces
export interface SaveResponse {
  success: boolean;
  error?: string | { message: string };
}

export interface BaseMenuItem {
  value: string;
  displayName: string;
}

export interface BaseVersionItem {
  version: string;
  displayName: string;
  createdAt?: string;
  createdBy?: string;
  itemId?: string;
}

interface ModelMenuProps {
  selectedModel: string;
  selectedVersion: string;
  versions: BaseVersionItem[];
  models: string[];
  onSave: () => Promise<SaveResponse>;
  onSaveAs: (newName: string) => Promise<SaveResponse>;
  onRename: (newName: string) => Promise<SaveResponse>;
  onVersionChange: (version: string) => void;
  onModelSelect: (name: string, version: string) => Promise<void>;
  onModelChange: (name: string) => void;
  onNew: () => void;
}

// Version editor component
const VersionEditor: React.FC<{
  version: string;
  onSave: (version: string) => void;
  onCancel: () => void;
}> = ({ version, onSave, onCancel }) => {
  const [major, setMajor] = useState<number>(parseInt(version.split('.')[0]));
  const [minor, setMinor] = useState<number>(parseInt(version.split('.')[1]));
  const [patch, setPatch] = useState<number>(parseInt(version.split('.')[2]));

  const updateVersion = () => `${major}.${minor}.${patch}`;

  return (
    <div className="version-editor">
      <div className="version-numbers-container">
        <div className="version-label-row">
          <span>Major</span>
          <span>Minor</span>
          <span>Patch</span>
        </div>
        <div className="version-numbers">
          <div className="version-input-group">
            <input type="text" value={major} readOnly />
            <button className="micro primary" onClick={() => setMajor(major + 1)}>
              <Icon icon="plus" />
            </button>
          </div>
          <span className="version-separator">.</span>
          <div className="version-input-group">
            <input type="text" value={minor} readOnly />
            <button className="micro primary" onClick={() => setMinor(minor + 1)}>
              <Icon icon="plus" />
            </button>
          </div>
          <span className="version-separator">.</span>
          <div className="version-input-group">
            <input type="text" value={patch} readOnly />
            <button className="micro primary" onClick={() => setPatch(patch + 1)}>
              <Icon icon="plus" />
            </button>
          </div>
        </div>
      </div>
      <div className="version-actions">
        <button className="secondary small" onClick={onCancel}>Cancel</button>
        <button className="primary small" onClick={() => onSave(updateVersion())}>Save</button>
      </div>
    </div>
  );
};

const ModelMenu: React.FC<ModelMenuProps> = ({
  selectedModel,
  selectedVersion,
  versions,
  models,
  onSave,
  onSaveAs,
  onRename,
  onVersionChange,
  onModelSelect,
  onModelChange,
  onNew
}) => {
  // State
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempSelectedModel, setTempSelectedModel] = useState('');
  const [tempSelectedVersion, setTempSelectedVersion] = useState('');
  const [showNewModal, setShowNewModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);

  // Event Handlers
  const handleSave = async () => {
    if (!selectedModel) return;

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const result = await onSave();
      
      if (result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.error?.toString() || 'Unknown error');
      }
    } catch (error) {
      setSaveError('Failed to save');
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Add version management handlers
  const handleVersionSave = (newVersion: string) => {
    onVersionChange(newVersion);
    setIsEditingVersion(false);
  };

  // Add new handler
  const handleNameSubmit = () => {
    if (newItemName.trim()) {
      onSaveAs(newItemName.trim());
      setIsEditingName(false);
      setNewItemName('');
    }
  };

  // Update rename handler
  const handleRename = async () => {
    if (!newItemName.trim() || !selectedModel) return;
    
    try {
      const result = await onRename(newItemName);
      if (result.success) {
        setIsRenaming(false);
        setNewItemName('');
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(result.error?.toString() || 'Failed to rename');
      }
    } catch (error) {
      console.error('Rename error:', error);
      setSaveError('Failed to rename');
    }
  };

  // Add handlers for modal operations
  const handleNewSubmit = async (name: string) => {
    try {
      // First clear the UI state
      onNew();
      
      // Then save the empty model with the new name
      const result = await onSaveAs(name);
      if (result.success) {
        // Close the modal
        setShowNewModal(false);
        
        // Finally, load the newly created model to update UI state
        await onModelSelect(name, '0.0.1');
      } else {
        setSaveError(result.error?.toString() || 'Failed to create model');
      }
    } catch (error) {
      console.error('Error creating new model:', error);
      setSaveError('Failed to create new model');
    }
  };

  const handleSaveAsSubmit = async (name: string) => {
    try {
      // Save current content under new name
      await onSaveAs(name);
      // Close the modal
      setShowSaveAsModal(false);
    } catch (error) {
      console.error('Error saving model as:', error);
      setSaveError('Failed to save model as');
    }
  };

  // Render Functions
  const renderLibrarySection = () => (
    <div className="library-section">
      <button 
        className={`library-button ${isLibraryOpen ? 'open' : ''}`} 
        onClick={() => setIsLibraryOpen(!isLibraryOpen)}
      >
        <div className="button-content">
          <Icon icon="book" />
          Library
        </div>
        <Icon icon={isLibraryOpen ? 'chevron-up' : 'chevron-down'} />
      </button>

      {isLibraryOpen && (
        <div className="library-content open">
          <div className="library-select-group">
            <label>Model</label>
            <select 
              value={tempSelectedModel} 
              onChange={(e) => {
                const model = e.target.value;
                console.log('Selected model:', model);
                setTempSelectedModel(model);
                setTempSelectedVersion('');
                onModelChange(model);
              }}
            >
              <option value="">Select a model...</option>
              {models.map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>

            {tempSelectedModel && versions.length > 0 && (
              <div className="select-group">
                <label>Version</label>
                <select 
                  value={tempSelectedVersion}
                  onChange={(e) => {
                    const version = e.target.value;
                    console.log('Selected version:', version);
                    setTempSelectedVersion(version);
                  }}
                >
                  <option value="">Select version...</option>
                  {versions.map(v => (
                    <option key={v.version} value={v.version}>
                      v{v.version} • {new Date(v.createdAt || '').toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button 
              className="primary load-button" 
              onClick={() => {
                if (tempSelectedModel && tempSelectedVersion) {
                  console.log('Loading model:', {
                    model: tempSelectedModel,
                    version: tempSelectedVersion,
                    url: `/latest/resources/user/models/${tempSelectedModel.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}/${tempSelectedVersion}`
                  });
                  onModelSelect(tempSelectedModel, tempSelectedVersion);
                }
              }}
              disabled={!tempSelectedModel || !tempSelectedVersion}
            >
              <Icon icon="download" />
              Load Selected Model
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderCurrentItemSection = () => (
    <div className="current-item-section">
      {(isEditingName || isRenaming) ? (
        <div className="name-editor">
          <input
            type="text"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            placeholder={isRenaming ? "Enter new name..." : "Enter name..."}
            autoFocus
            className="name-input"
          />
          <div className="name-actions">
            <button 
              className="primary" 
              onClick={isRenaming ? handleRename : handleNameSubmit}
            >
              <Icon icon="tick" />
              {isRenaming ? 'Rename' : 'Create'}
            </button>
            <button 
              className="secondary" 
              onClick={() => {
                isRenaming ? setIsRenaming(false) : setIsEditingName(false);
                setNewItemName('');
              }}
            >
              <Icon icon="cross" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <h2 className="item-name">{selectedModel || 'No model selected'}</h2>
      )}
      
      {selectedModel && <div className="item-version">Version {selectedVersion}</div>}
      <div className="item-actions">
        <button className="primary" onClick={handleSave} disabled={!selectedModel || isSaving}>
          <Icon icon="floppy-disk" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button className="primary" onClick={() => setShowNewModal(true)} title="Create new model">
          <Icon icon="plus" />
          New
        </button>
        <button className="primary" onClick={() => setShowSaveAsModal(true)} title="Save as new model">
          <Icon icon="duplicate" />
          Save As
        </button>
        <button className="primary" onClick={() => setIsEditingVersion(true)}>
          <Icon icon="numbered-list" />
          Change Version
        </button>
        <button 
          className="primary" 
          onClick={() => {
            setIsRenaming(true);
            setNewItemName(selectedModel || '');
          }}
          disabled={!selectedModel}
        >
          <Icon icon="edit" />
          Rename
        </button>
      </div>

      {/* Add modals */}
      {showNewModal && (
        <NewModelModal
          onSubmit={handleNewSubmit}
          onCancel={() => setShowNewModal(false)}
          title="Create New Model"
          submitLabel="Create"
        />
      )}
      
      {showSaveAsModal && (
        <NewModelModal
          onSubmit={handleSaveAsSubmit}
          onCancel={() => setShowSaveAsModal(false)}
          title="Save Model As"
          submitLabel="Save"
          initialName={selectedModel}
        />
      )}
    </div>
  );

  const renderMessages = () => (
    <>
      {saveSuccess && (
        <div className="success-message">
          <Icon icon="tick-circle" />
          Saved successfully
        </div>
      )}
      {saveError && (
        <div className="error-message">
          <Icon icon="error" />
          {saveError}
        </div>
      )}
    </>
  );

  // Main Render
  return (
    <div className="menu-panel">
      {renderCurrentItemSection()}
      {renderLibrarySection()}
      {renderMessages()}
      
      {/* Version editor display */}
      {selectedModel && isEditingVersion && (
        <VersionEditor
          version={selectedVersion}
          onSave={handleVersionSave}
          onCancel={() => setIsEditingVersion(false)}
        />
      )}
    </div>
  );
};

export default ModelMenu;
