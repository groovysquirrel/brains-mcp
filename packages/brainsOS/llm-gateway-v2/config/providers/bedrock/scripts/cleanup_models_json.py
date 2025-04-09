#!/usr/bin/env python3

import json
import os
import logging
import argparse
from typing import Dict, Any, List

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

# Custom JSON encoder to format small floats with decimal notation instead of scientific
class DecimalEncoder(json.JSONEncoder):
    def __init__(self, *args, **kwargs):
        # Extract custom decimal_places if provided, otherwise default to 10
        self.decimal_places = kwargs.pop('decimal_places', 10)
        super().__init__(*args, **kwargs)
    
    def default(self, obj):
        """Override default method to handle floats."""
        return super().default(obj)
        
    def encode(self, obj):
        """
        Overriding encode to handle all types of objects containing floats.
        This ensures proper decimal format throughout the entire JSON object.
        """
        if isinstance(obj, float):
            # Format float with decimal notation
            return self.format_float(obj)
        elif isinstance(obj, dict):
            # Process each item in the dictionary
            items = []
            for key, value in obj.items():
                formatted_key = json.dumps(key)
                formatted_value = self.encode(value)
                items.append(f"{formatted_key}: {formatted_value}")
            return "{" + ", ".join(items) + "}"
        elif isinstance(obj, (list, tuple)):
            # Process each item in the list or tuple
            items = [self.encode(item) for item in obj]
            return "[" + ", ".join(items) + "]"
        else:
            # For non-float types, use the standard encoder
            return super().encode(obj)
    
    def format_float(self, f):
        """Format float with decimal notation instead of scientific."""
        float_str = f"{f:.{self.decimal_places}f}"
        # Remove trailing zeros to make it cleaner
        if '.' in float_str:
            float_str = float_str.rstrip('0').rstrip('.')
        return float_str

def dump_json(obj, fp, decimal_places=10, indent=2):
    """
    Custom JSON dumper that ensures floats are formatted with decimal notation.
    This is more reliable than using the JSONEncoder class.
    """
    # First convert to plain dict/list structure
    if hasattr(obj, "__dict__"):
        obj_dict = obj.__dict__
    else:
        obj_dict = obj
    
    # Convert floats to strings with decimal notation
    def process_item(item):
        if isinstance(item, float):
            # Format with specified decimal places
            float_str = f"{item:.{decimal_places}f}"
            # Remove trailing zeros
            if '.' in float_str:
                float_str = float_str.rstrip('0').rstrip('.')
            return float_str
        elif isinstance(item, dict):
            return {k: process_item(v) for k, v in item.items()}
        elif isinstance(item, (list, tuple)):
            return [process_item(i) for i in item]
        else:
            return item
    
    processed_obj = process_item(obj_dict)
    
    # Convert to JSON with indent using the standard encoder
    json_str = json.dumps(processed_obj, indent=indent)
    
    # Further cleanup to ensure no scientific notation
    # Replace any potential scientific notation that might have slipped through
    import re
    # Pattern to match scientific notation
    pattern = r'(\d+)\.?(\d*)e([+-]\d+)'
    
    def scientific_to_decimal(match):
        base, frac, exp = match.groups()
        if not frac:
            frac = ""
        exp = int(exp)
        
        if exp > 0:
            # Move decimal point to the right
            if len(frac) <= exp:
                # Add zeros if needed
                return base + frac + "0" * (exp - len(frac))
            else:
                # Insert decimal point
                return base + frac[:exp] + "." + frac[exp:]
        else:
            # Move decimal point to the left
            exp = abs(exp)
            return "0." + "0" * (exp - 1) + base + frac
    
    json_str = re.sub(pattern, scientific_to_decimal, json_str)
    
    # Write to file
    fp.write(json_str)

