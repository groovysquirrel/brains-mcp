import React, { useState, useEffect } from 'react';
import { IconName } from '@blueprintjs/core';
import { get, post } from '@aws-amplify/api';
import ObjectMenu, { BaseMenuItem, BaseVersionItem } from '../components/ObjectMenu';
import PromptBuilder from '../components/PromptBuilder';
import { WindowManager } from '../components/WindowManager';
import './css/PromptTest.css';
import { APIResponse } from '../types/api';

type ProgramViewId = 'promptBuilder' | 'menu';

// API Response Types for listing prompts
interface PromptListItemVersion {
  version: string;
  createdAt: string;
  createdBy: string;
  itemId: string;
}

interface PromptListItem {
  name: string;
  versionsCount: number;
  versions: PromptListItemVersion[];
  latestVersion: string;
}

interface PromptListResponseData {
  success: boolean;
  count: number;
  items: PromptListItem[];
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  }
}

// API Response Types for single prompt content
interface PromptContent {
  prompt: string;
  defaultModel: string;
}

interface PromptContentResponse {
  success: boolean;
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
  data: {
    content: PromptContent;
  };
}

// Menu Item Types
interface PromptMenuItem extends BaseMenuItem {
  createdBy: string;
  versionCount: number;
}

interface PromptVersionItem extends BaseVersionItem {
  createdAt: string;
  createdBy: string;
  itemId: string;
}

// Window Configuration
const PROMPTS_WINDOWS = {
  menu: {
    title: 'Save\nMenu',
    icon: 'properties' as IconName,
    content: ({ items, versions, selectedItem, selectedVersion, onItemSelect, onVersionSelect, onSave, onLoad, onNew, onRename }: any) => (
      <ObjectMenu
        label="Prompt"
        items={items}
        versions={versions}
        selectedItem={selectedItem}
        selectedVersion={selectedVersion}
        onItemSelect={onItemSelect}
        onVersionSelect={onVersionSelect}
        onSave={onSave}
        onLoad={onLoad}
        onNew={onNew}
        onRename={onRename}
      />
    )
  },
  promptBuilder: {
    title: 'Prompt\nBuilder',
    icon: 'code' as IconName,
    content: ({ value, defaultModel, onChange, onSave }: any) => (
      <PromptBuilder
        value={value}
        defaultModel={defaultModel}
        onChange={onChange}
        onSave={onSave}
      />
    )
  },
} as const;

// Constants
const DEFAULT_SYSTEM_PROMPT = 'You will answer your question as though you are a pirate, and will always mention your parrot!';

