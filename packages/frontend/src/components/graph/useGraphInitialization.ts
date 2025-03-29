import { useRef, useCallback } from 'react';
import { Engine, graphviz } from 'd3-graphviz';
import * as d3 from 'd3';

export function useGraphInitialization() {
  const graphvizRef = useRef<any>(null);

  const initialize = useCallback((
    node: HTMLElement | null,
    width: number,
    height: number,
    engine: string,
    tweenPaths: boolean = false,
    tweenShapes: boolean = false,
    tweenPrecision: string | number = '1%'
  ) => {
    if (!node) return null;
    
    d3.select(node).selectAll("*").remove();
    
    return graphviz(node)
      .engine(engine as Engine)
      .width(width)
      .height(height)
      .fit(false)
      .zoom(true)
      .tweenPaths(tweenPaths)
      .tweenShapes(tweenShapes)
      .tweenPrecision(tweenPrecision);
  }, []);

  return { graphvizRef, initialize };
}