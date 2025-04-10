/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  
  // Base sst app settings
  app(input) {
    return {
      name: "brainsOS",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: {        
        aws: { region: "us-east-1" }      
      },
      env: {
        AWS_REGION: "us-east-1"
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
    const storage = await import("./infra/stacks/storage");
    const queues = await import("./infra/stacks/queues");

    // Import the apps
    const llmGateway = await import("./infra/apps/llm-gateway");
    const mcpServer = await import("./infra/apps/mcp-server");
    const library = await import("./infra/apps/library");
    
    return {
      REGION: aws.getRegionOutput().name,
      IDENTITY_POOL_ID: auth.brainsOS_identityPool.id,
      USER_POOL_ID: auth.brainsOS_userPool.id,
      APP_CLIENT_ID: auth.brainsOS_userPoolClient.id,
      
      api_url: api.brainsOS_API.url,
      frontend_url: frontend.brainsOS_frontend.url,
      wss_url: websocket.brainsOS_wss.url,
      brainsosbucket: storage.brainsOS_bucket_logs.name,
      queue_url: queues.brainsOS_queue_metrics.url      
    };
   
    
  },
});
