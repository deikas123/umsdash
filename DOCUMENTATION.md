# UMS Document Vault - Project Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [User Roles & Permissions](#user-roles--permissions)
4. [Features](#features)
5. [Database Schema](#database-schema)
6. [Authentication & Security](#authentication--security)
7. [File Structure](#file-structure)
8. [Key Components](#key-components)
9. [Edge Functions](#edge-functions)
10. [Development Guidelines](#development-guidelines)
11. [Deployment](#deployment)
12. [Monitoring & Maintenance](#monitoring--maintenance)
13. [Support & Resources](#support--resources)

---

## Project Overview

**UMS Document Vault** is a secure, role-based document management system designed for organizations to manage, store, and share documents with customers. The platform provides a hierarchical access control model with comprehensive audit logging for compliance.

### Key Capabilities
- Secure document upload, storage, and retrieval
- Role-based access control (RBAC) with three distinct roles
- Customer account management with bulk import capability
- Private folder system with granular sharing capabilities
- Document categorization and full-text search
- Comprehensive audit logging for compliance
- Mobile support with camera capture
- Document preview (PDF, images)
- Analytics dashboard
- Inactivity-based session management

### Core Principles
- **Security First**: Row-level security (RLS) enforces permissions at the database layer
- **Compliance Ready**: Audit logging captures all significant actions
- **Role-Based Access**: Hierarchical permission model (Admin → Staff → Customer)
- **Scalable Architecture**: Designed to support enterprise document workflows

---

## Technology Stack

### Frontend
| Technology | Purpose | Version |
|------------|---------|---------|
| React 18+ | UI framework | Latest |
| TypeScript | Type-safe development | Strict mode |
| Vite | Build tool & dev server | 5.0+ |
| Tailwind CSS | Utility-first styling | 3.0+ |
| shadcn/ui | Component library | Latest |
| React Router DOM | Client-side routing | 6.0+ |
| TanStack React Query | Server state management | 5.0+ |
| React Hook Form | Form handling & validation | Latest |
| Zod | Schema validation | 3.0+ |
| Lucide React | Icon library | Latest |
| Recharts | Data visualization | Latest |

### Backend
| Technology | Purpose | Notes |
|------------|---------|-------|
| PostgreSQL 14+ | Relational database | Production-ready |
| Row Level Security (RLS) | Data access control | Enforced at DB layer |
| Supabase Auth | User authentication | Email/password, OAuth ready |
| Supabase Storage | File storage | S3-compatible |
| Deno | Edge function runtime | TypeScript-native |

### Deployment Platforms (Production Options)
| Platform | Purpose | Status |
|----------|---------|--------|
| Lovable Cloud | Current deployment | Fully supported |
| Netlify/Vercel | Alternative SPA hosting | Supported |
| Docker | Containerized deployment | Community-supported |
| Self-hosted Supabase | Full independence | Advanced |

---

## User Roles & Permissions

The system implements three distinct user roles with hierarchical permissions:

### 1. Admin
**Access Level**: Full system control
- ✅ Create, edit, delete all user accounts (staff and customers)
- ✅ Manage all documents and categories
- ✅ View all customers and documents
- ✅ Access and export audit logs
- ✅ Configure system settings and categories
- ✅ View analytics dashboard and reports
- ✅ Perform initial system setup
- ❌ No restrictions on any operations

**Database Permissions**: All tables via RLS policies

### 2. Staff
**Access Level**: Operational user with limited management
- ✅ Upload documents for any customer
- ✅ View all customer documents
- ✅ Approve/archive document status
- ✅ Create and manage private folders
- ✅ Share folders with other users
- ✅ Search across all documents
- ✅ Download documents
- ❌ Cannot access user management
- ❌ Cannot view audit logs
- ❌ Cannot modify system settings

**Database Permissions**: Documents, folders, categories (via RLS policies)

### 3. Customer
**Access Level**: Self-service document access
- ✅ View their own documents (linked via account number)
- ✅ Download assigned documents
- ✅ Access shared folders (read-only unless edit granted)
- ✅ Manage personal profile
- ❌ Cannot see private documents
- ❌ Cannot see other customers' documents
- ❌ Cannot upload documents
- ❌ Cannot access any admin features

**Database Permissions**: Own customer data only (via RLS policies)

---

## Features

### Document Management
- **Upload**: Drag-and-drop or click-to-upload with file type validation (PDF, images, common office formats)
- **Categories**: Customizable document categories with color coding for visual organization
- **Status Workflow**: Documents progress through `pending` → `approved` → `archived` states
- **Privacy Toggle**: Mark documents as private to hide from customer portals
- **Preview**: In-browser preview for PDFs and images with zoom controls
- **Download**: Secure signed URL generation with configurable expiration
- **Metadata**: Track file name, type, size, upload date, and uploader

### Customer Management
- **Create**: Individual customer record creation
- **Bulk Import**: CSV import for multiple customers at once
- **Link**: Associate customers with user accounts for portal access
- **Browse**: View all documents associated with a customer
- **Edit**: Modify customer details (name, email, phone, address)
- **Protect**: Prevent deletion of customers with linked documents
- **Search**: Find customers by name, email, or account number

### Folder System (Private Folders)
- **Create**: Personal folders with optional descriptions
- **Upload**: Direct document upload to folders with drag-and-drop
- **Share**: Grant view or edit permissions to other users
- **Move**: Reorganize documents between folders
- **Mobile Capture**: Camera capture for direct mobile uploads
- **Permissions**: Granular folder-level sharing with edit controls
- **Delete**: Remove empty folders with confirmation

### Search & Discovery
- **Global Search**: Full-text search across all documents (title, description)
- **Filters**: Filter by customer, category, status, or date range
- **Real-time**: Results update as user types
- **Advanced**: Combine multiple filters for precise queries

### Audit Logging
- **Tracking**: Record all significant system actions with timestamps
- **Details**: Capture user ID, action type, affected entity, and optional metadata
- **IP Logging**: Record IP address for security compliance
- **Retention**: Configurable retention policy for audit records
- **Admin Access**: Audit logs accessible only to administrators
- **Export**: Export audit logs for compliance reporting

### Dashboard & Analytics
- **Statistics**: Real-time document and customer counts
- **Status Distribution**: Visual breakdown of document statuses
- **Category Analytics**: Document distribution across categories
- **Activity Feed**: Recent system activities and changes
- **User Activity**: Track user login and action patterns

---

## Database Schema

### Core Tables

#### `auth.users` (Supabase Native)
```sql
- id: UUID (PK)
- email: TEXT
- email_confirmed_at: TIMESTAMPTZ
- encrypted_password: TEXT
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

#### `profiles`
Stores extended user profile information.
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users, ON DELETE CASCADE)
- full_name: TEXT
- email: TEXT (denormalized)
- phone: TEXT (nullable)
- avatar_url: TEXT (nullable)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

INDEX: user_id, email
```

#### `user_roles`
Maps users to their application role (admin, staff, customer).
```sql
- id: UUID (PK)
- user_id: UUID (FK to auth.users, ON DELETE CASCADE)
- role: app_role ENUM ('admin', 'staff', 'customer')
- created_at: TIMESTAMPTZ

UNIQUE: user_id
INDEX: role
```

#### `customers`
Customer records that can be linked to user accounts for portal access.
```sql
- id: UUID (PK)
- account_number: TEXT (unique)
- full_name: TEXT
- email: TEXT (nullable)
- phone: TEXT (nullable)
- address: TEXT (nullable)
- user_id: UUID (nullable, FK to auth.users, ON DELETE SET NULL)
- created_by: UUID (FK to auth.users)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

INDEX: account_number, user_id, created_by
```

#### `document_categories`
Categories for organizing documents with display settings.
```sql
- id: UUID (PK)
- name: TEXT (unique)
- description: TEXT (nullable)
- display_order: INTEGER
- color: TEXT (hex color code)
- is_active: BOOLEAN (default true)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

INDEX: display_order, is_active
```

#### `documents`
Main document records with comprehensive metadata.
```sql
- id: UUID (PK)
- customer_id: UUID (FK to customers, ON DELETE CASCADE)
- category_id: UUID (FK to document_categories)
- title: TEXT
- description: TEXT (nullable)
- file_name: TEXT
- file_path: TEXT (storage path)
- file_type: TEXT (MIME type)
- file_size: BIGINT (bytes)
- status: document_status ENUM ('pending', 'approved', 'archived')
- is_private: BOOLEAN (default false)
- uploaded_by: UUID (FK to auth.users)
- approved_by: UUID (nullable, FK to auth.users)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

INDEX: customer_id, category_id, status, is_private, created_at
```

#### `folders`
Private folder containers for organizing documents.
```sql
- id: UUID (PK)
- name: TEXT
- description: TEXT (nullable)
- owner_id: UUID (FK to auth.users, ON DELETE CASCADE)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ

INDEX: owner_id
```

#### `folder_documents`
Documents stored within private folders.
```sql
- id: UUID (PK)
- folder_id: UUID (FK to folders, ON DELETE CASCADE)
- file_name: TEXT
- file_path: TEXT
- file_type: TEXT
- file_size: BIGINT
- uploaded_by: UUID (FK to auth.users)
- created_at: TIMESTAMPTZ

INDEX: folder_id, uploaded_by
```

#### `folder_shares`
Sharing permissions for folders with granular access control.
```sql
- id: UUID (PK)
- folder_id: UUID (FK to folders, ON DELETE CASCADE)
- shared_with_user_id: UUID (FK to auth.users, ON DELETE CASCADE)
- can_edit: BOOLEAN (default false)
- created_at: TIMESTAMPTZ
- created_by: UUID (FK to auth.users)

UNIQUE: (folder_id, shared_with_user_id)
INDEX: shared_with_user_id
```

#### `audit_logs`
Comprehensive system activity logging for compliance.
```sql
- id: UUID (PK)
- user_id: UUID (nullable, FK to auth.users)
- action: TEXT (e.g., 'document_upload', 'user_created')
- entity_type: TEXT (e.g., 'document', 'user', 'folder')
- entity_id: UUID (nullable)
- details: JSONB (nullable, action-specific metadata)
- ip_address: INET (nullable)
- user_agent: TEXT (nullable)
- created_at: TIMESTAMPTZ (indexed for range queries)

INDEX: created_at DESC, user_id, action, entity_type
PARTITION: Recommended by date for large deployments
```

### Enums

```sql
-- User roles
app_role: 'admin' | 'staff' | 'customer'

-- Document workflow states
document_status: 'pending' | 'approved' | 'archived'
```

### Database Functions

| Function | Parameters | Returns | Purpose |
|----------|-----------|---------|---------|
| `get_user_role(user_id)` | user_id: UUID | app_role | Retrieve the role for a given user |
| `has_role(required_role, user_id)` | required_role: app_role, user_id: UUID | BOOLEAN | Check if user has specific role |
| `get_customer_id_for_user(user_id)` | user_id: UUID | UUID | Get customer ID linked to user |
| `has_folder_access(folder_id, user_id)` | folder_id: UUID, user_id: UUID | BOOLEAN | Check if user can access folder |
| `is_folder_owner(folder_id, user_id)` | folder_id: UUID, user_id: UUID | BOOLEAN | Check folder ownership |

---

## Authentication & Security

### Authentication Flow
1. **Email/Password Entry**: User submits credentials on Auth page
2. **Verification**: Email confirmation required before first login
3. **Session Creation**: JWT token issued by Supabase Auth
4. **Token Management**: Automatic session refresh via RT Cookie
5. **Expiration**: Configurable session timeout (default 24 hours)
6. **Inactivity**: Optional timeout logout after period of inactivity
7. **Sign Out**: Clear session and revoke tokens

### Row Level Security (RLS)

All tables have RLS enabled with policies enforcing:
- **Admins/Staff**: Can view and manage all records
- **Customers**: Can only access their own data
- **Folders**: Visible only to owner or users with explicit share grants
- **Private Documents**: Hidden from customers regardless of ownership

### Key Security Policies

```sql
-- Documents visible to authorized users
CREATE POLICY "documents_select" ON documents FOR SELECT USING (
  has_role('admin', auth.uid()) OR 
  has_role('staff', auth.uid()) OR
  (customer_id = get_customer_id_for_user(auth.uid()) AND is_private = false)
);

-- Folders visible only to owner or shared users
CREATE POLICY "folders_select" ON folders FOR SELECT USING (
  owner_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM folder_shares 
    WHERE folder_shares.folder_id = folders.id 
    AND folder_shares.shared_with_user_id = auth.uid()
  )
);

-- Audit logs visible only to admins
CREATE POLICY "audit_logs_select" ON audit_logs FOR SELECT USING (
  has_role('admin', auth.uid())
);
```

### Storage Security
- **Buckets**: Private buckets with authentication required
- **Signed URLs**: Time-limited download links (default 1 hour)
- **Path Isolation**: File paths include user/customer identifiers
- **CORS Configuration**: Restricted to application domains only
- **Encryption**: Leverage provider's encryption at rest

### Additional Security Measures
- **HTTPS Only**: All connections encrypted in transit
- **CSRF Protection**: Token-based protection for state-changing operations
- **Input Validation**: Zod schemas validate all user input
- **SQL Injection Prevention**: Parameterized queries via ORM
- **XSS Prevention**: React's built-in escaping + Content Security Policy
- **Rate Limiting**: Consider implementing API rate limits
- **IP Allowlisting**: Optional in enterprise deployments

---

## File Structure

```
src/
├── assets/
│   ├── images/                # Brand/UI images
│   └── icons/                 # Custom SVG icons
├── components/
│   ├── auth/                  # Authentication components
│   │   ├── LoginForm.tsx
│   │   └── SetupForm.tsx
│   ├── customers/             # Customer-related components
│   │   ├── CustomerCard.tsx
│   │   ├── CustomerDocuments.tsx
│   │   ├── CustomerTable.tsx
│   │   └── EditCustomerDialog.tsx
│   ├── dashboard/             # Dashboard widgets
│   │   ├── ActivityFeed.tsx
│   │   ├── AnalyticsCard.tsx
│   │   └── StatsCard.tsx
│   ├── documents/             # Document components
│   │   ├── DocumentCard.tsx
│   │   ├── DocumentGrid.tsx
│   │   ├── DocumentPreviewDialog.tsx
│   │   ├── DocumentStatusActions.tsx
│   │   ├── DocumentTable.tsx
│   │   └── UploadZone.tsx
│   ├── folders/               # Folder management
│   │   ├── CreateFolderDialog.tsx
│   │   ├── EditFolderDialog.tsx
│   │   ├── FolderCard.tsx
│   │   ├── FolderContents.tsx
│   │   ├── FolderShareDialog.tsx
│   │   ├── MoveDocumentDialog.tsx
│   │   └── FolderList.tsx
│   ├── layout/                # Layout components
│   │   ├── AppLayout.tsx
│   │   ├── AppSidebar.tsx
│   │   ├── Header.tsx
│   │   └── MobileNav.tsx
│   ├── search/                # Search components
│   │   ├── SearchBar.tsx
│   │   └── FilterPanel.tsx
│   ├── ui/                    # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── toast.tsx
│   │   └── [other components]
│   ├── upload/                # Upload features
│   │   ├── BulkCustomerUpload.tsx
│   │   ├── CameraCapture.tsx
│   │   ├── CreateCustomerDialog.tsx
│   │   ├── DocumentUpload.tsx
│   │   ��── FileValidator.tsx
│   ├── users/                 # User management
│   │   ├── CreateUserDialog.tsx
│   │   ├── EditUserDialog.tsx
│   │   ├── UserTable.tsx
│   │   └── UserRoleSelector.tsx
│   ├── AuditLog.tsx           # Audit log viewer
│   ├── ProtectedRoute.tsx     # Route protection wrapper
│   └── ErrorBoundary.tsx      # Error boundary component
├── contexts/
│   ├── AuthContext.tsx        # Authentication state
│   ├── AppContext.tsx         # Global app state
│   └── ToastContext.tsx       # Toast notifications
├── hooks/
│   ├── use-mobile.tsx         # Mobile detection
│   ├── use-toast.ts           # Toast notifications
│   ├── useAuth.ts             # Auth operations
│   ├── useDocuments.ts        # Document operations
│   ├── useFolders.ts          # Folder operations
│   ├── useCustomers.ts        # Customer operations
│   ├── useInactivityTimeout.ts # Session timeout
│   ├── useStats.ts            # Dashboard statistics
│   └── useAuditLogs.ts        # Audit log retrieval
├── integrations/
│   └── supabase/
│       ├── client.ts          # Supabase client initialization
│       └── types.ts           # Generated database types
├── lib/
│   ├── api.ts                 # API client wrapper
│   ├── export-utils.ts        # CSV/PDF export utilities
│   ├── storage-utils.ts       # File storage operations
│   ├── auth-utils.ts          # Authentication helpers
│   └── utils.ts               # General utilities
├── pages/
│   ├── Auth.tsx               # Login & setup page
│   ├── AuditLogs.tsx          # Audit log viewer
│   ├── Categories.tsx         # Category management
│   ├── Customers.tsx          # Customer management
│   ├── Dashboard.tsx          # Admin/staff dashboard
│   ├── Documents.tsx          # Document browser
│   ├── Folders.tsx            # Folder management
│   ├── Index.tsx              # Root redirect
│   ├── MyDocuments.tsx        # Customer document view
│   ├── NotFound.tsx           # 404 page
│   ├── Search.tsx             # Search results
│   ├── Settings.tsx           # User settings
│   ├── SetupAdmin.tsx         # Initial admin setup
│   ├── Upload.tsx             # Document upload
│   └── Users.tsx              # User management
├── App.tsx                    # Root component with routing
├── main.tsx                   # Application entry point
└── index.css                  # Global styles & design tokens

supabase/
├── config.toml                # Supabase local project config
├── migrations/                # Database migration files
│   ├── 001_initial_schema.sql
│   ├── 002_rls_policies.sql
│   └── [other migrations]
├── functions/
│   ├── seed-admin/
│   │   └── index.ts           # Admin user seeding
│   └── [other edge functions]
└── tests/                     # Database function tests

public/
├── _redirects                 # Netlify SPA routing config
├── manifest.json              # PWA manifest
├── robots.txt                 # SEO robots file
└── pwa-*.png                  # PWA app icons

config/
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── tailwind.config.ts         # Tailwind CSS configuration

.github/
└── workflows/                 # CI/CD workflows
    ├── deploy.yml
    └── test.yml

docs/
├── ARCHITECTURE.md            # Architecture decisions
├── API.md                     # API documentation
├── DATABASE.md                # Database design details
├── MIGRATION.md               # Migration guide
└── DEPLOYMENT.md              # Deployment instructions

.env.example                   # Example environment variables
.env.local                     # Local environment variables (git-ignored)
```

---

## Key Components

### AuthContext (`src/contexts/AuthContext.tsx`)
Central authentication state management providing:
- **Current User**: Logged-in user object and session state
- **User Role**: Admin, staff, or customer role
- **Profile Data**: User's full name, email, phone
- **Customer Info**: Linked customer ID for customer users
- **Methods**: Sign in, sign up, sign out functions
- **Helpers**: `isAdmin()`, `isStaff()`, `isCustomer()` role checkers
- **Loading State**: Track authentication loading status

### AppLayout (`src/components/layout/AppLayout.tsx`)
Main layout wrapper providing:
- **Responsive Sidebar**: Collapsible navigation on mobile
- **Header**: User info, role badge, notifications
- **Content Area**: Main page content with proper spacing
- **Mobile Navigation**: Bottom tab bar on small screens
- **Responsive Grid**: Adapts to screen size

### ProtectedRoute (`src/components/ProtectedRoute.tsx`)
Route guard component that:
- Checks authentication status
- Validates user role against allowed roles
- Redirects unauthorized users to login
- Shows loading state during auth check

### useDocuments Hook (`src/hooks/useDocuments.ts`)
Document data fetching and management:
- **Fetch**: Get documents with filters (customer, category, status)
- **RLS Filtering**: Automatic role-based filtering
- **Categories**: Fetch available categories
- **Customers**: Get linked customer data
- **Status**: Update document approval status
- **Delete**: Remove documents from system
- **Search**: Full-text search capabilities

### useFolders Hook (`src/hooks/useFolders.ts`)
Folder operations including:
- **CRUD**: Create, read, update, delete folders
- **Documents**: Upload/manage documents within folders
- **Sharing**: Add/remove folder access grants
- **URLs**: Generate signed download URLs
- **Move**: Reorganize documents between folders

---

## Edge Functions

### `seed-admin` (Setup-Only Function)
**Purpose**: First-time admin user creation during initial system setup.

**Endpoint**: `POST /functions/v1/seed-admin`

**When to Use**: Only during initial deployment when no admin exists

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "securepassword123",
  "fullName": "Admin User"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Admin user created successfully",
  "userId": "uuid-here"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Admin already exists"
}
```

**Behavior**:
1. Validates that no admin users currently exist
2. Creates auth user with email verification
3. Creates user profile record
4. Assigns admin role
5. Returns success or rolls back on failure

**Security Notes**:
- Only callable when no admin exists (prevents privilege escalation)
- Should be called immediately after deployment
- Strongly encourage password change on first login
- Consider implementing time-based expiration

---

## Development Guidelines

### Adding New Features

1. **Component Structure**
   - Create focused, single-responsibility components
   - Place in appropriate directory (components/[feature]/)
   - Use TypeScript interfaces for props

2. **Data Operations**
   - Use existing hooks or create new ones for data fetching
   - Follow React Query patterns for caching
   - Implement error handling and loading states

3. **Styling**
   - Use Tailwind utility classes
   - Reference design tokens in `index.css`
   - Maintain consistency with shadcn/ui components

4. **Database Changes**
   - Create migrations in `supabase/migrations/`
   - Update RLS policies if adding new tables
   - Test policies across all user roles
   - Add audit logging for significant operations

5. **Security**
   - Always validate input with Zod schemas
   - Ensure RLS policies cover all operations
   - Never expose sensitive data in client code
   - Sanitize user input before display

### Code Style Standards

- **TypeScript strict mode** enabled
- **Functional components** with hooks (no class components)
- **Tailwind CSS** for styling (use design tokens from `index.css`)
- **React Query** for server state management
- **Zod** for input validation schemas
- **Shadcn/ui** components for UI consistency

### Testing Strategy

1. **Manual Testing**: Test in Lovable preview, verify across all roles
2. **RLS Policy Testing**: Ensure row-level security works correctly
3. **Edge Cases**: Test empty states, large datasets, network failures
4. **Mobile Testing**: Verify responsive design across viewports

---

## Deployment

### Current: Lovable Cloud

**Deployment Process**:
1. Frontend changes: Click "Update" in Lovable publish dialog
2. Backend changes: Automatic deployment on push
3. Edge functions: Deploy automatically with migrations
4. Environment variables: Pre-configured by Lovable

**Environment Variables** (Auto-configured):
```
VITE_SUPABASE_URL=https://[project].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
VITE_SUPABASE_PROJECT_ID=[project-id]
```

### SPA Routing Configuration

For deployments to Netlify or Vercel, configure redirects:

**Netlify** (`public/_redirects`):
```
/* /index.html 200
```

**Vercel** (`vercel.json`):
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### PWA Support

The application includes Progressive Web App configuration:
- **Manifest**: `public/manifest.json` defines app metadata
- **Icons**: `public/pwa-*.png` in various sizes (192px, 512px)
- **Service Worker**: Vite PWA plugin configuration
- **Caching**: Offline support and cache strategies

---

## Monitoring & Maintenance

### Health Checks
- Monitor Supabase uptime and performance
- Check RLS policy effectiveness
- Verify audit logging is capturing events
- Monitor storage usage and quotas

### Backups
- Enable automated Supabase backups
- Test backup restore procedures regularly
- Maintain offsite backup copies
- Document backup retention policies

### Performance Monitoring
- Monitor API response times
- Track database query performance
- Analyze client-side bundle sizes
- Monitor storage I/O patterns

### Security Maintenance
- Review audit logs regularly
- Update dependencies monthly
- Monitor for CVEs in dependencies
- Conduct periodic security audits

### Scaling Considerations
- Monitor database connection pool usage
- Plan for storage growth (document volume)
- Consider read replicas for analytics queries
- Evaluate caching strategies (Redis) for frequently accessed data

---

## Support & Resources

### Official Documentation
- **Lovable Docs**: https://docs.lovable.dev/
- **Supabase Docs**: https://supabase.com/docs
- **shadcn/ui**: https://ui.shadcn.com/
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Query**: https://tanstack.com/query/latest
- **Zod**: https://zod.dev/

### Project Resources
- **Architecture Guide**: See `docs/ARCHITECTURE.md`
- **Migration Guide**: See `MIGRATION.md`
- **API Documentation**: See `docs/API.md`
- **Database Guide**: See `docs/DATABASE.md`

### Community & Support
- Supabase Discord: https://discord.supabase.io
- React Query Discussions: https://github.com/TanStack/query/discussions
- Tailwind Discord: https://tailwindcss.com/discord
- shadcn/ui GitHub: https://github.com/shadcn-ui/ui

---

*Last Updated: June 2026*
*Maintained by: Development Team*
*Status: Active - Production Ready*
