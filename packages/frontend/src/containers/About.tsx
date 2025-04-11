import React from 'react';
import './css/About.css';

const About: React.FC = () => {
  return (
    <div className="About">
      <div className="about-container">
        <h1>About BRAINS OS</h1>
        
        <div className="about-section">
          <p className="lead">
            The Broad Range AI Node System (B.R.A.I.N.S.) leverages a series of interconnected and specialized nodes to decompose complexity into manageable components. The BRAINS Operating System uses abstract programming concepts and the Model Control Protocol (MCP) paradigm systematically manage and interconnect individual nodes.
            <b> This approach leverages the non-deterministic nature of LLMs while minimizing the risk of unintended behavior and hallucinations.</b>
          </p>
          
          <h2>Overview</h2>
          <p>
            BRAINS OS is a modern, serverless operating system for AI systems and agents, built with SST, React, and TypeScript. 
            This project provides a robust framework for managing Large Language Models (LLMs) and specialized AI agents 
            through the MCP (Model Control Protocol) with a unified command system and shared operating template.
          </p>
          
          <div className="goals">
            <h3>Brains MCP is designed to:</h3>
            <ul>
              <li>Manage and orchestrate AI workflows through a visual interface</li>
              <li>Provide a unified command system for AI operations</li>
              <li>Enable secure, scalable deployment of AI subminds</li>
              <li>Support comprehensive prompt management and benchmarking</li>
              <li>Maintain strict data ownership and audit capabilities</li>
            </ul>
          </div>
        </div>
        
        <div className="about-section">
          <h2>Key Features</h2>
          
          <div className="feature-group">
            <h3>Current Features</h3>
            <ul>
              <li><strong>Visual Flow Editor</strong>: Create and design AI workflow diagrams with intuitive visual tools</li>
              <li><strong>Model Building</strong>: Create and design conceptual models with structured reasoning and nodes</li>
              <li><strong>Rule Definition</strong>: Customize system prompts to establish rules for LLM behavior using conceptual models</li>
              <li><strong>Unified Command System</strong>: Control AI operations through a consistent interface</li>
              <li><strong>Interactive Chat</strong>: Engage with LLMs that respond based on defined rules and models</li>
              <li><strong>Secure Authentication</strong>: Robust user authentication and authorization</li>
              <li><strong>Real-time Workflow Execution</strong>: Execute AI workflows in real-time</li>
              <li><strong>Resources</strong>: Learn modeling techniques and explore the B.R.A.I.N.S. approach in depth</li>
              <li><strong>Comprehensive Audit Logging</strong>: Track all system operations for security and compliance</li>
            </ul>
          </div>
          
          <div className="feature-group">
            <h3>Coming Soon</h3>
            <ul>
              <li><strong>Advanced Prompt Library</strong>: Store, manage, and benchmark prompts</li>
              <li><strong>MCP Implementation</strong>: Full client/server implementation of the Model Control Protocol</li>
              <li><strong>Enhanced State Management</strong>: Improved persistence and state handling</li>
              <li><strong>Extended Model Support</strong>: Integration with additional AI models and providers</li>
              <li><strong>Advanced Templating</strong>: Sophisticated templating system for AI operations</li>
            </ul>
          </div>
        </div>
        
        <div className="about-section">
          <h2>Architecture</h2>
          <p>The system is built on modern cloud-native technologies:</p>
          <ul className="architecture-list">
            <li><strong>Frontend</strong>: React</li>
            <li><strong>Backend</strong>: Cloud-Native AWS</li>
            <li><strong>Authentication</strong>: AWS Cognito</li>
            <li><strong>Database</strong>: DynamoDB and Aurora Serverless</li>
            <li><strong>Infrastructure</strong>: SST v3</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default About; 