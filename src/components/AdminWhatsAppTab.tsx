'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Search, Phone, User, Check, CheckCheck, 
  Clock, RefreshCw, ShoppingBag, AlertCircle, ArrowLeft,
  Sparkles, ExternalLink, ShieldCheck, Flame, Tag, Truck,
  Maximize2, Minimize2, Bell, BellRing, Volume2, X, Camera, Settings,
  Smile, Image as ImageIcon, Video, PhoneCall, CircleDot, Radio,
  Users, Archive, MoreVertical, Plus, Info, ChevronDown, PhoneOutgoing,
  PhoneIncoming, PhoneMissed, Play, Paperclip
} from 'lucide-react';
import { WhatsAppChat, WhatsAppMessage, Order, ClientProfile, WhatsAppStatusItem, WhatsAppCallRecord } from '@/types';
import { 
  getWhatsAppChats, getWhatsAppMessages, sendWhatsAppMessageFromAdmin, 
  markChatAsRead 
} from '@/lib/whatsappChat';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { soundManager } from '@/lib/sounds';
import { FOX_LOGO_BASE64 } from '@/data/foxLogoBase64';

interface AdminWhatsAppTabProps {
  orders: Order[];
  clients: ClientProfile[];
  adminSessionName?: string; // Nombre del socio actual (ej: 'Mario' o 'Nydia')
  initialPhone?: string;
  initialMessage?: string;
  onClose?: () => void;
  onSelectAnyChat?: () => void;
}

