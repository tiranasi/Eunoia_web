import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';

const benefits = [
  { titleKey: 'plus.benefit.chat', free: '30/天', plus: '无限*', description: '*Fair Use: 60/小时' },
  { titleKey: 'plus.benefit.style', free: '4套', plus: '20套', description: '自定义聊天风格' },
  { titleKey: 'plus.benefit.report', free: '1/天', plus: '无限', description: '随时了解情绪变化' },
  { titleKey: 'plus.benefit.trend', free: '不支持', plus: '✔ 支持', description: '创建趋势分析' },
  { titleKey: 'plus.benefit.courseTrial', free: '1节', plus: '3-5节', description: '更多课程试听' },
  { titleKey: 'plus.benefit.courseDiscount', free: '原价', plus: '9折优惠', description: '课程专属优惠' },
];

export default function PlusSubscription() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const subscriptionMutation = useMutation({
    mutationFn: async (action) => {
      const newTier = action === 'subscribe' ? 'plus' : 'free';
      await base44.auth.updateMe({ subscription_tier: newTier });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    },
  });

  const handleSubscribe = async () => {
    await subscriptionMutation.mutateAsync('subscribe');
  };

  const handleUnsubscribe = async () => {
    if (window.confirm(t('plus.unsubscribeConfirm'))) {
      await subscriptionMutation.mutateAsync('unsubscribe');
    }
  };

  const isPlusUser = user?.subscription_tier === 'plus';

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/30 to-white pb-8">
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
            <h1 className="text-xl font-bold text-gray-900">{t('plus.title')}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <Card className="p-6 rounded-3xl shadow-lg border-0 bg-gradient-to-br from-amber-400 to-orange-500 mb-6">
          <div className="text-center text-white">
            <Sparkles className="w-12 h-12 mx-auto mb-3" strokeWidth={1.5} />
            <h2 className="text-2xl font-bold mb-2">{t('plus.title')}</h2>
            <p className="text-lg mb-1">{t('plus.heroDesc')}</p>
            <p className="text-3xl font-bold mb-3">{t('plus.price')}</p>
            {isPlusUser && (
              <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 inline-flex items-center gap-2">
                <Check className="w-4 h-4" strokeWidth={2} />
                <span className="text-sm font-medium">{t('plus.subscribed')}</span>
              </div>
            )}
          </div>
        </Card>

        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">{t('plus.benefitsTitle')}</h3>
          <div className="space-y-3">
            {benefits.map((benefit, idx) => (
              <Card key={idx} className="p-4 rounded-2xl shadow-sm border-0">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm mb-1">{t(benefit.titleKey, { defaultValue: benefit.titleKey })}</h4>
                    <p className="text-xs text-gray-500">{benefit.description}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div className="text-center p-2 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">{t('plus.free')}</p>
                    <p className="text-sm font-semibold text-gray-700">{benefit.free}</p>
                  </div>
                  <div className="text-center p-2 rounded-xl bg-amber-50">
                    <p className="text-xs text-amber-600 mb-1">{t('plus.planPlus')}</p>
                    <p className="text-sm font-semibold text-amber-700">{benefit.plus}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="sticky bottom-6">
          {isPlusUser ? (
            <div className="space-y-3">
              <Card className="p-4 rounded-2xl bg-green-50 border-green-200">
                <div className="flex items-center gap-2 justify-center">
                  <Check className="w-5 h-5 text-green-600" strokeWidth={2} />
                  <p className="text-sm font-medium text-green-900">{t('plus.subscribedNote')}</p>
                </div>
              </Card>
              <Button
                variant="outline"
                className="w-full rounded-2xl h-12 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-semibold"
                onClick={handleUnsubscribe}
                disabled={subscriptionMutation.isPending}
              >
                {subscriptionMutation.isPending ? t('plus.subscribing') : t('plus.unsubscribe')}
              </Button>
            </div>
          ) : (
            <Button
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl h-14 text-lg font-bold shadow-lg"
              onClick={handleSubscribe}
              disabled={subscriptionMutation.isPending}
            >
              {subscriptionMutation.isPending ? t('plus.subscribing') : t('plus.subscribe')}
            </Button>
          )}
        </div>

        <p className="text-xs text-gray-500 text-center mt-4 px-4">
          {t('plus.terms')}
        </p>
      </div>
    </div>
  );
}
