import React from 'react';
import { Card, ListGroup } from 'react-bootstrap';
import { MCPClientResource } from '../types';

interface ServerMenuProps {
  resources: MCPClientResource[];
  onResourceSelect: (resource: MCPClientResource) => void;
}

export default function ServerMenu({ resources, onResourceSelect }: ServerMenuProps) {
  return (
    <Card>
      <Card.Header>Server Resources</Card.Header>
      <Card.Body>
        <ListGroup variant="flush">
          {resources.map((resource) => (
            <ListGroup.Item
              key={resource.id}
              action
              onClick={() => onResourceSelect(resource)}
            >
              {resource.name}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
} 