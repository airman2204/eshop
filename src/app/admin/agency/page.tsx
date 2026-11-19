"use client";

import React, { useState } from "react";
import {
  Check,
  RefreshCw,
  Send,
  Plus,
  Calendar,
  TrendingUp,
  CheckCircle2,
  Clock,
  ChevronDown,
  Sparkles,
  MessageSquare,
} from "lucide-react";
import VirtualOfficeMap, { OfficeAgent } from "@/components/agency/VirtualOfficeMap";
import { useAgencyRealtime } from "@/hooks/useAgencyRealtime";

interface ApprovalPiece {
  id: string;
  title: string;
  agentId: string;
  agentLabel: string;
  platform: "Instagram Reel" | "TikTok" | "Instagram Story";
  schedule: string;
  imageUrl: string;
  caption: string;
  status: "pending" | "approved";
}

interface ActivityLog {
  id: string;
  time: string;
  text: string;
  highlight?: boolean;
}

const INITIAL_AGENTS: OfficeAgent[] = [
  {
    id: "mateo",
    name: "Mateo",
    role: "CMO",
    homeTop: "26%",
    homeLeft: "19%",
    currentTop: "26%",
    currentLeft: "19%",
    status: "active",
    bubbleText: "Listo para iniciar",
    avatarColor: "#1E4D43",
    hairColor: "#111827",
    emoji: "🦊",
  },
  {
    id: "valeria",
    name: "Valeria",
    role: "Copy",
    homeTop: "72%",
    homeLeft: "15%",
    currentTop: "72%",
    currentLeft: "15%",
    status: "active",
    bubbleText: "En espera",
    avatarColor: "#255C50",
    hairColor: "#78350F",
    emoji: "✍️",
  },
  {
    id: "diego",
    name: "Diego",
    role: "Arte/Flux",
    homeTop: "72%",
    homeLeft: "24%",
    currentTop: "72%",
    currentLeft: "24%",
    status: "active",
    bubbleText: "En espera",
    avatarColor: "#D96B27",
    hairColor: "#1F2937",
    emoji: "🎨",
  },
  {
    id: "andres",
    name: "Andrés",
    role: "Ads",
    homeTop: "28%",
    homeLeft: "74%",
    currentTop: "28%",
    currentLeft: "74%",
    status: "active",
    bubbleText: "En espera",
    avatarColor: "#1F4E45",
    hairColor: "#374151",
    emoji: "📊",
  },
  {
    id: "camila",
    name: "Camila",
    role: "Community",
    homeTop: "28%",
    homeLeft: "85%",
    currentTop: "28%",
    currentLeft: "85%",
    status: "active",
    bubbleText: "En espera",
    avatarColor: "#2B6CB0",
    hairColor: "#92400E",
    emoji: "📱",
  },
  {
    id: "sofia",
    name: "Sofía",
    role: "Ventas WA",
    homeTop: "74%",
    homeLeft: "78%",
    currentTop: "74%",
    currentLeft: "78%",
    status: "active",
    bubbleText: "En espera",
    avatarColor: "#10B981",
    hairColor: "#451A03",
    emoji: "💬",
  },
  {
    id: "bruno",
    name: "Bruno",
    role: "Analista",
    homeTop: "63%",
    homeLeft: "74%",
    currentTop: "63%",
    currentLeft: "74%",
    status: "active",
    bubbleText: "En espera",
    avatarColor: "#0F766E",
    hairColor: "#111827",
    emoji: "📈",
  },
];

const INITIAL_PIECES: ApprovalPiece[] = [];

const INITIAL_LOGS: ActivityLog[] = [];

