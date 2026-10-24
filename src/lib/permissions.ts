export interface Permission {
  key: string;
  label: string;
  description: string;
  category: string;
  group: string;
}

export const ALL_PERMISSIONS: Permission[] = [
  // Documents category
  { key: 'docs.documents.view',     label: 'View Documents',     description: 'Can view and preview documents',              category: 'Documents',   group: 'Documents'   },
  { key: 'docs.documents.upload',   label: 'Upload Documents',   description: 'Can upload new documents',                    category: 'Documents',   group: 'Documents'   },
  { key: 'docs.documents.download', label: 'Download Documents', description: 'Can download documents',                      category: 'Documents',   group: 'Documents'   },
  { key: 'docs.documents.edit',     label: 'Edit Documents',     description: 'Can edit document metadata',                  category: 'Documents',   group: 'Documents'   },
  { key: 'docs.documents.delete',   label: 'Delete Documents',   description: 'Can delete documents',                        category: 'Documents',   group: 'Documents'   },
  { key: 'docs.documents.approve',  label: 'Approve Documents',  description: 'Can approve/archive documents',               category: 'Documents',   group: 'Documents'   },
  { key: 'docs.categories.manage',  label: 'Manage Categories',  description: 'Can create and manage document categories',   category: 'Documents',   group: 'Categories'  },
  { key: 'docs.templates.manage',   label: 'Manage Templates',   description: 'Can create and manage document templates',    category: 'Documents',   group: 'Templates'   },
  { key: 'docs.expiry.manage',      label: 'Manage Document Expiry', description: 'Can manage document expiry settings',     category: 'Documents',   group: 'Expiry'      },
  // Operations category
  { key: 'ops.incidents.view',      label: 'View Incidents',     description: 'Can view incident reports',                   category: 'Operations',  group: 'Incidents'   },
  { key: 'ops.incidents.create',    label: 'Create Incidents',   description: 'Can create new incident reports',             category: 'Operations',  group: 'Incidents'   },
  { key: 'ops.incidents.edit',      label: 'Edit Incidents',     description: 'Can edit incident reports',                   category: 'Operations',  group: 'Incidents'   },
  { key: 'ops.incidents.close',     label: 'Close Incidents',    description: 'Can close and resolve incidents',             category: 'Operations',  group: 'Incidents'   },
  { key: 'ops.vendors.view',        label: 'View Vendors',       description: 'Can view vendor data',                        category: 'Operations',  group: 'Vendors'     },
  { key: 'ops.vendors.manage',      label: 'Manage Vendors',     description: 'Can manage vendors and uptime records',       category: 'Operations',  group: 'Vendors'     },
  { key: 'ops.passwords.view',      label: 'View Passwords',     description: 'Can view ops password vault',                 category: 'Operations',  group: 'Passwords'   },
  { key: 'ops.passwords.manage',    label: 'Manage Passwords',   description: 'Can add and edit passwords in ops vault',     category: 'Operations',  group: 'Passwords'   },
  { key: 'ops.escalations.manage',  label: 'Manage Escalations', description: 'Can create and manage escalations',          category: 'Operations',  group: 'Escalations' },
  { key: 'ops.analytics.view',      label: 'View Analytics',     description: 'Can view operations analytics',              category: 'Operations',  group: 'Analytics'   },
  // Users category
  { key: 'users.view',              label: 'View Users',         description: 'Can view user profiles',                      category: 'Users',       group: 'Users'       },
  { key: 'users.invite',            label: 'Invite Users',       description: 'Can invite new users',                        category: 'Users',       group: 'Users'       },
  { key: 'users.edit',              label: 'Edit Users',         description: 'Can edit user profiles',                      category: 'Users',       group: 'Users'       },
  { key: 'users.deactivate',        label: 'Deactivate Users',   description: 'Can deactivate user accounts',                category: 'Users',       group: 'Users'       },
  { key: 'users.roles.assign',      label: 'Assign Roles',       description: 'Can assign base roles to users',             category: 'Users',       group: 'Roles'       },
  // System category
  { key: 'system.audit.view',       label: 'View Audit Logs',    description: 'Can view system audit logs',                  category: 'System',      group: 'Audit'       },
  { key: 'system.settings.manage',  label: 'Manage Settings',    description: 'Can manage organisation settings',           category: 'System',      group: 'Settings'    },
  { key: 'system.reports.view',     label: 'View Reports',       description: 'Can view reports',                           category: 'System',      group: 'Reports'     },
  { key: 'system.reports.export',   label: 'Export Reports',     description: 'Can export reports',                         category: 'System',      group: 'Reports'     },
  { key: 'system.webhooks.manage',  label: 'Manage Webhooks',    description: 'Can manage webhooks and API keys',           category: 'System',      group: 'Integrations'},
];

export function groupPermissions(
  permissions: Permission[]
): Record<string, Record<string, Permission[]>> {
  return permissions.reduce<Record<string, Record<string, Permission[]>>>((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = {};
    if (!acc[perm.category][perm.group]) acc[perm.category][perm.group] = [];
    acc[perm.category][perm.group].push(perm);
    return acc;
  }, {});
}
