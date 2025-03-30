import React from 'react';
import { Navbar as BsNavbar, Nav } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import "./Navbar.css";
import config from "../config";

interface NavbarProps {
  isAuthenticated: boolean;
  handleLogout: () => void;
}

export default function Navbar({ isAuthenticated, handleLogout }: NavbarProps) {
  const filterMenuItem = (item: string) => {
    return config.allowedMenuItems.includes(item);
  };

  return (
    <BsNavbar collapseOnSelect bg="light" expand="md" className="mb-3 px-3">
      <LinkContainer to="/">
        <BsNavbar.Brand className="font-weight-bold text-muted">
          Brains
        </BsNavbar.Brand>
      </LinkContainer>
      <BsNavbar.Toggle />
      <BsNavbar.Collapse>
        <Nav className="me-auto">
          {isAuthenticated && filterMenuItem('Prompt') && (
            <LinkContainer to="/prompt">
              <Nav.Link>Prompt</Nav.Link>
            </LinkContainer>
          )}
          {isAuthenticated && filterMenuItem('Visualize') && (
            <LinkContainer to="/visualize">
              <Nav.Link>Visualize</Nav.Link>
            </LinkContainer>
          )}
          {isAuthenticated && filterMenuItem('Console') && (
            <LinkContainer to="/operate">
              <Nav.Link>Console</Nav.Link>
            </LinkContainer>
          )}
          {isAuthenticated && filterMenuItem('Help') && (
            <LinkContainer to="/help">
              <Nav.Link>Help</Nav.Link>
            </LinkContainer>
          )}
          {isAuthenticated && filterMenuItem('Editor') && (
            <LinkContainer to="/floweditor">
              <Nav.Link>Editor</Nav.Link>
            </LinkContainer>
          )}
          {isAuthenticated && filterMenuItem('MCP') && (
            <LinkContainer to="/mcp">
              <Nav.Link>MCP</Nav.Link>
            </LinkContainer>
          )}
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
            <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
          )}
        </Nav>
      </BsNavbar.Collapse>
    </BsNavbar>
  );
} 

