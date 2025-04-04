import {
  HostHeaderInputConfig,
  HostHeaderResolvedConfig,
} from "@aws-sdk/middleware-host-header";
import {
  UserAgentInputConfig,
  UserAgentResolvedConfig,
} from "@aws-sdk/middleware-user-agent";
import {
  RegionInputConfig,
  RegionResolvedConfig,
} from "@smithy/config-resolver";
import {
  EndpointInputConfig,
  EndpointResolvedConfig,
} from "@smithy/middleware-endpoint";
import {
  RetryInputConfig,
  RetryResolvedConfig,
} from "@smithy/middleware-retry";
import { HttpHandlerUserInput as __HttpHandlerUserInput } from "@smithy/protocol-http";
import {
  Client as __Client,
  DefaultsMode as __DefaultsMode,
  SmithyConfiguration as __SmithyConfiguration,
  SmithyResolvedConfiguration as __SmithyResolvedConfiguration,
} from "@smithy/smithy-client";
import {
  AwsCredentialIdentityProvider,
  BodyLengthCalculator as __BodyLengthCalculator,
  CheckOptionalClientConfig as __CheckOptionalClientConfig,
  ChecksumConstructor as __ChecksumConstructor,
  Decoder as __Decoder,
  Encoder as __Encoder,
  HashConstructor as __HashConstructor,
  HttpHandlerOptions as __HttpHandlerOptions,
  Logger as __Logger,
  Provider as __Provider,
  Provider,
  StreamCollector as __StreamCollector,
  UrlParser as __UrlParser,
  UserAgent as __UserAgent,
} from "@smithy/types";
import {
  HttpAuthSchemeInputConfig,
  HttpAuthSchemeResolvedConfig,
} from "./auth/httpAuthSchemeProvider";
import {
  BatchDeleteEvaluationJobCommandInput,
  BatchDeleteEvaluationJobCommandOutput,
} from "./commands/BatchDeleteEvaluationJobCommand";
import {
  CreateEvaluationJobCommandInput,
  CreateEvaluationJobCommandOutput,
} from "./commands/CreateEvaluationJobCommand";
import {
  CreateGuardrailCommandInput,
  CreateGuardrailCommandOutput,
} from "./commands/CreateGuardrailCommand";
import {
  CreateGuardrailVersionCommandInput,
  CreateGuardrailVersionCommandOutput,
} from "./commands/CreateGuardrailVersionCommand";
import {
  CreateInferenceProfileCommandInput,
  CreateInferenceProfileCommandOutput,
} from "./commands/CreateInferenceProfileCommand";
import {
  CreateMarketplaceModelEndpointCommandInput,
  CreateMarketplaceModelEndpointCommandOutput,
} from "./commands/CreateMarketplaceModelEndpointCommand";
import {
  CreateModelCopyJobCommandInput,
  CreateModelCopyJobCommandOutput,
} from "./commands/CreateModelCopyJobCommand";
import {
  CreateModelCustomizationJobCommandInput,
  CreateModelCustomizationJobCommandOutput,
} from "./commands/CreateModelCustomizationJobCommand";
import {
  CreateModelImportJobCommandInput,
  CreateModelImportJobCommandOutput,
} from "./commands/CreateModelImportJobCommand";
import {
  CreateModelInvocationJobCommandInput,
  CreateModelInvocationJobCommandOutput,
} from "./commands/CreateModelInvocationJobCommand";
import {
  CreatePromptRouterCommandInput,
  CreatePromptRouterCommandOutput,
} from "./commands/CreatePromptRouterCommand";
import {
  CreateProvisionedModelThroughputCommandInput,
  CreateProvisionedModelThroughputCommandOutput,
} from "./commands/CreateProvisionedModelThroughputCommand";
import {
  DeleteCustomModelCommandInput,
  DeleteCustomModelCommandOutput,
} from "./commands/DeleteCustomModelCommand";
import {
  DeleteGuardrailCommandInput,
  DeleteGuardrailCommandOutput,
} from "./commands/DeleteGuardrailCommand";
import {
  DeleteImportedModelCommandInput,
  DeleteImportedModelCommandOutput,
} from "./commands/DeleteImportedModelCommand";
import {
  DeleteInferenceProfileCommandInput,
  DeleteInferenceProfileCommandOutput,
} from "./commands/DeleteInferenceProfileCommand";
import {
  DeleteMarketplaceModelEndpointCommandInput,
  DeleteMarketplaceModelEndpointCommandOutput,
} from "./commands/DeleteMarketplaceModelEndpointCommand";
import {
  DeleteModelInvocationLoggingConfigurationCommandInput,
  DeleteModelInvocationLoggingConfigurationCommandOutput,
} from "./commands/DeleteModelInvocationLoggingConfigurationCommand";
import {
  DeletePromptRouterCommandInput,
  DeletePromptRouterCommandOutput,
} from "./commands/DeletePromptRouterCommand";
import {
  DeleteProvisionedModelThroughputCommandInput,
  DeleteProvisionedModelThroughputCommandOutput,
} from "./commands/DeleteProvisionedModelThroughputCommand";
import {
  DeregisterMarketplaceModelEndpointCommandInput,
  DeregisterMarketplaceModelEndpointCommandOutput,
} from "./commands/DeregisterMarketplaceModelEndpointCommand";
import {
  GetCustomModelCommandInput,
  GetCustomModelCommandOutput,
} from "./commands/GetCustomModelCommand";
import {
  GetEvaluationJobCommandInput,
  GetEvaluationJobCommandOutput,
} from "./commands/GetEvaluationJobCommand";
import {
  GetFoundationModelCommandInput,
  GetFoundationModelCommandOutput,
} from "./commands/GetFoundationModelCommand";
import {
  GetGuardrailCommandInput,
  GetGuardrailCommandOutput,
} from "./commands/GetGuardrailCommand";
import {
  GetImportedModelCommandInput,
  GetImportedModelCommandOutput,
} from "./commands/GetImportedModelCommand";
import {
  GetInferenceProfileCommandInput,
  GetInferenceProfileCommandOutput,
} from "./commands/GetInferenceProfileCommand";
import {
  GetMarketplaceModelEndpointCommandInput,
  GetMarketplaceModelEndpointCommandOutput,
} from "./commands/GetMarketplaceModelEndpointCommand";
import {
  GetModelCopyJobCommandInput,
  GetModelCopyJobCommandOutput,
} from "./commands/GetModelCopyJobCommand";
import {
  GetModelCustomizationJobCommandInput,
  GetModelCustomizationJobCommandOutput,
} from "./commands/GetModelCustomizationJobCommand";
import {
  GetModelImportJobCommandInput,
  GetModelImportJobCommandOutput,
} from "./commands/GetModelImportJobCommand";
import {
  GetModelInvocationJobCommandInput,
  GetModelInvocationJobCommandOutput,
} from "./commands/GetModelInvocationJobCommand";
import {
  GetModelInvocationLoggingConfigurationCommandInput,
  GetModelInvocationLoggingConfigurationCommandOutput,
} from "./commands/GetModelInvocationLoggingConfigurationCommand";
import {
  GetPromptRouterCommandInput,
  GetPromptRouterCommandOutput,
} from "./commands/GetPromptRouterCommand";
import {
  GetProvisionedModelThroughputCommandInput,
  GetProvisionedModelThroughputCommandOutput,
} from "./commands/GetProvisionedModelThroughputCommand";
import {
  ListCustomModelsCommandInput,
  ListCustomModelsCommandOutput,
} from "./commands/ListCustomModelsCommand";
import {
  ListEvaluationJobsCommandInput,
  ListEvaluationJobsCommandOutput,
} from "./commands/ListEvaluationJobsCommand";
import {
  ListFoundationModelsCommandInput,
  ListFoundationModelsCommandOutput,
} from "./commands/ListFoundationModelsCommand";
import {
  ListGuardrailsCommandInput,
  ListGuardrailsCommandOutput,
} from "./commands/ListGuardrailsCommand";
import {
  ListImportedModelsCommandInput,
  ListImportedModelsCommandOutput,
} from "./commands/ListImportedModelsCommand";
import {
  ListInferenceProfilesCommandInput,
  ListInferenceProfilesCommandOutput,
} from "./commands/ListInferenceProfilesCommand";
import {
  ListMarketplaceModelEndpointsCommandInput,
  ListMarketplaceModelEndpointsCommandOutput,
} from "./commands/ListMarketplaceModelEndpointsCommand";
import {
  ListModelCopyJobsCommandInput,
  ListModelCopyJobsCommandOutput,
} from "./commands/ListModelCopyJobsCommand";
import {
  ListModelCustomizationJobsCommandInput,
  ListModelCustomizationJobsCommandOutput,
} from "./commands/ListModelCustomizationJobsCommand";
import {
  ListModelImportJobsCommandInput,
  ListModelImportJobsCommandOutput,
} from "./commands/ListModelImportJobsCommand";
import {
  ListModelInvocationJobsCommandInput,
  ListModelInvocationJobsCommandOutput,
} from "./commands/ListModelInvocationJobsCommand";
import {
  ListPromptRoutersCommandInput,
  ListPromptRoutersCommandOutput,
} from "./commands/ListPromptRoutersCommand";
import {
  ListProvisionedModelThroughputsCommandInput,
  ListProvisionedModelThroughputsCommandOutput,
} from "./commands/ListProvisionedModelThroughputsCommand";
import {
  ListTagsForResourceCommandInput,
  ListTagsForResourceCommandOutput,
} from "./commands/ListTagsForResourceCommand";
import {
  PutModelInvocationLoggingConfigurationCommandInput,
  PutModelInvocationLoggingConfigurationCommandOutput,
} from "./commands/PutModelInvocationLoggingConfigurationCommand";
import {
  RegisterMarketplaceModelEndpointCommandInput,
  RegisterMarketplaceModelEndpointCommandOutput,
} from "./commands/RegisterMarketplaceModelEndpointCommand";
import {
  StopEvaluationJobCommandInput,
  StopEvaluationJobCommandOutput,
} from "./commands/StopEvaluationJobCommand";
import {
  StopModelCustomizationJobCommandInput,
  StopModelCustomizationJobCommandOutput,
} from "./commands/StopModelCustomizationJobCommand";
import {
  StopModelInvocationJobCommandInput,
  StopModelInvocationJobCommandOutput,
} from "./commands/StopModelInvocationJobCommand";
import {
  TagResourceCommandInput,
  TagResourceCommandOutput,
} from "./commands/TagResourceCommand";
import {
  UntagResourceCommandInput,
  UntagResourceCommandOutput,
} from "./commands/UntagResourceCommand";
import {
  UpdateGuardrailCommandInput,
  UpdateGuardrailCommandOutput,
} from "./commands/UpdateGuardrailCommand";
import {
  UpdateMarketplaceModelEndpointCommandInput,
  UpdateMarketplaceModelEndpointCommandOutput,
} from "./commands/UpdateMarketplaceModelEndpointCommand";
import {
  UpdateProvisionedModelThroughputCommandInput,
  UpdateProvisionedModelThroughputCommandOutput,
} from "./commands/UpdateProvisionedModelThroughputCommand";
import {
  ClientInputEndpointParameters,
  ClientResolvedEndpointParameters,
  EndpointParameters,
} from "./endpoint/EndpointParameters";
import { RuntimeExtension, RuntimeExtensionsConfig } from "./runtimeExtensions";
export { __Client };
export type ServiceInputTypes =
  | BatchDeleteEvaluationJobCommandInput
  | CreateEvaluationJobCommandInput
  | CreateGuardrailCommandInput
  | CreateGuardrailVersionCommandInput
  | CreateInferenceProfileCommandInput
  | CreateMarketplaceModelEndpointCommandInput
  | CreateModelCopyJobCommandInput
  | CreateModelCustomizationJobCommandInput
  | CreateModelImportJobCommandInput
  | CreateModelInvocationJobCommandInput
  | CreatePromptRouterCommandInput
  | CreateProvisionedModelThroughputCommandInput
  | DeleteCustomModelCommandInput
  | DeleteGuardrailCommandInput
  | DeleteImportedModelCommandInput
  | DeleteInferenceProfileCommandInput
  | DeleteMarketplaceModelEndpointCommandInput
  | DeleteModelInvocationLoggingConfigurationCommandInput
  | DeletePromptRouterCommandInput
  | DeleteProvisionedModelThroughputCommandInput
  | DeregisterMarketplaceModelEndpointCommandInput
  | GetCustomModelCommandInput
  | GetEvaluationJobCommandInput
  | GetFoundationModelCommandInput
  | GetGuardrailCommandInput
  | GetImportedModelCommandInput
  | GetInferenceProfileCommandInput
  | GetMarketplaceModelEndpointCommandInput
  | GetModelCopyJobCommandInput
  | GetModelCustomizationJobCommandInput
  | GetModelImportJobCommandInput
  | GetModelInvocationJobCommandInput
  | GetModelInvocationLoggingConfigurationCommandInput
  | GetPromptRouterCommandInput
  | GetProvisionedModelThroughputCommandInput
  | ListCustomModelsCommandInput
  | ListEvaluationJobsCommandInput
  | ListFoundationModelsCommandInput
  | ListGuardrailsCommandInput
  | ListImportedModelsCommandInput
  | ListInferenceProfilesCommandInput
  | ListMarketplaceModelEndpointsCommandInput
  | ListModelCopyJobsCommandInput
  | ListModelCustomizationJobsCommandInput
  | ListModelImportJobsCommandInput
  | ListModelInvocationJobsCommandInput
  | ListPromptRoutersCommandInput
  | ListProvisionedModelThroughputsCommandInput
  | ListTagsForResourceCommandInput
  | PutModelInvocationLoggingConfigurationCommandInput
  | RegisterMarketplaceModelEndpointCommandInput
  | StopEvaluationJobCommandInput
  | StopModelCustomizationJobCommandInput
  | StopModelInvocationJobCommandInput
  | TagResourceCommandInput
  | UntagResourceCommandInput
  | UpdateGuardrailCommandInput
  | UpdateMarketplaceModelEndpointCommandInput
  | UpdateProvisionedModelThroughputCommandInput;
