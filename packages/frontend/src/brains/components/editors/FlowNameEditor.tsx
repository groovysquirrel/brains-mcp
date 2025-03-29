import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '@blueprintjs/core';
import './FlowNameEditor.css';

interface FlowNameEditorProps {
  id: string;
  defaultValue?: string;
  placeholder?: string;
  onNameChange?: (newName: string) => Promise<{ success: boolean; error?: string }>;
  onEditingChange?: (isEditing: boolean) => void;
}

const FlowNameEditor: React.FC<FlowNameEditorProps> = ({
  defaultValue = '',
  placeholder = 'Untitled Flow',
  onNameChange,
  onEditingChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
    onEditingChange?.(true);
  }, [onEditingChange]);

  const handleConfirm = useCallback(async () => {
    if (!onNameChange) return;
    
    const newName = value.trim();
    if (!newName) {
      setValue(defaultValue);
      setIsEditing(false);
      onEditingChange?.(false);
      return;
    }

    const result = await onNameChange(newName);
    if (result.success) {
      setError(null);
      setIsEditing(false);
      onEditingChange?.(false);
    } else {
      setError(result.error || 'Failed to update name');
    }
  }, [value, defaultValue, onNameChange, onEditingChange]);

  const handleCancel = useCallback(() => {
    setValue(defaultValue);
    setError(null);
    setIsEditing(false);
    onEditingChange?.(false);
  }, [defaultValue, onEditingChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleConfirm, handleCancel]);

  return (
    <div className="flow-name-editor">
      {isEditing ? (
        <div className="flow-name-editor__edit-container">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={error ? 'error' : ''}
          />
          <div className="flow-name-editor__actions">
            <button onClick={handleConfirm} className="confirm" title="Confirm">
              <Icon icon="tick" size={12} />
            </button>
            <button onClick={handleCancel} className="cancel" title="Cancel">
              <Icon icon="cross" size={12} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flow-name-editor__display" onClick={handleStartEdit}>
          <span className="flow-name-editor__text">
            {value || placeholder}
          </span>
          <Icon icon="edit" size={12} className="flow-name-editor__edit-icon" />
        </div>
      )}
    </div>
  );
};

export default FlowNameEditor;
