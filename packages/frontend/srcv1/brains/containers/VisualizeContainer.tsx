import React from 'react';
import Transform from '../components/Transform';
import './VisualizeContainer.css';

const VisualizeContainer: React.FC = () => {
  return (
    <div className="visualize-container">
      <Transform />
    </div>
  );
};

export default VisualizeContainer;
