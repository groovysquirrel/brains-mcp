import React, { useState } from 'react';
import { Icon } from '@blueprintjs/core';
import FlowNameEditor from './editors/FlowNameEditor';
import VersionEditor from './editors/VersionEditor';
import LoadFlowModal from './SaveLoad/LoadFlowModal';
import NewFlowModal from './SaveLoad/NewFlowModal';
import { FlowMenuProps, StatusMessage } from '../types';
import './FlowMenu.css';

const FlowMenu: React.FC<FlowMenuProps> = ({
  selectedFlow,
  selectedVersion,
  versions,
  onSave,
  onSaveAs,
  onRename,
  onVersionChange,
  onFlowSelect,
  onNew
}) => {
  const [status, setStatus] = useState<StatusMessage>({ type: null, message: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [showSaveAsModal, setShowSaveAsModal] = useState(false);

  const handleSave = async () => {
    if (isSaving) return;
    
    try {
      console.log('=== FlowMenu Save ===');
      console.log('Starting save operation');
      console.log('Current flow:', selectedFlow);
      console.log('Current version:', selectedVersion);
      
      setIsSaving(true);
      setStatus({ type: null, message: '' });
      
      const result = await onSave();
      console.log('Save result:', result);
      console.log('====================');
      
      if (result.success) {
        setStatus({ type: 'success', message: 'Flow saved successfully' });
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to save flow' });
      }
    } catch (error) {
      console.error('Save error:', error);
      setStatus({ type: 'error', message: 'Failed to save flow' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    }
  };

  const handleSaveAs = async (newName: string) => {
    try {
      const result = await onSaveAs(newName);
      if (result.success) {
        setStatus({ type: 'success', message: 'Flow saved successfully' });
      } else {
        setStatus({ type: 'error', message: result.error || 'Failed to save flow' });
      }
    } catch (error) {
      console.error('Save As error:', error);
      setStatus({ type: 'error', message: 'Failed to save flow' });
    } finally {
      setShowSaveAsModal(false);
      setTimeout(() => setStatus({ type: null, message: '' }), 3000);
    }
  };

  return (
    <div className="flow-menu">
      <div className="flow-menu__actions">
        <div className="flow-identifier">
          <FlowNameEditor 
            id={selectedFlow} 
            onNameChange={onRename}
            defaultValue={selectedFlow}
            placeholder="Untitled Flow"
          />
          <VersionEditor 
            version={selectedVersion}
            onVersionChange={onVersionChange}
            versions={versions}
          />
        </div>

        <div className="flow-menu__buttons">
          <button className="flow-button" onClick={() => setShowLoadModal(true)}>
            <Icon icon="book" size={12} />
            Library
          </button>
          <button className="flow-button" onClick={onNew}>
            <Icon icon="document" size={12} />
            New
          </button>
          <button className="flow-button" onClick={() => setShowSaveAsModal(true)}>
            <Icon icon="duplicate" size={12} />
            Save As
          </button>
          <button 
            className="flow-button" 
            onClick={handleSave} 
            disabled={isSaving}
          >
            <Icon 
              icon={isSaving ? "refresh" : "floppy-disk"} 
              className={isSaving ? "spin-animation" : ""} 
              size={12}
            />
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {status.type && (
        <div className={`status-message ${status.type}`}>
          <Icon icon={status.type === 'success' ? 'tick-circle' : 'error'} size={12} />
          {status.message}
        </div>
      )}

      {showLoadModal && (
        <LoadFlowModal
          onSelect={onFlowSelect}
          onCancel={() => setShowLoadModal(false)}
        />
      )}

      {showSaveAsModal && (
        <NewFlowModal
          onSubmit={handleSaveAs}
          onCancel={() => setShowSaveAsModal(false)}
          title="Save As"
          submitLabel="Save"
        />
      )}
    </div>
  );
};

export default FlowMenu; 