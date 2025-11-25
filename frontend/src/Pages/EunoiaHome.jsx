import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Search, Bell, MessageCircle, Grid3x3, BarChart3, Sparkles, RefreshCw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ActionCard from '../components/eunoia/ActionCard';
import PostCard from '../components/eunoia/PostCard';
import BottomNav from '../components/eunoia/BottomNav';
import { base44 } from '@/api/base44Client';
import { isRenderableImage } from '@/utils/image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';

const quickActions = [
  { id: 1, icon: MessageCircle, titleKey: 'home.quickActions.chat.title', subtitleKey: 'home.quickActions.chat.subtitle', color: 'teal', page: 'EunoiaChat' },
  { id: 2, icon: Grid3x3, titleKey: 'home.quickActions.square.title', subtitleKey: 'home.quickActions.square.subtitle', color: 'pink', page: 'EunoiaSquare' },
  { id: 3, icon: BarChart3, titleKey: 'home.quickActions.analysis.title', subtitleKey: 'home.quickActions.analysis.subtitle', color: 'purple', page: 'EmotionReports' },
  { id: 4, icon: Sparkles, titleKey: 'home.quickActions.course.title', subtitleKey: 'home.quickActions.course.subtitle', color: 'blue', page: 'CourseCenter' },
];

export default function EunoiaHome() {
  const navigate = useNavigate();
  const [dailyQuote, setDailyQuote] = useState('');
  const [loadingQuote, setLoadingQuote] = useState(false);
  const { t } = useTranslation();

  const currentHour = new Date().getHours();
  const greetingKey = currentHour < 12 ? 'home.greeting.morning' : currentHour < 18 ? 'home.greeting.afternoon' : 'home.greeting.evening';
  const greeting = t(greetingKey);

  const { data: posts = [] } = useQuery({
    queryKey: ['posts'],
    queryFn: () => base44.entities.Post.list('-created_at', 6),
    initialData: [],
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: chatHistories = [] } = useQuery({
    queryKey: ['chatHistories'],
    queryFn: async () => {
      if (!user?.email) return [];
      const allChats = await base44.entities.ChatHistory.list('-last_message_at', 1);
      return allChats.filter(chat => chat.created_by === user.email);
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: unreadNotifications = [] } = useQuery({
    queryKey: ['unreadNotifications'],
    queryFn: async () => {
      if (!user?.email) return [];
      const allNotifications = await base44.entities.Notification.list();
      return allNotifications.filter(n => n.recipient_email === user.email && !n.is_read);
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: featuredCourses = [] } = useQuery({
    queryKey: ['featuredCourses'],
    queryFn: async () => {
      const courses = await base44.entities.Course.list();
      return courses.filter(c => c.is_featured).slice(0, 3);
    },
    initialData: [],
  });

  const generateDailyQuote = async () => {
    setLoadingQuote(true);
    try {
      const languageName = t('language.current');
      const prompt = t('home.daily.prompt', { lang: languageName });
      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
      });
      setDailyQuote(response);
    } catch (error) {
      console.error('generate daily quote failed:', error);
      setDailyQuote(t('home.daily.empty'));
    } finally {
      setLoadingQuote(false);
    }
  };

  const handleActionClick = (page) => {
    navigate(createPageUrl(page));
  };

  const handlePostClick = (postId) => {
    navigate(createPageUrl('PostDetail') + '?id=' + postId);
  };

  const isPlusUser = user?.subscription_tier === 'plus';

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/30 to-white pb-24">
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 pt-safe">
          <div className="py-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{t('home.appName')}</h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  {greeting} {t('home.greeting.placeholder')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full relative"
                onClick={() => navigate(createPageUrl('Notifications'))}
              >
                <Bell className="w-5 h-5 text-gray-600" strokeWidth={1.5} />
                {unreadNotifications.length > 0 && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-pink-500 rounded-full" />
                )}
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={1.5} />
              <Input
                placeholder={t('home.searchPlaceholder')}
                className="pl-10 rounded-2xl border-gray-200 h-11 bg-gray-50 focus:bg-white transition-colors"
                onClick={() => navigate(createPageUrl('EunoiaSquare'))}
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4">
        <div className="py-6">
          <Card className="rounded-3xl p-6 bg-gradient-to-br from-teal-500 to-teal-600 text-white border-0 shadow-lg">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-1">{t('home.daily.title')}</h3>
                <p className="text-sm opacity-90">{t('home.daily.subtitle')}</p>
              </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 mb-3 min-h-[80px] flex items-center">
              {dailyQuote ? (
                <p className="text-base leading-relaxed">{dailyQuote}</p>
              ) : (
                <p className="text-sm opacity-75">{t('home.daily.empty')}</p>
              )}
            </div>

            <Button
              className="w-full bg-white/20 hover:bg-white/30 text-white border-0 rounded-2xl h-10 flex items-center justify-center"
              onClick={generateDailyQuote}
              disabled={loadingQuote}
            >
              {loadingQuote ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" strokeWidth={2} />
                  {t('home.daily.generating')}
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" strokeWidth={2} />
                  {dailyQuote ? t('home.daily.another') : t('home.daily.generate')}
                </>
              )}
            </Button>
          </Card>
        </div>

        <div className="py-4">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('home.quickActions.title')}</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(action => (
              <ActionCard
                key={action.id}
                icon={action.icon}
                title={t(action.titleKey)}
                subtitle={t(action.subtitleKey)}
                color={action.color}
                onClick={() => handleActionClick(action.page)}
              />
            ))}
          </div>
        </div>

        {!isPlusUser && (
          <div className="py-4">
            <Card
              className="p-5 rounded-3xl shadow-sm border-0 bg-gradient-to-br from-amber-400 to-orange-500 cursor-pointer hover:shadow-md transition-all"
              onClick={() => navigate(createPageUrl('PlusSubscription'))}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">✨</span>
                    <h3 className="font-bold text-white text-base">{t('home.plus.title')}</h3>
                  </div>
                  <p className="text-sm text-white/90 mb-1">{t('home.plus.desc')}</p>
                  <p className="text-xs text-white/80">{t('home.plus.price')}</p>
                </div>
                <Button className="bg-orange-600 text-white hover:bg-orange-700 rounded-full px-5 h-9 font-semibold shadow-sm">
                  {t('home.plus.cta')}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {chatHistories.length > 0 && chatHistories[0] && (
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">{t('home.continue.title')}</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-teal-600 hover:text-teal-700 text-sm px-2"
                onClick={() => navigate(createPageUrl('EunoiaChat'))}
              >
                {t('home.continue.cta')}
              </Button>
            </div>
            <Card
              className="p-4 rounded-2xl border-0 shadow-sm hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate(createPageUrl('EunoiaChat'))}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-xl flex-shrink-0 overflow-hidden">
                  {isRenderableImage(chatHistories[0].style_avatar) ? (
                    <img
                      src={chatHistories[0].style_avatar}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{chatHistories[0].style_avatar || '🤖'}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 mb-1 truncate">{chatHistories[0].title}</p>
                  <p className="text-xs text-gray-500">{chatHistories[0].style_name}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="py-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">{t('home.featuredPosts.title')}</h2>
            <Button
              variant="ghost"
              size="sm"
              className="text-teal-600 hover:text-teal-700 text-sm px-2"
              onClick={() => navigate(createPageUrl('EunoiaSquare'))}
            >
              {t('home.featuredPosts.cta')}
            </Button>
          </div>

          <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                compact
                onClick={() => handlePostClick(post.id)}
              />
            ))}
          </div>
        </div>

        {featuredCourses.length > 0 && (
          <div className="py-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">{t('home.courses.title')}</h2>
              <Button
                variant="ghost"
                size="sm"
                className="text-teal-600 hover:text-teal-700 text-sm px-2"
                onClick={() => navigate(createPageUrl('CourseCenter'))}
              >
                {t('home.courses.cta')}
              </Button>
            </div>

            <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {featuredCourses.map(course => (
                <Card
                  key={course.id}
                  className="min-w-[240px] rounded-2xl shadow-sm border-0 overflow-hidden cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate(createPageUrl('CourseDetail') + '?id=' + course.id)}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                    {course.cover_image ? (
                      <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl">
                        📘
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-blue-500 text-white text-xs">{t('home.courses.freeTag')}</Badge>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">
                      {t('home.courses.by', { name: course.partner_name || 'Partner' })}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-teal-600 font-medium">{t('home.courses.freePreview')}</span>
                      {isPlusUser && (
                        <Badge className="bg-amber-100 text-amber-700 text-xs">{t('home.courses.plusTrial')}</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div className="py-4 pb-8">
          <Card className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-3xl p-6 border border-pink-100">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl flex-shrink-0">
                🌿
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm mb-1">{t('home.wellness.title')}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {t('home.wellness.tip')}
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
