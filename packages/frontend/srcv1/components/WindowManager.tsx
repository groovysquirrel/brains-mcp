import React, { useState, useCallback } from 'react';
import { 
  Mosaic, 
  MosaicWindow, 
  MosaicNode, 
  MosaicBranch,
  MosaicDirection,
  MosaicParent,
} from 'react-mosaic-component';
import { Button as BpButton, Icon, IconName } from '@blueprintjs/core';
import { ErrorBoundary } from '../containers/ErrorBoundary';
import './WindowManager.css';

// Types
export type ViewId = string;

interface WindowConfig {
  title: string;
  icon: IconName;
  content: (props: any) => React.ReactNode;
}

interface WindowManagerProps<T extends string | number = ViewId> {
  initialLayout: MosaicNode<T>;
  initialHiddenWindows: T[];
  elementMap: Record<T, React.ReactNode>;
  windowConfig: Record<T, WindowConfig>;
  allViews: T[];
  onLayoutChange?: (layout: MosaicNode<T>) => void;
  onVisibilityChange?: (hiddenWindows: T[]) => void;
  onSaveLayout?: (layout: MosaicNode<T>) => void;
  onRestoreLayout?: () => MosaicNode<T> | null;
}

export const WindowManager = <T extends string | number = ViewId>({
  initialLayout,
  initialHiddenWindows,
  elementMap,
  windowConfig,
  allViews,
  onLayoutChange,
  onVisibilityChange,
  onSaveLayout,
  onRestoreLayout,
}: WindowManagerProps<T>) => {
  // Type Guards and Utility Functions
  const isMosaicParent = (node: MosaicNode<T>): node is MosaicParent<T> => {
    return (node as MosaicParent<T>).first !== undefined && 
           (node as MosaicParent<T>).second !== undefined;
  };

  const extractViewIds = (node: MosaicNode<T>): T[] => {
    if (typeof node === 'string' || typeof node === 'number') return [node];
    if (isMosaicParent(node)) {
      return [...extractViewIds(node.first), ...extractViewIds(node.second)];
    }
    return [];
  };

  // Layout Management Functions
  const removeHiddenNodes = (node: MosaicNode<T>): MosaicNode<T> | null => {
    if (typeof node === 'string' || typeof node === 'number') {
      return initialHiddenWindows.includes(node) ? null : node;
    }
    
    if (isMosaicParent(node)) {
      const first = removeHiddenNodes(node.first);
      const second = removeHiddenNodes(node.second);

      if (!first && !second) return null;
      if (!first) return second;
      if (!second) return first;

      return {
        direction: node.direction,
        first,
        second,
        splitPercentage: node.splitPercentage,
      };
    }
    return node;
  };

  const getDefaultLayout = (): MosaicNode<T> => {
    const visibleViews = allViews.filter(view => !initialHiddenWindows.includes(view));
    
    if (visibleViews.length === 0) {
      console.warn('No visible views available, using first view');
      return allViews[0];
    }

    if (visibleViews.length === 1) {
      return visibleViews[0];
    }

    return {
      direction: 'row',
      first: visibleViews[0],
      second: visibleViews[1],
      splitPercentage: 50,
    };
  };

  // Validation Functions
  const checkForDuplicateIds = (node: MosaicNode<T>, ids: Set<T> = new Set()): boolean => {
    if (typeof node === 'string' || typeof node === 'number') {
      if (ids.has(node)) {
        console.error(`Duplicate ID detected: ${node}`);
        return true;
      }
      ids.add(node);
      return false;
    }
    if (isMosaicParent(node)) {
      return checkForDuplicateIds(node.first, ids) || checkForDuplicateIds(node.second, ids);
    }
    return false;
  };

  // Initial State Creation
  const createInitialState = () => {
    // Try to restore saved layout first
    if (onRestoreLayout) {
      const restored = onRestoreLayout();
      if (restored) {
        const cleanedRestored = removeHiddenNodes(restored);
        if (cleanedRestored && checkForDuplicateIds(cleanedRestored)) {
          throw new Error('Duplicate IDs detected in restored layout');
        }
        return cleanedRestored || getDefaultLayout();
      }
    }

    // Fall back to initial layout
    const cleanedLayout = removeHiddenNodes(initialLayout);
    if (cleanedLayout && checkForDuplicateIds(cleanedLayout)) {
      throw new Error('Duplicate IDs detected in initial layout');
    }
    return cleanedLayout || getDefaultLayout();
  };

  // State Management
  const [currentNode, setCurrentNode] = useState<MosaicNode<T> | null>(createInitialState);
  const [hiddenWindows, setHiddenWindows] = useState<T[]>(initialHiddenWindows);
  const [savedLayouts, setSavedLayouts] = useState<Record<T, MosaicNode<T> | null>>(() => {
    return allViews.reduce((acc, viewId) => ({
      ...acc,
      [viewId]: null
    }), {} as Record<T, MosaicNode<T> | null>);
  });

  // Event Handlers
  const handleChange = useCallback((newNode: MosaicNode<T> | null) => {
    setCurrentNode(newNode);
    if (newNode) {
      onLayoutChange?.(newNode);
      onSaveLayout?.(newNode);
    }
  }, [onLayoutChange, onSaveLayout]);

  const closeWindow = (viewId: T) => {
    setCurrentNode(oldNode => {
      if (!oldNode) return null;

      const removeNode = (node: MosaicNode<T>): MosaicNode<T> | null => {
        if (typeof node === 'string' || typeof node === 'number') {
          return node === viewId ? null : node;
        }
        
        if (isMosaicParent(node)) {
          const first = removeNode(node.first);
          const second = removeNode(node.second);

          if (!first && !second) return null;
          if (!first) return second;
          if (!second) return first;

          return {
            direction: node.direction,
            first,
            second,
            splitPercentage: node.splitPercentage,
          };
        }
        return node;
      };

      // Save the current layout before removing the window
      setSavedLayouts(prev => ({ ...prev, [viewId]: oldNode }));

      const newNode = removeNode(oldNode);
      const newHiddenWindows = [...hiddenWindows, viewId];
      setHiddenWindows(newHiddenWindows);
      onVisibilityChange?.(newHiddenWindows);

      return newNode;
    });
  };

  const handleRemove = useCallback((viewId: T) => {
    closeWindow(viewId);
  }, [hiddenWindows, onVisibilityChange]);

  const handleReopen = useCallback((viewId: T) => {
    const isCurrentlyHidden = hiddenWindows.includes(viewId);

    if (isCurrentlyHidden) {
      const newHiddenWindows = hiddenWindows.filter(id => id !== viewId);
      setHiddenWindows(newHiddenWindows);
      onVisibilityChange?.(newHiddenWindows);

      setCurrentNode(oldNode => {
        const restoredLayout = savedLayouts[viewId];
        if (restoredLayout) {
          return restoredLayout;
        }

        if (!oldNode) {
          return viewId;
        }

        return {
          direction: 'row' as MosaicDirection,
          first: oldNode,
          second: viewId,
          splitPercentage: 75,
        };
      });
    } else {
      closeWindow(viewId);
    }
  }, [hiddenWindows, onVisibilityChange, savedLayouts]);

  // Render Functions
  const renderWindow = (id: T, path: MosaicBranch[]) => (
    <MosaicWindow<T>
      path={path}
      title={windowConfig[id].title}
      toolbarControls={[
        <BpButton
          key="remove"
          minimal
          small
          onClick={() => handleRemove(id)}
          icon={<Icon icon="cross" size={16} />}
        />
      ]}
    >
      {elementMap[id]}
    </MosaicWindow>
  );

  // Component Render
  return (
    <ErrorBoundary>
      <div className="mosaic-container">
        <Mosaic<T>
          renderTile={(id, path) => renderWindow(id, path)}
          value={currentNode}
          onChange={handleChange}
          className="mosaic-blueprint-theme"
          zeroStateView={
            <div className="mosaic-zero-state">
              Use the toolbar below to add windows
            </div>
          }
        />
        <div className="window-manager-area">
          <WindowToolbar
            hiddenWindows={hiddenWindows}
            onReopen={handleReopen}
            windowConfig={windowConfig}
            allViews={allViews}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
};

// WindowToolbar Component
interface WindowToolbarProps<T extends string | number = ViewId> {
  hiddenWindows: T[];
  onReopen: (viewId: T) => void;
  windowConfig: Record<T, WindowConfig>;
  allViews: T[];
}

const WindowToolbar = <T extends string | number = ViewId>({ 
  hiddenWindows, 
  onReopen,
  windowConfig,
  allViews
}: WindowToolbarProps<T>) => {
  return (
    <div className="window-manager">
      {allViews.map((viewId) => (
        <BpButton
          key={viewId}
          small={true}
          icon={windowConfig[viewId].icon}
          active={!hiddenWindows.includes(viewId)}
          onClick={() => onReopen(viewId)}
        >
          {windowConfig[viewId].title.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {line}
              {i < windowConfig[viewId].title.split('\n').length - 1 && <br />}
            </React.Fragment>
          ))}
        </BpButton>
      ))}
    </div>
  );
};