export default function AgencyCommandCenterPage() {
  const {
    agentStates: dbAgents,
    deliverables: dbDeliverables,
    activityLogs: dbLogs,
    metrics: dbMetrics,
    isConnected,
    approveDeliverable,
    updateDeliverableCaption,
    sendAgentFeedback,
    logActivity,
  } = useAgencyRealtime();

  const [agents, setAgents] = useState<OfficeAgent[]>(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("diego");
  const [campaign, setCampaign] = useState("Semana 1: Drops Exclusivos WhatsApp");
  const [activeTab, setActiveTab] = useState<"approve" | "calendar" | "roi">("approve");
  const [pieces, setPieces] = useState<ApprovalPiece[]>(INITIAL_PIECES);
  const [currentPieceIndex, setCurrentPieceIndex] = useState(0);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [chatInput, setChatInput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  // Sincronizar agentes desde Supabase Realtime cuando existan filas en agent_states
  React.useEffect(() => {
    if (dbAgents.length === 0) return;
    setAgents((prev) =>
      prev.map((local) => {
        const remote = dbAgents.find((r) => r.agent_id === local.id);
        if (!remote) return local;
        return {
          ...local,
          name: remote.name,
          role: remote.role,
          currentTop: `${remote.current_y}%`,
          currentLeft: `${remote.current_x}%`,
          isMoving: remote.status === "walking",
          status:
            remote.status === "waiting_approval"
              ? "review"
              : remote.status === "working" || remote.status === "walking"
              ? "working"
              : "active",
          bubbleText: remote.speech_bubble || local.bubbleText,
        };
      })
    );
  }, [dbAgents]);

  // Sincronizar entregables desde Supabase Realtime
  React.useEffect(() => {
    if (dbDeliverables.length === 0) return;
    setPieces(
      dbDeliverables.map((d) => ({
        id: d.id,
        title: d.hook_text || "Pieza de Campaña",
        agentId: d.created_by_agents?.[0] || "diego",
        agentLabel: (d.created_by_agents || ["Diego", "Valeria"]).join(" & "),
        platform:
          d.platform === "tiktok"
            ? "TikTok"
            : d.platform === "instagram_post"
            ? "Instagram Story"
            : "Instagram Reel",
        schedule: d.scheduled_date
          ? new Date(d.scheduled_date).toLocaleDateString("es-MX", {
              weekday: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Por programar",
        imageUrl:
          d.image_url ||
          "https://images.unsplash.com/photo-1616949755610-8c9bbc08f138?auto=format&fit=crop&w=800&q=80",
        caption: d.caption_text,
        status: d.status === "approved" || d.status === "published" ? "approved" : "pending",
      }))
    );
  }, [dbDeliverables]);

  // Sincronizar logs desde Supabase Realtime
  React.useEffect(() => {
    if (dbLogs.length === 0) return;
    setLogs(
      dbLogs.map((l) => ({
        id: l.id,
        time: new Date(l.created_at).toLocaleTimeString("es-MX", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        text: l.action_message,
        highlight: true,
      }))
    );
  }, [dbLogs]);

  const pendingPieces = pieces.filter((p) => p.status === "pending");
  const activePiece = pendingPieces[currentPieceIndex] || pendingPieces[0] || pieces[0];
  const selectedAgent = agents.find((a) => a.id === selectedAgentId) || agents[0];

  const appendLog = (text: string, highlight = false) => {
    const now = new Date();
    const time = now.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    });
    setLogs((prev) => [...prev.slice(-5), { id: `log-${Date.now()}`, time, text, highlight }]);
  };

  const handleUpdateCaption = (newCaption: string) => {
    if (!activePiece) return;
    setPieces((prev) =>
      prev.map((p) => (p.id === activePiece.id ? { ...p, caption: newCaption } : p))
    );
  };

  const handleApprovePiece = () => {
    if (!activePiece || activePiece.status === "approved") return;

    setPieces((prev) =>
      prev.map((p) => (p.id === activePiece.id ? { ...p, status: "approved" } : p))
    );
    setCurrentPieceIndex(0);

    // Move Diego/Valeria toward Camila on approval, then return
    setAgents((prev) =>
      prev.map((a) =>
        a.id === activePiece.agentId
          ? {
              ...a,
              currentTop: "32%",
              currentLeft: "81%",
              status: "approved",
              bubbleText: "Entregado a Camila ✓",
              isMoving: true,
            }
          : a.id === "camila"
          ? { ...a, status: "approved", bubbleText: "Programando pieza ✓" }
          : a
      )
    );

    appendLog(`Aprobaste "${activePiece.title}" → enviado a Camila (${activePiece.platform})`, true);

    setTimeout(() => {
      setAgents((prev) =>
        prev.map((a) =>
          a.id === activePiece.agentId
            ? {
                ...a,
                currentTop: a.homeTop,
                currentLeft: a.homeLeft,
                isMoving: false,
                status: "active",
                bubbleText: "Listo para siguiente",
              }
            : a
        )
      );
    }, 2400);
  };

  const handleGenerateWeek = async () => {
    if (isGeneratingWeek) return;
    setIsGeneratingWeek(true);
    appendLog("Iniciando nueva campaña semanal con Mateo, Valeria y Diego...", true);

    // Mover inmediatamente a Mateo al Estudio Creativo y poner a Valeria/Diego a trabajar
    setAgents((prev) =>
      prev.map((a) =>
        a.id === "mateo"
          ? { ...a, currentTop: "64%", currentLeft: "20%", status: "working", bubbleText: "Entregando estrategia..." }
          : a.id === "valeria"
          ? { ...a, status: "working", bubbleText: "Redactando 5 copys..." }
          : a.id === "diego"
          ? { ...a, status: "working", bubbleText: "Componiendo visual real..." }
          : a
      )
    );

    try {
      const res = await fetch("/api/agency/generate-week", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekLabel: campaign, theme: "Drops Exclusivos Bath & Body Works" }),
      });
      const data = await res.json();
      if (data?.ok) {
        appendLog(`Campaña lista: ${data.count} piezas reales guardadas en Mesa de Aprobación`, true);
        if (Array.isArray(data.deliverables) && data.deliverables.length > 0) {
          setPieces(
            data.deliverables.map((d: any) => ({
              id: d.id,
              title: d.hook_text || "Pieza de Campaña",
              agentId: "diego",
              agentLabel: "Valeria & Diego",
              platform:
                d.platform === "tiktok"
                  ? "TikTok"
                  : d.platform === "instagram_post"
                  ? "Instagram Story"
                  : "Instagram Reel",
              schedule: d.scheduled_date
                ? new Date(d.scheduled_date).toLocaleDateString("es-MX", {
                    weekday: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Por programar",
              imageUrl: d.image_url || "",
              caption: d.caption_text || "",
              status: "pending",
            }))
          );
        }
        setAgents((prev) =>
          prev.map((a) =>
            a.id === "mateo"
              ? { ...a, currentTop: a.homeTop, currentLeft: a.homeLeft, status: "active", bubbleText: "Estrategia lista ✓" }
              : a.id === "valeria"
              ? { ...a, currentTop: "52%", currentLeft: "47%", status: "review", bubbleText: "Copys en mesa" }
              : a.id === "diego"
              ? { ...a, currentTop: "52%", currentLeft: "53%", status: "review", bubbleText: "Visual listo en mesa" }
              : a
          )
        );
      } else {
        appendLog(data?.error || "Error al generar la campaña semanal");
      }
    } catch {
      appendLog("Error de conexión al generar la campaña semanal");
    } finally {
      setIsGeneratingWeek(false);
    }
  };

  const handleRegenerate = async () => {
    if (!activePiece || isRefining) return;
    setIsRefining(true);
    setAgents((prev) =>
      prev.map((a) =>
        a.id === "diego"
          ? { ...a, status: "working", bubbleText: "Regenerando composición..." }
          : a
      )
    );
    appendLog(`Diego está regenerando "${activePiece.title}" con inventario real...`);
    try {
      await fetch("/api/agency/refine-deliverable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliverableId: activePiece.id }),
      });
    } catch {
      appendLog("Error al regenerar el visual");
    } finally {
      setIsRefining(false);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const msg = chatInput.trim();
    setChatInput("");

    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgentId
          ? { ...a, status: "working", bubbleText: "Aplicando ajuste..." }
          : a
      )
    );
    appendLog(`Ajuste para ${selectedAgent.name}: "${msg}"`, true);

    if (activePiece && (selectedAgentId === "diego" || selectedAgentId === "valeria")) {
      setIsRefining(true);
      try {
        await fetch("/api/agency/refine-deliverable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliverableId: activePiece.id, feedbackNotes: msg }),
        });
      } finally {
        setIsRefining(false);
      }
    }
  };

  const handleSimulateFlow = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    appendLog("1/4 Mateo lleva la estrategia semanal al Estudio Creativo...", true);

    // Paso 1: Mateo camina al Estudio Creativo (Valeria y Diego)
    setAgents((prev) =>
      prev.map((a) =>
        a.id === "mateo"
          ? { ...a, currentTop: "64%", currentLeft: "20%", status: "working", bubbleText: "Entregando estrategia" }
          : a
      )
    );

    // Paso 2: Mateo regresa; Valeria, Diego, Andrés y Camila se reúnen en Mesa de Aprobación
    setTimeout(() => {
      appendLog("2/4 Valeria, Diego, Andrés y Camila se reúnen en Mesa de Aprobación");
      setAgents((prev) =>
        prev.map((a) =>
          a.id === "mateo"
            ? { ...a, currentTop: a.homeTop, currentLeft: a.homeLeft, status: "active", bubbleText: "Estrategia entregada ✓" }
            : a.id === "valeria"
            ? { ...a, currentTop: "52%", currentLeft: "44%", status: "review", bubbleText: "Copy lista en mesa" }
            : a.id === "diego"
            ? { ...a, currentTop: "52%", currentLeft: "50%", status: "review", bubbleText: "Arte listo en mesa" }
            : a.id === "andres"
            ? { ...a, currentTop: "48%", currentLeft: "56%", status: "working", bubbleText: "Revisando Ads" }
            : a.id === "camila"
            ? { ...a, currentTop: "56%", currentLeft: "56%", status: "working", bubbleText: "Recogiendo piezas" }
            : a
        )
      );
    }, 1800);

    // Paso 3: Camila y Andrés vuelven a Redes; Sofía y Bruno suben a coordinar leads y ROI
    setTimeout(() => {
      appendLog("3/4 Camila y Andrés lanzan campaña; Sofía y Bruno suben a coordinar leads", true);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === "valeria" || a.id === "diego"
            ? { ...a, currentTop: a.homeTop, currentLeft: a.homeLeft, status: "approved", bubbleText: "Entregado ✓" }
            : a.id === "camila"
            ? { ...a, currentTop: a.homeTop, currentLeft: a.homeLeft, status: "working", bubbleText: "Programando Reels/TikTok" }
            : a.id === "andres"
            ? { ...a, currentTop: a.homeTop, currentLeft: a.homeLeft, status: "working", bubbleText: "Campaña Meta Ads ON" }
            : a.id === "sofia"
            ? { ...a, currentTop: "38%", currentLeft: "78%", status: "working", bubbleText: "Conectando WhatsApp VIP" }
            : a.id === "bruno"
            ? { ...a, currentTop: "38%", currentLeft: "72%", status: "working", bubbleText: "Midiendo conversión" }
            : a
        )
      );
    }, 3600);

    // Paso 4: Tráfico hacia Sofía (Ventas WA) y Bruno (ROI), y todos vuelven a sus puestos
    setTimeout(() => {
      appendLog("4/4 Sofía recibe +18 leads VIP en WhatsApp y Bruno calcula ROI +24%", true);
      setAgents((prev) =>
        prev.map((a) => ({
          ...a,
          currentTop: a.homeTop,
          currentLeft: a.homeLeft,
          status: a.id === "sofia" || a.id === "bruno" ? "approved" : "active",
          bubbleText:
            a.id === "sofia"
              ? "+18 leads en grupo VIP"
              : a.id === "bruno"
              ? "ROI +24% esta semana"
              : a.id === "camila"
              ? "5 piezas programadas ✓"
              : a.id === "andres"
              ? "Ads activos ✓"
              : a.bubbleText,
        }))
      );
      setIsSimulating(false);
    }, 5600);
  };

  return (
    <div className="min-h-screen bg-[#14352F] text-emerald-50 flex flex-col">
      {/* 1. HEADER SUPERIOR */}
      <header className="border-b border-emerald-800/70 bg-[#0D2420]/95 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
          {/* Brand + Title + Campaign Selector */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#D96B27]/20 border border-[#D96B27]/50">
                <span className="text-xl leading-none">🦊</span>
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white">
                  Agency Command Center
                </h1>
                <div className="flex items-center gap-1 text-xs text-emerald-300/80">
                  <select
                    value={campaign}
                    onChange={(e) => setCampaign(e.target.value)}
                    className="bg-transparent font-medium text-emerald-200 focus:outline-none cursor-pointer"
                  >
                    <option value="Semana 1: Drops Exclusivos WhatsApp" className="bg-[#0D2420]">
                      Semana 1: Drops Exclusivos WhatsApp
                    </option>
                    <option value="Semana 2: Bath & Body Works Gift Sets" className="bg-[#0D2420]">
                      Semana 2: Bath &amp; Body Works Gift Sets
                    </option>
                  </select>
                  <ChevronDown className="h-3 w-3 opacity-70" />
                </div>
              </div>
            </div>

            {/* Real-time Status Pills */}
            <div className="hidden xl:flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#10B981]/40 bg-[#10B981]/15 px-3 py-1 text-xs font-medium text-[#10B981]">
                <Check className="h-3 w-3" /> Estrategia
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D96B27]/40 bg-[#D96B27]/15 px-3 py-1 text-xs font-medium text-[#FDBA74]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D96B27]" /> Producción Creativa
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">
                <Clock className="h-3 w-3" /> {pendingPieces.length} Piezas por Aprobar
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#10B981]/40 bg-[#10B981]/15 px-3 py-1 text-xs font-medium text-[#10B981]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#10B981] animate-pulse" /> Ventas Activas
              </span>
            </div>
          </div>

          {/* Primary Action */}
          <button
            type="button"
            onClick={handleGenerateWeek}
            disabled={isGeneratingWeek}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#D96B27] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#D96B27]/25 transition hover:bg-[#c55e1e] disabled:opacity-60"
          >
            <Plus className={`h-4 w-4 ${isGeneratingWeek ? "animate-spin" : ""}`} />
            {isGeneratingWeek ? "Generando 5 piezas..." : "Nueva Campaña Semanal"}
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE: 68% LEFT MAP + 32% RIGHT INSPECTOR */}
      <main className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        {/* 2. OFICINA VIRTUAL ESTILO GATHER TOWN (68% -> 8 cols) */}
        <section className="lg:col-span-8">
          <VirtualOfficeMap
            agents={agents}
            selectedAgentId={selectedAgentId}
            onSelectAgent={setSelectedAgentId}
            onSimulateFlow={handleSimulateFlow}
            isSimulating={isSimulating}
          />
        </section>

        {/* 3. PANEL INSPECTOR Y COLA DE APROBACIÓN (32% -> 4 cols) */}
        <aside className="lg:col-span-4 flex flex-col rounded-2xl border border-emerald-800/60 bg-[#0D2420] shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-3 border-b border-emerald-800/60 bg-[#0A1C19]">
            <button
              type="button"
              onClick={() => setActiveTab("approve")}
              className={`flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${
                activeTab === "approve"
                  ? "border-b-2 border-[#D96B27] text-white bg-[#0D2420]"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              Por Aprobar
              <span className="rounded-full bg-[#D96B27] px-1.5 py-0.5 text-[10px] font-bold text-white">
                {pendingPieces.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${
                activeTab === "calendar"
                  ? "border-b-2 border-[#D96B27] text-white bg-[#0D2420]"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              <Calendar className="h-3.5 w-3.5" /> Calendario
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("roi")}
              className={`flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${
                activeTab === "roi"
                  ? "border-b-2 border-[#D96B27] text-white bg-[#0D2420]"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" /> Historial &amp; ROI
            </button>
          </div>

          {/* Selected Agent Header */}
          <div className="flex items-center justify-between border-b border-emerald-800/50 px-4 py-3 bg-[#112D28]/60">
            <div className="flex items-center gap-2.5">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D96B27] text-base"
                style={{ backgroundColor: selectedAgent.avatarColor }}
              >
                {selectedAgent.emoji}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
                  {selectedAgent.name} · {selectedAgent.role}
                </p>
                <p className="text-[11px] text-emerald-300/80">{selectedAgent.bubbleText}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#10B981]/15 px-2 py-0.5 text-[10px] font-semibold text-[#10B981]">
              ● Activo
            </span>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activeTab === "approve" && !activePiece && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-800/80 bg-[#14352F]/40 p-6 text-center">
                <span className="text-3xl mb-2">🦊</span>
                <p className="text-xs font-bold text-white">Sin piezas por aprobar</p>
                <p className="mt-1 text-[11px] text-emerald-300/80">
                  Presiona <strong>+ Nueva Campaña Semanal</strong> para generar tus 5 piezas reales con productos de tu inventario.
                </p>
              </div>
            )}

            {activeTab === "approve" && activePiece && (
              <>
                <div className="flex items-center justify-between text-[11px] text-emerald-200/80">
                  <span className="rounded-md border border-[#D96B27]/40 bg-[#D96B27]/15 px-2 py-0.5 font-medium text-[#FDBA74]">
                    {activePiece.platform}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-emerald-400" /> {activePiece.schedule}
                  </span>
                </div>

                {/* Creative Preview */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-emerald-800/70 bg-[#14352F]">
                  <img
                    src={activePiece.imageUrl}
                    alt={activePiece.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-2 left-2 rounded-md bg-[#D96B27] px-2 py-0.5 text-[10px] font-bold uppercase text-white shadow">
                    Drop Limitado
                  </div>
                </div>

                {/* Editable Caption */}
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">
                    <span>Caption · Editable</span>
                    <Sparkles className="h-3 w-3 text-[#D96B27]" />
                  </label>
                  <textarea
                    rows={4}
                    value={activePiece.caption}
                    onChange={(e) => handleUpdateCaption(e.target.value)}
                    className="w-full rounded-xl border border-emerald-800/70 bg-[#14352F] p-2.5 text-xs leading-relaxed text-emerald-50 focus:border-[#D96B27] focus:outline-none"
                  />
                </div>

                {/* Action Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleApprovePiece}
                    disabled={activePiece.status === "approved"}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D96B27] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#c55e1e] disabled:bg-[#10B981] disabled:opacity-90"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {activePiece.status === "approved"
                      ? "Aprobado y Enviado a Camila"
                      : "✓ Aprobar y Enviar a Camila"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={isRefining}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700/80 bg-[#14352F] px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:bg-emerald-900/60 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isRefining ? "animate-spin" : ""}`} />
                    {isRefining ? "Regenerando visual..." : "↻ Regenerar"}
                  </button>
                </div>
              </>
            )}

            {activeTab === "calendar" && (
              <div className="space-y-2.5">
                {pieces.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-xl border border-emerald-800/60 bg-[#14352F]/70 p-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-white">{p.title}</p>
                      <p className="text-[11px] text-emerald-300/80">
                        {p.platform} · {p.schedule}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        p.status === "approved"
                          ? "bg-[#10B981]/20 text-[#10B981]"
                          : "bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {p.status === "approved" ? "Aprobado" : "Pendiente"}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "roi" && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-xl border border-emerald-800/60 bg-[#14352F]/70 p-3">
                  <p className="text-[11px] text-emerald-300/80">Miembros en WhatsApp</p>
                  <p className="mt-1 text-xl font-black text-[#10B981]">
                    {dbMetrics.reduce((acc, m) => acc + (m.new_group_members || 0), 0)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-800/60 bg-[#14352F]/70 p-3">
                  <p className="text-[11px] text-emerald-300/80">Ventas Cerradas</p>
                  <p className="mt-1 text-xl font-black text-[#D96B27]">
                    ${dbMetrics.reduce((acc, m) => acc + Number(m.closed_sales_mxn || 0), 0)} MXN
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Agent Chat */}
          <form
            onSubmit={handleSendChat}
            className="border-t border-emerald-800/60 bg-[#0A1C19] p-3"
          >
            <div className="flex items-center gap-2 rounded-xl border border-emerald-800/80 bg-[#14352F] px-3 py-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={`Pide un ajuste a ${selectedAgent.name}...`}
                className="w-full bg-transparent text-xs text-white placeholder-emerald-300/50 focus:outline-none"
              />
              <button
                type="submit"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#D96B27] text-white transition hover:bg-[#c55e1e]"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </aside>
      </main>

      {/* 4. BARRA INFERIOR DE ACTIVIDAD EN VIVO */}
      <footer className="border-t border-emerald-800/70 bg-[#0D2420]/95 px-4 py-3">
        <div className="mx-auto max-w-[1600px]">
          <div className="mb-2 flex items-center justify-between text-[11px] text-emerald-300/80">
            <span className="flex items-center gap-1.5 font-semibold text-white">
              <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
              Actividad en vivo
            </span>
            <span>Traspasos entre agentes</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`min-w-[240px] flex-1 rounded-xl border px-3 py-2 text-xs ${
                  log.highlight
                    ? "border-[#D96B27]/60 bg-[#D96B27]/10 text-orange-100"
                    : "border-emerald-800/60 bg-[#14352F]/70 text-emerald-100"
                }`}
              >
                <p className="text-[10px] font-bold text-[#D96B27]">{log.time}</p>
                <p className="mt-0.5 truncate text-[11px]">{log.text}</p>
              </div>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
