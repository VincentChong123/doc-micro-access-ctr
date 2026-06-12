
curl -s -H "Authorization: Bearer $(gcloud auth print-access-token)" \
	 "https://secretmanager.googleapis.com/v1/projects/543095975317/secrets/GROQ_API_KEY/versions/1:access" | jq -r .payload.data | base64 --decode
