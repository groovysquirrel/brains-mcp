import React, { useState } from 'react';
import { Icon, Spinner } from '@blueprintjs/core';
import './NewModelModal.css';

interface NewModelModalProps {
  onSubmit: (name: string) => Promise<void>;
  onCancel: () => void;
  title?: string;
  submitLabel?: string;
  initialName?: string;
}

const NewModelModal: React.FC<NewModelModalProps> = ({ 
  onSubmit, 
  onCancel, 
  title = 'Create New Model',
  submitLabel = 'Create',
  initialName = ''
}) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }

    // Convert spaces to underscores and make lowercase
    const sanitizedName = name.trim().replace(/\s+/g, '_').toLowerCase();
    
    // Validate the sanitized name
    if (!/^[a-z0-9_-]+$/.test(sanitizedName)) {
      setError('Name can only contain letters, numbers, underscores, and dashes');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(sanitizedName);
    } catch (error) {
      console.error('Error submitting:', error);
      setError('Failed to create model');
      setIsSubmitting(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(''); // Clear error when user types
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2>{title}</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Enter model name..."
              autoFocus
              disabled={isSubmitting}
            />
            {error && <div className="error-message">
              <Icon icon="warning-sign" />
              {error}
            </div>}
            <div className="help-text">
              Spaces will be converted to underscores. Only letters, numbers, underscores, and dashes are allowed.
            </div>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
            <button 
              type="submit" 
              disabled={!name.trim() || isSubmitting}
              className={isSubmitting ? 'submitting' : ''}
            >
              {isSubmitting && <Spinner size={12} />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewModelModal;
