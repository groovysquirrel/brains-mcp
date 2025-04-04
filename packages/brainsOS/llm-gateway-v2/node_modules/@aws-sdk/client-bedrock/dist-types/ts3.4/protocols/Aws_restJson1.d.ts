import {
  HttpRequest as __HttpRequest,
  HttpResponse as __HttpResponse,
} from "@smithy/protocol-http";
import { SerdeContext as __SerdeContext } from "@smithy/types";
import {
  BatchDeleteEvaluationJobCommandInput,
  BatchDeleteEvaluationJobCommandOutput,
} from "../commands/BatchDeleteEvaluationJobCommand";
import {
  CreateEvaluationJobCommandInput,
  CreateEvaluationJobCommandOutput,
} from "../commands/CreateEvaluationJobCommand";
import {
  CreateGuardrailCommandInput,
  CreateGuardrailCommandOutput,
} from "../commands/CreateGuardrailCommand";
import {
  CreateGuardrailVersionCommandInput,
  CreateGuardrailVersionCommandOutput,
} from "../commands/CreateGuardrailVersionCommand";
import {
  CreateInferenceProfileCommandInput,
  CreateInferenceProfileCommandOutput,
} from "../commands/CreateInferenceProfileCommand";
import {
  CreateMarketplaceModelEndpointCommandInput,
  CreateMarketplaceModelEndpointCommandOutput,
} from "../commands/CreateMarketplaceModelEndpointCommand";
import {
  CreateModelCopyJobCommandInput,
  CreateModelCopyJobCommandOutput,
} from "../commands/CreateModelCopyJobCommand";
import {
  CreateModelCustomizationJobCommandInput,
  CreateModelCustomizationJobCommandOutput,
} from "../commands/CreateModelCustomizationJobCommand";
import {
  CreateModelImportJobCommandInput,
  CreateModelImportJobCommandOutput,
} from "../commands/CreateModelImportJobCommand";
import {
  CreateModelInvocationJobCommandInput,
  CreateModelInvocationJobCommandOutput,
} from "../commands/CreateModelInvocationJobCommand";
import {
  CreatePromptRouterCommandInput,
  CreatePromptRouterCommandOutput,
} from "../commands/CreatePromptRouterCommand";
import {
  CreateProvisionedModelThroughputCommandInput,
  CreateProvisionedModelThroughputCommandOutput,
} from "../commands/CreateProvisionedModelThroughputCommand";
import {
  DeleteCustomModelCommandInput,
  DeleteCustomModelCommandOutput,
} from "../commands/DeleteCustomModelCommand";
import {
  DeleteGuardrailCommandInput,
  DeleteGuardrailCommandOutput,
} from "../commands/DeleteGuardrailCommand";
import {
  DeleteImportedModelCommandInput,
  DeleteImportedModelCommandOutput,
} from "../commands/DeleteImportedModelCommand";
import {
  DeleteInferenceProfileCommandInput,
  DeleteInferenceProfileCommandOutput,
} from "../commands/DeleteInferenceProfileCommand";
import {
  DeleteMarketplaceModelEndpointCommandInput,
  DeleteMarketplaceModelEndpointCommandOutput,
} from "../commands/DeleteMarketplaceModelEndpointCommand";
import {
  DeleteModelInvocationLoggingConfigurationCommandInput,
  DeleteModelInvocationLoggingConfigurationCommandOutput,
} from "../commands/DeleteModelInvocationLoggingConfigurationCommand";
import {
  DeletePromptRouterCommandInput,
  DeletePromptRouterCommandOutput,
} from "../commands/DeletePromptRouterCommand";
import {
  DeleteProvisionedModelThroughputCommandInput,
  DeleteProvisionedModelThroughputCommandOutput,
} from "../commands/DeleteProvisionedModelThroughputCommand";
import {
  DeregisterMarketplaceModelEndpointCommandInput,
  DeregisterMarketplaceModelEndpointCommandOutput,
} from "../commands/DeregisterMarketplaceModelEndpointCommand";
import {
  GetCustomModelCommandInput,
  GetCustomModelCommandOutput,
} from "../commands/GetCustomModelCommand";
import {
  GetEvaluationJobCommandInput,
  GetEvaluationJobCommandOutput,
} from "../commands/GetEvaluationJobCommand";
import {
  GetFoundationModelCommandInput,
  GetFoundationModelCommandOutput,
} from "../commands/GetFoundationModelCommand";
import {
  GetGuardrailCommandInput,
  GetGuardrailCommandOutput,
} from "../commands/GetGuardrailCommand";
import {
  GetImportedModelCommandInput,
  GetImportedModelCommandOutput,
} from "../commands/GetImportedModelCommand";
import {
  GetInferenceProfileCommandInput,
  GetInferenceProfileCommandOutput,
} from "../commands/GetInferenceProfileCommand";
import {
  GetMarketplaceModelEndpointCommandInput,
  GetMarketplaceModelEndpointCommandOutput,
} from "../commands/GetMarketplaceModelEndpointCommand";
import {
  GetModelCopyJobCommandInput,
  GetModelCopyJobCommandOutput,
} from "../commands/GetModelCopyJobCommand";
import {
  GetModelCustomizationJobCommandInput,
  GetModelCustomizationJobCommandOutput,
} from "../commands/GetModelCustomizationJobCommand";
import {
  GetModelImportJobCommandInput,
  GetModelImportJobCommandOutput,
} from "../commands/GetModelImportJobCommand";
import {
  GetModelInvocationJobCommandInput,
  GetModelInvocationJobCommandOutput,
} from "../commands/GetModelInvocationJobCommand";
import {
  GetModelInvocationLoggingConfigurationCommandInput,
  GetModelInvocationLoggingConfigurationCommandOutput,
} from "../commands/GetModelInvocationLoggingConfigurationCommand";
import {
  GetPromptRouterCommandInput,
  GetPromptRouterCommandOutput,
} from "../commands/GetPromptRouterCommand";
import {
  GetProvisionedModelThroughputCommandInput,
  GetProvisionedModelThroughputCommandOutput,
} from "../commands/GetProvisionedModelThroughputCommand";
import {
  ListCustomModelsCommandInput,
  ListCustomModelsCommandOutput,
} from "../commands/ListCustomModelsCommand";
import {
  ListEvaluationJobsCommandInput,
  ListEvaluationJobsCommandOutput,
} from "../commands/ListEvaluationJobsCommand";
import {
  ListFoundationModelsCommandInput,
  ListFoundationModelsCommandOutput,
} from "../commands/ListFoundationModelsCommand";
import {
  ListGuardrailsCommandInput,
  ListGuardrailsCommandOutput,
} from "../commands/ListGuardrailsCommand";
import {
  ListImportedModelsCommandInput,
  ListImportedModelsCommandOutput,
} from "../commands/ListImportedModelsCommand";
import {
  ListInferenceProfilesCommandInput,
  ListInferenceProfilesCommandOutput,
} from "../commands/ListInferenceProfilesCommand";
import {
  ListMarketplaceModelEndpointsCommandInput,
  ListMarketplaceModelEndpointsCommandOutput,
} from "../commands/ListMarketplaceModelEndpointsCommand";
import {
  ListModelCopyJobsCommandInput,
  ListModelCopyJobsCommandOutput,
} from "../commands/ListModelCopyJobsCommand";
import {
  ListModelCustomizationJobsCommandInput,
  ListModelCustomizationJobsCommandOutput,
} from "../commands/ListModelCustomizationJobsCommand";
import {
  ListModelImportJobsCommandInput,
  ListModelImportJobsCommandOutput,
} from "../commands/ListModelImportJobsCommand";
import {
  ListModelInvocationJobsCommandInput,
  ListModelInvocationJobsCommandOutput,
} from "../commands/ListModelInvocationJobsCommand";
import {
  ListPromptRoutersCommandInput,
  ListPromptRoutersCommandOutput,
} from "../commands/ListPromptRoutersCommand";
import {
  ListProvisionedModelThroughputsCommandInput,
  ListProvisionedModelThroughputsCommandOutput,
} from "../commands/ListProvisionedModelThroughputsCommand";
import {
  ListTagsForResourceCommandInput,
  ListTagsForResourceCommandOutput,
} from "../commands/ListTagsForResourceCommand";
import {
  PutModelInvocationLoggingConfigurationCommandInput,
  PutModelInvocationLoggingConfigurationCommandOutput,
} from "../commands/PutModelInvocationLoggingConfigurationCommand";
import {
  RegisterMarketplaceModelEndpointCommandInput,
  RegisterMarketplaceModelEndpointCommandOutput,
} from "../commands/RegisterMarketplaceModelEndpointCommand";
import {
  StopEvaluationJobCommandInput,
  StopEvaluationJobCommandOutput,
} from "../commands/StopEvaluationJobCommand";
import {
  StopModelCustomizationJobCommandInput,
  StopModelCustomizationJobCommandOutput,
} from "../commands/StopModelCustomizationJobCommand";
import {
  StopModelInvocationJobCommandInput,
  StopModelInvocationJobCommandOutput,
} from "../commands/StopModelInvocationJobCommand";
import {
  TagResourceCommandInput,
  TagResourceCommandOutput,
} from "../commands/TagResourceCommand";
import {
  UntagResourceCommandInput,
  UntagResourceCommandOutput,
} from "../commands/UntagResourceCommand";
import {
  UpdateGuardrailCommandInput,
  UpdateGuardrailCommandOutput,
} from "../commands/UpdateGuardrailCommand";
import {
  UpdateMarketplaceModelEndpointCommandInput,
  UpdateMarketplaceModelEndpointCommandOutput,
} from "../commands/UpdateMarketplaceModelEndpointCommand";
import {
  UpdateProvisionedModelThroughputCommandInput,
  UpdateProvisionedModelThroughputCommandOutput,
} from "../commands/UpdateProvisionedModelThroughputCommand";
export declare const se_BatchDeleteEvaluationJobCommand: (
  input: BatchDeleteEvaluationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateEvaluationJobCommand: (
  input: CreateEvaluationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateGuardrailCommand: (
  input: CreateGuardrailCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateGuardrailVersionCommand: (
  input: CreateGuardrailVersionCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateInferenceProfileCommand: (
  input: CreateInferenceProfileCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateMarketplaceModelEndpointCommand: (
  input: CreateMarketplaceModelEndpointCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateModelCopyJobCommand: (
  input: CreateModelCopyJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateModelCustomizationJobCommand: (
  input: CreateModelCustomizationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateModelImportJobCommand: (
  input: CreateModelImportJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateModelInvocationJobCommand: (
  input: CreateModelInvocationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreatePromptRouterCommand: (
  input: CreatePromptRouterCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_CreateProvisionedModelThroughputCommand: (
  input: CreateProvisionedModelThroughputCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_DeleteCustomModelCommand: (
  input: DeleteCustomModelCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_DeleteGuardrailCommand: (
  input: DeleteGuardrailCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_DeleteImportedModelCommand: (
  input: DeleteImportedModelCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_DeleteInferenceProfileCommand: (
  input: DeleteInferenceProfileCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_DeleteMarketplaceModelEndpointCommand: (
  input: DeleteMarketplaceModelEndpointCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_DeleteModelInvocationLoggingConfigurationCommand: (
  input: DeleteModelInvocationLoggingConfigurationCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_DeletePromptRouterCommand: (
  input: DeletePromptRouterCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_DeleteProvisionedModelThroughputCommand: (
  input: DeleteProvisionedModelThroughputCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_DeregisterMarketplaceModelEndpointCommand: (
  input: DeregisterMarketplaceModelEndpointCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetCustomModelCommand: (
  input: GetCustomModelCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetEvaluationJobCommand: (
  input: GetEvaluationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetFoundationModelCommand: (
  input: GetFoundationModelCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetGuardrailCommand: (
  input: GetGuardrailCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetImportedModelCommand: (
  input: GetImportedModelCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetInferenceProfileCommand: (
  input: GetInferenceProfileCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetMarketplaceModelEndpointCommand: (
  input: GetMarketplaceModelEndpointCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetModelCopyJobCommand: (
  input: GetModelCopyJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetModelCustomizationJobCommand: (
  input: GetModelCustomizationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetModelImportJobCommand: (
  input: GetModelImportJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetModelInvocationJobCommand: (
  input: GetModelInvocationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetModelInvocationLoggingConfigurationCommand: (
  input: GetModelInvocationLoggingConfigurationCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetPromptRouterCommand: (
  input: GetPromptRouterCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_GetProvisionedModelThroughputCommand: (
  input: GetProvisionedModelThroughputCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListCustomModelsCommand: (
  input: ListCustomModelsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListEvaluationJobsCommand: (
  input: ListEvaluationJobsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListFoundationModelsCommand: (
  input: ListFoundationModelsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListGuardrailsCommand: (
  input: ListGuardrailsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListImportedModelsCommand: (
  input: ListImportedModelsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListInferenceProfilesCommand: (
  input: ListInferenceProfilesCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListMarketplaceModelEndpointsCommand: (
  input: ListMarketplaceModelEndpointsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListModelCopyJobsCommand: (
  input: ListModelCopyJobsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListModelCustomizationJobsCommand: (
  input: ListModelCustomizationJobsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListModelImportJobsCommand: (
  input: ListModelImportJobsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListModelInvocationJobsCommand: (
  input: ListModelInvocationJobsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListPromptRoutersCommand: (
  input: ListPromptRoutersCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListProvisionedModelThroughputsCommand: (
  input: ListProvisionedModelThroughputsCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_ListTagsForResourceCommand: (
  input: ListTagsForResourceCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_PutModelInvocationLoggingConfigurationCommand: (
  input: PutModelInvocationLoggingConfigurationCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_RegisterMarketplaceModelEndpointCommand: (
  input: RegisterMarketplaceModelEndpointCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_StopEvaluationJobCommand: (
  input: StopEvaluationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_StopModelCustomizationJobCommand: (
  input: StopModelCustomizationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_StopModelInvocationJobCommand: (
  input: StopModelInvocationJobCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_TagResourceCommand: (
  input: TagResourceCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_UntagResourceCommand: (
  input: UntagResourceCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_UpdateGuardrailCommand: (
  input: UpdateGuardrailCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_UpdateMarketplaceModelEndpointCommand: (
  input: UpdateMarketplaceModelEndpointCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const se_UpdateProvisionedModelThroughputCommand: (
  input: UpdateProvisionedModelThroughputCommandInput,
  context: __SerdeContext
) => Promise<__HttpRequest>;
export declare const de_BatchDeleteEvaluationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<BatchDeleteEvaluationJobCommandOutput>;
export declare const de_CreateEvaluationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateEvaluationJobCommandOutput>;
export declare const de_CreateGuardrailCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateGuardrailCommandOutput>;
export declare const de_CreateGuardrailVersionCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateGuardrailVersionCommandOutput>;
export declare const de_CreateInferenceProfileCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateInferenceProfileCommandOutput>;
export declare const de_CreateMarketplaceModelEndpointCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateMarketplaceModelEndpointCommandOutput>;
export declare const de_CreateModelCopyJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateModelCopyJobCommandOutput>;
export declare const de_CreateModelCustomizationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateModelCustomizationJobCommandOutput>;
export declare const de_CreateModelImportJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateModelImportJobCommandOutput>;
export declare const de_CreateModelInvocationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateModelInvocationJobCommandOutput>;
export declare const de_CreatePromptRouterCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreatePromptRouterCommandOutput>;
export declare const de_CreateProvisionedModelThroughputCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<CreateProvisionedModelThroughputCommandOutput>;
export declare const de_DeleteCustomModelCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<DeleteCustomModelCommandOutput>;
export declare const de_DeleteGuardrailCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<DeleteGuardrailCommandOutput>;
export declare const de_DeleteImportedModelCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<DeleteImportedModelCommandOutput>;
export declare const de_DeleteInferenceProfileCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<DeleteInferenceProfileCommandOutput>;
export declare const de_DeleteMarketplaceModelEndpointCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<DeleteMarketplaceModelEndpointCommandOutput>;
export declare const de_DeleteModelInvocationLoggingConfigurationCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<DeleteModelInvocationLoggingConfigurationCommandOutput>;
export declare const de_DeletePromptRouterCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<DeletePromptRouterCommandOutput>;
export declare const de_DeleteProvisionedModelThroughputCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<DeleteProvisionedModelThroughputCommandOutput>;
export declare const de_DeregisterMarketplaceModelEndpointCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<DeregisterMarketplaceModelEndpointCommandOutput>;
export declare const de_GetCustomModelCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetCustomModelCommandOutput>;
export declare const de_GetEvaluationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetEvaluationJobCommandOutput>;
export declare const de_GetFoundationModelCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetFoundationModelCommandOutput>;
export declare const de_GetGuardrailCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetGuardrailCommandOutput>;
export declare const de_GetImportedModelCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetImportedModelCommandOutput>;
export declare const de_GetInferenceProfileCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetInferenceProfileCommandOutput>;
export declare const de_GetMarketplaceModelEndpointCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetMarketplaceModelEndpointCommandOutput>;
export declare const de_GetModelCopyJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetModelCopyJobCommandOutput>;
export declare const de_GetModelCustomizationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetModelCustomizationJobCommandOutput>;
export declare const de_GetModelImportJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetModelImportJobCommandOutput>;
export declare const de_GetModelInvocationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetModelInvocationJobCommandOutput>;
export declare const de_GetModelInvocationLoggingConfigurationCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetModelInvocationLoggingConfigurationCommandOutput>;
export declare const de_GetPromptRouterCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetPromptRouterCommandOutput>;
export declare const de_GetProvisionedModelThroughputCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<GetProvisionedModelThroughputCommandOutput>;
export declare const de_ListCustomModelsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListCustomModelsCommandOutput>;
export declare const de_ListEvaluationJobsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListEvaluationJobsCommandOutput>;
export declare const de_ListFoundationModelsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListFoundationModelsCommandOutput>;
export declare const de_ListGuardrailsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListGuardrailsCommandOutput>;
export declare const de_ListImportedModelsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListImportedModelsCommandOutput>;
export declare const de_ListInferenceProfilesCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListInferenceProfilesCommandOutput>;
export declare const de_ListMarketplaceModelEndpointsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListMarketplaceModelEndpointsCommandOutput>;
export declare const de_ListModelCopyJobsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListModelCopyJobsCommandOutput>;
export declare const de_ListModelCustomizationJobsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListModelCustomizationJobsCommandOutput>;
export declare const de_ListModelImportJobsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListModelImportJobsCommandOutput>;
export declare const de_ListModelInvocationJobsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListModelInvocationJobsCommandOutput>;
export declare const de_ListPromptRoutersCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListPromptRoutersCommandOutput>;
export declare const de_ListProvisionedModelThroughputsCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListProvisionedModelThroughputsCommandOutput>;
export declare const de_ListTagsForResourceCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<ListTagsForResourceCommandOutput>;
export declare const de_PutModelInvocationLoggingConfigurationCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<PutModelInvocationLoggingConfigurationCommandOutput>;
export declare const de_RegisterMarketplaceModelEndpointCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<RegisterMarketplaceModelEndpointCommandOutput>;
export declare const de_StopEvaluationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<StopEvaluationJobCommandOutput>;
export declare const de_StopModelCustomizationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<StopModelCustomizationJobCommandOutput>;
export declare const de_StopModelInvocationJobCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<StopModelInvocationJobCommandOutput>;
export declare const de_TagResourceCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<TagResourceCommandOutput>;
export declare const de_UntagResourceCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<UntagResourceCommandOutput>;
export declare const de_UpdateGuardrailCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<UpdateGuardrailCommandOutput>;
export declare const de_UpdateMarketplaceModelEndpointCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<UpdateMarketplaceModelEndpointCommandOutput>;
export declare const de_UpdateProvisionedModelThroughputCommand: (
  output: __HttpResponse,
  context: __SerdeContext
) => Promise<UpdateProvisionedModelThroughputCommandOutput>;
