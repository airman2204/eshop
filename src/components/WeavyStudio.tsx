'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Sparkles, Image as ImageIcon, Video, Upload, ArrowRight, Plus, 
  Trash2, Copy, Download, RefreshCw, ZoomIn, ZoomOut, Maximize2, 
  Save, FolderOpen, Sliders, CheckCircle2, AlertCircle, Eye, Share2, 
  Layers, Palette, Film, Camera, Move, Wand2, X, ChevronRight, Check
} from 'lucide-react';
import { Product, WeavyNode, WeavyConnection, WeavyProjectFlow, WeavyNodeType } from '@/types';
import { getStoredAdminToken } from '@/lib/adminAuth';

interface WeavyStudioProps {
  products: Product[];
  onExportToProduct?: (productId: string, mediaUrl: string, type: 'image' | 'video') => void;
}

export default function WeavyStudio({ products, onExportToProduct }: WeavyStudioProps) {
  // Estado del lienzo (Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  // Nodos y Conexiones del Flujo
  const [nodes, setNodes] = useState<WeavyNode[]>([]);
  const [connections, setConnections] = useState<WeavyConnection[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Flujos guardados / Proyectos
  const [savedFlows, setSavedFlows] = useState<WeavyProjectFlow[]>([]);
  const [currentFlowName, setCurrentFlowName] = useState('Campaña Lanzamiento 1');
  const [currentFlowId, setCurrentFlowId] = useState<string>('flow-' + Date.now());
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [savingFlow, setSavingFlow] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);

  // Estados de proceso IA
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null);
  const [selectedProductModalOpen, setSelectedProductModalOpen] = useState(false);
  const [targetNodeForProduct, setTargetNodeForProduct] = useState<string | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // PLANTILLA POR DEFECTO: UN CAMINITO COMPLETO LISTO PARA USAR
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadSavedFlows();
    initializeDefaultFlow();
  }, []);

  const initializeDefaultFlow = () => {
    const sampleProduct = products.find(p => p.images && p.images.length > 0) || products[0];

    const initialNodes: WeavyNode[] = [
      {
        id: 'node-1',
        type: 'product_source',
        title: '📦 1. Producto Catálogo',
        position: { x: 60, y: 100 },
        data: {
          productId: sampleProduct?.id || 'sample',
          productTitle: sampleProduct?.title || 'Difusor Llama Volcánica USB',
          productSku: sampleProduct?.sku || 'CJ-101',
          sourceImageUrl: sampleProduct?.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',
        },
      },
      {
        id: 'node-2',
        type: 'prompt_script',
        title: '✨ 2. Dirección de Arte & Prompt',
        position: { x: 380, y: 100 },
        data: {
          promptText: 'Commercial luxury advertising shot in modern living room, ambient golden hour lighting, cinematic steam and mist reflections, 8k resolution, elegant interior design.',
          negativePrompt: 'blurry, distorted, low quality, noisy, dark artifacts',
          aspectRatio: '9:16',
          visualStyle: 'cinematic',
          cameraMotion: 'slow_zoom_in',
          videoDurationSec: 5,
        },
      },
      {
        id: 'node-3',
        type: 'image_generator',
        title: '🎨 3. Generador de Imagen IA',
        position: { x: 740, y: 100 },
        data: {
          status: 'idle',
          outputMediaType: 'image',
          outputMediaUrl: sampleProduct?.images?.[0] || '',
        },
      },
      {
        id: 'node-4',
        type: 'video_generator',
        title: '🎬 4. Generador de Video (Veo/Omni)',
        position: { x: 1100, y: 100 },
        data: {
          status: 'idle',
          outputMediaType: 'video',
          videoDurationSec: 5,
          outputMediaUrl: sampleProduct?.videos?.[0] || '',
        },
      },
    ];

    const initialConnections: WeavyConnection[] = [
      { id: 'c1-2', fromNodeId: 'node-1', toNodeId: 'node-2' },
      { id: 'c2-3', fromNodeId: 'node-2', toNodeId: 'node-3' },
      { id: 'c3-4', fromNodeId: 'node-3', toNodeId: 'node-4' },
    ];

    setNodes(initialNodes);
    setConnections(initialConnections);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // CARGAR Y GUARDAR FLUJOS EN SUPABASE STORAGE
  // ──────────────────────────────────────────────────────────────────────────
  const loadSavedFlows = async () => {
    setLoadingFlows(true);
    try {
      const token = getStoredAdminToken();
      const res = await fetch('/api/admin/weavy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'list_flows' }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.flows)) {
        setSavedFlows(data.flows);
      }
    } catch (e) {
      console.warn('Error loading flows:', e);
    } finally {
      setLoadingFlows(false);
    }
  };

  const handleSaveCurrentFlow = async () => {
    setSavingFlow(true);
    try {
      const token = getStoredAdminToken();
      const currentFlow: WeavyProjectFlow = {
        id: currentFlowId,
        name: currentFlowName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes,
        connections,
      };

      const res = await fetch('/api/admin/weavy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'save_flow', flow: currentFlow }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`✅ Flujo "${currentFlowName}" guardado en la nube con éxito.`);
        loadSavedFlows();
      } else {
        alert(`Error al guardar: ${data.error || 'Intenta de nuevo'}`);
      }
    } catch (e: any) {
      alert(`Error de red: ${e.message}`);
    } finally {
      setSavingFlow(false);
    }
  };

  const handleLoadFlow = (flow: WeavyProjectFlow) => {
    setCurrentFlowId(flow.id);
    setCurrentFlowName(flow.name);
    setNodes(flow.nodes || []);
    setConnections(flow.connections || []);
    setShowSavedModal(false);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // MANIPULACIÓN DEL LIENZO (DRAG NODES, PAN & ZOOM)
  // ──────────────────────────────────────────────────────────────────────────
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.weavy-node-card')) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - startPan.x, y: e.clientY - startPan.y });
    } else if (draggingNodeId) {
      setNodes(prev => prev.map(n => {
        if (n.id === draggingNodeId) {
          return {
            ...n,
            position: {
              x: Math.round((e.clientX - pan.x) / zoom - dragOffset.x),
              y: Math.round((e.clientY - pan.y) / zoom - dragOffset.y),
            },
          };
        }
        return n;
      }));
    }
  };

  const handleMouseUpCanvas = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  const handleNodeMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    setSelectedNodeId(nodeId);
    setDraggingNodeId(nodeId);
    const targetNode = nodes.find(n => n.id === nodeId);
    if (targetNode) {
      setDragOffset({
        x: (e.clientX - pan.x) / zoom - targetNode.position.x,
        y: (e.clientY - pan.y) / zoom - targetNode.position.y,
      });
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // AÑADIR NUEVOS NODOS AL LIENZO
  // ──────────────────────────────────────────────────────────────────────────
  const handleAddNode = (type: WeavyNodeType) => {
    const id = `node-${Date.now().toString().slice(-4)}`;
    const x = Math.round((-pan.x + 300) / zoom);
    const y = Math.round((-pan.y + 200) / zoom);

    let title = 'Nodo';
    let defaultData: any = {};

    switch (type) {
      case 'product_source':
        title = '📦 Producto Catálogo';
        defaultData = {
          productTitle: 'Seleccionar producto...',
          sourceImageUrl: '/no-image.svg',
        };
        break;
      case 'external_upload':
        title = '📤 Subir Foto Externa';
        defaultData = {
          productTitle: 'Foto desde PC / URL',
          sourceImageUrl: '',
        };
        break;
      case 'prompt_script':
        title = '✨ Prompt & Estilo';
        defaultData = {
          promptText: 'Cinematic commercial lighting, high-end 8k aesthetic, product hero shot.',
          aspectRatio: '9:16',
          visualStyle: 'cinematic',
          cameraMotion: 'slow_zoom_in',
          videoDurationSec: 5,
        };
        break;
      case 'image_generator':
        title = '🎨 Generador Imagen IA';
        defaultData = { status: 'idle', outputMediaType: 'image' };
        break;
      case 'video_generator':
        title = '🎬 Generador Video IA';
        defaultData = { status: 'idle', outputMediaType: 'video', videoDurationSec: 5 };
        break;
      case 'media_viewer':
        title = '📺 Visor & Exportador';
        defaultData = { outputMediaType: 'image' };
        break;
    }

    const newNode: WeavyNode = {
      id,
      type,
      title,
      position: { x, y },
      data: defaultData,
    };

    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(id);
  };

  const handleDeleteNode = (id: string) => {
    setNodes(prev => prev.filter(n => n.id !== id));
    setConnections(prev => prev.filter(c => c.fromNodeId !== id && c.toNodeId !== id));
    if (selectedNodeId === id) setSelectedNodeId(null);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // ASISTENCIA IA: GENERAR PROMPT INTELIGENTE
  // ──────────────────────────────────────────────────────────────────────────
  const handleAIAssistPrompt = async (nodeId: string) => {
    // Buscar si este nodo está conectado hacia atrás a un producto o foto
    const parentConn = connections.find(c => c.toNodeId === nodeId);
    const parentNode = parentConn ? nodes.find(n => n.id === parentConn.fromNodeId) : null;

    const pTitle = parentNode?.data?.productTitle || 'Producto Novedad';
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    setGeneratingNodeId(nodeId);
    try {
      const token = getStoredAdminToken();
      const res = await fetch('/api/admin/weavy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'generate_commercial_prompt',
          productTitle: pTitle,
          style: targetNode.data.visualStyle || 'cinematic',
          ratio: targetNode.data.aspectRatio || '9:16',
        }),
      });

      const data = await res.json();
      if (data.success && data.promptText) {
        setNodes(prev => prev.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                promptText: data.promptText,
                negativePrompt: data.negativePrompt || n.data.negativePrompt,
                cameraMotion: data.cameraMotion || n.data.cameraMotion,
              },
            };
          }
          return n;
        }));
      }
    } catch (e: any) {
      alert(`Error al generar prompt: ${e.message}`);
    } finally {
      setGeneratingNodeId(null);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // EJECUTAR GENERACIÓN DE IMAGEN IA
  // ──────────────────────────────────────────────────────────────────────────
  const handleTriggerGenerateImage = async (nodeId: string) => {
    // Resolver prompt y foto desde los nodos conectados anteriores
    const promptConn = connections.find(c => c.toNodeId === nodeId);
    const promptNode = promptConn ? nodes.find(n => n.id === promptConn.fromNodeId) : null;
    const promptText = promptNode?.data?.promptText || 'Commercial luxury advertising shot, 8k resolution.';
    const ratio = promptNode?.data?.aspectRatio || '9:16';

    // Resolver foto de origen si hay producto conectado
    const productConn = promptNode ? connections.find(c => c.toNodeId === promptNode.id) : null;
    const productNode = productConn ? nodes.find(n => n.id === productConn.fromNodeId) : null;
    const sourceImage = productNode?.data?.sourceImageUrl;

    setGeneratingNodeId(nodeId);
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'generating' } } : n));

    try {
      const token = getStoredAdminToken();
      const res = await fetch('/api/admin/weavy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'generate_image',
          promptText,
          sourceImageUrl: sourceImage,
          aspectRatio: ratio,
        }),
      });

      const data = await res.json();
      if (data.success && data.imageUrl) {
        setNodes(prev => prev.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'success',
                outputMediaUrl: data.imageUrl,
                outputMediaType: 'image',
                generatedAt: new Date().toLocaleTimeString(),
              },
            };
          }
          return n;
        }));
      } else {
        throw new Error(data.error || 'Error generando imagen');
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error', errorMessage: err.message } } : n));
    } finally {
      setGeneratingNodeId(null);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // EJECUTAR GENERACIÓN DE VIDEO IA (VEO / OMNI FLASH)
  // ──────────────────────────────────────────────────────────────────────────
  const handleTriggerGenerateVideo = async (nodeId: string) => {
    const parentConn = connections.find(c => c.toNodeId === nodeId);
    const parentNode = parentConn ? nodes.find(n => n.id === parentConn.fromNodeId) : null;
    
    // Obtener imagen base (puede venir del nodo de imagen o del producto directo)
    const baseImageUrl = parentNode?.data?.outputMediaUrl || parentNode?.data?.sourceImageUrl;

    // Obtener prompt
    const promptNode = nodes.find(n => n.type === 'prompt_script') || parentNode;
    const promptText = promptNode?.data?.promptText || 'Commercial 4k dynamic video, cinematic motion.';
    const duration = promptNode?.data?.videoDurationSec || 5;
    const ratio = promptNode?.data?.aspectRatio || '9:16';

    setGeneratingNodeId(nodeId);
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'generating' } } : n));

    try {
      const token = getStoredAdminToken();
      const res = await fetch('/api/admin/weavy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'generate_video',
          promptText,
          sourceImageUrl: baseImageUrl,
          aspectRatio: ratio,
          durationSec: duration,
        }),
      });

      const data = await res.json();
      if (data.success && data.videoUrl) {
        setNodes(prev => prev.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'success',
                outputMediaUrl: data.videoUrl,
                outputMediaType: 'video',
                generatedAt: new Date().toLocaleTimeString(),
              },
            };
          }
          return n;
        }));
      } else {
        throw new Error(data.error || 'Aviso en motor de video');
      }
    } catch (err: any) {
      alert(`Información del Motor de Video:\n${err.message}`);
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'error', errorMessage: err.message } } : n));
    } finally {
      setGeneratingNodeId(null);
    }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // SUBIDA EXTERNA DESDE PC
  // ──────────────────────────────────────────────────────────────────────────
  const handleUploadExternalFile = (e: React.ChangeEvent<HTMLInputElement>, nodeId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setNodes(prev => prev.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              sourceImageUrl: b64,
              productTitle: file.name.slice(0, 30),
            },
          };
        }
        return n;
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative w-full h-[84vh] bg-[#0c0f17] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col select-none">
      
      {/* 1. BARRA SUPERIOR DE CONTROL ESTILO WEAVY / FIGMA WEAVE */}
      <div className="h-14 border-b border-slate-800/80 bg-[#121624]/90 backdrop-blur-md px-5 flex items-center justify-between z-30 shrink-0">
        
        {/* Identidad del Tablero */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
            <Wand2 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentFlowName}
              onChange={e => setCurrentFlowName(e.target.value)}
              className="bg-transparent text-white font-black text-sm tracking-wide border-b border-transparent hover:border-slate-600 focus:border-indigo-500 focus:outline-none px-1"
              title="Haz clic para renombrar este caminito publicitario"
            />
            <span className="text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded-full bg-slate-800/80">
              {nodes.length} nodos
            </span>
          </div>
        </div>

        {/* Acciones para Añadir Nodos */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#181e30] p-1 rounded-2xl border border-slate-800">
          <button
            type="button"
            onClick={() => handleAddNode('product_source')}
            className="px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Añadir producto del catálogo FoxDrop"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>+ Catálogo</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('external_upload')}
            className="px-2.5 py-1.5 rounded-xl hover:bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Subir foto externa desde tu PC"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Foto PC</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('prompt_script')}
            className="px-2.5 py-1.5 rounded-xl hover:bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Añadir nodo de prompt y dirección de arte"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>+ Prompt</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('image_generator')}
            className="px-2.5 py-1.5 rounded-xl hover:bg-pink-500/20 text-pink-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Generador de Imágenes IA"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>+ Imagen IA</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('video_generator')}
            className="px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
            title="Generador de Video (Veo/Omni)"
          >
            <Video className="w-3.5 h-3.5" />
            <span>+ Video IA</span>
          </button>
        </div>

        {/* Guardar Caminito & Cargar Historial */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSavedModal(true)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer border border-slate-700"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>Historial ({savedFlows.length})</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentFlow}
            disabled={savingFlow}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs flex items-center gap-1.5 transition shadow-md cursor-pointer disabled:opacity-50"
          >
            {savingFlow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Guardar Caminito</span>
          </button>
        </div>
      </div>

      {/* 2. LIENZO INFINITO INTERACTIVO (CANVAS CON PUNTOS FIGMA) */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
        onWheel={e => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const next = Math.max(0.4, Math.min(2.0, zoom - e.deltaY * 0.0015));
            setZoom(Number(next.toFixed(2)));
          }
        }}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing bg-[#090c15]"
        style={{
          backgroundImage: 'radial-gradient(circle, #20273d 1px, transparent 1px)',
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >

        {/* CONTENEDOR ESCALABLE CON ZOOM & PAN */}
        <div
          className="absolute origin-top-left transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {/* CABLES SVG ENTRE NODOS CONECTADOS */}
          <svg className="absolute inset-0 pointer-events-none overflow-visible w-[5000px] h-[5000px] z-0">
            <defs>
              <linearGradient id="cableGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#ec4899" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {connections.map(c => {
              const from = nodes.find(n => n.id === c.fromNodeId);
              const to = nodes.find(n => n.id === c.toNodeId);
              if (!from || !to) return null;

              // Calcular punto de salida derecho del nodo origen y entrada izquierdo del destino
              const x1 = from.position.x + 300;
              const y1 = from.position.y + 110;
              const x2 = to.position.x;
              const y2 = to.position.y + 110;

              // Curva Bezier suave como en Weavy / Figma
              const dx = Math.abs(x2 - x1) * 0.5;
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              return (
                <g key={c.id}>
                  {/* Sombra del cable */}
                  <path d={pathD} fill="none" stroke="#000" strokeWidth="6" opacity="0.4" />
                  {/* Cable dinámico */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#cableGradient)"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    className="animate-pulse"
                  />
                  {/* Puntos de conexión */}
                  <circle cx={x1} cy={y1} r="4" fill="#818cf8" />
                  <circle cx={x2} cy={y2} r="4" fill="#ec4899" />
                </g>
              );
            })}
          </svg>

          {/* RENDERIZADO DE NODOS */}
          {nodes.map(node => {
            const isSelected = selectedNodeId === node.id;
            const isGenerating = generatingNodeId === node.id;

            return (
              <div
                key={node.id}
                onMouseDown={e => handleNodeMouseDown(e, node.id)}
                className={`weavy-node-card absolute w-[300px] rounded-3xl bg-[#141928]/95 backdrop-blur-xl border-2 transition-shadow duration-150 flex flex-col overflow-hidden shadow-2xl z-10 ${
                  isSelected
                    ? 'border-indigo-400 ring-4 ring-indigo-500/20 shadow-indigo-500/10'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
                style={{
                  left: `${node.position.x}px`,
                  top: `${node.position.y}px`,
                }}
              >
                {/* Cabecera del Nodo con Color Temático */}
                <div className={`p-3.5 flex items-center justify-between border-b ${
                  node.type === 'product_source' ? 'bg-emerald-950/40 border-emerald-900/50 text-emerald-300' :
                  node.type === 'external_upload' ? 'bg-teal-950/40 border-teal-900/50 text-teal-300' :
                  node.type === 'prompt_script' ? 'bg-purple-950/40 border-purple-900/50 text-purple-300' :
                  node.type === 'image_generator' ? 'bg-pink-950/40 border-pink-900/50 text-pink-300' :
                  node.type === 'video_generator' ? 'bg-rose-950/40 border-rose-900/50 text-rose-300' :
                  'bg-sky-950/40 border-sky-900/50 text-sky-300'
                }`}>
                  <span className="font-black text-xs tracking-wide truncate">{node.title}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteNode(node.id)}
                      className="p-1 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800/80 transition"
                      title="Eliminar nodo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Cuerpo del Nodo según Tipo */}
                <div className="p-3.5 space-y-3 text-xs text-slate-300">

                  {/* NODO TIPO 1: PRODUCTO DEL CATÁLOGO */}
                  {node.type === 'product_source' && (
                    <div className="space-y-2.5">
                      <div className="relative aspect-video rounded-2xl bg-black/40 overflow-hidden border border-slate-800 flex items-center justify-center group/img">
                        <img
                          src={node.data.sourceImageUrl || '/no-image.svg'}
                          alt={node.data.productTitle}
                          className="w-full h-full object-contain p-2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setTargetNodeForProduct(node.id);
                            setSelectedProductModalOpen(true);
                          }}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center font-bold text-white text-xs gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Cambiar
                        </button>
                      </div>
                      <div>
                        <p className="font-black text-white text-xs truncate" title={node.data.productTitle}>
                          {node.data.productTitle || 'Sin título'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: {node.data.productSku || 'CJ-000'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetNodeForProduct(node.id);
                          setSelectedProductModalOpen(true);
                        }}
                        className="w-full py-2 bg-slate-800/80 hover:bg-slate-800 rounded-xl font-bold text-[11px] text-emerald-400 border border-slate-700/80 transition flex items-center justify-center gap-1"
                      >
                        <span>Elegir Producto FoxDrop</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* NODO TIPO 2: SUBIDA EXTERNA (DESDE PC O URL) */}
                  {node.type === 'external_upload' && (
                    <div className="space-y-2.5">
                      {node.data.sourceImageUrl ? (
                        <div className="relative aspect-video rounded-2xl bg-black/40 overflow-hidden border border-slate-800 flex items-center justify-center group/ext">
                          <img
                            src={node.data.sourceImageUrl}
                            alt=""
                            className="w-full h-full object-contain p-2"
                          />
                          <button
                            type="button"
                            onClick={() => setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, sourceImageUrl: '' } } : n))}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover/ext:opacity-100 transition flex items-center justify-center font-bold text-rose-300 text-xs gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Quitar
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-700 hover:border-teal-400 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition text-center">
                          <Upload className="w-6 h-6 text-teal-400" />
                          <span className="font-bold text-[11px] text-slate-300">Cargar desde PC</span>
                          <span className="text-[9px] text-slate-500">Arrastra una foto o haz clic</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleUploadExternalFile(e, node.id)}
                          />
                        </label>
                      )}
                      <input
                        type="url"
                        placeholder="O pega URL de foto externa..."
                        value={node.data.sourceImageUrl?.startsWith('data:') ? '' : node.data.sourceImageUrl || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, sourceImageUrl: val } } : n));
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-slate-300 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  )}

                  {/* NODO TIPO 3: PROMPT, GUION & ESTILO */}
                  {node.type === 'prompt_script' && (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400">Prompt / Instrucción:</span>
                        <button
                          type="button"
                          onClick={() => handleAIAssistPrompt(node.id)}
                          disabled={isGenerating}
                          className="text-[10px] text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 transition"
                        >
                          <Sparkles className="w-3 h-3 animate-spin-slow" />
                          <span>{isGenerating ? 'Escribiendo...' : 'Generar con IA'}</span>
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={node.data.promptText || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, promptText: val } } : n));
                        }}
                        placeholder="Describe la atmósfera, iluminación y movimiento..."
                        className="w-full px-2.5 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] text-slate-200 focus:outline-none focus:border-purple-400 resize-none leading-relaxed"
                      />

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div>
                          <span className="text-slate-500 block mb-0.5">Formato:</span>
                          <select
                            value={node.data.aspectRatio || '9:16'}
                            onChange={e => {
                              const val = e.target.value as any;
                              setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, aspectRatio: val } } : n));
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-slate-300 focus:outline-none"
                          >
                            <option value="9:16">9:16 (TikTok / Reel)</option>
                            <option value="1:1">1:1 (Instagram Feed)</option>
                            <option value="16:9">16:9 (Web / Banner)</option>
                          </select>
                        </div>

                        <div>
                          <span className="text-slate-500 block mb-0.5">Cámara:</span>
                          <select
                            value={node.data.cameraMotion || 'slow_zoom_in'}
                            onChange={e => {
                              const val = e.target.value as any;
                              setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, cameraMotion: val } } : n));
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-1 text-slate-300 focus:outline-none"
                          >
                            <option value="slow_zoom_in">Acercamiento suave</option>
                            <option value="orbit_360">Órbita 360°</option>
                            <option value="smoke_atmospheric">Atmósfera de humo</option>
                            <option value="dynamic_pan">Paneo dinámico</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NODO TIPO 4: GENERADOR DE IMAGEN IA */}
                  {node.type === 'image_generator' && (
                    <div className="space-y-2.5">
                      <div className="relative aspect-video rounded-2xl bg-black/60 overflow-hidden border border-slate-800 flex items-center justify-center group/res">
                        {node.data.outputMediaUrl ? (
                          <img
                            src={node.data.outputMediaUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-600">
                            <ImageIcon className="w-8 h-8 opacity-40" />
                            <span className="text-[10px]">Sin renderizar</span>
                          </div>
                        )}

                        {node.data.outputMediaUrl && (
                          <button
                            type="button"
                            onClick={() => setMediaPreviewUrl({ url: node.data.outputMediaUrl!, type: 'image', title: 'Imagen Generada' })}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white opacity-0 group-hover/res:opacity-100 transition"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {node.data.generatedAt && (
                        <p className="text-[9px] text-emerald-400 font-mono">✓ Generada: {node.data.generatedAt}</p>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTriggerGenerateImage(node.id)}
                        disabled={isGenerating}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        <span>{isGenerating ? 'Generando Fotografía...' : 'Renderizar Imagen IA'}</span>
                      </button>
                    </div>
                  )}

                  {/* NODO TIPO 5: GENERADOR DE VIDEO IA */}
                  {node.type === 'video_generator' && (
                    <div className="space-y-2.5">
                      <div className="relative aspect-video rounded-2xl bg-black/60 overflow-hidden border border-slate-800 flex items-center justify-center group/vid">
                        {node.data.outputMediaUrl ? (
                          <video
                            src={node.data.outputMediaUrl}
                            controls
                            playsInline
                            className="w-full h-full object-contain bg-black"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-slate-600">
                            <Video className="w-8 h-8 opacity-40" />
                            <span className="text-[10px]">Sin renderizar</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTriggerGenerateVideo(node.id)}
                        disabled={isGenerating}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer disabled:opacity-50"
                      >
                        {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                        <span>{isGenerating ? 'Procesando Video...' : 'Generar Video (Veo/Omni)'}</span>
                      </button>
                    </div>
                  )}

                </div>

                {/* PUERTOS DE ENTRADA Y SALIDA (CONECTORES VISUALES TIPO WEAVY) */}
                <div className="h-6 bg-[#0e121e] border-t border-slate-800/80 px-3 flex items-center justify-between text-[9px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-indigo-500/80" /> Entrada
                  </span>
                  <span className="flex items-center gap-1">
                    Salida <span className="w-2 h-2 rounded-full bg-pink-500/80" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* 3. CONTROLES DE ZOOM Y PANTALLA EN ESQUINA INFERIOR */}
        <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-[#141928]/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800 shadow-xl">
          <button
            type="button"
            onClick={() => setZoom(prev => Math.max(0.4, Number((prev - 0.15).toFixed(2))))}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Reducir zoom"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="font-mono text-xs text-slate-400 font-bold px-1.5 min-w-[48px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setZoom(prev => Math.min(2.0, Number((prev + 0.15).toFixed(2))))}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Aumentar zoom"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPan({ x: 40, y: 40 });
            }}
            className="p-2 text-slate-300 hover:text-white rounded-xl hover:bg-slate-800 transition text-[10px] font-bold"
            title="Centrar lienzo"
          >
            Reset
          </button>
        </div>

        {/* 4. PISTA VISUAL DE CONTROL EN ESQUINA INFERIOR IZQUIERDA */}
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none bg-slate-900/80 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 text-[10px] text-slate-400">
          💡 <strong>Tip:</strong> Arrastra el fondo para moverte. Arrastra las tarjetas para organizar tu caminito.
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: SELECTOR DE PRODUCTOS DEL CATÁLOGO PARA EL NODO */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {selectedProductModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141928] border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Seleccionar Producto de FoxDrop</h3>
              <button
                type="button"
                onClick={() => setSelectedProductModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-3">
              {products.map(p => (
                <div
                  key={p.id}
                  onClick={() => {
                    if (targetNodeForProduct) {
                      setNodes(prev => prev.map(n => {
                        if (n.id === targetNodeForProduct) {
                          return {
                            ...n,
                            data: {
                              ...n.data,
                              productId: p.id,
                              productTitle: p.title,
                              productSku: p.sku,
                              sourceImageUrl: p.images?.[0] || '/no-image.svg',
                            },
                          };
                        }
                        return n;
                      }));
                    }
                    setSelectedProductModalOpen(false);
                  }}
                  className="p-2.5 rounded-2xl bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500 transition cursor-pointer flex flex-col justify-between group"
                >
                  <div className="aspect-square bg-black/40 rounded-xl overflow-hidden mb-2 p-1 flex items-center justify-center">
                    <img src={p.images?.[0] || '/no-image.svg'} alt={p.title} className="w-full h-full object-contain" />
                  </div>
                  <p className="text-[11px] font-bold text-slate-200 line-clamp-2 leading-tight group-hover:text-indigo-300">
                    {p.title}
                  </p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">${p.publicPrice} MXN</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: HISTORIAL DE FLUJOS / CAMINITOS GUARDADOS */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showSavedModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141928] border border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-sm">Historial de Caminitos y Campañas</h3>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {savedFlows.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Aún no has guardado caminitos. Crea tu primer flujo y haz clic en &quot;Guardar Caminito&quot;.
                </div>
              ) : (
                savedFlows.map(f => (
                  <div
                    key={f.id}
                    className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div>
                      <h4 className="font-bold text-white text-xs">{f.name}</h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {f.nodes?.length || 0} nodos • Guardado: {new Date(f.updatedAt).toLocaleDateString('es-MX')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadFlow(f)}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs transition cursor-pointer"
                    >
                      Cargar en Lienzo
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: VISOR EN PANTALLA COMPLETA */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {mediaPreviewUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setMediaPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 font-bold text-xs flex items-center gap-1"
            >
              <X className="w-5 h-5" /> Cerrar
            </button>
            {mediaPreviewUrl.type === 'image' ? (
              <img src={mediaPreviewUrl.url} alt="" className="max-h-[80vh] rounded-2xl object-contain shadow-2xl" />
            ) : (
              <video src={mediaPreviewUrl.url} controls autoPlay className="max-h-[80vh] rounded-2xl bg-black" />
            )}
            <div className="mt-4 flex gap-2">
              <a
                href={mediaPreviewUrl.url}
                download="foxdrop_creative"
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Descargar Archivo
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
