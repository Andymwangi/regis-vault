'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Bell, Sun, Moon, Monitor, Languages, Lock, Eye } from 'lucide-react';
import { getCurrentUser, updateUserSettings } from '@/lib/actions/user.actions';
import { User } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Get global theme state from context
  const { theme: currentTheme, fontSize: currentFontSize, setTheme: setGlobalTheme, setFontSize: setGlobalFontSize } = useTheme();
  
  // Settings for user preferences
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(currentTheme);
  const [notifications, setNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [fileUpdates, setFileUpdates] = useState(true);
  const [teamUpdates, setTeamUpdates] = useState(true);
  const [language, setLanguage] = useState('en');
  const [fontSize, setFontSize] = useState(currentFontSize);
  const [autoSave, setAutoSave] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState(30);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userData = await getCurrentUser();
        setUser(userData);
        
        // Load user preferences if available
        if (userData?.settings?.preferences) {
          const { preferences } = userData.settings;
          
          // Only set these values from database if they exist
          // Otherwise keep the current values from the ThemeContext
          if (preferences.theme) {
            setTheme(preferences.theme);
            setGlobalTheme(preferences.theme);
          }
          
          if (preferences.fontSize) {
            setFontSize(preferences.fontSize);
            setGlobalFontSize(preferences.fontSize);
          }
          
          setNotifications(preferences.notifications !== undefined ? preferences.notifications : true);
          setEmailNotifications(preferences.emailNotifications !== undefined ? preferences.emailNotifications : true);
          setFileUpdates(preferences.fileUpdates !== undefined ? preferences.fileUpdates : true);
          setTeamUpdates(preferences.teamUpdates !== undefined ? preferences.teamUpdates : true);
          setLanguage(preferences.language || 'en');
          setAutoSave(preferences.autoSave !== undefined ? preferences.autoSave : true);
          setSessionTimeout(preferences.sessionTimeout || 30);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [setGlobalTheme, setGlobalFontSize]);

  // Apply theme changes immediately and update global state
  const handleThemeChange = (value: string) => {
    const newTheme = value as 'light' | 'dark' | 'system';
    setTheme(newTheme);
    setGlobalTheme(newTheme);  // Update global state
  };

  // Apply font size changes immediately and update global state
  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0];
    setFontSize(newSize);
    setGlobalFontSize(newSize);  // Update global state
  };

  const handleSaveSettings = async () => {
    if (!user) return;
    
    setSaving(true);
    
    try {
      const settingsData = {
        preferences: {
          theme,
          notifications,
          emailNotifications,
          fileUpdates,
          teamUpdates,
          language,
          fontSize,
          autoSave,
          sessionTimeout
        }
      };
      
      await updateUserSettings(user.$id, settingsData);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-red-600"></div>
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">User Not Found</CardTitle>
            <CardDescription>
              Unable to load your settings. Please try again later.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <Button 
          onClick={handleSaveSettings} 
          disabled={saving}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
      
      <Tabs defaultValue="appearance">
        <TabsList className="mb-6">
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          {user.role === 'admin' && <TabsTrigger value="admin">Admin Settings</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme & Display</CardTitle>
              <CardDescription>
                Customize how RegisVault looks for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base">Theme Mode</Label>
                <RadioGroup 
                  value={theme} 
                  onValueChange={handleThemeChange}
                  className="flex flex-row space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="light" id="light" />
                    <Label htmlFor="light" className="flex items-center cursor-pointer">
                      <Sun className="h-4 w-4 mr-2" /> Light
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="dark" id="dark" />
                    <Label htmlFor="dark" className="flex items-center cursor-pointer">
                      <Moon className="h-4 w-4 mr-2" /> Dark
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="system" id="system" />
                    <Label htmlFor="system" className="flex items-center cursor-pointer">
                      <Monitor className="h-4 w-4 mr-2" /> System
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Label className="text-base">Text Size</Label>
                <div className="flex items-center space-x-2">
                  <p className="text-sm">Small</p>
                  <Slider
                    className="w-56"
                    value={[fontSize]}
                    onValueChange={handleFontSizeChange}
                    min={12}
                    max={24}
                    step={1}
                  />
                  <p className="text-sm">Large</p>
                  <span className="ml-4 text-sm text-muted-foreground">{fontSize}px</span>
                </div>
                <div className="text-sm">
                  <span>Preview: </span>
                  <span style={{ fontSize: `${fontSize}px` }}>
                    This text shows your current font size.
                  </span>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label className="text-base">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="pt">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Manage how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications within the application
                  </p>
                </div>
                <Switch
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive important updates via email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">File Update Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified when your files are modified
                  </p>
                </div>
                <Switch
                  checked={fileUpdates}
                  onCheckedChange={setFileUpdates}
                />
              </div>
              
              <Separator />
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Team Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Get notified about team activities and mentions
                  </p>
                </div>
                <Switch
                  checked={teamUpdates}
                  onCheckedChange={setTeamUpdates}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Preferences</CardTitle>
              <CardDescription>
                Customize your RegisVault experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Auto-Save Documents</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save document changes
                  </p>
                </div>
                <Switch
                  checked={autoSave}
                  onCheckedChange={setAutoSave}
                />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Label className="text-base">Session Timeout (minutes)</Label>
                <div className="flex items-center space-x-2">
                  <p className="text-sm">5</p>
                  <Slider
                    className="w-56"
                    value={[sessionTimeout]}
                    onValueChange={(value) => setSessionTimeout(value[0])}
                    min={5}
                    max={60}
                    step={5}
                  />
                  <p className="text-sm">60</p>
                  <span className="ml-4 text-sm text-muted-foreground">{sessionTimeout} min</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Your account will be automatically logged out after this period of inactivity
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {user.role === 'admin' && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Settings</CardTitle>
                <CardDescription>
                  Configure administrator-specific settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium flex items-center">
                      <Lock className="h-4 w-4 mr-2" />
                      Enhanced Security Mode
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Require additional authentication for sensitive operations
                    </p>
                  </div>
                  <Switch
                    checked={true}
                    disabled
                  />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium flex items-center">
                      <Eye className="h-4 w-4 mr-2" />
                      System Activity Monitoring
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Track and log all administrative actions
                    </p>
                  </div>
                  <Switch
                    checked={true}
                    disabled
                  />
                </div>
                
                <Separator />
                
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-md">
                  <p className="text-sm text-blue-800 font-medium">
                    Administrator settings are pre-configured for system security. 
                    Additional settings can be adjusted through the admin dashboard.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
} 