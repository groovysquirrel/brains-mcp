/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  
  // Base sst app settings
  app(input) {
    return {
      name: "brainsos",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {        
        aws: { region: "us-east-1" }      
      } 

    };
  },

  // Run the app
  async run() {


    // Import the stacks
    const auth = await import("./infra/stacks/auth");
    const email = await import("./infra/stacks/email");
    const database = await import("./infra/stacks/database");
    const frontend = await import("./infra/stacks/frontends");
    const api = await import("./infra/stacks/api");
    const websocket = await import("./infra/stacks/websocket");

    // Import the apps
    const llmGateway = await import("./infra/apps/llm-gateway");
    const mcpServer = await import("./infra/apps/mcp-server");
    const library = await import("./infra/apps/library");
    
    return {
      userPool: auth.userPool.id,
      Region: aws.getRegionOutput().name,
      identityPool: auth.identityPool.id,
      userPoolClient: auth.userPoolClient.id,
      app: api.brainsOS_API.url,
      frontend: frontend.latest_brains.url,
      websocket: websocket.brainsOS_wss.url,
    };
   
    
  },
});
