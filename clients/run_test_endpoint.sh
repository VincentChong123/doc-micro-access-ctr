#!/bin/bash

# Test AI endpoint
echo "Testing AI Endpoint:"
curl -X POST https://supply-various-paralyze.ngrok-free.dev/api/ai/v1/sheet-chat \
     -H "Content-Type: application/json" \
     -d '{"prompt":"hello", "context":"world"}'
echo -e "\n"

# Test Workflow endpoint
echo "Testing Workflow Endpoint:"
curl -X POST https://supply-various-paralyze.ngrok-free.dev/api/workflow/approve
echo -e "\n"
