import path from "path";
import { brainsOS_API } from "./api";
import {brainsOS_userPool, brainsOS_identityPool , brainsOS_userPoolClient } from "./auth"
import { getDomainName, getVersion } from "../config";
import { brainsOS_wss } from "./websocket";
const region = aws.getRegionOutput().name;

  export const brainsOS_frontend = new sst.aws.StaticSite("brainsOS_frontend", {
    path: "packages/frontend/",
    build:
    {
      output: "dist",
      command: "npm run build",
    },
    
    errorPage: "index.html",
    indexPage: "/",
    environment: {
      VITE_REGION: region,
      VITE_API_URL: brainsOS_API.url,
      VITE_USER_POOL_ID: brainsOS_userPool.id,
      VITE_IDENTITY_POOL_ID: brainsOS_identityPool.id,
      VITE_USER_POOL_CLIENT_ID: brainsOS_userPoolClient.id,
      VITE_BRAINSOS_VERSION: getVersion('latest', $app.stage),
      VITE_STAGE: $app.stage,
      VITE_WEBSOCKET_URL: brainsOS_wss.url,
      VITE_WEBSOCKET_GATEWAY_URL: brainsOS_wss.url
    },
    domain: {
      name: getDomainName('frontend', 'latest', $app.stage)
    },
    
  });