#!/bin/bash#!/bin/bash



# Wait for FHIR server to be ready# Wait for FHIR server to be ready

# This script checks if the FHIR server metadata endpoint is accessible# This script checks if the FHIR server metadata endpoint is accessible



set -eset -e



FHIR_URL="${FHIR_SERVER_URL:-http://fhir-server:52773/fhir/r4}"FHIR_URL="${FHIR_SERVER_URL:-http://fhir-server:52773/fhir/r4}"

METADATA_URL="${FHIR_URL}/metadata"METADATA_URL="${FHIR_URL}/metadata"

MAX_RETRIES=30MAX_RETRIES=30

RETRY_INTERVAL=2RETRY_INTERVAL=2



echo "Waiting for FHIR server at ${METADATA_URL}..."echo "Waiting for FHIR server at ${METADATA_URL}..."



for i in $(seq 1 $MAX_RETRIES); dofor i in $(seq 1 $MAX_RETRIES); do

  if curl -sf "${METADATA_URL}" > /dev/null 2>&1; then  if curl -sf "${METADATA_URL}" > /dev/null 2>&1; then

    echo "FHIR server is ready!"    echo "FHIR server is ready!"

    exit 0    exit 0

  fi  fi

    

  echo "FHIR server not ready yet (attempt $i/$MAX_RETRIES)..."  echo "FHIR server not ready yet (attempt $i/$MAX_RETRIES)..."

  sleep $RETRY_INTERVAL  sleep $RETRY_INTERVAL

donedone



echo "Error: FHIR server did not become ready within the expected time"echo "Error: FHIR server did not become ready within the expected time"

echo "Continuing anyway, but FHIR-related features may not work initially"echo "Continuing anyway, but FHIR-related features may not work initially"

exit 0  # Exit with 0 to allow the application to start anywayexit 0  # Exit with 0 to allow the application to start anyway

