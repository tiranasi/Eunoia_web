import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, CheckCircle, Circle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';

export default function CreateTrendAnalysis() {
  const navigate = useNavigate();
  const [selectedReports, setSelectedReports] = useState([]);
  const { t } = useTranslation();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: reports = [] } = useQuery({
    queryKey: ['emotionReports'],
    queryFn: () => base44.entities.EmotionReport.list('-created_at'),
    initialData: [],
  });

  const createTrendMutation = useMutation({
    mutationFn: (data) => base44.entities.TrendAnalysis.create(data),
  });

  const isPlusUser = user?.subscription_tier === 'plus';
  const completedReports = reports.filter((r) => r.status === 'completed');

  const handleToggleReport = (reportId) => {
    setSelectedReports((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleCreate = async () => {
    if (!isPlusUser) {
      if (window.confirm(t('trendCreate.plusOnly'))) {
        navigate(createPageUrl('PlusSubscription'));
      }
      return;
    }
    if (selectedReports.length < 5) {
      alert(t('trendCreate.tipDesc'));
      return;
    }
    try {
      await createTrendMutation.mutateAsync({
        title: `${t('trendDetail.title')} #${new Date().toISOString().slice(0, 16).replace('T', ' ')}`,
        selected_reports: selectedReports,
        status: 'analyzing',
      });
      navigate(createPageUrl('EmotionReports'));
    } catch (e) {
      console.error(e);
      alert('Create failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/30 to-white pb-8">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 pt-safe pb-4">
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">{t('trendCreate.title')}</h1>
            </div>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 rounded-full px-6"
              onClick={handleCreate}
              disabled={!isPlusUser || selectedReports.length < 5}
            >
              {t('trendCreate.button')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card className="p-4 rounded-3xl bg-indigo-50 border-indigo-100">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-indigo-600">
              <Info className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-semibold text-indigo-900 mb-1">{t('trendCreate.tipTitle')}</p>
              <p className="text-xs text-indigo-700 leading-relaxed">{t('trendCreate.tipDesc')}</p>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {t('trendCreate.selected')} <span className="font-semibold text-indigo-600">{selectedReports.length}</span>
          </p>
          {selectedReports.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedReports([])}
            >
              {t('trendCreate.clear')}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {completedReports.map((report) => {
            const isSelected = selectedReports.includes(report.id);
            return (
              <Card
                key={report.id}
                className={`p-4 rounded-2xl cursor-pointer transition-all ${
                  isSelected ? 'border-2 border-indigo-500 bg-indigo-50' : 'border border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleToggleReport(report.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {isSelected ? (
                      <CheckCircle className="w-5 h-5 text-indigo-600" strokeWidth={2} />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">{report.title}</p>
                    <p className="text-xs text-gray-500">{new Date(report.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </Card>
            );
          })}

          {completedReports.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">{t('trendCreate.noReports')}</p>
              <Button variant="link" className="mt-2 text-indigo-600" onClick={() => navigate(createPageUrl('EmotionReports'))}>
                {t('trendCreate.goReport')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
