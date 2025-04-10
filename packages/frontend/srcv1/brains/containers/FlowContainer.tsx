import React from 'react';
import { FlowManager } from '../components/FlowManager';
import './FlowContainer.css';

export const FlowContainer: React.FC = () => {
  return (
    <div className="flow-container">
      <FlowManager />
    </div>
  );
};

export default FlowContainer;