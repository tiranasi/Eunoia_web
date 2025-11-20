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

const emojiOptions = ['😊', '🌸', '📚', '🎨', '🌟', '🎵', '🦋', '🌈', '☕', '🌙', '🐱', '🎭'];

export default function CreateStyle() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('id');
  
  const [formData, setFormData] = useState({
    name: '',
    avatar: '😊',
    personality: '',
    background: '',
    dialogue_style: '',
  });
  const [avatarType, setAvatarType] = useState('emoji'); // 'emoji' or 'image'
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing style if editing
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
      console.error('上传失败:', error);
      alert('上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.personality.trim()) {
      alert('请填写角色名称和性格特点');
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
      console.error('保存失败:', error);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50/30 to-white pb-8">
      {/* Header */}
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
                {editId ? '编辑风格' : '创建自定义风格'}
              </h1>
            </div>
            <Button
              className="bg-teal-500 hover:bg-teal-600 rounded-full px-6 inline-flex items-center justify-center"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? '保存中...' : '保存'}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Avatar Selection */}
        <Card className="p-6 rounded-3xl shadow-sm border-0">
          <Label className="text-sm font-semibold text-gray-900 mb-4 block">角色头像</Label>
          
          <div className="flex gap-4 mb-4">
            <Button
              variant={avatarType === 'emoji' ? 'default' : 'outline'}
              className="flex-1 rounded-2xl"
              onClick={() => setAvatarType('emoji')}
            >
              😊 Emoji
            </Button>
            <Button
              variant={avatarType === 'image' ? 'default' : 'outline'}
              className="flex-1 rounded-2xl"
              onClick={() => setAvatarType('image')}
            >
              <ImageIcon className="w-4 h-4 mr-2" />
              上传图片
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
                    更换
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-teal-500 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {uploading ? '上传中...' : '点击上传头像'}
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

        {/* Basic Info */}
        <Card className="p-6 rounded-3xl shadow-sm border-0 space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-semibold text-gray-900 mb-2 block">
              角色名称 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="给你的AI助手起个名字"
              className="rounded-2xl h-11"
              maxLength={20}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.name.length}/20</p>
          </div>

          <div>
            <Label htmlFor="personality" className="text-sm font-semibold text-gray-900 mb-2 block">
              性格特点 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="personality"
              value={formData.personality}
              onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
              placeholder="例如：温柔体贴、善于倾听、充满耐心..."
              className="rounded-2xl min-h-[100px] resize-none"
              maxLength={200}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.personality.length}/200</p>
          </div>
        </Card>

        {/* Advanced Settings */}
        <Card className="p-6 rounded-3xl shadow-sm border-0 space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">高级设置（可选）</h3>
          
          <div>
            <Label htmlFor="background" className="text-sm font-medium text-gray-700 mb-2 block">
              背景故事
            </Label>
            <Textarea
              id="background"
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
              placeholder="描述角色的背景、经历、专长等..."
              className="rounded-2xl min-h-[120px] resize-none"
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.background.length}/500</p>
          </div>

          <div>
            <Label htmlFor="dialogue_style" className="text-sm font-medium text-gray-700 mb-2 block">
              对话方式
            </Label>
            <Textarea
              id="dialogue_style"
              value={formData.dialogue_style}
              onChange={(e) => setFormData({ ...formData, dialogue_style: e.target.value })}
              placeholder="例如：使用简短温暖的语句、喜欢用表情符号、会引用名言..."
              className="rounded-2xl min-h-[100px] resize-none"
              maxLength={300}
            />
            <p className="text-xs text-gray-500 mt-1">{formData.dialogue_style.length}/300</p>
          </div>
        </Card>

        {/* Tips */}
        <Card className="p-4 rounded-3xl bg-teal-50 border-teal-100">
          <div className="flex gap-3">
            <div className="text-xl">💡</div>
            <div className="flex-1">
              <p className="text-sm font-medium text-teal-900 mb-1">创建提示</p>
              <p className="text-xs text-teal-700 leading-relaxed">
                详细的性格描述和背景故事能让AI更好地理解角色定位，提供更个性化的对话体验。
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
