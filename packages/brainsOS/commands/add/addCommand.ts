import { itemRepository } from "../../core/repositories/item/itemRepository";
import { createResponse } from "../../utils/http/response";
import { AddCommandRequest } from "./addCommandTypes";

export async function handleAddCommand(command: AddCommandRequest) {
  try {
    const { object: itemType, flags, user } = command;
    const templateName = flags.templateName as string;
    
    if (!user.userId) {
      throw new Error('Missing userId in user context');
    }
    
    await itemRepository.addItem(
      user.userId,
      itemType,
      templateName,
      { type: "template" }
    );

    return createResponse(200, {
      success: true,
      data: { message: `Template ${templateName} created successfully` }
    });
  } catch (error) {
    return createResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}