// Write metrics from the queue to the database
import { brainsOS_queue_metrics } from "../stacks/queues";
import { brainsOS_RDS_Vpc, auroraPassword, brainsOS_RDS_Aurora } from "../stacks/database";
import { brainsOS_API } from "../stacks/api";

const writeMetricsFunction = new sst.aws.Function("writeMetricsFunction", {
    handler: "packages/brainsOS/handlers/money-manager/sqs/metricsHandler.handler",
    link: [brainsOS_RDS_Aurora, brainsOS_queue_metrics, auroraPassword],
    vpc: brainsOS_RDS_Vpc,
    
  });

  brainsOS_queue_metrics.subscribe(writeMetricsFunction.arn);

  // API for money manager status
  brainsOS_API.route("GET /money-manager/status", {
    handler: "packages/brainsOS/handlers/money-manager/api/statusHandler.handler",
    link: [brainsOS_RDS_Aurora]
  });