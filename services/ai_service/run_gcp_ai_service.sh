gcloud run deploy ai-service --source ./ --region us-central1 --allow-unauthenticated --set-secrets=GROQ_API_KEY=GROQ_API_KEY:latest

# (ai_service) vin@vin-t14s ~/0/d/infrastructure (main) [127]> . ./run_gcp_ai_service.sh
# The following APIs are not enabled on project [cloudvin48-prjname01]:
#         cloudbuild.googleapis.com

# Do you want enable these APIs to continue (this will take a few minutes)? (Y/n)?  y

# Enabling APIs on project [cloudvin48-prjname01]...
# Operation "operations/acf.p2-543095975317-121ba5cd-5670-4d1a-8dcd-3d65aa883c01" finished successfully.
# Deploying from source requires an Artifact Registry Docker repository to store built 
# containers. A repository named [cloud-run-source-deploy] in region [us-central1] will be 
# created.

# Do you want to continue (Y/n)?  y

# Building using Dockerfile and deploying container to Cloud Run service [ai-service] in project [cloudvin48-prjname01] region [us-central1]
# ✓ Building and deploying new service... Done.                                                 
#   ✓ Creating Container Repository...                                                          
#   ✓ Validating configuration...                                                               
#   ✓ Uploading sources...                                                                      
#   ✓ Building Container... Logs are available at [ https://console.cloud.google.com/cloud-build
#   /builds;region=us-central1/d529a01b-38f2-4e64-a27a-b82572db06b4?project=543095975317 ].     
#   ✓ Creating Revision...                                                                      
#   ✓ Routing traffic...                                                                        
#   ✓ Setting IAM Policy...                                                                     
# Done.                                                                                         
# Service [ai-service] revision [ai-service-00001-lz2] has been deployed and is serving 100 percent of traffic.
# Service URL: https://ai-service-543095975317.us-central1.run.app