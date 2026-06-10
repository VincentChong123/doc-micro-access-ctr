import requests
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path="/home/vin/01-prj/doc-micro-access-ctr/services/ai-service/.env")
api_key = os.environ.get("GROQ_API_KEY")
url = "https://api.groq.com/openai/v1/models"

headers = {
    "Authorization": f"Bearer {api_key}",
    "Content-Type": "application/json"
}

response = requests.get(url, headers=headers)

print(response.json())