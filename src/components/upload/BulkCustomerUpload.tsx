import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, Download, ShieldAlert, AlertTriangle, Search } from 'lucide-react';

interface CustomerRow {
  account_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'pending' | 'duplicate' | 'success' | 'error';
  error?: string;
}

interface ColumnMapping {
  account_number: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
}

const COLUMN_MATCHERS: Record<keyof ColumnMapping, string[]> = {
  account_number: ['account', 'customer_id', 'acc_no', 'account_no', 'account_number', 'acct', 'id'],
  full_name: ['name', 'full_name', 'customer_name', 'client_name', 'fullname'],
  email: ['email', 'e-mail', 'mail', 'email_address'],
  phone: ['phone', 'phoneno', 'phone_number', 'mobile', 'tel', 'telephone', 'customer_phoneno', 'contact'],
  address: ['address', 'customer_address', 'location', 'city', 'town'],
};

const CSV_TEMPLATE = `account_number,full_name,email,phone,address
UMS001234,John Doe,john@example.com,+254712345678,123 Main St Nairobi
UMS001235,Jane Smith,jane@example.com,+254723456789,456 Oak Ave Mombasa`;

function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { account_number: '', full_name: '', email: '', phone: '', address: '' };
  const lowerHeaders = headers.map(h => h.toLowerCase().replace(/[\s-]/g, '_'));

  for (const [field, matchers] of Object.entries(COLUMN_MATCHERS) as [keyof ColumnMapping, string[]][]) {
    for (const header of lowerHeaders) {
      if (matchers.some(m => header.includes(m))) {
        mapping[field] = headers[lowerHeaders.indexOf(header)];
        break;
      }
    }
  }
  return mapping;
}

