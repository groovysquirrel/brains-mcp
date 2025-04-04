#!/usr/bin/env python3
import boto3
import json
import os

def fetch_bedrock_models():
    # Initialize Bedrock client
    bedrock = boto3.client('bedrock')
    
    # Define supported vendors and their configs
    vendors = {
        'anthropic': {
            'apiVersion': 'bedrock-2023-05-31',
            'defaultMaxTokens': 4000,
            'defaultTemperature': 0.7,
            'supportedMessageTypes': ['text'],
            'supportsStreaming': True
        },
        'meta': {
            'apiVersion': 'bedrock-2023-05-31',
            'defaultMaxTokens': 2048,
            'defaultTemperature': 0.7,
            'supportedMessageTypes': ['text'],
            'supportsStreaming': True
        },
        'mistral': {
            'apiVersion': 'bedrock-2023-05-31',
            'defaultMaxTokens': 2048,
            'defaultTemperature': 0.7,
            'supportedMessageTypes': ['text'],
            'supportsStreaming': True
        }
    }
    
    try:
        # List all foundation models
        response = bedrock.list_foundation_models()
        
        # Filter and format models
        models = {}
        for model in response.get('modelSummaries', []):
            vendor = model.get('providerName', '').lower()
            
            # Only include models from supported vendors
            if vendor in vendors:
                models[model['modelId']] = {
                    'modelId': model['modelId'],
                    'modelName': model.get('modelName', model['modelId']),
                    'providerName': model.get('providerName', 'unknown'),
                    'inferenceTypesSupported': model.get('inferenceTypesSupported', []),
                    'inputModalities': model.get('inputModalities', []),
                    'outputModalities': model.get('outputModalities', []),
                    'customizationsSupported': model.get('customizationsSupported', []),
                    'modelArn': model.get('modelArn', '')
                }
        
        # Get the directory of this script
        script_dir = os.path.dirname(os.path.abspath(__file__))
        config_dir = os.path.dirname(script_dir)
        
        # Write models to JSON file
        with open(os.path.join(config_dir, 'bedrockModels.json'), 'w') as f:
            json.dump(models, f, indent=2)
            
        # Write vendor configs to JSON file
        with open(os.path.join(config_dir, 'vendorConfig.json'), 'w') as f:
            json.dump(vendors, f, indent=2)
            
        print(f"Successfully exported Bedrock model configurations")
        print(f"Found {len(models)} models")
        print(f"Supported vendors: {', '.join(vendors.keys())}")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        exit(1)

if __name__ == "__main__":
    fetch_bedrock_models() 