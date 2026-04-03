#!/bin/bash
# Creates the nawhas_test database used by the E2E test overlay.
# This script runs automatically on first postgres container initialisation
# (via /docker-entrypoint-initdb.d) so the test DB is ready before the web
# service tries to run migrations against it.
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  SELECT 'CREATE DATABASE nawhas_test'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'nawhas_test')\gexec
EOSQL
