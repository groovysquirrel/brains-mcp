import { Route, Routes } from "react-router-dom";
import AuthenticatedRoute from "./components/AuthenticatedRoute";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute";
import Home from "./containers/Home";
import NotFound from "./containers/NotFound";
import Login from "./containers/Login";
import Signup from "./containers/Signup";
import Help from "./containers/Help";
import About from "./containers/About";
import ConsoleContainer from "./containers/ConsoleContainer";
import CostManager from "./containers/CostManager";
import PromptStudio from "./containers/PromptStudio";
import config from "./config";

export default function Links() {
  const filterRoute = (path: string) => {
    if (path === '*' || path === '/') return true;
    return config.allowedRoutes.includes(path);
  };

  const routes = [
    { path: "/", element: <Home /> },
    { path: "/about", element: <About /> },
    { path: "/login", element: <UnauthenticatedRoute><Login /></UnauthenticatedRoute> },
    { path: "/signup", element: <UnauthenticatedRoute><Signup /></UnauthenticatedRoute> },
    { path: "/console", element: <AuthenticatedRoute><ConsoleContainer /></AuthenticatedRoute> },
    { path: "/cost-manager", element: <AuthenticatedRoute><CostManager /></AuthenticatedRoute> },
    { path: "/prompt-studio", element: <AuthenticatedRoute><PromptStudio /></AuthenticatedRoute> },
    { path: "/help", element: <AuthenticatedRoute><Help /></AuthenticatedRoute> },
    { path: "*", element: <NotFound /> }
  ].filter(route => filterRoute(route.path));

  return (
    <Routes>
      {routes.map(({ path, element }) => (
        <Route key={path} path={path} element={element} />
      ))}
    </Routes>
  );
}