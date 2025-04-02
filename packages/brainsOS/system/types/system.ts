import { z } from "zod";
import { BaseSystemObjectSchema } from "./baseTypes";

export const SystemSettingsSchema = BaseSystemObjectSchema.extend({
  type: z.literal('system'),
  settings: z.record(z.unknown()), // Flexible schema for arbitrary settings
});

export type SystemSettings = z.infer<typeof SystemSettingsSchema>;