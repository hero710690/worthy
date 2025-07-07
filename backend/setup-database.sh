#!/bin/bash

# Database Setup Script for Worthy App

echo "🗄️  Setting up PostgreSQL database for Worthy app..."

# For local development, you can use Docker:
echo "Option 1: Local PostgreSQL with Docker"
echo "docker run --name worthy-postgres -e POSTGRES_DB=worthy -e POSTGRES_USER=worthy_admin -e POSTGRES_PASSWORD=REDACTED_DB_PASSWORD -p 5432:5432 -d postgres:15"

echo ""
echo "Option 2: AWS RDS (requires proper IAM permissions)"
echo "Run the following command with appropriate AWS credentials:"
echo ""
echo "aws rds create-db-instance \\"
echo "    --db-instance-identifier worthy-db-dev \\"
echo "    --db-instance-class db.t3.micro \\"
echo "    --engine postgres \\"
echo "    --engine-version 15.4 \\"
echo "    --master-username worthy_admin \\"
echo "    --master-user-password 'REDACTED_DB_PASSWORD' \\"
echo "    --allocated-storage 20 \\"
echo "    --storage-type gp2 \\"
echo "    --db-name worthy \\"
echo "    --backup-retention-period 7 \\"
echo "    --storage-encrypted \\"
echo "    --publicly-accessible \\"
echo "    --region us-east-1"

echo ""
echo "After database is ready, update your .env file with the connection string:"
echo "DATABASE_URL=postgresql://worthy_admin:REDACTED_DB_PASSWORD@your-db-endpoint:5432/worthy"
