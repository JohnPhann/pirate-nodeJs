#!/bin/bash

# Create certs directory if it doesn't exist
mkdir -p certs
cd certs

# Generate private key
openssl genrsa -out key.pem 2048

# Generate certificate signing request
openssl req -new -key key.pem -out csr.pem -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -in csr.pem -signkey key.pem -out cert.pem -days 365

echo "SSL certificates generated successfully in the certs directory"
cd .. 