export type ServiceOutputTypes =
  | BatchDeleteEvaluationJobCommandOutput
  | CreateEvaluationJobCommandOutput
  | CreateGuardrailCommandOutput
  | CreateGuardrailVersionCommandOutput
  | CreateInferenceProfileCommandOutput
  | CreateMarketplaceModelEndpointCommandOutput
  | CreateModelCopyJobCommandOutput
  | CreateModelCustomizationJobCommandOutput
  | CreateModelImportJobCommandOutput
  | CreateModelInvocationJobCommandOutput
  | CreatePromptRouterCommandOutput
  | CreateProvisionedModelThroughputCommandOutput
  | DeleteCustomModelCommandOutput
  | DeleteGuardrailCommandOutput
  | DeleteImportedModelCommandOutput
  | DeleteInferenceProfileCommandOutput
  | DeleteMarketplaceModelEndpointCommandOutput
  | DeleteModelInvocationLoggingConfigurationCommandOutput
  | DeletePromptRouterCommandOutput
  | DeleteProvisionedModelThroughputCommandOutput
  | DeregisterMarketplaceModelEndpointCommandOutput
  | GetCustomModelCommandOutput
  | GetEvaluationJobCommandOutput
  | GetFoundationModelCommandOutput
  | GetGuardrailCommandOutput
  | GetImportedModelCommandOutput
  | GetInferenceProfileCommandOutput
  | GetMarketplaceModelEndpointCommandOutput
  | GetModelCopyJobCommandOutput
  | GetModelCustomizationJobCommandOutput
  | GetModelImportJobCommandOutput
  | GetModelInvocationJobCommandOutput
  | GetModelInvocationLoggingConfigurationCommandOutput
  | GetPromptRouterCommandOutput
  | GetProvisionedModelThroughputCommandOutput
  | ListCustomModelsCommandOutput
  | ListEvaluationJobsCommandOutput
  | ListFoundationModelsCommandOutput
  | ListGuardrailsCommandOutput
  | ListImportedModelsCommandOutput
  | ListInferenceProfilesCommandOutput
  | ListMarketplaceModelEndpointsCommandOutput
  | ListModelCopyJobsCommandOutput
  | ListModelCustomizationJobsCommandOutput
  | ListModelImportJobsCommandOutput
  | ListModelInvocationJobsCommandOutput
  | ListPromptRoutersCommandOutput
  | ListProvisionedModelThroughputsCommandOutput
  | ListTagsForResourceCommandOutput
  | PutModelInvocationLoggingConfigurationCommandOutput
  | RegisterMarketplaceModelEndpointCommandOutput
  | StopEvaluationJobCommandOutput
  | StopModelCustomizationJobCommandOutput
  | StopModelInvocationJobCommandOutput
  | TagResourceCommandOutput
  | UntagResourceCommandOutput
  | UpdateGuardrailCommandOutput
  | UpdateMarketplaceModelEndpointCommandOutput
  | UpdateProvisionedModelThroughputCommandOutput;
