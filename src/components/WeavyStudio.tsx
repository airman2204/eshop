'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Sparkles, Image as ImageIcon, Video, Upload, ArrowRight, Plus, 
  Trash2, Copy, Download, RefreshCw, ZoomIn, ZoomOut, Maximize2, 
  Save, FolderOpen, Sliders, CheckCircle2, AlertCircle, Eye, Share2, 
  Layers, Palette, Film, Camera, Move, Wand2, X, ChevronRight, Check,
  Link as LinkIcon, Unlink, Paperclip, Cpu, Radio, ShieldCheck
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

  // Conexión interactiva arrastrando desde puertos
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Flujos guardados / Proyectos
  const [savedFlows, setSavedFlows] = useState<WeavyProjectFlow[]>([]);
  const [currentFlowName, setCurrentFlowName] = useState('Campaña Publicitaria');
  const [currentFlowId, setCurrentFlowId] = useState<string>('flow-' + Date.now());
  const [loadingFlows, setLoadingFlows] = useState(false);
  const [savingFlow, setSavingFlow] = useState(false);
  const [showSavedModal, setShowSavedModal] = useState(false);

  // Estados de proceso IA
  const [generatingNodeId, setGeneratingNodeId] = useState<string | null>(null);
  const [selectedProductModalOpen, setSelectedProductModalOpen] = useState(false);
  const [targetNodeForProduct, setTargetNodeForProduct] = useState<string | null>(null);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<{ url: string; type: 'image' | 'video'; title: string } | null>(null);

  // Estados de Conexión a Estación Local RTX 4070 (Túnel HTTPS / Localhost)
  const [aiEndpoint, setAiEndpoint] = useState<string>('https://follow-mai-enjoy-randy.trycloudflare.com');
  const [stationStatus, setStationStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [showStationModal, setShowStationModal] = useState(false);
  const [stationModalInput, setStationModalInput] = useState<string>('');
  const [testingStation, setTestingStation] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  const checkStationHealth = async (targetUrl?: string) => {
    const raw = targetUrl !== undefined ? targetUrl : (aiEndpoint || (typeof window !== 'undefined' ? localStorage.getItem('foxdrop_ai_station_endpoint') : '') || 'https://follow-mai-enjoy-randy.trycloudflare.com');
    const clean = (raw || '').trim().replace(/\/+$/, '');
    if (!clean) {
      setStationStatus('offline');
      return false;
    }

    try {
      setTestingStation(true);
      const res = await fetch(`${clean}/sdapi/v1/progress?skip_current_image=true`, {
        method: 'GET',
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        setStationStatus('online');
        setAiEndpoint(clean);
        if (typeof window !== 'undefined') localStorage.setItem('foxdrop_ai_station_endpoint', clean);
        setTestingStation(false);
        return true;
      }
    } catch {
      // Fallback a localhost si se está probando directamente
      if (!clean.includes('127.0.0.1') && !clean.includes('localhost')) {
        try {
          const loc = await fetch('http://127.0.0.1:7860/sdapi/v1/progress?skip_current_image=true', {
            signal: AbortSignal.timeout(1500),
          });
          if (loc.ok) {
            setStationStatus('online');
            setAiEndpoint('http://127.0.0.1:7860');
            if (typeof window !== 'undefined') localStorage.setItem('foxdrop_ai_station_endpoint', 'http://127.0.0.1:7860');
            setTestingStation(false);
            return true;
          }
        } catch {}
      }
    }

    setStationStatus('offline');
    setTestingStation(false);
    return false;
  };

  // Cargar proyectos guardados o iniciar plantilla por defecto
  useEffect(() => {
    loadSavedFlows();
    initializeDefaultFlow();

    const storedEndpoint = (typeof window !== 'undefined' ? localStorage.getItem('foxdrop_ai_station_endpoint') : null) || 'https://follow-mai-enjoy-randy.trycloudflare.com';
    setAiEndpoint(storedEndpoint);
    setStationModalInput(storedEndpoint);
    checkStationHealth(storedEndpoint);

    // Verificación periódica cada 30 segundos
    const interval = setInterval(() => {
      checkStationHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const initializeDefaultFlow = () => {
    const sampleProduct = products.find(p => p.images && p.images.length > 0) || products[0];

    const initialNodes: WeavyNode[] = [
      {
        id: 'node-1',
        type: 'product_source',
        title: '📦 Producto Catálogo',
        position: { x: 50, y: 80 },
        data: {
          productId: sampleProduct?.id || 'sample',
          productTitle: sampleProduct?.title || 'Producto FoxDrop',
          productSku: sampleProduct?.sku || 'CJ-101',
          sourceImageUrl: sampleProduct?.images?.[0] || 'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=800',
        },
      },
      {
        id: 'node-2',
        type: 'prompt_script',
        title: '✨ Dirección de Arte & Prompt',
        position: { x: 420, y: 80 },
        data: {
          promptText: 'Commercial advertising shot in luxury showroom, cinematic studio lighting, reflections, 8k resolution, elegant composition.',
          referenceImageUrl: '',
          negativePrompt: 'blurry, low quality, distorted',
          aspectRatio: '9:16',
          visualStyle: 'cinematic',
          cameraMotion: 'slow_zoom_in',
          videoDurationSec: 5,
        },
      },
      {
        id: 'node-3',
        type: 'image_generator',
        title: '🎨 Generador Imagen IA',
        position: { x: 790, y: 80 },
        data: {
          status: 'idle',
          outputMediaType: 'image',
          outputMediaUrl: sampleProduct?.images?.[0] || '',
        },
      },
      {
        id: 'node-4',
        type: 'video_generator',
        title: '🎬 Generador Video IA',
        position: { x: 1160, y: 80 },
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
  // CARGAR Y GUARDAR FLUJOS
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
        alert(`✅ Flujo "${currentFlowName}" guardado con éxito.`);
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
  // INTERACCIÓN Y NAVEGACIÓN EN LIENZO
  // ──────────────────────────────────────────────────────────────────────────
  const handleMouseDownCanvas = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.weavy-node-card')) return;
    setIsPanning(true);
    setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMoveCanvas = (e: React.MouseEvent) => {
    const canvasBounds = canvasRef.current?.getBoundingClientRect();
    if (canvasBounds) {
      setMousePos({
        x: (e.clientX - canvasBounds.left - pan.x) / zoom,
        y: (e.clientY - canvasBounds.top - pan.y) / zoom,
      });
    }

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
    setConnectingFromId(null);
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

  // Iniciar conexión desde puerto de salida
  const handleStartConnection = (e: React.MouseEvent, fromId: string) => {
    e.stopPropagation();
    setConnectingFromId(fromId);
  };

  // Completar conexión al soltar en puerto de entrada de otro nodo
  const handleEndConnection = (e: React.MouseEvent, toId: string) => {
    e.stopPropagation();
    if (connectingFromId && connectingFromId !== toId) {
      // Evitar duplicados
      const exists = connections.some(c => c.fromNodeId === connectingFromId && c.toNodeId === toId);
      if (!exists) {
        setConnections(prev => [...prev, {
          id: `c_${connectingFromId}_${toId}_${Date.now()}`,
          fromNodeId: connectingFromId,
          toNodeId: toId,
        }]);

        // Auto-alimentar datos si es relevante (ej. si conectamos una imagen a un nodo de Prompt)
        const sourceNode = nodes.find(n => n.id === connectingFromId);
        const targetNode = nodes.find(n => n.id === toId);
        if (targetNode && targetNode.type === 'prompt_script' && sourceNode) {
          const img = sourceNode.data.outputMediaUrl || sourceNode.data.sourceImageUrl;
          if (img) {
            setNodes(prev => prev.map(n => n.id === toId ? {
              ...n,
              data: { ...n.data, referenceImageUrl: img }
            } : n));
          }
        }
      }
    }
    setConnectingFromId(null);
  };

  // ──────────────────────────────────────────────────────────────────────────
  // AÑADIR NUEVOS NODOS AL LIENZO (INDEPENDIENTES)
  // ──────────────────────────────────────────────────────────────────────────
  const handleAddNode = (type: WeavyNodeType) => {
    const id = `node-${Date.now().toString().slice(-4)}`;
    const x = Math.round((-pan.x + 120 + Math.random() * 80) / zoom);
    const y = Math.round((-pan.y + 120 + Math.random() * 80) / zoom);

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
        title = '📤 Foto Externa (PC)';
        defaultData = {
          productTitle: 'Foto Externa',
          sourceImageUrl: '',
        };
        break;
      case 'prompt_script':
        title = '✨ Prompt & Referencia';
        defaultData = {
          promptText: 'Commercial advertising shot, cinematic lighting, 8k resolution, elegant product presentation.',
          referenceImageUrl: '',
          aspectRatio: '9:16',
          visualStyle: 'cinematic',
          cameraMotion: 'slow_zoom_in',
          videoDurationSec: 5,
        };
        break;
      case 'image_generator':
        title = '🎨 Generador Imagen IA';
        defaultData = {
          status: 'idle',
          outputMediaType: 'image',
          promptText: '',
          sourceImageUrl: '',
        };
        break;
      case 'video_generator':
        title = '🎬 Generador Video IA';
        defaultData = {
          status: 'idle',
          outputMediaType: 'video',
          videoDurationSec: 5,
          promptText: '',
          sourceImageUrl: '',
        };
        break;
      case 'media_viewer':
        title = '📺 Visor & Export';
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

  const handleDeleteConnection = (connId: string) => {
    setConnections(prev => prev.filter(c => c.id !== connId));
  };

  // ──────────────────────────────────────────────────────────────────────────
  // RESOLVER ANTECESORES (IMAGEN Y PROMPT) PARA CADA NODO
  // ──────────────────────────────────────────────────────────────────────────
  const findUpstreamData = (nodeId: string) => {
    const directInputs = connections.filter(c => c.toNodeId === nodeId).map(c => nodes.find(n => n.id === c.fromNodeId)).filter(Boolean) as WeavyNode[];
    
    let resolvedImage: string | undefined = undefined;
    let resolvedPrompt: string | undefined = undefined;
    let resolvedRatio: '9:16' | '1:1' | '16:9' = '9:16';
    let resolvedDuration = 5;

    // Buscar en entradas directas
    for (const inNode of directInputs) {
      if (inNode.data.sourceImageUrl) resolvedImage = inNode.data.sourceImageUrl;
      if (inNode.data.outputMediaUrl && !resolvedImage) resolvedImage = inNode.data.outputMediaUrl;
      if (inNode.data.referenceImageUrl && !resolvedImage) resolvedImage = inNode.data.referenceImageUrl;
      if (inNode.data.promptText) resolvedPrompt = inNode.data.promptText;
      if (inNode.data.aspectRatio) resolvedRatio = inNode.data.aspectRatio;
      if (inNode.data.videoDurationSec) resolvedDuration = inNode.data.videoDurationSec;
    }

    // Si aún no hay imagen o prompt, buscar 2 niveles atrás
    if (!resolvedImage || !resolvedPrompt) {
      for (const inNode of directInputs) {
        const grandParents = connections.filter(c => c.toNodeId === inNode.id).map(c => nodes.find(n => n.id === c.fromNodeId)).filter(Boolean) as WeavyNode[];
        for (const gp of grandParents) {
          if (!resolvedImage) {
            resolvedImage = gp.data.sourceImageUrl || gp.data.outputMediaUrl || gp.data.referenceImageUrl;
          }
          if (!resolvedPrompt) {
            resolvedPrompt = gp.data.promptText;
          }
        }
      }
    }

    return { resolvedImage, resolvedPrompt, resolvedRatio, resolvedDuration, directInputs };
  };

  // ──────────────────────────────────────────────────────────────────────────
  // GENERAR PROMPT CON ASISTENCIA IA
  // ──────────────────────────────────────────────────────────────────────────
  const handleAIAssistPrompt = async (nodeId: string) => {
    const { resolvedImage, directInputs } = findUpstreamData(nodeId);
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const pTitle = directInputs[0]?.data?.productTitle || 'Producto Novedad';

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
  // EJECUTAR GENERACIÓN DE IMAGEN IA (TOTALMENTE INDEPENDIENTE)
  // ──────────────────────────────────────────────────────────────────────────
  const handleTriggerGenerateImage = async (nodeId: string) => {
    const currentNode = nodes.find(n => n.id === nodeId);
    if (!currentNode) return;

    const { resolvedImage, resolvedPrompt, resolvedRatio } = findUpstreamData(nodeId);

    // Puede tomar prompt de sus entradas o de su propio campo
    const promptText = currentNode.data.promptText || resolvedPrompt || 'Commercial product photography, studio background, luxury lighting, 8k.';
    const sourceImage = currentNode.data.sourceImageUrl || resolvedImage;
    const ratio = currentNode.data.aspectRatio || resolvedRatio || '9:16';

    setGeneratingNodeId(nodeId);
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'generating' } } : n));

    try {
      // 1. INTENTO DIRECTO EN TU TARJETA GRÁFICA RTX 4070 (TÚNEL HTTPS SEGURO O LOCAL)
      let directLocalSuccess = false;
      let directLocalUrl = '';

      const targetEndpoint = (aiEndpoint || (typeof window !== 'undefined' ? localStorage.getItem('foxdrop_ai_station_endpoint') : '') || 'https://follow-mai-enjoy-randy.trycloudflare.com').trim().replace(/\/+$/, '');

      try {
        const localDims = ratio === '9:16' 
          ? { width: 576, height: 1024 }
          : ratio === '16:9'
          ? { width: 1024, height: 576 }
          : { width: 768, height: 768 };

        const localRes = await fetch(`${targetEndpoint}/sdapi/v1/txt2img`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText + ', 8k, photorealistic, cinematic product advertising shot',
            negative_prompt: 'blurry, low quality, distorted',
            width: localDims.width,
            height: localDims.height,
            steps: 25,
            cfg_scale: 7,
          }),
          signal: AbortSignal.timeout(45000),
        });

        if (localRes.ok) {
          const lData = await localRes.json();
          if (lData.images?.[0]) {
            directLocalUrl = 'data:image/png;base64,' + lData.images[0];
            directLocalSuccess = true;
            setStationStatus('online');
          }
        }
      } catch (localErr) {
        // Fallback a la nube
      }

      if (directLocalSuccess && directLocalUrl) {
        setNodes(prev => prev.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'success',
                outputMediaUrl: directLocalUrl,
                outputMediaType: 'image',
                generatedAt: new Date().toLocaleTimeString() + ' (RTX 4070 Local)',
              },
            };
          }
          return n;
        }));
        return;
      }

      // 2. FALLBACK A LA NUBE EN FOXDROP
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
  // EJECUTAR GENERACIÓN DE VIDEO IA (TOTALMENTE INDEPENDIENTE)
  // ──────────────────────────────────────────────────────────────────────────
  const handleTriggerGenerateVideo = async (nodeId: string) => {
    const currentNode = nodes.find(n => n.id === nodeId);
    if (!currentNode) return;

    const { resolvedImage, resolvedPrompt, resolvedRatio, resolvedDuration } = findUpstreamData(nodeId);

    const promptText = currentNode.data.promptText || resolvedPrompt || 'Commercial dynamic video, cinematic motion, smooth studio camera move.';
    const sourceImage = currentNode.data.sourceImageUrl || resolvedImage;
    const ratio = currentNode.data.aspectRatio || resolvedRatio || '9:16';
    const duration = currentNode.data.videoDurationSec || resolvedDuration || 5;

    setGeneratingNodeId(nodeId);
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, data: { ...n.data, status: 'generating' } } : n));

    try {
      // 1. INTENTO DIRECTO EN TU TARJETA GRÁFICA RTX 4070 (TÚNEL HTTPS O LOCALHOST)
      let directLocalSuccess = false;
      let directLocalUrl = '';

      const targetEndpoint = (aiEndpoint || (typeof window !== 'undefined' ? localStorage.getItem('foxdrop_ai_station_endpoint') : '') || 'https://follow-mai-enjoy-randy.trycloudflare.com').trim().replace(/\/+$/, '');

      try {
        const localDims = ratio === '9:16' 
          ? { width: 448, height: 768 }
          : ratio === '16:9'
          ? { width: 768, height: 448 }
          : { width: 512, height: 512 };

        const localRes = await fetch(`${targetEndpoint}/sdapi/v1/txt2img`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: promptText + ', cinematic motion, commercial advertising, 8k, smooth pan',
            negative_prompt: 'static, blurry, low quality',
            width: localDims.width,
            height: localDims.height,
            steps: 20,
            cfg_scale: 7,
            alwayson_scripts: {
              AnimateDiff: {
                args: [
                  {
                    model: 'mm_sdxl_v10_beta.safetensors',
                    enable: true,
                    video_length: 16,
                    fps: 8,
                    loop_number: 0,
                    format: ['GIF', 'MP4'],
                  },
                ],
              },
            },
          }),
          signal: AbortSignal.timeout(90000),
        });

        if (localRes.ok) {
          const lData = await localRes.json();
          if (lData.images?.[0]) {
            const isGif = lData.images[0].startsWith('R0lGOD');
            const mime = isGif ? 'image/gif' : 'video/mp4';
            directLocalUrl = `data:${mime};base64,` + lData.images[0];
            directLocalSuccess = true;
            setStationStatus('online');
          }
        }
      } catch (localErr) {
        // Fallback a la nube
      }

      if (directLocalSuccess && directLocalUrl) {
        setNodes(prev => prev.map(n => {
          if (n.id === nodeId) {
            return {
              ...n,
              data: {
                ...n.data,
                status: 'success',
                outputMediaUrl: directLocalUrl,
                outputMediaType: 'video',
                generatedAt: new Date().toLocaleTimeString() + ' (RTX 4070 Local)',
              },
            };
          }
          return n;
        }));
        return;
      }

      // 2. FALLBACK A LA NUBE EN FOXDROP
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
          sourceImageUrl: sourceImage,
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
  // CARGA DE FOTO DESDE PC (PARA CUALQUIER NODO CON CAMPO DE IMAGEN)
  // ──────────────────────────────────────────────────────────────────────────
  const handleUploadFileToNode = (e: React.ChangeEvent<HTMLInputElement>, nodeId: string, field: 'sourceImageUrl' | 'referenceImageUrl') => {
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
              [field]: b64,
              productTitle: n.data.productTitle || file.name.slice(0, 30),
            },
          };
        }
        return n;
      }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="relative w-full h-[calc(100vh-80px)] min-h-[640px] bg-[#0c0f17] rounded-none md:rounded-3xl overflow-hidden border border-slate-800 shadow-2xl flex flex-col select-none">
      
      {/* 1. BARRA SUPERIOR DE CONTROL ESTILO WEAVY / FIGMA WEAVE */}
      <div className="h-14 border-b border-slate-800/80 bg-[#121624]/95 backdrop-blur-md px-3 sm:px-5 flex items-center justify-between z-30 shrink-0">
        
        {/* Identidad del Tablero */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white shadow-md">
            <Wand2 className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={currentFlowName}
              onChange={e => setCurrentFlowName(e.target.value)}
              className="bg-transparent text-white font-black text-xs sm:text-sm tracking-wide border-b border-transparent hover:border-slate-600 focus:border-indigo-500 focus:outline-none px-1 max-w-[140px] sm:max-w-[240px] truncate"
              title="Haz clic para renombrar este caminito"
            />
            <span className="text-[10px] text-slate-500 font-mono px-2 py-0.5 rounded-full bg-slate-800/80 hidden xs:inline">
              {nodes.length} cajas
            </span>
          </div>
        </div>

        {/* Acciones para Añadir Nodos (Totalmente independientes) */}
        <div className="flex items-center gap-1 sm:gap-1.5 bg-[#181e30] p-1 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => handleAddNode('product_source')}
            className="px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="Añadir caja de Producto del Catálogo"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>+ Catálogo</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('external_upload')}
            className="px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-teal-500/20 text-teal-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="Añadir caja para Subir Foto Externa"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Foto PC</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('prompt_script')}
            className="px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="Añadir caja de Prompt con Referencia de Imagen"
          >
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span>+ Prompt</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('image_generator')}
            className="px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-pink-500/20 text-pink-300 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="Añadir caja Generador de Imágenes IA"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>+ Imagen IA</span>
          </button>
          <button
            type="button"
            onClick={() => handleAddNode('video_generator')}
            className="px-2 sm:px-2.5 py-1.5 rounded-xl hover:bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center gap-1 transition cursor-pointer shrink-0"
            title="Añadir caja Generador de Video (Veo/Omni)"
          >
            <Video className="w-3.5 h-3.5" />
            <span>+ Video IA</span>
          </button>
        </div>

        {/* Acciones de Proyecto (Historial & Guardar Caminito) */}
        <div className="flex items-center gap-2">
          {/* Botón de Estado de Estación RTX 4070 */}
          <button
            type="button"
            onClick={() => {
              setStationModalInput(aiEndpoint);
              setShowStationModal(true);
            }}
            className={`px-2.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition border cursor-pointer ${
              stationStatus === 'online'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : stationStatus === 'checking'
                ? 'bg-amber-500/10 text-amber-400 border-amber-500/40 hover:bg-amber-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/40 hover:bg-rose-500/20'
            }`}
            title="Configurar conexión con tu tarjeta gráfica RTX 4070"
          >
            <span className={`w-2 h-2 rounded-full ${
              stationStatus === 'online'
                ? 'bg-emerald-400 animate-pulse'
                : stationStatus === 'checking'
                ? 'bg-amber-400 animate-ping'
                : 'bg-rose-400'
            }`} />
            <Cpu className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {stationStatus === 'online' ? 'RTX 4070 Online ($0)' : stationStatus === 'checking' ? 'Conectando...' : 'RTX Offline'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSavedModal(true)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition border border-slate-700/60"
            title="Ver caminitos y promociones pasadas"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">Historial</span>
            <span className="text-[10px] text-slate-500 font-mono">({savedFlows.length})</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentFlow}
            disabled={savingFlow}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-xs flex items-center gap-1.5 transition shadow-lg cursor-pointer"
          >
            {savingFlow ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Guardar Caminito</span>
          </button>
        </div>
      </div>

      {/* 2. LIENZO INFINITO INTERACTIVO (CANVAS CON REJILLA) */}
      <div
        ref={canvasRef}
        onMouseDown={handleMouseDownCanvas}
        onMouseMove={handleMouseMoveCanvas}
        onMouseUp={handleMouseUpCanvas}
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

            {/* Cable en construcción si el usuario está arrastrando una conexión */}
            {connectingFromId && (() => {
              const from = nodes.find(n => n.id === connectingFromId);
              if (!from) return null;
              const x1 = from.position.x + 310;
              const y1 = from.position.y + 110;
              const x2 = mousePos.x;
              const y2 = mousePos.y;
              const dx = Math.abs(x2 - x1) * 0.5;
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
              return (
                <path
                  d={pathD}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3"
                  strokeDasharray="4 4"
                  className="animate-pulse"
                />
              );
            })()}

            {/* Conexiones existentes */}
            {connections.map(c => {
              const from = nodes.find(n => n.id === c.fromNodeId);
              const to = nodes.find(n => n.id === c.toNodeId);
              if (!from || !to) return null;

              const x1 = from.position.x + 310;
              const y1 = from.position.y + 110;
              const x2 = to.position.x;
              const y2 = to.position.y + 110;

              const dx = Math.abs(x2 - x1) * 0.5;
              const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

              return (
                <g key={c.id} className="group/cable cursor-pointer pointer-events-auto">
                  <path d={pathD} fill="none" stroke="#000" strokeWidth="8" opacity="0.4" />
                  <path
                    d={pathD}
                    fill="none"
                    stroke="url(#cableGradient)"
                    strokeWidth="3"
                    strokeDasharray="6 4"
                    className="hover:stroke-rose-400 transition"
                  />
                  <circle cx={x1} cy={y1} r="4" fill="#818cf8" />
                  <circle cx={x2} cy={y2} r="4" fill="#ec4899" />
                  {/* Botón para desconectar al hacer clic en el cable */}
                  <circle
                    cx={(x1 + x2) / 2}
                    cy={(y1 + y2) / 2}
                    r="8"
                    fill="#1e293b"
                    stroke="#e11d48"
                    strokeWidth="1.5"
                    className="opacity-0 group-hover/cable:opacity-100 transition"
                    onClick={() => handleDeleteConnection(c.id)}
                  />
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
                className={`weavy-node-card absolute w-[310px] rounded-3xl bg-[#141928]/95 backdrop-blur-xl border-2 transition-shadow duration-150 flex flex-col overflow-hidden shadow-2xl z-10 ${
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
                            <Trash2 className="w-3.5 h-3.5" /> Quitar Foto
                          </button>
                        </div>
                      ) : (
                        <label className="border-2 border-dashed border-slate-700 hover:border-teal-400 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition text-center">
                          <Upload className="w-6 h-6 text-teal-400" />
                          <span className="font-bold text-[11px] text-slate-300">Cargar foto de tu PC</span>
                          <span className="text-[9px] text-slate-500">JPG, PNG o WEBP</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={e => handleUploadFileToNode(e, node.id, 'sourceImageUrl')}
                          />
                        </label>
                      )}
                      <input
                        type="url"
                        placeholder="O pega URL directa de imagen..."
                        value={node.data.sourceImageUrl?.startsWith('data:') ? '' : node.data.sourceImageUrl || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, sourceImageUrl: val } } : n));
                        }}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-slate-300 focus:outline-none focus:border-teal-400"
                      />
                    </div>
                  )}

                  {/* NODO TIPO 3: PROMPT CON IMAGEN DE REFERENCIA / RESPALDO */}
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
                          <span>{isGenerating ? 'Escribiendo...' : 'Asistir con IA'}</span>
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={node.data.promptText || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, promptText: val } } : n));
                        }}
                        placeholder="Describe la atmósfera, iluminación, ángulos y acción..."
                        className="w-full px-2.5 py-2 bg-slate-900/90 border border-slate-800 rounded-xl text-[11px] text-slate-200 focus:outline-none focus:border-purple-400 resize-none leading-relaxed"
                      />

                      {/* LÍNEA DE IMAGEN DE REFERENCIA / RESPALDO */}
                      <div className="p-2.5 rounded-xl bg-purple-950/20 border border-purple-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-purple-300 flex items-center gap-1">
                            <Paperclip className="w-3 h-3 text-purple-400" />
                            Foto de Referencia / Respaldo:
                          </span>
                          {node.data.referenceImageUrl && (
                            <button
                              type="button"
                              onClick={() => setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, referenceImageUrl: '' } } : n))}
                              className="text-[9px] text-rose-400 hover:underline"
                            >
                              Quitar
                            </button>
                          )}
                        </div>

                        {node.data.referenceImageUrl ? (
                          <div className="relative aspect-video rounded-lg bg-black/50 overflow-hidden border border-purple-800/60 flex items-center justify-center">
                            <img
                              src={node.data.referenceImageUrl}
                              alt="Referencia"
                              className="w-full h-full object-contain p-1"
                            />
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <label className="flex-1 py-1.5 px-2 bg-purple-900/30 hover:bg-purple-900/50 rounded-lg border border-purple-700/50 text-[10px] text-purple-200 font-medium flex items-center justify-center gap-1.5 cursor-pointer transition">
                              <Upload className="w-3 h-3" />
                              <span>Cargar foto PC</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={e => handleUploadFileToNode(e, node.id, 'referenceImageUrl')}
                              />
                            </label>
                            <input
                              type="url"
                              placeholder="O URL de referencia..."
                              value={node.data.referenceImageUrl || ''}
                              onChange={e => {
                                const val = e.target.value;
                                setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, referenceImageUrl: val } } : n));
                              }}
                              className="flex-1 px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-[9px] text-slate-300 focus:outline-none focus:border-purple-400"
                            />
                          </div>
                        )}
                      </div>

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
                            <option value="1:1">1:1 (Instagram)</option>
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
                            <option value="smoke_atmospheric">Atmósfera humo</option>
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

                      {/* Prompt independiente propio opcional si no viene conectado */}
                      <textarea
                        rows={2}
                        value={node.data.promptText || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, promptText: val } } : n));
                        }}
                        placeholder="Escribe prompt aquí (o conecta un nodo anterior)..."
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-slate-300 focus:outline-none focus:border-pink-500 resize-none"
                      />

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

                      {/* Prompt independiente propio opcional si no viene conectado */}
                      <textarea
                        rows={2}
                        value={node.data.promptText || ''}
                        onChange={e => {
                          const val = e.target.value;
                          setNodes(prev => prev.map(n => n.id === node.id ? { ...n, data: { ...n.data, promptText: val } } : n));
                        }}
                        placeholder="Escribe prompt de video aquí (o conecta un nodo anterior)..."
                        className="w-full px-2 py-1.5 bg-slate-900 border border-slate-800 rounded-xl text-[10px] text-slate-300 focus:outline-none focus:border-rose-500 resize-none"
                      />

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

                {/* PUERTOS INTERACTIVOS DE ENTRADA Y SALIDA */}
                <div className="h-7 bg-[#0e121e] border-t border-slate-800/80 px-3 flex items-center justify-between text-[10px] text-slate-500">
                  <div
                    onMouseUp={e => handleEndConnection(e, node.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-indigo-950/80 cursor-pointer text-indigo-400 transition"
                    title="Soltar cable aquí para conectar entrada"
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 border border-white/40 ring-2 ring-indigo-500/20" />
                    <span className="font-semibold text-[9px]">Entrada</span>
                  </div>

                  <div
                    onMouseDown={e => handleStartConnection(e, node.id)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-pink-950/80 cursor-pointer text-pink-400 transition"
                    title="Arrastra desde aquí para conectar a otra caja"
                  >
                    <span className="font-semibold text-[9px]">Conectar</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-pink-500 border border-white/40 ring-2 ring-pink-500/20" />
                  </div>
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
        <div className="absolute bottom-4 left-4 z-20 pointer-events-none bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-2xl border border-slate-800 text-[10px] text-slate-400">
          💡 <strong>Nodos independientes:</strong> Agrega cajas, arrastra desde el botón <span className="text-pink-400 font-bold">Conectar</span> hacia <span className="text-indigo-400 font-bold">Entrada</span>, o úsalas por separado.
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
                  className="p-3 bg-slate-900/60 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/60 rounded-2xl cursor-pointer transition flex flex-col gap-2 group"
                >
                  <div className="aspect-square rounded-xl bg-black/40 overflow-hidden flex items-center justify-center">
                    <img
                      src={p.images?.[0] || '/no-image.svg'}
                      alt={p.title}
                      className="w-full h-full object-contain p-1 group-hover:scale-105 transition"
                    />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-white line-clamp-2">{p.title}</h5>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">SKU: {p.sku}</p>
                    <p className="text-xs font-black text-emerald-400 mt-1">${p.publicPrice?.toLocaleString()} MXN</p>
                  </div>
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
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">Historial de Caminitos y Promociones</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {loadingFlows ? (
                <div className="text-center py-8 text-slate-500 text-xs">Cargando flujos guardados...</div>
              ) : savedFlows.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">No hay caminitos guardados todavía.</div>
              ) : (
                savedFlows.map(f => (
                  <div
                    key={f.id}
                    className="p-3 bg-slate-900/60 hover:bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between transition"
                  >
                    <div>
                      <h4 className="font-bold text-white text-xs">{f.name}</h4>
                      <p className="text-[10px] text-slate-500">
                        {f.nodes?.length || 0} cajas • Guardado: {new Date(f.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadFlow(f)}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
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
      {/* MODAL 3: VISTA PREVIA FULLSCREEN DE IMAGEN O VIDEO */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {mediaPreviewUrl && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setMediaPreviewUrl(null)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            {mediaPreviewUrl.type === 'image' ? (
              <img
                src={mediaPreviewUrl.url}
                alt={mediaPreviewUrl.title}
                className="max-h-[80vh] w-auto rounded-2xl object-contain shadow-2xl border border-slate-800"
              />
            ) : (
              <video
                src={mediaPreviewUrl.url}
                controls
                autoPlay
                className="max-h-[80vh] w-auto rounded-2xl shadow-2xl border border-slate-800"
              />
            )}
            <div className="mt-3 flex items-center gap-3">
              <a
                href={mediaPreviewUrl.url}
                download
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Archivo</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: CONFIGURACIÓN DE ESTACIÓN LOCAL RTX 4070 */}
      {/* ────────────────────────────────────────────────────────────────────────── */}
      {showStationModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121624] border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setShowStationModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-base">Estación Local de IA (RTX 4070)</h3>
                <p className="text-xs text-slate-400">Generación publicitaria ilimitada a $0 MXN en tu tarjeta gráfica</p>
              </div>
            </div>

            {/* Estado Actual */}
            <div className={`p-4 rounded-2xl border mb-4 flex items-center justify-between ${
              stationStatus === 'online'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className={`w-3 h-3 rounded-full ${
                  stationStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`} />
                <div>
                  <p className="font-black text-xs">
                    {stationStatus === 'online' ? 'Estación Conectada y Lista' : 'Estación Desconectada'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {stationStatus === 'online'
                      ? 'NVIDIA GeForce RTX 4070 (12GB VRAM) activa para generar'
                      : 'Abre el acceso FoxDrop_Estacion_IA en tu Escritorio'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={testingStation}
                onClick={() => checkStationHealth(stationModalInput)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-600/60 flex items-center gap-1 transition"
              >
                {testingStation ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                <span>Probar</span>
              </button>
            </div>

            {/* Input URL Túnel HTTPS */}
            <div className="space-y-2 mb-4">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>URL Segura HTTPS (Túnel Cloudflare o Subdominio)</span>
                <span className="text-[10px] text-emerald-400 font-normal">Cifrado SSL Oficial</span>
              </label>
              <input
                type="url"
                value={stationModalInput}
                onChange={e => setStationModalInput(e.target.value)}
                placeholder="https://follow-mai-enjoy-randy.trycloudflare.com"
                className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-indigo-500 transition"
              />
              <p className="text-[11px] text-slate-400">
                Pega aquí el enlace verde que te entrega tu consola al abrir <code className="text-indigo-400 bg-slate-800 px-1 py-0.5 rounded">FoxDrop_Estacion_IA.bat</code> o tu subdominio oficial <code className="text-indigo-400 bg-slate-800 px-1 py-0.5 rounded">https://ai.foxdrop.mx</code>.
              </p>
            </div>

            {/* Guía Rápida */}
            <div className="p-3.5 bg-slate-900/60 rounded-2xl border border-slate-800 text-[11px] text-slate-300 space-y-1.5 mb-5">
              <p className="font-bold text-white flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ¿Cómo funciona la conexión segura?
              </p>
              <p className="text-slate-400 leading-relaxed">
                Gracias al túnel Cloudflare, tus solicitudes desde <strong>admin.foxdrop.mx</strong> viajan cifradas por HTTPS hacia tu RTX 4070 física sin bloqueos de navegador ni costos de API en la nube.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStationModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const success = await checkStationHealth(stationModalInput);
                  if (success) {
                    setShowStationModal(false);
                  } else {
                    alert('No se pudo establecer conexión con esa URL. Asegúrate de tener la estación iniciada en tu PC.');
                  }
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg"
              >
                Guardar y Conectar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
