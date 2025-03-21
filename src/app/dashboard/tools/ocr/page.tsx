'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { createWorker } from 'tesseract.js';
import { DashboardLayout } from '@/components/common/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2, Upload, FileText, Settings, Save } from 'lucide-react';
import { ocrConfig } from '@/lib/config/ocr';
import { toast } from 'sonner';

interface OCRResult {
  text: string;
  confidence: number;
  documentName: string;
}

export default function OCRPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>('');
  const [processing, setProcessing] = useState(false);
  const [language, setLanguage] = useState('eng');
  const [documentType, setDocumentType] = useState('general');
  const [quality, setQuality] = useState(75);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setOcrResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const processOCR = async () => {
    if (!file) return;

    try {
      setProcessing(true);
      toast.info('Starting OCR processing...');
      
      const worker = await createWorker(language);
      const { data: { text, confidence } } = await worker.recognize(file);
      
      setOcrResult({
        text,
        confidence,
        documentName: file.name,
      });

      await worker.terminate();
      toast.success('OCR processing completed');
    } catch (error) {
      console.error('OCR processing error:', error);
      toast.error('Failed to process document');
    } finally {
      setProcessing(false);
    }
  };

  const saveDocument = async () => {
    if (!ocrResult) return;

    try {
      toast.info('Saving document...');
      const response = await fetch('/api/tools/ocr/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: ocrResult.text,
          fileName: ocrResult.documentName,
          confidence: ocrResult.confidence,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }

      toast.success('Document saved successfully');
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-6 max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">OCR Document Processing</h1>
            <p className="text-gray-500">Convert scanned documents to searchable text</p>
          </div>
        </div>

        {!ocrResult ? (
          <>
            <Card className="mb-6 p-8">
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary'}`}
              >
                <input {...getInputProps()} />
                {preview ? (
                  <div className="space-y-4">
                    <img
                      src={preview}
                      alt="Document preview"
                      className="max-h-64 mx-auto"
                    />
                    <p className="text-sm text-gray-500">{file?.name}</p>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="mb-2">Drag and drop files here</p>
                    <p className="text-sm">or</p>
                    <Button variant="secondary" className="mt-2">
                      Browse Files
                    </Button>
                    <p className="text-xs text-gray-400 mt-2">
                      Supported formats: PNG, JPG, PDF
                    </p>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5" />
                <h2 className="text-lg font-semibold">OCR Settings</h2>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Document Language
                  </label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {ocrConfig.languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Document Type
                  </label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ocrConfig.documentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-2">
                    OCR Quality
                  </label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[quality]}
                      onValueChange={(value) => setQuality(value[0])}
                      max={100}
                      step={1}
                      className="flex-1"
                    />
                    <span className="text-sm text-gray-500 w-12">
                      {quality}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Higher quality may take longer to process
                  </p>
                </div>
              </div>

              <Button
                className="mt-6 w-full"
                onClick={processOCR}
                disabled={!file || processing}
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-4 w-4" />
                    Process Document
                  </>
                )}
              </Button>
            </Card>
          </>
        ) : (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <h2 className="text-lg font-semibold">OCR Results</h2>
              </div>
              <p className="text-sm text-gray-500">
                Confidence: {Math.round(ocrResult.confidence)}%
              </p>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Document: {ocrResult.documentName}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Document Preview</h3>
                {preview && (
                  <img
                    src={preview}
                    alt="Document preview"
                    className="max-h-96 mx-auto"
                  />
                )}
              </div>
              <div className="border rounded-lg p-4">
                <h3 className="font-medium mb-2">Extracted Text</h3>
                <div className="h-96 overflow-y-auto">
                  <pre className="whitespace-pre-wrap text-sm">
                    {ocrResult.text}
                  </pre>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <Button variant="outline" onClick={() => setOcrResult(null)}>
                Process Another Document
              </Button>
              <Button onClick={saveDocument}>
                <Save className="mr-2 h-4 w-4" />
                Save Document
              </Button>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
} 