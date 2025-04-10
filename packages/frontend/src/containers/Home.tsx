import "./css/Home.css";
import Slider from "../components/Slider";
import { getDiagramImages } from "../lib/imageUtils";

export default function Home() {
  // Get diagram images from the utility function
  const diagramImages = getDiagramImages();

  return (
    <div className="Home">
      <div className="lander">
        {/* Slider for diagrams */}
        <Slider images={diagramImages} />
        

      </div>
    </div>
  );
}

