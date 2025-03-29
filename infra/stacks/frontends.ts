import path from "path";
import { brainsOS_API } from "./api";
import {userPool, identityPool , userPoolClient } from "./auth"
import { getDomainName, getVersion } from "../config";
const region = aws.getRegionOutput().name;

  export const latest_brains = new sst.aws.StaticSite("brains_latest", {
    path: "packages/frontend/",
    build:
    {
      output: "dist",
      command: "npm run build",
    },
    
    errorPage: "redirect_to_index_page",
    indexPage: "/",
    environment: {
      VITE_REGION: region,
      VITE_API_URL: brainsOS_API.url,
      VITE_USER_POOL_ID: userPool.id,
      VITE_IDENTITY_POOL_ID: identityPool.id,
      VITE_USER_POOL_CLIENT_ID: userPoolClient.id,
      VITE_BRAINSOS_VERSION: getVersion('latest', $app.stage),
      VITE_STAGE: $app.stage
    },
    domain: {
      name: getDomainName('frontend', 'latest', $app.stage)
    },
    
  });