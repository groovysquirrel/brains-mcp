import { HttpRequest as __HttpRequest, HttpResponse as __HttpResponse } from "@smithy/protocol-http";
import { SerdeContext as __SerdeContext } from "@smithy/types";
import { BatchDeleteEvaluationJobCommandInput, BatchDeleteEvaluationJobCommandOutput } from "../commands/BatchDeleteEvaluationJobCommand";
import { CreateEvaluationJobCommandInput, CreateEvaluationJobCommandOutput } from "../commands/CreateEvaluationJobCommand";
import { CreateGuardrailCommandInput, CreateGuardrailCommandOutput } from "../commands/CreateGuardrailCommand";
import { CreateGuardrailVersionCommandInput, CreateGuardrailVersionCommandOutput } from "../commands/CreateGuardrailVersionCommand";
import { CreateInferenceProfileCommandInput, CreateInferenceProfileCommandOutput } from "../commands/CreateInferenceProfileCommand";
import { CreateMarketplaceModelEndpointCommandInput, CreateMarketplaceModelEndpointCommandOutput } from "../commands/CreateMarketplaceModelEndpointCommand";
import { CreateModelCopyJobCommandInput, CreateModelCopyJobCommandOutput } from "../commands/CreateModelCopyJobCommand";
import { CreateModelCustomizationJobCommandInput, CreateModelCustomizationJobCommandOutput } from "../commands/CreateModelCustomizationJobCommand";
import { CreateModelImportJobCommandInput, CreateModelImportJobCommandOutput } from "../commands/CreateModelImportJobCommand";
import { CreateModelInvocationJobCommandInput, CreateModelInvocationJobCommandOutput } from "../commands/CreateModelInvocationJobCommand";
import { CreatePromptRouterCommandInput, CreatePromptRouterCommandOutput } from "../commands/CreatePromptRouterCommand";
import { CreateProvisionedModelThroughputCommandInput, CreateProvisionedModelThroughputCommandOutput } from "../commands/CreateProvisionedModelThroughputCommand";
import { DeleteCustomModelCommandInput, DeleteCustomModelCommandOutput } from "../commands/DeleteCustomModelCommand";
import { DeleteGuardrailCommandInput, DeleteGuardrailCommandOutput } from "../commands/DeleteGuardrailCommand";
import { DeleteImportedModelCommandInput, DeleteImportedModelCommandOutput } from "../commands/DeleteImportedModelCommand";
import { DeleteInferenceProfileCommandInput, DeleteInferenceProfileCommandOutput } from "../commands/DeleteInferenceProfileCommand";
import { DeleteMarketplaceModelEndpointCommandInput, DeleteMarketplaceModelEndpointCommandOutput } from "../commands/DeleteMarketplaceModelEndpointCommand";
import { DeleteModelInvocationLoggingConfigurationCommandInput, DeleteModelInvocationLoggingConfigurationCommandOutput } from "../commands/DeleteModelInvocationLoggingConfigurationCommand";
import { DeletePromptRouterCommandInput, DeletePromptRouterCommandOutput } from "../commands/DeletePromptRouterCommand";
import { DeleteProvisionedModelThroughputCommandInput, DeleteProvisionedModelThroughputCommandOutput } from "../commands/DeleteProvisionedModelThroughputCommand";
import { DeregisterMarketplaceModelEndpointCommandInput, DeregisterMarketplaceModelEndpointCommandOutput } from "../commands/DeregisterMarketplaceModelEndpointCommand";
import { GetCustomModelCommandInput, GetCustomModelCommandOutput } from "../commands/GetCustomModelCommand";
import { GetEvaluationJobCommandInput, GetEvaluationJobCommandOutput } from "../commands/GetEvaluationJobCommand";
import { GetFoundationModelCommandInput, GetFoundationModelCommandOutput } from "../commands/GetFoundationModelCommand";
import { GetGuardrailCommandInput, GetGuardrailCommandOutput } from "../commands/GetGuardrailCommand";
import { GetImportedModelCommandInput, GetImportedModelCommandOutput } from "../commands/GetImportedModelCommand";
import { GetInferenceProfileCommandInput, GetInferenceProfileCommandOutput } from "../commands/GetInferenceProfileCommand";
import { GetMarketplaceModelEndpointCommandInput, GetMarketplaceModelEndpointCommandOutput } from "../commands/GetMarketplaceModelEndpointCommand";
import { GetModelCopyJobCommandInput, GetModelCopyJobCommandOutput } from "../commands/GetModelCopyJobCommand";
import { GetModelCustomizationJobCommandInput, GetModelCustomizationJobCommandOutput } from "../commands/GetModelCustomizationJobCommand";
import { GetModelImportJobCommandInput, GetModelImportJobCommandOutput } from "../commands/GetModelImportJobCommand";
import { GetModelInvocationJobCommandInput, GetModelInvocationJobCommandOutput } from "../commands/GetModelInvocationJobCommand";
import { GetModelInvocationLoggingConfigurationCommandInput, GetModelInvocationLoggingConfigurationCommandOutput } from "../commands/GetModelInvocationLoggingConfigurationCommand";
import { GetPromptRouterCommandInput, GetPromptRouterCommandOutput } from "../commands/GetPromptRouterCommand";
import { GetProvisionedModelThroughputCommandInput, GetProvisionedModelThroughputCommandOutput } from "../commands/GetProvisionedModelThroughputCommand";
import { ListCustomModelsCommandInput, ListCustomModelsCommandOutput } from "../commands/ListCustomModelsCommand";
import { ListEvaluationJobsCommandInput, ListEvaluationJobsCommandOutput } from "../commands/ListEvaluationJobsCommand";
import { ListFoundationModelsCommandInput, ListFoundationModelsCommandOutput } from "../commands/ListFoundationModelsCommand";
import { ListGuardrailsCommandInput, ListGuardrailsCommandOutput } from "../commands/ListGuardrailsCommand";
import { ListImportedModelsCommandInput, ListImportedModelsCommandOutput } from "../commands/ListImportedModelsCommand";
import { ListInferenceProfilesCommandInput, ListInferenceProfilesCommandOutput } from "../commands/ListInferenceProfilesCommand";
import { ListMarketplaceModelEndpointsCommandInput, ListMarketplaceModelEndpointsCommandOutput } from "../commands/ListMarketplaceModelEndpointsCommand";
import { ListModelCopyJobsCommandInput, ListModelCopyJobsCommandOutput } from "../commands/ListModelCopyJobsCommand";
import { ListModelCustomizationJobsCommandInput, ListModelCustomizationJobsCommandOutput } from "../commands/ListModelCustomizationJobsCommand";
import { ListModelImportJobsCommandInput, ListModelImportJobsCommandOutput } from "../commands/ListModelImportJobsCommand";
import { ListModelInvocationJobsCommandInput, ListModelInvocationJobsCommandOutput } from "../commands/ListModelInvocationJobsCommand";
import { ListPromptRoutersCommandInput, ListPromptRoutersCommandOutput } from "../commands/ListPromptRoutersCommand";
import { ListProvisionedModelThroughputsCommandInput, ListProvisionedModelThroughputsCommandOutput } from "../commands/ListProvisionedModelThroughputsCommand";
import { ListTagsForResourceCommandInput, ListTagsForResourceCommandOutput } from "../commands/ListTagsForResourceCommand";
import { PutModelInvocationLoggingConfigurationCommandInput, PutModelInvocationLoggingConfigurationCommandOutput } from "../commands/PutModelInvocationLoggingConfigurationCommand";
import { RegisterMarketplaceModelEndpointCommandInput, RegisterMarketplaceModelEndpointCommandOutput } from "../commands/RegisterMarketplaceModelEndpointCommand";
import { StopEvaluationJobCommandInput, StopEvaluationJobCommandOutput } from "../commands/StopEvaluationJobCommand";
import { StopModelCustomizationJobCommandInput, StopModelCustomizationJobCommandOutput } from "../commands/StopModelCustomizationJobCommand";
import { StopModelInvocationJobCommandInput, StopModelInvocationJobCommandOutput } from "../commands/StopModelInvocationJobCommand";
import { TagResourceCommandInput, TagResourceCommandOutput } from "../commands/TagResourceCommand";
import { UntagResourceCommandInput, UntagResourceCommandOutput } from "../commands/UntagResourceCommand";
import { UpdateGuardrailCommandInput, UpdateGuardrailCommandOutput } from "../commands/UpdateGuardrailCommand";
import { UpdateMarketplaceModelEndpointCommandInput, UpdateMarketplaceModelEndpointCommandOutput } from "../commands/UpdateMarketplaceModelEndpointCommand";
import { UpdateProvisionedModelThroughputCommandInput, UpdateProvisionedModelThroughputCommandOutput } from "../commands/UpdateProvisionedModelThroughputCommand";
/**
 * serializeAws_restJson1BatchDeleteEvaluationJobCommand
 */
