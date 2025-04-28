'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Tag, Search, Plus, X } from 'lucide-react';
import { toast } from 'sonner';

interface File {
  id: string;
  name: string;
  type: string;
  department?: string;
  tags: string[];
  lastModified: string;
}

interface TagSuggestion {
  tag: string;
  confidence: number;
  category: 'department' | 'party' | 'other';
}

export default function TaggingPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/tools/tagging/files');
      if (!response.ok) throw new Error('Failed to fetch files');
      const data = await response.json();
      setFiles(data.files);
    } catch (error) {
      console.error('Error fetching files:', error);
      toast.error('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const getSuggestions = async (fileId: string) => {
    try {
      setProcessing(true);
      const response = await fetch(`/api/tools/tagging/suggestions?fileId=${fileId}`);
      if (!response.ok) throw new Error('Failed to get suggestions');
      const data = await response.json();
      
      // Handle both formats - either direct array or nested in suggestions property
      const suggestionsArray = Array.isArray(data) ? data : data.suggestions || [];
      
      // Map the suggestion format if needed
      const formattedSuggestions = suggestionsArray.map((suggestion: { tag: any; confidence: any; category: any; }) => ({
        tag: suggestion.tag,
        confidence: suggestion.confidence || 0.5,
        category: suggestion.category || 'other'
      }));
      
      setSuggestions(formattedSuggestions);
      setSelectedFile(files.find(f => f.id === fileId) || null);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      toast.error('Failed to get tag suggestions');
      // Set empty array to prevent mapping errors
      setSuggestions([]);
    } finally {
      setProcessing(false);
    }
  };
  const addTag = async (fileId: string, tag: string) => {
    try {
      const response = await fetch('/api/tools/tagging/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, tag }),
      });

      if (!response.ok) throw new Error('Failed to add tag');

      // Update local state
      setFiles(files.map(f => 
        f.id === fileId 
          ? { ...f, tags: [...f.tags, tag] }
          : f
      ));

      if (selectedFile?.id === fileId) {
        setSelectedFile({
          ...selectedFile,
          tags: [...selectedFile.tags, tag],
        });
      }

      toast.success('Tag added successfully');
    } catch (error) {
      console.error('Error adding tag:', error);
      toast.error('Failed to add tag');
    }
  };

  const removeTag = async (fileId: string, tag: string) => {
    try {
      const response = await fetch('/api/tools/tagging/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, tag }),
      });

      if (!response.ok) throw new Error('Failed to remove tag');

      // Update local state
      setFiles(files.map(f => 
        f.id === fileId 
          ? { ...f, tags: f.tags.filter(t => t !== tag) }
          : f
      ));

      if (selectedFile?.id === fileId) {
        setSelectedFile({
          ...selectedFile,
          tags: selectedFile.tags.filter(t => t !== tag),
        });
      }

      toast.success('Tag removed successfully');
    } catch (error) {
      console.error('Error removing tag:', error);
      toast.error('Failed to remove tag');
    }
  };

  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    file.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">AI File Tagging</h1>
            <p className="text-muted-foreground">Automatically tag and categorize your files</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Files List */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Search className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Files</h2>
            </div>
            <Input
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mb-4"
            />
            <ScrollArea className="h-[600px]">
              <div className="space-y-2">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedFile?.id === file.id
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => getSuggestions(file.id)}
                  >
                    <div className="font-medium">{file.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {file.department || 'No department'}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {file.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Tag Suggestions */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="h-5 w-5" />
              <h2 className="text-lg font-semibold">AI Suggestions</h2>
            </div>
            {selectedFile ? (
              <>
                <div className="mb-4">
                  <h3 className="font-medium mb-2">{selectedFile.name}</h3>
                  <div className="flex flex-wrap gap-1">
                    {selectedFile.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          className="ml-1 hover:text-destructive"
                          onClick={() => removeTag(selectedFile.id, tag)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>

                {processing ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {suggestions.map((suggestion) => (
                      <div
                        key={suggestion.tag}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{suggestion.tag}</div>
                          <div className="text-sm text-muted-foreground">
                            {suggestion.category} • {Math.round(suggestion.confidence * 100)}% confidence
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addTag(selectedFile.id, suggestion.tag)}
                        >
                          Add Tag
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a file to view AI tag suggestions
              </div>
            )}
          </Card>

          {/* Manual Tagging */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-5 w-5" />
              <h2 className="text-lg font-semibold">Add Tags</h2>
            </div>
            {selectedFile ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                  />
                  <Button
                    onClick={() => {
                      if (newTag.trim()) {
                        addTag(selectedFile.id, newTag.trim());
                        setNewTag('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Press Enter or click Add to add a new tag
                </div>
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Select a file to add tags
              </div>
            )}
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 