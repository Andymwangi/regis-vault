import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  department: string;
  uploadedBy: string;
  relevance: number;
  matchedTags: string[];
  preview: string;
}

interface AISearchBarProps {
  onSelect?: (result: SearchResult) => void;
  placeholder?: string;
  className?: string;
}

export function AISearchBar({ onSelect, placeholder = 'Search files...', className }: AISearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debouncedQuery = useDebounce(query, 300);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const searchFiles = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        const data = await response.json();
        setResults(data.results);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    searchFiles();
  }, [debouncedQuery]);

  return (
    <div ref={searchRef} className="relative w-full">
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
          placeholder={placeholder}
          className={cn("pr-10", className)}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
          ) : (
            <Search className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </div>

      {showResults && (query || results.length > 0) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg">
          {results.length > 0 ? (
            <div className="max-h-96 overflow-auto">
              {results.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    onSelect?.(result);
                    setShowResults(false);
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.name}</span>
                    <span className="text-sm text-gray-500">{result.type}</span>
                  </div>
                  <div className="mt-1 text-sm text-gray-600">
                    <div>Department: {result.department}</div>
                    {result.matchedTags.length > 0 && (
                      <div className="mt-1">
                        <span className="text-xs font-medium text-gray-500">Tags: </span>
                        {result.matchedTags.map((tag) => (
                          <span
                            key={tag}
                            className="mr-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {result.preview && (
                      <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {result.preview}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">
              {loading ? 'Searching...' : 'No results found'}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 