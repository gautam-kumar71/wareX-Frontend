#!/bin/sh
set -eu

envsubst '${FRONTEND_GATEWAY_URL} ${FRONTEND_GOOGLE_CLIENT_ID} ${FRONTEND_RAZORPAY_KEY_ID}' \
  < /opt/warex/runtime-config.template.js \
  > /usr/share/nginx/html/assets/runtime-config.js
