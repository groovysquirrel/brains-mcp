import React, { useState } from 'react';
import { Check, X } from 'react-bootstrap-icons';
import './CoreHeader.css';

interface CoreHeaderProps {
  name: string;
  status: 'idle' | 'running' | 'complete' | 'error';
  width?: number;
  onNameChange?: (newName: string) => Promise<{ success: boolean; error?: string }>;
  children?: React.ReactNode;
}

export const CoreHeader: React.FC<CoreHeaderProps> = ({
  name,
  status,
  width,
  onNameChange,
  children
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(name);

  const handleSubmit = async () => {
    if (onNameChange) {
      const result = await onNameChange(editValue);
      if (result.success) {
        setIsEditing(false);
      }
    }
  };

  return (
    <div 
      className="core-header"
      style={width ? { width: `${width}px` } : undefined}
    >
      <div className="core-name">
        <div className={`status-indicator status-${status}`} />
        {isEditing ? (
          <div className="core-name-edit">
            <input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="core-name-input"
              autoFocus
            />
            <div className="core-name-actions">
              <button className="confirm" onClick={handleSubmit}>
                <Check size={12} />
              </button>
              <button className="cancel" onClick={() => setIsEditing(false)}>
                <X size={12} />
              </button>
            </div>
          </div>
        ) : (
          <span onClick={() => setIsEditing(true)}>{name}</span>
        )}
      </div>
      {children}
    </div>
  );
}; 