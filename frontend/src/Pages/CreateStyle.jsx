import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { base44 } from '@/api/base44Client';
import { isRenderableImage } from '@/utils/image';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';

const emojiOptions = ['😊', '🌟', '💫', '🧠', '💖', '🎧', '📚', '☀️', '🌙', '⭐', '🎨', '🦊'];

export default function CreateStyle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    name: '',
    avatar: '😊',
    personality: '',
    background: '',
    dialogue_style: '',
  });
  const [avatarType, setAvatarType] = useState('emoji');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: existingStyle } = useQuery({
    queryKey: ['chatStyle', editId],
    queryFn: async () => {
      if (!editId) return null;
      const styles = await base44.entities.ChatStyle.list();
      return styles.find(s => s.id === editId);
    },
    enabled: !!editId,
  });

  useEffect(() => {
    if (existingStyle) {
      setFormData({
        name: existingStyle.name || '',
        avatar: existingStyle.avatar || '😊',
        personality: existingStyle.personality || '',
        background: existingStyle.background || '',
        dialogue_style: existingStyle.dialogue_style || '',
      });
      if (isRenderableImage(existingStyle.avatar)) {
        setAvatarType('image');
      }
    }
  }, [existingStyle]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, avatar: file_url });
      setAvatarType('image');
    } catch (error) {
      console.error('upload failed:', error);
      alert(t('createStyle.error.upload'));
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.personality.trim()) {
      alert(t('createStyle.error.missing'));
      return;
    }

    setSaving(true);
    try {
      if (editId) {
        await base44.entities.ChatStyle.update(editId, formData);
      } else {
        await base44.entities.ChatStyle.create(formData);
      }
      navigate(-1);
    } catch (error) {
      console.error('save failed:', error);
      alert(t('createStyle.error.upload'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/30 to-white pb-8">
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
              <h1 className="text-xl font-bold text-gray-900">
                {editId ? t('createStyle.titleEdit') : t('createStyle.titleCreate')}
              </h1>
            </div>
            <Button
              className="bg-teal-500 hover:bg-teal-600 rounded-full px-6 inline-flex items-center justify-center"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? t('createStyle.saving') : t('createStyle.save')}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <Card className="p-6 rounded-3xl shadow-sm border-0">
          <Label className="text-sm font-semibold text-gray-900 mb-4 block">{t('createStyle.avatarLabel')}</Label>
          
          <div className="flex gap-4 mb-4">
            <Button
              variant={avatarType === 'emoji' ? 'default' : 'outline'}
              className="flex-1 rounded-2xl inline-flex items-center justify-center gap-2"
              onClick={() => setAvatarType('emoji')}
            >
              {t('createStyle.avatarEmoji')}
            </Button>
            <Button
              variant={avatarType === 'image' ? 'default' : 'outline'}
              className="flex-1 rounded-2xl inline-flex items-center justify-center gap-2"
              onClick={() => setAvatarType('image')}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              {t('createStyle.avatarImage')}
            </Button>
          </div>

          {avatarType === 'emoji' ? (
            <div className="grid grid-cols-6 gap-3">
              {emojiOptions.map((emoji) => (
                <button
                  key={emoji}
                  className={`w-full aspect-square rounded-2xl text-2xl flex items-center justify-center transition-all ${
                    formData.avatar === emoji
                      ? 'bg-teal-100 ring-2 ring-teal-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setFormData({ ...formData, avatar: emoji })}
                >
                  {emoji}
                </button>
              ))}
            </div>
          ) : (
            <div>
              {isRenderableImage(formData.avatar) ? (
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <img
                    src={formData.avatar}
                    alt="Avatar"
                    className="w-full h-full rounded-full object-cover"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute bottom-0 right-0 rounded-full inline-flex items-center justify-center"
                    onClick={() => document.getElementById('avatar-upload')?.click()}
                  >
                    {t('createStyle.avatarChange')}
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-teal-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {uploading ? t('createStyle.uploading') : t('createStyle.avatarImage')}
                  </p>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                </label>
              )}
              {!isRenderableImage(formData.avatar) && (
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              )}
            </div>
          )}
        </Card>

        <Card className="p-6 rounded-3xl shadow-sm border-0 space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-semibold text-gray-900 mb-2 block">
              {t('createStyle.nameLabel')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('createStyle.namePlaceholder')}
              className="rounded-2xl h-11"
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.name.length}/20</p>
          </div>

          <div>
            <Label htmlFor="personality" className="text-sm font-semibold text-gray-900 mb-2 block">
              {t('createStyle.personalityLabel')} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              placeholder={t('createStyle.personalityPlaceholder')}
              className="rounded-2xl min-h-[100px] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.personality.length}/200</p>
          </div>
        </Card>

        <Card className="p-6 rounded-3xl shadow-sm border-0 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">{t('createStyle.advancedTitle')}</h3>
          
          <div>
            <Label htmlFor="background" className="text-sm font-medium text-gray-700 mb-2 block">
              {t('createStyle.backgroundLabel')}
            </Label>
            <Textarea
              id="background"
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
              placeholder={t('createStyle.backgroundPlaceholder')}
              className="rounded-2xl min-h-[120px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.background.length}/500</p>
          </div>

          <div>
            <Label htmlFor="dialogue_style" className="text-sm font-medium text-gray-700 mb-2 block">
              {t('createStyle.dialogueLabel')}
            </Label>
            <Textarea
              id="dialogue_style"
              value={formData.dialogue_style}
              onChange={(e) => setFormData({ ...formData, dialogue_style: e.target.value })}
              placeholder={t('createStyle.dialoguePlaceholder')}
              className="rounded-2xl min-h-[100px] resize-none"
              maxLength={300}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.dialogue_style.length}/300</p>
          </div>
        </Card>

        <Card className="p-4 rounded-3xl bg-teal-50 border-teal-100">
          <div className="flex gap-3">
            <div className="text-xl">ℹ️</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-teal-900 mb-1">{t('createStyle.tipsTitle')}</p>
              <p className="text-xs text-teal-700 leading-relaxed">
                {t('createStyle.tipsDesc')}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
