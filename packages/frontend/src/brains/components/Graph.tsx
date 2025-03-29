import { useEffect, useRef, useState } from 'react';
import { Engine, graphviz } from 'd3-graphviz';
import * as d3 from 'd3';
import { Button} from 'react-bootstrap';
import { ArrowsFullscreen, Download } from 'react-bootstrap-icons';
import './Graph.css';

interface GraphProps {
  dotSrc: string;
  fit?: boolean;
  engine?: string;
  onError?: (error: {message: string, line?: number} | null) => void;
}

export default function Graph({ dotSrc, fit = true, engine = 'dot', onError }: GraphProps) {
  const graphRef = useRef<HTMLDivElement>(null);
  const graphvizRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleZoomOutMap = () => {
    if (!graphRef.current || !graphvizRef.current) return;
    
    const svg = d3.select(graphRef.current).select('svg');
    const g = svg.select('g');
    
    const viewBox = svg.attr("viewBox").split(' ');
    const element = g.node();
    
    if (!element || !(element instanceof SVGGraphicsElement)) return;
    
    const bbox = element.getBBox();
    const xRatio = parseFloat(viewBox[2]) / bbox.width;
    const yRatio = parseFloat(viewBox[3]) / bbox.height;
    const scale = Math.min(xRatio, yRatio) * 0.95;
    
    const transform = d3.zoomIdentity
      .translate(
        (parseFloat(viewBox[2]) - bbox.width * scale) / 2 - bbox.x * scale,
        (parseFloat(viewBox[3]) - bbox.height * scale) / 2 - bbox.y * scale
      )
      .scale(scale);

    graphvizRef.current.zoomSelection().call(graphvizRef.current.zoomBehavior().transform, transform);
  };

  const handleExportSVG = () => {
    if (!graphRef.current) return;
    
    const svgElement = graphRef.current.querySelector('svg');
    if (!svgElement) return;
    
    // Create a copy of the SVG
    const svgCopy = svgElement.cloneNode(true) as SVGElement;
    
    // Convert SVG to string
    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svgCopy);
    
    // Create blob and download
    const blob = new Blob([svgString], {type: 'image/svg+xml'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'graph.svg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!graphRef.current) return;

    try {
      const width = graphRef.current.parentElement?.clientWidth || 800;
      const height = graphRef.current.parentElement?.clientHeight || 600;

      // Initialize graphviz if not already initialized
      if (!graphvizRef.current) {
        graphvizRef.current = graphviz(graphRef.current)
          .engine(engine as Engine)
          .width(width)
          .height(height)
          .fit(fit)
          .zoom(true)
          .onerror((error: Error) => {
            setError(error.message);
            onError?.({message: error.message});
          })
          .attributer(function(d: any) {
            if (d.tag === "svg") {
              d.attributes.width = "100%";
              d.attributes.height = "100%";
            }
          });
      }

      // Update the graph with transition
      const updateGraph = () => {
        let currentZoom: d3.ZoomTransform | undefined;
        try {
          // Only try to get zoom state if we have a selection
          const zoomSelection = graphvizRef.current.zoomSelection();
          if (zoomSelection && !zoomSelection.empty()) {
            currentZoom = d3.zoomTransform(zoomSelection.node());
          }
        } catch (e) {
          // Ignore zoom transform errors
          console.debug('No previous zoom state');
        }

        graphvizRef.current
          .width(width)
          .height(height)
          .fit(fit)
          .renderDot(dotSrc, () => {
            // After render callback
            if (currentZoom && !fit) {
              try {
                const zoomSelection = graphvizRef.current.zoomSelection();
                if (zoomSelection && !zoomSelection.empty()) {
                  zoomSelection.call(
                    graphvizRef.current.zoomBehavior().transform,
                    currentZoom
                  );
                }
              } catch (e) {
                console.debug('Could not restore zoom state');
              }
            }
          });
      };

      updateGraph();
      setError(null);
      onError?.(null);

      // Handle resize
      const handleResize = () => {
        if (!graphRef.current) return;
        try {
          const newWidth = graphRef.current.parentElement?.clientWidth || 800;
          const newHeight = graphRef.current.parentElement?.clientHeight || 600;
          
          let zoomState: d3.ZoomTransform | undefined;
          try {
            const zoomSelection = graphvizRef.current.zoomSelection();
            if (zoomSelection && !zoomSelection.empty()) {
              zoomState = d3.zoomTransform(zoomSelection.node());
            }
          } catch (e) {
            // Ignore zoom transform errors
            console.debug('No zoom state during resize');
          }
          
          graphvizRef.current
            .width(newWidth)
            .height(newHeight)
            .fit(fit)
            .renderDot(dotSrc, () => {
              if (zoomState && !fit) {
                try {
                  const zoomSelection = graphvizRef.current.zoomSelection();
                  if (zoomSelection && !zoomSelection.empty()) {
                    zoomSelection.call(
                      graphvizRef.current.zoomBehavior().transform,
                      zoomState
                    );
                  }
                } catch (e) {
                  console.debug('Could not restore zoom state after resize');
                }
              }
            });
        } catch (err) {
          setError(err instanceof Error ? err.message : 'An error occurred');
        }
      };

      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      onError?.({message: errorMessage});
    }
  }, [dotSrc, engine, fit, onError]);

  return (
    <div className="graph-wrapper">
      {error ? (
        <div className="graph-error">
          Graphviz Error: {error}
        </div>
      ) : (
        <>
          <div ref={graphRef} className="graph-container" />
          <div className="graph-controls">
            <Button 
              variant="light"
              onClick={handleZoomOutMap}
              title="Fit to view"
              className="control-button"
            >
              <ArrowsFullscreen />
            </Button>
            <Button 
              variant="light"
              onClick={handleExportSVG}
              title="Export SVG"
              className="control-button"
            >
              <Download />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}