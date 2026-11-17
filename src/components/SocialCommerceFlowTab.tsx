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
  const [useFlux, setUseFlux] = useState(true);
  const [broadcasting, setBroadcasting] = useState(false);
  const [previews, setPreviews] = useState<{ id: string; name: string; sku: string; caption: string; imageUrl: string }[]>([]);

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
        setProducts(initialProducts.filter((p: any) => Number(p.stock || 0) > 0));
      }
    };
    loadFlow();
  }, [setNodes, setEdges, initialProducts]);

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

  const handleAutoPickStale = () => {
    if (!products.length) return;
    // Priorizar productos con mayor stock disponible (y más antiguos al final de la lista)
    const sorted = [...products].sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    const top3 = sorted.slice(0, 3).map((p) => p.id);
    setSelectedProductIds(top3);
    setToast({
      type: 'ok',
      msg: `Sofía eligió automáticamente ${top3.length} artículos con mayor stock parado 🦊`,
    });
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700">
            <Workflow className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Social Commerce Flow (WhatsApp + React Flow)
            </h2>
            <p className="text-xs text-slate-500">
              Diseña el árbol conversacional de apartado en grupo → DM humano → Pago MP / SPEI → Ticket.
            </p>
          </div>
        </div>

        <button
          onClick={handleSaveFlow}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar Flujo'}
        </button>
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

      {/* Panel Publicador con FLUX -> Grupo WhatsApp */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Publicar Liquidación al Grupo con FLUX + Sofía
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAutoPickStale}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Elegir automáticamente (Stock parado)
            </button>
            <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={useFlux}
                onChange={(e) => setUseFlux(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600"
              />
              Generar foto de estudio con FLUX (fal.ai)
            </label>
          </div>
        </div>

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

        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto pt-1">
          {products.map((p) => {
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
                {p.name || p.title || 'Producto'} (${p.price ?? p.priceMxn ?? p.salePrice ?? 0}) · Stock: {p.stock}
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
      </div>

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
    </div>
  );
}
