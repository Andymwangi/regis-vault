import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Save, Download, Copy, FileEdit, ChevronDown, FileIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export interface OCRResultData {
  text: string;
  confidence: number;
  documentName: string;
  pageCount: number;
  processingTime: number;
  fileId?: string;
}

interface OCRResultsProps {
  result: OCRResultData;
  onSave?: () => Promise<void>;
  onEdit?: () => void;
  onExport?: (format: string) => Promise<void>;
}

export function OCRResults({ result, onSave, onEdit, onExport }: OCRResultsProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);

  const handleSave = async () => {
    if (!onSave) return;
    
    try {
      setIsSaving(true);
      await onSave();
    } catch (error) {
      console.error('Error saving OCR result:', error);
      toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format: string) => {
    if (!onExport) return;
    
    try {
      setIsExporting(true);
      await onExport(format);
    } catch (error) {
      console.error(`Error exporting OCR result as ${format}:`, error);
      toast.error(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result.text)
      .then(() => toast.success('Text copied to clipboard'))
      .catch(err => toast.error('Failed to copy text'));
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          <h2 className="text-lg font-semibold">OCR Results</h2>
        </div>
        <div className="flex gap-2">
          {onEdit && (
            <Button variant="outline" onClick={onEdit}>
              <FileEdit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          <Button variant="outline" onClick={copyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Text
          </Button>
          {onExport && (
            <div className="relative">
              <Button 
                variant="outline" 
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)} 
                disabled={isExporting}
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export'}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
              {isExportMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 border border-gray-200 dark:border-gray-700">
                  <div className="py-1">
                    <button 
                      onClick={() => { 
                        setIsExportMenuOpen(false); 
                        handleExport('txt'); 
                      }} 
                      className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      disabled={isExporting}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Export as TXT
                    </button>
                    <button 
                      onClick={() => { 
                        setIsExportMenuOpen(false); 
                        handleExport('pdf'); 
                      }} 
                      className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      disabled={isExporting}
                    >
                      <FileIcon className="mr-2 h-4 w-4" />
                      Export as PDF
                    </button>
                    <button 
                      onClick={() => { 
                        setIsExportMenuOpen(false); 
                        handleExport('docx'); 
                      }} 
                      className="flex items-center w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                      disabled={isExporting}
                    >
                      <FileIcon className="mr-2 h-4 w-4" />
                      Export as DOCX
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {onSave && (
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Document'}
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Document Name</p>
            <p className="font-medium">{result.documentName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Confidence</p>
            <p className="font-medium">{Math.round(result.confidence)}%</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pages</p>
            <p className="font-medium">{result.pageCount}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Processing Time</p>
            <p className="font-medium">{(result.processingTime / 1000).toFixed(2)}s</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-sm text-muted-foreground mb-2">Extracted Text</p>
          <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
            {result.text && result.text.trim() !== '' ? (
              <pre className="whitespace-pre-wrap text-sm">{result.text}</pre>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-2">No text could be extracted from this document.</p>
                <p className="text-sm">This may happen with low-quality scans, handwritten text, or heavily formatted documents.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}