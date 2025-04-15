import { bedrockPermissions } from "../stacks/auth";
import { brainsOS_userData } from "../stacks/database";
import { brainsOS_bucket_logs } from "../stacks/storage";
import { brainsOS_wss } from "../stacks/websocket";
import { brainsOS_queue_metrics } from "../stacks/queues";
import { localConfigs } from "./_configs";

const brainsControllerHandlerFunction = new sst.aws.Function("brainsControllerHandlerFunction", {
    handler: "packages/brainsOS/handlers/websocket/brain-controller/handler.handler",
    link: [brainsOS_wss, brainsOS_userData, brainsOS_bucket_logs, brainsOS_queue_metrics],
    permissions: [bedrockPermissions],
    copyFiles: localConfigs
  });

  brainsOS_wss.route("$default", brainsControllerHandlerFunction.arn, {

  });