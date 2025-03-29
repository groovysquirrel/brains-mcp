import { useState, useRef, useEffect } from 'react';
import { Button, Form } from 'react-bootstrap';
import Draggable from 'react-draggable';
import './NameControl.css';

interface SavedState {
  name: string;
  version: string;
}

interface NameControlProps {
  initialName?: string;
  initialVersion?: string;
  onSave?: (payload: { name: string; version: string }) => void;
  transparent?: boolean;
  draggable?: boolean;
}

export default function NameControl({ 
  initialName = "New Project", 
  initialVersion = "v1.0",
  onSave,
  transparent = false,
  draggable = false
}: NameControlProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentName, setCurrentName] = useState(initialName);
  const [currentVersion, setCurrentVersion] = useState(initialVersion);
  const controlRef = useRef<HTMLDivElement>(null);
  
  const [savedState, setSavedState] = useState<SavedState>({
    name: initialName,
    version: initialVersion
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (isEditing && 
          controlRef.current && 
          !controlRef.current.contains(event.target as Node)) {
        setIsEditing(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing]);

  const handleSave = () => {
    const savePayload = {
      name: currentName,
      version: currentVersion
    };
    
    // Call parent's save handler if provided
    if (onSave) {
      onSave(savePayload);
    }
    
    // Update local saved state
    setSavedState(savePayload);
    setIsEditing(false);
  };

  const handleLoad = () => {
    setCurrentName(savedState.name);
    setCurrentVersion(savedState.version);
    setIsEditing(false);
  };

  const content = (
    <div 
      className={`name-control ${isEditing ? 'editing' : ''} ${transparent ? 'transparent' : ''}`} 
      ref={controlRef}
    >
      {isEditing ? (
        <div className="edit-form">
          <div className="name-control-form-group">
            <div className="form-label">Name</div>
            <Form.Control
              size="sm"
              type="text"
              value={currentName}
              onChange={(e) => setCurrentName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
              className="name-input"
            />
          </div>
          
          <div className="name-control-form-group">
            <div className="form-label">Version</div>
            <Form.Select 
              size="sm" 
              value={currentVersion}
              onChange={(e) => setCurrentVersion(e.target.value)}
              className="version-select"
            >
              <option value="v1.0">v1.0</option>
              <option value="v1.1">v1.1</option>
              <option value="v2.0">v2.0</option>
              {/* Add more options as needed */}
            </Form.Select>
          </div>

          <div className="button-group">
            <Button size="sm" variant="primary" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="secondary" onClick={handleLoad}>Load</Button>
          </div>
        </div>
      ) : (
        <div className="display-container" onClick={() => setIsEditing(true)}>
          <div className="name-display">{savedState.name}</div>
          <div className="version-display">{savedState.version}</div>
        </div>
      )}
    </div>
  );

  return draggable ? (
    <Draggable
      handle=".drag-handle"
      bounds="parent"
      defaultPosition={{x: 0, y: 0}}
    >
      {content}
    </Draggable>
  ) : content;
} 