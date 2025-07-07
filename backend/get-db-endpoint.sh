#!/bin/bash

# Script to get RDS database endpoint and create connection string

REGION=${AWS_DEFAULT_REGION:-ap-northeast-1}

echo "🔍 Getting RDS database endpoint in region: $REGION..."

# Get the database endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier worthy-db-dev \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $REGION 2>/dev/null)

if [ "$DB_ENDPOINT" = "None" ] || [ -z "$DB_ENDPOINT" ]; then
    echo "❌ Database not found or not ready yet."
    echo "Check if the database exists:"
    aws rds describe-db-instances --db-instance-identifier worthy-db-dev --query 'DBInstances[0].DBInstanceStatus' --output text --region $REGION
    exit 1
fi

# Get the database port
DB_PORT=$(aws rds describe-db-instances \
    --db-instance-identifier worthy-db-dev \
    --query 'DBInstances[0].Endpoint.Port' \
    --output text \
    --region $REGION)

# Create the connection string
DATABASE_URL="postgresql://worthy_admin:WorthyApp2025!@${DB_ENDPOINT}:${DB_PORT}/worthy"

echo "✅ Database endpoint found!"
echo "📋 Connection details:"
echo "   Region: $REGION"
echo "   Endpoint: $DB_ENDPOINT"
echo "   Port: $DB_PORT"
echo "   Database: worthy"
echo "   Username: worthy_admin"
echo ""
echo "🔗 Full connection string:"
echo "DATABASE_URL=$DATABASE_URL"
echo ""
echo "📝 Add this to your .env file:"
echo "DATABASE_URL=$DATABASE_URL"

# Test connection (optional)
echo ""
echo "🧪 Testing connection..."
if command -v psql &> /dev/null; then
    echo "Testing with psql..."
    psql "$DATABASE_URL" -c "SELECT version();" 2>/dev/null && echo "✅ Connection successful!" || echo "❌ Connection failed!"
else
    echo "psql not found. Install PostgreSQL client to test connection."
fi
