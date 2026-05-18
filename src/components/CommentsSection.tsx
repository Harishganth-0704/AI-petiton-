import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, Send, Loader2 } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';

interface Comment {
    id: number;
    content: string;
    created_at: string;
    user_name: string;
    role: string;
}

export function CommentsSection({ petitionId }: { petitionId: number }) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = async () => {
        try {
            const data = await apiFetch(`/api/comments/${petitionId}`);
            setComments(data);
        } catch (err) {
            console.error('Failed to fetch comments:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [petitionId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || !user) return;

        setSubmitting(true);
        try {
            const response = await apiFetch(`/api/comments/${petitionId}`, {
                method: 'POST',
                body: JSON.stringify({ content: newComment }),
            });
            
            if (response.comment) {
                const commentWithUser = {
                    ...response.comment,
                    user_name: user.name,
                    role: user.role
                };
                setComments(prev => [...prev, commentWithUser]);
                setNewComment('');
                toast.success(t('comment_added_success') || 'Comment added successfully');
            }
        } catch (err: any) {
            toast.error(err.message || 'Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0">
                <CardTitle className="text-sm font-heading flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    {t('comments_title') || 'Community Discussion'}
                    <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {comments.length}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
                {/* Comment Form */}
                {user ? (
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <Textarea
                            placeholder={t('comment_placeholder') || "Add a comment or support this petition..."}
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="bg-background/50 resize-none"
                            rows={3}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" size="sm" disabled={!newComment.trim() || submitting} className="gap-2">
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                                {t('post_comment_btn') || 'Post Comment'}
                            </Button>
                        </div>
                    </form>
                ) : (
                    <div className="p-4 rounded-xl bg-muted/50 text-center text-xs text-muted-foreground border border-dashed">
                        {t('login_to_comment') || 'Please login to participate in the discussion.'}
                    </div>
                )}

                {/* Comments List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        </div>
                    ) : comments.length === 0 ? (
                        <p className="text-sm text-center text-muted-foreground py-4 italic">
                            {t('no_comments_yet') || 'No comments yet. Start the conversation!'}
                        </p>
                    ) : (
                        comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3 items-start group">
                                <Avatar className="w-8 h-8 border mt-0.5">
                                    <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                        {comment.user_name.split(' ').map(n => n[0]).join('')}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold">{comment.user_name}</span>
                                            {comment.role !== 'citizen' && (
                                                <span className="text-[10px] font-black uppercase tracking-tighter bg-primary/10 text-primary px-1.5 rounded">
                                                    {comment.role}
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 p-3 rounded-2xl rounded-tl-none">
                                        {comment.content}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
