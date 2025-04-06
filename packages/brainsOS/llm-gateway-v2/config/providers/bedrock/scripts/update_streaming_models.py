#!/usr/bin/env python3

import boto3
import json
import os
from typing import Dict, List
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def get_model_details() -> Dict[str, Dict]:
    """
    Get detailed model information using AWS Bedrock API.
    Returns a dictionary mapping model IDs to their details.
    """
    try:
        logger.info("Initializing Bedrock client...")
        bedrock = boto3.client('bedrock')
        
        logger.info("Fetching foundation models...")
        response = bedrock.list_foundation_models()
        
        model_details = {}
        for model in response.get('modelSummaries', []):
            model_id = model['modelId']
            
            # Determine access capabilities
            inference_types = model.get('inferenceTypesSupported', [])
            access = {
                'onDemand': 'ON_DEMAND' in inference_types,
                'provisionable': 'PROVISIONED' in inference_types
            }
            
            details = {
                'streaming': model.get('responseStreamingSupported', False),
                'modalities': {
                    'input': model.get('inputModalities', []),
                    'output': model.get('outputModalities', [])
                },
                'lifecycle': model.get('modelLifecycle', {}).get('status', 'UNKNOWN'),
                'customization': {
                    'supported': bool(model.get('customizationsSupported', [])),
                    'types': model.get('customizationsSupported', [])
                },
                'access': access
            }
            model_details[model_id] = details
            logger.debug(f"Found model: {model_id} - Details: {details}")
        
        logger.info(f"Found {len(model_details)} models from AWS API")
        return model_details
    
    except Exception as e:
        logger.error(f"Error fetching models from AWS API: {e}")
        return {}

def update_models_json(model_details: Dict[str, Dict]) -> None:
    """
    Update models.json with model details from AWS API.
    Uses starts-with matching to handle model variants with additional suffixes.
    """
    # Get the directory where this script is located
    script_dir = os.path.dirname(os.path.abspath(__file__))
    # models.json is in the parent directory
    models_path = os.path.join(os.path.dirname(script_dir), 'models.json')
    
    try:
        logger.info(f"Reading models from {models_path}")
        # Read current models.json
        with open(models_path, 'r') as f:
            models_data = json.load(f)
        
        # Track updates
        updated_count = 0
        no_match_count = 0
        
        # Update details for each model
        for vendor in models_data['vendors']:
            for model in vendor['models']:
                model_id = model['modelId']
                matched = False
                
                # Find matching base model ID
                for base_model_id, details in model_details.items():
                    if model_id.startswith(base_model_id):
                        # Update capabilities
                        model['capabilities'] = {
                            'streaming': details['streaming'],
                            'modalities': details['modalities'],
                            'lifecycle': details['lifecycle'],
                            'customization': details['customization']
                        }
                        
                        # Update access
                        model['access'] = details['access']
                        
                        # Preserve existing status if it exists, otherwise set defaults
                        if 'status' not in model:
                            model['status'] = {
                                'gateway': 'READY',
                                'connection': 'ONDEMAND' if details['access']['onDemand'] else 'PROVISIONED'
                            }
                        
                        matched = True
                        updated_count += 1
                        logger.info(f"Updated {model_id} (matches {base_model_id}): {details}")
                        break
                
                if not matched:
                    no_match_count += 1
                    logger.warning(f"No match found for {model_id}")
        
        logger.info(f"Updated {updated_count} models, {no_match_count} models had no matches")
        
        # Write updated models.json
        with open(models_path, 'w') as f:
            json.dump(models_data, f, indent=2)
        
        logger.info(f"Successfully updated {models_path}")
        
    except Exception as e:
        logger.error(f"Error updating models.json: {e}")

def main():
    logger.info("Fetching model details from AWS Bedrock API...")
    model_details = get_model_details()
    
    if not model_details:
        logger.error("No model details found or error occurred during API call")
        return
    
    logger.info(f"Found {len(model_details)} models with details")
    logger.info("Updating models.json...")
    update_models_json(model_details)

if __name__ == "__main__":
    main() 