import React from 'react';
import { Card, ListGroup, Badge } from 'react-bootstrap';
import { MCPClientActivity } from '../types';

interface ActivityLogProps {
  activities: MCPClientActivity[];
}

export default function ActivityLog({ activities }: ActivityLogProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'failed':
        return 'danger';
      default:
        return 'warning';
    }
  };

  return (
    <Card className="h-100">
      <Card.Header>Activity Log</Card.Header>
      <Card.Body>
        <ListGroup variant="flush">
          {activities.map((activity) => (
            <ListGroup.Item
              key={activity.id}
              className="d-flex justify-content-between align-items-center"
            >
              <div>
                <strong>{activity.type}</strong>
                <br />
                <small className="text-muted">
                  {new Date(activity.timestamp).toLocaleString()}
                </small>
              </div>
              <Badge bg={getStatusVariant(activity.status)}>
                {activity.status}
              </Badge>
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
} 