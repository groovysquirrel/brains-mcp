import React, { useState } from 'react';
import './ConfigItem.css';

interface ConfigItemProps {
  label: string;
  type?: 'llm' | 'utility' | 'switchable';
  initialState?: boolean;
  isDisabled?: boolean;
  onChange?: (state: { isLLM: boolean, isVisible: boolean }) => void;
  children?: React.ReactNode;
}

const ConfigItem: React.FC<ConfigItemProps> = ({
  label,
  type = 'switchable',
  initialState = false,
  isDisabled = false,
  onChange,
  children
}) => {
  const [isLLM, setIsLLM] = useState(type === 'llm' ? true : type === 'utility' ? false : initialState);
  const [isVisible, setIsVisible] = useState(false);

  const handleToggle = (checked: boolean) => {
    if (type === 'switchable') {
      setIsLLM(checked);
      setIsVisible(true);
      onChange?.({ isLLM: checked, isVisible: true });
    }
  };

  const handleDropdownToggle = () => {
    if (!isDisabled) {
      setIsVisible(!isVisible);
      onChange?.({ isLLM, isVisible: !isVisible });
    }
  };

  return (
    <div className="config-item" style={isDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
      <div className="config-item-header" onClick={handleDropdownToggle}>
        <label>{label}</label>
        {type === 'switchable' ? (
          <div className="switch-container">
            <span className={`switch-label ${!isLLM ? 'active' : ''}`}>
              Utility
            </span>
            <label className="toggle-switch" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={isLLM}
                disabled={isDisabled}
                onChange={(e) => {
                  e.stopPropagation();
                  handleToggle(e.target.checked);
                }}
              />
              <span className="slider"></span>
            </label>
            <span className={`switch-label ${isLLM ? 'active' : ''}`}>
              LLM
            </span>
          </div>
        ) : (
          <div className="type-label">
            {type === 'llm' ? 'LLM' : 'Utility'}
          </div>
        )}
      </div>
      
      {isVisible && (
        <div className="config-item-content">
          {isLLM ? (
            <>
              <select>
                <option value="">Select LLM...</option>
                <option value="llm1">LLM 1</option>
                <option value="llm2">LLM 2</option>
              </select>
              <select>
                <option value="">Select Prompt...</option>
                <option value="prompt1">Prompt 1</option>
                <option value="prompt2">Prompt 2</option>
              </select>
            </>
          ) : (
            <select>
              <option value="">Select Utility...</option>
              <option value="utility1">Utility 1</option>
              <option value="utility2">Utility 2</option>
            </select>
          )}
          {children}
        </div>
      )}
    </div>
  );
};

export default ConfigItem;