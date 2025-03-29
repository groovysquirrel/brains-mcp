import React, { useState, useRef, useCallback, useEffect } from 'react';
import { IconName } from '@blueprintjs/core';
import { MosaicNode } from 'react-mosaic-component';
import MonacoEditor from '@monaco-editor/react';
import Graph from './Graph';
import Console, { ConsoleRef } from '../../components/Console';
import ModelMenu from './ModelMenu';
import { WindowManager } from '../../components/WindowManager';
import { post, get } from '@aws-amplify/api';
import { APIResponse } from '../types/api';
import * as monaco from 'monaco-editor';
import { Button} from '@blueprintjs/core';
import { saveAs } from 'file-saver';
import { BaseVersionItem } from './ModelMenu';
import { settingsManager } from '../../utils/settingsManager';

import 'bootstrap/dist/css/bootstrap.min.css';
import '@blueprintjs/core/lib/css/blueprint.css';
import '@blueprintjs/icons/lib/css/blueprint-icons.css';
import './Transform.css';

// Default values
const DEFAULT_MODEL_NAME = 'Business Capability Model';
const DEFAULT_DOT = `digraph WelcomeGraph {
      { rank=same; B E }
      { rank=same; C D }
      B[label="Edit the model\\nDEFINITIONS" color="green" tooltip="Make the model yours"]
      C[label="VISUALIZE\\nYour Model" color="blue" tooltip="See the model visualized"]  
      D[label="Edit the model\\nwith the\\nDOT Editor" color="green" tooltip="Make the model yours"]
      E[label="Save your\\nOBJECT" color="purple" tooltip="Get ready to use your model!"]
      
      B -> C
      C -> D
      D -> C
      D -> E

    }
`;
const DEFAULT_DEFINITIONS = `# Value Streams
## VS1: Develop the Business
Focuses on strategic initiatives to grow the business, adapt to market dynamics, and innovate for long-term success. It encompasses activities that identify opportunities, develop strategies, and drive innovation to stay ahead in the competitive landscape.

### L1: Conduct Market Research*
Identifies emerging trends, customer preferences, and competitive dynamics to inform strategic decisions. Leverages data collection and analysis to uncover opportunities for business growth.

#### L2: Analyze Market Trends**
Studies market dynamics to identify emerging opportunities and threats. Provides actionable insights for strategic decision-making.

#### L2: Identify Competitive Opportunities**
Assesses competitors' actions and market positioning to uncover gaps and areas of advantage. Supports proactive planning and differentiation strategies.

#### L2: Assess Customer Needs**
Identifies and prioritizes customer requirements to align offerings with market demand. Leverages feedback and analytics to understand client expectations.

### L1: Drive Innovation***
Generates new concepts and translates them into actionable solutions that add value. Fosters a culture of creativity, experimentation, and continuous improvement.

#### L2: Idea Generation
Identifies opportunities for creativity and ideation across the organization. Encourages brainstorming and exploration of unconventional solutions.

#### L2: Prototype Development
Develops preliminary versions of new concepts or services to assess feasibility and impact. Tests and refines ideas through iterative feedback.

#### L2: Opportunity Evaluation
Assesses the practicality, cost, and potential benefits of innovative ideas. Ensures alignment with organizational goals and resources.

### L1: Develop Strategies and Tactics
Defines long-term goals and outlines actionable plans to achieve them. Aligns strategies across teams and adapts to changing market conditions.

#### L2: Define Long-Term Objectives
Establishes clear and measurable goals to guide organizational focus. Prioritizes initiatives based on strategic importance and resources.

#### L2: Formulate Tactical Plans
Develops detailed plans that outline specific actions and milestones to achieve strategic objectives. Ensures alignment with overarching organizational goals.

#### L2: Align Strategies Across Teams
Coordinates strategic goals across departments to ensure cohesive execution. Facilitates communication and collaboration to align efforts.

## VS2: Enable the Organization
Ensures that the internal environment is optimized for collaboration, knowledge sharing, and productivity. It emphasizes equipping employees and teams with the tools, resources, and processes necessary for operational efficiency and growth.

### L1: Support Collaboration
Facilitates effective communication and teamwork across departments and geographies. Ensures that teams have the tools and processes necessary to collaborate efficiently.

#### L2: Facilitate Communication
Supports clear and consistent communication within and across teams. Implements systems to reduce misunderstandings and improve information flow.

#### L2: Support Cross-Department Interaction
Promotes collaboration between different organizational functions. Encourages knowledge sharing and joint problem-solving.

#### L2: Maintain Collaboration Platforms
Utilizes tools and technologies to streamline team interactions. Integrates platforms to enable seamless collaboration.

### L1: Enable Workforce Productivity
Optimizes tools, workflows, and processes to enhance employee performance. Removes obstacles to efficient work and monitors productivity metrics.

#### L2: Optimize Workflows
Identifies inefficiencies and redesigns processes for better performance. Reduces bottlenecks to improve operational throughput.

#### L2: Provide Productivity Tools
Equips employees with the software and hardware needed for efficient task execution. Ensures accessibility and usability of these tools.

#### L2: Monitor Performance
Tracks key indicators of employee and team productivity. Uses data-driven insights to identify and address performance gaps.

### L1: Enable Knowledge Sharing
Ensures that organizational knowledge is accessible and effectively shared among employees. Builds systems for knowledge retention and promotes a culture of learning.

#### L2: Develop Knowledge Repositories
Creates centralized systems for storing and organizing critical information. Ensures that repositories are easy to navigate and update.

#### L2: Promote Best Practices
Encourages the dissemination of successful strategies and lessons learned. Facilitates forums or platforms for sharing insights.

#### L2: Transfer Knowledge
Ensures seamless transfer of expertise between individuals and teams. Implements programs to support mentoring and cross-training.

## VS3: Engage Clients
Building and maintaining strong client relationships by understanding and addressing their unique needs. It involves delivering personalized services, actionable insights, and tailored experiences to enhance client satisfaction and loyalty.

### L1: Personalize Services
Tailors services to the specific needs and preferences of clients. Adapts offerings to maximize client satisfaction and loyalty.

#### L2: Capture Client Preferences
Gathers detailed insights into client needs and expectations. Uses data and feedback to inform customization efforts.

#### L2: Tailor Service Offerings
Adjusts products or services to align with individual client requirements. Delivers experiences that meet or exceed client expectations.

#### L2: Deliver Customized Experiences
Implements personalized solutions to enhance the client journey. Continuously refines offerings based on client feedback.

### L1: Develop Client Relationships
Builds trust and maintains engagement with clients throughout their lifecycle. Focuses on resolving concerns and fostering long-term partnerships.

#### L2: Establish Trust with Clients
Demonstrates reliability, integrity, and transparency in interactions. Creates a foundation for strong, mutually beneficial relationships.

#### L2: Maintain Client Engagement
Ensures regular and meaningful communication with clients. Keeps clients informed and involved in relevant decisions and processes.

#### L2: Resolve Client Concerns
Addresses issues or challenges promptly and effectively. Strives to exceed client expectations in problem resolution.

### L1: Deliver Client Insights
Translates client data into actionable recommendations and meaningful trends. Enhances client decision-making and strengthens the organization's advisory role.

#### L2: Analyze Client Data
Examines client-related data to uncover patterns, preferences, and opportunities. Leverages analytics to derive actionable insights.

#### L2: Provide Actionable Recommendations
Develops specific, data-driven strategies tailored to client goals. Empowers clients to make informed decisions.

#### L2: Report Client-Focused Trends
Identifies and shares relevant trends that impact client industries or markets. Positions the organization as a trusted advisor.

## VS4: Manage Resources
Focuses on effective resource planning, allocation, and operational efficiency to ensure organizational readiness. It includes activities that optimize processes, anticipate future needs, and maintain alignment with business goals.

### L1: Allocate Resources
Ensures that resources are distributed effectively to meet project and operational needs. Dynamically adjusts plans based on changing priorities and availability.

#### L2: Plan Resource Utilization
Develops detailed plans for the effective use of resources across projects and operations. Balances resource demands with availability to optimize outcomes.

#### L2: Assign Resources to Projects
Allocates personnel, tools, and other resources to specific projects based on requirements. Ensures alignment with organizational priorities.

#### L2: Adjust Resource Plans Dynamically
Responds to shifting demands or constraints by reallocating resources as needed. Maintains flexibility to adapt to evolving circumstances.

### L1: Optimize Operations
Streamlines processes and reduces inefficiencies to improve overall performance. Emphasizes continuous improvement and resource utilization.

#### L2: Streamline Processes
Identifies and removes bottlenecks in workflows to enhance efficiency. Implements best practices to reduce waste and improve throughput.

#### L2: Reduce Operational Waste
Minimizes unnecessary expenditures and inefficiencies in operations. Focuses on maximizing value from available resources.

#### L2: Enhance Process Efficiency
Continuously evaluates and improves processes to achieve better outcomes. Utilizes tools and technologies to boost operational performance.

### L1: Forecast Resource Needs
Anticipates future demands and prepares contingency plans to meet them. Uses data-driven models to plan resource scenarios effectively.

#### L2: Analyze Future Demand
Examines historical and market data to predict resource requirements. Identifies trends and prepares for potential fluctuations.

#### L2: Model Resource Scenarios
Develops projections to explore potential outcomes and resource needs under different conditions. Assists in proactive planning and risk mitigation.

#### L2: Prepare Contingency Plans
Creates backup strategies to address resource shortages or disruptions. Ensures readiness to adapt to unexpected changes.

## VS5: Deliver Value
Ensures the successful delivery of services, maintaining quality standards, and aligning governance frameworks with client and organizational objectives. It integrates project management with continuous improvement to deliver exceptional value.

### L1: Ensure Project Delivery
Ensures that projects are completed on time, within budget, and to the required specifications. Coordinates team efforts and monitors progress against milestones.

#### L2: Manage Project Timelines
Tracks and ensures adherence to project schedules. Addresses delays promptly to keep projects on track.

#### L2: Coordinate Delivery Teams
Oversees team collaboration and resource allocation for effective project execution. Facilitates communication to align efforts.

#### L2: Monitor Project Milestones
Tracks key project deliverables and evaluates progress toward completion. Identifies risks or issues early to mitigate impacts.

### L1: Assure Service Quality
Defines and enforces quality standards across services. Performs regular assessments and corrective actions to maintain high performance.

#### L2: Define Quality Standards
Establishes benchmarks and criteria to measure service excellence. Ensures alignment with client and organizational expectations.

#### L2: Perform Quality Assessments
Conducts evaluations to ensure services meet established standards. Identifies gaps and recommends improvements.

#### L2: Implement Corrective Actions
Addresses quality issues through targeted interventions. Monitors the impact of changes to confirm effectiveness.

### L1: Align IT Governance
Establishes frameworks for IT compliance, decision-making, and accountability. Ensures that IT initiatives align with organizational and client goals.

#### L2: Establish Governance Frameworks
Develops policies and structures to guide IT operations. Defines roles, responsibilities, and processes for effective governance.

#### L2: Monitor IT Compliance
Ensures adherence to relevant regulations and internal policies. Conducts audits and assessments to identify non-compliance risks.

#### L2: Evaluate Governance Outcomes
Reviews the effectiveness of governance practices and their impact on organizational goals. Recommends adjustments to improve outcomes.

# Shared Capabilities

## L1: Manage Risk
Identifies, mitigates, and monitors risks that could impact business operations across all value streams. Supports proactive measures and responsive strategies for managing uncertainties.

### L2: Identify Potential Threats
Analyzes internal and external factors to uncover potential risks. Categorizes risks by severity and likelihood to prioritize mitigation.

### L2: Mitigate Operational Risks
Develops strategies to minimize the impact of identified risks. Implements safeguards and contingency plans.

### L2: Monitor Risk Indicators
Tracks key metrics and trends to assess risk levels over time. Ensures early detection of emerging threats.

## L1: Manage Information
Oversees the collection, storage, and use of information to ensure integrity and accessibility across the organization. Promotes secure data practices and integrated decision-making.

### L2: Develop Data Governance Policies
Establishes consistent rules and guidelines for managing organizational data. Ensures compliance with standards and best practices.

### L2: Enable Data Integration
Facilitates seamless information exchange across systems and departments. Supports unified decision-making through centralized data access.

### L2: Secure Data Access
Implements measures to control access to sensitive information. Protects against unauthorized use and data breaches.

## L1: Ensure Compliance
Monitors and enforces adherence to regulatory and organizational standards. Includes audits, training, and addressing compliance gaps for all value streams.

### L2: Monitor Regulatory Changes
Tracks updates to laws and industry standards to assess their impact. Provides guidance to adapt practices to remain compliant.

### L2: Conduct Compliance Audits
Reviews processes and operations to identify areas of non-compliance. Recommends corrective actions to align with standards.

### L2: Implement Compliance Training
Educates employees on compliance requirements and best practices. Reinforces accountability and adherence through regular programs.

# Enabling Capabilities

## L1: Organizational Governance
Establishes structures, roles, and processes for effective decision-making and control. Ensures alignment with organizational goals and stakeholder expectations.

## L1: Enterprise Architecture
Aligns business processes with technology solutions to ensure scalability and adaptability. Creates a unified framework to support organizational goals.

## L1: Strategic Planning
Develops and communicates the organization's long-term vision and objectives. Ensures resources and initiatives are aligned to achieve strategic goals.

## L1: Finance Management
Manages financial planning, budgeting, and performance monitoring. Ensures fiscal responsibility and alignment with organizational priorities.

## L1: Legal Service Management
Supports legal compliance, contract management, and risk mitigation. Ensures adherence to laws and minimizes legal risks.

## L1: Human Resources Management
Oversees employee recruitment, development, and engagement. Promotes a supportive and productive workplace environment.

## L1: Technology Infrastructure Management
Maintains and improves IT systems and hardware reliability. Ensures the scalability and security of the organization's technological foundation.

## L1: Project Management
Plans, monitors, and delivers projects to meet organizational goals. Ensures adherence to timelines, budgets, and quality standards.

## L1: Change Management
Guides organizational transitions to ensure successful adoption of new processes, tools, or systems. Focuses on minimizing resistance and maximizing employee engagement.

## L1: Learning & Development
Develops training programs to enhance employee skills and knowledge. Aligns learning initiatives with organizational objectives.

## L1: Data Analysis & Reporting
Translates data into actionable insights and strategic reports. Supports decision-making with accurate and timely information.

---
*=red
**=green
***=blue
`;

