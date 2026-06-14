# gcloud iam service-accounts create doc-worker --display-name="Document Service Worker"

# gcloud iam service-accounts keys create /home/vin/01-prj/doc-micro-access-ctr/keys/service_account.json --iam-account=doc-worker@cloudvin48-prjname01.iam.gserviceaccount.com
gcloud auth application-default login --impersonate-service-account=doc-worker@cloudvin48-prjname01.iam.gserviceaccount.com

#  ▸ Thought for 1s, 589 tokens
#   Prioritizing Tool Usage
#   No! And that is exactly why you hit the "This app is blocked" error!       
                                                                             
#   The  /home/vin/01-prj/doc-micro-access-                                    
#   ctr/keys/application_default_credentials.json  file contains the           
#   authentication for a Human User (your personal Gmail account). Google      
#   explicitly blocked your personal Gmail account from using the              
#   drive.readonly  scope through the command line because human Gmail accounts
#   are heavily protected.                                                     
                                                                             
#   A Service Account is an entirely different entity. It is a "robot user"    
#   that you must explicitly create inside your Google Cloud Console.          
                                                                             
#   ### How to get the Service Account                                         
                                                                             
#   Because your human account is blocked, you must create the robot user and  
#   use its credentials instead!                                               
                                                                             
#   You can do this by running these two exact commands in your terminal:      
                                                                             
#   1. Create the Robot User (Service Account):                                
                                                                             
#     gcloud iam service-accounts create doc-worker --display-name="Document   
#   Service Worker"                                                            
                                                                             
#   (This creates a brand new identity in GCP with an email address that looks 
#   like this:  doc-worker@cloudvin48-prjname01.iam.gserviceaccount.com )      
                                                                             
#   2. Download the Robot's JSON Key File:                                     
                                                                             
#     gcloud iam service-accounts keys create /home/vin/01-prj/doc-micro-access-
#   ctr/keys/service_account.json --iam-account=doc-worker@cloudvin48-prjname01.
#   iam.gserviceaccount.com                                                    
                                                                             
#   ### The Final Steps                                                        
                                                                             
#   Once you run those commands:                                               
                                                                             
#   1. Open your Google Sheet in your web browser.                             
#   2. Click Share.                                                            
#   3. Paste the robot's email address ( doc-worker@cloudvin48-prjname01.iam.  
#   gserviceaccount.com ) and make it a Viewer.
#   4. Update your  .env  file to point to the robot's JSON key instead of your
#   human one:
#    GOOGLE_APPLICATION_CREDENTIALS=/home/vin/01-prj/doc-micro-access-         
#   ctr/keys/service_account.json 
  
#   By throwing away your  application_default_credentials.json  file and using
#   the  service_account.json  file instead, you permanently bypass the Google 
#   security blocks!