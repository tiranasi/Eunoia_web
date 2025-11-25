import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Play, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';

export default function CourseDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get('id');
  const { t } = useTranslation();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: course } = useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      const courses = await base44.entities.Course.list();
      const idNum = Number(courseId);
      return courses.find(c => c.id === idNum);
    },
    enabled: !!courseId,
  });

  const isPlusUser = user?.subscription_tier === 'plus';
  const trialLessons = isPlusUser ? course?.plus_trial_lessons : course?.free_trial_lessons;
  const finalPrice = isPlusUser ? (course?.price * (course?.plus_discount || 0.9)) : course?.price;

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white pb-8">
        <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
          <div className="max-w-lg mx-auto px-4 pt-safe pb-4">
            <div className="flex items-center gap-3 pt-4">
              <Button 
                variant="ghost" 
                size="icon"
                className="rounded-full"
                onClick={() => navigate(createPageUrl('CourseCenter'))}
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </Button>
              <h1 className="text-lg font-bold text-gray-900">{t('courseDetail.placeholderTitle')}</h1>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-3xl">📘</span>
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">{t('courseDetail.placeholderTitle')}</h3>
          <p className="text-sm text-gray-600 mb-6">{t('courseDetail.placeholderDesc')}</p>
          <Button className="rounded-full px-6 bg-blue-600 hover:bg-blue-700" onClick={() => navigate(createPageUrl('CourseCenter'))}>
            {t('courseDetail.back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50/30 to-white pb-8">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 pt-safe pb-4">
          <div className="flex items-center gap-3 pt-4">
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">{t('courseDetail.title')}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <Card className="rounded-3xl shadow-sm border-0 overflow-hidden mb-6">
          <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
            {course.cover_image ? (
              <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl">
                📘
              </div>
            )}
            <div className="absolute top-3 left-3">
              <Badge className="bg-blue-500 text-white">{t('courseDetail.badge')}</Badge>
            </div>
          </div>
          
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{course.title}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {t('courseDetail.by', { name: course.partner_name })}
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              {course.description}
            </p>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">{t('courseDetail.totalLessons', { count: course.total_lessons })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-teal-600" strokeWidth={1.5} />
                <span className="text-sm text-teal-600 font-medium">
                  {t('courseDetail.trial', { count: trialLessons })}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500 mb-1">{t('courseDetail.priceLabel')}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-orange-600">
                    {t('courseDetail.price', { price: finalPrice?.toFixed(0) })}
                  </span>
                  {isPlusUser && (
                    <span className="text-sm text-gray-400 line-through">
                      {t('courseDetail.price', { price: course.price })}
                    </span>
                  )}
                </div>
              </div>
              {isPlusUser && (
                <Badge className="bg-amber-100 text-amber-700">
                  {t('courseDetail.discount')}
                </Badge>
              )}
            </div>
          </div>
        </Card>

        <div className="mb-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">{t('courseDetail.outline')}</h3>
          <div className="space-y-2">
            {Array.from({ length: course.total_lessons }).map((_, idx) => {
              const lessonNum = idx + 1;
              const isTrial = lessonNum <= (trialLessons || 0);
              
              return (
                <Card 
                  key={idx}
                  className={`p-4 rounded-2xl shadow-sm border-0 ${
                    isTrial ? 'cursor-pointer hover:shadow-md transition-all' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isTrial ? 'bg-teal-100' : 'bg-gray-100'
                      }`}>
                        {isTrial ? (
                          <Play className="w-5 h-5 text-teal-600" strokeWidth={1.5} />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-400" strokeWidth={1.5} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {t('courseDetail.lesson', { num: lessonNum })}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t('courseDetail.lessonDesc', { num: lessonNum })}
                        </p>
                      </div>
                    </div>
                    {isTrial && (
                      <Badge className="bg-teal-50 text-teal-700 text-xs">
                        {t('courseCenter.trial', { count: 1 })}
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sticky bottom-6">
          <Button
            variant="outline"
            className="rounded-2xl h-12 font-semibold"
            onClick={() => alert(t('courseDetail.preview'))}
          >
            {t('courseDetail.preview')}
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 rounded-2xl h-12 font-semibold"
            onClick={() => alert(t('courseDetail.buy'))}
          >
            {t('courseDetail.buy')}
          </Button>
        </div>
      </div>
    </div>
  );
}
