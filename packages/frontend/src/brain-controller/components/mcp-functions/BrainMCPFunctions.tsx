import React, { useState } from 'react';
import { Card, Row, Col, Button, Tabs, Tab, Badge } from 'react-bootstrap';
import { PlusCircle, Tools, ArrowsFullscreen, Database, ChatLeftText } from 'react-bootstrap-icons';
import './BrainMCPFunctions.css';

// Mock data types
interface FunctionItem {
  id: string;
  name: string;
  description: string;
  type: 'data' | 'tool' | 'transformer' | 'subprompt';
  enabled: boolean;
}

interface FunctionCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  functions: FunctionItem[];
}

const BrainMCPFunctions: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('tools');

  // Mock function data
  const functionCategories: FunctionCategory[] = [
    {
      id: 'data',
      name: 'Data & Resources',
      description: 'Templates, reference material, and other data resources',
      icon: <Database />,
      functions: [
        {
          id: 'template-basic',
          name: 'Basic Template',
          description: 'A simple template for common tasks',
          type: 'data',
          enabled: true
        },
        {
          id: 'code-examples',
          name: 'Code Examples',
          description: 'Library of code examples and snippets',
          type: 'data',
          enabled: true
        },
        {
          id: 'reference-docs',
          name: 'Reference Documentation',
          description: 'Technical documentation and references',
          type: 'data',
          enabled: false
        }
      ]
    },
    {
      id: 'tools',
      name: 'Tools & Utilities',
      description: 'Calculators, generators, browsers, and other utilities',
      icon: <Tools />,
      functions: [
        {
          id: 'random-number',
          name: 'Random Number Generator',
          description: 'Generates random numbers within a specified range',
          type: 'tool',
          enabled: true
        },
        {
          id: 'calculator',
          name: 'Calculator',
          description: 'Performs mathematical calculations',
          type: 'tool',
          enabled: true
        },
        {
          id: 'web-browser',
          name: 'Web Browser',
          description: 'Searches and retrieves information from the web',
          type: 'tool',
          enabled: true
        }
      ]
    },
    {
      id: 'transformers',
      name: 'Transformers',
      description: 'Convert between data formats (JSON, Markdown, CSV, etc.)',
      icon: <ArrowsFullscreen />,
      functions: [
        {
          id: 'json-to-markdown',
          name: 'JSON to Markdown',
          description: 'Converts JSON data to Markdown format',
          type: 'transformer',
          enabled: true
        },
        {
          id: 'markdown-to-json',
          name: 'Markdown to JSON',
          description: 'Converts Markdown tables to JSON objects',
          type: 'transformer',
          enabled: true
        },
        {
          id: 'csv-to-json',
          name: 'CSV to JSON',
          description: 'Converts CSV data to JSON format',
          type: 'transformer',
          enabled: true
        },
        {
          id: 'json-to-csv',
          name: 'JSON to CSV',
          description: 'Converts JSON data to CSV format',
          type: 'transformer',
          enabled: true
        }
      ]
    },
    {
      id: 'subprompts',
      name: 'Subprompts',
      description: 'Pre-written prompts that can be called from the main BRAIN',
      icon: <ChatLeftText />,
      functions: [
        {
          id: 'code-review',
          name: 'Code Review',
          description: 'Reviews code for bugs, style issues, and improvements',
          type: 'subprompt',
          enabled: true
        },
        {
          id: 'summarize',
          name: 'Summarize Text',
          description: 'Creates concise summaries of longer text',
          type: 'subprompt',
          enabled: true
        },
        {
          id: 'explain-concept',
          name: 'Explain Concept',
          description: 'Explains complex concepts in simple terms',
          type: 'subprompt',
          enabled: false
        }
      ]
    }
  ];

  // Toggle a function's enabled status
  const toggleFunction = (categoryId: string, functionId: string) => {
    // In a real app, this would update the backend state
    console.log(`Toggling function ${functionId} in category ${categoryId}`);
  };

  // Render function cards for a category
  const renderFunctionCards = (category: FunctionCategory) => {
    return (
      <>
        <Row xs={1} md={2} lg={3} className="g-4 mb-4">
          {category.functions.map(func => (
            <Col key={func.id}>
              <Card className={`function-card ${func.enabled ? 'enabled' : 'disabled'}`}>
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <Card.Title className="mb-0">{func.name}</Card.Title>
                    <Badge bg={func.enabled ? 'success' : 'secondary'}>
                      {func.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <Card.Text>{func.description}</Card.Text>
                  <Button 
                    variant={func.enabled ? 'outline-danger' : 'outline-success'}
                    size="sm"
                    onClick={() => toggleFunction(category.id, func.id)}
                  >
                    {func.enabled ? 'Disable' : 'Enable'}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
        <Row className="mt-4">
          <Col>
            <Card className="function-card add-function full-width">
              <Card.Body className="d-flex align-items-center justify-content-center">
                <PlusCircle size={24} className="me-3" />
                <Card.Title className="mb-0">Add Custom {category.name}</Card.Title>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </>
    );
  };

  return (
    <div className="mcp-functions-container">
      <div className="mcp-functions-header mb-4">
        <h4>MCP Functions</h4>
        <p className="text-muted">
          Manage the functionality available to your BRAIN through various functions, tools, and utilities.
        </p>
      </div>

      <div className="d-flex mcp-functions-content">
        <Tabs
          activeKey={activeCategory}
          onSelect={(k) => k && setActiveCategory(k)}
          className="vertical-tabs flex-column me-4"
        >
          {functionCategories.map(category => (
            <Tab 
              key={category.id} 
              eventKey={category.id} 
              title={
                <div className="d-flex align-items-center py-2">
                  <span className="category-icon me-2">{category.icon}</span>
                  <span>{category.name}</span>
                </div>
              }
            />
          ))}
        </Tabs>
        
        <div className="tab-content-area flex-grow-1">
          {functionCategories
            .filter(category => category.id === activeCategory)
            .map(category => (
              <div key={category.id}>
                <div className="category-description mb-4">
                  <h5>{category.name}</h5>
                  <p>{category.description}</p>
                </div>
                {renderFunctionCards(category)}
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
};

export default BrainMCPFunctions;
