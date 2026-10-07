'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, Send, Search, Phone, User, Check, CheckCheck, 
  Clock, RefreshCw, ShoppingBag, AlertCircle, ArrowLeft,
  Sparkles, ExternalLink, ShieldCheck, Flame, Tag, Truck
} from 'lucide-react';
import { WhatsAppChat, WhatsAppMessage, Order, ClientProfile } from '@/types';
import { 
  getWhatsAppChats, getWhatsAppMessages, sendWhatsAppMessageFromAdmin, 
  markChatAsRead 
} from '@/lib/whatsappChat';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { soundManager } from '@/lib/sounds';

interface AdminWhatsAppTabProps {
  orders: Order[];
  clients: ClientProfile[];
  adminSessionName?: string; // Nombre del socio actual (ej: 'Mario' o 'Socio')
}

export default function AdminWhatsAppTab({ orders, clients, adminSessionName }: AdminWhatsAppTabProps) {
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [activeChat, setActiveChat] = useState<WhatsAppChat | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [partnerName, setPartnerName] = useState(adminSessionName || 'Mario');

  // Filtros rápidos
  const [chatFilter, setChatFilter] = useState<'all' | 'unread' | 'with_orders'>('all');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll al final del chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar lista de chats inicial
  const loadChats = async () => {
    setLoadingChats(true);
    const data = await getWhatsAppChats();
    setChats(data);
    setLoadingChats(false);
  };

  useEffect(() => {
    loadChats();
  }, []);

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
            
            // Si el mensaje es del chat actualmente abierto, anexarlo
            if (activeChat && newMsg.chat_id === activeChat.id) {
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

            // Si es un mensaje entrante de un cliente, reproducir sonido de alerta
            if (newMsg.sender === 'client') {
              try { soundManager.playStatusUpdated(); } catch {}
            }

            // Recargar la lista de chats para actualizar el último mensaje y contadores
            loadChats();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'whatsapp_chats' },
        () => {
          loadChats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
        setMessages(prev => [...prev, result.message!]);
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
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row h-[750px] max-h-[82vh] relative">
      
      {/* ======================================================== */}
      {/* 1. PANEL IZQUIERDO: LISTA DE CHATS & BANDEJA */}
      {/* ======================================================== */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50 shrink-0 ${
        activeChat ? 'hidden md:flex' : 'flex'
      }`}>
        {/* Cabecera de Bandeja */}
        <div className="p-4 border-b border-slate-200 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-sm leading-tight flex items-center gap-1.5">
                  <span>WhatsApp FoxDrop</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Conectado y sincronizado"></span>
                </h3>
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Bandeja Multi-Socio
                </span>
              </div>
            </div>

            <button
              onClick={loadChats}
              disabled={loadingChats}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
              title="Recargar conversaciones"
            >
              <RefreshCw className={`w-4 h-4 ${loadingChats ? 'animate-spin text-[#E65F2B]' : ''}`} />
            </button>
          </div>

          {/* Selector de Socio que responde */}
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-xl text-xs font-bold text-slate-700">
            <span className="text-[10px] text-slate-400 px-1">Atendiendo como:</span>
            <div className="flex gap-1 flex-1">
              <button
                type="button"
                onClick={() => setPartnerName('Mario')}
                className={`flex-1 py-1 rounded-lg text-center transition ${
                  partnerName === 'Mario' 
                    ? 'bg-[#E65F2B] text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                Mario
              </button>
              <button
                type="button"
                onClick={() => setPartnerName('Socio')}
                className={`flex-1 py-1 rounded-lg text-center transition ${
                  partnerName === 'Socio' 
                    ? 'bg-[#E65F2B] text-white shadow-xs' 
                    : 'bg-white text-slate-600 hover:text-slate-900'
                }`}
              >
                Socio
              </button>
            </div>
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
                  <div className="w-11 h-11 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-black text-sm shrink-0 border border-slate-300 relative">
                    {chat.clientName.charAt(0).toUpperCase()}
                    {hasOrder && (
                      <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-[#DF7F2D] text-white rounded-full flex items-center justify-center text-[9px]" title="Tiene pedidos en FoxDrop">
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

              <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                {activeChat.clientName.charAt(0).toUpperCase()}
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
            <div className="flex items-center gap-2">
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
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}
                  >
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
                          ✍️ {msg.senderName} (FoxDrop)
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

    </div>
  );
}
