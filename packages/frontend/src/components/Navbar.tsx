import React from 'react';
import { Navbar as BsNavbar, Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import "./Navbar.css";
import config from "../config";

interface NavbarProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export default function Navbar({ isAuthenticated, onLogout }: NavbarProps) {
  const filterMenuItem = (item: string) => {
    return config.allowedMenuItems.includes(item);
  };

  return (
    <BsNavbar collapseOnSelect bg="light" expand="md" className="px-3 py-0">
      <LinkContainer to="/">
        <BsNavbar.Brand className="font-weight-bold text-muted navbar-brand">
          brains OS
        </BsNavbar.Brand>
      </LinkContainer>
      <BsNavbar.Toggle />
      <BsNavbar.Collapse>
        <Nav className="me-auto">
          
          {isAuthenticated && filterMenuItem('Console') && (
            <LinkContainer to="/console">
              <Nav.Link>Console</Nav.Link>
            </LinkContainer>
          )}
          {isAuthenticated && filterMenuItem('Cost Manager') && (
            <LinkContainer to="/cost-manager">
              <Nav.Link>Cost Manager</Nav.Link>
            </LinkContainer>
          )}
          {isAuthenticated && filterMenuItem('Prompt Studio') && (
            <LinkContainer to="/prompt-studio">
              <Nav.Link>Prompt Studio</Nav.Link>
            </LinkContainer>
          )}

          <LinkContainer to="/about">
            <Nav.Link>About</Nav.Link>
          </LinkContainer>

        </Nav>
        <Nav>
          {!isAuthenticated ? (
            <>
              <LinkContainer to="/signup">
                <Nav.Link>Signup</Nav.Link>
              </LinkContainer>
              <LinkContainer to="/login">
                <Nav.Link>Login</Nav.Link>
              </LinkContainer>
            </>
          ) : (
            <Nav.Link onClick={onLogout}>Logout</Nav.Link>
          )}
        </Nav>
      </BsNavbar.Collapse>
    </BsNavbar>
  );
} 

