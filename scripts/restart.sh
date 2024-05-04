#!/bin/zsh

# Restart Caddy service
sudo systemctl restart caddy
echo "Caddy service has been restarted."

# Restart adminserver.service
sudo systemctl restart adminserver.service
echo "AdminServer service has been restarted."
