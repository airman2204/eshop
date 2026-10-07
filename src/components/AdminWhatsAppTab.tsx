'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Search, Phone, User, Check, CheckCheck, 
  Clock, RefreshCw, ShoppingBag, AlertCircle, ArrowLeft,
  Sparkles, ExternalLink, ShieldCheck, Flame, Tag, Truck,
  Maximize2, Minimize2, Bell, BellRing, Volume2, X, Camera, Settings
} from 'lucide-react';
import { WhatsAppChat, WhatsAppMessage, Order, ClientProfile } from '@/types';
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
}

// Helper para evitar bloqueos de referrer o CDN en fotos de WhatsApp
function getSafeAvatarUrl(url?: string): string {
  if (!url) return '';
  if (url.includes('pps.whatsapp.net') || url.includes('fbcdn.net')) {
    return `/api/whatsapp/image-proxy?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export default function AdminWhatsAppTab({ orders, clients, adminSessionName, initialPhone, initialMessage }: AdminWhatsAppTabProps) {
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
    setActiveChat(chat);
    setLoadingMessages(true);
    const msgs = await getWhatsAppMessages(chat.id);
    setMessages(msgs);
    setLoadingMessages(false);

    if (chat.unreadCount > 0) {
      markChatAsRead(chat.id);
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c));
    }
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
    
    // Si viene initialPhone, buscar o seleccionar ese chat específicamente
    if (initialPhone) {
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

    const channel = supabase
      .channel('whatsapp_realtime_changes')
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
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_chats' },
        () => {
          loadChats(false);
        }
      )
      .subscribe();

    // Polling ligero cada 8 segundos para asegurar sincronización en celulares si el WebSocket se pausa en background
    const pollInterval = setInterval(() => {
      loadChats(false);
      const currentActive = activeChatRef.current;
      if (currentActive) {
        getWhatsAppMessages(currentActive.id).then(msgs => {
          setMessages(prev => {
            if (msgs.length > prev.length) return msgs;
            return prev;
          });
        });
      }
    }, 8000);

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
    <div className={`bg-white transition-all duration-300 flex flex-col md:flex-row relative w-full ${
      isFullscreen 
        ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' 
        : 'rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden h-[calc(100vh-130px)] min-h-[620px]'
    }`}>
      
      {/* ======================================================== */}
      {/* 1. PANEL IZQUIERDO: LISTA DE CHATS & BANDEJA */}
      {/* ======================================================== */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0 ${
        activeChat ? 'hidden md:flex' : 'flex h-full'
      }`}>
        {/* Cabecera de Bandeja */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Logo oficial FoxDrop (foto vinculada en WhatsApp o logo corporativo Fox) */}
              <div 
                onClick={() => {
                  setShowProfileModal(true);
                  fetchMyProfile();
                }}
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#0F3E36] to-emerald-900 text-white flex items-center justify-center shadow-sm overflow-hidden shrink-0 border border-emerald-700/50 cursor-pointer hover:opacity-90 transition relative group"
                title="Ver/cambiar perfil de WhatsApp Foxdrop"
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
                    className="w-7 h-7 object-contain drop-shadow"
                  />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                  <Camera className="w-3.5 h-3.5 text-white" />
                </div>
              </div>

              <div>
                <h3 className="font-black text-slate-900 text-base leading-tight flex items-center gap-1.5">
                  <span>Foxdrop</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="WhatsApp Conectado"></span>
                </h3>
                <span className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider block">
                  Bandeja Mario & Nydia
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Botón de Activar / Probar Notificaciones de Navegador/Celular */}
              <button
                type="button"
                onClick={() => {
                  if (notificationPermission === 'granted') {
                    soundManager.playWhatsAppPop();
                    try {
                      new Notification('🦊 Prueba de Alerta FoxDrop', {
                        body: '¡El sonido y la alerta en vivo funcionan correctamente!',
                        icon: '/favicon.ico',
                      });
                    } catch {}
                  } else {
                    requestNotificationPermission();
                  }
                }}
                className={`p-2 rounded-xl transition ${
                  notificationPermission === 'granted'
                    ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100 animate-pulse'
                }`}
                title={notificationPermission === 'granted' ? 'Notificaciones activas (clic para probar sonido)' : 'Toca para permitir alertas sonoras al recibir mensajes'}
              >
                {notificationPermission === 'granted' ? (
                  <Bell className="w-4 h-4 text-emerald-600" />
                ) : (
                  <BellRing className="w-4 h-4 text-amber-600" />
                )}
              </button>

              {/* Botón Recargar */}
              <button
                type="button"
                onClick={() => loadChats(true)}
                disabled={loadingChats}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                title="Recargar conversaciones"
              >
                <RefreshCw className={`w-4 h-4 ${loadingChats ? 'animate-spin text-[#E65F2B]' : ''}`} />
              </button>

              {/* Botón Perfil de WhatsApp FoxDrop */}
              <button
                type="button"
                onClick={() => {
                  setShowProfileModal(true);
                  fetchMyProfile();
                }}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                title="Configurar Perfil de WhatsApp (Foto y Estado)"
              >
                <Settings className="w-4 h-4 text-emerald-700" />
              </button>

              {/* Botón Pantalla Completa */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Expandir a pantalla completa'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-[#E65F2B]" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Banner de permiso de notificación si aún no lo ha otorgado */}
          {notificationPermission !== 'granted' && (
            <div 
              onClick={requestNotificationPermission}
              className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-amber-100/70 transition"
            >
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-amber-700 shrink-0" />
                <span className="text-[11px] font-bold text-amber-900 leading-tight">
                  Toca aquí para que suene tu cel al entrar mensajes
                </span>
              </div>
              <span className="text-[10px] bg-amber-700 text-white font-extrabold px-2 py-0.5 rounded-lg shrink-0">
                Activar
              </span>
            </div>
          )}

          {/* Indicador de Socio que responde: Automático según la sesión activa */}
          <div className="flex items-center justify-between bg-slate-100/90 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-bold text-slate-700">
            <span className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Respondiendo como:</span>
            </span>
            <span className="bg-[#E65F2B] text-white px-2.5 py-0.5 rounded-lg text-xs font-black shadow-2xs flex items-center gap-1">
              <span>👤</span>
              <span>{partnerName}</span>
            </span>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar cliente, teléfono o mensaje..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Filtros rápidos de bandeja */}
          <div className="flex gap-1 text-[11px] font-bold">
            <button
              onClick={() => setChatFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                chatFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({chats.length})
            </button>
            <button
              onClick={() => setChatFilter('unread')}
              className={`px-2.5 py-1 rounded-lg transition ${
                chatFilter === 'unread' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              No leídos ({chats.filter(c => c.unreadCount > 0).length})
            </button>
            <button
              onClick={() => setChatFilter('with_orders')}
              className={`px-2.5 py-1 rounded-lg transition ${
                chatFilter === 'with_orders' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Con Pedidos
            </button>
          </div>
        </div>

        {/* Lista de Chats con Scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {loadingChats ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#E65F2B]" />
              <p className="text-xs font-bold">Sincronizando chats con Supabase...</p>
            </div>
          ) : filteredChats.length === 0 ? (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs font-bold">No hay chats que coincidan</p>
              <p className="text-[11px]">Cuando un cliente envíe un mensaje o hagas una venta por WhatsApp aparecerá aquí.</p>
            </div>
          ) : (
            filteredChats.map((chat) => {
              const isSelected = activeChat?.id === chat.id;
              const hasOrder = orders.some(o => o.clientPhone.replace(/\D/g, '').endsWith(chat.phone.replace(/\D/g, '').slice(-10)));

              return (
                <div
                  key={chat.id}
                  onClick={() => handleSelectChat(chat)}
                  className={`p-3.5 flex items-start gap-3 cursor-pointer transition relative ${
                    isSelected 
                      ? 'bg-emerald-50/70 border-l-4 border-emerald-600' 
                      : 'hover:bg-slate-100/80 bg-white'
                  }`}
                >
                  {/* Avatar con inicial o foto */}
                  <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-sm shrink-0 border border-slate-300 relative overflow-hidden">
                    {chat.avatarUrl ? (
                      <img 
                        src={getSafeAvatarUrl(chat.avatarUrl)} 
                        alt={chat.clientName} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <span>{chat.clientName.charAt(0).toUpperCase()}</span>
                    )}
                    {hasOrder && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#DF7F2D] text-white rounded-full flex items-center justify-center text-[9px] z-10" title="Tiene pedidos en FoxDrop">
                        🛍️
                      </span>
                    )}
                  </div>

                  {/* Datos del Chat */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <h4 className="font-extrabold text-slate-900 text-xs truncate">
                        {chat.clientName}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                        {chat.lastMessageTime ? new Date(chat.lastMessageTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 truncate mb-1">
                      {chat.lastMessage || 'Conversación iniciada'}
                    </p>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                        +{chat.phone}
                      </span>
                    </div>
                  </div>

                  {/* Badge de mensajes no leídos */}
                  {chat.unreadCount > 0 && (
                    <span className="bg-[#E65F2B] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full shrink-0 shadow-xs animate-pulse">
                      {chat.unreadCount}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PANEL CENTRAL & DERECHO: CONVERSACIÓN ESTILO WHATSAPP WEB */}
      {/* ======================================================== */}
      {activeChat ? (
        <div className="flex-1 flex flex-col bg-[#EFEAE2] relative overflow-hidden">
          
          {/* Cabecera del Chat Activo */}
          <div className="p-3 sm:p-4 bg-white border-b border-slate-200 flex items-center justify-between shadow-xs z-10">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveChat(null)}
                className="md:hidden p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs overflow-hidden">
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
                <h3 className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-2">
                  <span>{activeChat.clientName}</span>
                  {activeChatOrders.length > 0 && (
                    <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.2 rounded-full border border-amber-300">
                      {activeChatOrders.length} pedido(s)
                    </span>
                  )}
                </h3>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-mono">+{activeChat.phone}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    WhatsApp Activo
                  </span>
                </div>
              </div>
            </div>

            {/* Acciones de la cabecera */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
                title={isFullscreen ? 'Salir de pantalla completa' : 'Expandir a pantalla completa'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-[#E65F2B]" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </button>

              <a
                href={`https://wa.me/${activeChat.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1.5"
                title="Abrir en WhatsApp Web / Celular"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Abrir en App</span>
              </a>
            </div>
          </div>

          {/* Contenedor de Mensajes con Fondo Patrón Clásico */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#EFEAE2] relative">
            {loadingMessages ? (
              <div className="h-full flex items-center justify-center">
                <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-sm text-center space-y-2">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-[#E65F2B]" />
                  <p className="text-xs font-bold text-slate-600">Cargando mensajes del cliente...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center p-6">
                <div className="bg-white/90 backdrop-blur-sm p-6 rounded-3xl max-w-sm shadow-sm space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-emerald-600" />
                  <h4 className="font-extrabold text-slate-800 text-sm">Comienza la conversación</h4>
                  <p className="text-xs text-slate-500">
                    Escribe un mensaje abajo o usa las plantillas rápidas para enviar una notificación de compra o seguimiento.
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
                    {/* Avatar del cliente a la izquierda si el mensaje es del cliente */}
                    {!isAdmin && (
                      <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden mb-1 border border-slate-300">
                        {activeChat.avatarUrl ? (
                          <img
                            src={getSafeAvatarUrl(activeChat.avatarUrl)}
                            alt=""
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>{activeChat.clientName.charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 shadow-xs relative text-xs leading-relaxed ${
                        isAdmin
                          ? 'bg-[#D9FDD3] text-slate-900 rounded-tr-none'
                          : 'bg-white text-slate-900 rounded-tl-none border border-slate-200'
                      }`}
                    >
                      {/* Remitente interno si es del equipo */}
                      {isAdmin && msg.senderName && (
                        <span className="block text-[10px] font-black text-emerald-800 mb-0.5">
                          ✍️ {msg.senderName} (Foxdrop)
                        </span>
                      )}

                      <p className="whitespace-pre-wrap">{msg.text}</p>

                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400">
                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isAdmin && (
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                      </div>
                    </div>

                    {/* Avatar de FoxDrop a la derecha si el mensaje es de FoxDrop */}
                    {isAdmin && (
                      <div className="w-7 h-7 rounded-full bg-[#0F3E36] text-white flex items-center justify-center font-bold text-[11px] shrink-0 overflow-hidden mb-1 border border-emerald-600 shadow-2xs">
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
                            className="w-5 h-5 object-contain"
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Plantillas Rápidas con 1 Clic */}
          <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 flex items-center gap-1.5 overflow-x-auto text-[11px] font-bold text-slate-700 scrollbar-none">
            <span className="text-slate-400 shrink-0 text-[10px] uppercase">Plantillas:</span>
            <button
              type="button"
              onClick={() => handleSendQuickTemplate(`¡Hola ${activeChat.clientName}! 🦊 Te confirmamos que tu pedido en FoxDrop ya está siendo preparado para entrega. ¡Gracias por tu compra!`)}
              className="bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 transition text-slate-700 cursor-pointer"
            >
              📦 Confirmar Pedido
            </button>
            <button
              type="button"
              onClick={() => handleSendQuickTemplate(`¡Hola ${activeChat.clientName}! Tu paquete ya va en camino con el repartidor. Te contactará al llegar a tu dirección 🚚`)}
              className="bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 transition text-slate-700 cursor-pointer"
            >
              🚚 En Camino
            </button>
            <button
              type="button"
              onClick={() => handleSendQuickTemplate(`¡Hola ${activeChat.clientName}! Vimos que dejaste artículos en tu carrito en FoxDrop. ¡Usa el cupón FOX5 para obtener 5% de descuento en tu compra hoy! 🦊`)}
              className="bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 transition text-slate-700 cursor-pointer"
            >
              🔥 Cupón Carrito
            </button>
            <button
              type="button"
              onClick={() => handleSendQuickTemplate(`¡Hola! Con gusto te apoyamos. ¿En qué podemos ayudarte el día de hoy en FoxDrop?`)}
              className="bg-white hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg shrink-0 transition text-slate-700 cursor-pointer"
            >
              👋 Saludo Soporte
            </button>
          </div>

          {/* Input para Escribir y Enviar */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              placeholder={`Escribe un mensaje como ${partnerName}...`}
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              className="flex-1 bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
            />

            <button
              type="submit"
              disabled={!inputText.trim() || sending}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white p-3 rounded-2xl shadow-sm transition active:scale-95 cursor-pointer shrink-0"
              title="Enviar mensaje"
            >
              {sending ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>

        </div>
      ) : (
        /* Pantalla Vacía si no hay chat seleccionado en desktop */
        <div className="flex-1 hidden md:flex flex-col items-center justify-center p-8 text-center bg-slate-50 space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
            <MessageSquare className="w-8 h-8" />
          </div>
          <div className="max-w-md space-y-1">
            <h3 className="text-base font-extrabold text-slate-900">
              WhatsApp Central FoxDrop
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Selecciona una conversación del panel izquierdo para leer mensajes, responder dudas en vivo o enviar confirmaciones de compra junto con tu socio.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-2xl text-xs font-bold">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Sincronizado en tiempo real con Supabase Realtime</span>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL: CONFIGURACIÓN DE PERFIL DE WHATSAPP FOXDROP    */}
      {/* ======================================================== */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative space-y-5">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                  🦊
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">Perfil de WhatsApp FoxDrop</h3>
                  <p className="text-[11px] text-slate-400">Personaliza la foto y estado visible para tus clientes</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingProfile ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-[#E65F2B]" />
                <p className="text-xs font-bold">Consultando perfil con WhatsApp...</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Alerta de Éxito o Error con opción de reconectar QR */}
                {profileMessage && (
                  <div
                    className={`p-3 rounded-2xl text-xs font-bold flex flex-col gap-1.5 ${
                      profileMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-50 text-amber-900 border border-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{profileMessage.type === 'success' ? '✅' : '📱'}</span>
                      <span>{profileMessage.text}</span>
                    </div>
                    {profileMessage.type === 'error' && (
                      <a
                        href="https://foxdrop-whatsapp-bridge.onrender.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#E65F2B] hover:underline self-start mt-0.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Abrir y escanear Código QR en el puente de WhatsApp</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Foto de Perfil Actual y Botón Cambiar */}
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full bg-slate-200 border-4 border-emerald-100 shadow-md overflow-hidden flex items-center justify-center text-slate-600 font-black text-2xl">
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
                      className="absolute bottom-0 right-0 p-2 bg-[#E65F2B] hover:bg-[#d45322] text-white rounded-full shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer"
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
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      {myProfile?.name || 'FoxDrop Oficial'}
                    </h4>
                    <p className="text-[11px] font-mono text-slate-400">
                      +{myProfile?.phone || 'WhatsApp Vinculado'}
                    </p>
                  </div>

                  <p className="text-[11px] text-slate-400">
                    Toca el icono de la cámara para seleccionar una imagen desde tu computadora o celular.
                  </p>
                </div>

                {/* Editar Estado / Info de WhatsApp */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-700 block">
                    Info / Estado de WhatsApp (Bio)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={139}
                      value={newStatusInput}
                      onChange={e => setNewStatusInput(e.target.value)}
                      placeholder="Ej: Tienda en línea oficial • Envíos a todo México"
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-600 focus:bg-white transition"
                    />
                    <button
                      type="button"
                      disabled={savingProfile || !newStatusInput.trim()}
                      onClick={handleUpdateStatus}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition cursor-pointer"
                    >
                      {savingProfile ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-3 text-[11px] text-slate-500 leading-relaxed border border-slate-100">
                  💡 <strong>Tip:</strong> Los cambios se sincronizan al instante en la red oficial de WhatsApp y serán visibles para todos tus clientes.
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
