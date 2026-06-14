#!/bin/bash
# AI_URL="https://supply-various-paralyze.ngrok-free.dev/api/ai/"

AI_URL="https://ai-service-543095975317.us-central1.run.app"
# AI_ENDPOINT="${AI_URL}/api/ai/v1/sheet-chat"
AI_ENDPOINT="${AI_URL}/v1/sheet-chat"

WORKFLOW_URL="https://supply-various-paralyze.ngrok-free.dev/"
WORKFLOW_ENDPOINT="${WORKFLOW_URL}/api/workflow/approve"

# Test AI endpoint
echo "Testing AI Endpoint:"
curl -X POST $AI_ENDPOINT \
     -H "Content-Type: application/json" \
     -d '{"prompt":"hello", "context":"world"}'
echo -e "\n"

# Test Workflow endpoint
echo "Testing Workflow Endpoint:" \
curl -X POST $WORKFLOW_ENDPOINT \
echo -e "\n"

#Test GCP AI endpoint
