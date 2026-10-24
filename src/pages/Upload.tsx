import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useCategories, useCustomers } from '@/hooks/useDocuments';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CameraCapture } from '@/components/upload/CameraCapture';
import { CreateCustomerDialog } from '@/components/upload/CreateCustomerDialog';
import { BulkCustomerUpload } from '@/components/upload/BulkCustomerUpload';
import { 
  File, 
  X, 
  Check, 
  ChevronsUpDown, 
  Loader2, 
  CalendarIcon,
  Files,
  CheckCircle,
  XCircle,
  FolderOpen,
  CloudUpload,
  User,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Best-effort account number pattern: 4+ digits, or alnum sequences containing digits
const ACCOUNT_NUMBER_REGEX = /\b([A-Z]{0,4}\d{4,}[A-Z0-9]*)\b/i;

interface FileUploadItem {
  file: File;
  title: string;
  categoryId: string;
  detectedAccount?: string | null;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export default function Upload() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { categories, loading: categoriesLoading } = useCategories();
  const [customerSearch, setCustomerSearch] = useState('');
  const { customers, loading: customersLoading, refetch: refetchCustomers } = useCustomers(customerSearch);

  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [description, setDescription] = useState('');
  const [defaultCategoryId, setDefaultCategoryId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadDate, setUploadDate] = useState<Date>(new Date());
  const [dateOpen, setDateOpen] = useState(false);
  const [preflightOpen, setPreflightOpen] = useState(false);

  // Duplicate detection state
  const [duplicatePrompt, setDuplicatePrompt] = useState<{
    existingTitle: string;
    existingDate: string;
    resolve: (proceed: boolean) => void;
  } | null>(null);

  // Set default category to "Registration Forms" when categories load
  useEffect(() => {
    if (categories.length > 0 && !defaultCategoryId) {
      const registrationForms = categories.find(c => 
        c.name.toLowerCase().includes('registration')
      );
      if (registrationForms) {
        setDefaultCategoryId(registrationForms.id);
      } else {
        setDefaultCategoryId(categories[0].id);
      }
    }
  }, [categories, defaultCategoryId]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Auto-suggest category by matching filename tokens against category names
  const suggestCategoryId = useCallback((fileName: string): string => {
    if (!categories.length) return defaultCategoryId;
    const name = fileName.toLowerCase();
    const scored = categories
      .map((c) => {
        const words = c.name.toLowerCase().split(/[\s\-_/]+/).filter(w => w.length > 2);
        const hits = words.filter((w) => name.includes(w)).length;
        return { id: c.id, hits };
      })
      .sort((a, b) => b.hits - a.hits);
    return scored[0]?.hits > 0 ? scored[0].id : defaultCategoryId;
  }, [categories, defaultCategoryId]);

  const detectAccountNumber = useCallback((fileName: string): string | null => {
    const base = fileName.replace(/\.[^/.]+$/, '');
    const match = base.match(ACCOUNT_NUMBER_REGEX);
    return match ? match[1].toUpperCase() : null;
  }, []);

  const handleFilesSelected = useCallback((selectedFiles: File[]) => {
    const validFiles: FileUploadItem[] = [];

    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'File too large',
          description: `${file.name} exceeds 10MB limit`,
          variant: 'destructive',
        });
        continue;
      }
      validFiles.push({
        file,
        title: file.name.replace(/\.[^/.]+$/, ''),
        categoryId: suggestCategoryId(file.name),
        detectedAccount: detectAccountNumber(file.name),
        status: 'pending',
      });
    }

    setFiles(prev => [...prev, ...validFiles]);
  }, [toast, suggestCategoryId, detectAccountNumber]);

  const onDrop = useCallback((acceptedFiles: File[], rejected: import('react-dropzone').FileRejection[]) => {
    if (rejected?.length) {
      const reasons = rejected.slice(0, 3).map(r => {
        const code = r.errors[0]?.code;
        const label = code === 'file-too-large' ? 'too large (>10MB)'
          : code === 'file-invalid-type' ? 'unsupported type'
          : r.errors[0]?.message || 'rejected';
        return `${r.file.name} — ${label}`;
      }).join('\n');
      const more = rejected.length > 3 ? `\n+${rejected.length - 3} more` : '';
      toast({
        title: `${rejected.length} file(s) rejected`,
        description: reasons + more,
        variant: 'destructive',
      });
    }
    handleFilesSelected(acceptedFiles);
  }, [handleFilesSelected, toast]);

  const handleCameraCapture = (capturedFile: File) => {
    handleFilesSelected([capturedFile]);
  };

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: true,
  });

  const updateFileTitle = (index: number, title: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, title } : f));
  };

  const updateFileCategory = (index: number, categoryId: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, categoryId } : f));
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCustomerCreated = (newCustomerId: string) => {
    setCustomerId(newCustomerId);
    // Refetch customer list so the new customer appears in dropdown
    refetchCustomers();
    toast({
      title: 'Customer created',
      description: 'New customer has been selected automatically',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (files.length === 0 || !customerId || !user) {
      toast({
        title: 'Missing fields',
        description: 'Please add files, select a customer, and ensure each file has a category',
        variant: 'destructive',
      });
      return;
    }

    const filesWithoutCategory = files.filter(f => !f.categoryId);
    if (filesWithoutCategory.length > 0) {
      toast({
        title: 'Missing category',
        description: 'Please select a category for each file',
        variant: 'destructive',
      });
      return;
    }

    // Open preflight confirmation instead of uploading immediately
    setPreflightOpen(true);
  };

  const checkDuplicate = (fileItem: FileUploadItem): Promise<boolean> => {
    return new Promise((resolve) => {
      (async () => {
      let query = supabase
        .from('documents')
        .select('title, created_at')
        .eq('file_name', fileItem.file.name)
        .eq('file_size', fileItem.file.size);
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const { data } = await query.limit(1).maybeSingle();
      if (!data) {
        resolve(true);
        return;
      }
      setDuplicatePrompt({
        existingTitle: (data as any).title || fileItem.file.name,
        existingDate: format((data as any).created_at ? new Date((data as any).created_at) : new Date(), 'PPP'),
        resolve: (proceed) => {
          setDuplicatePrompt(null);
          resolve(proceed);
        },
      });
      })();
    });
  };

  const runUpload = async () => {
    if (!user || !customerId) return;
    setPreflightOpen(false);

    setUploading(true);
    setUploadProgress(0);

    const total = files.length;
    let completed = 0;
    const updatedFiles = [...files];

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      updatedFiles[i] = { ...fileItem, status: 'uploading' };
      setFiles([...updatedFiles]);

      try {
        // Duplicate detection: check before uploading
        const proceed = await checkDuplicate(fileItem);
        if (!proceed) {
          updatedFiles[i] = { ...fileItem, status: 'error', error: 'Skipped (duplicate)' };
          completed++;
          setUploadProgress((completed / total) * 100);
          setFiles([...updatedFiles]);
          continue;
        }

        const fileExt = fileItem.file.name.split('.').pop();
        const fileName = `${customerId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, fileItem.file);

        if (uploadError) throw uploadError;

        const documentTitle = fileItem.title.trim() || fileItem.file.name.replace(/\.[^/.]+$/, '');
        
        const { error: insertError } = await supabase.from('documents').insert({
          customer_id: customerId,
          category_id: fileItem.categoryId,
          title: documentTitle,
          description: description.trim() || null,
          file_name: fileItem.file.name,
          file_path: fileName,
          file_type: fileItem.file.type,
          file_size: fileItem.file.size,
          status: 'pending',
          uploaded_by: user.id,
          created_at: uploadDate.toISOString(),
        });

        if (insertError) throw insertError;

        updatedFiles[i] = { ...fileItem, status: 'success' };
      } catch (error) {
        console.error('Upload error:', error);
        updatedFiles[i] = { 
          ...fileItem, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        };
      }

      completed++;
      setUploadProgress((completed / total) * 100);
      setFiles([...updatedFiles]);
    }

    const successCount = updatedFiles.filter(f => f.status === 'success').length;
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'documents_uploaded',
      entity_type: 'document',
      details: { total, success: successCount, customer_id: customerId },
    });

    toast({
      title: successCount === total ? '✅ Upload complete' : '⚠️ Partially completed',
      description: `${successCount} of ${total} documents uploaded successfully`,
      variant: successCount === total ? 'default' : 'destructive',
    });

    if (successCount > 0) {
      // Reset form for a new submission instead of redirecting
      setTimeout(() => {
        setFiles([]);
        setDescription('');
        setCustomerId('');
        setCustomerSearch('');
        setUploadDate(new Date());
        setUploadProgress(0);
        // Auto-focus the upload drop zone so user can immediately upload again
        requestAnimationFrame(() => {
          dropZoneRef.current?.focus();
          dropZoneRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }, 1500);
    }

    setUploading(false);
  };

  const successCount = files.filter(f => f.status === 'success').length;
  const errorCount = files.filter(f => f.status === 'error').length;

  return (
    <AppLayout title="Upload" description="Add documents and customers to the system">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Upload Document</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Add one or multiple documents to the system</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="documents" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="documents" className="gap-2">
            <Files className="h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="customers" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Bulk Customers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documents">
          <div className="max-w-2xl mx-auto">
            <Card className="shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <CloudUpload className="h-5 w-5 text-primary" />
                  Upload Documents
                </CardTitle>
                <CardDescription>
                  Upload one or multiple documents — each file can have its own category
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* ── File Drop Zone ─────────────────────────────────── */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Document Files *</Label>
                    <div
                      {...getRootProps()}
                      ref={dropZoneRef}
                      tabIndex={0}
                      className={cn(
                        'relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer outline-none',
                        'transition-all duration-200',
                        'focus-visible:ring-2 focus-visible:ring-ring',
                        isDragActive && !isDragReject && 'border-primary bg-primary/5 scale-[1.01]',
                        isDragReject && 'border-destructive bg-destructive/5',
                        !isDragActive && !isDragReject && 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30',
                      )}
                    >
                      <input {...getInputProps()} />
                      <motion.div
                        animate={isDragActive ? { scale: 1.1 } : { scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      >
                        <CloudUpload className={cn(
                          'mx-auto h-14 w-14 mb-4 transition-colors',
                          isDragReject ? 'text-destructive' : isDragActive ? 'text-primary' : 'text-muted-foreground/50',
                        )} />
                      </motion.div>
                      <p className="text-base font-semibold text-foreground">
                        {isDragReject
                          ? 'Some files are not supported'
                          : isDragActive
                            ? 'Drop your files here'
                            : 'Drag & drop files here'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1.5">
                        or <span className="text-primary font-medium underline underline-offset-2">click to browse</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-3 bg-muted/50 rounded-md px-3 py-1.5 inline-block">
                        PDF, JPG, PNG, DOC, DOCX · max 10 MB each
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex-1 border-t border-border" />
                      <span className="text-xs text-muted-foreground">or capture</span>
                      <div className="flex-1 border-t border-border" />
                    </div>
                    
                    <div className="flex justify-center">
                      <CameraCapture onCapture={handleCameraCapture} />
                    </div>

                    {/* File List with per-file category */}
                    {files.length > 0 && (
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{files.length} file{files.length > 1 ? 's' : ''} selected</span>
                          <div className="flex items-center gap-2">
                            {successCount > 0 && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                ✓ {successCount} uploaded
                              </Badge>
                            )}
                            {errorCount > 0 && (
                              <Badge variant="destructive">
                                ✗ {errorCount} failed
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="max-h-72 overflow-auto space-y-2">
                          {files.map((fileItem, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2 }}
                              className={cn(
                                'flex flex-col gap-2 p-3 rounded-lg border transition-colors',
                                fileItem.status === 'success' && 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800',
                                fileItem.status === 'error' && 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800',
                                fileItem.status === 'pending' && 'bg-muted/50 border-border',
                                fileItem.status === 'uploading' && 'bg-primary/5 border-primary/20',
                              )}
                            >
                              <div className="flex items-center gap-3">
                                {fileItem.status === 'pending' && <File className="h-5 w-5 text-primary shrink-0" />}
                                {fileItem.status === 'uploading' && <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />}
                                {fileItem.status === 'success' && <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />}
                                {fileItem.status === 'error' && <XCircle className="h-5 w-5 text-red-600 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <Input
                                    value={fileItem.title}
                                    onChange={(e) => updateFileTitle(index, e.target.value)}
                                    placeholder="Document title (optional)"
                                    className="h-8 text-sm"
                                    disabled={fileItem.status !== 'pending'}
                                  />
                                </div>
                                {fileItem.status === 'pending' && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => removeFile(index)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              <div className="flex items-center gap-2 ml-8">
                                <Select
                                  value={fileItem.categoryId}
                                  onValueChange={(v) => updateFileCategory(index, v)}
                                  disabled={fileItem.status !== 'pending'}
                                >
                                  <SelectTrigger className="h-7 text-xs flex-1">
                                    <Tag className="h-3 w-3 mr-1 text-muted-foreground" />
                                    <SelectValue placeholder="Select category" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {categories.map((cat) => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        {cat.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground whitespace-nowrap">
                                  {(fileItem.file.size / 1024 / 1024).toFixed(1)} MB
                                </p>
                              </div>
                              {fileItem.error && (
                                <p className="text-xs text-destructive ml-8">{fileItem.error}</p>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* ── Customer Selection ─────────────────────────────── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <User className="h-4 w-4 text-muted-foreground" />
                        Customer Account *
                      </Label>
                      <CreateCustomerDialog onCustomerCreated={handleCustomerCreated} />
                    </div>
                    <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={customerOpen}
                          className={cn(
                            "w-full justify-between h-10",
                            !selectedCustomer && "text-muted-foreground"
                          )}
                        >
                          {selectedCustomer ? (
                            <span className="flex items-center gap-2">
                              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{selectedCustomer.account_number}</span>
                              {selectedCustomer.full_name}
                            </span>
                          ) : 'Select customer...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search customers..."
                            value={customerSearch}
                            onValueChange={setCustomerSearch}
                          />
                          <CommandList>
                            <CommandEmpty>
                              {customersLoading ? 'Loading...' : 'No customers found.'}
                            </CommandEmpty>
                            <CommandGroup>
                              {customers.map((customer) => (
                                <CommandItem
                                  key={customer.id}
                                  value={`${customer.account_number} ${customer.full_name}`}
                                  onSelect={() => {
                                    setCustomerId(customer.id);
                                    setCustomerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      'mr-2 h-4 w-4',
                                      customerId === customer.id ? 'opacity-100' : 'opacity-0'
                                    )}
                                  />
                                  <div>
                                    <p className="font-medium font-mono text-sm">{customer.account_number}</p>
                                    <p className="text-sm text-muted-foreground">{customer.full_name}</p>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* ── Upload Date (Backdating) ───────────────────────── */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-1.5">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      Upload Date
                    </Label>
                    <Popover open={dateOpen} onOpenChange={setDateOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !uploadDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {uploadDate ? format(uploadDate, 'PPP') : 'Select date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={uploadDate}
                          onSelect={(date) => {
                            if (date) setUploadDate(date);
                            setDateOpen(false);
                          }}
                          disabled={(date) => date > new Date()}
                          initialFocus
                          className="pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <p className="text-xs text-muted-foreground">
                      Select a past date if the document was created earlier
                    </p>
                  </div>

                  {/* ── Description ───────────────────────────────────── */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm font-medium">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Add notes or description for all documents..."
                      rows={3}
                    />
                  </div>

                  {/* ── Progress ──────────────────────────────────────── */}
                  {uploading && (
                    <div className="space-y-2 p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 font-medium">
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          Uploading…
                        </span>
                        <span className="text-muted-foreground">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  )}

                  {/* ── Submit ────────────────────────────────────────── */}
                  <div className="flex gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(-1)}
                      disabled={uploading}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={uploading || files.length === 0} className="flex-1 gap-2">
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Uploading…
                        </>
                      ) : (
                        <>
                          <CloudUpload className="h-4 w-4" />
                          Upload {files.length > 0 ? `${files.length} Document${files.length > 1 ? 's' : ''}` : 'Documents'}
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers">
          <div className="max-w-2xl mx-auto">
            <BulkCustomerUpload />
          </div>
        </TabsContent>
      </Tabs>

      <AlertDialog open={preflightOpen} onOpenChange={setPreflightOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm upload details</AlertDialogTitle>
            <AlertDialogDescription>
              Review the detected account number and suggested category for each file before saving.
              Nothing is uploaded until you confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-medium">
                {selectedCustomer ? `${selectedCustomer.account_number} — ${selectedCustomer.full_name}` : '—'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <span className="text-muted-foreground">Upload date:</span>
              <span className="font-medium">{format(uploadDate, 'PPP')}</span>
            </div>
          </div>

          <div className="max-h-72 overflow-auto rounded-lg border divide-y">
            {files.map((f, i) => {
              const cat = categories.find(c => c.id === f.categoryId);
              const detected = f.detectedAccount;
              const accountMismatch = detected && selectedCustomer && detected !== selectedCustomer.account_number.toUpperCase();
              return (
                <div key={i} className="p-3 text-sm space-y-1">
                  <div className="font-medium truncate">{f.title || f.file.name}</div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span>
                      <span className="text-muted-foreground">Detected account: </span>
                      {detected ? (
                        <Badge variant={accountMismatch ? 'destructive' : 'secondary'} className="ml-1">
                          {detected}
                        </Badge>
                      ) : (
                        <span className="italic text-muted-foreground">none found in filename</span>
                      )}
                    </span>
                    <span>
                      <span className="text-muted-foreground">Suggested category: </span>
                      <Badge variant="secondary" className="ml-1">{cat?.name || 'Unassigned'}</Badge>
                    </span>
                  </div>
                  {accountMismatch && (
                    <p className="text-xs text-destructive">
                      Warning: filename account ({detected}) does not match the selected customer account ({selectedCustomer?.account_number}).
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={uploading}>Back to edit</AlertDialogCancel>
            <AlertDialogAction disabled={uploading} onClick={runUpload}>
              Confirm and upload
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Duplicate detection dialog */}
      <AlertDialog open={duplicatePrompt !== null} onOpenChange={() => duplicatePrompt?.resolve(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possible Duplicate</AlertDialogTitle>
            <AlertDialogDescription>
              {duplicatePrompt && (
                <>
                  Possible duplicate: &quot;{duplicatePrompt.existingTitle}&quot; (uploaded {duplicatePrompt.existingDate})
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => duplicatePrompt?.resolve(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => duplicatePrompt?.resolve(true)}>Upload Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </AppLayout>

  );
}
