import "./css/Home.css";
import brainsImage from "../assets/brains_ai.webp";

export default function Home() {
  return (
    <div className="Home">
      <div className="lander">
        <img src={brainsImage} alt="B.R.A.I.N.S. project" className="logo-image" />
        <h1>B.R.A.I.N.S.</h1>
        <p className="text-muted">A non-deterministic way to program your LLMs.</p>
      </div>
      
      <div className="about-container">
        <div className="about-content">
          <p className="about-description">
            The Balanced Reasoning AI Node System (B.R.A.I.N.S.) approach uses abstract programming to customize LLMs using Cognitive Models. 
            <b>This approach embraces the non-deterministic nature of LLMs.</b>
          </p>
          
          <h3 className="about-features-title">Key Features</h3>
          <ul className="about-features-list">
            <li>Model Building: Create and design conceptual models with structured reasoning and nodes.</li>
            <li>Rule Definition: Customize system prompts to establish rules for LLM behavior using conceptual models.</li>
            <li>Interactive Chat: Engage with LLMs that respond based on defined rules and models.</li>
            <li>Resources: Learn modeling techniques and explore the B.R.A.I.N.S. approach in depth.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

