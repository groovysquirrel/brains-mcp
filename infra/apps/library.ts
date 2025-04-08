import { brainsOS_API } from "../stacks/api";
import { userData, loadDefaultData } from "../stacks/database";

// For user data
brainsOS_API.route("GET /latest/resources/{dataStore}/{object}", {
    link: [userData, loadDefaultData],
    handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
  });
  
  brainsOS_API.route("GET /latest/resources/{dataStore}/{object}/{name}", {
    link: [userData, loadDefaultData],
    handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
  });
  
  brainsOS_API.route("GET /latest/resources/{dataStore}/{object}/{name}/{version}", {
    link: [userData, loadDefaultData],
    handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
  });
  
  brainsOS_API.route("POST /latest/resources/{dataStore}/{object}", {
    link: [userData],
    handler: "packages/brainsOS/functions/api/resources/resourcesHandler.handler",
  });
  
  