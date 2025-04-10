import React, { useState, useEffect } from 'react';
import { Icon } from '@blueprintjs/core';
import './VersionEditor.css';

interface VersionEditorProps {
  version: string;
  onVersionChange: (version: string) => void;
  versions: Array<{
    version: string;
    displayName: string;
  }>;
}

const VersionEditor: React.FC<VersionEditorProps> = ({ version, onVersionChange }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [major, minor, patch] = version.split('.').map(Number);
  const [editValues, setEditValues] = useState({ major, minor, patch });

  // Update local state when version prop changes
  useEffect(() => {
    const [newMajor, newMinor, newPatch] = version.split('.').map(Number);
    setEditValues({ major: newMajor, minor: newMinor, patch: newPatch });
  }, [version]);

  const handleConfirm = () => {
    const newVersion = `${editValues.major}.${editValues.minor}.${editValues.patch}`;
    onVersionChange(newVersion);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValues({ major, minor, patch });
    setIsEditing(false);
  };

  const increment = (field: 'major' | 'minor' | 'patch') => {
    setEditValues(prev => ({
      ...prev,
      [field]: prev[field] + 1
    }));
  };

  return (
    <div className="version-editor">
      {isEditing ? (
        <>
          <div className="version-numbers">
            <div className="version-number">
              <span>{editValues.major}</span>
              <button onClick={() => increment('major')}>
                <Icon icon="plus" size={10} />
              </button>
            </div>
            <span className="version-dot">.</span>
            <div className="version-number">
              <span>{editValues.minor}</span>
              <button onClick={() => increment('minor')}>
                <Icon icon="plus" size={10} />
              </button>
            </div>
            <span className="version-dot">.</span>
            <div className="version-number">
              <span>{editValues.patch}</span>
              <button onClick={() => increment('patch')}>
                <Icon icon="plus" size={10} />
              </button>
            </div>
            <div className="version-actions">
              <button className="confirm" onClick={handleConfirm}>
                <Icon icon="tick" size={12} />
              </button>
              <button className="cancel" onClick={handleCancel}>
                <Icon icon="cross" size={12} />
              </button>
            </div>
          </div>
        </>
      ) : (
        <span onDoubleClick={() => setIsEditing(true)}>
          {version}
        </span>
      )}
    </div>
  );
};

export default VersionEditor; 