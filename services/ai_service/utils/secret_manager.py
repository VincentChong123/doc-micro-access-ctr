from google.cloud import secretmanager


def access_secret_version(
    project_id: str, secret_id: str, version_id: str = "latest"
) -> str | None:
    """
    Access the payload of the given secret version from Google Cloud Secret Manager.
    """
    try:
        # Create the Secret Manager client.
        client = secretmanager.SecretManagerServiceClient()

        # Build the resource name of the secret version.
        name = f"projects/{project_id}/secrets/{secret_id}/versions/{version_id}"

        # Access the secret version.
        response = client.access_secret_version(request={"name": name})

        # Return the decoded payload.
        payload = response.payload.data.decode("UTF-8")
        return payload
    except Exception as e:
        print(f"⚠️ Could not load secret '{secret_id}' from GCP: {e}")
        return None


# projects/543095975317/secrets/GROQ_API_KEY/versions/1
if __name__ == "__main__":
    from app.config import settings

    print(f"Testing access to GROQ_API_KEY for project {settings.gcp_project_id}...")
    secret = access_secret_version(settings.gcp_project_id, "GROQ_API_KEY", "1")
    if secret:
        print(f"✅ Success! Secret retrieved. (Length: {len(secret)})")
    else:
        print("❌ Failed to retrieve secret.")
