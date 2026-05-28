#!/bin/bash
# ── Generate self-signed TLS certificate for development ─────────
# In production, replace with Let's Encrypt:
#   certbot --nginx -d yourdomain.com
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

CERTS_DIR="$(dirname "$0")/certs"
mkdir -p "$CERTS_DIR"

# Generate a self-signed certificate valid for 365 days
openssl req -x509 \
    -newkey rsa:4096 \
    -keyout "$CERTS_DIR/server.key" \
    -out "$CERTS_DIR/server.crt" \
    -days 365 \
    -nodes \
    -subj "/C=IN/ST=State/L=City/O=DeadStream/OU=Dev/CN=localhost" \
    -addext "subjectAltName=DNS:localhost,DNS:deadstream.local,IP:127.0.0.1"

echo "✅ Self-signed certificate generated:"
echo "   Key:  $CERTS_DIR/server.key"
echo "   Cert: $CERTS_DIR/server.crt"
echo ""
echo "⚠️  For production, replace these with Let's Encrypt certificates!"
