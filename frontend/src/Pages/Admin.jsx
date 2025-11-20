import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { EyeOff, Eye, Shield, ShieldOff, RefreshCw } from 'lucide-react';

export default function Admin() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: stats } = useQuery({ queryKey: ['adminStats'], queryFn: () => base44.admin.stats() });
  const { data: posts = [] } = useQuery({ queryKey: ['adminPosts'], queryFn: () => base44.admin.listPosts({ order: '-created_at', limit: 50 }) });
  const { data: styles = [] } = useQuery({ queryKey: ['adminStyles'], queryFn: () => base44.admin.listChatStyles({ order: '-created_at', limit: 50 }) });
  const { data: users = [] } = useQuery({ queryKey: ['adminUsers'], queryFn: () => base44.admin.listUsers({ order: '-created_at', limit: 50 }) });

  const updatePost = useMutation({
    mutationFn: ({ id, admin_hidden }) => base44.admin.updatePost(id, { admin_hidden }),
    onSuccess: () => qc.invalidateQueries(['adminPosts']),
  });

  const updateStyle = useMutation({
    mutationFn: ({ id, is_deleted_by_author }) => base44.admin.updateChatStyle(id, { is_deleted_by_author }),
    onSuccess: () => qc.invalidateQueries(['adminStyles']),
  });

  const updateUser = useMutation({
    mutationFn: ({ id, subscription_tier }) => base44.admin.updateUser(id, { subscription_tier }),
    onSuccess: () => qc.invalidateQueries(['adminUsers']),
  });

  const togglePost = (post) => updatePost.mutate({ id: post.id, admin_hidden: !post.admin_hidden });
  const toggleStyle = (style) => updateStyle.mutate({ id: style.id, is_deleted_by_author: !style.is_deleted_by_author });
  const toggleUser = (user) => updateUser.mutate({ id: user.id, subscription_tier: user.subscription_tier === 'banned' ? 'free' : 'banned' });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-16">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Control</h1>
            <p className="text-sm text-gray-500">帖子 / 角色 / 用户 / 数据看板</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => navigate(createPageUrl('EunoiaHome'))}>
            返回用户端
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 rounded-2xl shadow-sm border-0">
            <p className="text-xs text-gray-500">用户数</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.user_count ?? '-'}</p>
          </Card>
          <Card className="p-4 rounded-2xl shadow-sm border-0">
            <p className="text-xs text-gray-500">帖子总数</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.post_count ?? '-'}</p>
          </Card>
          <Card className="p-4 rounded-2xl shadow-sm border-0">
            <p className="text-xs text-gray-500">对话记录</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.chat_history_count ?? '-'}</p>
          </Card>
          <Card className="p-4 rounded-2xl shadow-sm border-0">
            <p className="text-xs text-gray-500">今日对话</p>
            <p className="text-2xl font-bold text-gray-900">{stats?.today_chat_histories ?? '-'}</p>
          </Card>
        </div>

        {/* Posts */}
        <Card className="p-4 rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">帖子管理</h2>
            <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries(['adminPosts'])}>
              <RefreshCw className="w-4 h-4 mr-2" strokeWidth={2} /> 刷新
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {posts.map((post) => (
              <div key={post.id} className="p-3 rounded-xl border border-gray-100 flex items-center justify-between bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{post.title}</p>
                  <p className="text-xs text-gray-500">#{post.category} · by {post.created_by}</p>
                </div>
                <Button
                  size="sm"
                  variant={post.admin_hidden ? 'outline' : 'secondary'}
                  className="rounded-full"
                  onClick={() => togglePost(post)}
                  disabled={updatePost.isLoading}
                >
                  {post.admin_hidden ? <Eye className="w-4 h-4 mr-1" /> : <EyeOff className="w-4 h-4 mr-1" />}
                  {post.admin_hidden ? '显示' : '隐藏'}
                </Button>
              </div>
            ))}
            {posts.length === 0 && <p className="text-sm text-gray-500 text-center py-4">暂无帖子</p>}
          </div>
        </Card>

        {/* Styles */}
        <Card className="p-4 rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">角色管理</h2>
            <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries(['adminStyles'])}>
              <RefreshCw className="w-4 h-4 mr-2" strokeWidth={2} /> 刷新
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {styles.map((style) => (
              <div key={style.id} className="p-3 rounded-xl border border-gray-100 flex items-center justify-between bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{style.name}</p>
                  <p className="text-xs text-gray-500">by {style.created_by}</p>
                </div>
                <Button
                  size="sm"
                  variant={style.is_deleted_by_author ? 'outline' : 'secondary'}
                  className="rounded-full"
                  onClick={() => toggleStyle(style)}
                  disabled={updateStyle.isLoading}
                >
                  {style.is_deleted_by_author ? <Shield className="w-4 h-4 mr-1" /> : <ShieldOff className="w-4 h-4 mr-1" />}
                  {style.is_deleted_by_author ? '恢复' : '禁用'}
                </Button>
              </div>
            ))}
            {styles.length === 0 && <p className="text-sm text-gray-500 text-center py-4">暂无角色</p>}
          </div>
        </Card>

        {/* Users */}
        <Card className="p-4 rounded-2xl shadow-sm border-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">用户管理</h2>
            <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries(['adminUsers'])}>
              <RefreshCw className="w-4 h-4 mr-2" strokeWidth={2} /> 刷新
            </Button>
          </div>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {users.map((u) => (
              <div key={u.id} className="p-3 rounded-xl border border-gray-100 flex items-center justify-between bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{u.email}</p>
                  <p className="text-xs text-gray-500">角色: {u.role || 'user'} · 状态: {u.subscription_tier}</p>
                </div>
                <Button
                  size="sm"
                  variant={u.subscription_tier === 'banned' ? 'outline' : 'secondary'}
                  className="rounded-full"
                  onClick={() => toggleUser(u)}
                  disabled={updateUser.isLoading}
                >
                  {u.subscription_tier === 'banned' ? '解禁' : '禁用'}
                </Button>
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-gray-500 text-center py-4">暂无用户</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
