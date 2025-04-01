'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/common/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface OCRJob {
  id: string;
  fileId: string;
  status: string;
  createdAt?: string;
  completedAt?: string;
  failedAt?: string;
  processingStartedAt?: string;
  error?: string;
}

export default function OCRJobsPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [jobs, setJobs] = useState<OCRJob[]>([]);
  const [jobResult, setJobResult] = useState<any>(null);
  const router = useRouter();
  
  useEffect(() => {
    fetchJobs();
  }, []);
  
  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/ocr-jobs');
      
      if (response.status === 401 || response.status === 403) {
        // Handle authentication errors
        toast.error('You do not have permission to access this page');
        // Optionally redirect
        // router.push('/dashboard');
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch OCR jobs');
      }
      
      const data = await response.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Error fetching OCR jobs:', error);
      toast.error('Failed to fetch OCR jobs');
    } finally {
      setIsLoading(false);
    }
  };
  
  const processNextJob = async () => {
    setIsProcessing(true);
    try {
      // Process job directly as admin (no need for API key)
      const response = await fetch('/api/workers/ocr-job');
      
      if (!response.ok) {
        throw new Error('Failed to process job');
      }
      
      const data = await response.json();
      
      if (data.status === 'completed') {
        toast.success('Job processed successfully');
      } else if (data.status === 'idle') {
        toast.info('No pending jobs to process');
      } else {
        toast.error('Failed to process job');
      }
      
      setJobResult(data);
      fetchJobs(); // Refresh the job list
    } catch (error) {
      console.error('Error processing job:', error);
      toast.error('Failed to process job');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Helper function to get status display text and class
  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'completed':
        return { 
          class: 'bg-green-100 text-green-800',
          label: 'Completed'
        };
      case 'failed':
        return { 
          class: 'bg-red-100 text-red-800',
          label: 'Failed'
        };
      case 'processing':
        return { 
          class: 'bg-blue-100 text-blue-800',
          label: 'Processing'
        };
      case 'queued':
        return { 
          class: 'bg-yellow-100 text-yellow-800',
          label: 'Queued'
        };
      default:
        return { 
          class: 'bg-gray-100 text-gray-800',
          label: status.charAt(0).toUpperCase() + status.slice(1)
        };
    }
  };
  
  // Helper function to format timestamp
  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };
  
  return (
    <DashboardLayout>
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">OCR Jobs Management</h1>
            <p className="text-gray-500">Monitor and process OCR jobs</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={fetchJobs} 
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button 
              onClick={processNextJob} 
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Process Next Job
            </Button>
          </div>
        </div>
        
        {jobResult && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Job Processing Result</CardTitle>
              <CardDescription>Latest job processing result</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded overflow-auto">
                <pre className="text-sm">
                  {JSON.stringify(jobResult, null, 2)}
                </pre>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>OCR Jobs</CardTitle>
            <CardDescription>Recent OCR processing jobs</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center p-6 text-gray-500">
                No OCR jobs found
              </div>
            ) : (
              <div className="divide-y">
                {jobs.map(job => {
                  const statusStyle = getStatusStyles(job.status);
                  
                  return (
                    <div key={job.id} className="py-4 flex justify-between items-center">
                      <div>
                        <p className="font-medium">File ID: {job.fileId}</p>
                        <p className="text-sm text-gray-500">
                          Created: {formatTimestamp(job.createdAt)}
                        </p>
                        {job.completedAt && (
                          <p className="text-sm text-gray-500">
                            Completed: {formatTimestamp(job.completedAt)}
                          </p>
                        )}
                        {job.error && (
                          <p className="text-sm text-red-500">
                            Error: {job.error}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span 
                          className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyle.class}`}
                        >
                          {statusStyle.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
} 