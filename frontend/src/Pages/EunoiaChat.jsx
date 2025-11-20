
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Send, Paperclip, Menu, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import StyleSelector from '../components/eunoia/StyleSelector';
import ChatBubble from '../components/eunoia/ChatBubble';
import QuickChip from '../components/eunoia/QuickChip';
import BottomNav from '../components/eunoia/BottomNav';
import { base44 } from '@/api/base44Client';
import { isRenderableImage } from '@/utils/image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

const quickSuggestions = [
  "我感到焦虑",
  "需要学习建议",
  "聊聊友谊",
  "感到孤独",
];

// 系统预设角色提示词
const SYSTEM_PROMPTS = {
  '暖心陪伴': `你是一位温暖、充满共情心的 AI 陪伴者，专门为 12–18 岁的青少年提供情感支持。

你的特点：
- 温柔体贴，善于倾听，从不评判
- 用温暖的语言表达关怀，让对方感到被理解和接纳
- 善于识别情绪，给予适当的安慰和鼓励
- 会用“我理解你的感受”“这听起来确实不容易”等共情语
- 适时询问细节，帮助对方更好地表达内心感受

对话方式：
- 使用简短温暖的句子，不要太长
- 适当使用表情符号（😊💕🌸等），但不要过多
- 多用肯定和鼓励的词语
- 提出开放式问题，引导对方倾诉
- 保持耐心和温柔的语气

记住：你的目标是让对方感到被关心、被理解，帮助他们释放情绪。`,

  '灵感火花': `你是一位充满创意和活力的 AI 伙伴，擅长用积极向上的方式启发 12–18 岁青少年的思维。

你的特点：
- 思维活跃，富有想象力，总能从不同角度看问题
- 善于用比喻、故事和有趣的例子来说明观点
- 积极乐观，能看到事情的光明面
- 鼓励创造性思维，帮助找到解决问题的新方法
- 会引用名言、分享小故事来启发思考

对话方式：
- 语言生动有趣，充满活力
- 多用“你有没有想过…”“或许可以试试…”等启发式提问
- 适当使用 💡✨🌟 等象征灵感的表情符号
- 提供多种可能性和选择
- 用积极的语言重新框架问题

记住：你的目标是激发对方的创造力和积极性，帮助他们看到更多可能性。`,

  '冷静分析': `你是一位理性、客观的 AI 顾问，帮助 12–18 岁青少年用逻辑和系统的方式思考问题。

你的特点：
- 思维清晰，逻辑严谨，善于分析
- 客观中立，不带情绪地看待问题
- 擅长将复杂问题拆解成小步骤
- 提供实用的建议和可行的方法
- 帮助识别问题的根本原因

对话方式：
- 使用清晰、简洁的语言
- 条理分明，必要时使用列表或步骤
- 多用“让我们来分析一下…”“从客观角度看…”等理性表达
- 提出具体的问题帮助澄清情况
- 适度使用 🧠📊🎯 等理性思考的符号

记住：你的目标是帮助对方理性分析情况，找到切实可行的解决方案。`
};

