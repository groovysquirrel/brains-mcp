import { Route, Routes } from "react-router-dom";
import AuthenticatedRoute from "./components/AuthenticatedRoute";
import UnauthenticatedRoute from "./components/UnauthenticatedRoute";
import Home from "./containers/Home";
import NotFound from "./containers/NotFound";
import Login from "./containers/Login";
import Signup from "./containers/Signup";
import Help from "./containers/Help";
import Operate from "./containers/Operate";
import config from "./config";
import Prompt from "./containers/PromptTest";
import VisualizeContainer from "./brains/containers/VisualizeContainer";
import FlowContainer from "./brains/containers/FlowContainer";
import MCPContainer from "./mcp/client/containers/MCPContainer";

export default function Links() {
  const filterRoute = (path: string) => {
    if (path === '*' || path === '/') return true;
    return config.allowedRoutes.includes(path);
  };

  const routes = [
    { path: "/", element: <Home /> },
    { path: "/login", element: <UnauthenticatedRoute><Login /></UnauthenticatedRoute> },
    { path: "/signup", element: <UnauthenticatedRoute><Signup /></UnauthenticatedRoute> },
    { path: "/prompt", element: <AuthenticatedRoute><Prompt /></AuthenticatedRoute> },
    { path: "/visualize", element: <AuthenticatedRoute><VisualizeContainer /></AuthenticatedRoute> },
    { path: "/operate", element: <AuthenticatedRoute><Operate /></AuthenticatedRoute> },
    { path: "/help", element: <AuthenticatedRoute><Help /></AuthenticatedRoute> },
    { path: "/floweditor", element: <AuthenticatedRoute><FlowContainer /></AuthenticatedRoute> },
    { path: "/mcp", element: <AuthenticatedRoute><MCPContainer /></AuthenticatedRoute> },
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