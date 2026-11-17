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
import { Save, Sparkles, CheckCircle2, AlertCircle, Workflow } from 'lucide-react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import {
  DEFAULT_FLOW_NODES,
  DEFAULT_FLOW_EDGES,
  DEFAULT_HUMAN_SYSTEM_PROMPT,
} from '@/lib/botEngine';

export default function SocialCommerceFlowTab() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(DEFAULT_FLOW_NODES as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(DEFAULT_FLOW_EDGES as Edge[]);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_HUMAN_SYSTEM_PROMPT);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  useEffect(() => {
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
        if (Array.isArray(data.nodes) && data.nodes.length > 0) setNodes(data.nodes);
        if (Array.isArray(data.edges) && data.edges.length > 0) setEdges(data.edges);
        if (data.system_prompt) setSystemPrompt(data.system_prompt);
      }
    };
    loadFlow();
  }, [setNodes, setEdges]);

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
      </div>
    </div>
  );
}
