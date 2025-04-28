'use client';

import React, { useState, useEffect, useRef, JSX } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  AlertCircle,
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft,
  Upload,
  Share2,
  Search,
  CheckCircle,
  Building2,
  Users,
  FileText
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Define tour steps for different roles and contexts
type TourStep = {
  id: string;
  title: string;
  description: string;
  target: string;
  placement: 'top' | 'bottom' | 'left' | 'right' | 'center';
};

type TourType = 'general' | 'admin' | 'firstUpload' | 'search' | 'sharing' | 'profile' | 'teams';

type TourStepsMap = {
  [key in TourType]: TourStep[];
};

const TOUR_STEPS: TourStepsMap = {
  general: [
    {
      id: 'welcome',
      title: 'Welcome to RegisVault',
      description: 'Your centralized document management system. Let\'s take a quick tour to help you get started.',
      target: 'body',
      placement: 'center',
    },
    {
      id: 'sidebar',
      title: 'Navigation Sidebar',
      description: 'Access your files, shared documents, recent items, and more from this navigation bar.',
      target: '.lg\\:fixed',
      placement: 'right',
    },
    // ...rest of general steps
  ],
  admin: [
    {
      id: 'adminSection',
      title: 'Admin Controls',
      description: 'As an administrator, you have access to additional management features.',
      target: '#admin-section',
      placement: 'right',
    },
    // ...rest of admin steps
  ],
  firstUpload: [
    {
      id: 'uploadStart',
      title: 'Upload Your First Document',
      description: 'Let\'s upload your first document to get you started.',
      target: '.FileUpload',
      placement: 'left',
    },
    // ...rest of firstUpload steps
  ],
  search: [
    {
      id: 'searchStart',
      title: 'Document Search',
      description: 'Let\'s learn how to quickly find documents in RegisVault.',
      target: '.search-input',
      placement: 'bottom',
    },
    // ...rest of search steps
  ],
  sharing: [
    {
      id: 'sharingStart',
      title: 'Share Documents',
      description: 'Learn how to securely share documents with team members.',
      target: '.share-button',
      placement: 'left',
    },
    // ...rest of sharing steps
  ],
  profile: [
    {
      id: 'profileStart',
      title: 'Profile Management',
      description: 'Let\'s explore how to manage your profile and department affiliation.',
      target: 'body',
      placement: 'center',
    },
    // ...rest of profile steps
  ],
  teams: [
    {
      id: 'teamsStart',
      title: 'Team Collaboration',
      description: 'Let\'s learn how to work with your department teams.',
      target: 'body',
      placement: 'center',
    },
    // ...rest of teams steps
  ]
};

// Type definitions
interface AssistantContextProps {
  isNewUser: boolean;
  setIsNewUser: (value: boolean) => void;
  startTour: (tourType: TourType) => void;
  showHelp: (helpId: string) => void;
  currentRole: 'user' | 'admin';
}

type OriginalStyles = {
  position: string;
  zIndex: string;
};

// Context for the assistant
const AssistantContext = React.createContext<AssistantContextProps | undefined>(undefined);

