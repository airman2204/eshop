'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Save, Sparkles, CheckCircle2, AlertCircle, Workflow, Send, Image as ImageIcon } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DEFAULT_FLOW_NODES,
  DEFAULT_FLOW_EDGES,
  DEFAULT_HUMAN_SYSTEM_PROMPT,
} from '@/lib/botEngine';

export default function SocialCommerceFlowTab({ products: initialProducts = [] }: { products?: any[] }) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(DEFAULT_FLOW_NODES as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(DEFAULT_FLOW_EDGES as Edge[]);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_HUMAN_SYSTEM_PROMPT);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  // Estado para Publicador FLUX -> Grupo WhatsApp
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [groupJid, setGroupJid] = useState('');
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [useFlux, setUseFlux] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [previews, setPreviews] = useState<{ id: string; name: string; sku: string; caption: string; imageUrl: string }[]>([]);
  const [activeReservations, setActiveReservations] = useState<any[]>([]);
  const [resFilter, setResFilter] = useState<'active' | 'converted' | 'all'>('active');
  const [subView, setSubView] = useState<'broadcast' | 'board' | 'flow' | 'chat'>('broadcast');
  const [chatNamesByPhone, setChatNamesByPhone] = useState<Record<string, string>>({});
  const [sofiaChatMsgs, setSofiaChatMsgs] = useState<{ role: 'user' | 'sofia'; text: string }[]>([
    {
      role: 'sofia',
      text: '¡Hola! Ya tengo cargado todo tu inventario físico con precios, costos y stock real. Pregúntame qué paquetes o combos podemos armar hoy.',
    },
  ]);
  const [sofiaChatInput, setSofiaChatInput] = useState('');
  const [sofiaChatLoading, setSofiaChatLoading] = useState(false);

  const handleSendSofiaChat = async (customText?: string) => {
    const textToSend = (customText ?? sofiaChatInput).trim();
    if (!textToSend || sofiaChatLoading) return;
    const nextHistory = [...sofiaChatMsgs, { role: 'user' as const, text: textToSend }];
    setSofiaChatMsgs(nextHistory);
    if (!customText) setSofiaChatInput('');
    setSofiaChatLoading(true);
    try {
      let token = '';
      let email = '';
      if (typeof window !== 'undefined') {
        try {
          const sess = JSON.parse(localStorage.getItem('foxdrop_admin_session') || '{}');
          token = sess.token || localStorage.getItem('foxdrop_admin_token') || '';
          email = sess.email || localStorage.getItem('foxdrop_admin_email') || '';
        } catch {
          token = localStorage.getItem('foxdrop_admin_token') || '';
          email = localStorage.getItem('foxdrop_admin_email') || '';
        }
      }
      const res = await fetch('/api/admin/sofia-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(email ? { 'x-admin-email': email } : {}),
        },
        body: JSON.stringify({ message: textToSend, history: nextHistory.slice(-10) }),
      });
      const json = await res.json();
      if (!res.ok || !json.reply) {
        throw new Error(json.error || 'No se pudo obtener respuesta');
      }
      setSofiaChatMsgs((prev) => [...prev, { role: 'sofia', text: json.reply }]);
    } catch (err: any) {
      setSofiaChatMsgs((prev) => [
        ...prev,
        { role: 'sofia', text: `Error: ${err?.message || 'No pude responder en este momento.'}` },
      ]);
    } finally {
      setSofiaChatLoading(false);
    }
  };

  useEffect(() => {
    try {
      const savedGroups = localStorage.getItem('foxdrop_wa_groups');
      const savedJid = localStorage.getItem('foxdrop_wa_selected_group');
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        if (Array.isArray(parsed) && parsed.length > 0) setGroups(parsed);
      }
      if (savedJid) setGroupJid(savedJid);
    } catch {}

    const loadFlow = async () => {
      const supabase = getSupabaseBrowserClient();
      const { data } = await (supabase as any)
        .from('bot_flows')
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data) {
        if (Array.isArray(data.nodes) && data.nodes.length > 0) {
          const hasWelcome = data.nodes.some((n: any) => n.id === 'welcome');
          const mergedNodes = (hasWelcome
            ? data.nodes
            : [DEFAULT_FLOW_NODES[0], ...data.nodes]
          ).map((n: any) => (n.id === 'start' ? { ...n, type: undefined } : n));
          setNodes(mergedNodes);
        }
        if (Array.isArray(data.edges) && data.edges.length > 0) {
          const hasWelcomeEdge = data.edges.some((e: any) => e.id === 'e-welcome-start');
          const mergedEdges = hasWelcomeEdge
            ? data.edges
            : [DEFAULT_FLOW_EDGES[0], ...data.edges];
          setEdges(mergedEdges);
        }
        if (data.system_prompt) setSystemPrompt(data.system_prompt);
      }

      if (initialProducts.length > 0) {
        setProducts(
          initialProducts.filter((p: any) => {
            if (Number(p.stock || 0) <= 0) return false;
            const txt = `${p.title || p.name || ''} ${p.brand || ''} ${p.category || ''}`.toLowerCase();
            return txt.includes('bath') && txt.includes('body');
          })
        );
      }

      const { data: resData } = await (supabase as any)
        .from('inventory_reservations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      if (resData) setActiveReservations(resData);

      const { data: chatsData } = await (supabase as any)
        .from('whatsapp_chats')
        .select('phone, client_name, notes')
        .limit(200);
      if (chatsData) {
        const map: Record<string, string> = {};
        for (const c of chatsData) {
          if (c.phone && c.client_name) map[String(c.phone).slice(-10)] = c.client_name;
          try {
            const parsed = typeof c.notes === 'string' ? JSON.parse(c.notes) : c.notes;
            if (parsed?.lid && c.client_name) map[String(parsed.lid)] = c.client_name;
          } catch {}
        }
        setChatNamesByPhone(map);
      }
    };
    loadFlow();

    // Escuchar apartados nuevos en tiempo real (sin refrescar) + sonido de notificación
    const supabase = getSupabaseBrowserClient();
    const channel = supabase
      .channel('social-reservations-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'inventory_reservations' },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setActiveReservations((prev) => [payload.new, ...prev]);
            setToast({ type: 'ok', msg: '🔔 ¡Nuevo apartado en vivo en tu grupo de WhatsApp!' });
            try {
              const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(880, ctx.currentTime);
              gain.gain.setValueAtTime(0.15, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.35);
            } catch {}
          } else if (payload.eventType === 'UPDATE') {
            setActiveReservations((prev) =>
              prev.map((r) => (r.id === payload.new.id ? payload.new : r))
            );
          }
        }
      )
      .subscribe();

    // Polling ligero cada 5s para actualizar carritos y sonar notificación aunque Supabase Realtime esté apagado
    let knownCount = -1;
    const pollTimer = setInterval(async () => {
      const { data: latest } = await (supabase as any)
        .from('inventory_reservations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (Array.isArray(latest)) {
        const activeNow = latest.filter((r: any) => r.status === 'active').length;
        if (knownCount !== -1 && activeNow > knownCount) {
          setToast({ type: 'ok', msg: '🔔 ¡Nuevo apartado en vivo en tu grupo de WhatsApp!' });
          try {
            const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.35);
          } catch {}
        }
        knownCount = activeNow;
        setActiveReservations(latest);
      }
    }, 5000);

    return () => {
      clearInterval(pollTimer);
      supabase.removeChannel(channel);
    };
  }, [setNodes, setEdges, initialProducts]);

  const handleReleaseReservation = async (resItem: any) => {
    const supabase = getSupabaseBrowserClient();
    await (supabase as any)
      .from('inventory_reservations')
      .update({ status: 'cancelled' })
      .eq('id', resItem.id);
    setActiveReservations((prev) => prev.map((r) => (r.id === resItem.id ? { ...r, status: 'cancelled' } : r)));

    if (groupJid.trim()) {
      const prod = products.find((p) => p.id === resItem.product_id);
      const prodName = prod?.title || prod?.name || resItem.sku;
      const prodPrice = prod?.publicPrice ?? prod?.public_price ?? prod?.price ?? 0;
      await fetch('/api/admin/social-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupJid: groupJid.trim(),
          previews: [
            {
              id: resItem.product_id,
              name: prodName,
              caption: `¡Buenas noticias! Se acaba de liberar *${prodName}* ($${prodPrice} MXN con envío incluido) 🦊✨ Si alguien se anima, solo responda *"yo"* para apartarlo.`,
              imageUrl: prod?.image_url || prod?.imageUrl || undefined,
            },
          ],
        }),
      }).catch(() => {});
    }

    setToast({ type: 'ok', msg: 'Apartado liberado y avisado en el grupo 🦊' });
  };

  const handleApproveReservation = async (resItem: any) => {
    const supabase = getSupabaseBrowserClient();
    const prod = products.find((p) => p.id === resItem.product_id);
    if (prod) {
      const newStock = Math.max(0, Number(prod.stock || 0) - Number(resItem.qty || 1));
      await (supabase as any).from('products').update({ stock: newStock }).eq('id', prod.id);
    }
    await (supabase as any)
      .from('inventory_reservations')
      .update({ status: 'converted' })
      .eq('id', resItem.id);
    setActiveReservations((prev) => prev.map((r) => (r.id === resItem.id ? { ...r, status: 'converted' } : r)));
    setToast({ type: 'ok', msg: 'Pago aprobado y stock descontado 🦊✅' });
  };

  const handleRelanzarProducto = async (productId: string) => {
    if (!groupJid.trim()) {
      setToast({ type: 'err', msg: 'Selecciona primero un grupo de WhatsApp arriba.' });
      return;
    }
    setBroadcasting(true);
    try {
      const res = await fetch('/api/admin/social-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: [productId],
          groupJid: groupJid.trim(),
          useFlux: false,
        }),
      });
      if (!res.ok) throw new Error('Error re-lanzando al grupo');
      setToast({ type: 'ok', msg: '¡Sofía re-lanzó el producto al grupo con un nuevo copy vendedor! 🔥' });
    } catch (err: any) {
      setToast({ type: 'err', msg: err?.message || 'Error al re-lanzar' });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleLoadGroups = async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch('/api/whatsapp/groups');
      const json = await res.json();
      if (Array.isArray(json.groups) && json.groups.length > 0) {
        setGroups(json.groups);
        localStorage.setItem('foxdrop_wa_groups', JSON.stringify(json.groups));
        if (!groupJid) {
          setGroupJid(json.groups[0].id);
          localStorage.setItem('foxdrop_wa_selected_group', json.groups[0].id);
        }
      } else {
        setToast({ type: 'err', msg: 'No se encontraron grupos o Render aún está reiniciando.' });
      }
    } catch {
      setToast({ type: 'err', msg: 'Error cargando grupos de WhatsApp.' });
    } finally {
      setLoadingGroups(false);
    }
  };

  const getNextBatchIds = (count: number) => {
    let sentIds: string[] = [];
    try {
      sentIds = JSON.parse(localStorage.getItem('foxdrop_sent_product_ids') || '[]');
    } catch {}
    let candidates = products.filter((p) => !sentIds.includes(p.id));
    if (candidates.length === 0) {
      sentIds = [];
      candidates = [...products];
    }
    const picked = candidates
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
      .map((p) => p.id);
    try {
      localStorage.setItem('foxdrop_sent_product_ids', JSON.stringify([...sentIds, ...picked]));
    } catch {}
    return picked;
  };

  const handleAutoPickStale = () => {
    if (!products.length) return;
    const top3 = getNextBatchIds(3);
    setSelectedProductIds(top3);
    setToast({
      type: 'ok',
      msg: `Sofía eligió ${top3.length} artículos nuevos de tu stock sin repetir 🦊`,
    });
  };

  const handleSuggestSimilar = () => {
    if (selectedProductIds.length === 0) return;
    const base = products.find((p) => p.id === selectedProductIds[0]);
    if (!base) return;
    const baseText = `${base.name || base.title || ''} ${base.brand || ''} ${base.category || ''}`.toLowerCase();
    const stopWords = new Set(['para', 'con', 'linea', 'línea', 'importado', 'fragancia', 'auto', 'jabon', 'jabón', 'liquido', 'líquido', 'repuesto', 'aromatizante', 'crema', 'producto']);
    const keywords = baseText
      .replace(/[()]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !stopWords.has(w));

    const matches = products
      .filter((p) => {
        if (selectedProductIds.includes(p.id)) return false;
        const txt = `${p.name || p.title || ''} ${p.brand || ''} ${p.category || ''}`.toLowerCase();
        return keywords.some((kw) => txt.includes(kw));
      })
      .slice(0, 4)
      .map((p) => p.id);

    if (matches.length === 0) {
      setToast({ type: 'err', msg: 'No encontré otros productos con marca o fragancia similar en tu stock.' });
      return;
    }
    setSelectedProductIds((prev) => Array.from(new Set([...prev, ...matches])));
    setToast({ type: 'ok', msg: `Sofía agregó ${matches.length} productos similares de tu stock 🦊✨` });
  };

  const handleGeneratePreview = async () => {
    if (selectedProductIds.length === 0) {
      setToast({ type: 'err', msg: 'Selecciona al menos 1 producto para generar la vista previa.' });
      return;
    }
    setBroadcasting(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/social-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedProductIds,
          useFlux,
          previewOnly: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error generando vista previa');
      setPreviews(json.results || []);
      setToast({ type: 'ok', msg: 'Vista previa lista. Revísala abajo y dale a Enviar al Grupo 🦊' });
    } catch (err: any) {
      setToast({ type: 'err', msg: err?.message || 'Error al generar vista previa' });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleBroadcast = async () => {
    if (!groupJid.trim() || (previews.length === 0 && selectedProductIds.length === 0)) {
      setToast({ type: 'err', msg: 'Selecciona un grupo y genera primero la vista previa (o selecciona productos).' });
      return;
    }
    setBroadcasting(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/social-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          previews.length > 0
            ? { groupJid: groupJid.trim(), previews }
            : { productIds: selectedProductIds, groupJid: groupJid.trim(), useFlux }
        ),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error enviando al grupo');
      setToast({
        type: 'ok',
        msg: `¡Listo! Se enviaron ${json.results?.length || 0} publicaciones con Sofía al grupo 🦊`,
      });
      setSelectedProductIds([]);
      setPreviews([]);
    } catch (err: any) {
      setToast({ type: 'err', msg: err?.message || 'Error al publicar en el grupo' });
    } finally {
      setBroadcasting(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleLanzarTanda3 = async () => {
    if (!groupJid.trim()) {
      setToast({ type: 'err', msg: 'Selecciona primero un grupo de WhatsApp.' });
      return;
    }
    const top3 = getNextBatchIds(3);
    if (top3.length === 0) return;

    setBroadcasting(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/social-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: top3, groupJid: groupJid.trim(), useFlux: false }),
      });
      if (!res.ok) throw new Error('Error lanzando tanda');
      setToast({ type: 'ok', msg: `¡Sofía lanzó una tanda de ${top3.length} ofertas al grupo! ⚡🦊` });
    } catch (err: any) {
      setToast({ type: 'err', msg: err?.message || 'Error al lanzar tanda' });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleCorteDelDia = async () => {
    setBroadcasting(true);
    setToast(null);
    try {
      const res = await fetch('/api/admin/social-corte', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupJid: groupJid.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Error en corte');
      setToast({
        type: 'ok',
        msg: `Corte del día listo: se notificó por privado a ${json.clientsNotified || 0} clientes 🦊🛍️`,
      });
    } catch (err: any) {
      setToast({ type: 'err', msg: err?.message || 'Error al hacer corte del día' });
    } finally {
      setBroadcasting(false);
    }
  };

  const handleSaveFlow = async () => {
    setSaving(true);
    setToast(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data: existing } = await (supabase as any)
        .from('bot_flows')
        .select('id')
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (existing?.id) {
        const { error } = await (supabase as any)
          .from('bot_flows')
          .update({
            nodes,
            edges,
            system_prompt: systemPrompt,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any).from('bot_flows').insert({
          name: 'Social Commerce Default',
          is_active: true,
          nodes,
          edges,
          system_prompt: systemPrompt,
        });
        if (error) throw error;
      }

      setToast({ type: 'ok', msg: 'Flujo visual y personalidad guardados en Supabase 🦊' });
    } catch (err: any) {
      setToast({ type: 'err', msg: err?.message || 'Error guardando el flujo' });
    } finally {
      setSaving(false);
    }
  };

  const updateSelectedNodeTemplate = (newTemplate: string) => {
    if (!selectedNode) return;
    setNodes((nds) =>
      nds.map((n) =>
        n.id === selectedNode.id
          ? { ...n, data: { ...n.data, messageTemplate: newTemplate } }
          : n
      )
    );
    setSelectedNode((prev) =>
      prev ? { ...prev, data: { ...prev.data, messageTemplate: newTemplate } } : null
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#0D2420] via-[#14352F] to-[#0D2420] p-4 rounded-2xl border border-emerald-700/60 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="relative h-14 w-14 shrink-0 rounded-2xl border-2 border-[#D96B27] bg-[#0D2420] p-1 shadow-[0_0_20px_rgba(217,107,39,0.28)]">
            <img
              src="/images/agents/sofia.png"
              alt="Sofía Personal Shopper"
              className="h-full w-full object-contain"
            />
            <span className="absolute -right-1 -bottom-1 h-3.5 w-3.5 rounded-full border-2 border-[#0D2420] bg-[#10B981]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight text-white">
                Sofía — Personal Shopper FoxDrop
              </h2>
              <span className="rounded-full bg-[#10B981]/20 border border-[#10B981]/40 px-2 py-0.5 text-[10px] font-bold text-[#10B981]">
                En Línea
              </span>
            </div>
            <p className="text-xs text-emerald-200/80">
              Apartado en grupo VIP → Atención por DM → Pago MP / SPEI → Ticket automático.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setSubView('broadcast')}
              className={`px-3 py-1.5 rounded-lg transition ${subView === 'broadcast' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              📢 Publicar
            </button>
            <button
              type="button"
              onClick={() => setSubView('board')}
              className={`px-3 py-1.5 rounded-lg transition ${subView === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              📋 Apartados ({activeReservations.filter((r) => r.status === 'active').length})
            </button>
            <button
              type="button"
              onClick={() => setSubView('flow')}
              className={`px-3 py-1.5 rounded-lg transition ${subView === 'flow' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              🧠 Flujo Sofía
            </button>
            <button
              type="button"
              onClick={() => setSubView('chat')}
              className={`px-3 py-1.5 rounded-lg transition ${subView === 'chat' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              💬 Chat con Sofía
            </button>
          </div>
          <button
            type="button"
            onClick={handleCorteDelDia}
            disabled={broadcasting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50 transition"
          >
            🛍️ Hacer Corte del Día
          </button>
          <button
            onClick={handleSaveFlow}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Flujo'}
          </button>
        </div>
      </div>

      {toast && (
        <div
          className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium ${
            toast.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.type === 'ok' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* VISTA 1: PUBLICAR AL GRUPO */}
      {subView === 'broadcast' && (
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Publicar Liquidación al Grupo con Sofía
            </h3>
          </div>
          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            Conectado a FoxDrop Agency
          </span>
        </div>

        {/* KPI Summary Bar (Interactive Dashboard Builder) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl border border-emerald-800/30 bg-[#14352F] p-3 text-white shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/80">
              Agencia → WhatsApp
            </p>
            <p className="mt-1 text-lg font-black text-white">Conectado</p>
            <p className="text-[10px] text-emerald-300/70">Sincronizado con deliverables</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Grupo Activo
            </p>
            <p className="mt-1 text-sm font-bold text-slate-800 truncate">
              {groups.find((g) => g.id === groupJid)?.name || "Ventas Flash ⚡ FoxDrop"}
            </p>
            <p className="text-[10px] text-emerald-600 font-medium">Canal VIP</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Productos en Stock
            </p>
            <p className="mt-1 text-lg font-black text-slate-800">{products?.length || 0}</p>
            <p className="text-[10px] text-slate-500">Disponibles para drop</p>
          </div>
          <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-3 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#D96B27]">
              Estado Sofía
            </p>
            <p className="mt-1 text-lg font-black text-[#D96B27]">En Línea</p>
            <p className="text-[10px] text-orange-700/80">Lista para cerrar ventas</p>
          </div>
        </div>

        {/* Drops Aprobados desde FoxDrop Agency */}
        {(() => {
          try {
            const raw = typeof window !== 'undefined' ? localStorage.getItem('foxdrop_agency_state_v1') : null;
            const parsed = raw ? JSON.parse(raw) : null;
            const approved = Array.isArray(parsed?.pieces)
              ? parsed.pieces.filter((p: any) => p.status === 'approved' || p.whatsappApproved)
              : [];
            if (approved.length === 0) return null;
            return (
              <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-emerald-900">
                    📦 Drops Aprobados de FoxDrop Agency ({approved.length})
                  </h4>
                  <span className="text-[11px] text-emerald-700 font-medium">Listos para WhatsApp</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {approved.map((p: any) => (
                    <div key={p.id} className="flex gap-3 rounded-xl border border-emerald-200 bg-white p-3 shadow-sm">
                      {p.imageUrl && (
                        <img src={p.imageUrl} alt={p.title} className="h-16 w-16 shrink-0 rounded-lg object-cover border border-slate-200" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{p.title}</p>
                        <p className="mt-0.5 text-[11px] text-slate-600 line-clamp-2">{p.caption}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(p.caption || '');
                            }}
                            className="rounded-md bg-[#14352F] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-900"
                          >
                            Copiar texto
                          </button>
                          <button
                            type="button"
                            disabled={!groupJid || broadcasting}
                            onClick={async (e) => {
                              if (!groupJid) return;
                              const btn = e.currentTarget;
                              btn.textContent = 'Enviando...';
                              try {
                                const res = await fetch('/api/admin/social-broadcast', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    groupJid: groupJid.trim(),
                                    previews: [
                                      {
                                        caption: `🔥 *DISPONIBLE AHORA:* ${p.title}\n\n💬 Responde *YO* o mándame DM para apartar tu pieza antes de que se agote ⚡`,
                                        imageUrl: p.imageUrl?.startsWith('http') ? p.imageUrl : undefined,
                                      },
                                    ],
                                  }),
                                });
                                const data = await res.json().catch(() => ({}));
                                if (res.ok && !data.error) {
                                  btn.textContent = '✓ Enviado';
                                  setToast({ type: 'ok', msg: `Drop enviado al grupo de WhatsApp 🦊` });
                                } else {
                                  btn.textContent = `⚠ ${data.error || 'Error'}`;
                                }
                              } catch {
                                btn.textContent = '⚠ Error de conexión';
                              }
                            }}
                            className="rounded-md bg-[#D96B27] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#c55e1e] disabled:opacity-50"
                          >
                            📤 Enviar al Grupo
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          } catch {
            return null;
          }
        })()}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2 flex gap-2">
            {groups.length > 0 ? (
              <select
                value={groupJid}
                onChange={(e) => {
                  setGroupJid(e.target.value);
                  localStorage.setItem('foxdrop_wa_selected_group', e.target.value);
                }}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                placeholder="ID del Grupo (o dale a Cargar Grupos →)"
                value={groupJid}
                onChange={(e) => setGroupJid(e.target.value)}
                className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
            <button
              type="button"
              onClick={handleLoadGroups}
              disabled={loadingGroups}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold whitespace-nowrap transition"
            >
              {loadingGroups ? 'Cargando...' : groups.length > 0 ? 'Actualizar' : 'Cargar Grupos'}
            </button>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="button"
              onClick={handleGeneratePreview}
              disabled={broadcasting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {broadcasting ? 'Generando...' : '1. Generar Vista Previa'}
            </button>
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={broadcasting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold disabled:opacity-50 transition"
            >
              <Send className="w-3.5 h-3.5" />
              2. Enviar al Grupo
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <input
            type="text"
            placeholder="Buscar por marca, fragancia o nombre..."
            value={productSearch}
            onChange={(e) => setProductSearch(e.target.value)}
            className="flex-1 min-w-[200px] text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {selectedProductIds.length > 0 && (
            <button
              type="button"
              onClick={handleSuggestSimilar}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Sugerir similares (marca / fragancia)
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pt-1">
          {products
            .filter((p) => {
              if (!productSearch.trim()) return true;
              const q = productSearch.toLowerCase();
              const txt = `${p.name || p.title || ''} ${p.brand || ''} ${p.category || ''}`.toLowerCase();
              return txt.includes(q);
            })
            .map((p) => {
            const active = selectedProductIds.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  setSelectedProductIds((prev) =>
                    active ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                  )
                }
                className={`text-xs px-3 py-1.5 rounded-full border transition ${
                  active
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.name || p.title || 'Producto'} (${p.publicPrice ?? p.public_price ?? p.price ?? p.priceMxn ?? 0}) · Stock: {p.stock}
              </button>
            );
          })}
        </div>

        {previews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            {previews.map((prev, idx) => (
              <div key={prev.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                {prev.imageUrl && (
                  <img
                    src={prev.imageUrl}
                    alt={prev.name}
                    className="w-20 h-20 object-cover rounded-lg shrink-0 border border-slate-200"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-slate-800">{prev.name}</div>
                  <textarea
                    value={prev.caption}
                    onChange={(e) =>
                      setPreviews((list) =>
                        list.map((item, i) => (i === idx ? { ...item, caption: e.target.value } : item))
                      )
                    }
                    rows={4}
                    className="w-full text-[11px] p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        {subView === 'broadcast' && activeReservations.length === -1 && (
          <div className="pt-3 border-t border-slate-100 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800">
                📋 Tablero de Apartados en Vivo ({activeReservations.filter((r) => r.status === 'active').length} activos)
              </div>
              <div className="flex items-center gap-1.5 text-[11px]">
                {(['active', 'converted', 'all'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setResFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                      resFilter === tab
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab === 'active' ? 'Activos' : tab === 'converted' ? 'Pagados' : 'Todos'}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2">Producto</th>
                    <th className="px-3 py-2">Cliente</th>
                    <th className="px-3 py-2">Estado / Tiempo</th>
                    <th className="px-3 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {activeReservations
                    .filter((r) => {
                      if (resFilter === 'active') return r.status === 'active';
                      if (resFilter === 'converted') return r.status === 'converted';
                      return true;
                    })
                    .map((r) => {
                    const prod = products.find((p) => p.id === r.product_id);
                    const clientName = chatNamesByPhone[String(r.phone || '').slice(-10)] || 'Cliente WhatsApp';
                    const minsLeft = Math.max(0, Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / 60000));
                    const isActive = r.status === 'active' && minsLeft > 0;
                    return (
                      <tr key={r.id}>
                        <td className="px-3 py-2 font-semibold text-slate-800">
                          {prod?.title || prod?.name || r.sku}
                          <span className="ml-1 text-emerald-700 font-bold">
                            (${prod?.publicPrice ?? prod?.public_price ?? prod?.price ?? 0})
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          <div className="font-medium">{clientName}</div>
                          <div className="text-[10px] text-slate-400">{r.phone}</div>
                        </td>
                        <td className="px-3 py-2">
                          {isActive ? (
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
                              ⏳ Activo · {minsLeft}m
                            </span>
                          ) : r.status === 'converted' ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                              ✅ Pagado
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-semibold text-[10px]">
                              Liberado / Expirado
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right space-x-1.5">
                          {isActive ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleApproveReservation(r)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition"
                              >
                                Aprobar Pago
                              </button>
                              <button
                                type="button"
                                onClick={() => handleReleaseReservation(r)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-red-50 text-red-600 font-semibold transition"
                              >
                                Liberar
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRelanzarProducto(r.product_id)}
                              disabled={broadcasting}
                              className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition disabled:opacity-50"
                            >
                              🔥 Re-lanzar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      )}

      {/* VISTA 2: CARRITOS POR CLIENTE */}
      {subView === 'board' && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm font-bold text-slate-800">
              🛒 Carritos por Cliente ({activeReservations.filter((r) => r.status === 'active').length} piezas activas)
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              {(['active', 'converted', 'all'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setResFilter(tab)}
                  className={`px-3 py-1 rounded-lg font-semibold transition ${
                    resFilter === tab
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'active' ? 'Activos' : tab === 'converted' ? 'Pagados' : 'Todos'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(
              activeReservations
                .filter((r) => {
                  if (resFilter === 'active') return r.status === 'active';
                  if (resFilter === 'converted') return r.status === 'converted';
                  return true;
                })
                .reduce((acc: Record<string, any[]>, r) => {
                  const key = r.phone || 'sin-telefono';
                  if (!acc[key]) acc[key] = [];
                  acc[key].push(r);
                  return acc;
                }, {})
            ).map(([phone, items]) => {
              const clientName =
                chatNamesByPhone[String(phone)] ||
                chatNamesByPhone[String(phone).slice(-10)] ||
                'Cliente WhatsApp';
              const totalCart = items.reduce((sum, r) => {
                const prod = products.find((p) => p.id === r.product_id);
                return sum + Number(prod?.publicPrice ?? prod?.public_price ?? prod?.price ?? 0);
              }, 0);
              const activeItems = items.filter((r) => r.status === 'active');

              return (
                <div key={phone} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{clientName}</div>
                      <div className="text-[11px] text-slate-500">{phone} · {items.length} artículo(s)</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-extrabold text-emerald-700">${totalCart} MXN</div>
                      {activeItems.length > 0 && (
                        <button
                          type="button"
                          onClick={async () => {
                            for (const it of activeItems) await handleApproveReservation(it);
                          }}
                          className="mt-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold transition"
                        >
                          ✅ Aprobar Carrito
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {items.map((r) => {
                      const prod = products.find((p) => p.id === r.product_id);
                      const price = prod?.publicPrice ?? prod?.public_price ?? prod?.price ?? 0;
                      const minsLeft = Math.max(0, Math.ceil((new Date(r.expires_at).getTime() - Date.now()) / 60000));
                      const isActive = r.status === 'active' && minsLeft > 0;
                      return (
                        <div key={r.id} className="flex items-center justify-between gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 text-xs">
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-800 truncate">{prod?.title || prod?.name || r.sku}</div>
                            <div className="text-[10px] text-slate-500">
                              ${price} MXN · {isActive ? `⏳ ${minsLeft}m` : r.status === 'converted' ? '✅ Pagado' : 'Liberado'}
                            </div>
                          </div>
                          {isActive && (
                            <button
                              type="button"
                              onClick={() => handleReleaseReservation(r)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-red-50 text-red-600 text-[11px] font-semibold transition"
                            >
                              Liberar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 3: FLUJO VISUAL REACT FLOW + CEREBRO SOFÍA */}
      {subView === 'flow' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-[520px] bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={(_, node) => setSelectedNode(node)}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        <div className="space-y-4 bg-white p-4 rounded-2xl border border-slate-200">
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Personalidad Humana (Sofía - Estilo Kanan)
            </label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="border-t border-slate-100 pt-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              {selectedNode
                ? `Editar Nodo: ${String(selectedNode.data?.label || selectedNode.id)}`
                : 'Haz clic en un nodo del mapa para editar su mensaje'}
            </label>
            {selectedNode && (
              <textarea
                value={String(selectedNode.data?.messageTemplate || '')}
                onChange={(e) => updateSelectedNodeTemplate(e.target.value)}
                rows={7}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            )}
          </div>
        </div>

        {previews.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            {previews.map((prev, idx) => (
              <div key={prev.id} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                {prev.imageUrl && (
                  <img
                    src={prev.imageUrl}
                    alt={prev.name}
                    className="w-20 h-20 object-cover rounded-lg shrink-0 border border-slate-200"
                  />
                )}
                <div className="flex-1 space-y-1">
                  <div className="text-xs font-bold text-slate-800">{prev.name}</div>
                  <textarea
                    value={prev.caption}
                    onChange={(e) =>
                      setPreviews((list) =>
                        list.map((item, i) => (i === idx ? { ...item, caption: e.target.value } : item))
                      )
                    }
                    rows={4}
                    className="w-full text-[11px] p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      )}

      {subView === 'chat' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[620px] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Chat privado con Sofía</h3>
              <p className="text-xs text-slate-500">Consulta paquetes, combos, precios y combinaciones con tu stock real</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Sugiere 3 paquetes de regalo con buen margen',
                'Arma combos para mover productos con más stock',
                'Combos Bath & Body Works de $400 a $600 MXN',
              ].map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={sofiaChatLoading}
                  onClick={() => handleSendSofiaChat(q)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
            {sofiaChatMsgs.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-[#171717] text-white'
                      : 'bg-white border border-slate-200 text-slate-800 shadow-2xs'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sofiaChatLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 text-slate-500 rounded-2xl px-4 py-2.5 text-xs">
                  Sofía está revisando tu inventario...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendSofiaChat();
            }}
            className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
          >
            <input
              type="text"
              value={sofiaChatInput}
              onChange={(e) => setSofiaChatInput(e.target.value)}
              placeholder="Pregúntale a Sofía sobre paquetes, precios o inventario..."
              className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-slate-400"
            />
            <button
              type="submit"
              disabled={sofiaChatLoading || !sofiaChatInput.trim()}
              className="h-10 px-4 rounded-xl bg-[#E65F2B] hover:bg-[#D45321] text-white text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50 cursor-pointer transition"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
