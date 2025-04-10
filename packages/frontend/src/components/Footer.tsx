import "./Footer.css";
import { FaGithub } from 'react-icons/fa';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-company">
          <p className="copyright">
            © {new Date().getFullYear()}{" "}
            <a href="https://patternsatscale.com">
              Patterns at Scale
            </a>
          </p>
        </div>
        <div className="footer-links">
         
          <span className="footer-separator"> - </span>
          <a 
            href="https://github.com/groovysquirrel/brains-mcp" 
            target="_blank" 
            rel="noopener noreferrer"
            className="github-button"
          >
            <FaGithub /> View on GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}