const updateDelay = 2000; //in milliseconds

type BuilderViewId = 'definitions' | 'visual' | 'dot' | 'assistant' | 'menu' ;

const INITIAL_LAYOUT: MosaicNode<BuilderViewId> = {
  direction: 'row',
  first: 'definitions',
  second: 'visual',
  splitPercentage: 40,

};

interface ModelResponse {
  success: boolean;
  data?: {
    content: {
      dot: string;
      markdown: string;
    };
    name: string;
    version: string;
  };
  error?: {
    message: string;
    details?: {
      code: string;
      statusCode: number;
    };
  };
}

interface ModelVersion {
  version: string;
  createdAt: string;
  createdBy: string;
  itemId: string;
}

interface ModelListResponse {
  success: boolean;
  count: number;
  items: Array<{
    name: string;
    versions: ModelVersion[];
  }>;
  error?: {
    message: string;
    details?: {
      code: string;
      statusCode: number;
    };
  };
}

interface VersionResponse {
  success: boolean;
  metadata?: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
  data: {
    metadata: {
      createdAt: string;
      lastModifiedAt: string;
    };
    displayName: string;
    latestVersion: string;
    dataType: string;
    versionsCount: number;
    userId: string;
    updatedAt: string;
    typeName: string;
    id: string;
    versions: Array<{
      itemId: string;
      createdAt: string;
      version: string;
      createdBy: string;
    }>;
  };
  error?: {
    message: string;
    details?: {
      code: string;
      statusCode: number;
    };
  };
}

