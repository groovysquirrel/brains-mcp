import { APIGatewayProxyEventV2WithIAMAuthorizer } from 'aws-lambda';

export const createMockEvent = (overrides = {}): APIGatewayProxyEventV2WithIAMAuthorizer => ({
  version: '2.0',
  routeKey: 'POST /latest/services/prompt/{promptType}',
  rawPath: '/latest/services/prompt/instruction',
  rawQueryString: '',
  headers: {
    'content-type': 'application/json'
  },
  requestContext: {
    accountId: '123456789012',
    apiId: 'api-id',
    domainName: 'test.execute-api.us-east-1.amazonaws.com',
    domainPrefix: 'test',
    http: {
      method: 'GET',
      path: '/latest/services/prompt/instruction',
      protocol: 'HTTP/1.1',
      sourceIp: '127.0.0.1',
      userAgent: 'jest-test'
    },
    requestId: 'test-request-id',
    routeKey: 'POST /latest/services/prompt/{promptType}',
    stage: '$default',
    time: '12/Dec/2023:19:31:41 +0000',
    timeEpoch: 1702321901595,
    authorizer: {
      iam: {
        accessKey: 'ASIA1234567890',
        accountId: '123456789012',
        callerId: 'AIDA1234567890',
        cognitoIdentity: null,
        principalOrgId: null,
        userArn: 'arn:aws:iam::123456789012:user/test-user',
        userId: 'test-user-id'
      }
    }
  },
  body: null,
  pathParameters: {},
  isBase64Encoded: false,
  ...overrides
});