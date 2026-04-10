#!/bin/bash

# Ensure the script runs in the 'driftconditions' directory
if [[ $(basename "$PWD") != "driftconditions" ]]; then
  echo "Start this script from the root directory 'driftconditions'."
  exit 1
fi

# Change directory to AdminClient
cd AdminClient

# make sure we have all the modules we need
npm install

# Run npm build
npm run build
