#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "Starting Django application..."

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL..."
while ! nc -z $POSTGRES_HOST $POSTGRES_PORT; do
  sleep 0.1
done
echo "PostgreSQL started"

# Wait for FHIR server to be ready
if [ -f /code/wait-for-fhir.sh ]; then
  chmod +x /code/wait-for-fhir.sh
  /code/wait-for-fhir.sh
fi

# Run database migrations
echo "Running database migrations..."
python manage.py migrate --noinput

# Collect static files (pro produkci)
if [ "$DJANGO_DEBUG" != "True" ]; then
  echo "Collecting static files..."
  python manage.py collectstatic --noinput
fi

# Create superuser if it doesn't exist (only in dev)
if [ "$DJANGO_DEBUG" = "True" ] && [ -n "$DJANGO_SUPERUSER_USERNAME" ]; then
  echo "Creating superuser..."
  python manage.py createsuperuser \
    --noinput \
    --username $DJANGO_SUPERUSER_USERNAME \
    --email $DJANGO_SUPERUSER_EMAIL || true
fi

# Initialize operating rooms and doctors in FHIR server if they don't exist
echo "Initializing operating rooms in FHIR server..."
python manage.py init_operating_rooms --count 10 || echo "Warning: Could not initialize operating rooms (FHIR server may not be ready yet)"

echo "Initializing doctors in FHIR server..."
python manage.py init_doctors || echo "Warning: Could not initialize doctors (FHIR server may not be ready yet)"

# Start server based on environment
if [ "$DJANGO_DEBUG" = "True" ]; then
  echo "Starting development server..."
  python manage.py runserver 0.0.0.0:8000
else
  echo "Starting production server with Gunicorn..."
  gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --threads 2 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
fi

