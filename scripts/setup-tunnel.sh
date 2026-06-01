#!/bin/bash

# Configuration
TUNNEL_NAME="zhop-dev"
DOMAIN="dev.zhop.app"
CONFIG_PATH="apps/web/tunnel.yml"

echo "🚀 Setting up Cloudflare Tunnel for $DOMAIN..."

# 1. Check for login
if [ ! -f ~/.cloudflared/cert.pem ]; then
  echo "⚠️  No certificate found. You need to login first."
  echo "Please select 'zhop.app' when the browser opens."
  cloudflared tunnel login
else
  echo "✅  Already logged in."
fi

# 2. Create Tunnel (ignore error if exists)
echo "📦  Ensuring tunnel '$TUNNEL_NAME' exists..."
create_output=$(cloudflared tunnel create $TUNNEL_NAME 2>&1)
if [[ $create_output == *"already exists"* ]]; then
  echo "   -> Tunnel already exists (using existing)."
else
  echo "   -> Tunnel created."
fi

# 3. Route DNS
echo "🌐  Routing $DOMAIN to this tunnel..."
cloudflared tunnel route dns $TUNNEL_NAME $DOMAIN

# 4. Get Tunnel ID and Credentials File
# We can find the JSON file related to the tunnel. 
# Usually named <UUID>.json in ~/.cloudflared/
# Since we know the tunnel name, let's try to list request it.
# A simpler way for dev scripts is often just grepping the json files.

echo "📝  Generating configuration file..."

# Find the credentials file that was just created/updated
# This is a bit heuristic but works for single-user dev setups
CRED_FILE=$(ls -t ~/.cloudflared/*.json | head -n 1)

if [ -z "$CRED_FILE" ]; then
  echo "❌  Error: Could not find tunnel credentials file."
  exit 1
fi

echo "   -> Found credentials: $CRED_FILE"

cat <<EOF > $CONFIG_PATH
tunnel: $TUNNEL_NAME
credentials-file: $CRED_FILE

ingress:
  - hostname: $DOMAIN
    service: http://localhost:3000
  - service: http_status:404
EOF

echo "✅  Configuration generated at $CONFIG_PATH"
echo ""
echo "🎉  Setup Complete!"
echo "To start the tunnel, run:"
echo "   bun run tunnel"
