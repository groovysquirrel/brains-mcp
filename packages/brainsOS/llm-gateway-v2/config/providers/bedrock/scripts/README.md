# Bedrock Model Management Scripts

These Python scripts automate the management of AWS Bedrock models in the LLM Gateway configuration. Instead of manually updating model configurations, these scripts fetch the latest information directly from the AWS Bedrock API.

## Scripts

### `update_streaming_models.py`

Fetches the latest model information from AWS Bedrock API and updates the `models.json` configuration file. This includes:
- Streaming capabilities
- Input/output modalities
- Model lifecycle status
- Customization support
- Access types (on-demand/provisioned)

### `cleanup_models_json.py`

Cleans and standardizes the `models.json` configuration file by:
- Removing redundant fields
- Standardizing the structure
- Ensuring consistent formatting

## Usage

1. Ensure AWS credentials are configured
2. Run the update script:
   ```bash
   python3 update_streaming_models.py
   ```
3. Run the cleanup script:
   ```bash
   python3 cleanup_models_json.py
   ```

## Requirements

- Python 3.x
- boto3 (`pip install boto3`)
- AWS credentials configured

## Configuration Structure

The scripts maintain the following structure in `models.json`:

```json
{
  "modelId": "model-id",
  "provider": "bedrock",
  "vendor": "vendor-name",
  "capabilities": {
    "streaming": true,
    "modalities": {
      "input": ["TEXT"],
      "output": ["TEXT"]
    },
    "lifecycle": "ACTIVE",
    "customization": {
      "supported": false,
      "types": []
    }
  },
  "access": {
    "onDemand": true,
    "provisionable": false
  },
  "status": {
    "gateway": "READY",
    "connection": "ONDEMAND"
  }
}
```
