    # Since you can't download a  .json  key, you have to use a much more secure method called Service Account Impersonation.    
                                                                                                                                
    # This allows your local laptop to temporarily "wear the mask" of the Service Account without downloading any files!         
                                                                                                                                
    # ### 1. Give your human account permission to wear the mask                                                                 
                                                                                                                                
    # Even if you are the project owner, you must explicitly give your human email address permission to generate temporary      
    # tokens for the robot.                                                                                                      
    # (Replace  YOUR_GMAIL@gmail.com  with your actual Google Cloud login email):                                                
                                                                                                                                
# gcloud iam service-accounts add-iam-policy-binding doc-worker@cloudvin48-prjname01.iam.gserviceaccount.com --member="user:cloudvin48@gmail.com" --role="roles/iam.serviceAccountTokenCreator"                                                                     

        # vin@vin-t14s:~/01-prj/doc-micro-access-ctr/services/document_service$ . ./run_generate_token.sh 
        # Updated IAM policy for serviceAccount [doc-worker@cloudvin48-prjname01.iam.gserviceaccount.com].
        # bindings:
        # - members:
        #   - user:cloudvin48@gmail.com
        #   role: roles/iam.serviceAccountTokenCreator
        # etag: BwZULLz47gY=
        # version: 1


    # ### 2. Impersonate the Service Account locally                                                                             
                                                                                                                                
    # Instead of pointing to a  .json  file, you can tell  gcloud  to regenerate your  application_default_credentials.json  file
    # so that it behaves exactly like the robot!                                                                                 
                                                                                                                                
    # Run this command:                                                                                                          
                                                                                                                                
# gcloud auth application-default login --impersonate-service-account=doc-worker@cloudvin48-prjname01.iam.gserviceaccount.com                                                                                                                        

    # Your browser has been opened to visit:

    # https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=764086051850-6qr4p6gpi6hn506pt8ejuq83di341hur.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A8085%2F&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcloud-platform&state=ZuxYM4RrNyfefebD79v99Ji9y9vhem&access_type=offline&code_challenge=3FbtrwPq0WNzsKE95jMJFNeXcbvxW24s4blxdsZFy5g&code_challenge_method=S256

    # Opening in existing browser session.

    # Credentials saved to file: [/home/vin/.config/gcloud/application_default_credentials.json]

# ### 3. Update your  .env  file                                                                                             
                                                                                                                            
# Because you are back to using the default credentials file (but this time, it's wearing the robot's mask), change your     
# /home/vin/01-prj/doc-micro-access-ctr/services/document_service/.env  file back to:                                        
                                                                                                                            
# GOOGLE_APPLICATION_CREDENTIALS=/home/vin/01-prj/doc-micro-access-ctr/keys/application_default_credentials.json           
                                                                                                                            
# (Don't forget to share the Google Sheet with  doc-worker@cloudvin48-prjname01.iam.gserviceaccount.com !)                   
                                                                                                                            
# When you run your test script now, the Google SDK on your laptop will automatically generate a short-lived, highly secure  
# token acting as the Service Account and successfully download the PDF!      