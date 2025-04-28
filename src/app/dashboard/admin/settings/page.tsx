'use client';

import { useState, useEffect } from 'react';
import  DashboardLayout  from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Settings, 
  Mail, 
  Shield, 
  HardDrive, 
  Database,
  Save,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemSettings {
  maintenanceMode: boolean;
  allowRegistration: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  emailConfig: {
    serviceId: string;
    templateId: string;
    publicKey: string;
    fromEmail: string;
  };
  security: {
    require2FA: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
  };
  backup: {
    enabled: boolean;
    frequency: string;
    retentionDays: number;
  };
}

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data.settings);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    
    try {
      setSaving(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
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
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  if (!settings) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <p className="text-gray-500">Failed to load settings</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">System Settings</h1>
            <p className="text-gray-500">Configure system-wide settings and preferences</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
                <Switch
                  id="maintenanceMode"
                  checked={settings.maintenanceMode}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, maintenanceMode: checked })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allowRegistration">Allow Registration</Label>
                <Switch
                  id="allowRegistration"
                  checked={settings.allowRegistration}
                  onCheckedChange={(checked) =>
                    setSettings({ ...settings, allowRegistration: checked })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxFileSize">Max File Size (MB)</Label>
                <Input
                  id="maxFileSize"
                  type="number"
                  value={settings.maxFileSize / (1024 * 1024)}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      maxFileSize: Number(e.target.value) * 1024 * 1024,
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Configuration (EmailJS)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serviceId">Service ID</Label>
                <Input
                  id="serviceId"
                  value={settings.emailConfig.serviceId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emailConfig: {
                        ...settings.emailConfig,
                        serviceId: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="templateId">Template ID</Label>
                <Input
                  id="templateId"
                  value={settings.emailConfig.templateId}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emailConfig: {
                        ...settings.emailConfig,
                        templateId: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publicKey">Public Key</Label>
                <Input
                  id="publicKey"
                  type="password"
                  value={settings.emailConfig.publicKey}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emailConfig: {
                        ...settings.emailConfig,
                        publicKey: e.target.value,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  value={settings.emailConfig.fromEmail}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      emailConfig: {
                        ...settings.emailConfig,
                        fromEmail: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="require2FA">Require 2FA</Label>
                <Switch
                  id="require2FA"
                  checked={settings.security.require2FA}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        require2FA: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                <Input
                  id="sessionTimeout"
                  type="number"
                  value={settings.security.sessionTimeout}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        sessionTimeout: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxLoginAttempts">Max Login Attempts</Label>
                <Input
                  id="maxLoginAttempts"
                  type="number"
                  value={settings.security.maxLoginAttempts}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      security: {
                        ...settings.security,
                        maxLoginAttempts: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Backup Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="backupEnabled">Enable Automatic Backups</Label>
                <Switch
                  id="backupEnabled"
                  checked={settings.backup.enabled}
                  onCheckedChange={(checked) =>
                    setSettings({
                      ...settings,
                      backup: {
                        ...settings.backup,
                        enabled: checked,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backupFrequency">Backup Frequency</Label>
                <Select
                  value={settings.backup.frequency}
                  onValueChange={(value) =>
                    setSettings({
                      ...settings,
                      backup: {
                        ...settings.backup,
                        frequency: value,
                      },
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="retentionDays">Retention Period (days)</Label>
                <Input
                  id="retentionDays"
                  type="number"
                  value={settings.backup.retentionDays}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      backup: {
                        ...settings.backup,
                        retentionDays: Number(e.target.value),
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
} 