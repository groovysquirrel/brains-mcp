export const CommandAliases = {
  shortcuts: {
    'test': 'test connection',
    'status': 'list system',
    'reset': 'set system default'
  },
  objects: {
    'llm': ['llms', 'model', 'models'] as readonly string[],
    'system': ['config', 'settings'] as readonly string[]
  }
} as const;

export type CommandShortcut = keyof typeof CommandAliases.shortcuts;
export type AliasableObject = keyof typeof CommandAliases.objects;
export type ObjectAlias = typeof CommandAliases.objects[AliasableObject][number];