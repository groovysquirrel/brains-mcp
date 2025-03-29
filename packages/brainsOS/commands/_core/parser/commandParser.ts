import { CommandRequest, CommandAction } from '../registry/commandRegistry';
import { userContext } from '../../../core/types/userTypes';
import { CommandObject } from '../../../core/types/api/commands/commandDefinition';
import { CommandAliases } from '../aliases/commandAliases';


function createCommandRequest(action: string, object: string, rest: string[]): CommandRequest {
  const parameters = rest.filter(p => !p.startsWith('--'));
  const flags = rest
    .filter(p => p.startsWith('--'))
    .reduce((acc, flag) => {
      const [key, value] = flag.slice(2).split('=');
      acc[key] = value ?? true;
      return acc;
    }, {} as Record<string, string | boolean>);

  const baseRequest = {
    parameters,
    flags,
    raw: `${action} ${object} ${rest.join(' ')}`.trim(),
    user: { 
      userId: 'default',
      userType: 'user' as const
    } as userContext
  };

  const normalizedAction = action.toLowerCase() as CommandAction;
  const normalizedObj = object.toLowerCase() as CommandObject;

  return {
    ...baseRequest,
    action: normalizedAction,
    object: normalizedObj
  };
}

export function parseCommand(rawCommand: string): CommandRequest {
  console.log('Parsing raw command:', rawCommand);
  
  // Handle shortcuts first
  if (rawCommand in CommandAliases.shortcuts) {
    console.log('Found shortcut match:', rawCommand);
    const fullCommand = CommandAliases.shortcuts[rawCommand as keyof typeof CommandAliases.shortcuts];
    return parseCommand(fullCommand);
  }

  // Normal command parsing
  const parts = rawCommand.trim().match(/[^\s"']+|"([^"]*)"|'([^']*)'/g) || [];
  console.log('Split command parts:', parts);
  
  const action = parts[0];
  const remainingParts = parts.slice(1);
  const object = remainingParts[0];
  
  console.log('Before normalization:', { action, object });
  const normalizedObject = normalizeObject(object);
  console.log('After normalization:', { action, normalizedObject });
  
  const rest = remainingParts.slice(1);
  return createCommandRequest(action, normalizedObject, rest);
}

function normalizeObject(object: string): string {
  console.log('Normalizing object:', object);
  console.log('Available aliases:', CommandAliases.objects);
  
  for (const [primary, aliases] of Object.entries(CommandAliases.objects)) {
    if (object === primary || aliases.includes(object)) {
      return primary;
    }
  }
  
  return object;
}