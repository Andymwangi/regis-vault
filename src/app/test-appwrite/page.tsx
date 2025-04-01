'use client';

import { useEffect, useState } from 'react';
import { verifyAppwriteSetup, account } from '@/lib/appwrite/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function TestAppwritePage() {
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<{
    setup: {
      isValid: boolean;
      issues: string[];
    };
    clientSide: {
      success: boolean;
      message: string;
      error?: string;
    };
    authenticated: boolean;
  }>({
    setup: { isValid: false, issues: [] },
    clientSide: { success: false, message: '' },
    authenticated: false,
  });

  useEffect(() => {
    async function runTests() {
      try {
        // Test 1: Check Appwrite setup
        const setupCheck = await verifyAppwriteSetup();
        
        // Test 2: Check client-side functionality
        let clientSideCheck = { success: false, message: '', error: '' };
        try {
          // Try a simple account check operation
          await account.getPrefs();
          clientSideCheck = { success: true, message: 'Client API is working correctly' };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          clientSideCheck = { success: false, message: 'Client API error', error: errorMessage };
        }
        
        // Test 3: Check if authenticated
        let isAuthenticated = false;
        try {
          const user = await account.get();
          isAuthenticated = !!user.$id;
        } catch (error) {
          // Expected to fail if not logged in
          isAuthenticated = false;
        }
        
        setResults({
          setup: setupCheck,
          clientSide: clientSideCheck,
          authenticated: isAuthenticated,
        });
      } catch (error) {
        console.error('Test failed:', error);
      } finally {
        setLoading(false);
      }
    }
    
    runTests();
  }, []);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Appwrite Integration Test</h1>
      
      {loading ? (
        <p className="text-lg">Running diagnostics...</p>
      ) : (
        <div className="space-y-6">
          {/* Setup Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.setup.isValid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Appwrite Configuration
              </CardTitle>
              <CardDescription>
                Checks if all necessary environment variables are set
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.setup.isValid ? (
                <p className="text-green-600">All configuration variables are present</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-red-600">Configuration issues detected:</p>
                  <ul className="list-disc pl-5">
                    {results.setup.issues.map((issue, i) => (
                      <li key={i} className="text-red-600">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Client-side API Check */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.clientSide.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                Client-side API
              </CardTitle>
              <CardDescription>
                Checks if the client-side Appwrite API is working
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className={results.clientSide.success ? "text-green-600" : "text-red-600"}>
                {results.clientSide.message}
              </p>
              {results.clientSide.error && (
                <div className="mt-2 p-3 bg-red-50 rounded-md">
                  <p className="text-red-800 text-sm font-mono">{results.clientSide.error}</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {results.authenticated ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                )}
                Authentication Status
              </CardTitle>
              <CardDescription>
                Checks if you're currently authenticated
              </CardDescription>
            </CardHeader>
            <CardContent>
              {results.authenticated ? (
                <p className="text-green-600">You are currently signed in</p>
              ) : (
                <p className="text-amber-600">You are not signed in</p>
              )}
            </CardContent>
            <CardFooter>
              {results.authenticated ? (
                <Button onClick={async () => {
                  try {
                    await account.deleteSession('current');
                    window.location.reload();
                  } catch (error) {
                    console.error('Error signing out:', error);
                  }
                }}>
                  Sign Out
                </Button>
              ) : (
                <Link href="/sign-in">
                  <Button>Sign In</Button>
                </Link>
              )}
            </CardFooter>
          </Card>
          
          <div className="mt-6">
            <Link href="/sign-up">
              <Button variant="outline" className="mr-2">Go to Sign Up</Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Go to Home</Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
} 