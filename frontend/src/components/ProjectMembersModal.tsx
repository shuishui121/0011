import { useState, useEffect } from "react";
import type { Project, ProjectMember, ProjectRole } from "@/types";
import { projectsAPI } from "@/lib/api";
import { X, UserPlus, Shield, Edit, Eye, Trash2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  project: Project;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProjectMembersModal({ project, onClose, onUpdate }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<ProjectRole>("viewer");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [project.id]);

  const loadMembers = async () => {
    try {
      const data = await projectsAPI.listMembers(project.id);
      setMembers(data);
    } catch (error) {
      console.error("加载成员失败:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setIsAdding(true);
    try {
      await projectsAPI.addMember(project.id, Number(userId), role);
      await loadMembers();
      onUpdate();
      setShowAddForm(false);
      setUserId("");
      setRole("viewer");
    } catch (error) {
      console.error("添加成员失败:", error);
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateRole = async (memberId: number, newRole: ProjectRole) => {
    try {
      await projectsAPI.updateMemberRole(project.id, memberId, newRole);
      await loadMembers();
      onUpdate();
    } catch (error) {
      console.error("更新角色失败:", error);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm("确定要移除该成员吗？")) return;
    try {
      await projectsAPI.removeMember(project.id, memberId);
      await loadMembers();
      onUpdate();
    } catch (error) {
      console.error("移除成员失败:", error);
    }
  };

  const roleInfo: Record<ProjectRole, { label: string; icon: any; color: string }> = {
    admin: { label: "管理员", icon: Shield, color: "text-red-400 bg-red-500/10" },
    editor: { label: "编辑者", icon: Edit, color: "text-blue-400 bg-blue-500/10" },
    viewer: { label: "观察者", icon: Eye, color: "text-green-400 bg-green-500/10" },
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold">项目成员</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-800">
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-dashed border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-500 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              添加成员
            </button>
          ) : (
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">用户 ID</label>
                <input
                  type="number"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  placeholder="输入用户 ID"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">角色</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as ProjectRole)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                >
                  <option value="viewer">观察者</option>
                  <option value="editor">编辑者</option>
                  <option value="admin">管理员</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={isAdding || !userId}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-500/50 text-slate-900 text-sm font-semibold rounded-lg transition-colors"
                >
                  {isAdding ? "添加中..." : "添加"}
                </button>
              </div>
            </form>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-slate-500">加载中...</div>
          ) : (
            members.map((member) => {
              const info = roleInfo[member.role];
              const Icon = info.icon;
              const isOwner = member.user_id === project.owner_id;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: member.user.avatar_color }}
                  >
                    {member.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">
                        {member.user.full_name || member.user.username}
                      </span>
                      {isOwner && (
                        <span className="px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                          所有者
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-slate-500">@{member.user.username}</span>
                  </div>
                  {!isOwner && (
                    <>
                      <select
                        value={member.role}
                        onChange={(e) => handleUpdateRole(member.id, e.target.value as ProjectRole)}
                        className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <option value="viewer">观察者</option>
                        <option value="editor">编辑者</option>
                        <option value="admin">管理员</option>
                      </select>
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {isOwner && (
                    <div className={cn("px-2.5 py-1 rounded text-xs font-medium", info.color)}>
                      <span className="flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        {info.label}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
