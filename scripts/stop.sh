#!/bin/bash

# Stop liquidsoap first (depends on mixengine)
sudo systemctl stop liquidsoap
echo "Liquidsoap service has been stopped."

# Stop icecast
sudo systemctl stop icecast2
echo "Icecast service has been stopped."

# Stop mixengine.service
sudo systemctl stop mixengine.service
echo "MixEngine service has been stopped."

# Stop adminserver.service
sudo systemctl stop adminserver.service
echo "AdminServer service has been stopped."

# Stop Caddy service
sudo systemctl stop caddy
echo "Caddy service has been stopped."
