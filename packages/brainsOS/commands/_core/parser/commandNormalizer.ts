import { CommandAction } from '../registry/commandRegistry';

export function normalizeCommand(action: string, object: string): [CommandAction, string] {
  // Simple normalization - just lowercase
  return [
    action.toLowerCase() as CommandAction,
    object.toLowerCase()
  ];
}