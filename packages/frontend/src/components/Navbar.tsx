import { LinkContainer } from "react-router-bootstrap";
import { useLocation } from "react-router-dom";
import "./Navbar.css";
import config from "../config";

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function Navbar({ isAuthenticated, onLogout }: NavbarProps) {
  const location = useLocation();
  const version = import.meta.env.VITE_BRAINSOS_VERSION;
  
  const isMenuItemAllowed = (item: string) => config.allowedMenuItems.includes(item);

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <LinkContainer to="/">
          <a className={`logo ${location.pathname === '/' ? 'active' : ''}`}>
            BRAINS OS
            <span className="version"> v{version}</span>
          </a>
        </LinkContainer>

        <div className="nav-links main-links">
          <LinkContainer to="/">
            <a className={location.pathname === '/' ? 'active' : ''}>Home</a>
          </LinkContainer>

          {isAuthenticated && (
            <>
              {isMenuItemAllowed('Prompt') && (
                <LinkContainer to="/prompt">
                  <a className={location.pathname === '/prompt' ? 'active' : ''}>Prompt</a>
                </LinkContainer>
              )}

              {isMenuItemAllowed('Visualize') && (
                <LinkContainer to="/visualize">
                  <a className={location.pathname === '/visualize' ? 'active' : ''}>Visualize</a>
                </LinkContainer>
              )}

              {isMenuItemAllowed('Editor') && (
                <LinkContainer to="/floweditor">
                  <a className={location.pathname === '/floweditor' ? 'active' : ''}>Editor</a>
                </LinkContainer>
              )}

              {isMenuItemAllowed('Console') && (
                <LinkContainer to="/operate">
                  <a className={location.pathname === '/operate' ? 'active' : ''}>Console</a>
                </LinkContainer>
              )}



              {isMenuItemAllowed('Help') && (
                <LinkContainer to="/help">
                  <a className={location.pathname === '/help' ? 'active' : ''}>Help</a>
                </LinkContainer>
              )}
            </>
          )}
        </div>

        <div className="nav-links auth-links">
          {isAuthenticated ? (
            <a onClick={onLogout}>Logout</a>
          ) : (
            <LinkContainer to="/login">
              <a className={location.pathname === '/login' ? 'active' : ''}>Login</a>
            </LinkContainer>
          )}
        </div>
      </div>
    </nav>
  );
} 

