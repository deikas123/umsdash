# UMS Document Vault - Migration Guide: From Lovable to Full Independence

## Overview

This document provides comprehensive strategies for migrating the UMS Document Vault from Lovable Cloud to a fully independent deployment. Whether you're moving to self-hosted infrastructure, alternative cloud providers, or containerized solutions, this guide covers all aspects of the migration process.

**Current State**: Lovable Cloud (integrated frontend hosting + Supabase backend)
**Target States**: 
- Option A: Self-hosted Supabase + Traditional hosting
- Option B: Self-hosted Supabase + Docker
- Option C: Alternative cloud provider (Vercel, Netlify) + Supabase
- Option D: Complete self-hosted (PostgreSQL, custom auth, storage)

---

## Table of Contents

1. [Pre-Migration Planning](#pre-migration-planning)
2. [Option A: Self-Hosted Supabase + Traditional Hosting](#option-a-self-hosted-supabase--traditional-hosting)
3. [Option B: Docker Containerization](#option-b-docker-containerization)
4. [Option C: Alternative Cloud Provider](#option-c-alternative-cloud-provider)
5. [Option D: Complete Self-Hosted](#option-d-complete-self-hosted)
6. [Data Migration](#data-migration)
7. [Testing & Validation](#testing--validation)
8. [Rollback Procedures](#rollback-procedures)
9. [Post-Migration Operations](#post-migration-operations)

---

## Pre-Migration Planning

### Assessment Checklist

Before starting any migration, evaluate the following:

- [ ] **Current Data Volume**: Document count, total storage size, user count
- [ ] **Traffic Patterns**: Peak concurrent users, document upload/download rates
- [ ] **Compliance Requirements**: Data residency, audit logging, retention policies
- [ ] **Budget**: Infrastructure costs, maintenance overhead, team capacity
- [ ] **Timeline**: Development time, testing period, cutover window
- [ ] **Risk Tolerance**: Critical business systems vs. experimental environment
- [ ] **Team Expertise**: PostgreSQL, DevOps, Docker, infrastructure experience
- [ ] **Support Model**: In-house support vs. managed services vs. hybrid

### Dependency Analysis

#### Lovable-Specific Dependencies
- Lovable build system and deployment pipeline
- Lovable configuration and project settings
- Integration with Lovable CLI tools
- Automatic environment variable management

#### Supabase Dependencies (Already External)
- PostgreSQL database
- Supabase Auth system
- Supabase Storage (S3-compatible)
- Edge functions (Deno)

#### Application Dependencies (Portable)
- React 18 frontend code
- Database schema and migrations
- TypeScript configuration
- Tailwind CSS styling

### Data Backup Strategy

**Before any migration work:**

1. **Full Database Dump**
   ```bash
   # From Lovable/Supabase
   pg_dump postgres://[connection-string] > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Storage Backup**
   ```bash
   # Export all documents from Supabase Storage
   aws s3 sync s3://[bucket-name] ./documents_backup/
   ```

3. **Encryption & Verification**
   ```bash
   # Encrypt backup for secure storage
   gpg --symmetric backup_*.sql
   # Verify integrity
   md5sum backup_*.sql > checksums.txt
   ```

4. **Offsite Storage**
   - Store encrypted backups in multiple geographic locations
   - Document backup restore procedures
   - Test restoration process quarterly

---

## Option A: Self-Hosted Supabase + Traditional Hosting

### Architecture

```
┌─────────────────────────────────────────┐
│     Self-Hosted Infrastructure          │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Frontend (Netlify/Vercel)       │  │
│  │  - React SPA                     │  │
│  │  - Tailwind + shadcn/ui          │  │
│  │  - Auto-deploys from Git         │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Self-Hosted Supabase            │  │
│  │  - PostgreSQL Database           │  │
│  │  - Supabase Auth                 │  │
│  │  - MinIO/S3 Storage              │  │
│  │  - Deno Edge Functions           │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Prerequisites

- Linux server (Ubuntu 20.04+) or Docker-capable host
- Minimum: 4 CPU, 8GB RAM, 100GB storage
- Docker & Docker Compose installed
- Domain name with DNS control
- SSL certificate capability (Let's Encrypt)

### Step 1: Deploy Self-Hosted Supabase

#### Using Docker Compose

1. **Clone Supabase Repository**
   ```bash
   git clone https://github.com/supabase/supabase.git
   cd supabase/docker
   ```

2. **Create Environment Configuration**
   ```bash
   cp .env.example .env
   
   # Edit .env with your configuration
   nano .env
   ```

3. **Configure Environment Variables**
   ```env
   # .env
   POSTGRES_PASSWORD=strong_password_here
   JWT_SECRET=$(openssl rand -base64 32)
   JWT_EXPIRY=3600
   ANON_KEY=$(your-anon-key)
   SERVICE_ROLE_KEY=$(your-service-role-key)
   SITE_URL=https://yourdomain.com
   ADDITIONAL_REDIRECT_URLS=https://yourdomain.com/*
   ```

4. **Launch Services**
   ```bash
   docker-compose up -d
   
   # Verify services are running
   docker-compose ps
   ```

5. **Initialize Database**
   ```bash
   # Access PostgreSQL container
   docker-compose exec postgres psql -U postgres
   
   # Create application database
   CREATE DATABASE ums_vault;
   ```

#### Manual Installation (Non-Docker)

If you prefer traditional Linux installation:

1. **Install PostgreSQL**
   ```bash
   sudo apt-get update
   sudo apt-get install postgresql postgresql-contrib
   sudo systemctl start postgresql
   ```

2. **Install Supabase Components**
   - PostgREST for API layer
   - PostgREST Auth for authentication
   - MinIO or S3 for storage
   - Deno for edge functions

3. **Configure Services**
   - Set up PostgreSQL with required extensions
   - Configure authentication system
   - Set up storage buckets
   - Configure edge function runtime

### Step 2: Migrate Database

1. **Export Current Database**
   ```bash
   # From Lovable Supabase
   export PGPASSWORD="your-password"
   pg_dump -h db.xxx.supabase.co -U postgres \
     --no-owner --no-acl \
     ums_db > migration.sql
   ```

2. **Prepare Schema Only (Recommended)**
   ```bash
   # Extract only schema (no data yet)
   pg_dump -h db.xxx.supabase.co -U postgres \
     --schema-only \
     --no-owner --no-acl \
     ums_db > schema_only.sql
   ```

3. **Import to Self-Hosted Database**
   ```bash
   # For Docker Compose
   docker-compose exec postgres \
     psql -U postgres -d ums_vault -f /path/to/schema_only.sql
   
   # For direct PostgreSQL
   psql -U postgres -d ums_vault -f schema_only.sql
   ```

4. **Verify Schema**
   ```sql
   -- Connect to new database and verify tables
   \dt  -- List tables
   \df  -- List functions
   SELECT * FROM information_schema.tables;
   ```

### Step 3: Configure Storage

#### Option A1: MinIO (S3-Compatible)

```bash
# Install MinIO
docker run -d \
  --name minio \
  -p 9000:9000 \
  -p 9001:9001 \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=minioadmin \
  -v minio_data:/data \
  minio/minio:latest server /data --console-address ":9001"

# Create buckets
docker exec minio mc mb minio/documents
docker exec minio mc mb minio/avatars
```

#### Option A2: AWS S3 or DigitalOcean Spaces

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure

# Create buckets
aws s3 mb s3://ums-documents --region us-east-1
```

### Step 4: Deploy Frontend to Netlify/Vercel

1. **Prepare Repository**
   ```bash
   cd ums-docs-vault
   git remote add production https://github.com/yourusername/ums-docs-vault.git
   git push production main
   ```

2. **Configure Netlify**
   - Connect GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Add environment variables (see below)

3. **Environment Variables (Netlify)**
   ```
   VITE_SUPABASE_URL=https://your-self-hosted-supabase.com
   VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
   VITE_SUPABASE_PROJECT_ID=your_project_id
   ```

4. **Configure Redirects** (`public/_redirects`)
   ```
   /* /index.html 200
   ```

### Step 5: Verify Integration

1. **Health Checks**
   ```bash
   # Test Supabase API
   curl -H "Authorization: Bearer your_anon_key" \
     https://your-supabase-domain/rest/v1/profiles?select=*
   
   # Test Storage
   curl -H "Authorization: Bearer your_anon_key" \
     https://your-supabase-domain/storage/v1/bucket
   ```

2. **Application Testing**
   - Login with test account
   - Upload a test document
   - Verify database entries
   - Verify storage files
   - Test all roles (admin, staff, customer)

---

## Option B: Docker Containerization

### Architecture

```
┌────────────────────────────────────────┐
│        Docker Compose Stack            │
├────────────────────────────────────────┤
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Frontend Container              │ │
│  │  (React + Vite)                  │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  API Gateway                     │ │
│  │  (Nginx/Traefik)                 │ │
│  └──────────────────────────────────┘ │
│                                        │
│  ┌──────────────────────────────────┐ │
│  │  Supabase Services               │ │
│  │  - PostgreSQL                    │ │
│  │  - PostgREST                     │ │
│  │  - Auth                          │ │
│  │  - Storage                       │ │
│  └──────────────────────────────────┘ │
│                                        │
└────────────────────────────────────────┘
```

### Dockerfile for Frontend

```dockerfile
# Frontend Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

RUN npm run build

# Production stage
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Docker Compose Configuration

```yaml
version: '3.8'

services:
  # Frontend
  frontend:
    build:
      context: .
      dockerfile: Dockerfile
      args:
        VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
        VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
        VITE_SUPABASE_PROJECT_ID: ${VITE_SUPABASE_PROJECT_ID}
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - supabase
    networks:
      - ums_network

  # PostgreSQL
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ums_vault
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
    networks:
      - ums_network

  # Supabase Stack (PostgREST, Auth, Storage)
  supabase:
    image: supabase/supabase:latest
    environment:
      POSTGRES_HOST: postgres
      POSTGRES_DB: ums_vault
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      JWT_SECRET: ${JWT_SECRET}
      SITE_URL: ${SITE_URL}
    depends_on:
      - postgres
    ports:
      - "8000:8000"
    networks:
      - ums_network

  # Storage (MinIO)
  minio:
    image: minio/minio:latest
    environment:
      MINIO_ROOT_USER: ${MINIO_ROOT_USER}
      MINIO_ROOT_PASSWORD: ${MINIO_ROOT_PASSWORD}
    volumes:
      - minio_data:/data
    ports:
      - "9000:9000"
      - "9001:9001"
    command: server /data --console-address ":9001"
    networks:
      - ums_network

volumes:
  postgres_data:
  minio_data:

networks:
  ums_network:
    driver: bridge
```

### Build and Deploy

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Verify services
docker-compose ps

# View logs
docker-compose logs -f frontend
docker-compose logs -f postgres

# Stop services
docker-compose down
```

### Kubernetes Deployment (Advanced)

For production at scale, deploy to Kubernetes:

```yaml
# kubernetes/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ums-frontend
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ums-frontend
  template:
    metadata:
      labels:
        app: ums-frontend
    spec:
      containers:
      - name: frontend
        image: your-registry/ums-frontend:latest
        ports:
        - containerPort: 80
        env:
        - name: VITE_SUPABASE_URL
          valueFrom:
            configMapKeyRef:
              name: ums-config
              key: supabase-url
        - name: VITE_SUPABASE_PUBLISHABLE_KEY
          valueFrom:
            secretKeyRef:
              name: ums-secrets
              key: supabase-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

## Option C: Alternative Cloud Provider

### Vercel Deployment

**Advantages**: Zero-config frontend, automatic scaling, Git integration
**Cost**: Starts free, ~$20/month for production

#### Steps

1. **Push to GitHub**
   ```bash
   git push origin main
   ```

2. **Import to Vercel**
   - Visit https://vercel.com/import
   - Select GitHub repository
   - Configure project settings

3. **Set Environment Variables**
   ```
   VITE_SUPABASE_URL=https://your-supabase.com
   VITE_SUPABASE_PUBLISHABLE_KEY=your-key
   VITE_SUPABASE_PROJECT_ID=your-id
   ```

4. **Deploy**
   - Vercel auto-deploys on git push
   - Automatic SSL/TLS
   - CDN included

### Netlify Deployment

**Advantages**: Simple setup, great build cache, generous free tier
**Cost**: Free tier or ~$19/month for features

#### Steps

1. **Connect Repository**
   - Go to https://app.netlify.com
   - Click "New site from Git"
   - Select GitHub repository

2. **Configure Build**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Add Environment Variables**
   - Site settings → Build & deploy → Environment
   - Add Supabase variables

4. **Configure Redirects**
   - Create `public/_redirects`:
     ```
     /* /index.html 200
     ```

5. **Deploy**
   - Automatic on git push
   - Branch previews included

### DigitalOcean App Platform

**Advantages**: Reasonable pricing, integrated container support
**Cost**: ~$12-20/month

#### Steps

1. **Create App**
   - DigitalOcean Dashboard → Apps
   - Connect GitHub repository

2. **Configure App Spec**
   ```yaml
   name: ums-vault
   services:
   - name: frontend
     github:
       repo: youruser/ums-docs-vault
       branch: main
     build_command: npm run build
     source_dir: .
     http_port: 80
     envs:
     - key: VITE_SUPABASE_URL
       value: ${SUPABASE_URL}
   ```

3. **Deploy**
   - Automatic deployments on push

---

## Option D: Complete Self-Hosted

### Full Stack Architecture

```
┌─────────────────────────────────────────┐
│    Complete Self-Hosted Stack           │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Frontend (Nginx/Apache)         │  │
│  │  - Static SPA serving            │  │
│  │  - SSL/TLS termination           │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Backend API Layer               │  │
│  │  - Node.js/Express or FastAPI    │  │
│  │  - Custom authentication         │  │
│  │  - Business logic                │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Database Layer                  │  │
│  │  - PostgreSQL                    │  │
│  │  - Replication/Backup            │  │
│  │  - Monitoring                    │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Storage Layer                   │  │
│  │  - MinIO or local filesystem     │  │
│  │  - Backup system                 │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

### Complete Setup Guide

#### Prerequisites
- Dedicated server or VPS (4GB+ RAM, 100GB+ storage)
- Linux (Ubuntu 20.04 LTS recommended)
- Domain with DNS control
- Admin/root access

#### 1. Server Hardening

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install security tools
sudo apt-get install -y fail2ban ufw

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable

# Fail2Ban protection
sudo systemctl start fail2ban
sudo systemctl enable fail2ban
```

#### 2. Install Core Services

```bash
# Install PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y postgresql-14 postgresql-contrib

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Nginx
sudo apt-get install -y nginx

# Install Certbot for SSL
sudo apt-get install -y certbot python3-certbot-nginx
```

#### 3. Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create application database
CREATE DATABASE ums_vault;
CREATE USER ums_user WITH PASSWORD 'secure_password_here';
ALTER ROLE ums_user SET client_encoding TO 'utf8';
ALTER ROLE ums_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE ums_user SET default_transaction_deferrable TO on;
ALTER ROLE ums_user SET default_time_zone TO 'UTC';
GRANT ALL PRIVILEGES ON DATABASE ums_vault TO ums_user;
```

#### 4. Migrate Database Schema

```bash
# Export from existing database
pg_dump -h old-host -U old-user -d old_db > schema.sql

# Import to new database
psql -U ums_user -d ums_vault -f schema.sql
```

#### 5. Configure Nginx

```nginx
# /etc/nginx/sites-available/ums-vault
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Static frontend
    location / {
        root /var/www/ums-vault;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 6. Setup SSL Certificate

```bash
sudo certbot certonly --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Data Migration

### Phase 1: Pre-Migration Validation

```sql
-- Verify data integrity
SELECT COUNT(*) FROM documents;
SELECT COUNT(*) FROM customers;
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM audit_logs;

-- Check for orphaned records
SELECT d.id FROM documents d 
WHERE NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = d.customer_id);
```

### Phase 2: Backup & Export

```bash
# Full database backup
pg_dump -Fc original_db > backup_full.dump

# Documents storage backup
aws s3 sync s3://original-bucket ./documents_backup/

# Verify backup integrity
file backup_full.dump
ls -lh documents_backup/
```

### Phase 3: Schema Migration

```sql
-- Create schemas in new database
CREATE SCHEMA public;

-- Restore schema only (no data)
pg_restore --schema-only -d new_db backup_full.dump

-- Verify schema
\dt
\df
```

### Phase 4: Data Migration Strategy

#### Option 1: Direct Restore
```bash
pg_restore -d new_db backup_full.dump
```

#### Option 2: Staged Migration (Recommended)
```sql
-- Migrate data in batches (less disruption)
BEGIN TRANSACTION;

-- Disable triggers temporarily
ALTER TABLE documents DISABLE TRIGGER ALL;

-- Insert data
INSERT INTO documents SELECT * FROM old_db.documents;

-- Re-enable triggers
ALTER TABLE documents ENABLE TRIGGER ALL;

COMMIT;
```

### Phase 5: Storage Migration

```bash
# For S3 to MinIO
mc mirror s3://original-bucket minio/documents/

# For Supabase Storage to MinIO
# Use Supabase CLI to export storage
supabase storage export

# Import to MinIO
mc cp -r ./exported-storage/ minio/documents/
```

### Phase 6: Validation & Testing

```sql
-- Count comparison
SELECT COUNT(*) FROM documents;  -- Should match old count

-- Data integrity checks
SELECT * FROM documents WHERE is_private IS NULL;  -- Check for NULLs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;  -- Check recent
```

---

## Testing & Validation

### Pre-Cutover Testing

#### 1. Functional Testing

```typescript
// Test authentication
test('User can login', async () => {
  const response = await client.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password',
  });
  expect(response.data.user).toBeDefined();
});

// Test RLS policies
test('Customer can only see own documents', async () => {
  const docs = await fetchDocuments('customer-user-id');
  expect(docs.every(d => d.customer_id === expectedCustomerId)).toBe(true);
});
```

#### 2. Performance Testing

```bash
# Load testing - response times should be < 500ms
# Database queries should complete in < 1 second
# Storage operations should complete in < 2 seconds
```

#### 3. Security Testing

- [ ] RLS policies enforced correctly
- [ ] No data leakage between users
- [ ] Authentication tokens properly validated
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Input validation working
- [ ] Audit logging capturing events

#### 4. Compatibility Testing

- [ ] All browsers (Chrome, Firefox, Safari, Edge)
- [ ] Mobile devices (iOS, Android)
- [ ] Network conditions (3G, 4G, WiFi)

---

## Rollback Procedures

### Immediate Rollback (Minutes)

```bash
# 1. Switch DNS back to old environment
# Update your domain's DNS A record to point to old IP

# 2. Update frontend configuration
# Point VITE_SUPABASE_URL back to old endpoints

# 3. Clear CDN cache if applicable

# 4. Notify users
```

### Database Rollback (If Data Modified)

```bash
# Restore from backup
pg_restore -d ums_vault backup_full.dump
```

### Storage Rollback

```bash
# Restore from backup if files deleted
aws s3 sync ./storage_backup/ s3://your-bucket/
```

---

## Post-Migration Operations

### 1. Monitoring Setup

```bash
# Install monitoring tools
sudo apt-get install -y prometheus grafana node-exporter

# Setup alerts for:
# - Database connection pool saturation
# - Storage usage growth
# - API response times
# - Error rates
# - SSL certificate expiration
```

### 2. Backup Automation

```bash
#!/bin/bash
BACKUP_DIR="/backups/ums-vault"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Database backup
pg_dump -Fc ums_vault > $BACKUP_DIR/db_$TIMESTAMP.dump

# Encrypt and upload to offsite
gpg --symmetric $BACKUP_DIR/db_$TIMESTAMP.dump
aws s3 cp $BACKUP_DIR/db_$TIMESTAMP.dump.gpg s3://backup-bucket/
```

### 3. Performance Optimization

- Enable caching headers on frontend
- Implement database query optimization
- Setup Redis for session/cache management
- Configure CDN for static assets

### 4. Documentation Updates

- [ ] Update internal wiki with new infrastructure
- [ ] Document new deployment procedures
- [ ] Create runbooks for common issues
- [ ] Train team on new systems
- [ ] Update SLAs and monitoring

### 5. Decommissioning Old Infrastructure

- [ ] Verify new system running smoothly (48-72 hours)
- [ ] Archive old project
- [ ] Release Lovable project
- [ ] Keep backups for archival

---

## Success Criteria

Migration is considered successful when:

- ✅ All data migrated and verified
- ✅ Zero downtime cutover achieved
- ✅ All functionality tested and working
- ✅ Performance acceptable (response times < 500ms)
- ✅ Monitoring and alerts configured
- ✅ Backups working reliably
- ✅ Team trained on new infrastructure
- ✅ No regression in security
- ✅ Cost under budget

---

*Last Updated: June 2026*
*Version: 1.0*
*Status: Active*