export function BulkCustomerUpload() {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [uploading, setUploading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ account_number: '', full_name: '', email: '', phone: '', address: '' });
  const [duplicateCount, setDuplicateCount] = useState(0);

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customer_upload_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const parseFile = (file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
    return new Promise((resolve, reject) => {
      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          const lines = text.trim().split('\n');
          if (lines.length < 2) { reject('File has no data rows'); return; }
          const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
          const rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { row[h] = values[i] || ''; });
            return row;
          });
          resolve({ headers, rows });
        };
        reader.onerror = () => reject('Failed to read file');
        reader.readAsText(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
            if (jsonData.length === 0) { reject('File has no data rows'); return; }
            const headers = Object.keys(jsonData[0]);
            resolve({ headers, rows: jsonData });
          } catch {
            reject('Failed to parse Excel file');
          }
        };
        reader.onerror = () => reject('Failed to read file');
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const checkDuplicates = async (rows: CustomerRow[]): Promise<CustomerRow[]> => {
    setChecking(true);
    try {
      const accountNumbers = rows.map(r => r.account_number).filter(Boolean);
      // Fetch in batches of 500
      const existingAccounts = new Set<string>();
      for (let i = 0; i < accountNumbers.length; i += 500) {
        const batch = accountNumbers.slice(i, i + 500);
        const { data } = await supabase
          .from('customers')
          .select('account_number')
          .in('account_number', batch);
        data?.forEach(d => existingAccounts.add(d.account_number));
      }

      let dupes = 0;
      const checked = rows.map(row => {
        if (existingAccounts.has(row.account_number)) {
          dupes++;
          return { ...row, status: 'duplicate' as const, error: 'Account already exists in system' };
        }
        return row;
      });

      // Also check for duplicates within the file itself
      const seen = new Set<string>();
      const finalRows = checked.map(row => {
        if (row.status === 'duplicate') { seen.add(row.account_number); return row; }
        if (seen.has(row.account_number)) {
          dupes++;
          return { ...row, status: 'duplicate' as const, error: 'Duplicate within file' };
        }
        seen.add(row.account_number);
        return row;
      });

      setDuplicateCount(dupes);
      return finalRows;
    } finally {
      setChecking(false);
    }
  };

  const applyMapping = async (rows: Record<string, string>[], mapping: ColumnMapping) => {
    if (!mapping.account_number || !mapping.full_name) {
      toast({ title: 'Mapping required', description: 'Account number and name columns must be mapped', variant: 'destructive' });
      return;
    }

    const mapped: CustomerRow[] = rows
      .map(row => ({
        account_number: String(row[mapping.account_number] || '').trim(),
        full_name: String(row[mapping.full_name] || '').trim(),
        email: mapping.email ? String(row[mapping.email] || '').trim() || undefined : undefined,
        phone: mapping.phone ? String(row[mapping.phone] || '').replace(/[\s-]/g, '').trim() || undefined : undefined,
        address: mapping.address ? String(row[mapping.address] || '').trim() || undefined : undefined,
        status: 'pending' as const,
      }))
      .filter(c => c.account_number && c.full_name);

    if (mapped.length === 0) {
      toast({ title: 'No valid rows', description: 'No rows had both account number and name', variant: 'destructive' });
      return;
    }

    const checked = await checkDuplicates(mapped);
    setCustomers(checked);
  };

  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    try {
      const { headers, rows } = await parseFile(file);
      setFileHeaders(headers);
      setRawRows(rows);
      const mapping = autoMapColumns(headers);
      setColumnMapping(mapping);

      toast({
        title: `${rows.length} rows found`,
        description: `Detected ${headers.length} columns from ${file.name}`,
      });

      // Auto-apply if required columns are mapped
      if (mapping.account_number && mapping.full_name) {
        const mapped: CustomerRow[] = rows
          .map(row => ({
            account_number: String(row[mapping.account_number] || '').trim(),
            full_name: String(row[mapping.full_name] || '').trim(),
            email: mapping.email ? String(row[mapping.email] || '').trim() || undefined : undefined,
            phone: mapping.phone ? String(row[mapping.phone] || '').replace(/[\s-]/g, '').trim() || undefined : undefined,
            address: mapping.address ? String(row[mapping.address] || '').trim() || undefined : undefined,
            status: 'pending' as const,
          }))
          .filter(c => c.account_number && c.full_name);
        const checked = await checkDuplicates(mapped);
        setCustomers(checked);
      }
    } catch (err) {
      toast({ title: 'Invalid file', description: String(err), variant: 'destructive' });
    }
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv', '.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
    disabled: !isAdmin,
  });

  const handleUpload = async () => {
    const toUpload = customers.filter(c => c.status === 'pending');
    if (toUpload.length === 0 || !isAdmin) return;

    setUploading(true);
    const total = toUpload.length;
    let completed = 0;

    const updatedCustomers = [...customers];

    for (let i = 0; i < updatedCustomers.length; i++) {
      if (updatedCustomers[i].status !== 'pending') continue;
      const customer = updatedCustomers[i];

      try {
        const { error } = await supabase.from('customers').insert({
          account_number: customer.account_number,
          full_name: customer.full_name,
          email: customer.email || null,
          phone: customer.phone || null,
          address: customer.address || null,
        });

        if (error) {
          updatedCustomers[i] = { ...customer, status: 'error', error: error.code === '23505' ? 'Account already exists' : error.message };
        } else {
          updatedCustomers[i] = { ...customer, status: 'success' };
        }
      } catch {
        updatedCustomers[i] = { ...customer, status: 'error', error: 'Unknown error' };
      }

      completed++;
      setProgress((completed / total) * 100);
      setCustomers([...updatedCustomers]);
    }

    const successCount = updatedCustomers.filter(c => c.status === 'success').length;
    await supabase.from('audit_logs').insert({
      user_id: user?.id,
      action: 'bulk_customers_created',
      entity_type: 'customer',
      details: { total: customers.length, success: successCount, skipped_duplicates: duplicateCount },
    });

    toast({
      title: 'Bulk upload complete',
      description: `${successCount} created, ${duplicateCount} duplicates skipped`,
    });

    setUploading(false);
  };

  const handleReset = () => {
    setCustomers([]);
    setFileHeaders([]);
    setRawRows([]);
    setColumnMapping({ account_number: '', full_name: '', email: '', phone: '', address: '' });
    setDuplicateCount(0);
    setProgress(0);
  };

  const updateMapping = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: value === '_none_' ? '' : value }));
  };

  const successCount = customers.filter(c => c.status === 'success').length;
  const errorCount = customers.filter(c => c.status === 'error').length;
  const pendingCount = customers.filter(c => c.status === 'pending').length;

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Bulk Customer Upload
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              Only administrators can perform bulk customer uploads.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Bulk Customer Upload
        </CardTitle>
        <CardDescription>
          Upload a CSV or Excel (.xlsx) file — the system will auto-detect columns and check for duplicates
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />
            Download CSV Template
          </Button>
        </div>

        {customers.length === 0 && fileHeaders.length === 0 ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Drop a CSV or Excel file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Supports .csv, .xlsx — columns are auto-mapped
            </p>
          </div>
        ) : fileHeaders.length > 0 && customers.length === 0 ? (
          /* Column mapping UI when auto-map didn't find required fields */
          <div className="space-y-4">
            <Alert>
              <Search className="h-4 w-4" />
              <AlertDescription>
                Map your file columns to customer fields. Account Number and Name are required.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(Object.entries({ account_number: 'Account Number *', full_name: 'Full Name *', email: 'Email', phone: 'Phone', address: 'Address' }) as [keyof ColumnMapping, string][]).map(([field, label]) => (
                <div key={field} className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{label}</label>
                  <Select value={columnMapping[field] || '_none_'} onValueChange={(v) => updateMapping(field, v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">— Not mapped —</SelectItem>
                      {fileHeaders.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset}>Cancel</Button>
              <Button onClick={() => applyMapping(rawRows, columnMapping)} disabled={!columnMapping.account_number || !columnMapping.full_name}>
                Apply Mapping & Check Duplicates
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Summary badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{customers.length} total</Badge>
              {pendingCount > 0 && <Badge variant="secondary">{pendingCount} ready</Badge>}
              {duplicateCount > 0 && (
                <Badge variant="outline" className="border-amber-500 text-amber-600">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {duplicateCount} duplicates
                </Badge>
              )}
              {successCount > 0 && (
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  ✓ {successCount} created
                </Badge>
              )}
              {errorCount > 0 && <Badge variant="destructive">✗ {errorCount} failed</Badge>}
            </div>

            {/* Column mapping review */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-muted/50 rounded-lg text-xs">
              {(Object.entries({ account_number: 'Account', full_name: 'Name', email: 'Email', phone: 'Phone', address: 'Address' }) as [keyof ColumnMapping, string][]).map(([field, label]) => (
                <div key={field}>
                  <span className="text-muted-foreground">{label}:</span>
                  <span className="ml-1 font-medium">{columnMapping[field] || '—'}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleReset}>Clear</Button>
                <Button variant="outline" size="sm" onClick={() => { setCustomers([]); }} disabled={uploading}>
                  Re-map Columns
                </Button>
              </div>
              <Button onClick={handleUpload} disabled={uploading || pendingCount === 0}>
                {uploading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading...</>
                ) : checking ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Checking...</>
                ) : (
                  `Upload ${pendingCount} Customers`
                )}
              </Button>
            </div>

            {uploading && <Progress value={progress} className="h-2" />}

            <div className="max-h-72 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Status</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead className="hidden sm:table-cell">Address</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.slice(0, 100).map((customer, idx) => (
                    <TableRow key={idx} className={customer.status === 'duplicate' ? 'opacity-50' : ''}>
                      <TableCell>
                        {customer.status === 'pending' && <span className="text-muted-foreground text-lg">○</span>}
                        {customer.status === 'duplicate' && (
                          <span className="flex items-center gap-1" title={customer.error}>
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </span>
                        )}
                        {customer.status === 'success' && <CheckCircle className="h-4 w-4 text-green-600" />}
                        {customer.status === 'error' && (
                          <span className="flex items-center gap-1" title={customer.error}>
                            <XCircle className="h-4 w-4 text-red-600" />
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm">{customer.account_number}</TableCell>
                      <TableCell>{customer.full_name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{customer.phone || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm truncate max-w-[150px]">{customer.address || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {customers.length > 100 && (
                <p className="text-center text-sm text-muted-foreground py-2">
                  ... and {customers.length - 100} more
                </p>
              )}
            </div>

            {duplicateCount > 0 && !uploading && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {duplicateCount} duplicate account(s) found and will be skipped during upload.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
