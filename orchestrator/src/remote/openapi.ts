export const openapiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Max OS — 1 Remote Control API',
    version: '1.0.0',
    description: 'Pilot your local agentic OS remotely via secure token authentication.',
  },
  servers: [{ url: 'https://{hostname}:9000', description: 'Your local OS via Tailscale' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Mission: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          agentName: { type: 'string' },
          input: { type: 'string' },
          status: { type: 'string', enum: ['running', 'done', 'failed'] },
          createdAt: { type: 'integer' },
          costUsd: { type: 'number' },
          tokensIn: { type: 'integer' },
          tokensOut: { type: 'integer' },
        },
      },
    },
  },
  paths: {
    '/api/remote/missions': {
      post: {
        summary: 'Spawn a mission',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['agent', 'input'],
                properties: {
                  agent: { type: 'string', example: '_main' },
                  input: { type: 'string', example: "Summarize last week's decisions" },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Mission spawned',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: { missionId: { type: 'string' } },
                },
              },
            },
          },
          '401': { description: 'Unauthorized' },
        },
      },
    },
    '/api/remote/missions/{id}': {
      get: {
        summary: 'Get mission status',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: {
          '200': {
            description: 'Mission',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Mission' },
              },
            },
          },
        },
      },
      delete: {
        summary: 'Kill a running mission',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Killed' } },
      },
    },
    '/api/remote/missions/{id}/output': {
      get: {
        summary: 'Get mission output (final result)',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Output markdown' } },
      },
    },
  },
};
