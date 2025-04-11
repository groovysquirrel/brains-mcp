import { bedrockPermissions } from "../stacks/auth";
import { brainsOS_userData } from "../stacks/database";
import { brainsOS_bucket_logs } from "../stacks/storage";
import { brainsOS_wss } from "../stacks/websocket";
import { brainsOS_queue_metrics } from "../stacks/queues";

const defaultHandlerFunction = new sst.aws.Function("defaultHandlerFunction", {
    handler: "packages/brainsOS/handlers/websocket/controller/default.handler",
    link: [brainsOS_wss, brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics],
    permissions: [bedrockPermissions],
    copyFiles: [{ from: "packages/brainsOS/modules/llm-gateway/config/", to: "config" }],
  });

  brainsOS_wss.route("$default", defaultHandlerFunction.arn, {

  });