#!/bin/bash

echo ""
echo "========================================="
echo "  Home Assistant Diorama — Deploy"
echo "========================================="
echo ""

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
    echo "No .env file found. Setting up configuration now."
    echo ""

    read -p "Enter your Home Assistant address (e.g. http://192.168.1.100:8123): " HA_URL

    echo "HA_URL=$HA_URL" > "$ENV_FILE"

    echo ""
    echo "Configuration saved to .env"
else
    echo "Found existing .env file."
fi

echo ""
echo "Building and starting the container..."
echo "(this may take a few minutes on first run)"
echo ""

docker compose up -d --build

if [ $? -eq 0 ]; then
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "localhost")
    echo ""
    echo "========================================="
    echo "  Done!"
    echo "  Open: http://${IP}:3000"
    echo "========================================="
    echo ""
else
    echo ""
    echo "Something went wrong. Check the logs:"
    echo "  docker compose logs"
    echo ""
fi