export interface ClientDefaults
  extends Partial<__SmithyConfiguration<__HttpHandlerOptions>> {
  requestHandler?: __HttpHandlerUserInput;
  sha256?: __ChecksumConstructor | __HashConstructor;
  urlParser?: __UrlParser;
  bodyLengthChecker?: __BodyLengthCalculator;
  streamCollector?: __StreamCollector;
  base64Decoder?: __Decoder;
  base64Encoder?: __Encoder;
  utf8Decoder?: __Decoder;
  utf8Encoder?: __Encoder;
  runtime?: string;
  disableHostPrefix?: boolean;
  serviceId?: string;
  useDualstackEndpoint?: boolean | __Provider<boolean>;
  useFipsEndpoint?: boolean | __Provider<boolean>;
  region?: string | __Provider<string>;
  profile?: string;
  defaultUserAgentProvider?: Provider<__UserAgent>;
  credentialDefaultProvider?: (input: any) => AwsCredentialIdentityProvider;
  maxAttempts?: number | __Provider<number>;
  retryMode?: string | __Provider<string>;
  logger?: __Logger;
  extensions?: RuntimeExtension[];
  defaultsMode?: __DefaultsMode | __Provider<__DefaultsMode>;
}
export type BedrockClientConfigType = Partial<
  __SmithyConfiguration<__HttpHandlerOptions>
