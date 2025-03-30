import React from 'react';
import { Card } from 'react-bootstrap';
import { MCPClientActivity } from '../types';

interface SolutionOutputProps {
  activities: MCPClientActivity[];
}

export default function SolutionOutput({ activities }: SolutionOutputProps) {
  const latestSolution = activities
    .filter((activity) => activity.type === 'solution_update')
    .slice(-1)[0];

  return (
    <Card className="h-100">
      <Card.Header>Solution Output</Card.Header>
      <Card.Body>
        {latestSolution ? (
          <pre className="mb-0">
            {JSON.stringify(latestSolution.details, null, 2)}
          </pre>
        ) : (
          <p className="text-muted mb-0">No solution available yet</p>
        )}
      </Card.Body>
    </Card>
  );
} 