import { brainsOS_API } from "../stacks/api";
import { brainsOS_userData, loadDefaultData } from "../stacks/database";

// For user data
brainsOS_API.route("GET /latest/resources/{dataStore}/{object}", {
    link: [brainsOS_userData, loadDefaultData],
    handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
  });
  
  brainsOS_API.route("GET /latest/resources/{dataStore}/{object}/{name}", {
    link: [brainsOS_userData, loadDefaultData],
    handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
  });
  
  brainsOS_API.route("GET /latest/resources/{dataStore}/{object}/{name}/{version}", {
    link: [brainsOS_userData, loadDefaultData],
    handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
  });
  
  brainsOS_API.route("POST /latest/resources/{dataStore}/{object}", {
    link: [brainsOS_userData],
    handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
  });
  
  