# Vendor-specific output token multipliers
# These determine how much more expensive output tokens are compared to input tokens
VENDOR_MULTIPLIERS = {
    "anthropic": 3.0,   # Claude models typically charge 3x for output tokens
    "meta": 2.0,        # Meta models typically charge 2x for output tokens
    "mistral ai": 2.0,  # Mistral models typically charge 2x for output tokens
    "cohere": 1.5,      # Cohere models have a smaller difference
    "ai21 labs": 2.0,   # AI21 models
    "default": 3.0      # Default multiplier for other vendors
}

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Clean up models.json and normalize cost structures.')
    
    parser.add_argument('--dry-run', action='store_true', 
                      help='Run without making changes to files')
    
    parser.add_argument('--update-vendor-multiplier', nargs=2, action='append', metavar=('VENDOR', 'MULTIPLIER'),
                      help='Update the output token multiplier for a specific vendor (e.g., "anthropic 3.0")')
    
    parser.add_argument('--set-default-multiplier', type=float, metavar='MULTIPLIER',
                      help='Set the default output token multiplier for vendors not explicitly defined')
    
    parser.add_argument('--decimal-places', type=int, default=10, metavar='PLACES',
                      help='Number of decimal places to use when writing float values (default: 10)')
    
    parser.add_argument('--verbose', '-v', action='store_true',
                      help='Enable verbose logging')
    
    return parser.parse_args()

