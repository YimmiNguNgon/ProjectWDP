import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertCircle, Plus, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAutoReplyTemplates,
  createAutoReplyTemplate,
  updateAutoReplyTemplate,
  deleteAutoReplyTemplate,
} from '@/api/autoReply';

const TRIGGERS = [
  {
    value: 'first_message',
    label: 'First buyer message',
    description: 'Send when buyer sends the first message',
  },
  {
    value: 'keyword_shipping',
    label: 'Shipping question',
    description: 'Send when buyer asks about shipping',
  },
  {
    value: 'keyword_size',
    label: 'Size question',
    description: 'Send when buyer asks about size',
  },
  {
    value: 'keyword_condition',
    label: 'Condition question',
    description: 'Send when buyer asks about product condition',
  },
  {
    value: 'after_hours',
    label: 'After business hours',
    description: 'Send outside business hours',
  },
];

export default function AutoReplySettings() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const [trigger, setTrigger] = useState('first_message');
  const [message, setMessage] = useState('');
  const [delaySeconds, setDelaySeconds] = useState(0);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const res = await getAutoReplyTemplates();
      setTemplates(res.data || []);
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    try {
      await createAutoReplyTemplate({
        trigger,
        message: message.trim(),
        delaySeconds,
      });

      toast.success('Template created. Waiting for admin approval.');
      setDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to create template');
    }
  };

  const handleUpdate = async () => {
    if (!editingTemplate || !message.trim()) return;

    try {
      await updateAutoReplyTemplate(editingTemplate._id, {
        message: message.trim(),
        delaySeconds,
      });

      toast.success('Template updated. Admin re-approval is required.');
      setDialogOpen(false);
      resetForm();
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update template');
    }
  };

  const handleToggle = async (template: any, enabled: boolean) => {
    if (!template.reviewedByAdmin) {
      toast.error('Template must be approved by admin first');
      return;
    }

    try {
      await updateAutoReplyTemplate(template._id, { enabled });
      toast.success(enabled ? 'Template enabled' : 'Template disabled');
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to update template');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await deleteAutoReplyTemplate(id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to delete template');
    }
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const openEditDialog = (template: any) => {
    setEditingTemplate(template);
    setTrigger(template.trigger);
    setMessage(template.message);
    setDelaySeconds(template.delaySeconds || 0);
    setDialogOpen(true);
  };

  const resetForm = () => {
    setTrigger('first_message');
    setMessage('');
    setDelaySeconds(0);
    setEditingTemplate(null);
  };

  const getTriggerLabel = (value: string) => {
    return TRIGGERS.find((t) => t.value === value)?.label || value;
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Auto-Reply Settings</h1>
        <p className="text-muted-foreground mt-2">Create automatic messages to reply quickly to buyers</p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> All auto-reply templates must be approved by admin before use.
          Messages that violate policy will be rejected.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Your Auto-Reply Templates</CardTitle>
              <CardDescription>Manage your automatic reply templates</CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No templates yet. Create your first template.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((template) => (
                <div key={template._id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline">{getTriggerLabel(template.trigger)}</Badge>
                        {template.reviewedByAdmin ? (
                          <Badge variant="default" className="bg-green-500">
                            Approved
                          </Badge>
                        ) : template.flaggedForReview ? (
                          <Badge variant="destructive">Flagged: {template.flagReason}</Badge>
                        ) : (
                          <Badge variant="secondary">Pending Review</Badge>
                        )}
                        {template.delaySeconds > 0 && <Badge variant="outline">Delay: {template.delaySeconds}s</Badge>}
                      </div>
                      <p className="text-sm mb-2">{template.message}</p>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>Used {template.usageCount || 0} times</span>
                        {template.lastUsedAt && <span>Last used: {new Date(template.lastUsedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={template.enabled}
                        onCheckedChange={(enabled) => handleToggle(template, enabled)}
                        disabled={!template.reviewedByAdmin}
                      />
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(template)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(template._id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Edit Template' : 'Create Auto-Reply Template'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Trigger</Label>
              <Select value={trigger} onValueChange={setTrigger} disabled={!!editingTemplate}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div>
                        <div className="font-medium">{t.label}</div>
                        <div className="text-xs text-muted-foreground">{t.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your auto-reply message..."
                rows={4}
                maxLength={500}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">{message.length}/500 characters</p>
            </div>

            <div>
              <Label>Delay (seconds)</Label>
              <Input
                type="number"
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(parseInt(e.target.value) || 0)}
                min={0}
                max={300}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Delay before sending (0-300 seconds)</p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Template will be sent to admin for approval. It must not include phone numbers, emails,
                or external links outside the platform.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={editingTemplate ? handleUpdate : handleCreate}>
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
