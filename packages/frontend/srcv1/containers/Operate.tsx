import Console from '../components/Console';
import "./css/Operate.css";

export default function Operate() {
  return (
    <div className="operate">
      <div className="console-panel">
        <Console 
          theme="green"
          welcomeMessage="System Management Console (alpha)"
          prompt="> "
        />
      </div>
    </div>
  );
} 