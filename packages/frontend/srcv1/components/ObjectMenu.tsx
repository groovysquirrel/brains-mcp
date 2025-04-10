import React, { useState } from 'react';
import { Icon } from '@blueprintjs/core';
import './ObjectMenu.css';

// Base Interfaces
export interface BaseMenuItem {
  value: string;
  displayName: string;
}

export interface BaseVersionItem {
  version: string;
  displayName: string;
}

// Types and Interfaces
export interface SaveResponse {
  success: boolean;
  error?: string | { message: string };
}

export interface SavePayload {
  name: string;
  data: string;
  version: string;
}

interface ObjectMenuProps {
  variant?: 'default' | 'flow';
  className?: string;
  items: BaseMenuItem[];
  versions: BaseVersionItem[];
  selectedItem: string;
  selectedVersion: string;
  label?: string;
  showNewButton?: boolean;
  onItemSelect: (value: string) => void;
  onVersionSelect: (value: string) => void;
  onSave: (data?: any) => Promise<SaveResponse>;
  onLoad: () => Promise<any>;
  onNew: () => void;
  onRename: (newName: string) => Promise<SaveResponse>;
}

// Add version editor component
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

// Add helper function to increment version
const incrementPatchVersion = (version: string): string => {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
};

// Component
const ObjectMenu: React.FC<ObjectMenuProps> = ({
  variant = 'default',
  className = '',
  items,
  versions,
  selectedItem,
  selectedVersion,
  label = 'Item',
  onItemSelect,
  onVersionSelect,
  onSave,
  onLoad,
  onNew,
  onRename
}) => {
  // State
  const [isLibraryOpen, setIsLibraryOpen] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadSuccess, setLoadSuccess] = useState<string>('');
  const [isEditingVersion, setIsEditingVersion] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [previousState, setPreviousState] = useState<{
    item?: string;
    version?: string;
  } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);

  // Event Handlers
  const handleLoad = async () => {
    if (!selectedItem || !selectedVersion) return;
    try {
      const loadedData = await onLoad();
      if (loadedData) {
        setLoadSuccess('Loaded successfully');
        setTimeout(() => setLoadSuccess(''), 5000);
        setIsLibraryOpen(false);
      }
    } catch (error) {
      console.error('Error loading item:', error);
    }
  };

  const handleSave = async () => {
    if (!selectedItem) return;

    setIsSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const newVersion = incrementPatchVersion(selectedVersion);
      console.log('Saving Data:', {
        item: selectedItem,
        version: newVersion,
        data: await onSave()
      });
      const result = await onSave();
      
      if (result.success) {
        setSaveSuccess(true);
        onVersionSelect(newVersion);
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
    onVersionSelect(newVersion);
    setIsEditingVersion(false);
  };

  // Add new handler
  const handleNameSubmit = () => {
    if (newItemName.trim()) {
      onItemSelect(newItemName.trim());
      setIsEditingName(false);
      setNewItemName('');
    }
  };

  const handleNewClick = () => {
    // Store current state before clearing
    setPreviousState({
      item: selectedItem,
      version: selectedVersion
    });
    setIsEditingName(true);
    onNew();
  };

  const handleNameCancel = () => {
    // Restore previous state if it exists
    if (previousState) {
      onItemSelect(previousState.item || '');
      onVersionSelect(previousState.version || '1.0.0');
      setPreviousState(null);
    }
    setIsEditingName(false);
    setNewItemName('');
  };

  // Update rename handler to use the prop
  const handleRename = async () => {
    if (!newItemName.trim() || !selectedItem) return;
    
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

  // Add version selection handler
  const handleVersionSelect = (version: string) => {
    onVersionSelect(version);
    // No automatic loading
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
            <label>{label}</label>
            <select value={selectedItem} onChange={(e) => onItemSelect(e.target.value)}>
              <option value="">Choose from library...</option>
              {items.map(item => (
                <option key={item.value} value={item.value}>
                  {item.displayName}
                </option>
              ))}
            </select>

            {versions.length > 1 && (
              <>
                <label>Version</label>
                <select 
                  value={selectedVersion} 
                  onChange={(e) => handleVersionSelect(e.target.value)}
                >
                  {versions.map(version => (
                    <option key={version.version} value={version.version}>
                      {version.displayName}
                    </option>
                  ))}
                </select>
              </>
            )}

            <button className="primary load-button" onClick={handleLoad} disabled={!selectedItem}>
              <Icon icon="download" />
              Load Selected Item
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
                isRenaming ? setIsRenaming(false) : handleNameCancel();
                setNewItemName('');
              }}
            >
              <Icon icon="cross" />
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <h2 className="item-name">{selectedItem || 'No item selected'}</h2>
      )}
      
      {selectedItem && <div className="item-version">Version {selectedVersion}</div>}
      <div className="item-actions">
        <button className="primary" onClick={handleSave} disabled={!selectedItem || isSaving}>
          <Icon icon="floppy-disk" />
          {isSaving ? 'Saving...' : 'Save'}
        </button>
        <button className="primary" onClick={handleNewClick} title="Create new prompt">
          <Icon icon="plus" />
          New
        </button>
        <button className="primary" onClick={() => setIsEditingVersion(true)}>
          <Icon icon="numbered-list" />
          Change Version
        </button>
        <button 
          className="primary" 
          onClick={() => {
            setIsRenaming(true);
            setNewItemName(selectedItem || '');
          }}
          disabled={!selectedItem}
        >
          <Icon icon="edit" />
          Rename
        </button>
      </div>
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
      {loadSuccess && (
        <div className="success-message">
          <Icon icon="tick-circle" />
          {loadSuccess}
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
    <div className={`menu-panel ${variant === 'flow' ? 'flow-menu-panel' : ''} ${className}`}>
      
      {renderCurrentItemSection()}
      {renderLibrarySection()}
      {renderMessages()}
      
      
      {/* Simplified version editor display */}
      {selectedItem && isEditingVersion && (
        <VersionEditor
          version={selectedVersion}
          onSave={handleVersionSave}
          onCancel={() => setIsEditingVersion(false)}
        />
      )}
    </div>
  );
};

export default ObjectMenu;
