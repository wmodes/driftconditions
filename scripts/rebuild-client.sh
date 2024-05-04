#!/bin/zsh

# Ensure the script runs in the 'interference' directory
if [[ $(basename "$PWD") != "interference" ]]; then
  echo "Start this script from the root directory 'interference'."
  exit 1
fi

# Change directory to AdminClient
cd AdminClient

# Run npm build
npm run build
