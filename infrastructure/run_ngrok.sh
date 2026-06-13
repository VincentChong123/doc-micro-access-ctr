ps aux | grep ngrok
#sudo kill -9 $(pgrep ngrok)
echo
echo
echo

ngrok http --url=supply-various-paralyze.ngrok-free.dev 3000
