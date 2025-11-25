import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useTranslation } from '@/i18n';

export default function EmotionAnalysis() {
  const navigate = useNavigate();
  const [selectedChats, setSelectedChats] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const { t } = useTranslation();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: chatHistories = [] } = useQuery({
    queryKey: ['chatHistories'],
    queryFn: async () => {
      if (!user?.email) return [];
      const allChats = await base44.entities.ChatHistory.list('-last_message_at');
      return allChats.filter(chat => chat.created_by === user.email);
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const createReportMutation = useMutation({
    mutationFn: (reportData) => base44.entities.EmotionReport.create(reportData),
  });

  const handleToggleChat = (chatId) => {
    setSelectedChats(prev =>
      prev.includes(chatId)
        ? prev.filter(id => id !== chatId)
        : [...prev, chatId]
    );
  };

  const handleAnalyze = async () => {
    if (selectedChats.length === 0) {
      alert(t('emotionAnalysis.alert.noSelection'));
      return;
    }

    setAnalyzing(true);
    try {
      const report = await createReportMutation.mutateAsync({
        title: `${t('emotionAnalysis.reportTitlePrefix')} ${format(new Date(), 'yyyy-MM-dd HH:mm')}`,
        selected_chats: selectedChats,
        status: 'analyzing',
      });

      performAnalysis(report.id);
      navigate(createPageUrl('EmotionReports'));
    } catch (error) {
      console.error('analysis failed:', error);
      alert(t('emotionReports.alert.failed'));
    } finally {
      setAnalyzing(false);
    }
  };

  const performAnalysis = async (reportId) => {
    try {
      const selectedChatData = chatHistories
        .filter(chat => selectedChats.includes(chat.id))
        .map(chat => ({
          title: chat.title,
          style: chat.style_name,
          messages: chat.messages || [],
        }));

      const languageName = t('language.current');
      const analysisPrompt = `你是专业的心理咨询师，请用${languageName}深入分析以下对话并输出情绪洞察。`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${analysisPrompt}\n\n请用 JSON 返回结果，字段包含 overall_assessment, emotional_trend, dominant_emotions[{label,value,description}], concerns[], suggestions[]，数值 0~1，勿输出多余文字。`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            emotional_trend: { type: "string" },
            dominant_emotions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  value: { type: "number" },
                  description: { type: "string" }
                }
              }
            },
            concerns: { type: "array", items: { type: "string" } },
            suggestions: { type: "array", items: { type: "string" } }
          },
          required: ["overall_assessment", "emotional_trend", "dominant_emotions", "suggestions"]
        }
      });

      await base44.entities.EmotionReport.update(reportId, {
        status: 'completed',
        analysis_result: result,
        analyzed_at: new Date().toISOString(),
      });

    } catch (error) {
      console.error('analysis error:', error);
      await base44.entities.EmotionReport.update(reportId, { status: 'failed' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50/30 to-white pb-8">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 pt-safe pb-4">
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">{t('emotionAnalysis.title')}</h1>
            </div>
            <Button
              className="bg-purple-600 hover:bg-purple-700 rounded-full px-6"
              onClick={handleAnalyze}
              disabled={analyzing || selectedChats.length === 0}
            >
              {analyzing ? t('emotionAnalysis.starting') : t('emotionAnalysis.start')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card className="p-5 rounded-3xl bg-gradient-to-br from-purple-50 to-pink-50 border-purple-100">
          <div className="flex gap-3">
            <div className="text-2xl">🧠</div>
            <div>
              <p className="text-sm font-medium text-purple-900 mb-1">{t('emotionAnalysis.infoTitle')}</p>
              <p className="text-xs text-purple-700 leading-relaxed">
                {t('emotionAnalysis.infoDesc')}
              </p>
            </div>
          </div>
        </Card>

        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {t('emotionAnalysis.selected')} <span className="font-semibold text-purple-600">{selectedChats.length}</span>
          </p>
          {selectedChats.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedChats([])}
            >
              {t('emotionAnalysis.clear')}
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {chatHistories.map((chat) => {
            const isSelected = selectedChats.includes(chat.id);
            const messageCount = chat.messages?.length || 0;

            return (
              <Card
                key={chat.id}
                className={`p-4 rounded-2xl cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-purple-500 bg-purple-50'
                    : 'border border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleToggleChat(chat.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {isSelected ? (
                      <CheckCircle className="w-5 h-5 text-purple-600" strokeWidth={2} />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 mb-1">{chat.title}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{chat.style_name}</span>
                      <span>·</span>
                      <span>{t('emotionAnalysis.chatCount', { count: messageCount })}</span>
                      <span>·</span>
                      <span>{t('emotionAnalysis.chatDate', { date: format(new Date(chat.last_message_at), 'MM/dd') })}</span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {chatHistories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-sm text-gray-500">{t('emotionAnalysis.noChats')}</p>
              <Button
                variant="link"
                className="mt-2 text-purple-600"
                onClick={() => navigate(createPageUrl('EunoiaChat'))}
              >
                {t('emotionAnalysis.goChat')}
              </Button>
            </div>
          )}
        </div>

        <Card className="p-4 rounded-3xl bg-blue-50 border-blue-100">
          <div className="flex gap-3">
            <div className="text-lg">💡</div>
            <div>
              <p className="text-sm font-medium text-blue-900 mb-1">{t('emotionAnalysis.tipsTitle')}</p>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>{t('emotionAnalysis.tip1')}</li>
                <li>{t('emotionAnalysis.tip2')}</li>
                <li>{t('emotionAnalysis.tip3')}</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
