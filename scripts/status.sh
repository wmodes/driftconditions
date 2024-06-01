#!/bin/bash

# Restart Caddy service
sudo systemctl status caddy
echo "Caddy service has been restarted."

# Restart adminserver.service
sudo systemctl status adminserver.service
echo "AdminServer service has been restarted."

# Restart mixengine.service
sudo systemctl status mixengine.service
echo "MixEngine service has been restarted."

# Restart icecast
sudo systemctl status icecast2
echo "Icecast service has been restarted."

# Restart liquidsoap
sudo systemctl status liquidsoap
echo "Liquidsoap service has been restarted."