// Helper para evitar bloqueos de referrer o CDN en fotos de WhatsApp
function getSafeAvatarUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('pps.whatsapp.net') || url.includes('fbcdn.net')) {
    return `/api/whatsapp/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export default function AdminWhatsAppTab({ orders, clients, adminSessionName, initialPhone, initialMessage, onClose, onSelectAnyChat }: AdminWhatsAppTabProps) {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [activeChat, setActiveChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Socio automático según sesión activa (Mario o Nydia)
  const resolvedPartner = adminSessionName?.toLowerCase().includes('nydia') ? 'Nydia' : 'Mario';
  const [partnerName, setPartnerName] = useState<'Mario' | 'Nydia'>(resolvedPartner);

  // Modo Agente Híbrido ('agent' = responde IA, 'manual' = control de Mario/Nydia)
  const [chatAgentMode, setChatAgentMode] = useState<'agent' | 'manual'>('agent');
  const [togglingAgent, setTogglingAgent] = useState(false);

  // Sugerencias de respuesta rápida del Agente (copiloto 1-clic)
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  useEffect(() => {
    if (adminSessionName) {
      const p = adminSessionName.toLowerCase().includes('nydia') ? 'Nydia' : 'Mario';
      setPartnerName(p);
    }
  }, [adminSessionName]);

  // Modo Pantalla Completa
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Notificaciones de Sistema / Push en Navegador
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Filtros rápidos
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'with_orders'>('all');

  // Selector de Emojis y Stickers de Marca FoxDrop
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);

  // Stickers oficiales de la marca FoxDrop (Colección Fox Ilustrado en formato nativo WebP 512x512)
  const brandStickers = [
    { id: 'sticker_gracias_compra', title: '¡Gracias por tu compra!', url: '/stickers/sticker-gracias-compra.webp', desc: 'Agradecimiento' },
    { id: 'sticker_pedido_enviado', title: '¡Pedido enviado!', url: '/stickers/sticker-pedido-enviado.webp', desc: 'Con amor y corazón' },
    { id: 'sticker_pedido_camino', title: '¡Tu pedido va en camino!', url: '/stickers/sticker-pedido-camino-1.webp', desc: 'Fox en moto rápida' },
    { id: 'sticker_pago_recibido', title: '¡Pago recibido!', url: '/stickers/sticker-pago-recibido.webp', desc: 'Confirmación de pago' },
    { id: 'sticker_pago_caja', title: '¡Caja FoxDrop lista!', url: '/stickers/sticker-pago-caja.webp', desc: 'Empaquetado FoxDrop' },
    { id: 'sticker_descuento_etiqueta', title: '¡Descuento especial!', url: '/stickers/sticker-descuento-etiqueta.webp', desc: 'Etiqueta % off' },
    { id: 'sticker_descuentos_globos', title: '¡Descuentos en camino!', url: '/stickers/sticker-descuentos-globos.webp', desc: 'Fiesta y globos' },
    { id: 'sticker_gracias_porc', title: '¡Gracias & Promoción!', url: '/stickers/sticker-gracias-porc.webp', desc: 'Fox guiño %' },
  ];

  // Colección de emojis más utilizados para ventas y atención al cliente
  const commonEmojis = [
    '🦊', '📦', '🚚', '✨', '🔥', '🎉', '🛍️', '💯', 
    '🙌', '👍', '😊', '👋', '❤️', '✅', '⭐', '💵', 
    '🏷️', '📍', '📲', '⏰', '⚡', '💪', '🚀', '😍'
  ];

  // Navegación estilo WhatsApp Desktop oficial
  const [navSection, setNavSection] = useState<'chats' | 'calls' | 'status' | 'channels' | 'communities' | 'archived'>('chats');

  // Estados / Historias (Stories) - 100% Reales (Sin ejemplos falsos)
  const [stories, setStories] = useState<WhatsAppStatusItem[]>([]);
  const [loadingStories, setLoadingStories] = useState(false);
  const [activeStoryViewing, setActiveStoryViewing] = useState<WhatsAppStatusItem | null>(null);
  const [showAddStoryModal, setShowAddStoryModal] = useState(false);
  const [newStoryCaption, setNewStoryCaption] = useState('');
  const [newStoryMediaUrl, setNewStoryMediaUrl] = useState('');
  const [uploadingStory, setUploadingStory] = useState(false);
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  // Registro y Marcador de Llamadas - 100% Reales de los pedidos/clientes atendidos
  const [callLogs, setCallLogs] = useState<WhatsAppCallRecord[]>([]);
  const [callingModal, setCallingModal] = useState<{ clientName: string; phone: string; callType: 'voice' | 'video' } | null>(null);

  // Cargar historias reales desde el endpoint
  const fetchRealStories = async () => {
    setLoadingStories(true);
    try {
      const res = await fetch('/api/whatsapp/stories');
      const data = await res.json();
      if (data.success && Array.isArray(data.stories)) {
        setStories(data.stories);
      }
    } catch (err) {
      console.warn('Error cargando historias reales:', err);
    } finally {
      setLoadingStories(false);
    }
  };

  useEffect(() => {
    if (navSection === 'status') {
      fetchRealStories();
    }
  }, [navSection]);

  // Perfil de la cuenta propia de WhatsApp FoxDrop
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [myProfile, setMyProfile] = useState<{ id?: string; name?: string; phone?: string; avatarUrl?: string; status?: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState('');
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchMyProfile = async () => {
    setLoadingProfile(true);
    setProfileMessage(null);
    try {
      const res = await fetch('/api/whatsapp/profile');
      const text = await res.text();
      let data: any = {};
      try { data = JSON.parse(text); } catch {}

      if (data && data.success) {
        setMyProfile(data);
        setNewStatusInput(data.status || '');
      } else if (data && data.error) {
        setProfileMessage({ text: data.error, type: 'error' });
      }
    } catch (err: any) {
      console.warn('Error cargando perfil propio de WhatsApp:', err.message);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUploadProfilePicture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileMessage({ text: 'La imagen no debe pesar más de 5MB', type: 'error' });
      return;
    }

    setSavingProfile(true);
    setProfileMessage(null);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/whatsapp/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'picture', imageBase64: base64 }),
        });
        const text = await res.text();
        let data: any = {};
        try { data = JSON.parse(text); } catch { data = { error: 'El servidor de WhatsApp está reconectando' }; }

        if (data && data.success) {
          setMyProfile(prev => prev ? { ...prev, avatarUrl: data.avatarUrl || base64 } : prev);
          setProfileMessage({ text: '¡Foto de perfil actualizada en WhatsApp!', type: 'success' });
        } else {
          setProfileMessage({ text: data.error || 'No se pudo actualizar la foto en WhatsApp', type: 'error' });
        }
      } catch (err: any) {
        setProfileMessage({ text: err.message || 'Error al subir imagen', type: 'error' });
      } finally {
        setSavingProfile(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateStatus = async () => {
    if (!newStatusInput.trim()) return;
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const res = await fetch('/api/whatsapp/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'status', status: newStatusInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setMyProfile(prev => prev ? { ...prev, status: data.status } : prev);
        setProfileMessage({ text: '¡Estado de WhatsApp actualizado!', type: 'success' });
      } else {
        setProfileMessage({ text: data.error || 'Error al guardar estado', type: 'error' });
      }
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'Error de red', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Solicitar permiso de notificaciones nativas del navegador / celular
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        if (perm === 'granted') {
          try {
            new Notification('FoxDrop WhatsApp', {
              body: '¡Notificaciones activadas! Te avisaremos de cada mensaje entrante aunque estés en otra pestaña.',
              icon: '/favicon.ico',
            });
            soundManager.playWhatsAppPop();
          } catch {}
        }
      } catch (err) {
        console.error('Error solicitando permisos de notificación:', err);
      }
    }
  };

  // Disparar notificación nativa y sonido fuerte
  const triggerClientMessageNotification = (senderName: string, text: string) => {
    // 1. Sonido estilo WhatsApp y vibración
    try {
      soundManager.playWhatsAppPop();
    } catch {}

    // 2. Notificación en pantalla del sistema / celular
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(`💬 WhatsApp: ${senderName}`, {
          body: text || 'Nuevo mensaje recibido en FoxDrop',
          icon: '/favicon.ico',
          tag: 'whatsapp-message',
        });
        notif.onclick = () => {
          window.focus();
        };
      } catch {}
    }
  };

  // Auto scroll al final del chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const activeChatRef = useRef<WhatsAppChat | null>(null);
  useEffect(() => {
    activeChatRef.current = activeChat;
  }, [activeChat]);

  // Cargar mensajes cuando se selecciona un chat
  const handleSelectChat = async (chat: WhatsAppChat) => {
    if (onSelectAnyChat) onSelectAnyChat();
    setActiveChat(chat);
    setLoadingMessages(true);
    const msgs = await getWhatsAppMessages(chat.id);
    setMessages(msgs);
    setLoadingMessages(false);

    if (chat.unreadCount > 0) {
      markChatAsRead(chat.id);
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
    }

    // Leer modo actual del chat (Agente o Manual)
    let parsedNotes: any = {};
    if (chat.notes) {
      try {
        parsedNotes = typeof chat.notes === 'string' ? JSON.parse(chat.notes) : chat.notes;
      } catch {}
    }
    const currentMode = parsedNotes?.agentMode === 'manual' ? 'manual' : 'agent';
    setChatAgentMode(currentMode);

    // Cargar sugerencias de respuesta rápida del Agente si hay un último mensaje
    if (chat.lastMessage) {
      setLoadingSuggestions(true);
      fetch('/api/admin/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'quick_reply_suggestions',
          phone: chat.phone,
          clientName: chat.clientName,
          lastMessage: chat.lastMessage,
        }),
      })
        .then(r => r.json())
        .then(d => {
          if (d?.suggestions) setQuickSuggestions(d.suggestions);
        })
        .catch(() => {})
        .finally(() => setLoadingSuggestions(false));
    } else {
      setQuickSuggestions([]);
    }

    // Suscribir al bridge para escuchar eventos de presence (escribiendo...) de este contacto
    try {
      const lidVal = parsedNotes?.lid;
      fetch('https://foxdrop-whatsapp-bridge.onrender.com/chat/subscribePresence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: chat.phone, lid: lidVal })
      }).catch(() => {});
    } catch {}
  };

  // Cargar perfil propio de FoxDrop al montar para mostrar logo y nombre
  useEffect(() => {
    fetchMyProfile();
  }, []);

  // Si llega initialMessage pre-llenar la caja de texto
  useEffect(() => {
    if (initialMessage) {
      setInputText(initialMessage);
    }
  }, [initialMessage]);

  // Cargar lista de chats inicial o en background
  const loadChats = async (showSpinner = false) => {
    if (showSpinner) setLoadingChats(true);
    const data = await getWhatsAppChats();
    setChats(data);
    
    // Si viene initialPhone y no se ha seleccionado aún ese chat, buscar o seleccionar ese chat específicamente
    if (initialPhone && (!activeChatRef.current || activeChatRef.current.phone.replace(/\D/g, '') !== initialPhone.replace(/\D/g, ''))) {
      const cleanTarget = initialPhone.replace(/\D/g, '');
      const matched = data.find(c => c.phone.replace(/\D/g, '').endsWith(cleanTarget.slice(-10)));
      if (matched) {
        handleSelectChat(matched);
      } else {
        // Si aún no existe conversación en la base de datos para ese teléfono, armar un chat temporal activo
        const matchingClient = clients.find(cl => cl.phone.replace(/\D/g, '').endsWith(cleanTarget.slice(-10)));
        const matchingOrder = orders.find(o => o.clientPhone.replace(/\D/g, '').endsWith(cleanTarget.slice(-10)));
        const fallbackName = matchingClient?.name || matchingOrder?.clientName || 'Cliente';
        const tempChat: WhatsAppChat = {
          id: `temp-${cleanTarget}`,
          phone: cleanTarget,
          clientName: fallbackName,
          unreadCount: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setActiveChat(tempChat);
        setMessages([]);
      }
    } else if (!activeChatRef.current && data.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 768) {
      // Si no hay chat seleccionado y hay chats disponibles en desktop, auto-seleccionar el primero
      handleSelectChat(data[0]);
    }

    if (showSpinner) setLoadingChats(false);

    // Enriquecer en segundo plano los chats que aún no tengan avatarUrl
    data.forEach(async (c) => {
      if (!c.avatarUrl) {
        try {
          const res = await fetch(`/api/whatsapp/contact-avatar?phone=${c.phone}`);
          const resData = await res.json();
          if (resData.success && resData.avatarUrl) {
            setChats(prev => prev.map(item => item.id === c.id ? { ...item, avatarUrl: resData.avatarUrl } : item));
            if (activeChatRef.current?.id === c.id) {
              setActiveChat(prev => prev ? { ...prev, avatarUrl: resData.avatarUrl } : prev);
            }
          }
        } catch {}
      }
    });
  };

  useEffect(() => {
    loadChats(true);
  }, [initialPhone]);

  // Suscripción Realtime a Supabase para actualizar mensajes en vivo para ambos socios
  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    const uniqueChannelName = `whatsapp_rt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_messages' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as any;
            const currentActive = activeChatRef.current;
            
            // Si el mensaje es del chat actualmente abierto, anexarlo
            if (currentActive && (newMsg.chat_id === currentActive.id || newMsg.phone === currentActive.phone)) {
              setMessages(prev => {
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, {
                  id: newMsg.id,
                  chatId: newMsg.chat_id,
                  phone: newMsg.phone,
                  sender: newMsg.sender,
                  senderName: newMsg.sender_name,
                  text: newMsg.text,
                  mediaUrl: newMsg.media_url,
                  mediaType: newMsg.media_type,
                  status: newMsg.status,
                  createdAt: newMsg.created_at,
                }];
              });
            }

            // Si es un mensaje entrante de un cliente, disparar sonido + notificación del sistema
            if (newMsg.sender === 'client') {
              triggerClientMessageNotification(newMsg.sender_name || 'Cliente', newMsg.text);
            }

            // Recargar la lista de chats para actualizar el último mensaje y contadores
            loadChats(false);
          } else if (payload.eventType === 'UPDATE') {
            const updatedMsg = payload.new as any;
            setMessages(prev => prev.map(m => m.id === updatedMsg.id ? { ...m, status: updatedMsg.status } : m));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_chats' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedChat = payload.new as any;
            if (activeChatRef.current && activeChatRef.current.id === updatedChat.id) {
              setActiveChat(prev => prev ? {
                ...prev,
                notes: updatedChat.notes,
                lastMessage: updatedChat.last_message,
                lastMessageTime: updatedChat.last_message_time,
              } : prev);
            }
          }
          loadChats(false);
        }
      )
      .subscribe();

    // Polling cada 4 segundos para asegurar sincronización instantánea de palomitas y mensajes en vivo
    const pollInterval = setInterval(() => {
      loadChats(false);
      const currentActive = activeChatRef.current;
      if (currentActive) {
        getWhatsAppMessages(currentActive.id).then(msgs => {
          if (msgs && msgs.length > 0) {
            setMessages(msgs);
          }
        });
      }
    }, 4000);

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, []);

  // Enviar mensaje
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !activeChat || sending) return;

    const messageText = inputText.trim();
    setInputText('');
    setSending(true);

    try {
      const result = await sendWhatsAppMessageFromAdmin({
        chatId: activeChat.id,
        phone: activeChat.phone,
        clientName: activeChat.clientName,
        senderName: partnerName,
        text: messageText,
      });

      if (result.success && result.message) {
        // Si el chat era temporal, actualizar el ID con el UUID real creado
        if (activeChat.id.startsWith('temp-') && result.message.chatId) {
          setActiveChat(prev => prev ? { ...prev, id: result.message!.chatId } : null);
          loadChats(false);
        }

        setMessages(prev => {
          if (prev.some(m => m.id === result.message!.id)) return prev;
          return [...prev, result.message!];
        });
        try { soundManager.triggerHaptic('light'); } catch {}
      } else {
        alert(result.error || 'Error al enviar mensaje');
      }
    } catch (err: any) {
      alert('Error de red al enviar mensaje: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // Enviar plantilla rápida con 1 clic
  const handleSendQuickTemplate = (textTemplate: string) => {
    setInputText(textTemplate);
  };

  // Insertar Emoji en el campo de texto
  const handleInsertEmoji = (emoji: string) => {
    setInputText(prev => prev + emoji);
  };

  // Enviar Sticker oficial de la marca FoxDrop
  const handleSendSticker = async (sticker: { id: string; title: string; url: string }) => {
    if (!activeChat || sending) return;

    setSending(true);
    setShowStickerPicker(false);

    try {
      // Usar URL absoluta para que el bridge de WhatsApp pueda descargar la imagen/sticker
      const fullStickerUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}${sticker.url}`
        : `https://foxdrop.mx${sticker.url}`;

      const result = await sendWhatsAppMessageFromAdmin({
        chatId: activeChat.id,
        phone: activeChat.phone,
        clientName: activeChat.clientName,
        senderName: partnerName,
        text: `[Sticker: ${sticker.title}]`,
        mediaUrl: fullStickerUrl,
        mediaType: 'sticker',
      });

      if (result.success && result.message) {
        if (activeChat.id.startsWith('temp-') && result.message.chatId) {
          setActiveChat(prev => prev ? { ...prev, id: result.message!.chatId } : null);
          loadChats(false);
        }

        setMessages(prev => {
          if (prev.some(m => m.id === result.message!.id)) return prev;
          return [...prev, result.message!];
        });
        try { soundManager.triggerHaptic('light'); } catch {}
      } else {
        alert(result.error || 'Error al enviar sticker');
      }
    } catch (err: any) {
      alert('Error de red al enviar sticker: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // Disparar llamada o videollamada a cliente
  const handleInitiateCall = (targetClient: { name: string; phone: string }, type: 'voice' | 'video' = 'voice') => {
    const rawDigits = targetClient.phone.replace(/\D/g, '');
    const formattedPhone = rawDigits.startsWith('52') ? rawDigits : `52${rawDigits}`;
    
    // Registrar en el historial de llamadas
    const newLog: WhatsAppCallRecord = {
      id: `call_${Date.now()}`,
      clientName: targetClient.name,
      phone: targetClient.phone,
      type: 'outgoing',
      callType: type,
      timestamp: 'Ahora mismo',
      duration: 'Iniciada',
    };
    setCallLogs(prev => [newLog, ...prev]);

    setCallingModal({
      clientName: targetClient.name,
      phone: formattedPhone,
      callType: type,
    });
    try { soundManager.triggerHaptic('medium'); } catch {}
  };

  // Subir nuevo Estado / Historia de FoxDrop
  const handlePublishStory = async () => {
    if (!newStoryMediaUrl.trim()) return;
    setUploadingStory(true);
    try {
      const res = await fetch('/api/whatsapp/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaUrl: newStoryMediaUrl.trim(),
          caption: newStoryCaption.trim(),
        }),
      });
      const data = await res.json();
      if (data.success && data.story) {
        setStories(prev => [data.story, ...prev]);
        setShowAddStoryModal(false);
        setNewStoryCaption('');
        setNewStoryMediaUrl('');
        try { soundManager.triggerHaptic('heavy'); } catch {}
        alert('🎉 ¡Estado publicado con éxito en WhatsApp!');
      } else {
        alert(data.error || 'No se pudo publicar la historia');
      }
    } catch (err: any) {
      alert('Error publicando historia: ' + err.message);
    } finally {
      setUploadingStory(false);
    }
  };

  // Subir imagen para la historia desde el disco local
  const handleStoryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      alert('La imagen no debe superar los 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewStoryMediaUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Pedidos relacionados con este número de teléfono
  const activeChatOrders = activeChat 
    ? orders.filter(o => o.clientPhone.replace(/\D/g, '').endsWith(activeChat.phone.replace(/\D/g, '').slice(-10)))
    : [];

  // Filtrado de chats
  const filteredChats = chats.filter(chat => {
    if (chat.phone.startsWith('_system_') || chat.status === 'archived') return false;

    const matchesSearch = 
      chat.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.phone.includes(searchTerm) ||
      (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase()));

    if (!matchesSearch) return false;

    if (chatFilter === 'unread') return chat.unreadCount > 0;
    if (chatFilter === 'with_orders') {
      return orders.some(o => o.clientPhone.replace(/\D/g, '').endsWith(chat.phone.replace(/\D/g, '').slice(-10)));
    }
    return true;
  });

  return (
    <div className={`bg-[#111B21] text-[#E9EDEF] transition-all duration-300 flex flex-col md:flex-row relative w-full overflow-hidden select-none font-sans ${
      isFullscreen 
        ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' 
        : 'rounded-2xl sm:rounded-3xl border border-[#222E35] shadow-2xl overflow-hidden h-[calc(100vh-130px)] min-h-[640px]'
    }`}>
      
      {/* ======================================================== */}
      {/* 0. BARRA VERTICAL ULTRA-ESTRECHA (ESTILO WHATSAPP DESKTOP) */}
      {/* ======================================================== */}
      <div className="hidden sm:flex flex-col items-center justify-between w-16 py-3.5 bg-[#202C33] border-r border-[#222E35] shrink-0 z-30">
        {/* Iconos Superiores de Navegación */}
        <div className="flex flex-col items-center gap-4 w-full">
          {/* Logo FoxDrop Superior */}
          <div 
            onClick={() => {
              setShowProfileModal(true);
              fetchMyProfile();
            }}
            className="w-10 h-10 rounded-full bg-[#111B21] flex items-center justify-center cursor-pointer hover:ring-2 hover:ring-[#00A884] transition relative overflow-hidden group shadow-md"
            title="Mi Perfil de WhatsApp (Foxdrop)"
          >
            {myProfile?.avatarUrl ? (
              <img
                src={getSafeAvatarUrl(myProfile.avatarUrl)}
                alt="Foxdrop"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FOX_LOGO_BASE64 || "/fox-logo-head-3d.png";
                }}
              />
            ) : (
              <img
                src={FOX_LOGO_BASE64 || "/fox-logo-head-3d.png"}
                alt="Foxdrop"
                className="w-6 h-6 object-contain drop-shadow"
              />
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
              <Camera className="w-3.5 h-3.5 text-white" />
            </div>
          </div>

          {/* Separador sutil */}
          <div className="w-8 h-[1px] bg-[#374248]"></div>

          {/* Botón CHATS */}
          <button
            type="button"
            onClick={() => setNavSection('chats')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition relative ${
              navSection === 'chats'
                ? 'bg-[#374248] text-[#00A884]'
                : 'text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#2A3942]'
            }`}
            title="Chats"
          >
            <MessageSquare className="w-5 h-5" />
            {chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0) > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#00A884] text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                {chats.reduce((acc, c) => acc + (c.unreadCount || 0), 0)}
              </span>
            )}
          </button>

          {/* Botón LLAMADAS */}
          <button
            type="button"
            onClick={() => setNavSection('calls')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition relative ${
              navSection === 'calls'
                ? 'bg-[#374248] text-[#00A884]'
                : 'text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#2A3942]'
            }`}
            title="Llamadas a Clientes"
          >
            <Phone className="w-5 h-5" />
          </button>

          {/* Botón ESTADOS / HISTORIAS (STORIES) */}
          <button
            type="button"
            onClick={() => setNavSection('status')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition relative ${
              navSection === 'status'
                ? 'bg-[#374248] text-[#00A884]'
                : 'text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#2A3942]'
            }`}
            title="Estados e Historias"
          >
            <CircleDot className="w-5 h-5" />
            {stories.some(s => !s.viewed) && (
              <span className="absolute 1.5 top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#00A884]"></span>
            )}
          </button>

          {/* Botón CANALES */}
          <button
            type="button"
            onClick={() => setNavSection('channels')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              navSection === 'channels'
                ? 'bg-[#374248] text-[#00A884]'
                : 'text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#2A3942]'
            }`}
            title="Canales de Difusión"
          >
            <Radio className="w-5 h-5" />
          </button>

          {/* Botón COMUNIDADES */}
          <button
            type="button"
            onClick={() => setNavSection('communities')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              navSection === 'communities'
                ? 'bg-[#374248] text-[#00A884]'
                : 'text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#2A3942]'
            }`}
            title="Comunidades y Grupos FoxDrop"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Botón ARCHIVADOS */}
          <button
            type="button"
            onClick={() => setNavSection('archived')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              navSection === 'archived'
                ? 'bg-[#374248] text-[#00A884]'
                : 'text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#2A3942]'
            }`}
            title="Archivados"
          >
            <Archive className="w-5 h-5" />
          </button>
        </div>

        {/* Iconos Inferiores */}
        <div className="flex flex-col items-center gap-3 w-full">
          {/* Botón Configuración de WhatsApp */}
          <button
            type="button"
            onClick={() => {
              setShowProfileModal(true);
              fetchMyProfile();
            }}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#2A3942] transition"
            title="Ajustes de Perfil"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* Botón Pantalla Completa */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#2A3942] transition"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5 text-[#00A884]" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 1. PANEL IZQUIERDO: BANDEJA DE CHATS / ESTADOS / LLAMADAS */}
      {/* ======================================================== */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-[#222E35] flex flex-col bg-[#111B21] shrink-0 ${
        activeChat ? 'hidden md:flex' : 'flex h-full'
      }`}>
        
        {/* Cabecera del Panel Izquierdo según sección */}
        <div className="p-3.5 border-b border-[#222E35] bg-[#111B21] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#E9EDEF] tracking-tight flex items-center gap-2">
              {navSection === 'chats' && <span>Chats</span>}
              {navSection === 'calls' && <span>Llamadas</span>}
              {navSection === 'status' && <span>Estados</span>}
              {navSection === 'channels' && <span>Canales</span>}
              {navSection === 'communities' && <span>Comunidades</span>}
              {navSection === 'archived' && <span>Archivados</span>}
            </h2>

            <div className="flex items-center gap-1.5">
              {navSection === 'status' && (
                <button
                  type="button"
                  onClick={() => setShowAddStoryModal(true)}
                  className="p-2 text-[#00A884] hover:bg-[#202C33] rounded-full transition cursor-pointer"
                  title="Subir nuevo estado a WhatsApp"
                >
                  <Plus className="w-5 h-5" />
                </button>
              )}

              {navSection === 'calls' && (
                <button
                  type="button"
                  onClick={() => {
                    const firstClient = clients[0] || { name: 'Cliente Puebla', phone: '2221234567' };
                    handleInitiateCall(firstClient, 'voice');
                  }}
                  className="p-2 text-[#00A884] hover:bg-[#202C33] rounded-full transition cursor-pointer"
                  title="Nueva llamada"
                >
                  <PhoneCall className="w-5 h-5" />
                </button>
              )}

              {/* Botón Recargar */}
              <button
                type="button"
                onClick={() => loadChats(true)}
                disabled={loadingChats}
                className="p-2 text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#202C33] rounded-full transition"
                title="Recargar"
              >
                <RefreshCw className={`w-4 h-4 ${loadingChats ? 'animate-spin text-[#00A884]' : ''}`} />
              </button>

              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-[#AEBAC1] hover:text-rose-400 hover:bg-[#202C33] rounded-full transition cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Buscador Estilo WhatsApp Web */}
          <div className="relative">
            <Search className="w-4 h-4 text-[#8696A0] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar un chat o iniciar uno nuevo"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[#202C33] rounded-lg text-xs text-[#E9EDEF] placeholder-[#8696A0] focus:outline-none focus:ring-1 focus:ring-[#00A884] border-none"
            />
          </div>

          {/* Filtros Píldora oficiales: Todos, No leídos, Favoritos, Con Pedidos */}
          {navSection === 'chats' && (
            <div className="flex gap-1.5 text-xs font-semibold overflow-x-auto no-scrollbar pt-1">
              <button
                onClick={() => setChatFilter('all')}
                className={`px-3 py-1 rounded-full transition text-[11px] ${
                  chatFilter === 'all'
                    ? 'bg-[#00A884] text-[#111B21] font-bold'
                    : 'bg-[#202C33] text-[#8696A0] hover:bg-[#2A3942] hover:text-[#E9EDEF]'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setChatFilter('unread')}
                className={`px-3 py-1 rounded-full transition text-[11px] ${
                  chatFilter === 'unread'
                    ? 'bg-[#00A884] text-[#111B21] font-bold'
                    : 'bg-[#202C33] text-[#8696A0] hover:bg-[#2A3942] hover:text-[#E9EDEF]'
                }`}
              >
                No leídos
              </button>
              <button
                onClick={() => setChatFilter('with_orders')}
                className={`px-3 py-1 rounded-full transition text-[11px] ${
                  chatFilter === 'with_orders'
                    ? 'bg-[#00A884] text-[#111B21] font-bold'
                    : 'bg-[#202C33] text-[#8696A0] hover:bg-[#2A3942] hover:text-[#E9EDEF]'
                }`}
              >
                Con Pedidos
              </button>
            </div>
          )}
        </div>

        {/* ─── VISTA 1: LISTA DE CHATS ─── */}
        {navSection === 'chats' && (
          <div className="flex-1 overflow-y-auto divide-y divide-[#202C33]">
            {loadingChats ? (
              <div className="p-8 text-center text-[#8696A0] space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#00A884]" />
                <p className="text-xs font-bold">Cargando chats de WhatsApp...</p>
              </div>
            ) : filteredChats.length === 0 ? (
              <div className="p-8 text-center text-[#8696A0] space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-[#374248]" />
                <p className="text-xs font-bold">No hay chats que coincidan</p>
                <p className="text-[11px]">Los mensajes entrantes de clientes se sincronizarán aquí automáticamente.</p>
              </div>
            ) : (
              filteredChats.map((chat) => {
                const isSelected = activeChat?.id === chat.id;
                const hasOrder = orders.some(o => o.clientPhone.replace(/\D/g, '').endsWith(chat.phone.replace(/\D/g, '').slice(-10)));

                return (
                  <div
                    key={chat.id}
                    onClick={() => handleSelectChat(chat)}
                    className={`p-3 flex items-center gap-3 cursor-pointer transition ${
                      isSelected 
                        ? 'bg-[#2A3942]' 
                        : 'hover:bg-[#202C33] bg-transparent'
                    }`}
                  >
                    {/* Avatar con foto o inicial */}
                    <div className="w-12 h-12 rounded-full bg-[#6B7C85] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden relative">
                      {chat.avatarUrl ? (
                        <img 
                          src={getSafeAvatarUrl(chat.avatarUrl)} 
                          alt={chat.clientName} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : (
                        <span>{chat.clientName.charAt(0).toUpperCase()}</span>
                      )}
                      {hasOrder && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#E65F2B] text-white rounded-full flex items-center justify-center text-[8px] z-10" title="Cliente con pedidos">
                          🛍️
                        </span>
                      )}
                    </div>

                    {/* Info del Chat */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4 className="font-semibold text-[#E9EDEF] text-sm truncate">
                          {chat.clientName}
                        </h4>
                        <span className={`text-[11px] shrink-0 ${chat.unreadCount > 0 ? 'text-[#00A884] font-bold' : 'text-[#8696A0]'}`}>
                          {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs text-[#8696A0] truncate">
                          {chat.lastMessage || 'Conversación abierta'}
                        </p>
                        {chat.unreadCount > 0 && (
                          <span className="bg-[#00A884] text-[#111B21] text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ─── VISTA 2: SECCIÓN DE ESTADOS / HISTORIAS (STORIES) ─── */}
        {navSection === 'status' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Mi Estado */}
            <div 
              onClick={() => {
                const myStory = stories.find(s => s.isMyStatus);
                if (myStory) setActiveStoryViewing(myStory);
                else setShowAddStoryModal(true);
              }}
              className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-[#202C33] cursor-pointer transition"
            >
              <div className="relative">
                <div className="w-12 h-12 rounded-full p-0.5 border-2 border-[#00A884] overflow-hidden">
                  <img
                    src={myProfile?.avatarUrl ? getSafeAvatarUrl(myProfile.avatarUrl) : (FOX_LOGO_BASE64 || "/fox-logo-head-3d.png")}
                    alt="Mi estado"
                    className="w-full h-full object-cover rounded-full"
                  />
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAddStoryModal(true);
                  }}
                  className="absolute bottom-0 right-0 w-4 h-4 bg-[#00A884] text-[#111B21] rounded-full flex items-center justify-center font-bold text-xs"
                >
                  +
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-[#E9EDEF]">Mi estado</h4>
                <p className="text-xs text-[#8696A0]">Toca para ver o añadir una actualización</p>
              </div>
            </div>

            <div className="border-t border-[#222E35] pt-3">
              <span className="text-xs font-bold text-[#8696A0] uppercase tracking-wider block mb-2">
                Recientes de clientes ({stories.filter(s => !s.isMyStatus).length})
              </span>

              {loadingStories ? (
                <div className="py-6 text-center text-[#8696A0] text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto text-[#00A884] mb-2" />
                  <span>Sincronizando estados...</span>
                </div>
              ) : stories.filter(s => !s.isMyStatus).length === 0 ? (
                <div className="py-8 px-4 text-center rounded-2xl bg-[#202C33]/50 border border-[#222E35]/60 space-y-1.5">
                  <CircleDot className="w-6 h-6 text-[#8696A0] mx-auto" />
                  <p className="text-xs font-bold text-[#E9EDEF]">No hay actualizaciones recientes</p>
                  <p className="text-[11px] text-[#8696A0]">
                    Cuando tus clientes publiquen estados aparecerán aquí en tiempo real.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {stories.filter(s => !s.isMyStatus).map(st => (
                    <div
                      key={st.id}
                      onClick={() => setActiveStoryViewing(st)}
                      className="flex items-center gap-3.5 p-2 rounded-xl hover:bg-[#202C33] cursor-pointer transition"
                    >
                      <div className={`w-12 h-12 rounded-full p-0.5 border-2 ${st.viewed ? 'border-[#8696A0]' : 'border-[#00A884]'} overflow-hidden`}>
                        <img
                          src={st.mediaUrl}
                          alt={st.authorName}
                          className="w-full h-full object-cover rounded-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-[#E9EDEF] truncate">{st.authorName}</h4>
                        <p className="text-xs text-[#8696A0]">{st.createdAt}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Botón Flotante Subir Estado */}
            <button
              onClick={() => setShowAddStoryModal(true)}
              className="w-full py-2.5 bg-[#00A884] hover:bg-[#008f6f] text-[#111B21] font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition mt-4"
            >
              <Camera className="w-4 h-4" />
              <span>Subir nuevo Estado a WhatsApp</span>
            </button>
          </div>
        )}

        {/* ─── VISTA 3: SECCIÓN DE LLAMADAS A CLIENTES ─── */}
        {navSection === 'calls' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="bg-[#202C33] p-3 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#00A884]/20 text-[#00A884] flex items-center justify-center font-bold">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#E9EDEF]">Llamadas con 1 Clic</h4>
                  <p className="text-[11px] text-[#8696A0]">Llama directo al celular de tus clientes</p>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-[#8696A0] uppercase tracking-wider block mb-2">
                Historial de Llamadas ({callLogs.length})
              </span>

              {callLogs.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-2xl bg-[#202C33]/50 border border-[#222E35]/60 space-y-2">
                  <PhoneCall className="w-7 h-7 text-[#8696A0] mx-auto" />
                  <p className="text-xs font-bold text-[#E9EDEF]">Sin llamadas registradas</p>
                  <p className="text-[11px] text-[#8696A0]">
                    Presiona el botón de llamada dentro de cualquier chat activo para comunicarte con el cliente.
                  </p>
                </div>
              ) : (
                callLogs.map(log => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-[#202C33] transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#374248] text-white flex items-center justify-center font-bold text-xs">
                        {log.clientName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#E9EDEF]">{log.clientName}</h4>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#8696A0]">
                          {log.type === 'outgoing' && <PhoneOutgoing className="w-3 h-3 text-[#00A884]" />}
                          {log.type === 'incoming' && <PhoneIncoming className="w-3 h-3 text-sky-400" />}
                          {log.type === 'missed' && <PhoneMissed className="w-3 h-3 text-rose-500" />}
                          <span>{log.timestamp}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleInitiateCall({ name: log.clientName, phone: log.phone }, 'voice')}
                        className="p-2 text-[#00A884] hover:bg-[#374248] rounded-full transition"
                        title="Llamar"
                      >
                        <Phone className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleInitiateCall({ name: log.clientName, phone: log.phone }, 'video')}
                        className="p-2 text-[#00A884] hover:bg-[#374248] rounded-full transition"
                        title="Videollamada"
                      >
                        <Video className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ─── VISTA 4: CANALES / DIFUSIÓN ─── */}
        {navSection === 'channels' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#202C33] text-[#00A884] flex items-center justify-center mx-auto mt-6">
              <Radio className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-[#E9EDEF]">Canal Oficial FoxDrop Puebla</h3>
            <p className="text-xs text-[#8696A0] max-w-xs mx-auto">
              Envía avisos de ofertas flash, nuevos lotes importados y dinámicas del Club FoxDrop a todos tus clientes suscritos de forma masiva.
            </p>
            <button
              onClick={() => {
                setNavSection('chats');
                setInputText('📢 *AVISO FOXDROP:* ¡Llegó nuevo cargamento a bodega Puebla! Aparta el tuyo antes de que se agoten.');
              }}
              className="px-4 py-2 bg-[#00A884] text-[#111B21] font-bold rounded-xl text-xs"
            >
              Crear Mensaje de Difusión
            </button>
          </div>
        )}

        {/* ─── VISTA 5: COMUNIDADES ─── */}
        {navSection === 'communities' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#202C33] text-[#00A884] flex items-center justify-center mx-auto mt-6">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-[#E9EDEF]">Comunidad VIP Club FoxDrop</h3>
            <p className="text-xs text-[#8696A0] max-w-xs mx-auto">
              Grupos segmentados de compradores frecuentes en Angelópolis, Dorada y Centro para entregas exprés.
            </p>
          </div>
        )}

        {/* ─── VISTA 6: ARCHIVADOS ─── */}
        {navSection === 'archived' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#202C33] text-[#8696A0] flex items-center justify-center mx-auto mt-6">
              <Archive className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-sm text-[#E9EDEF]">Sin chats archivados</h3>
            <p className="text-xs text-[#8696A0]">Tus conversaciones cerradas o completadas se guardarán aquí.</p>
          </div>
        )}

      </div>

      {/* ======================================================== */}
      {/* 2. PANEL CENTRAL: CONVERSACIÓN DARK MODE EXACTA          */}
      {/* ======================================================== */}
      {activeChat ? (
        <div className="flex-1 flex flex-col bg-[#0B141A] relative overflow-hidden">
          
          {/* Cabecera del Chat Activo Dark Mode */}
          <div className="p-3 bg-[#202C33] border-b border-[#222E35] flex items-center justify-between shadow-md z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveChat(null)}
                className="md:hidden p-1.5 text-[#AEBAC1] hover:text-[#E9EDEF] rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="w-10 h-10 rounded-full bg-[#6B7C85] text-white flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {activeChat.avatarUrl ? (
                  <img 
                    src={getSafeAvatarUrl(activeChat.avatarUrl)} 
                    alt={activeChat.clientName} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span>{activeChat.clientName.charAt(0).toUpperCase()}</span>
                )}
              </div>

              <div>
                <h3 className="font-bold text-[#E9EDEF] text-sm leading-tight flex items-center gap-2">
                  <span>{activeChat.clientName}</span>
                  {activeChatOrders.length > 0 && (
                    <span className="bg-[#00A884]/20 text-[#00A884] text-[10px] font-bold px-2 py-0.2 rounded-full border border-[#00A884]/40">
                      {activeChatOrders.length} pedido(s)
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 text-[11px] text-[#8696A0]">
                  <span className="font-mono">+{activeChat.phone}</span>
                  <span>•</span>
                  <span className="text-[#00A884] font-medium">en línea</span>
                </div>
              </div>
            </div>

            {/* Acciones de Cabecera: Video, Llamada, Buscar, Modo Agente */}
            <div className="flex items-center gap-2">
              {/* Botón Videollamada */}
              <button
                type="button"
                onClick={() => handleInitiateCall({ name: activeChat.clientName, phone: activeChat.phone }, 'video')}
                className="p-2 text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#374248] rounded-full transition cursor-pointer"
                title="Videollamada con el cliente"
              >
                <Video className="w-5 h-5" />
              </button>

              {/* Botón Llamada Telefónica */}
              <button
                type="button"
                onClick={() => handleInitiateCall({ name: activeChat.clientName, phone: activeChat.phone }, 'voice')}
                className="p-2 text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#374248] rounded-full transition cursor-pointer"
                title="Llamar al cliente"
              >
                <Phone className="w-5 h-5" />
              </button>

              {/* Interruptor Modo Agente / Manual */}
              <button
                type="button"
                disabled={togglingAgent}
                onClick={async () => {
                  if (!activeChat) return;
                  const newMode = chatAgentMode === 'agent' ? 'manual' : 'agent';
                  setTogglingAgent(true);
                  try {
                    const res = await fetch('/api/admin/agent', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'toggle_chat_agent_mode',
                        chatId: activeChat.id,
                        agentMode: newMode,
                      }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      setChatAgentMode(newMode);
                      try { soundManager.triggerHaptic('light'); } catch {}
                    }
                  } catch (err) {
                    console.error('Error:', err);
                  } finally {
                    setTogglingAgent(false);
                  }
                }}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer ${
                  chatAgentMode === 'agent'
                    ? 'bg-[#00A884]/20 text-[#00A884] border-[#00A884]/40 hover:bg-[#00A884]/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                }`}
                title={chatAgentMode === 'agent' ? 'FoxBot IA activo respondiendo dudas' : 'Modo Manual activo'}
              >
                {chatAgentMode === 'agent' ? '🤖 Agente' : '👤 Manual'}
              </button>

              {/* Abrir en App Nativa */}
              <a
                href={`https://wa.me/${activeChat.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-[#AEBAC1] hover:text-[#E9EDEF] hover:bg-[#374248] rounded-full transition"
                title="Abrir en WhatsApp Web / Desktop"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Área de Mensajes con Fondo Doodles Oscuro Oficial WhatsApp */}
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-3 relative"
            style={{
              backgroundImage: `radial-gradient(#202C33 1px, transparent 1px)`,
              backgroundSize: '20px 20px',
              backgroundColor: '#0B141A'
            }}
          >
            {loadingMessages ? (
              <div className="h-full flex items-center justify-center">
                <div className="bg-[#202C33] p-4 rounded-2xl shadow text-center space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#00A884]" />
                  <p className="text-xs font-bold text-[#8696A0]">Cargando mensajes cifrados...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6">
                <div className="bg-[#202C33]/80 backdrop-blur-xs p-6 rounded-3xl max-w-sm shadow space-y-2 border border-[#222E35]">
                  <MessageSquare className="w-8 h-8 mx-auto text-[#00A884]" />
                  <h4 className="font-bold text-[#E9EDEF] text-sm">Comienza la conversación</h4>
                  <p className="text-xs text-[#8696A0]">
                    Escribe un mensaje o envía una plantilla para dar seguimiento a su pedido.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isAdmin = msg.sender === 'admin';

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isAdmin ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 relative text-xs leading-relaxed shadow-sm ${
                        isAdmin
                          ? 'bg-[#005C4B] text-[#E9EDEF] rounded-tr-none'
                          : 'bg-[#202C33] text-[#E9EDEF] rounded-tl-none'
                      }`}
                    >
                      {isAdmin && msg.senderName && (
                        <span className="block text-[10px] font-black text-[#53BDEB] mb-0.5">
                          ~ {msg.senderName} (Foxdrop)
                        </span>
                      )}

                      {/* Si es Sticker o Imagen */}
                      {(msg.mediaType === 'sticker' || msg.mediaUrl || msg.text?.includes('[Sticker')) ? (
                        <div className="py-1 flex flex-col items-center">
                          {msg.mediaUrl ? (
                            <img 
                              src={msg.mediaUrl} 
                              alt="Media WhatsApp" 
                              className="w-48 max-h-64 object-contain rounded-xl mx-auto"
                            />
                          ) : (
                            <div className="p-3 text-center">👾 [Sticker]</div>
                          )}
                          {msg.text && !msg.text.startsWith('[Sticker:') && msg.text !== '👾 [Sticker]' && (
                            <p className="whitespace-pre-wrap mt-1 font-medium">{msg.text}</p>
                          )}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}

                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#8696A0]">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isAdmin && (
                          <span>
                            {msg.status === 'read' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB] inline-block stroke-[2.5]" />
                            ) : msg.status === 'delivered' ? (
                              <CheckCheck className="w-3.5 h-3.5 text-[#8696A0] inline-block" />
                            ) : (
                              <Check className="w-3.5 h-3.5 text-[#8696A0] inline-block" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Plantillas Rápidas Dark */}
          <div className="bg-[#202C33] border-t border-[#222E35] px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold text-[#E9EDEF] no-scrollbar">
            <span className="text-[#8696A0] shrink-0 text-[10px] uppercase">Plantillas:</span>
            <button
              type="button"
              onClick={() => handleSendQuickTemplate(`¡Hola ${activeChat.clientName}! 🦊 Te confirmamos que tu pedido en FoxDrop ya está preparado. ¡Gracias por tu compra!`)}
              className="bg-[#111B21] hover:bg-[#2A3942] border border-[#222E35] px-2.5 py-1 rounded-lg shrink-0 transition text-[#E9EDEF]"
            >
              📦 Confirmar Pedido
            </button>
            <button
              type="button"
              onClick={() => handleSendQuickTemplate(`¡Hola ${activeChat.clientName}! Tu paquete ya va en camino con el repartidor. Te contactará al llegar a tu dirección 🚚`)}
              className="bg-[#111B21] hover:bg-[#2A3942] border border-[#222E35] px-2.5 py-1 rounded-lg shrink-0 transition text-[#E9EDEF]"
            >
              🚚 En Camino
            </button>
            <button
              type="button"
              onClick={() => handleSendQuickTemplate(`¡Hola! Con gusto te apoyamos. ¿En qué podemos ayudarte el día de hoy en FoxDrop?`)}
              className="bg-[#111B21] hover:bg-[#2A3942] border border-[#222E35] px-2.5 py-1 rounded-lg shrink-0 transition text-[#E9EDEF]"
            >
              👋 Saludo Soporte
            </button>
          </div>

          {/* Barra de Entrada / Input Dark Mode */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-[#202C33] border-t border-[#222E35] flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowStickerPicker(false);
              }}
              className="p-2 text-[#8696A0] hover:text-[#E9EDEF] rounded-full transition"
              title="Emojis"
            >
              <Smile className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowStickerPicker(!showStickerPicker);
                setShowEmojiPicker(false);
              }}
              className="p-2 text-[#8696A0] hover:text-[#E9EDEF] rounded-full transition"
              title="Stickers FoxDrop"
            >
              <span className="text-lg">🦊</span>
            </button>

            <input
              type="text"
              placeholder={`Escribe un mensaje como ${partnerName}...`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 bg-[#2A3942] border-none rounded-xl px-4 py-2.5 text-xs text-[#E9EDEF] placeholder-[#8696A0] focus:outline-none focus:ring-1 focus:ring-[#00A884]"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="p-2.5 bg-[#00A884] hover:bg-[#008f6f] disabled:opacity-40 text-[#111B21] rounded-full shadow transition"
              title="Enviar"
            >
              {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>

        </div>
      ) : (
        /* Pantalla Vacía Dark Mode */
        <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center bg-[#222E35] space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#111B21] text-[#00A884] flex items-center justify-center shadow-inner">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-lg font-bold text-[#E9EDEF]">
              WhatsApp Web FoxDrop Puebla
            </h3>
            <p className="text-xs text-[#8696A0]">
              Envía y recibe mensajes, revisa y sube historias de tus productos o realiza llamadas de seguimiento con tus clientes en tiempo real.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#111B21] text-[#00A884] px-4 py-2 rounded-full text-xs font-semibold border border-[#2A3942]">
            <ShieldCheck className="w-4 h-4" />
            <span>Cifrado y sincronizado en tiempo real con Supabase</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL VISOR DE HISTORIAS / STORIES                    */}
      {/* ======================================================== */}
      {activeStoryViewing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="relative max-w-sm w-full bg-[#111B21] rounded-3xl overflow-hidden shadow-2xl border border-[#222E35] flex flex-col h-[580px]">
            {/* Barra de progreso de la historia */}
            <div className="p-3 bg-gradient-to-b from-black/80 to-transparent absolute top-0 inset-x-0 z-20 space-y-2">
              <div className="w-full bg-white/30 h-1 rounded-full overflow-hidden">
                <div className="bg-white h-full w-full animate-[progress_5s_linear]"></div>
              </div>

              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#00A884] text-[#111B21] flex items-center justify-center font-bold text-xs">
                    {activeStoryViewing.authorName.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold leading-tight">{activeStoryViewing.authorName}</h4>
                    <span className="text-[10px] text-white/70">{activeStoryViewing.createdAt}</span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveStoryViewing(null)}
                  className="p-1 text-white/80 hover:text-white rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Imagen del Estado */}
            <div className="flex-1 flex items-center justify-center bg-black">
              <img
                src={activeStoryViewing.mediaUrl}
                alt="Story"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Pie de foto del Estado */}
            {activeStoryViewing.caption && (
              <div className="p-4 bg-gradient-to-t from-black/90 to-transparent absolute bottom-0 inset-x-0 text-center text-white text-xs font-medium">
                {activeStoryViewing.caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MODAL SUBIR NUEVO ESTADO / HISTORIA DE FOXDROP        */}
      {/* ======================================================== */}
      {showAddStoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-[#111B21] border border-[#222E35] rounded-3xl max-w-md w-full p-6 text-[#E9EDEF] space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222E35] pb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <CircleDot className="w-5 h-5 text-[#00A884]" />
                <span>Subir Estado a WhatsApp</span>
              </h3>
              <button onClick={() => setShowAddStoryModal(false)} className="text-[#8696A0] hover:text-[#E9EDEF]">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#8696A0] font-bold block mb-1">Imagen o Flyer del Estado:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStoryMediaUrl}
                    onChange={e => setNewStoryMediaUrl(e.target.value)}
                    placeholder="URL de imagen o sube un archivo..."
                    className="flex-1 bg-[#202C33] border border-[#222E35] rounded-xl px-3 py-2 text-xs text-[#E9EDEF] focus:outline-none focus:border-[#00A884]"
                  />
                  <button
                    type="button"
                    onClick={() => storyFileInputRef.current?.click()}
                    className="px-3 py-2 bg-[#202C33] hover:bg-[#2A3942] rounded-xl text-xs font-bold border border-[#222E35] flex items-center gap-1 text-[#00A884]"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Subir</span>
                  </button>
                  <input
                    ref={storyFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleStoryFileUpload}
                  />
                </div>
              </div>

              {newStoryMediaUrl && (
                <div className="w-full h-40 bg-black/50 rounded-2xl overflow-hidden border border-[#222E35] flex items-center justify-center">
                  <img src={newStoryMediaUrl} alt="Preview" className="w-full h-full object-contain" />
                </div>
              )}

              <div>
                <label className="text-[#8696A0] font-bold block mb-1">Texto o Pie de foto (Opcional):</label>
                <input
                  type="text"
                  value={newStoryCaption}
                  onChange={e => setNewStoryCaption(e.target.value)}
                  placeholder="Ej: 🔥 ¡Solo por hoy 20% OFF en Smartwatches! Escríbenos..."
                  className="w-full bg-[#202C33] border border-[#222E35] rounded-xl px-3 py-2 text-xs text-[#E9EDEF] focus:outline-none focus:border-[#00A884]"
                />
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddStoryModal(false)}
                  className="flex-1 py-2.5 bg-[#202C33] text-[#8696A0] hover:text-[#E9EDEF] rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={uploadingStory || !newStoryMediaUrl.trim()}
                  onClick={handlePublishStory}
                  className="flex-1 py-2.5 bg-[#00A884] hover:bg-[#008f6f] disabled:opacity-40 text-[#111B21] font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  {uploadingStory ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Publicar Estado</span>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. MODAL DE LLAMADA EN VIVO A CLIENTE                   */}
      {/* ======================================================== */}
      {callingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-[#111B21] border border-[#222E35] rounded-3xl max-w-sm w-full p-6 text-center space-y-5 shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-[#202C33] text-[#00A884] border-4 border-[#00A884]/30 flex items-center justify-center font-bold text-2xl mx-auto animate-pulse">
              {callingModal.callType === 'video' ? <Video className="w-9 h-9" /> : <Phone className="w-9 h-9" />}
            </div>

            <div>
              <h3 className="font-extrabold text-base text-[#E9EDEF]">{callingModal.clientName}</h3>
              <p className="text-xs text-[#8696A0] font-mono mt-0.5">+{callingModal.phone}</p>
              <span className="inline-block mt-2 text-[11px] font-bold text-[#00A884] animate-pulse">
                {callingModal.callType === 'video' ? 'Iniciando Videollamada...' : 'Llamando por WhatsApp...'}
              </span>
            </div>

            <div className="bg-[#202C33] p-3 rounded-2xl text-xs text-[#8696A0] leading-relaxed">
              Puedes atender desde tu celular vinculado o abrir la llamada directa en tu equipo con 1 clic:
            </div>

            <div className="flex gap-2">
              <a
                href={`tel:+${callingModal.phone}`}
                className="flex-1 py-2.5 bg-[#202C33] hover:bg-[#2A3942] text-[#E9EDEF] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Llamar Celular</span>
              </a>
              <a
                href={`https://wa.me/${callingModal.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2.5 bg-[#00A884] hover:bg-[#008f6f] text-[#111B21] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>WhatsApp App</span>
              </a>
            </div>

            <button
              onClick={() => setCallingModal(null)}
              className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 font-bold rounded-xl text-xs"
            >
              Finalizar
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. MODAL: CONFIGURACIÓN DE PERFIL DE WHATSAPP FOXDROP    */}
      {/* ======================================================== */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#111B21] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-[#222E35] relative space-y-5 text-[#E9EDEF]">
            <div className="flex items-center justify-between border-b border-[#222E35] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00A884]/20 text-[#00A884] flex items-center justify-center font-black">
                  🦊
                </div>
                <div>
                  <h3 className="font-extrabold text-[#E9EDEF] text-sm">Perfil de WhatsApp FoxDrop</h3>
                  <p className="text-[11px] text-[#8696A0]">Foto de perfil y estado visible en WhatsApp</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 text-[#8696A0] hover:text-[#E9EDEF] rounded-xl hover:bg-[#202C33] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingProfile ? (
              <div className="py-12 text-center text-[#8696A0] space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#00A884]" />
                <p className="text-xs font-bold">Consultando perfil con WhatsApp...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {profileMessage && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-bold flex flex-col gap-1.5 ${
                      profileMessage.type === 'success'
                        ? 'bg-[#00A884]/20 text-[#00A884] border border-[#00A884]/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    <span>{profileMessage.text}</span>
                  </div>
                )}

                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-[#202C33] border-4 border-[#00A884]/30 shadow-md overflow-hidden flex items-center justify-center text-white font-black text-2xl">
                      {myProfile?.avatarUrl ? (
                        <img
                          src={getSafeAvatarUrl(myProfile.avatarUrl)}
                          alt="Foxdrop"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FOX_LOGO_BASE64 || "/fox-logo-head-3d.png";
                          }}
                        />
                      ) : (
                        <img
                          src={FOX_LOGO_BASE64 || "/fox-logo-head-3d.png"}
                          alt="Foxdrop"
                          className="w-14 h-14 object-contain"
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={savingProfile}
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-[#00A884] hover:bg-[#008f6f] text-[#111B21] rounded-full shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer"
                      title="Cambiar foto de perfil"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleUploadProfilePicture}
                    />
                  </div>

                  <div>
                    <h4 className="font-extrabold text-[#E9EDEF] text-sm">
                      {myProfile?.name || 'FoxDrop Oficial'}
                    </h4>
                    <p className="text-[11px] font-mono text-[#8696A0]">
                      +{myProfile?.phone || 'WhatsApp Vinculado'}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-[#222E35]">
                  <label className="text-xs font-bold text-[#8696A0] block">
                    Info / Estado de WhatsApp (Bio)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={139}
                      value={newStatusInput}
                      onChange={e => setNewStatusInput(e.target.value)}
                      placeholder="Ej: Tienda en línea oficial • Envíos a todo México"
                      className="flex-1 bg-[#202C33] border border-[#222E35] rounded-xl px-3.5 py-2.5 text-xs text-[#E9EDEF] focus:outline-none focus:border-[#00A884]"
                    />
                    <button
                      type="button"
                      disabled={savingProfile || !newStatusInput.trim()}
                      onClick={handleUpdateStatus}
                      className="bg-[#00A884] hover:bg-[#008f6f] disabled:opacity-40 text-[#111B21] px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      {savingProfile ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
