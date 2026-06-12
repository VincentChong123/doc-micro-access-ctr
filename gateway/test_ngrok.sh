 curl -X POST https://supply-various-paralyze.ngrok-free.dev/api/workflow/approve -H "Content-Type:
 application/json" -d '{"action": "submit_for_approval", "user": "test.terminal@mufg.jp", "data": [["Mock Cell", "Data"]]}'
# {"status":"success","message":"PDF generation started in background."}⏎
