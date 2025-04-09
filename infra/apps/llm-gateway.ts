import { userData, systemData, BrainsOSAuroraRDS, BrainsOSRDSVpc } from "../stacks/database";
import { brainsOS_API} from "../stacks/api";
import { bedrockPermissions } from "../stacks/auth";
import { brainsOS_wss } from "../stacks/websocket";
import { BrainsOSBucket } from "../stacks/storage";
import { BrainsOSMetricsQueue } from "../stacks/queues";

const gwchatFunction = new sst.aws.Function("gwchatFunction", {
    handler: "packages/brainsOS/handlers/websocket/llm-gateway-v2/chat.handler",
    link: [brainsOS_wss, userData, BrainsOSBucket, BrainsOSMetricsQueue],
    permissions: [bedrockPermissions],
    copyFiles: [{ from: "packages/brainsOS/llm-gateway-v2/config/", to: "config" }],
  });
// LLM Gateway routes
brainsOS_wss.route("llm/chat", gwchatFunction.arn, {});
brainsOS_wss.route("llm/prompt", gwchatFunction.arn, {});
brainsOS_wss.route("llm/conversation", gwchatFunction.arn, {});


// LLM Gateway API routes
brainsOS_API.route("POST /llm-gateway/{action}", {
    permissions: [ bedrockPermissions ],
    link: [userData, BrainsOSBucket, BrainsOSMetricsQueue],
    handler: "packages/brainsOS/handlers/api/llm-gateway/gatewayHandler.handler",
    copyFiles: [{ from: "packages/brainsOS/llm-gateway-v2/config/", to: "config" }],
  });


// Write metrics from the queue to the database
  const writeMetricsFunction = new sst.aws.Function("writeMetricsFunction", {
    handler: "packages/brainsOS/handlers/sqs/llm-gateway/metricsHandler.handler",
    link: [BrainsOSAuroraRDS, BrainsOSMetricsQueue],
    vpc: BrainsOSRDSVpc,
    
  });

  BrainsOSMetricsQueue.subscribe(writeMetricsFunction.arn);


  