> &
  ClientDefaults &
  UserAgentInputConfig &
  RetryInputConfig &
  RegionInputConfig &
  HostHeaderInputConfig &
  EndpointInputConfig<EndpointParameters> &
  HttpAuthSchemeInputConfig &
  ClientInputEndpointParameters;
export interface BedrockClientConfig extends BedrockClientConfigType {}
export type BedrockClientResolvedConfigType =
  __SmithyResolvedConfiguration<__HttpHandlerOptions> &
    Required<ClientDefaults> &
    RuntimeExtensionsConfig &
    UserAgentResolvedConfig &
    RetryResolvedConfig &
    RegionResolvedConfig &
    HostHeaderResolvedConfig &
    EndpointResolvedConfig<EndpointParameters> &
    HttpAuthSchemeResolvedConfig &
    ClientResolvedEndpointParameters;
export interface BedrockClientResolvedConfig
  extends BedrockClientResolvedConfigType {}
export declare class BedrockClient extends __Client<
  __HttpHandlerOptions,
  ServiceInputTypes,
  ServiceOutputTypes,
  BedrockClientResolvedConfig
> {
  readonly config: BedrockClientResolvedConfig;
  constructor(
    ...[configuration]: __CheckOptionalClientConfig<BedrockClientConfig>
  );
  destroy(): void;
}
