import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, SlidersHorizontal, Plus, Heart, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import PostCard from '../components/eunoia/PostCard';
import BottomNav from '../components/eunoia/BottomNav';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';

const categories = [
  { id: 'mixed', labelKey: 'square.categories.mixed' },
  { id: 'AI Relief', labelKey: 'square.categories.ai' },
  { id: 'Treehole', labelKey: 'square.categories.treehole' },
  { id: 'Support Center', labelKey: 'square.categories.support' },
  { id: 'Challenges', labelKey: 'square.categories.challenges' },
];

export default function EunoiaSquare() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeCategory, setActiveCategory] = useState('mixed');
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  const { data: posts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_at'),
    initialData: [],
  });

  const { data: authorProfiles = {} } = useQuery({
    queryKey: ['authorProfiles', posts.length],
    queryFn: async () => {
      const emails = Array.from(new Set((posts || []).map(p => p.created_by).filter(Boolean)));
      const entries = await Promise.all(
        emails.map(async (email) => {
          try {
            const u = await base44.users.getByEmail(email);
            return [email, u];
          } catch {
            return [email, null];
          }
        })
      );
      return Object.fromEntries(entries);
    },
    enabled: (posts || []).length > 0,
    initialData: {},
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const likeMutation = useMutation({
    mutationFn: async ({ postId, currentLikes, likedBy }) => {
      const userEmail = user?.email || 'anonymous';
      const isLiked = likedBy?.includes(userEmail);
      
      if (isLiked) {
        return base44.entities.Post.update(postId, {
          likes_count: Math.max(0, currentLikes - 1),
          liked_by: likedBy.filter(email => email !== userEmail),
        });
      } else {
        return base44.entities.Post.update(postId, {
          likes_count: currentLikes + 1,
          liked_by: [...(likedBy || []), userEmail],
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
  });

  const handleLike = (post, e) => {
    e.stopPropagation();
    likeMutation.mutate({
      postId: post.id,
      currentLikes: post.likes_count || 0,
      likedBy: post.liked_by || [],
    });
  };

  const handlePostClick = (postId) => {
    navigate(createPageUrl('PostDetail') + '?id=' + postId);
  };

  const filteredPosts = activeCategory === 'mixed' 
    ? posts 
    : posts.filter(post => post.category === activeCategory);

  const isLiked = (post) => {
    return post.liked_by?.includes(user?.email);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/30 to-white pb-24">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 pt-safe pb-3">
          <div className="flex items-center justify-between mb-4 pt-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('square.title')}</h1>
            <Button variant="ghost" size="icon" className="rounded-full flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
            </Button>
          </div>
          
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
            <Input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('square.searchPlaceholder')}
              className="pl-10 rounded-2xl border-gray-200 h-11 bg-gray-50 focus:bg-white transition-colors"
            />
          </div>

          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <TabsList className="w-full justify-start overflow-x-auto bg-transparent border-b border-gray-100 rounded-none h-auto p-0 scrollbar-hide">
              {categories.map(cat => (
                <TabsTrigger
                  key={cat.id}
                  value={cat.id}
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:text-teal-600 data-[state=active]:bg-transparent px-4 py-3 text-sm font-medium whitespace-nowrap"
                >
                  {t(cat.labelKey)}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="space-y-4">
          {filteredPosts.map(post => (
            <Card key={post.id} className="rounded-3xl shadow-sm border-0 overflow-hidden">
              <PostCard 
                post={{
                  ...post,
                  stats: {
                    likes: post.likes_count || 0,
                    comments: post.comments_count || 0,
                  },
                }}
                authorProfile={authorProfiles[post.created_by]}
                createdAt={post.created_at}
                onClick={() => handlePostClick(post.id)}
              />
              
              <div className="px-4 pb-4 flex items-center gap-4 border-t border-gray-100 pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-2 rounded-full ${
                    isLiked(post) ? 'text-pink-600' : 'text-gray-600'
                  }`}
                  onClick={(e) => handleLike(post, e)}
                >
                  <Heart 
                    className="w-4 h-4" 
                    strokeWidth={1.5}
                    fill={isLiked(post) ? 'currentColor' : 'none'}
                  />
                  <span className="text-sm">{post.likes_count || 0}</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 rounded-full text-gray-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePostClick(post.id);
                  }}
                >
                  <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
                  <span className="text-sm">{post.comments_count || 0}</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Button
        size="icon"
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full bg-teal-500 hover:bg-teal-600 shadow-lg z-40 flex items-center justify-center"
        onClick={() => navigate(createPageUrl('CreatePost'))}
        aria-label={t('square.create')}
      >
        <Plus className="w-6 h-6" strokeWidth={2} />
      </Button>

      <BottomNav />
    </div>
  );
}