export const AssistantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNewUser, setIsNewUser] = useState<boolean>(false);
  const [showTour, setShowTour] = useState<boolean>(false);
  const [currentTour, setCurrentTour] = useState<TourType>('general');
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [showHelpDialog, setShowHelpDialog] = useState<boolean>(false);
  const [currentHelpTopic, setCurrentHelpTopic] = useState<string>('');
  const [currentRole, setCurrentRole] = useState<'user' | 'admin'>('user');
  const [highlights, setHighlights] = useState<HTMLElement[]>([]);
  const [completedTours, setCompletedTours] = useState<TourType[]>([]);
  
  const router = useRouter();
  const pathname = usePathname();
  
  // Use a ref to store a map of elements to their original styles
  const originalStylesRef = useRef<Map<HTMLElement, OriginalStyles>>(new Map());
  
  // Use a ref for the help button to avoid re-rendering issues
  const helpButtonRef = useRef<HTMLButtonElement>(null);

  // Check if user is new on initial load
  useEffect(() => {
    const checkFirstTimeUser = () => {
      const hasVisited = localStorage.getItem('regisvault_visited');
      if (!hasVisited) {
        setIsNewUser(true);
        localStorage.setItem('regisvault_visited', 'true');
      }
      
      // Check completed tours
      const savedCompletedTours = localStorage.getItem('regisvault_completed_tours');
      if (savedCompletedTours) {
        setCompletedTours(JSON.parse(savedCompletedTours));
      }
      
      // Check user role
      const userRole = localStorage.getItem('regisvault_user_role');
      if (userRole === 'admin') {
        setCurrentRole('admin');
      }
    };
    
    checkFirstTimeUser();
  }, []);

  // Handle auto-start tours based on pathname and user status
  useEffect(() => {
    if (isNewUser && pathname === '/dashboard') {
      const timer = setTimeout(() => startTour('general'), 1000);
      return () => clearTimeout(timer);
    }
    
    if (isNewUser && pathname === '/dashboard/profile' && !completedTours.includes('profile')) {
      const timer = setTimeout(() => {
        showProfileSuggestionBanner();
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    if (isNewUser && pathname === '/dashboard/teams' && !completedTours.includes('teams')) {
      const timer = setTimeout(() => {
        showTeamsSuggestionBanner();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [pathname, isNewUser, completedTours]);

  // Function to show profile tour suggestion
  const showProfileSuggestionBanner = () => {
    const banner = document.createElement('div');
    banner.className = 'bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 profile-suggestion-banner';
    banner.innerHTML = `
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-blue-700">
            Learn how to manage your profile and department affiliation.
          </p>
          <div class="mt-2">
            <button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 profile-tour-btn">
              Show me how
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Insert the banner at the top of the page
    const container = document.querySelector('.container');
    if (container && container.firstChild) {
      container.insertBefore(banner, container.firstChild);
      
      // Add event listener to the button
      const btn = document.querySelector('.profile-tour-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          document.querySelector('.profile-suggestion-banner')?.remove();
          startTour('profile');
        });
      }
    }
  };
  
  // Function to show teams tour suggestion
  const showTeamsSuggestionBanner = () => {
    const banner = document.createElement('div');
    banner.className = 'bg-blue-50 border-l-4 border-blue-500 p-4 mb-6 teams-suggestion-banner';
    banner.innerHTML = `
      <div class="flex">
        <div class="flex-shrink-0">
          <svg class="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd"/>
          </svg>
        </div>
        <div class="ml-3">
          <p class="text-sm text-blue-700">
            Learn how to access your team files and collaborate with department members.
          </p>
          <div class="mt-2">
            <button class="inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 teams-tour-btn">
              Show me how
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Insert the banner at the top of the page
    const container = document.querySelector('.container');
    if (container && container.firstChild) {
      container.insertBefore(banner, container.firstChild);
      
      // Add event listener to the button
      const btn = document.querySelector('.teams-tour-btn');
      if (btn) {
        btn.addEventListener('click', () => {
          document.querySelector('.teams-suggestion-banner')?.remove();
          startTour('teams');
        });
      }
    }
  };

  // Start a specific tour
  const startTour = (tourType: TourType) => {
    setCurrentTour(tourType);
    setCurrentStepIndex(0);
    setShowTour(true);
  };

  // Show help on a specific topic
  const showHelp = (helpId: string) => {
    setCurrentHelpTopic(helpId);
    setShowHelpDialog(true);
  };

  // Handle navigation through tour steps
  const handleNextStep = () => {
    const steps = TOUR_STEPS[currentTour];
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(prevIndex => prevIndex + 1);
    } else {
      handleCloseTour(true);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prevIndex => prevIndex - 1);
    }
  };

  const handleCloseTour = (completed = false) => {
    clearHighlights();
    setShowTour(false);
    
    if (completed && !completedTours.includes(currentTour)) {
      const updatedCompletedTours = [...completedTours, currentTour];
      setCompletedTours(updatedCompletedTours);
      localStorage.setItem('regisvault_completed_tours', JSON.stringify(updatedCompletedTours));
    }
  };

  // Highlight the target element
  const highlightElement = (selector: string) => {
    clearHighlights();
    
    if (selector === 'body') return; // Center dialogs don't need highlights
    
    // Try to find the element
    let elements = document.querySelectorAll(selector);
    
    // If no elements found and we're in development, log a warning
    if (elements.length === 0 && process.env.NODE_ENV !== 'production') {
      console.warn(`Element not found for selector: ${selector}`);
      
      // Attempt to find a similar element based on common patterns
      let alternateSelectors: string[] = [];
      
      if (selector.includes('FileUpload')) {
        alternateSelectors = ['.upload-button', 'button:contains("Upload")', '[aria-label*="upload"]'];
      } else if (selector.includes('department-selector')) {
        alternateSelectors = ['.department-dropdown', 'select[name*="department"]', '.combobox'];
      }
      
      // Try alternate selectors
      for (const altSelector of alternateSelectors) {
        try {
          const altElements = document.querySelectorAll(altSelector);
          if (altElements.length > 0) {
            console.info(`Found alternate element with selector: ${altSelector}`);
            elements = altElements;
            break;
          }
        } catch (e) {
          // Ignore errors for invalid selectors
        }
      }
    }
    
    const newHighlightedElements: HTMLElement[] = [];
    
    elements.forEach((el) => {
      if (el instanceof HTMLElement) {
        // Store original styles in our Map only if not already stored
        if (!originalStylesRef.current.has(el)) {
          originalStylesRef.current.set(el, {
            position: el.style.position,
            zIndex: el.style.zIndex
          });
        }
        
        // Apply highlight styles
        el.style.position = 'relative';
        el.style.zIndex = '1001';
        el.classList.add('regisvault-highlight');
        
        newHighlightedElements.push(el);
      }
    });
    
    setHighlights(newHighlightedElements);
  };

  const clearHighlights = () => {
    highlights.forEach((el) => {
      // Only process if element still exists in DOM
      if (el && document.body.contains(el)) {
        // Restore original styles from our Map
        const originalStyles = originalStylesRef.current.get(el);
        if (originalStyles) {
          el.style.position = originalStyles.position;
          el.style.zIndex = originalStyles.zIndex;
          el.classList.remove('regisvault-highlight');
        }
      }
      // Clean up the Map entry
      originalStylesRef.current.delete(el);
    });
    
    setHighlights([]);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => clearHighlights();
  }, []);

  // Highlight current step element when tour or step changes
  useEffect(() => {
    if (showTour && TOUR_STEPS[currentTour] && TOUR_STEPS[currentTour][currentStepIndex]) {
      const currentStep = TOUR_STEPS[currentTour][currentStepIndex];
      highlightElement(currentStep.target);
    }
  }, [showTour, currentTour, currentStepIndex]);

  // Context value memoization to prevent unnecessary re-renders
  const contextValue = React.useMemo(() => ({
    isNewUser,
    setIsNewUser,
    startTour,
    showHelp,
    currentRole
  }), [isNewUser, currentRole]);

  return (
    <AssistantContext.Provider value={contextValue}>
      {children}
      
      {/* Tour Dialog */}
      {showTour && TOUR_STEPS[currentTour] && TOUR_STEPS[currentTour][currentStepIndex] && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="absolute z-[1002]">
            {TOUR_STEPS[currentTour][currentStepIndex].placement !== 'center' ? (
              <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">
                    {TOUR_STEPS[currentTour][currentStepIndex].title}
                  </h3>
                  <Button variant="ghost" size="sm" onClick={() => handleCloseTour()}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <p className="mb-6">{TOUR_STEPS[currentTour][currentStepIndex].description}</p>
                <div className="flex justify-between">
                  <div>
                    <Button 
                      variant="outline" 
                      onClick={handlePrevStep}
                      disabled={currentStepIndex === 0}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Back
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleCloseTour()}>
                      Skip
                    </Button>
                    <Button onClick={handleNextStep} className="bg-red-600 hover:bg-red-700 text-white">
                      {currentStepIndex === TOUR_STEPS[currentTour].length - 1 ? (
                        <>
                          Finish
                          <CheckCircle className="h-4 w-4 ml-1" />
                        </>
                      ) : (
                        <>
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Dialog open={true} onOpenChange={() => handleCloseTour()}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{TOUR_STEPS[currentTour][currentStepIndex].title}</DialogTitle>
                    <DialogDescription>
                      {TOUR_STEPS[currentTour][currentStepIndex].description}
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <div className="flex justify-between w-full">
                      <Button 
                        variant="outline" 
                        onClick={handlePrevStep}
                        disabled={currentStepIndex === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                      <Button onClick={handleNextStep} className="bg-red-600 hover:bg-red-700 text-white">
                        {currentStepIndex === TOUR_STEPS[currentTour].length - 1 ? (
                          <>
                            Finish
                            <CheckCircle className="h-4 w-4 ml-1" />
                          </>
                        ) : (
                          <>
                            Next  
                            <ChevronRight className="h-4 w-4 ml-1" />
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      )}
      
      {/* Help Dialog */}
      <Dialog open={showHelpDialog} onOpenChange={setShowHelpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Help: {getHelpTitle(currentHelpTopic)}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {renderHelpContent(currentHelpTopic, contextValue)}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowHelpDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Help Button that's always visible - FIX: Move tooltip outside component to avoid re-renders */}
      <div className="fixed bottom-4 right-4 z-50">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                ref={helpButtonRef}
                className="rounded-full h-12 w-12 shadow-lg bg-red-600 hover:bg-red-700" 
                onClick={() => setShowHelpDialog(true)}
              >
                <HelpCircle className="h-6 w-6" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>Need help?</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Task Suggestion Banner for new users */}
      {isNewUser && !completedTours.includes('firstUpload') && pathname === '/dashboard' && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                Welcome to RegisVault! Get started by uploading your first document.
              </p>
              <div className="mt-2">
                <Button size="sm" onClick={() => startTour('firstUpload')} className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                  Show me how
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile completion suggestion for new users */}
      {isNewUser && !completedTours.includes('profile') && pathname?.includes('files') && !pathname?.includes('upload') && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Users className="h-5 w-5 text-amber-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                Complete your profile by setting up your department affiliation.
              </p>
              <div className="mt-2">
                <Button 
                  size="sm" 
                  onClick={() => router.push('/dashboard/profile')}
                  className="bg-amber-100 text-amber-700 hover:bg-amber-200 mr-2"
                >
                  Go to Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AssistantContext.Provider>
  );
};

function getHelpTitle(helpId: string): string {
  const titles: Record<string, string> = {
    'upload': 'Uploading Files',
    'search': 'Searching Documents',
    'sharing': 'Sharing Files',
    'admin': 'Administrator Functions',
    'teams': 'Team Collaboration',
    'profile': 'Profile Management',
    'departments': 'Department Management',
    'general': 'Help Center',
  };
  
  return titles[helpId] || 'Help Center';
}

// Helper function to get help content
function renderHelpContent(helpId: string, assistant: AssistantContextProps): React.ReactNode {
  const helpContents: Record<string, React.ReactNode> = {
    'upload': (
      <div className="space-y-4">
        <h4 className="font-medium">How to upload files</h4>
        <ol className="list-decimal list-inside space-y-2">
          <li>Click the "Upload Files" button in the top right corner</li>
          <li>Select one or more files from your computer</li>
          <li>Choose a department (optional)</li>
          <li>Add tags to help with searching later (optional)</li>
          <li>Click "Upload" to complete the process</li>
        </ol>
        <p>Supported file types: PDF, DOCX, XLSX, PPTX, JPG, PNG, TXT</p>
        <Button 
          variant="outline" 
          className="flex items-center" 
          onClick={() => assistant.startTour('firstUpload')}
        >
          <Upload className="h-4 w-4 mr-2" />
          Start upload tutorial
        </Button>
      </div>
    ),
    'search': (
      <div className="space-y-4">
        <h4 className="font-medium">How to search for documents</h4>
        <p>
          Use the search bar at the top of the page to find documents by name, content,
          tags, or departments.
        </p>
        <h5 className="font-medium">Advanced search tips:</h5>
        <ul className="list-disc list-inside space-y-1">
          <li>Use quotes for exact phrase matching: "budget report"</li>
          <li>Filter by department: dept:HR</li>
          <li>Filter by file type: type:pdf</li>
          <li>Filter by date: after:2023-01-01</li>
          <li>Combine filters: "budget report" dept:Finance after:2023-01-01</li>
        </ul>
        <Button 
          variant="outline" 
          className="flex items-center" 
          onClick={() => assistant.startTour('search')}
        >
          <Search className="h-4 w-4 mr-2" />
          Start search tutorial
        </Button>
      </div>
    ),
    // Other help content sections...
    'general': (
      <div className="space-y-4">
        <h4 className="font-medium">RegisVault Help Center</h4>
        <p>
          Welcome to RegisVault, your centralized document management system. What would you like help with?
        </p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => assistant.showHelp('upload')}>
            Uploading Files
          </Button>
          <Button variant="outline" onClick={() => assistant.showHelp('search')}>
            Searching Documents
          </Button>
          <Button variant="outline" onClick={() => assistant.showHelp('sharing')}>
            Sharing Files
          </Button>
          <Button variant="outline" onClick={() => assistant.showHelp('teams')}>
            Team Collaboration
          </Button>
          <Button variant="outline" onClick={() => assistant.showHelp('profile')}>
            Profile Management
          </Button>
          {assistant.currentRole === 'admin' && (
            <Button variant="outline" onClick={() => assistant.showHelp('admin')}>
              Admin Functions
            </Button>
          )}
        </div>
        <div className="mt-4">
          <Button onClick={() => assistant.startTour('general')}>
            Restart Welcome Tour
          </Button>
        </div>
      </div>
    ),
    // Additional help content sections...
  };

  return helpContents[helpId] || helpContents['general'];
}

// Hook to use the assistant
export const useAssistant = (): AssistantContextProps => {
  const context = React.useContext(AssistantContext);
  if (context === undefined) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};

// CSS styles for the assistant
export const AssistantStyles = (): JSX.Element => (
  <style jsx global>{`
    .regisvault-highlight {
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
      border-radius: 4px;
      transition: all 0.2s ease;
      position: relative;
      z-index: 1001 !important;
    }
    
    .tour-step-indicator {
      display: flex;
      justify-content: center;
      gap: 4px;
      margin-top: 12px;
    }
    
    .tour-step-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #e5e7eb;
    }
    
    .tour-step-dot.active {
      background-color: #3b82f6;
    }
  `}</style>
);

// Helper component for page-specific contextual help
interface PageContextualHelpProps {
  pageName: 'files' | 'upload' | 'shared' | 'profile' | 'teams' | 'departments' | 'analytics' | 'users';
  children?: React.ReactNode;
}

export const PageContextualHelp: React.FC<PageContextualHelpProps> = ({ pageName, children }) => {
  const { isNewUser, startTour } = useAssistant();
  const [showBanner, setShowBanner] = useState(true);
  
  // Map pages to their relevant tours and help content
  const pageToTourMap: Record<string, { 
    tour: TourType, 
    title: string, 
    description: string,
    icon: React.ReactNode
  }> = {
    'files': {
      tour: 'general',
      title: 'Document Management',
      description: 'Learn how to organize and manage your documents effectively.',
      icon: <FileText className="h-5 w-5 text-blue-500" />
    },
    'upload': {
      tour: 'firstUpload',
      title: 'Upload Documents',
      description: 'Learn how to upload and categorize your documents.',
      icon: <Upload className="h-5 w-5 text-blue-500" />
    },
    'shared': {
      tour: 'sharing',
      title: 'Shared Documents',
      description: 'Discover how to collaborate with documents shared with you.',
      icon: <Share2 className="h-5 w-5 text-blue-500" />
    },
    'profile': {
      tour: 'profile',
      title: 'Profile Management',
      description: 'Complete your profile and manage your department affiliation.',
      icon: <Users className="h-5 w-5 text-blue-500" />
    },
    'teams': {
      tour: 'teams',
      title: 'Team Collaboration',
      description: 'Learn how to work with your department team and access shared resources.',
      icon: <Users className="h-5 w-5 text-blue-500" />
    },
    'departments': {
      tour: 'teams',
      title: 'Department Management',
      description: 'Explore how departments are organized and managed.',
      icon: <Building2 className="h-5 w-5 text-blue-500" />
    },
    'analytics': {
      tour: 'admin',
      title: 'Analytics Dashboard',
      description: 'Understand how to use the analytics features effectively.',
      icon: <AlertCircle className="h-5 w-5 text-blue-500" />
    },
    'users': {
      tour: 'admin',
      title: 'User Management',
      description: 'Learn how to manage users and their permissions.',
      icon: <Users className="h-5 w-5 text-blue-500" />
    }
  };
  
  const pageInfo = pageToTourMap[pageName];
  
  if (!pageInfo || !isNewUser || !showBanner) {
    return <>{children}</>;
  }
  
  return (
    <>
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            {pageInfo.icon}
          </div>
          <div className="ml-3 flex-1">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  {pageInfo.title}
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  {pageInfo.description}
                </p>
              </div>
              <button 
                onClick={() => setShowBanner(false)}
                className="text-blue-500 hover:text-blue-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2">
              <Button 
                size="sm" 
                onClick={() => startTour(pageInfo.tour)}
                className="bg-blue-100 text-blue-700 hover:bg-blue-200 mr-2"
              >
                Show me how
              </Button>
            </div>
          </div>
        </div>
      </div>
      {children}
    </>
  );
};

// For easy integration in _app.tsx or layout.tsx
export const RegisvaultAssistant: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AssistantProvider>
      {children}
      <AssistantStyles />
    </AssistantProvider>
  );
};
