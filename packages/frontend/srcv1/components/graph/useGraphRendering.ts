import { useState, useCallback } from 'react';
import DotGraph from './DotGraph';

export function useGraphRendering(onError?: (error: any) => void) {
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const renderGraph = useCallback(async (graph: any, dotSrc: string) => {
    if (!graph || !dotSrc) return;

    try {
      // Validate DOT syntax
      new DotGraph(dotSrc);
      
      // Create promises for graph events
      const layoutReady = new Promise<void>(resolve => {
        graph.on('layoutEnd', resolve);
      });

      const renderReady = new Promise<void>(resolve => {
        graph.on('end', resolve);
      });

      // Render and wait for completion
      await graph.renderDot(dotSrc);
      await Promise.all([layoutReady, renderReady]);

      setError(null);
      onError?.(null);
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);
      onError?.({message: errorMessage});
      throw err;
    }
  }, [onError]);

  return { isLoading, error, renderGraph };
}