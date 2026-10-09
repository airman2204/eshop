/**
 * ============================================================================
 * FOXDROP — GESTOR DE WHATSAPP MULTI-SOCIO & MENSAJERÍA
 * ============================================================================
 * Permite a los administradores / socios leer, enviar y sincronizar chats
 * de WhatsApp en tiempo real sin pasar por Meta.
 */

import { createServerClient } from './supabase/server';
import { getSupabaseBrowserClient } from './supabase/client';
import { WhatsAppChat, WhatsAppMessage } from '@/types';
import { formatPhoneNumber } from './whatsapp';

/**
 * Obtener todas las conversaciones de WhatsApp ordenadas por última interacción
 */
export async function getWhatsAppChats(): Promise<WhatsAppChat[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error }: any = await (supabase as any)
      .from('whatsapp_chats')
      .select('*')
      .neq('status', 'archived')
      .not('phone', 'like', '_system_%')
      .order('last_message_time', { ascending: false });

    if (error) {
      console.warn('Advertencia consultando whatsapp_chats:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      phone: row.phone,
      clientName: row.client_name || 'Cliente',
      lastMessage: row.last_message || '',
      lastMessageTime: row.last_message_time || row.created_at,
      unreadCount: row.unread_count || 0,
      avatarUrl: row.avatar_url,
      status: row.status || 'active',
      clientProfileId: row.client_profile_id,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('Error al obtener chats de WhatsApp:', err);
    return [];
  }
}

/**
 * Obtener el historial de mensajes de un chat específico
 */
export async function getWhatsAppMessages(chatId: string): Promise<WhatsAppMessage[]> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { data, error }: any = await (supabase as any)
      .from('whatsapp_messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (error) {
      console.warn('Advertencia consultando whatsapp_messages:', error.message);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      chatId: row.chat_id,
      phone: row.phone,
      sender: row.sender,
      senderName: row.sender_name,
      text: row.text,
      status: row.status || 'sent',
      mediaUrl: row.media_url,
      mediaType: row.media_type,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error('Error al obtener mensajes de WhatsApp:', err);
    return [];
  }
}

/**
 * Enviar un mensaje desde el panel de administración (por parte de Mario o su socio)
 */
export async function sendWhatsAppMessageFromAdmin(params: {
  chatId?: string;
  phone: string;
  clientName?: string;
  senderName: string; // Ej: 'Mario' o 'Socio'
  text: string;
}): Promise<{ success: boolean; message?: WhatsAppMessage; error?: string }> {
  try {
    const cleanPhone = formatPhoneNumber(params.phone);
    const supabase = getSupabaseBrowserClient();

    // 1. Obtener o crear el chat
    let chatId = params.chatId;
    if (!chatId || chatId.startsWith('temp-')) {
      const { data: existingChat }: any = await (supabase as any)
        .from('whatsapp_chats')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (existingChat?.id) {
        chatId = existingChat.id;
      } else {
        const { data: newChat, error: newChatErr }: any = await (supabase as any)
          .from('whatsapp_chats')
          .insert({
            phone: cleanPhone,
            client_name: params.clientName || 'Cliente WhatsApp',
            last_message: params.text,
            last_message_time: new Date().toISOString(),
            unread_count: 0,
            status: 'active',
          })
          .select('id')
          .single();

        if (newChatErr) throw newChatErr;
        chatId = newChat.id;
      }
    }

    // 2. Insertar el mensaje
    const { data: insertedMsg, error: msgErr }: any = await (supabase as any)
      .from('whatsapp_messages')
      .insert({
        chat_id: chatId,
        phone: cleanPhone,
        sender: 'admin',
        sender_name: params.senderName,
        text: params.text,
        status: 'sent',
      })
      .select('*')
      .single();

    if (msgErr) throw msgErr;

    // 3. Actualizar último mensaje del chat
    await (supabase as any)
      .from('whatsapp_chats')
      .update({
        last_message: params.text,
        last_message_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', chatId);

    // 4. Despachar al bridge de WhatsApp
    let deliveredToPhone = false;
    let targetToSend = cleanPhone;

    // Verificar si el chat tiene un LID registrado para despachar sin error de cifrado
    try {
      const { data: chatRow }: any = await (supabase as any)
        .from('whatsapp_chats')
        .select('notes')
        .eq('id', chatId)
        .maybeSingle();

      if (chatRow?.notes) {
        const parsed = typeof chatRow.notes === 'string' ? JSON.parse(chatRow.notes) : chatRow.notes;
        if (parsed?.lid) {
          targetToSend = `${parsed.lid}@lid`;
        }
      }
    } catch {}

    // Si no es LID, formatear para México
    if (!targetToSend.includes('@lid')) {
      const digitsOnly = cleanPhone.replace(/\D/g, "");
      if (digitsOnly.startsWith("52") && digitsOnly.length === 12 && !digitsOnly.startsWith("521")) {
        targetToSend = `521${digitsOnly.slice(2)}`;
      }
    }

    // Intento 1: A través de la API route interna
    try {
      const bridgeRes = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          text: params.text,
          senderName: params.senderName,
          chatId,
        }),
      });
      const bridgeResult = await bridgeRes.json();
      if (bridgeRes.ok && (bridgeResult.success || bridgeResult.bridgeData?.success)) {
        if (bridgeResult.bridgeData?.success) {
          deliveredToPhone = true;
        }
      }
    } catch (bridgeErr) {
      console.warn('Fallo ruta interna /api/whatsapp/send:', bridgeErr);
    }

    // Intento 2: Si el servidor de Next.js no despachó al bridge físico, despachar directamente desde el navegador al bridge en Render
    if (!deliveredToPhone) {
      try {
        const directBridgeRes = await fetch('https://foxdrop-whatsapp-bridge.onrender.com/message/sendText', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'apikey': 'foxdrop_secret_2026',
            'Authorization': 'Bearer foxdrop_secret_2026'
          },
          body: JSON.stringify({
            number: targetToSend,
            text: params.text,
          }),
        });
        const directData = await directBridgeRes.json();
        if (directData.success) {
          deliveredToPhone = true;
        }
      } catch (directErr: any) {
        console.warn('Fallo envío directo al bridge:', directErr.message);
      }
    }

    return {
      success: true,
      message: {
        id: insertedMsg.id,
        chatId: insertedMsg.chat_id,
        phone: insertedMsg.phone,
        sender: insertedMsg.sender,
        senderName: insertedMsg.sender_name,
        text: insertedMsg.text,
        status: insertedMsg.status,
        createdAt: insertedMsg.created_at,
      },
    };
  } catch (error: any) {
    console.error('Error enviando mensaje WhatsApp:', error);
    return { success: false, error: error.message || 'Error al enviar mensaje' };
  }
}

/**
 * Marcar mensajes como leídos
 */
export async function markChatAsRead(chatId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseBrowserClient();
    const { error } = await (supabase as any)
      .from('whatsapp_chats')
      .update({ unread_count: 0 })
      .eq('id', chatId);

    return !error;
  } catch {
    return false;
  }
}