export declare const se_BatchDeleteEvaluationJobCommand: (input: BatchDeleteEvaluationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateEvaluationJobCommand
 */
export declare const se_CreateEvaluationJobCommand: (input: CreateEvaluationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateGuardrailCommand
 */
export declare const se_CreateGuardrailCommand: (input: CreateGuardrailCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateGuardrailVersionCommand
 */
export declare const se_CreateGuardrailVersionCommand: (input: CreateGuardrailVersionCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateInferenceProfileCommand
 */
export declare const se_CreateInferenceProfileCommand: (input: CreateInferenceProfileCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateMarketplaceModelEndpointCommand
 */
export declare const se_CreateMarketplaceModelEndpointCommand: (input: CreateMarketplaceModelEndpointCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateModelCopyJobCommand
 */
export declare const se_CreateModelCopyJobCommand: (input: CreateModelCopyJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateModelCustomizationJobCommand
 */
export declare const se_CreateModelCustomizationJobCommand: (input: CreateModelCustomizationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateModelImportJobCommand
 */
export declare const se_CreateModelImportJobCommand: (input: CreateModelImportJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateModelInvocationJobCommand
 */
export declare const se_CreateModelInvocationJobCommand: (input: CreateModelInvocationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreatePromptRouterCommand
 */
export declare const se_CreatePromptRouterCommand: (input: CreatePromptRouterCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1CreateProvisionedModelThroughputCommand
 */
export declare const se_CreateProvisionedModelThroughputCommand: (input: CreateProvisionedModelThroughputCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1DeleteCustomModelCommand
 */
export declare const se_DeleteCustomModelCommand: (input: DeleteCustomModelCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1DeleteGuardrailCommand
 */
export declare const se_DeleteGuardrailCommand: (input: DeleteGuardrailCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1DeleteImportedModelCommand
 */
export declare const se_DeleteImportedModelCommand: (input: DeleteImportedModelCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1DeleteInferenceProfileCommand
 */
export declare const se_DeleteInferenceProfileCommand: (input: DeleteInferenceProfileCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1DeleteMarketplaceModelEndpointCommand
 */
export declare const se_DeleteMarketplaceModelEndpointCommand: (input: DeleteMarketplaceModelEndpointCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1DeleteModelInvocationLoggingConfigurationCommand
 */
export declare const se_DeleteModelInvocationLoggingConfigurationCommand: (input: DeleteModelInvocationLoggingConfigurationCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1DeletePromptRouterCommand
 */
export declare const se_DeletePromptRouterCommand: (input: DeletePromptRouterCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1DeleteProvisionedModelThroughputCommand
 */
export declare const se_DeleteProvisionedModelThroughputCommand: (input: DeleteProvisionedModelThroughputCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1DeregisterMarketplaceModelEndpointCommand
 */
export declare const se_DeregisterMarketplaceModelEndpointCommand: (input: DeregisterMarketplaceModelEndpointCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetCustomModelCommand
 */
export declare const se_GetCustomModelCommand: (input: GetCustomModelCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetEvaluationJobCommand
 */
export declare const se_GetEvaluationJobCommand: (input: GetEvaluationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetFoundationModelCommand
 */
export declare const se_GetFoundationModelCommand: (input: GetFoundationModelCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetGuardrailCommand
 */
export declare const se_GetGuardrailCommand: (input: GetGuardrailCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetImportedModelCommand
 */
export declare const se_GetImportedModelCommand: (input: GetImportedModelCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetInferenceProfileCommand
 */
export declare const se_GetInferenceProfileCommand: (input: GetInferenceProfileCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetMarketplaceModelEndpointCommand
 */
export declare const se_GetMarketplaceModelEndpointCommand: (input: GetMarketplaceModelEndpointCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetModelCopyJobCommand
 */
export declare const se_GetModelCopyJobCommand: (input: GetModelCopyJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetModelCustomizationJobCommand
 */
export declare const se_GetModelCustomizationJobCommand: (input: GetModelCustomizationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetModelImportJobCommand
 */
export declare const se_GetModelImportJobCommand: (input: GetModelImportJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetModelInvocationJobCommand
 */
export declare const se_GetModelInvocationJobCommand: (input: GetModelInvocationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetModelInvocationLoggingConfigurationCommand
 */
export declare const se_GetModelInvocationLoggingConfigurationCommand: (input: GetModelInvocationLoggingConfigurationCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetPromptRouterCommand
 */
export declare const se_GetPromptRouterCommand: (input: GetPromptRouterCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1GetProvisionedModelThroughputCommand
 */
export declare const se_GetProvisionedModelThroughputCommand: (input: GetProvisionedModelThroughputCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListCustomModelsCommand
 */
export declare const se_ListCustomModelsCommand: (input: ListCustomModelsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListEvaluationJobsCommand
 */
export declare const se_ListEvaluationJobsCommand: (input: ListEvaluationJobsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListFoundationModelsCommand
 */
export declare const se_ListFoundationModelsCommand: (input: ListFoundationModelsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListGuardrailsCommand
 */
export declare const se_ListGuardrailsCommand: (input: ListGuardrailsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListImportedModelsCommand
 */
export declare const se_ListImportedModelsCommand: (input: ListImportedModelsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListInferenceProfilesCommand
 */
export declare const se_ListInferenceProfilesCommand: (input: ListInferenceProfilesCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListMarketplaceModelEndpointsCommand
 */
export declare const se_ListMarketplaceModelEndpointsCommand: (input: ListMarketplaceModelEndpointsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListModelCopyJobsCommand
 */
export declare const se_ListModelCopyJobsCommand: (input: ListModelCopyJobsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListModelCustomizationJobsCommand
 */
export declare const se_ListModelCustomizationJobsCommand: (input: ListModelCustomizationJobsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListModelImportJobsCommand
 */
export declare const se_ListModelImportJobsCommand: (input: ListModelImportJobsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListModelInvocationJobsCommand
 */
export declare const se_ListModelInvocationJobsCommand: (input: ListModelInvocationJobsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListPromptRoutersCommand
 */
export declare const se_ListPromptRoutersCommand: (input: ListPromptRoutersCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListProvisionedModelThroughputsCommand
 */
export declare const se_ListProvisionedModelThroughputsCommand: (input: ListProvisionedModelThroughputsCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1ListTagsForResourceCommand
 */
export declare const se_ListTagsForResourceCommand: (input: ListTagsForResourceCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1PutModelInvocationLoggingConfigurationCommand
 */
export declare const se_PutModelInvocationLoggingConfigurationCommand: (input: PutModelInvocationLoggingConfigurationCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1RegisterMarketplaceModelEndpointCommand
 */
export declare const se_RegisterMarketplaceModelEndpointCommand: (input: RegisterMarketplaceModelEndpointCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1StopEvaluationJobCommand
 */
export declare const se_StopEvaluationJobCommand: (input: StopEvaluationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1StopModelCustomizationJobCommand
 */
export declare const se_StopModelCustomizationJobCommand: (input: StopModelCustomizationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1StopModelInvocationJobCommand
 */
export declare const se_StopModelInvocationJobCommand: (input: StopModelInvocationJobCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1TagResourceCommand
 */
export declare const se_TagResourceCommand: (input: TagResourceCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1UntagResourceCommand
 */
export declare const se_UntagResourceCommand: (input: UntagResourceCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1UpdateGuardrailCommand
 */
export declare const se_UpdateGuardrailCommand: (input: UpdateGuardrailCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1UpdateMarketplaceModelEndpointCommand
 */
export declare const se_UpdateMarketplaceModelEndpointCommand: (input: UpdateMarketplaceModelEndpointCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * serializeAws_restJson1UpdateProvisionedModelThroughputCommand
 */
export declare const se_UpdateProvisionedModelThroughputCommand: (input: UpdateProvisionedModelThroughputCommandInput, context: __SerdeContext) => Promise<__HttpRequest>;
/**
 * deserializeAws_restJson1BatchDeleteEvaluationJobCommand
 */
export declare const de_BatchDeleteEvaluationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<BatchDeleteEvaluationJobCommandOutput>;
/**
 * deserializeAws_restJson1CreateEvaluationJobCommand
 */
export declare const de_CreateEvaluationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateEvaluationJobCommandOutput>;
/**
 * deserializeAws_restJson1CreateGuardrailCommand
 */
export declare const de_CreateGuardrailCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateGuardrailCommandOutput>;
/**
 * deserializeAws_restJson1CreateGuardrailVersionCommand
 */
export declare const de_CreateGuardrailVersionCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateGuardrailVersionCommandOutput>;
/**
 * deserializeAws_restJson1CreateInferenceProfileCommand
 */
export declare const de_CreateInferenceProfileCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateInferenceProfileCommandOutput>;
/**
 * deserializeAws_restJson1CreateMarketplaceModelEndpointCommand
 */
export declare const de_CreateMarketplaceModelEndpointCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateMarketplaceModelEndpointCommandOutput>;
/**
 * deserializeAws_restJson1CreateModelCopyJobCommand
 */
export declare const de_CreateModelCopyJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateModelCopyJobCommandOutput>;
/**
 * deserializeAws_restJson1CreateModelCustomizationJobCommand
 */
export declare const de_CreateModelCustomizationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateModelCustomizationJobCommandOutput>;
/**
 * deserializeAws_restJson1CreateModelImportJobCommand
 */
export declare const de_CreateModelImportJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateModelImportJobCommandOutput>;
/**
 * deserializeAws_restJson1CreateModelInvocationJobCommand
 */
export declare const de_CreateModelInvocationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateModelInvocationJobCommandOutput>;
/**
 * deserializeAws_restJson1CreatePromptRouterCommand
 */
export declare const de_CreatePromptRouterCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreatePromptRouterCommandOutput>;
/**
 * deserializeAws_restJson1CreateProvisionedModelThroughputCommand
 */
export declare const de_CreateProvisionedModelThroughputCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<CreateProvisionedModelThroughputCommandOutput>;
/**
 * deserializeAws_restJson1DeleteCustomModelCommand
 */
export declare const de_DeleteCustomModelCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<DeleteCustomModelCommandOutput>;
/**
 * deserializeAws_restJson1DeleteGuardrailCommand
 */
export declare const de_DeleteGuardrailCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<DeleteGuardrailCommandOutput>;
/**
 * deserializeAws_restJson1DeleteImportedModelCommand
 */
export declare const de_DeleteImportedModelCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<DeleteImportedModelCommandOutput>;
/**
 * deserializeAws_restJson1DeleteInferenceProfileCommand
 */
export declare const de_DeleteInferenceProfileCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<DeleteInferenceProfileCommandOutput>;
/**
 * deserializeAws_restJson1DeleteMarketplaceModelEndpointCommand
 */
export declare const de_DeleteMarketplaceModelEndpointCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<DeleteMarketplaceModelEndpointCommandOutput>;
/**
 * deserializeAws_restJson1DeleteModelInvocationLoggingConfigurationCommand
 */
export declare const de_DeleteModelInvocationLoggingConfigurationCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<DeleteModelInvocationLoggingConfigurationCommandOutput>;
/**
 * deserializeAws_restJson1DeletePromptRouterCommand
 */
export declare const de_DeletePromptRouterCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<DeletePromptRouterCommandOutput>;
/**
 * deserializeAws_restJson1DeleteProvisionedModelThroughputCommand
 */
export declare const de_DeleteProvisionedModelThroughputCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<DeleteProvisionedModelThroughputCommandOutput>;
/**
 * deserializeAws_restJson1DeregisterMarketplaceModelEndpointCommand
 */
export declare const de_DeregisterMarketplaceModelEndpointCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<DeregisterMarketplaceModelEndpointCommandOutput>;
/**
 * deserializeAws_restJson1GetCustomModelCommand
 */
export declare const de_GetCustomModelCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetCustomModelCommandOutput>;
/**
 * deserializeAws_restJson1GetEvaluationJobCommand
 */
export declare const de_GetEvaluationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetEvaluationJobCommandOutput>;
/**
 * deserializeAws_restJson1GetFoundationModelCommand
 */
export declare const de_GetFoundationModelCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetFoundationModelCommandOutput>;
/**
 * deserializeAws_restJson1GetGuardrailCommand
 */
export declare const de_GetGuardrailCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetGuardrailCommandOutput>;
/**
 * deserializeAws_restJson1GetImportedModelCommand
 */
export declare const de_GetImportedModelCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetImportedModelCommandOutput>;
/**
 * deserializeAws_restJson1GetInferenceProfileCommand
 */
export declare const de_GetInferenceProfileCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetInferenceProfileCommandOutput>;
/**
 * deserializeAws_restJson1GetMarketplaceModelEndpointCommand
 */
export declare const de_GetMarketplaceModelEndpointCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetMarketplaceModelEndpointCommandOutput>;
/**
 * deserializeAws_restJson1GetModelCopyJobCommand
 */
export declare const de_GetModelCopyJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetModelCopyJobCommandOutput>;
/**
 * deserializeAws_restJson1GetModelCustomizationJobCommand
 */
export declare const de_GetModelCustomizationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetModelCustomizationJobCommandOutput>;
/**
 * deserializeAws_restJson1GetModelImportJobCommand
 */
export declare const de_GetModelImportJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetModelImportJobCommandOutput>;
/**
 * deserializeAws_restJson1GetModelInvocationJobCommand
 */
export declare const de_GetModelInvocationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetModelInvocationJobCommandOutput>;
/**
 * deserializeAws_restJson1GetModelInvocationLoggingConfigurationCommand
 */
export declare const de_GetModelInvocationLoggingConfigurationCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetModelInvocationLoggingConfigurationCommandOutput>;
/**
 * deserializeAws_restJson1GetPromptRouterCommand
 */
export declare const de_GetPromptRouterCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetPromptRouterCommandOutput>;
/**
 * deserializeAws_restJson1GetProvisionedModelThroughputCommand
 */
export declare const de_GetProvisionedModelThroughputCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<GetProvisionedModelThroughputCommandOutput>;
/**
 * deserializeAws_restJson1ListCustomModelsCommand
 */
export declare const de_ListCustomModelsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListCustomModelsCommandOutput>;
/**
 * deserializeAws_restJson1ListEvaluationJobsCommand
 */
export declare const de_ListEvaluationJobsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListEvaluationJobsCommandOutput>;
/**
 * deserializeAws_restJson1ListFoundationModelsCommand
 */
export declare const de_ListFoundationModelsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListFoundationModelsCommandOutput>;
/**
 * deserializeAws_restJson1ListGuardrailsCommand
 */
export declare const de_ListGuardrailsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListGuardrailsCommandOutput>;
/**
 * deserializeAws_restJson1ListImportedModelsCommand
 */
export declare const de_ListImportedModelsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListImportedModelsCommandOutput>;
/**
 * deserializeAws_restJson1ListInferenceProfilesCommand
 */
export declare const de_ListInferenceProfilesCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListInferenceProfilesCommandOutput>;
/**
 * deserializeAws_restJson1ListMarketplaceModelEndpointsCommand
 */
export declare const de_ListMarketplaceModelEndpointsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListMarketplaceModelEndpointsCommandOutput>;
/**
 * deserializeAws_restJson1ListModelCopyJobsCommand
 */
export declare const de_ListModelCopyJobsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListModelCopyJobsCommandOutput>;
/**
 * deserializeAws_restJson1ListModelCustomizationJobsCommand
 */
export declare const de_ListModelCustomizationJobsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListModelCustomizationJobsCommandOutput>;
/**
 * deserializeAws_restJson1ListModelImportJobsCommand
 */
export declare const de_ListModelImportJobsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListModelImportJobsCommandOutput>;
/**
 * deserializeAws_restJson1ListModelInvocationJobsCommand
 */
export declare const de_ListModelInvocationJobsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListModelInvocationJobsCommandOutput>;
/**
 * deserializeAws_restJson1ListPromptRoutersCommand
 */
export declare const de_ListPromptRoutersCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListPromptRoutersCommandOutput>;
/**
 * deserializeAws_restJson1ListProvisionedModelThroughputsCommand
 */
export declare const de_ListProvisionedModelThroughputsCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListProvisionedModelThroughputsCommandOutput>;
/**
 * deserializeAws_restJson1ListTagsForResourceCommand
 */
export declare const de_ListTagsForResourceCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<ListTagsForResourceCommandOutput>;
/**
 * deserializeAws_restJson1PutModelInvocationLoggingConfigurationCommand
 */
export declare const de_PutModelInvocationLoggingConfigurationCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<PutModelInvocationLoggingConfigurationCommandOutput>;
/**
 * deserializeAws_restJson1RegisterMarketplaceModelEndpointCommand
 */
export declare const de_RegisterMarketplaceModelEndpointCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<RegisterMarketplaceModelEndpointCommandOutput>;
/**
 * deserializeAws_restJson1StopEvaluationJobCommand
 */
export declare const de_StopEvaluationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<StopEvaluationJobCommandOutput>;
/**
 * deserializeAws_restJson1StopModelCustomizationJobCommand
 */
export declare const de_StopModelCustomizationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<StopModelCustomizationJobCommandOutput>;
/**
 * deserializeAws_restJson1StopModelInvocationJobCommand
 */
export declare const de_StopModelInvocationJobCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<StopModelInvocationJobCommandOutput>;
/**
 * deserializeAws_restJson1TagResourceCommand
 */
export declare const de_TagResourceCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<TagResourceCommandOutput>;
/**
 * deserializeAws_restJson1UntagResourceCommand
 */
export declare const de_UntagResourceCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<UntagResourceCommandOutput>;
/**
 * deserializeAws_restJson1UpdateGuardrailCommand
 */
export declare const de_UpdateGuardrailCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<UpdateGuardrailCommandOutput>;
/**
 * deserializeAws_restJson1UpdateMarketplaceModelEndpointCommand
 */
export declare const de_UpdateMarketplaceModelEndpointCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<UpdateMarketplaceModelEndpointCommandOutput>;
/**
 * deserializeAws_restJson1UpdateProvisionedModelThroughputCommand
 */
export declare const de_UpdateProvisionedModelThroughputCommand: (output: __HttpResponse, context: __SerdeContext) => Promise<UpdateProvisionedModelThroughputCommandOutput>;
