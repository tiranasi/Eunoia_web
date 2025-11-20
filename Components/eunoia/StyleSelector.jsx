
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ChevronDown, Plus, MoreVertical, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge'; // Added Badge import
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

const systemStyles = [
  { id: 'warm', name: '暖心陪伴', description: '温暖体贴，善解人意', icon: '🤗', isSystem: true },
  { id: 'spark', name: '灵感火花', description: '创意满满，富有启发', icon: '💡', isSystem: true },
  { id: 'cool', name: '冷静分析', description: '理性客观，逻辑清晰', icon: '🧠', isSystem: true },
];

export default function StyleSelector({ currentStyle = '暖心陪伴', onStyleChange }) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: customStyles = [] } = useQuery({
    queryKey: ['chatStyles'],
    queryFn: async () => {
      if (!user?.email) return [];
      const allStyles = await base44.entities.ChatStyle.list();
      return allStyles.filter(style => style.created_by === user.email);
    },
    enabled: !!user?.email,
    initialData: [],
  });

  // 检查导入的角色的原始角色是否存在
  const { data: originalStylesStatus = {} } = useQuery({
    queryKey: ['originalStylesStatus', customStyles], // customStyles as a dependency for this query
    queryFn: async () => {
      const importedStyles = customStyles.filter(s => s.is_imported && s.original_style_id);
      if (importedStyles.length === 0) return {};
      
      const allStyles = await base44.entities.ChatStyle.list(); // Fetch all styles to check for originals
      const statusMap = {};
      
      importedStyles.forEach(imported => {
        const original = allStyles.find(s => s.id === imported.original_style_id);
        statusMap[imported.id] = !!original; // true if original exists, false otherwise
      });
      
      return statusMap;
    },
    enabled: customStyles.some(s => s.is_imported), // Only enable if there are actually imported styles
  });

  const handleDelete = async (styleId) => {
    try {
      const styleToDelete = customStyles.find(s => s.id === styleId);
      
      if (!styleToDelete) {
        console.warn(`Style with ID ${styleId} not found for deletion.`);
        return;
      }

      // If it's an original style (not imported), mark all its imported copies as "deleted by author"
      if (!styleToDelete.is_imported) {
        // Fetch all styles again to ensure we have the most up-to-date list for checking copies
        const allStyles = await base44.entities.ChatStyle.list();
        const importedCopies = allStyles.filter(s => s.original_style_id === styleId);
        
        for (const copy of importedCopies) {
          await base44.entities.ChatStyle.update(copy.id, {
            is_deleted_by_author: true,
          });
        }
      }
      
      // Delete the current style
      await base44.entities.ChatStyle.delete(styleId);
      // Re-run the customStyles query to reflect the changes (in a real app, use queryClient.invalidateQueries)
      // This will trigger a refetch of customStyles and subsequently originalStylesStatus
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  const handleSetDefault = async (styleId) => {
    try {
      // 先将所有风格设为非默认
      const allStyles = await base44.entities.ChatStyle.list();
      for (const style of allStyles) {
        if (style.is_default) {
          await base44.entities.ChatStyle.update(style.id, { is_default: false });
        }
      }
      // 设置当前风格为默认
      await base44.entities.ChatStyle.update(styleId, { is_default: true });
    } catch (error) {
      console.error('设置默认失败:', error);
    }
  };

  const handleCreateStyle = () => {
    setOpen(false);
    navigate(createPageUrl('CreateStyle'));
  };

  const myOwnStyles = customStyles.filter(s => !s.is_imported);
  const importedStyles = customStyles.filter(s => s.is_imported);
  const totalStyles = myOwnStyles.length; // Max styles should apply to user's own creations
  const isPlusUser = user?.subscription_tier === 'plus';
  const maxStyles = isPlusUser ? 20 : 4;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="outline" 
          className="rounded-full border-gray-200 bg-white shadow-sm hover:shadow-md transition-all px-4 py-2 h-auto inline-flex items-center justify-center"
        >
          <span className="text-sm font-medium text-gray-900">{currentStyle}</span>
          <ChevronDown className="w-4 h-4 ml-2 text-gray-500" strokeWidth={1.5} />
        </Button>
      </SheetTrigger>
      
      <SheetContent side="bottom" className="rounded-t-3xl border-0 max-h-[85vh] overflow-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-lg font-semibold">选择对话风格</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* System Styles */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center justify-center">系统风格</h3>
            <div className="space-y-2">
              {systemStyles.map(style => (
                <Card 
                  key={style.id}
                  className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                    currentStyle === style.name 
                      ? 'border-teal-500 bg-teal-50' 
                      : 'border-gray-100 hover:border-gray-200'
                  }`}
                  onClick={() => {
                    onStyleChange?.(style.name);
                    setOpen(false);
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{style.icon}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 text-sm">{style.name}</p>
                      <p className="text-xs text-gray-500">{style.description}</p>
                    </div>
                    {currentStyle === style.name && (
                      <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {/* My Styles */}
          {myOwnStyles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">我的风格</h3>
              <div className="grid grid-cols-2 gap-3">
                {myOwnStyles.map(style => (
                  <Card 
                    key={style.id}
                    className="p-4 rounded-2xl border hover:border-gray-300 cursor-pointer relative group"
                    onClick={() => {
                      onStyleChange?.(style.name, style.avatar);
                      setOpen(false);
                    }}
                  >
                    <div className="absolute top-2 right-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button 
                            className="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(createPageUrl('CreateStyle') + '?id=' + style.id)}>
                            编辑
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSetDefault(style.id)}>
                            设为默认
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDelete(style.id)}
                          >
                            删除
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="text-center">
                      {style.avatar?.startsWith('http') ? (
                        <img 
                          src={style.avatar} 
                          alt={style.name}
                          className="w-12 h-12 mx-auto mb-2 rounded-full object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="w-12 h-12 mx-auto mb-2 text-2xl flex items-center justify-center bg-gray-50 rounded-full">
                          {style.avatar || '😊'}
                        </div>
                      )}
                      <p className="text-sm font-medium text-gray-900">{style.name}</p>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Imported Styles */}
          {importedStyles.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">导入的风格</h3>
              <div className="grid grid-cols-2 gap-3">
                {importedStyles.map(style => {
                  const isDeleted = style.is_deleted_by_author || originalStylesStatus[style.id] === false;
                  
                  return (
                    <Card 
                      key={style.id}
                      className={`p-4 rounded-2xl border relative group ${
                        isDeleted 
                          ? 'border-red-200 bg-red-50 opacity-60 cursor-not-allowed' 
                          : 'hover:border-gray-300 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (!isDeleted) { // Only allow selection if not deleted
                          onStyleChange?.(style.name);
                          setOpen(false);
                        }
                      }}
                    >
                      <div className="absolute top-2 right-2 z-10">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button 
                              className="p-1 hover:bg-gray-100 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4 text-gray-500" strokeWidth={1.5} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Only Delete option for imported styles */}
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDelete(style.id)}
                            >
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="text-center">
                        {style.avatar?.startsWith('http') ? (
                          <img 
                            src={style.avatar} 
                            alt={style.name}
                            className="w-12 h-12 mx-auto mb-2 rounded-full object-cover bg-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-12 mx-auto mb-2 text-2xl flex items-center justify-center bg-gray-50 rounded-full">
                            {style.avatar || '😊'}
                          </div>
                        )}
                        <p className="text-sm font-medium text-gray-900 mb-0.5">{style.name}</p>
                        <p className="text-xs text-gray-500">by {style.original_author_name}</p>
                        {isDeleted && (
                          <Badge className="mt-1 bg-red-100 text-red-700 text-xs">
                            作者已删除
                          </Badge>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create Button */}
          <div>
            <Button 
              className="w-full bg-teal-500 hover:bg-teal-600 text-white rounded-2xl h-12 font-medium shadow-sm disabled:opacity-50 flex items-center justify-center"
              onClick={handleCreateStyle}
              disabled={totalStyles >= maxStyles}
            >
              <Plus className="w-5 h-5 mr-2" strokeWidth={2} />
              创建自定义风格
              <span className="ml-2 text-xs opacity-80">({totalStyles}/{maxStyles})</span>
            </Button>
            {!isPlusUser && totalStyles >= maxStyles && (
              <p className="text-xs text-center text-amber-600 mt-2">
                已达上限。
                <button 
                  className="underline ml-1"
                  onClick={() => {
                    setOpen(false);
                    navigate(createPageUrl('PlusSubscription'));
                  }}
                >
                  升级Plus可创建20个风格
                </button>
              </p>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
