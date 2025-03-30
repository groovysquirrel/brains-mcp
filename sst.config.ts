/// <reference path="./.sst/platform/config.d.ts" />


export default $config({
  
  // Base sst app settings
  app(input) {
    return {
      name: "brains-mcp",
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
    
    const frontend = await import("./infra/stacks/frontends");
    const api = await import("./infra/stacks/api");

    const websocket = await import("./infra/stacks/websocket");
    
    return {
      userPool: auth.userPool.id,
      Region: aws.getRegionOutput().name,
      identityPool: auth.identityPool.id,
      userPoolClient: auth.userPoolClient.id,
      app: api.brainsOS_API.url,
      frontend: frontend.latest_brains.url,
      websocket: websocket.brainsOS_websocket_API.url,
    };
   
    
  },
});
