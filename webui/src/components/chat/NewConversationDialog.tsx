import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { api } from '../../lib/api';
import type { User } from '../../types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { participantIds: string[]; title?: string; isGroup?: boolean }) => Promise<void>;
}

export function NewConversationDialog({ open, onOpenChange, onCreate }: NewConversationDialogProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState('');
  const [isGroup, setIsGroup] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      loadUsers();
    }
  }, [open]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const fetchedUsers = await api.getUsers();
      setUsers(fetchedUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUserIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUserIds(newSelected);
    
    // Auto-enable group mode if more than 1 user selected
    if (newSelected.size > 1) {
      setIsGroup(true);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    
    if (selectedUserIds.size === 0) return;

    setIsSubmitting(true);
    try {
      await onCreate({ 
        participantIds: Array.from(selectedUserIds), 
        title: title.trim() || undefined, 
        isGroup 
      });
      setSelectedUserIds(new Set());
      setTitle('');
      setIsGroup(false);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Start a new conversation</DialogTitle>
            <DialogDescription>
              Select people to chat with. You are included automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Select participants ({selectedUserIds.size} selected)
            </label>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-4 text-center">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No other users found. Invite someone to join!
              </div>
            ) : (
              <div className="border rounded-md max-h-64 overflow-y-auto">
                {users.map((user) => {
                  const isSelected = selectedUserIds.has(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => toggleUser(user.id)}
                      className={`w-full flex items-center gap-3 p-3 hover:bg-accent transition-colors ${
                        isSelected ? 'bg-accent/50' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="rounded"
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} />
                        <AvatarFallback>
                          {user.displayName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium">{user.displayName}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedUserIds.size > 1 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Group name (optional)
              </label>
              <Input
                placeholder="Product launch planning"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </div>
          )}

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(event) => setIsGroup(event.target.checked)}
              disabled={selectedUserIds.size > 1}
            />
            This is a group conversation
            {selectedUserIds.size > 1 && (
              <span className="text-xs text-muted-foreground">(auto-enabled)</span>
            )}
          </label>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || selectedUserIds.size === 0}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
