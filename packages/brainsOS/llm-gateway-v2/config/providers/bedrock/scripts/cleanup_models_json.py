#!/usr/bin/env python3

import json
import os
import logging
from typing import Dict, Any, List

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def clean_model_config(model: Dict[str, Any]) -> Dict[str, Any]:
    """
    Clean up a single model's configuration by removing redundant fields
    and standardizing the structure.
    """
    # Create a new clean config
    clean_config = {
        "modelId": model["modelId"],
        "provider": model["provider"],
        "vendor": model["vendor"],
        "capabilities": model["capabilities"],
        "access": model["access"]
    }
    
    # Log removed fields
    removed_fields = []
    if "modality" in model:
        removed_fields.append("modality")
    if "llmgateway" in model:
        removed_fields.append("llmgateway")
    if "status" in model:
        removed_fields.append("status")
    
    if removed_fields:
        logger.debug(f"Removed fields from {model['modelId']}: {', '.join(removed_fields)}")
    
    return clean_config

def extract_status_info(model: Dict[str, Any]) -> Dict[str, Any]:
    """
    Extract status information from a model's configuration.
    """
    status = model.get("status", {}).get("gateway", "NOT_READY")
    connection = model.get("status", {}).get("connection", "ONDEMAND")
    
    return {
        "status": status,
        "connection": connection,
        "billing": "ONDEMAND"  # Default to on-demand billing
    }

def organize_status_data(models_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Organize status information into an array-based structure.
    Models with onDemand: true go into READY/ONDEMAND section.
    """
    status_data = {
        "statuses": [
            {
                "status": "READY",
                "connections": [
                    {
                        "type": "ONDEMAND",
                        "vendors": []
                    },
                    {
                        "type": "PROVISIONED",
                        "vendors": []
                    }
                ]
            },
            {
                "status": "NOT_READY",
                "vendors": []
            }
        ]
    }
    
    # Helper function to find or create vendor in a list
    def get_or_create_vendor(vendors_list: List[Dict[str, Any]], vendor_name: str) -> Dict[str, Any]:
        for vendor in vendors_list:
            if vendor["name"] == vendor_name:
                return vendor
        new_vendor = {"name": vendor_name, "models": []}
        vendors_list.append(new_vendor)
        return new_vendor
    
    for vendor in models_data['vendors']:
        vendor_name = vendor['name']
        
        for model in vendor['models']:
            # Check if model is onDemand
            is_ondemand = model.get('access', {}).get('onDemand', False)
            
            if is_ondemand:
                # Add to READY/ONDEMAND section
                status_entry = next(s for s in status_data["statuses"] if s["status"] == "READY")
                connection_entry = next(c for c in status_entry["connections"] if c["type"] == "ONDEMAND")
                vendor_entry = get_or_create_vendor(connection_entry["vendors"], vendor_name)
                
                vendor_entry["models"].append({
                    "modelId": model["modelId"],
                    "billing": "ONDEMAND"
                })
            else:
                # Add to NOT_READY section
                status_entry = next(s for s in status_data["statuses"] if s["status"] == "NOT_READY")
                vendor_entry = get_or_create_vendor(status_entry["vendors"], vendor_name)
                
                vendor_entry["models"].append({
                    "modelId": model["modelId"],
                    "billing": "ONDEMAND"
                })
    
    return status_data

def cleanup_models_json() -> None:
    """
    Clean up the models.json file by removing redundant fields and standardizing the structure.
    Also creates separate status.json and aliases.json files.
    """
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # models.json is in the parent directory
    models_path = os.path.join(os.path.dirname(script_dir), 'models.json')
    status_path = os.path.join(os.path.dirname(script_dir), 'status.json')
    aliases_path = os.path.join(os.path.dirname(script_dir), 'aliases.json')
    
    try:
        logger.info(f"Reading models from {models_path}")
        # Read current models.json
        with open(models_path, 'r') as f:
            models_data = json.load(f)
        
        # Initialize aliases data
        aliases_data = {"aliases": []}
        
        # Track changes
        cleaned_count = 0
        
        # Clean up each model's configuration and extract alias info
        for vendor in models_data['vendors']:
            for i, model in enumerate(vendor['models']):
                # Clean model config
                vendor['models'][i] = clean_model_config(model)
                cleaned_count += 1
                
                # Extract aliases if they exist
                if "aliases" in model:
                    for alias in model["aliases"]:
                        aliases_data["aliases"].append({
                            "modelId": model["modelId"],
                            "alias": alias
                        })
        
        # Organize status data
        status_data = organize_status_data(models_data)
        
        logger.info(f"Cleaned {cleaned_count} models")
        
        # Write cleaned models.json
        with open(models_path, 'w') as f:
            json.dump(models_data, f, indent=2)
        
        # Write status.json
        with open(status_path, 'w') as f:
            json.dump(status_data, f, indent=2)
        
        # Write aliases.json
        with open(aliases_path, 'w') as f:
            json.dump(aliases_data, f, indent=2)
        
        logger.info(f"Successfully cleaned {models_path}")
        logger.info(f"Created {status_path}")
        logger.info(f"Created {aliases_path}")
        
    except Exception as e:
        logger.error(f"Error cleaning models.json: {e}")

def main():
    logger.info("Cleaning models.json and creating status/aliases files...")
    cleanup_models_json()

if __name__ == "__main__":
    main() 