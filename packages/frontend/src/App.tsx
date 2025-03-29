import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from 'aws-amplify/auth';
import { AppContext } from "./lib/contextLib";
import Routes from './Routes';
import AppLayout from './layouts/AppLayout';
import './App.css';

export default function App() {
  const [isAuthenticated, userHasAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    onLoad();
  }, []);

  async function onLoad() {
    try {
      await getCurrentUser();
      userHasAuthenticated(true);
    } catch (e) {
      if (e !== 'No current user') {
        console.error('Error:', e);
      }
    }
    setIsAuthenticating(false);
  }

  async function handleLogout() {
    userHasAuthenticated(false);
    nav("/login");
  }

  return (
    !isAuthenticating && (
      <AppContext.Provider value={{ isAuthenticated, userHasAuthenticated }}>
        <AppLayout isAuthenticated={isAuthenticated} onLogout={handleLogout}>
          <Routes />
        </AppLayout>
      </AppContext.Provider>
    )
  );
}
