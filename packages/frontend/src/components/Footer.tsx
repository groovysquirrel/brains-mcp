import "./Footer.css";

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
          <a href="#" className="footer-link">Terms & Conditions</a>
          <span className="footer-separator"> - </span>
          <a href="#" className="footer-link">Privacy Policy</a>
        </div>
      </div>
    </footer>
  );
}