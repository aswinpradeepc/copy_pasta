#!/bin/bash
echo "Starting update process..."
git pull
pm2 restart simple-chat-app
echo "Update complete!"
