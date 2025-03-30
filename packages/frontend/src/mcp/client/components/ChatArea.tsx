import React, { useState } from 'react';
import { Card, Form, Button, ListGroup } from 'react-bootstrap';
import { MCPClientActivity } from '../types';

interface ChatAreaProps {
  activities: MCPClientActivity[];
  onSendMessage: (message: string) => void;
}

export default function ChatArea({ activities, onSendMessage }: ChatAreaProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <Card className="h-100">
      <Card.Header>Chat</Card.Header>
      <Card.Body className="d-flex flex-column">
        <ListGroup variant="flush" className="flex-grow-1 overflow-auto mb-3">
          {activities
            .filter((activity) => activity.type === 'chat_message')
            .map((activity) => (
              <ListGroup.Item key={activity.id}>
                {activity.details?.message}
              </ListGroup.Item>
            ))}
        </ListGroup>
        <Form onSubmit={handleSubmit} className="mt-auto">
          <Form.Group className="d-flex">
            <Form.Control
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
            />
            <Button type="submit" variant="primary" className="ms-2">
              Send
            </Button>
          </Form.Group>
        </Form>
      </Card.Body>
    </Card>
  );
} 