def get_default_pricing(model: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate default pricing for a model based on its vendor and capabilities.
    Used when a model is missing pricing information.
    """
    vendor = model.get("vendor", "").lower()
    model_id = model.get("modelId", "").lower()
    
    # Default pricing structure
    default_pricing = {
        "onDemand": {
            "input": 0.0000100,
            "output": 0.0000300
        }
    }
    
    # Adjust pricing based on vendor and model characteristics
    if vendor == "anthropic":
        if "claude-3-opus" in model_id:
            default_pricing["onDemand"]["input"] = 0.0000150
            default_pricing["onDemand"]["output"] = 0.0000450
        elif "claude-3-sonnet" in model_id:
            default_pricing["onDemand"]["input"] = 0.0000050
            default_pricing["onDemand"]["output"] = 0.0000150
        elif "claude-3-haiku" in model_id:
            default_pricing["onDemand"]["input"] = 0.0000013
            default_pricing["onDemand"]["output"] = 0.0000038
        elif "claude-3" in model_id:  # Generic Claude 3
            default_pricing["onDemand"]["input"] = 0.0000080
            default_pricing["onDemand"]["output"] = 0.0000240
    elif vendor == "meta":
        if "70b" in model_id:
            default_pricing["onDemand"]["input"] = 0.0000035
            default_pricing["onDemand"]["output"] = 0.0000070
        else:
            default_pricing["onDemand"]["input"] = 0.0000010
            default_pricing["onDemand"]["output"] = 0.0000020
    elif vendor == "mistral ai":
        if "large" in model_id:
            default_pricing["onDemand"]["input"] = 0.0000040
            default_pricing["onDemand"]["output"] = 0.0000080
        elif "small" in model_id:
            default_pricing["onDemand"]["input"] = 0.0000010
            default_pricing["onDemand"]["output"] = 0.0000020
        else:
            default_pricing["onDemand"]["input"] = 0.0000020
            default_pricing["onDemand"]["output"] = 0.0000040
    elif vendor == "amazon":
        # Different pricing for Amazon models based on capabilities
        modalities = model.get("capabilities", {}).get("modalities", {})
        input_modalities = modalities.get("input", [])
        output_modalities = modalities.get("output", [])
        
        # Check if it's an embedding model
        if "EMBEDDING" in output_modalities:
            default_pricing["onDemand"]["input"] = 0.0000003
            default_pricing["onDemand"]["output"] = 0.0000000  # No output tokens for embeddings
        # Check if it's an image generation model
        elif "IMAGE" in output_modalities:
            default_pricing["onDemand"]["input"] = 0.0000080
            default_pricing["onDemand"]["output"] = 0.0010000  # Image generation has different pricing
    
    # If provisioning is supported, add provisioned pricing
    if model.get("access", {}).get("provisionable", False):
        # Provisioned pricing is typically 20% less than on-demand
        default_pricing["provisioned"] = {
            "input": default_pricing["onDemand"]["input"] * 0.8,
            "output": default_pricing["onDemand"]["output"] * 0.8
        }
    
    return default_pricing

def normalize_cost_structure(model: Dict[str, Any]) -> Dict[str, Any]:
    """
    Normalize the cost structure for a model to ensure it follows the
    newer format with separate input/output token costs.
    
    For models with legacy flat rate pricing, convert to the new structure
    with a standard output multiplier of 3x for input.
    """
    if "costPerToken" not in model:
        logger.warning(f"No costPerToken found for {model['modelId']}, generating default pricing")
        model["costPerToken"] = get_default_pricing(model)
        return model
    
    cost_per_token = model["costPerToken"]
    
    # Create normalized cost structure
    normalized_cost = {}
    
    # Process onDemand pricing if it exists
    if "onDemand" in cost_per_token:
        on_demand = cost_per_token["onDemand"]
        
        # Check if it's already in the new format
        if isinstance(on_demand, dict) and "input" in on_demand and "output" in on_demand:
            # Already in correct format, keep as is
            normalized_cost["onDemand"] = on_demand
        elif isinstance(on_demand, (int, float)):
            # Convert legacy flat rate to new format
            input_rate = on_demand
            
            # Get vendor-specific output token multiplier
            vendor = model.get("vendor", "").lower()
            multiplier = VENDOR_MULTIPLIERS.get(vendor, VENDOR_MULTIPLIERS["default"])
            output_rate = input_rate * multiplier
            
            normalized_cost["onDemand"] = {
                "input": input_rate,
                "output": output_rate
            }
            logger.debug(f"Converted flat rate pricing to input/output for {model['modelId']} with {multiplier}x multiplier")
        else:
            # Unknown format
            logger.warning(f"Unknown onDemand cost format for {model['modelId']}: {on_demand}")
            normalized_cost["onDemand"] = on_demand
    else:
        # Missing onDemand pricing, generate default
        default_pricing = get_default_pricing(model)
        normalized_cost["onDemand"] = default_pricing["onDemand"]
        logger.warning(f"Generated default onDemand pricing for {model['modelId']}")
    
    # Process provisioned pricing if it exists
    if "provisioned" in cost_per_token:
        provisioned = cost_per_token["provisioned"]
        
        # Check if it's already in the new format
        if isinstance(provisioned, dict) and "input" in provisioned and "output" in provisioned:
            # Already in correct format, keep as is
            normalized_cost["provisioned"] = provisioned
        elif isinstance(provisioned, (int, float)):
            # Convert legacy flat rate to new format
            input_rate = provisioned
            
            # Get vendor-specific output token multiplier
            vendor = model.get("vendor", "").lower()
            multiplier = VENDOR_MULTIPLIERS.get(vendor, VENDOR_MULTIPLIERS["default"])
            output_rate = input_rate * multiplier
            
            normalized_cost["provisioned"] = {
                "input": input_rate,
                "output": output_rate
            }
            logger.debug(f"Converted provisioned flat rate pricing to input/output for {model['modelId']} with {multiplier}x multiplier")
        else:
            # Unknown format
            logger.warning(f"Unknown provisioned cost format for {model['modelId']}: {provisioned}")
            normalized_cost["provisioned"] = provisioned
    elif model.get("access", {}).get("provisionable", False):
        # Model is provisionable but missing provisioned pricing
        # Generate default provisioned pricing if needed
        default_pricing = get_default_pricing(model)
        if "provisioned" in default_pricing:
            normalized_cost["provisioned"] = default_pricing["provisioned"]
            logger.warning(f"Generated default provisioned pricing for {model['modelId']}")
    
    # Update model with normalized cost structure
    model["costPerToken"] = normalized_cost
    return model

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
    
    # Add costPerToken if it exists in the original model
    if "costPerToken" in model:
        # Normalize the cost structure
        normalized_model = normalize_cost_structure(model)
        clean_config["costPerToken"] = normalized_model["costPerToken"]
    else:
        # Generate default pricing if missing
        normalized_model = normalize_cost_structure(model)
        clean_config["costPerToken"] = normalized_model["costPerToken"]
        logger.info(f"Added default pricing for {model['modelId']}")
    
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

def validate_model_costs(models_data: Dict[str, Any]) -> None:
    """
    Validate all model cost structures to ensure they follow the correct format.
    Log warnings for any issues found.
    """
    for vendor in models_data['vendors']:
        for model in vendor['models']:
            if "costPerToken" not in model:
                logger.warning(f"Missing costPerToken for {model['modelId']}")
                continue
                
            cost_per_token = model["costPerToken"]
            
            # Check onDemand pricing
            if "onDemand" not in cost_per_token:
                logger.warning(f"Missing onDemand pricing for {model['modelId']}")
            else:
                on_demand = cost_per_token["onDemand"]
                if not isinstance(on_demand, dict):
                    logger.warning(f"onDemand pricing not in input/output format for {model['modelId']}")
                elif "input" not in on_demand or "output" not in on_demand:
                    logger.warning(f"onDemand pricing missing input or output fields for {model['modelId']}")
            
            # Check provisioned pricing if it exists
            if "provisioned" in cost_per_token:
                provisioned = cost_per_token["provisioned"]
                if not isinstance(provisioned, dict):
                    logger.warning(f"provisioned pricing not in input/output format for {model['modelId']}")
                elif "input" not in provisioned or "output" not in provisioned:
                    logger.warning(f"provisioned pricing missing input or output fields for {model['modelId']}")

def cleanup_models_json(args) -> None:
    """
    Clean up the models.json file by removing redundant fields and standardizing the structure.
    Also creates separate status.json and aliases.json files.
    Ensures all costPerToken structures follow the new input/output format.
    """
    # Update vendor multipliers if provided
    if args.update_vendor_multiplier:
        for vendor, multiplier in args.update_vendor_multiplier:
            try:
                multiplier_float = float(multiplier)
                VENDOR_MULTIPLIERS[vendor.lower()] = multiplier_float
                logger.info(f"Updated output token multiplier for {vendor} to {multiplier_float}x")
            except ValueError:
                logger.error(f"Invalid multiplier value: {multiplier}. Must be a number.")
    
    # Update default multiplier if provided
    if args.set_default_multiplier:
        VENDOR_MULTIPLIERS["default"] = args.set_default_multiplier
        logger.info(f"Updated default output token multiplier to {args.set_default_multiplier}x")
    
    # Enable verbose logging if requested
    if args.verbose:
        logger.setLevel(logging.DEBUG)
    
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
        cost_normalized_count = 0
        
        # Clean up each model's configuration and extract alias info
        for vendor in models_data['vendors']:
            for i, model in enumerate(vendor['models']):
                # Check if the model has costPerToken
                has_cost = "costPerToken" in model
                
                # Clean model config
                vendor['models'][i] = clean_model_config(model)
                cleaned_count += 1
                
                # Check if cost structure was normalized
                if has_cost:
                    cost_normalized_count += 1
                
                # Extract aliases if they exist
                if "aliases" in model:
                    for alias in model["aliases"]:
                        aliases_data["aliases"].append({
                            "modelId": model["modelId"],
                            "alias": alias
                        })
        
        # Organize status data
        status_data = organize_status_data(models_data)
        
        # Validate all model costs
        validate_model_costs(models_data)
        
        logger.info(f"Cleaned {cleaned_count} models")
        logger.info(f"Normalized cost structure for {cost_normalized_count} models")
        
        if not args.dry_run:
            # Write cleaned models.json with decimal notation rather than scientific notation
            with open(models_path, 'w') as f:
                dump_json(models_data, f, decimal_places=args.decimal_places, indent=2)
            
            # Write status.json
            with open(status_path, 'w') as f:
                json.dump(status_data, f, indent=2)
            
            # Write aliases.json
            with open(aliases_path, 'w') as f:
                json.dump(aliases_data, f, indent=2)
            
            logger.info(f"Successfully cleaned {models_path}")
            logger.info(f"Created {status_path}")
            logger.info(f"Created {aliases_path}")
        else:
            logger.info("Dry run completed. No files were modified.")
            
            # Print a sample of the output with decimal notation
            sample_model = models_data['vendors'][0]['models'][0]
            sample_json = json.dumps(sample_model, indent=2, default=lambda x: str(x) if isinstance(x, float) else x)
            # Further process to ensure decimal notation
            import re
            sample_json = re.sub(r'(\d+)\.?(\d*)e([+-]\d+)', lambda m: f"0.{'0' * (int(m.group(3)[1:]) - 1)}{m.group(1)}{m.group(2)}" if m.group(3).startswith('-') else f"{m.group(1)}{m.group(2)}{'0' * int(m.group(3)[1:])}", sample_json)
            logger.info("Sample output with decimal notation:")
            logger.info(sample_json)
        
    except Exception as e:
        logger.error(f"Error cleaning models.json: {e}")
        import traceback
        logger.error(traceback.format_exc())

def main():
    logger.info("Cleaning models.json and creating status/aliases files...")
    args = parse_arguments()
    cleanup_models_json(args)

if __name__ == "__main__":
    main() 