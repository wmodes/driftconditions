#!/bin/zsh

# Get the name of the current directory
current_folder="${PWD##*/}"

# Check if the current directory is 'interference'
if [[ "$current_folder" != "interference" ]]; then
  echo "Start this script from the root directory 'interference'."
  exit 1
fi

# Change directory to AdminClient
cd AdminClient

# Run the build command
npm run build

echo "Build completed successfully."