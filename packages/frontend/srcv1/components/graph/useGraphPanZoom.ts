import { useRef, useCallback } from 'react';
import { select } from 'd3-selection';
import { zoom, ZoomBehavior, zoomTransform } from 'd3-zoom';
import { zoomIdentity } from 'd3-zoom';

export function useGraphPanZoom() {
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const initializePanZoom = useCallback((svgElement: SVGSVGElement) => {
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 10])
      .on('zoom', (event) => {
        select(svgElement)
          .select('g')
          .attr('transform', event.transform.toString());
      });

    const selection = select(svgElement);
    selection.call(zoomBehavior as any);
    zoomRef.current = zoomBehavior;

    // Initial centering
    const g = selection.select<SVGGElement>('g');
    const gNode = g.node();
    if (gNode) {
      const bbox = gNode.getBBox();
      const width = svgElement.clientWidth;
      const height = svgElement.clientHeight;
      const scale = Math.min(width / bbox.width, height / bbox.height) * 0.9;
      const x = (width - bbox.width * scale) / 2;
      const y = (height - bbox.height * scale) / 2;

      selection
        .transition()
        .duration(250)
        .call(
          zoomBehavior.transform,
          zoomIdentity.translate(x, y).scale(scale)
        );
    }
  }, []);

  const setZoomScale = useCallback((scale: number, center = false) => {
    if (!zoomRef.current) return;
    
    const svg = select<SVGSVGElement, unknown>('svg');
    const svgNode = svg.node();
    if (!svgNode) return;
    
    const g = svg.select<SVGGElement>('g');
    const gNode = g.node();
    if (!gNode) return;

    const bbox = gNode.getBBox();
    const width = svgNode.clientWidth;
    const height = svgNode.clientHeight;
    
    const currentTransform = zoomTransform(svgNode);
    
    let x, y;
    if (center) {
      x = (width - bbox.width * scale) / 2;
      y = (height - bbox.height * scale) / 2;
    } else {
      const xCenter = width / 2;
      const yCenter = height / 2;
      x = xCenter - (xCenter - currentTransform.x) * scale / currentTransform.k;
      y = yCenter - (yCenter - currentTransform.y) * scale / currentTransform.k;
    }

    svg
      .transition()
      .duration(250)
      .call(
        zoomRef.current.transform,
        zoomIdentity.translate(x - bbox.x * scale, y - bbox.y * scale).scale(scale)
      );
  }, []);

  const zoomIn = useCallback(() => {
    if (!zoomRef.current) return;
    const svg = select<SVGSVGElement, unknown>('svg');
    const svgNode = svg.node();
    if (!svgNode) return;
    const currentTransform = zoomTransform(svgNode);
    setZoomScale(currentTransform.k * 1.2);
  }, [setZoomScale]);

  const zoomOut = useCallback(() => {
    if (!zoomRef.current) return;
    const svg = select<SVGSVGElement, unknown>('svg');
    const svgNode = svg.node();
    if (!svgNode) return;
    const currentTransform = zoomTransform(svgNode);
    setZoomScale(currentTransform.k / 1.2);
  }, [setZoomScale]);

  const resetZoom = useCallback(() => {
    setZoomScale(1, true);
  }, [setZoomScale]);

  const fitToScreen = useCallback((svgElement: SVGSVGElement) => {
    if (!svgElement || !zoomRef.current) return;
    
    const g = select(svgElement).select<SVGGElement>('g');
    const gNode = g.node();
    if (!gNode) return;

    const bbox = gNode.getBBox();
    const width = svgElement.clientWidth;
    const height = svgElement.clientHeight;
    const scale = Math.min(width / bbox.width, height / bbox.height) * 0.9;
    setZoomScale(scale, true);
  }, [setZoomScale]);

  return { initializePanZoom, zoomIn, zoomOut, resetZoom, fitToScreen };
}