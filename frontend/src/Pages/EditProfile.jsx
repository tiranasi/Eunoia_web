import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { isRenderableImage } from '@/utils/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';

export default function EditProfile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ nickname: '', bio: '', avatar: '' });
  const { t } = useTranslation();

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  useEffect(() => {
    if (user) {
      setFormData({ nickname: user.nickname || '', bio: user.bio || '', avatar: user.avatar || user.avatar_url || '' });
    }
  }, [user]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData((prev) => ({ ...prev, avatar: file_url }));
    } catch (err) {
      console.error('upload failed:', err);
      alert(t('editProfile.uploading'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.nickname.trim()) {
      alert(t('editProfile.error.missing'));
      return;
    }
    setSaving(true);
    try {
      const payload = { nickname: formData.nickname, bio: formData.bio, avatar_url: formData.avatar };
      await base44.auth.updateMe(payload);
      try {
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      } catch {}
      navigate(-1);
    } catch (err) {
      console.error('save failed:', err);
      alert(t('createPost.error.publish'));
    } finally {
      setSaving(false);
    }
  };

  const displayName = user?.full_name || 'User';

  const renderAvatar = () => {
    const av = formData.avatar;
    if (isRenderableImage(av)) return <img src={av} alt="Avatar" className="w-full h-full object-cover" />;
    return (
      <div className="w-full h-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center text-white text-3xl font-bold">
        {(formData.nickname || displayName)?.[0]?.toUpperCase() || 'U'}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/30 to-white pb-8">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 pt-safe pb-4">
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="rounded-full" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
              </Button>
              <h1 className="text-xl font-bold text-gray-900">{t('editProfile.title')}</h1>
            </div>
            <Button className="bg-teal-500 hover:bg-teal-600 rounded-full px-6" onClick={handleSubmit} disabled={saving}>
              {saving ? t('editProfile.saving') : t('editProfile.save')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card className="p-6 rounded-3xl shadow-sm border-0">
          <Label className="text-sm font-semibold text-gray-900 mb-4 block">{t('editProfile.avatar')}</Label>
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <div className="w-24 h-24 rounded-full overflow-hidden">{renderAvatar()}</div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center cursor-pointer hover:bg-teal-600 transition-colors shadow-lg">
                <Camera className="w-4 h-4 text-white" strokeWidth={2} />
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>
            {uploading && <p className="text-sm text-gray-500">{t('editProfile.uploading')}</p>}
          </div>
        </Card>

        <Card className="p-6 rounded-3xl shadow-sm border-0 space-y-4">
          <div>
            <Label htmlFor="nickname" className="text-sm font-semibold text-gray-900 mb-2 block">
              {t('editProfile.nickname')} <span className="text-red-500">*</span>
            </Label>
            <Input id="nickname" value={formData.nickname} onChange={(e) => setFormData({ ...formData, nickname: e.target.value })} placeholder={t('editProfile.nicknamePlaceholder')} className="rounded-2xl h-11" maxLength={20} />
            <p className="text-xs text-gray-500 mt-1">{formData.nickname.length}/20</p>
          </div>

          <div>
            <Label htmlFor="bio" className="text-sm font-semibold text-gray-900 mb-2 block">{t('editProfile.bio')}</Label>
            <Textarea id="bio" value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} placeholder={t('editProfile.bioPlaceholder')} className="rounded-2xl min-h-[100px] resize-none" maxLength={150} />
            <p className="text-xs text-gray-500 mt-1">{formData.bio.length}/150</p>
          </div>
        </Card>

        <Card className="p-6 rounded-3xl shadow-sm border-0 bg-gray-50">
          <Label className="text-sm font-semibold text-gray-900 mb-3 block">{t('editProfile.accountInfo')}</Label>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('editProfile.displayName')}</p>
              <p className="text-sm text-gray-900">{displayName}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('editProfile.email')}</p>
              <p className="text-sm text-gray-900">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">{t('editProfile.userId')}</p>
              <p className="text-sm text-gray-900 font-mono">{String(user?.id ?? '').slice(0, 8)}...</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl bg-teal-50 border-teal-100">
          <div className="flex gap-3">
            <div className="text-xl">ℹ️</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-teal-900 mb-1">{t('editProfile.tipsTitle')}</p>
              <p className="text-xs text-teal-700 leading-relaxed">{t('editProfile.tipsDesc')}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
