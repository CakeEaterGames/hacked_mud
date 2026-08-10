#!/bin/bash

# This is partially AI slop. Sorry... not sorry...

# Default values
DEFAULT_BACKEND_PORT=4434
DEFAULT_FRONTEND_PORT=4435

# Automatically detect the IP address
# Try to get the primary IP address (excluding loopback)
IP_ADDRESS=$(ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1)

# If ip command fails, try ifconfig
if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS=$(ifconfig | grep -oP '(?<=inet\s)\d+(\.\d+){3}' | grep -v '127.0.0.1' | head -n 1)
fi

# If still no IP, try hostname
if [ -z "$IP_ADDRESS" ]; then
    IP_ADDRESS=$(hostname -I | awk '{print $1}')
fi

echo ""
echo "======================================================"
echo "            hacked mud preparation script             "
echo "======================================================"
echo ""


# Ask for ports with defaults
read -p "Enter Backend port [or leave empty for default $DEFAULT_BACKEND_PORT]: " BACKEND_PORT
BACKEND_PORT=${BACKEND_PORT:-$DEFAULT_BACKEND_PORT}

read -p "Enter Frontend port [or leave empty for default $DEFAULT_FRONTEND_PORT]: " FRONTEND_PORT
FRONTEND_PORT=${FRONTEND_PORT:-$DEFAULT_FRONTEND_PORT}

# Base URLs
API_BASE_URL="/hacked_mud_api"
DASHBOARD_FRONTEND_BASE_URL="/hacked_mud_dashboard"

# Generate the .env file
cat > ./deploy/.env << EOF
API_PORT=$BACKEND_PORT
API_BASE_URL="$API_BASE_URL"
API_FULL_URL="http://$IP_ADDRESS:$BACKEND_PORT$API_BASE_URL"

DASHBOARD_FRONTEND_PORT=$FRONTEND_PORT
DASHBOARD_FRONTEND_BASE_URL="$DASHBOARD_FRONTEND_BASE_URL"
DASHBOARD_FRONTEND_FULL_URL="http://$IP_ADDRESS:$FRONTEND_PORT$DASHBOARD_FRONTEND_BASE_URL"

NODE_ENV=development
LOGS_FOLDER_PATH="~/services/hacked_mud/logs"
DISPLAY_TO_USE=0
EOF

echo ""
echo ""
echo "✅ ✅ ✅"
echo "Environment file generated at ./deploy/.env"
echo "You can later edit it manually if you want"
echo ""
echo "After launching the application:"
echo "- open http://$IP_ADDRESS:$FRONTEND_PORT$DASHBOARD_FRONTEND_BASE_URL in your browser to see the client"
echo "- open http://$IP_ADDRESS:$BACKEND_PORT$API_BASE_URL/docs in your browser to see the API documentation"