#!/bin/bash
set -e

# Find pg config directory
PG_CONF=$(find /etc/postgresql -name postgresql.conf | head -n 1)
PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -n 1)

if [ -n "$PG_CONF" ]; then
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"
    sed -i "s/listen_addresses = 'localhost'/listen_addresses = '*'/g" "$PG_CONF"
fi

if [ -n "$PG_HBA" ]; then
    grep -q "host all all 0.0.0.0/0 trust" "$PG_HBA" || echo "host all all 0.0.0.0/0 trust" >> "$PG_HBA"
    grep -q "host all all ::0/0 trust" "$PG_HBA" || echo "host all all ::0/0 trust" >> "$PG_HBA"
fi

service postgresql restart

su - postgres << 'EOF'
psql -c "CREATE USER resumate WITH PASSWORD 'resumate_secret' SUPERUSER CREATEDB;" 2>/dev/null || psql -c "ALTER USER resumate WITH PASSWORD 'resumate_secret';"
createdb -O resumate omniedu_db 2>/dev/null || true
psql -d omniedu_db -c "GRANT ALL PRIVILEGES ON DATABASE omniedu_db TO resumate;"
EOF

echo "PostgreSQL setup complete and accepting connections"
