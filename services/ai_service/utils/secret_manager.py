import logging  # Ensure logging is configured before any other imports


from google.cloud import secretmanager
from dotenv import load_dotenv

logger = logging.getLogger(__name__)
load_dotenv("/home/vin/01-prj/doc-micro-access-ctr/.env")


def access_secret_version(
    project_id: str,
    secret_id: str,
    version_id: str = "latest",
    is_assert_null_secret: bool = False,
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
        if is_assert_null_secret:
            assert payload, f"Secret '{secret_id}' is empty."
        return payload
    except Exception as e:
        logger.error(f"⚠️ Could not load secret '{secret_id}' from GCP: {e}")
        if is_assert_null_secret:
            raise RuntimeError(f"Failed to retrieve secret '{secret_id}': {e}") from e
        return None


# projects/543095975317/secrets/GROQ_API_KEY/versions/1
if __name__ == "__main__":
    # Import the centralized logger setup
    import utils.logger

    from app.config import settings

    logger.info(
        f"Testing access to GROQ_API_KEY for project {settings.gcp_project_id}..."
    )

    secret = access_secret_version(settings.gcp_project_id, "GROQ_API_KEY", "1")
    if secret:
        logger.info(f"✅ Success! Secret retrieved. (Length: {len(secret)})")
    else:
        logger.error("❌ Failed to retrieve secret.")