export default function EunoiaChat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [currentStyle, setCurrentStyle] = useState('暖心陪伴');
  const [currentStyleData, setCurrentStyleData] = useState(null);
  const [currentAiAvatar, setCurrentAiAvatar] = useState('🤗');
  const [currentChatId, setCurrentChatId] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [hasUserSentMessage, setHasUserSentMessage] = useState(false);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate(); // Initialize useNavigate

  // 日期工具：仅比较日期部分，并写入 ISO DateTime
  const getDateOnly = (dt) => {
    if (!dt) return null;
    try { return new Date(dt).toISOString().split('T')[0]; } catch { return null; }
  };
  const isoNow = () => new Date().toISOString();
  const todayDateStr = () => new Date().toISOString().split('T')[0];

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: chatHistories = [] } = useQuery({
    queryKey: ['chatHistories'],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const allChats = await base44.entities.ChatHistory.list('-last_message_at');
      return allChats.filter(chat => chat.created_by === currentUser.email);
    },
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const { data: customStyles = [] } = useQuery({
    queryKey: ['chatStyles'],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      const allStyles = await base44.entities.ChatStyle.list();
      return allStyles.filter(style => style.created_by === currentUser.email);
    },
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const createChatMutation = useMutation({
    mutationFn: (chatData) => base44.entities.ChatHistory.create(chatData),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ['chatHistories'] });
    },
  });

  const updateChatMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChatHistory.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatHistories'] });
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (id) => base44.entities.ChatHistory.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatHistories'] });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 当底部出现提示打字指示器时，确保不会遮挡底部对话
  useEffect(() => {
    scrollToBottom();
  }, [isAiTyping]);

  useEffect(() => {
    // 检查 URL 参数中是否有 style 参数（从导入跳转过来）
    const styleParam = searchParams.get('style');
    if (styleParam && customStyles.length > 0) {
      const importedStyle = customStyles.find(s => s.name === styleParam);
      if (importedStyle) {
        handleStyleChange(importedStyle.name, importedStyle.avatar);
        // 清除 URL 参数，保留路径
        window.history.replaceState({}, '', createPageUrl(window.location.pathname));
      }
    } else if (chatHistories.length > 0 && !currentChatId) {
      loadChat(chatHistories[0]);
    } else if (chatHistories.length === 0 && !currentChatId) {
      const greeting = getInitialGreeting();
      setMessages([{
        id: 1,
        text: greeting,
        isUser: false,
        isFirst: true,
        aiAvatar: currentAiAvatar,
        styleName: currentStyle,
      }]);
      setHasUserSentMessage(false); // Ensure it's false for initial greeting
    }
  }, [chatHistories, customStyles, currentAiAvatar, currentStyle, searchParams]);

  const resetDailyCounts = async () => {
    const today = todayDateStr();
    const stored = getDateOnly(currentUser?.daily_chat_reset_date);
    if (currentUser && stored !== today) {
      await base44.auth.updateMe({
        daily_chat_count: 0,
        // Prisma 需要 DateTime，这里写入 ISO 字符串
        daily_chat_reset_date: isoNow(),
      });
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
    }
  };

  useEffect(() => {
    if (currentUser) {
      resetDailyCounts();
    }
  }, [currentUser]);

  const getInitialGreeting = () => {
    const greetings = {
      '暖心陪伴': '你好呀！我在这里陪伴你、倾听你。今天过得怎么样？有什么想和我分享的吗？😊',
      '灵感火花': '嗨！很高兴见到你！✨ 今天有什么有趣的想法或者困扰吗？我们一起来探索吧！',
      '冷静分析': '你好。我可以帮你理性地分析和解决问题。请告诉我，目前有什么需要思考的事情吗？'
    };
    return greetings[currentStyle] || greetings['暖心陪伴'];
  };

  const buildSystemPrompt = () => {
    // 如果是系统预设角色
    if (SYSTEM_PROMPTS[currentStyle]) {
      return SYSTEM_PROMPTS[currentStyle];
    }
    
    // 如果是用户自定义角色
    if (currentStyleData) {
      let prompt = `你是一位AI助手，名字是"${currentStyleData.name}"。\n\n`;
      
      if (currentStyleData.personality) {
        prompt += `性格特点：\n${currentStyleData.personality}\n\n`;
      }
      
      if (currentStyleData.background) {
        prompt += `背景故事：\n${currentStyleData.background}\n\n`;
      }
      
      if (currentStyleData.dialogue_style) {
        prompt += `对话方式：\n${currentStyleData.dialogue_style}\n\n`;
      }
      
      prompt += `请根据以上设定与12-18岁的青少年对话，提供情感支持和建议。保持角色一致性，用温暖、真诚的方式交流。`;
      
      return prompt;
    }
    
    return SYSTEM_PROMPTS['暖心陪伴'];
  };

  const handleNewChat = () => {
    setCurrentChatId(null);
    setHasUserSentMessage(false);
    const greeting = getInitialGreeting();
    setMessages([{
      id: 1,
      text: greeting,
      isUser: false,
      isFirst: true,
      aiAvatar: currentAiAvatar,
      styleName: currentStyle,
    }]);
    setHistoryOpen(false);
  };

  const loadChat = (chat) => {
    setCurrentChatId(chat.id);
    setHasUserSentMessage(true); // Assuming loading a chat means user has sent messages in it
    const styleName = chat.style_name || '暖心陪伴';
    const styleAvatar = chat.style_avatar || '🤗';
    
    setCurrentStyle(styleName);
    setCurrentAiAvatar(styleAvatar);
    
    // 加载自定义风格数�?
    const customStyle = customStyles.find(s => s.name === styleName);
    if (customStyle) {
      setCurrentStyleData(customStyle);
    } else {
      setCurrentStyleData(null);
    }
    
    const loadedMessages = chat.messages?.map((msg, idx) => ({
      id: idx + 1,
      text: msg.content,
      isUser: msg.role === 'user',
      isFirst: msg.isFirst || false,
      aiAvatar: msg.aiAvatar || styleAvatar,
      styleName: msg.styleName || styleName,
    })) || [];
    
    if (loadedMessages.length === 0) {
      loadedMessages.push({
        id: 1,
        text: getInitialGreeting(),
        isUser: false,
        isFirst: true,
        aiAvatar: styleAvatar,
        styleName: styleName,
      });
    }
    
    setMessages(loadedMessages);
    setHistoryOpen(false);
  };

  const saveCurrentChat = () => {
    if (!currentChatId) return;
    
    const chatMessages = messages.map(msg => ({
      role: msg.isUser ? 'user' : 'ai',
      content: msg.text,
      timestamp: new Date().toISOString(),
    }));

    updateChatMutation.mutate({
      id: currentChatId,
      data: {
        messages: chatMessages,
        style_name: currentStyle,
        style_avatar: currentAiAvatar,
        last_message_at: new Date().toISOString(),
      },
    });
  };

  const handleStyleChange = (styleName, avatar) => {
    const previousStyle = currentStyle;
    setCurrentStyle(styleName);
    
    const systemAvatars = {
      '暖心陪伴': '🤗',
      '灵感火花': '💡',
      '冷静分析': '🧠',
    };

    // 查找是否是自定义风格
    const customStyle = customStyles.find(s => s.name === styleName);
    let newAvatar;
    if (customStyle) {
      setCurrentStyleData(customStyle);
      newAvatar = customStyle.avatar || '😊';
      setCurrentAiAvatar(newAvatar);
    } else {
      setCurrentStyleData(null);
      newAvatar = systemAvatars[styleName] || '🤗';
      setCurrentAiAvatar(newAvatar);
    }
    
    // 添加风格切换提示消息
    if (messages.length > 1 && previousStyle !== styleName) {
      const greeting = getInitialGreeting();
      const switchMessage = {
        id: messages.length + 1,
        text: greeting,
        isUser: false,
        isFirst: true,
        aiAvatar: newAvatar,
        styleName: styleName,
      };
      setMessages([...messages, switchMessage]);
    }
    
    // 保存风格到当前对�?
    if (currentChatId) {
      updateChatMutation.mutate({
        id: currentChatId,
        data: {
          style_name: styleName,
          style_avatar: newAvatar,
        },
      });
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isAiTyping) return;
    
    // 检查对话限�?
    const isPlusUser = currentUser?.subscription_tier === 'plus';
    const today = todayDateStr();
    const stored = getDateOnly(currentUser?.daily_chat_reset_date);
    const resetNeeded = stored !== today;
    const currentCount = resetNeeded ? 0 : (currentUser?.daily_chat_count || 0);
    
    // Free用户每日30条限�?
    if (!isPlusUser && currentCount >= 30) {
      if (window.confirm('今日对话次数已用完。升级Plus可享受无限对话，是否了解更多？')) {
        navigate(createPageUrl('PlusSubscription')); // Navigate to Plus subscription page
      }
      return; // Stop sending message
    }
    
    // Plus用户每小�?0条软限制（这里简化实现为每日60条软限制�?
    if (isPlusUser && currentCount >= 60) {
      alert('您当前使用频率较高，已进入排队状态，响应可能稍慢，请耐心等待。');
    }
    
    // 如果是第一次发送消息，创建对话记录
    if (!hasUserSentMessage && !currentChatId) {
      const newChat = {
        title: `对话 ${new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' })}`,
        style_name: currentStyle,
        style_avatar: currentAiAvatar,
        messages: [],
        last_message_at: new Date().toISOString(),
      };
      const createdChat = await createChatMutation.mutateAsync(newChat);
      setCurrentChatId(createdChat.id);
      setHasUserSentMessage(true);
    }
    
    const userMessage = {
      id: messages.length + 1,
      text: inputValue,
      isUser: true
    };
    
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsAiTyping(true);
    
    try {
      const conversationHistory = newMessages
        .filter(msg => !msg.isFirst)
        .map(msg => ({
          role: msg.isUser ? 'user' : 'assistant',
          content: msg.text
        }));
      
      const systemPrompt = buildSystemPrompt();
      const fullPrompt = `${systemPrompt}\n\n对话历史：\n${conversationHistory.map(msg => 
        `${msg.role === 'user' ? '用户' : 'AI'}：${msg.content}`
      ).join('\n')}\n\n请继续对话，记住保持你的角色设定。`;
      
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: fullPrompt,
      });
      
      // 更新对话计数
      if (currentUser) { // Only update if currentUser exists
        await base44.auth.updateMe({
          daily_chat_count: currentCount + 1,
          // 写入 ISO DateTime，避免 Prisma 校验错误
          daily_chat_reset_date: isoNow(),
        });
        queryClient.invalidateQueries({ queryKey: ['currentUser'] }); // Invalidate to refetch updated currentUser
      }
      
      const aiMessage = {
        id: newMessages.length + 1,
        text: response,
        isUser: false,
        isFirst: false,
        aiAvatar: currentAiAvatar,
        styleName: currentStyle,
      };
      
      const updatedMessages = [...newMessages, aiMessage];
      setMessages(updatedMessages);
      
      if (currentChatId) {
        const chatMessages = updatedMessages.map(msg => ({
          role: msg.isUser ? 'user' : 'ai',
          content: msg.text,
          timestamp: new Date().toISOString(),
          isFirst: msg.isFirst || false,
          aiAvatar: msg.aiAvatar,
          styleName: msg.styleName,
        }));

        await updateChatMutation.mutateAsync({
          id: currentChatId,
          data: {
            messages: chatMessages,
            style_name: currentStyle,
            style_avatar: currentAiAvatar,
            last_message_at: new Date().toISOString(),
          },
        });
      }
      
    } catch (error) {
      console.error('AI回复失败:', error);
      const errorMessage = {
        id: newMessages.length + 1,
        text: '抱歉，我现在遇到了一些问题。请稍后再试，或者尝试重新表述你的问题。',
        isUser: false,
        aiAvatar: currentAiAvatar,
        styleName: currentStyle,
      };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsAiTyping(false);
    }
  };

  const handleQuickSuggestion = (suggestion) => {
    setInputValue(suggestion);
  };

  const handleDeleteChat = async (chatId, e) => {
    e.stopPropagation();
    if (window.confirm('确定要删除这个对话吗？')) {
      await deleteChatMutation.mutateAsync(chatId);
      if (currentChatId === chatId) {
        handleNewChat();
      }
    }
  };

  // Logic for usage warning display
  const isPlusUser = currentUser?.subscription_tier === 'plus';
  const today = todayDateStr();
  const resetNeeded = getDateOnly(currentUser?.daily_chat_reset_date) !== today; // 仅比较日期部分
  const currentCount = resetNeeded ? 0 : (currentUser?.daily_chat_count || 0); // 若需重置则视为 0
  const remainingChats = isPlusUser ? '无限' : Math.max(0, 30 - currentCount);
  const showWarning = !isPlusUser && currentCount >= 25; // Show warning for free users when count is 25 or more

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-teal-50/30 to-white">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 pt-safe pb-3 flex items-center justify-between flex-shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full flex items-center justify-center">
                <Menu className="w-5 h-5" strokeWidth={1.5} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader className="mb-4">
                <SheetTitle>对话历史</SheetTitle>
              </SheetHeader>
              <div className="space-y-2">
                {chatHistories.map((chat) => (
                  <div
                    key={chat.id}
                    className={`p-3 rounded-2xl cursor-pointer transition-all group ${
                      currentChatId === chat.id
                        ? 'bg-teal-50 border border-teal-200'
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                    onClick={() => loadChat(chat)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <MessageSquare className="w-4 h-4 text-gray-500 flex-shrink-0" strokeWidth={1.5} />
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {chat.title}
                          </p>
                        </div>
                        <p className="text-xs text-gray-500">
                          {chat.style_name} · {format(new Date(chat.last_message_at), 'MM/dd HH:mm')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 flex items-center justify-center"
                        onClick={(e) => handleDeleteChat(chat.id, e)}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <StyleSelector 
            currentStyle={currentStyle}
            onStyleChange={handleStyleChange}
          />
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full flex items-center justify-center"
          onClick={handleNewChat}
        >
          <Plus className="w-5 h-5" strokeWidth={1.5} />
        </Button>
      </div>

      {/* Messages Area */}
      {
        // 根据底部 UI 占位动态计算消息区域底部内边距，避免被提示/输入�?底部导航遮挡
      }
      {(() => {
        const basePad = 160; // 输入�?+ 底部导航基础高度
        const warningPad = showWarning ? 40 : 0; // 使用提醒条额外占�?
        const quickPad = messages.length <= 2 ? 48 : 0; // 快捷建议区域
        const bottomPaddingPx = basePad + warningPad + quickPad;
        return (
          <div
            className="flex-1 overflow-y-auto px-4 pb-4"
            style={{ paddingBottom: `${bottomPaddingPx}px`, paddingTop: '96px', scrollPaddingTop: '96px' }}
          >
        
        <div className="max-w-lg mx-auto">
          {messages.map((message) => (
            <ChatBubble 
              key={message.id}
              message={message.text}
              isUser={message.isUser}
              isFirst={message.isFirst}
              aiAvatar={message.aiAvatar || currentAiAvatar}
              userAvatar={currentUser?.avatar_url || currentUser?.avatar}
              userName={currentUser?.nickname || currentUser?.full_name}
              styleName={message.styleName || currentStyle}
            />
          ))}
          {isAiTyping && (
            <div className="flex gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center overflow-hidden flex-shrink-0">
                {isRenderableImage(currentAiAvatar) ? (
                  <img src={currentAiAvatar} alt="AI" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-base">{currentAiAvatar}</span>
                )}
              </div>
              <div className="px-4 py-3 rounded-[18px] rounded-bl-md bg-teal-500 text-white shadow-sm">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
        );
      })()}

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40" style={{ paddingBottom: '72px' }}>
        <div className="max-w-lg mx-auto px-4">
          {/* Usage Warning */}
          {showWarning && (
            <div className="py-2">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 flex items-center justify-between">
                 <p className="text-xs text-amber-800">
                   今日剩余 <span className="font-semibold">{remainingChats}/30</span> 次对话
                 </p>
                <Button
                  size="sm"
                  variant="link"
                  className="text-xs text-amber-700 hover:text-amber-900 h-auto p-0"
                  onClick={() => navigate(createPageUrl('PlusSubscription'))}
                >
                   升级 Plus 不限次
                 </Button>
              </div>
            </div>
          )}

          {messages.length <= 2 && (
            <div className="flex gap-2 overflow-x-auto py-3 scrollbar-hide">
              {quickSuggestions.map((suggestion, idx) => (
                <QuickChip 
                  key={idx}
                  label={suggestion}
                  onClick={() => handleQuickSuggestion(suggestion)}
                />
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 py-3">
            <Button 
              variant="ghost" 
              size="icon"
              className="rounded-full flex-shrink-0 flex items-center justify-center"
            >
              <Paperclip className="w-5 h-5 text-gray-500" strokeWidth={1.5} />
            </Button>
            
            <div className="flex-1 relative">
              <Input 
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="输入消息..."
                className="rounded-full border-gray-200 pr-12 h-11 bg-gray-50 focus:bg-white transition-colors"
                disabled={isAiTyping}
              />
            </div>
            
            <Button 
              size="icon"
              className="rounded-full bg-teal-500 hover:bg-teal-600 flex-shrink-0 flex items-center justify-center"
              onClick={handleSend}
              disabled={!inputValue.trim() || isAiTyping}
            >
              <Send className="w-5 h-5" strokeWidth={2} />
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}