const incrementPatchVersion = (version: string): string => {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
};

// Add a constant for common headers
const API_HEADERS = {
  'Content-Type': 'application/json'
};

export default function Transform() {
  // State management
  const [modelName, setModelName] = useState(DEFAULT_MODEL_NAME);
  const [selectedVersion, setSelectedVersion] = useState('0.0.1');
  const [versions, setVersions] = useState<BaseVersionItem[]>([]);
  const [dotSrc, setDotSrc] = useState(DEFAULT_DOT);
  const [readmeContent, setReadmeContent] = useState(DEFAULT_DEFINITIONS);
  const [loading, setLoading] = useState(false);
  const assistantRef = useRef<ConsoleRef>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [liveUpdates, setLiveUpdates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const loadingModelRef = useRef<string | null>(null);
  const [models, setModels] = useState<string[]>([]);

  // Load models on mount
  useEffect(() => {
    fetchModels();
  }, []);

  // Fetch all models
  const fetchModels = async () => {
    try {
      const restOperation = get({
        apiName: "brainsOS",
        path: "/latest/resources/user/models",
        options: {
          headers: API_HEADERS
        }
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as ModelListResponse;
      
      if (responseData?.success) {
        // Set models list
        const modelNames = responseData.items.map(item => item.name);
        setModels(modelNames);

        // If we have a selected model, update its versions
        if (modelName) {
          const selectedModelData = responseData.items.find(item => 
            formatModelName(item.name) === formatModelName(modelName)
          );
          
          if (selectedModelData?.versions) {
            const modelVersions = selectedModelData.versions.map(version => ({
              version: version.version,
              displayName: `v${version.version} (${new Date(version.createdAt).toLocaleDateString()})`,
              createdAt: version.createdAt,
              createdBy: version.createdBy,
              itemId: version.itemId
            }));
            setVersions(modelVersions);

            // Update settings with the new versions
            settingsManager.updateLastOpenModel(
              modelName,
              selectedVersion,
              { dot: dotSrc, markdown: readmeContent },
              modelVersions
            );
          }
        }
      } else if (responseData.error) {
        console.error('Error fetching models:', responseData.error.message);
      }
    } catch (error) {
      console.error('Error fetching models:', error);
    }
  };

  // Format model name without truncating
  const formatModelName = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  };

  // Load last open model on mount
  useEffect(() => {
    const lastModel = settingsManager.getLastOpenModel();
    if (lastModel) {
      setModelName(lastModel.name);
      setSelectedVersion(lastModel.version);
      
      if (lastModel.data) {
        setDotSrc(lastModel.data.dot || '');
        setReadmeContent(lastModel.data.markdown || '');
      }
      
      if (lastModel.versions && !settingsManager.shouldFetchModelVersions(lastModel.name)) {
        setVersions(lastModel.versions);
      } else {
        fetchVersions(lastModel.name);
      }
    } else {
      // Load default model from database
      handleLoad(DEFAULT_MODEL_NAME, '0.0.1');
    }
  }, []);

  // Save current state before unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (modelName) {
        settingsManager.updateLastOpenModel(modelName, selectedVersion, {
          dot: dotSrc,
          markdown: readmeContent
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [modelName, selectedVersion, dotSrc, readmeContent]);

  // Fetch versions for a model
  const fetchVersions = async (modelName: string) => {
    try {
      const modelNameFormatted = formatModelName(modelName);
      const restOperation = get({
        apiName: "brainsOS",
        path: `/latest/resources/user/models/${modelNameFormatted}/versions`,
        options: {
          headers: API_HEADERS
        }
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as ModelListResponse;
      
      if (responseData?.success) {
        // Handle empty or undefined items array
        const items = responseData.items || [];
        if (items.length > 0 && items[0].versions) {
          const modelVersions = items[0].versions.map(version => ({
            version: version.version,
            displayName: `v${version.version} (${new Date(version.createdAt).toLocaleDateString()})`,
            createdAt: version.createdAt,
            createdBy: version.createdBy,
            itemId: version.itemId
          }));
          
          setVersions(modelVersions);
          
          if (modelVersions.length > 0) {
            settingsManager.updateLastOpenModel(
              modelName,
              selectedVersion,
              { dot: dotSrc, markdown: readmeContent },
              modelVersions
            );
          }
        }
      } else if (responseData.error) {
        console.error('Error fetching versions:', responseData.error.message);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  // Save handlers
  const handleSave = async () => {
    try {
      console.log('=== Transform Save ===');
      console.log('Starting save operation');
      console.log('Current model:', modelName);
      console.log('Current version:', selectedVersion);
      
      const newVersion = incrementPatchVersion(selectedVersion);
      const modelNameFormatted = formatModelName(modelName);
      const modelPayload = {
        operation: "create",
        name: modelNameFormatted,
        version: newVersion,
        content: {
          dot: dotSrc,
          markdown: readmeContent
        },
        createdBy: "user",
        tags: ["user-created"]
      };

      console.log('Save payload:', modelPayload);
      console.log('====================');

      const restOperation = post({
        apiName: "brainsOS",
        path: `/latest/resources/user/models`,
        options: {
          body: modelPayload,
          headers: API_HEADERS
        }
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as ModelResponse;
      
      if (responseData?.success) {
        setSelectedVersion(newVersion);
        await fetchVersions(modelName);
        return { success: true };
      }

      if (responseData.error) {
        return { success: false, error: responseData.error.message };
      }
      
      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      console.error('Error saving model:', error);
      return { success: false, error: 'Failed to save model' };
    }
  };

  const handleSaveAs = async (newName: string) => {
    try {
      console.log('=== Transform SaveAs ===');
      console.log('Starting save operation');
      console.log('New model name:', newName);
      
      const newNameFormatted = formatModelName(newName);
      const modelPayload = {
        operation: "create",
        name: newNameFormatted,
        version: '0.0.1',
        content: {
          // If both editors are empty, this is a new model
          dot: dotSrc || '',
          markdown: readmeContent || ''
        },
        createdBy: "user",
        tags: ["user-created"]
      };

      console.log('SaveAs payload:', modelPayload);
      console.log('====================');

      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/resources/user/models",
        options: {
          body: modelPayload,
          headers: API_HEADERS
        }
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as ModelResponse;
      
      if (responseData?.success) {
        // Update UI state after successful save
        setModelName(newName);
        setSelectedVersion('0.0.1');
        // Refresh models list
        await fetchModels();
        // Fetch versions for the new model
        await fetchVersions(newName);
        return { success: true };
      }

      if (responseData.error) {
        return { success: false, error: responseData.error.message };
      }
      
      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      console.error('Error saving model as:', error);
      return { success: false, error: 'Failed to save model' };
    }
  };

  const handleRename = async (newName: string) => {
    try {
      const oldNameFormatted = formatModelName(modelName);
      const newNameFormatted = formatModelName(newName);
      
      const renamePayload = {
        operation: "rename",
        name: oldNameFormatted,
        newName: newNameFormatted
      };

      const restOperation = post({
        apiName: "brainsOS",
        path: `/latest/resources/user/models`,
        options: { 
          body: renamePayload,
          headers: API_HEADERS
        }
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as APIResponse<void>;
      
      if (responseData?.success) {
        setModelName(newName);
        await fetchVersions(newName);
        return { success: true };
      }
      return { success: false, error: responseData.error?.message };
    } catch (error) {
      console.error('Error renaming model:', error);
      return { success: false, error: 'Failed to rename model' };
    }
  };

  const handleLoad = async (modelName: string, version: string) => {
    try {
      const modelKey = `${modelName}-${version}`;
      
      if (loadingModelRef.current === modelKey || loadingRef.current) {
        console.log('Already loading this model');
        return;
      }
      
      loadingModelRef.current = modelKey;
      loadingRef.current = true;

      const modelNameFormatted = formatModelName(modelName);
      const url = `/latest/resources/user/models/${modelNameFormatted}/${version}`;
      
      console.log('=== Loading Model ===');
      console.log('Model:', modelName);
      console.log('Version:', version);
      console.log('URL:', url);
      console.log('===================');
      
      const restOperation = get({
        apiName: "brainsOS",
        path: url,
        options: {
          headers: API_HEADERS
        }
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as ModelResponse;
      
      if (responseData?.success && responseData.data) {
        const { content } = responseData.data;
        
        // Always set dotSrc to ensure graph is refreshed
        // Use DEFAULT_DOT if content.dot is null, undefined, or empty string
        const newDotSrc = content.dot || DEFAULT_DOT;
        console.log('Setting DOT content:', newDotSrc ? 'Using provided DOT' : 'Using DEFAULT_DOT');
        setDotSrc(newDotSrc);
        
        // Set markdown content, defaulting to empty string
        setReadmeContent(content.markdown || '');
        setModelName(modelName);
        setSelectedVersion(version);

        // Update settings with the same content we just set
        settingsManager.updateLastOpenModel(
          modelName,
          version,
          {
            dot: newDotSrc,
            markdown: content.markdown || ''
          },
          versions
        );

        console.log('Model loaded successfully');
      } else if (responseData.error) {
        console.error('Error loading model:', responseData.error);
        setError(responseData.error.message);
      }
    } catch (error) {
      console.error('Error loading model:', error);
      setError('Failed to load model');
    } finally {
      loadingRef.current = false;
      loadingModelRef.current = null;
    }
  };

  // Transform handlers
  const handleTransform = async (content: string) => {
    setLoading(true);
    try {
      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/services/transform/itrg-bra/markdown/dot",
        options: {
          body: { content },
          headers: API_HEADERS
        }
      });

      const { body } = await restOperation.response;
      const result = (await body.json() as unknown) as APIResponse<string>;

      if (result.success && result.data) {
        setDotSrc(result.data);
      } else {
        console.error('Transformation error:', result.error);
      }
    } catch (error) {
      console.error('Error during transformation:', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounced transform handler
  const debouncedTransform = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (content: string) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
          handleTransform(content);
        }, updateDelay);
      };
    })(),
    [handleTransform]
  );

  // Function to handle editor mounting
  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
    
    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      if (newValue !== readmeContent) {
        setReadmeContent(newValue);
        if (liveUpdates) {
          debouncedTransform(newValue);
        }
      }
    });
  };

  // Add a handler for the live updates toggle
  const handleLiveUpdatesToggle = () => {
    const newLiveUpdates = !liveUpdates;
    setLiveUpdates(newLiveUpdates);
    
    // If we're turning live updates on, process the current content
    if (newLiveUpdates) {
      debouncedTransform(readmeContent);
    }
  };

  // Add handler for CSV download
  const handleDownloadCSV = async () => {
    setLoading(true);
    setError(null); // Clear any previous errors
    
    try {
      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/services/transform/itrg-bra/markdown/csv",
        options: {
          body: { content: readmeContent },
          headers: API_HEADERS
        }
      });

      const { body } = await restOperation.response;
      const result = (await body.json() as unknown) as APIResponse<string>;

      if (result.success && result.data) {
        // Create blob and trigger download
        const csvContent = result.data;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const fileName = `${modelName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
        
        // Use the imported saveAs function
        saveAs(blob, fileName);
      } else {
        console.error('CSV generation error:', result.error);
        setError('Failed to generate CSV file');
      }
    } catch (error) {
      console.error('Error generating CSV:', error);
      setError('Error downloading CSV file');
    } finally {
      setLoading(false);
    }
  };

  // Update versions when model is selected
  const updateVersionsForModel = async (modelName: string) => {
    try {
      const modelNameFormatted = formatModelName(modelName);
      console.log('=== Fetching Versions ===');
      console.log('Model:', modelName);
      console.log('Formatted name:', modelNameFormatted);
      
      // Get versions for this model
      const versionsOperation = get({
        apiName: "brainsOS",
        path: `/latest/resources/user/models/${modelNameFormatted}/versions`,
        options: {
          headers: API_HEADERS
        }
      });
      
      const versionsResponse = await versionsOperation.response;
      const versionsData = (await versionsResponse.body.json() as unknown) as VersionResponse;
      
      console.log('Versions response:', versionsData);
      
      if (versionsData?.success && versionsData.data?.versions) {
        const modelVersions = versionsData.data.versions.map(version => ({
          version: version.version,
          displayName: `v${version.version} (${new Date(version.createdAt).toLocaleDateString()})`,
          createdAt: version.createdAt,
          createdBy: version.createdBy,
          itemId: version.itemId
        }));
        
        console.log('Found versions:', modelVersions);
        setVersions(modelVersions);
      } else {
        console.log('No versions found in response');
        setVersions([]);
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  // Window configurations
  const windowConfig = {
    definitions: {
      title: 'Content',
      icon: 'document' as IconName,
      content: () => (
        <div className="editor-container dark">
          <MonacoEditor
            value={readmeContent}
            defaultLanguage="markdown"
            theme="vs-dark"
            onMount={handleEditorDidMount}
            onChange={(value) => {
              if (value && value !== readmeContent) {
                setReadmeContent(value);
                if (liveUpdates) {
                  debouncedTransform(value);
                }
              }
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              automaticLayout: true,
              wordWrap: 'on'
            }}
          />
        </div>
      )
    },
    visual: {
      title: 'Visual\nDisplay',
      icon: 'diagram-tree' as IconName,
      content: () => (
        <div className="graph-container">
          <div className="status-bar">
            <div className="status-bar-content">
              <div className="button-stack">
                <Button
                  small
                  intent={liveUpdates ? "primary" : "none"}
                  className="live-update-toggle"
                  onClick={handleLiveUpdatesToggle}
                >
                  {liveUpdates ? "Live Updates: On" : "Live Updates: Off"}
                </Button>
                
                <Button
                  small
                  icon="download"
                  className="download-csv-button"
                  onClick={handleDownloadCSV}
                  disabled={loading}
                >
                  Download CSV
                </Button>
              </div>
              
              {loading && (
                <div className="status-message">
                  <span className="spinner-border spinner-border-sm" role="status" />
                  <span>Processing...</span>
                </div>
              )}
              
              {error && (
                <div className="status-message error">
                  <span className="error-icon">⚠️</span>
                  <span>{error}</span>
                </div>
              )}
            </div>
          </div>
          <Graph dotSrc={dotSrc} />
        </div>
      )
    },
    dot: {
      title: 'DOT\nEditor',
      icon: 'code' as IconName,
      content: () => (
        <MonacoEditor
          defaultLanguage="dot"
          value={dotSrc}
          onChange={(value) => value && setDotSrc(value)}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            automaticLayout: true,
            wordWrap: 'on'
          }}
        />
      )
    },
    
    assistant: {
      title: 'BRAINS\nAssistant',
      icon: 'chat' as IconName,
      content: () => (
        <Console
          ref={assistantRef}
          welcomeMessage="Hello! How can I assist you today?"
          prompt=" > "
          mode="prompt"
          onResponse={(response) => {
            const content = response?.data?.response?.['.content.response'];
            const diagram = response?.data?.response?.['.diagram.response'];
            if (content) setReadmeContent(content);
            if (diagram) {
              const dotCode = diagram.replace(/```dot\n/, '').replace(/\n```$/, '');
              setDotSrc(dotCode);
            }
          }}
        />
      )
    },
    menu: {
      title: 'Model\nMenu',
      icon: 'cog' as IconName,
      content: () => (
        <ModelMenu
          selectedModel={modelName}
          selectedVersion={selectedVersion}
          versions={versions}
          models={models}
          onSave={handleSave}
          onSaveAs={handleSaveAs}
          onRename={handleRename}
          onVersionChange={setSelectedVersion}
          onModelSelect={handleLoad}
          onModelChange={(model: string) => {
            console.log('Model changed to:', model);
            updateVersionsForModel(model);
          }}
          onNew={() => {
            // Clear content first
            setDotSrc('');
            setReadmeContent('');
            setModelName('');
            setSelectedVersion('0.0.1');
            setVersions([]);
          }}
        />
      )
    }
  };

  // Create element map for WindowManager
  const elementMap = Object.entries(windowConfig).reduce(
    (acc, [key, config]) => ({
      ...acc,
      [key]: config.content()
    }),
    {} as Record<BuilderViewId, React.ReactNode>
  );

  return (
    <div className="build-container">
      <WindowManager<BuilderViewId>
        initialLayout={INITIAL_LAYOUT}
        initialHiddenWindows={['menu', 'assistant', 'dot']}
        elementMap={elementMap}
        windowConfig={windowConfig}
        allViews={['definitions','visual', 'dot', 'assistant', 'menu']}
      />
    </div>
  );
}
