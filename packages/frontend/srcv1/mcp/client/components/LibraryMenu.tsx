import React from 'react';
import { Card, ListGroup } from 'react-bootstrap';
import { MCPClientResource } from '../types';

interface LibraryMenuProps {
  resources: MCPClientResource[];
  onResourceSelect: (resource: MCPClientResource) => void;
}

export default function LibraryMenu({ resources, onResourceSelect }: LibraryMenuProps) {
  return (
    <Card>
      <Card.Header>Resource Library</Card.Header>
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