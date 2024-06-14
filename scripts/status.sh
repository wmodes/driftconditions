#!/bin/bash

echo
echo "# SYSTEM STATUS #"
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

# mysql service
echo "## MYSQL SERVICE ##"
sudo systemctl status mysql -n 0 --no-pager
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

# Restart Caddy service
echo "## CADDY SERVICE ##"
sudo systemctl status caddy -n 0 --no-pager
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

# Restart adminserver.service
echo "## ADMINSERVER SERVICE ##"
sudo systemctl status adminserver.service -n 0 --no-pager
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

# Restart mixengine.service
echo "## MIXENGINE SERVICE ##"
sudo systemctl status mixengine.service -n 0 --no-pager
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

# Restart icecast
echo "## ICECAST SERVICE ##"
sudo systemctl status icecast2 -n 0 --no-pager
printf '%*s\n' "${COLUMNS:-$(tput cols)}" '' | tr ' ' -

# Restart liquidsoap
echo "## LIQUIDSOAP SERVICE ##"
sudo systemctl status liquidsoap -n 0 --no-pager
