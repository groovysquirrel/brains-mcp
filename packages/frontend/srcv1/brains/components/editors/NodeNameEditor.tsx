import React, { useState, useRef, useEffect } from 'react';
import { Icon } from '@blueprintjs/core';
import './NodeNameEditor.css';

export interface NodeNameProps {
  id: string;
  defaultValue?: string;
  placeholder?: string;
  onNameChange: (newName: string) => Promise<{ success: boolean; error?: string }>;
  onEditingChange?: (isEditing: boolean) => void;
}

const NodeName: React.FC<NodeNameProps> = ({ onNameChange, defaultValue, placeholder, onEditingChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(defaultValue || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(defaultValue || '');
  }, [defaultValue]);

  const handleDoubleClick = () => {
    setIsEditing(true);
    onEditingChange?.(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setName(defaultValue || '');
      setIsEditing(false);
      onEditingChange?.(false);
    }
  };

  const handleConfirm = async () => {
    const trimmedName = name.trim();
    if (trimmedName && trimmedName !== defaultValue) {
      const result = await onNameChange(trimmedName);
      if (!result.success) {
        // Reset on failure
        setName(defaultValue || '');
      }
    }
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleCancel = () => {
    setName(defaultValue || '');
    setIsEditing(false);
    onEditingChange?.(false);
  };

  const handleBlur = async () => {
    await handleConfirm();
  };

  return (
    <div className="node-name">
      {isEditing ? (
        <>
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="node-name-input"
            onBlur={handleBlur}
            placeholder={placeholder}
            autoFocus
          />
          <div className="node-name-actions">
            <button className="confirm" onClick={handleConfirm}>
              <Icon icon="tick" size={12} />
            </button>
            <button className="cancel" onClick={handleCancel}>
              <Icon icon="cross" size={12} />
            </button>
          </div>
        </>
      ) : (
        <span onDoubleClick={handleDoubleClick}>
          {name || placeholder}
        </span>
      )}
    </div>
  );
};

export default NodeName; 