const Prompt: React.FC = () => {
  // State
  const [promptItems, setPromptItems] = useState<PromptMenuItem[]>([]);
  const [currentItemVersions, setCurrentItemVersions] = useState<PromptVersionItem[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('1.0.0');
  const [promptContent, setPromptContent] = useState<PromptContent>({ prompt: '', defaultModel: 'gpt-4' });

  const fetchPrompts = async () => {
    try {
      const restOperation = get({
        apiName: "brainsOS",
        path: "/latest/resources/user/prompts"
      });
      
      const { body } = await restOperation.response;
      const responseData = (await body.json() as unknown) as PromptListResponseData;
      
      const data: PromptListItem[] = responseData.items;
      
      setPromptItems(data.map((item: PromptListItem) => ({
        value: item.name,
        displayName: item.name,
        createdBy: item.versions[item.versions.length - 1].createdBy,
        versionCount: item.versionsCount,
      })));

      if (selectedPrompt) {
        const selectedItem = data.find(item => item.name === selectedPrompt);
        if (selectedItem) {
          setCurrentItemVersions(selectedItem.versions.map(version => ({
            version: version.version,
            displayName: `v${version.version} (${new Date(version.createdAt).toLocaleDateString()})`,
            createdAt: version.createdAt,
            createdBy: version.createdBy,
            itemId: version.itemId
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching prompts:', error);
    }
  };

  // Fetch prompts data
  useEffect(() => {
    fetchPrompts();
  }, [selectedPrompt]);

  // Consolidated fetch function
  const fetchSinglePrompt = async (itemId: string) => {
    try {
      // Parse the itemId to extract the UUID and version
      const itemIdParts = itemId.split('#');
      if (itemIdParts.length !== 3) {
        console.error('Invalid itemId format:', itemId);
        return;
      }

      const uuid = itemIdParts[1];
      const version = itemIdParts[2];

      console.log('Loading prompt:', `/latest/resources/user/prompts/${uuid}/${version}`);

      const restOperation = get({
        apiName: "brainsOS",
        path: `/latest/resources/user/prompts/${uuid}/${version}`
      });
      
      const { body } = await restOperation.response;
      const responseData = (await body.json() as unknown) as PromptContentResponse;
      
      if (responseData.success && responseData.data?.content) {
        const promptContent: PromptContent = responseData.data.content;
        console.log('Loaded prompt content:', promptContent);
        setPromptContent(promptContent);
      } else {
        console.error('Invalid prompt data structure:', responseData);
      }
    } catch (error) {
      console.error('Error fetching prompt content:', error);
    }
  };

  // Handler for manual loading via menu
  const handleLoad = async () => {
    if (!selectedPrompt) return;
    
    // If we have multiple versions, find the selected one
    // If we only have one version, use that one
    const selectedVersionData = currentItemVersions.length > 1
      ? currentItemVersions.find(v => v.version === selectedVersion)
      : currentItemVersions[0];

    if (selectedVersionData?.itemId) {
      await fetchSinglePrompt(selectedVersionData.itemId);
    } else {
      console.error('No version data found for prompt:', selectedPrompt);
    }
  };

  // Handlers
  const handleSave = async () => {
    if (!selectedPrompt || !promptContent) return { success: false, error: 'No content to save' };

    try {
      const promptPayload = {
        operation: "create",
        name: selectedPrompt.toLowerCase().replace(/\s+/g, '_'), // sanitize name
        version: selectedVersion,
        createdBy: "user", // You might want to get this from your auth context
        content: {
          prompt: promptContent.prompt,
          defaultModel: promptContent.defaultModel
        },
        tags: ["user-created"]
      };

      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/resources/user/prompts",
        options: { body: promptPayload }
      });
      
      const { body } = await restOperation.response;
      const responseData = (await body.json() as unknown) as APIResponse<void>;
      
      if (responseData?.success) {
        // Refresh the prompts list
        await fetchPrompts();
        return { success: true };
      }
      return { success: false, error: responseData.error };
    } catch (error) {
      console.error('Error saving prompt:', error);
      return { 
        success: false, 
        error: 'Failed to save prompt'
      };
    }
  };

  const handleNew = () => {
    setSelectedPrompt('');
    setSelectedVersion('1.0.0');
    setPromptContent({ 
      prompt: DEFAULT_SYSTEM_PROMPT,
      defaultModel: 'gpt-4' 
    });
  };

  const handlePromptChange = (newPrompt: string) => {
    setPromptContent({ ...promptContent, prompt: newPrompt });
  };

  // Add rename handling
  const handleRename = async (newName: string) => {
    try {
      const renamePayload = {
        operation: "rename",
        name: selectedPrompt.toLowerCase().replace(/\s+/g, '_'),
        newName: newName.toLowerCase().replace(/\s+/g, '_')
      };

      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/resources/user/prompts",
        options: { body: renamePayload }
      });
      
      const { body } = await restOperation.response;
      const responseData = (await body.json() as unknown) as APIResponse<void>;
      
      if (responseData?.success) {
        setSelectedPrompt(newName);
        await fetchPrompts(); // Refresh the list
        return { success: true };
      }
      return { success: false, error: responseData.error };
    } catch (error) {
      console.error('Rename error:', error);
      return { success: false, error: 'Failed to rename' };
    }
  };

  // Window Manager Configuration
  const elementMap: Record<ProgramViewId, React.ReactNode> = {
    promptBuilder: PROMPTS_WINDOWS.promptBuilder.content({
      value: promptContent.prompt || DEFAULT_SYSTEM_PROMPT,
      defaultModel: promptContent.defaultModel,
      onChange: handlePromptChange,
      onSave: handleSave,
    }),
    menu: PROMPTS_WINDOWS.menu.content({
      items: promptItems,
      versions: currentItemVersions,
      selectedItem: selectedPrompt,
      selectedVersion: selectedVersion,
      onItemSelect: setSelectedPrompt,
      onVersionSelect: setSelectedVersion,
      onSave: handleSave,
      onLoad: handleLoad,
      onNew: handleNew,
      onRename: handleRename,
    })
  };

  const allViews: ProgramViewId[] = ['promptBuilder', 'menu'];

  return (
    <div className="prompts-container">
      <WindowManager
        elementMap={elementMap}
        windowConfig={PROMPTS_WINDOWS}
        allViews={allViews}
        initialHiddenWindows={['menu']}
        initialLayout={'promptBuilder'}
      />
    </div>
  );
};

export default Prompt;