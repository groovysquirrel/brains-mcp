import { z } from 'zod';
import { SystemObjectTypes } from '../../../core/types/baseTypes';
import { userContext } from '../../../core/types/userTypes';
import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { handleTestCommand } from '../../test/testCommand';
import { handleSetCommand } from '../../set/setCommand';
import { handleShowCommand } from '../../show/showCommand';
import { handleListCommand } from '../../list/listCommand';
import { handleLoadCommand } from '../../load/loadCommand';
import { handlePromptCommand } from '../../prompt/promptCommand';
import { CommandObject } from '../../../core/types/api/commands/commandDefinition';
import { createResponse } from '../../../utils/http/response';

// Valid command actions
export const CommandActions = [
  'test',
  'set',
  'show',
  'list',
  'load',
  'prompt',
  'add',
  'create',
  'delete',
  'update'
] as const;

export type CommandAction = typeof CommandActions[number];

// Base command configuration
export interface CommandConfig<T extends CommandRequest = CommandRequest> {
  objects: readonly string[];
  requiresAuth: boolean;
  allowsFlags: boolean;
  schema?: z.ZodSchema;
  help: string;
  handler: (command: T) => Promise<APIGatewayProxyResultV2>;
}

// Base command request interface
export interface CommandRequest {
  action: CommandAction;
  object: CommandObject | string;
  parameters: string[];
  flags: Record<string, boolean | string>;
  raw: string;
  user: userContext;
}

// Command Registry Class
class CommandRegistry {
  private commands: Map<CommandAction, CommandConfig<any>> = new Map();

  register<T extends CommandRequest>(action: CommandAction, config: CommandConfig<T>): void {
    this.commands.set(action, config);
  }

  get(action: string): CommandConfig<any> | undefined {
    return this.commands.get(action.toLowerCase() as CommandAction);
  }

  isValidObject(action: string, object: string): boolean {
    const config = this.get(action);
    if (!config) return false;
    return config.objects.includes('*') || config.objects.includes(object.toLowerCase());
  }

  async executeCommand(command: CommandRequest): Promise<APIGatewayProxyResultV2> {
    try {
      const config = this.get(command.action);
      
      if (!config) {
        return createResponse(400, {
          success: false,
          error: `Invalid command action: ${command.action}`
        });
      }

      if (config.requiresAuth && !command.user?.userId) {
        return createResponse(401, {
          success: false,
          error: 'Authentication required for this command'
        });
      }

      if (!this.isValidObject(command.action, command.object)) {
        return createResponse(400, {
          success: false,
          error: `Invalid object "${command.object}" for ${command.action} command. Valid objects are: ${config.objects.join(', ')}`
        });
      }

      if (config.schema) {
        const result = config.schema.safeParse(command);
        if (!result.success) {
          return createResponse(400, {
            success: false,
            error: `Invalid command format: ${result.error.message}`
          });
        }
      }

      return await config.handler(command);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid')) {
        return createResponse(400, {
          success: false,
          error: error.message
        });
      }
      throw error;
    }
  }

  listCommands(): { action: CommandAction; help: string }[] {
    return Array.from(this.commands.entries()).map(([action, config]) => ({
      action,
      help: config.help
    }));
  }

  getValidObjects(action: CommandAction): readonly string[] {
    const config = this.get(action);
    return config?.objects || [];
  }
}

// Create registry instance
const registry = new CommandRegistry();

// Command definitions
const commandDefinitions: Record<CommandAction, Omit<CommandConfig<any>, 'handler'>> = {
  test: {
    objects: ['connection'] as const,
    requiresAuth: true,
    allowsFlags: true,
    help: 'Test system connectivity',
    schema: z.object({
      action: z.literal('test'),
      object: z.enum(['connection']),
      parameters: z.array(z.string())
    })
  },
  set: {
    objects: ['model', 'format', 'system'] as const,
    requiresAuth: true,
    allowsFlags: false,
    help: 'Configure system settings'
  },
  list: {
    objects: ['llm', 'templates', 'models', ...SystemObjectTypes] as const,
    requiresAuth: false,
    allowsFlags: true,
    help: 'List available resources'
  },
  show: {
    objects: ['system', 'model', 'llm'] as const,
    requiresAuth: false,
    allowsFlags: true,
    help: 'Display resource details'
  },
  load: {
    objects: ['llm', 'llms', 'default'] as const,
    requiresAuth: true,
    allowsFlags: true,
    help: 'Load resources into system'
  },
  prompt: {
    objects: ['*'] as const,
    requiresAuth: true,
    allowsFlags: true,
    help: 'Send prompt to LLM'
  },
  add: {
    objects: SystemObjectTypes,
    requiresAuth: true,
    allowsFlags: true,
    help: 'Add new resource'
  },
  create: {
    objects: SystemObjectTypes,
    requiresAuth: true,
    allowsFlags: true,
    help: 'Create new resource'
  },
  delete: {
    objects: SystemObjectTypes,
    requiresAuth: true,
    allowsFlags: true,
    help: 'Delete resource'
  },
  update: {
    objects: SystemObjectTypes,
    requiresAuth: true,
    allowsFlags: true,
    help: 'Update existing resource'
  }
};

// Register commands
Object.entries(commandDefinitions).forEach(([action, config]) => {
  const handlers: Record<string, (command: any) => Promise<APIGatewayProxyResultV2>> = {
    test: handleTestCommand,
    set: handleSetCommand,
    show: handleShowCommand,
    list: handleListCommand,
    load: handleLoadCommand,
    prompt: handlePromptCommand
  };

  const handler = handlers[action];
  if (handler) {
    registry.register(action as CommandAction, {
      ...config,
      handler
    });
  }
});

export { registry };
export default registry;