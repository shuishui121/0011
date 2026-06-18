import { useState, useEffect } from "react";
import { commentsAPI } from "@/lib/api";
import type { Comment } from "@/types";
import {
  MessageSquare,
  Send,
  CheckCircle,
  Circle,
  Reply,
  Trash2,
  MessageCircle,
} from "lucide-react";

interface Props {
  documentId: number;
}

export default function CommentsPanel({ documentId }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  useEffect(() => {
    if (documentId) {
      loadComments();
    }
  }, [documentId]);

  const loadComments = async () => {
    try {
      const data = await commentsAPI.list(documentId);
      setComments(data);
    } catch (error) {
      console.error("加载评论失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      await commentsAPI.create(documentId, newComment.trim());
      setNewComment("");
      await loadComments();
    } catch (error) {
      console.error("添加评论失败:", error);
    }
  };

  const handleReply = async (parentId: number) => {
    if (!replyContent.trim()) return;

    try {
      await commentsAPI.create(documentId, replyContent.trim(), parentId);
      setReplyContent("");
      setReplyTo(null);
      await loadComments();
    } catch (error) {
      console.error("回复失败:", error);
    }
  };

  const handleToggleResolve = async (comment: Comment) => {
    try {
      await commentsAPI.update(comment.id, { is_resolved: !comment.is_resolved });
      await loadComments();
    } catch (error) {
      console.error("更新状态失败:", error);
    }
  };

  const handleDelete = async (commentId: number) => {
    if (!confirm("确定要删除这条评论吗？")) return;
    try {
      await commentsAPI.delete(commentId);
      await loadComments();
    } catch (error) {
      console.error("删除评论失败:", error);
    }
  };

  const filteredComments = comments.filter((c) => {
    if (filter === "all") return true;
    if (filter === "open") return !c.is_resolved;
    if (filter === "resolved") return c.is_resolved;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4 text-amber-400" />
          <h4 className="font-medium text-sm">评论</h4>
          <span className="ml-auto px-2 py-0.5 bg-slate-700 rounded text-xs">
            {comments.length}
          </span>
        </div>
        <div className="flex gap-1">
          {(["all", "open", "resolved"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                filter === f
                  ? "bg-amber-500/20 text-amber-400"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {f === "all" ? "全部" : f === "open" ? "待解决" : "已解决"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="text-center py-8 text-slate-500 text-sm">加载中...</div>
        ) : filteredComments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-10 h-10 mx-auto mb-2 text-slate-700" />
            <p className="text-sm text-slate-500">暂无评论</p>
          </div>
        ) : (
          filteredComments.map((comment) => (
            <div
              key={comment.id}
              className={`p-3 rounded-lg border transition-colors ${
                comment.is_resolved
                  ? "bg-slate-800/30 border-slate-700/50 opacity-60"
                  : "bg-slate-800/50 border-slate-700"
              }`}
            >
              <div className="flex items-start gap-2 mb-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: comment.author.avatar_color }}
                >
                  {comment.author.username.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{comment.author.username}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                    {comment.is_resolved && (
                      <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        已解决
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1 text-slate-300">{comment.content}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 ml-9">
                <button
                  onClick={() => handleToggleResolve(comment)}
                  className={`text-xs flex items-center gap-1 transition-colors ${
                    comment.is_resolved
                      ? "text-slate-500 hover:text-green-400"
                      : "text-green-400 hover:text-green-300"
                  }`}
                >
                  {comment.is_resolved ? (
                    <>
                      <Circle className="w-3 h-3" />
                      重新打开
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      标记已解决
                    </>
                  )}
                </button>
                <button
                  onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                  className="text-xs text-slate-500 hover:text-amber-400 flex items-center gap-1 transition-colors"
                >
                  <Reply className="w-3 h-3" />
                  回复
                </button>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors ml-auto"
                >
                  <Trash2 className="w-3 h-3" />
                  删除
                </button>
              </div>

              {replyTo === comment.id && (
                <div className="ml-9 mt-3 flex gap-2">
                  <input
                    type="text"
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="输入回复内容..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    autoFocus
                  />
                  <button
                    onClick={() => handleReply(comment.id)}
                    disabled={!replyContent.trim()}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-900 rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}

              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-9 mt-3 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex items-start gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs flex-shrink-0"
                        style={{ backgroundColor: reply.author.avatar_color }}
                      >
                        {reply.author.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 bg-slate-900/50 rounded-lg p-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">
                            {reply.author.username}
                          </span>
                          <span className="text-xs text-slate-500">
                            {new Date(reply.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs mt-1 text-slate-400">{reply.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="添加评论..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAddComment();
              }
            }}
            className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <button
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-900 rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
