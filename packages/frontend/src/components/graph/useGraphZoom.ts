import { useCallback } from 'react';
import * as d3 from 'd3';

const updateZoomScale = (graphviz: any, scale: number, center = false) => {
  if (!graphviz) return;
  
  const svg = graphviz.zoomSelection();
  const g = svg.selectWithoutDataPropagation("g");
  if (!g.node()) return;

  const viewBox = svg.attr("viewBox").split(' ').map(Number);
  if (!viewBox) return;

  const [, , width, height] = viewBox;
  const bbox = g.node().getBBox();
  const {x: x0, y: y0, k: k0} = d3.zoomTransform(svg.node());
  
  let x, y;
  if (center) {
    x = (width - bbox.width * scale) / 2;
    y = (height - bbox.height * scale) / 2;
  } else {
    const xCenter = width / 2;
    const yCenter = height / 2;
    x = xCenter - (xCenter - x0) * scale / k0;
    y = yCenter - (yCenter - y0) * scale / k0;
  }

  const transform = d3.zoomIdentity
    .translate(x - bbox.x * scale, y - bbox.y * scale)
    .scale(scale);

  svg.call(graphviz.zoomBehavior().transform, transform);
};

export function useGraphZoom() {
  const zoomIn = useCallback((graphviz: any) => {
    if (!graphviz) return;
    const svg = graphviz.zoomSelection();
    const transform = d3.zoomTransform(svg.node());
    updateZoomScale(graphviz, transform.k * 1.2);
  }, []);

  const zoomOut = useCallback((graphviz: any) => {
    if (!graphviz) return;
    const svg = graphviz.zoomSelection();
    const transform = d3.zoomTransform(svg.node());
    updateZoomScale(graphviz, transform.k / 1.2);
  }, []);

  const fitToScreen = useCallback((graphviz: any) => {
    if (!graphviz) return;
    updateZoomScale(graphviz, 1);
  }, []);

  return { zoomIn, zoomOut, fitToScreen };
}