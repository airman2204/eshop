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
  Download,
} from "lucide-react";
import dynamic from "next/dynamic";
import { OfficeAgent } from "@/components/agency/VirtualOfficeMap";
import { officeEvents } from "@/components/agency/phaser/officeEvents";
import { useAgencyRealtime } from "@/hooks/useAgencyRealtime";

const VirtualOffice = dynamic(() => import("@/components/agency/VirtualOffice"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-[4/3] rounded-2xl border border-emerald-800/60 bg-[#0D2420] flex items-center justify-center text-xs text-emerald-300">
      Cargando Oficina Virtual Phaser 3...
    </div>
  ),
});

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
    upsertMetric,
    logActivity,
  } = useAgencyRealtime();

  const [agents, setAgents] = useState<OfficeAgent[]>(INITIAL_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>("diego");
  const [campaign, setCampaign] = useState("Semana 1: Drops Exclusivos WhatsApp");
  const [activeTab, setActiveTab] = useState<"approve" | "calendar" | "whatsapp" | "roi">("approve");
  const [calendarView, setCalendarView] = useState<"week" | "month">("week");
  const [pieces, setPieces] = useState<ApprovalPiece[]>(INITIAL_PIECES);
  const [currentPieceIndex, setCurrentPieceIndex] = useState(0);
  const [logs, setLogs] = useState<ActivityLog[]>(INITIAL_LOGS);
  const [chatInput, setChatInput] = useState("");
  const [isSimulating, setIsSimulating] = useState(false);
  const [isGeneratingWeek, setIsGeneratingWeek] = useState(false);
  const [isPlanningStrategy, setIsPlanningStrategy] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [workflowStep, setWorkflowStep] = useState<"idle" | "strategy_review" | "creative_review">("idle");
  const [agentReply, setAgentReply] = useState<string>("");
  const [isChatting, setIsChatting] = useState(false);
  const [strategyProposal, setStrategyProposal] = useState(
    "Generando plan semanal detallado..."
  );

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

  const playWorkDoneSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [587.33, 880].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.08, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.26);
      });
    } catch {}
  };

  const handleUpdateCaption = (newCaption: string) => {
    if (!activePiece) return;
    setPieces((prev) =>
      prev.map((p) => (p.id === activePiece.id ? { ...p, caption: newCaption } : p))
    );
  };

  const handleApprovePiece = async () => {
    if (!activePiece || activePiece.status === "approved") return;

    setPieces((prev) =>
      prev.map((p) => (p.id === activePiece.id ? { ...p, status: "approved" } : p))
    );
    setCurrentPieceIndex(0);

    try {
      await navigator.clipboard.writeText(activePiece.caption);
    } catch {}

    await approveDeliverable(activePiece.id);
    await upsertMetric(activePiece.id, { clicks_to_whatsapp: 0, new_group_members: 0, closed_sales_mxn: 0 });
    await logActivity("admin", "camila", `Aprobada "${activePiece.title}" → lista para publicar`);

    officeEvents.emit("agent:move", { agentId: "diego", targetPoint: "camila", status: "Activo" });
    officeEvents.emit("agent:move", { agentId: "camila", targetPoint: "camila", status: "Trabajando" });

    appendLog(`✓ Aprobada "${activePiece.title}" (caption copiado al portapapeles)`, true);

    setTimeout(() => {
      officeEvents.emit("agent:move", { agentId: "diego", targetPoint: "diego", status: "Activo" });
    }, 2400);
  };

  const handleGenerateWeek = async () => {
    if (isGeneratingWeek || isPlanningStrategy) return;
    setIsPlanningStrategy(true);
    setWorkflowStep("strategy_review");
    setSelectedAgentId("mateo");
    setActiveTab("approve");
    setStrategyProposal("Mateo está armando el plan detallado de Lunes a Viernes para Instagram y TikTok...");
    appendLog("1/3 Mateo está planeando la semana en su Sala de Estrategia...", true);

    // Mateo se queda en su oficina mientras planea
    setAgents((prev) =>
      prev.map((a) =>
        a.id === "mateo"
          ? { ...a, currentTop: a.homeTop, currentLeft: a.homeLeft, status: "working", bubbleText: "Planeando semana..." }
          : a
      )
    );

    try {
      const res = await fetch("/api/agency/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: "mateo", weekLabel: campaign }),
      });
      const data = await res.json();
      if (data?.updatedStrategy) setStrategyProposal(data.updatedStrategy);
      if (data?.reply) setAgentReply(data.reply);
    } catch {}

    // Ya terminó de planear: suena notificación y camina a la Mesa de Aprobación
    setIsPlanningStrategy(false);
    playWorkDoneSound();
    appendLog("Mateo terminó el plan y lo llevó a la Mesa de Aprobación", true);
    setAgents((prev) =>
      prev.map((a) =>
        a.id === "mateo"
          ? { ...a, currentTop: "52%", currentLeft: "50%", status: "review", bubbleText: "Propuesta lista en mesa" }
          : a
      )
    );
  };

  const handleApproveStrategy = async () => {
    if (isGeneratingWeek) return;
    setIsGeneratingWeek(true);
    setWorkflowStep("creative_review");
    appendLog("2/3 Estrategia aprobada → Mateo pasa el brief a Valeria y Diego", true);

    setAgents((prev) =>
      prev.map((a) =>
        a.id === "mateo"
          ? { ...a, currentTop: a.homeTop, currentLeft: a.homeLeft, status: "active", bubbleText: "Estrategia aprobada ✓" }
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
        body: JSON.stringify({ weekLabel: campaign, theme: strategyProposal }),
      });
      const data = await res.json();
      if (data?.ok) {
        appendLog(`Valeria y Diego entregaron ${data.count} piezas en Mesa de Aprobación`, true);
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
        setSelectedAgentId("diego");
        playWorkDoneSound();
        setAgents((prev) =>
          prev.map((a) =>
            a.id === "valeria"
              ? { ...a, currentTop: "52%", currentLeft: "47%", status: "review", bubbleText: "Copys en mesa" }
              : a.id === "diego"
              ? { ...a, currentTop: "52%", currentLeft: "53%", status: "review", bubbleText: "Visual listo en mesa" }
              : a
          )
        );
      } else {
        appendLog(data?.error || "Error al generar piezas");
      }
    } catch {
      appendLog("Error de conexión al generar piezas");
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
      playWorkDoneSound();
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatting) return;
    const msg = chatInput.trim();
    setChatInput("");
    setIsChatting(true);

    setAgents((prev) =>
      prev.map((a) =>
        a.id === selectedAgentId
          ? { ...a, status: "working", bubbleText: "Pensando respuesta..." }
          : a
      )
    );
    appendLog(`Tú → ${selectedAgent.name}: "${msg}"`, true);

    try {
      if (activePiece && workflowStep === "creative_review" && selectedAgentId === "diego") {
        setIsRefining(true);
        await fetch("/api/agency/refine-deliverable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliverableId: activePiece.id, feedbackNotes: msg }),
        });
        setAgentReply("Listo, ya regeneré el visual con tu ajuste.");
      } else {
        const res = await fetch("/api/agency/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: selectedAgentId,
            message: msg,
            currentStrategy: strategyProposal,
            weekLabel: campaign,
          }),
        });
        const data = await res.json();
        if (data?.reply) setAgentReply(data.reply);
        if (data?.updatedStrategy) setStrategyProposal(data.updatedStrategy);
      }
    } finally {
      setIsRefining(false);
      setIsChatting(false);
      setAgents((prev) =>
        prev.map((a) =>
          a.id === selectedAgentId
            ? { ...a, status: workflowStep === "strategy_review" && a.id === "mateo" ? "review" : "active", bubbleText: "Respondido ✓" }
            : a
        )
      );
    }
  };

  const handleSimulateFlow = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    appendLog("1/4 Mateo camina a la Mesa de Aprobación con la estrategia...", true);
    officeEvents.emit("agent:move", { agentId: "mateo", targetPoint: "mesa_aprobacion", status: "Por revisar" });

    setTimeout(() => {
      appendLog("2/4 Valeria y Diego caminan a Mesa de Aprobación");
      officeEvents.emit("agent:move", { agentId: "mateo", targetPoint: "mateo", status: "Activo" });
      officeEvents.emit("agent:move", { agentId: "valeria", targetPoint: "mesa_aprobacion", status: "Por revisar" });
      officeEvents.emit("agent:move", { agentId: "diego", targetPoint: "mesa_aprobacion", status: "Por revisar" });
    }, 2000);

    setTimeout(() => {
      appendLog("3/4 Camila y Andrés reciben piezas; Sofía y Bruno coordinan leads y ROI", true);
      officeEvents.emit("agent:move", { agentId: "valeria", targetPoint: "valeria", status: "Activo" });
      officeEvents.emit("agent:move", { agentId: "diego", targetPoint: "diego", status: "Activo" });
      officeEvents.emit("agent:move", { agentId: "andres", targetPoint: "mesa_aprobacion", status: "Trabajando" });
      officeEvents.emit("agent:move", { agentId: "camila", targetPoint: "mesa_aprobacion", status: "Trabajando" });
      officeEvents.emit("agent:move", { agentId: "sofia", targetPoint: "camila", status: "Trabajando" });
      officeEvents.emit("agent:move", { agentId: "bruno", targetPoint: "andres", status: "Trabajando" });
    }, 4200);

    setTimeout(() => {
      appendLog("4/4 Todos regresan a sus estaciones con resultados actualizados", true);
      ["andres", "camila", "sofia", "bruno"].forEach((id) => {
        officeEvents.emit("agent:move", { agentId: id, targetPoint: id, status: "Activo" });
      });
      setIsSimulating(false);
    }, 6600);
  };

  return (
    <div className="w-full h-[calc(100vh-56px)] overflow-hidden bg-[#14352F] text-emerald-50 flex flex-col">
      {/* 1. HEADER SUPERIOR */}
      <header className="border-b border-emerald-800/70 bg-[#0D2420]/95 px-4 py-3 backdrop-blur-md">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          {/* Title + Campaign Selector */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-sm font-bold tracking-tight text-white">
                  FoxDrop Agency
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
      <main className="grid w-full flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        {/* 2. OFICINA VIRTUAL PHASER 3 + TILED + EASYSTAR (68% -> 8 cols) */}
        <section className="lg:col-span-8">
          <VirtualOffice
            onSelectAgent={setSelectedAgentId}
            onSimulateFlow={handleSimulateFlow}
            isSimulating={isSimulating}
          />
        </section>

        {/* 3. PANEL INSPECTOR Y COLA DE APROBACIÓN (32% -> 4 cols) */}
        <aside className="lg:col-span-4 flex flex-col rounded-2xl border border-emerald-800/60 bg-[#0D2420] shadow-2xl overflow-hidden">
          {/* Tabs */}
          <div className="grid grid-cols-4 border-b border-emerald-800/60 bg-[#0A1C19]">
            <button
              type="button"
              onClick={() => setActiveTab("approve")}
              className={`flex items-center justify-center gap-1 py-3 text-[11px] font-semibold transition ${
                activeTab === "approve"
                  ? "border-b-2 border-[#D96B27] text-white bg-[#0D2420]"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              Aprobar
              <span className="rounded-full bg-[#D96B27] px-1.5 py-0.5 text-[9px] font-bold text-white">
                {pendingPieces.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("calendar")}
              className={`flex items-center justify-center gap-1 py-3 text-[11px] font-semibold transition ${
                activeTab === "calendar"
                  ? "border-b-2 border-[#D96B27] text-white bg-[#0D2420]"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              <Calendar className="h-3 w-3" /> Calendario
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("whatsapp")}
              className={`flex items-center justify-center gap-1 py-3 text-[11px] font-semibold transition ${
                activeTab === "whatsapp"
                  ? "border-b-2 border-[#D96B27] text-white bg-[#0D2420]"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              <MessageSquare className="h-3 w-3" /> WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("roi")}
              className={`flex items-center justify-center gap-1 py-3 text-[11px] font-semibold transition ${
                activeTab === "roi"
                  ? "border-b-2 border-[#D96B27] text-white bg-[#0D2420]"
                  : "text-emerald-300/70 hover:text-white"
              }`}
            >
              <TrendingUp className="h-3 w-3" /> ROI
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
            {activeTab === "approve" && workflowStep === "strategy_review" && (
              <div className="space-y-3 rounded-xl border border-[#D96B27]/60 bg-[#14352F]/70 p-4">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-[#D96B27]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#FDBA74]">
                    Paso 1 · Propuesta de Mateo (CMO)
                  </span>
                </div>
                <textarea
                  rows={5}
                  value={strategyProposal}
                  onChange={(e) => setStrategyProposal(e.target.value)}
                  className="w-full rounded-xl border border-emerald-800/70 bg-[#0D2420] p-2.5 text-xs leading-relaxed text-emerald-50 focus:border-[#D96B27] focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApproveStrategy}
                  disabled={isGeneratingWeek || isPlanningStrategy}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#D96B27] px-4 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#c55e1e] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {isPlanningStrategy
                    ? "Mateo está armando la estrategia..."
                    : isGeneratingWeek
                    ? "Valeria y Diego creando piezas..."
                    : "✓ Aprobar Estrategia → Pasar a Valeria y Diego"}
                </button>
              </div>
            )}

            {activeTab === "approve" && workflowStep !== "strategy_review" && !activePiece && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-emerald-800/80 bg-[#14352F]/40 p-6 text-center">
                <span className="text-3xl mb-2">🦊</span>
                <p className="text-xs font-bold text-white">Sin piezas por aprobar</p>
                <p className="mt-1 text-[11px] text-emerald-300/80">
                  Presiona <strong>+ Nueva Campaña Semanal</strong> para generar tus 5 piezas reales con productos de tu inventario.
                </p>
              </div>
            )}

            {activeTab === "approve" && workflowStep !== "strategy_review" && activePiece && (
              <>
                {pendingPieces.length > 1 && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-800/60 bg-[#14352F]/70 px-2.5 py-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPieceIndex((i) => (i - 1 + pendingPieces.length) % pendingPieces.length)
                      }
                      className="rounded px-2 py-0.5 text-emerald-200 hover:bg-emerald-800/60"
                    >
                      ← Anterior
                    </button>
                    <span className="font-bold text-white">
                      Pieza {Math.min(currentPieceIndex + 1, pendingPieces.length)} de {pendingPieces.length}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentPieceIndex((i) => (i + 1) % pendingPieces.length)
                      }
                      className="rounded px-2 py-0.5 text-emerald-200 hover:bg-emerald-800/60"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between text-[11px] text-emerald-200/80">
                  <span className="rounded-md border border-[#D96B27]/40 bg-[#D96B27]/15 px-2 py-0.5 font-medium text-[#FDBA74]">
                    {activePiece.platform}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-emerald-400" /> {activePiece.schedule}
                  </span>
                </div>

                {/* Creative Preview */}
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-emerald-800/70 bg-[#14352F] flex items-center justify-center">
                  {activePiece.imageUrl ? (
                    <img
                      src={activePiece.imageUrl}
                      alt={activePiece.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="px-4 text-center">
                      <p className="text-xs font-bold text-white">Sin visual generado todavía</p>
                      <p className="mt-1 text-[11px] text-emerald-300/80">
                        Presiona <strong>↻ Regenerar</strong> abajo para que Diego cree la composición con 3 productos reales.
                      </p>
                    </div>
                  )}
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
                  {activePiece.imageUrl && (
                    <a
                      href={activePiece.imageUrl}
                      download={`foxdrop-${activePiece.id}.jpg`}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-700/80 bg-[#0A1C19] px-4 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-900/60"
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar imagen
                    </a>
                  )}
                </div>
              </>
            )}

            {activeTab === "calendar" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300/80">
                    Pauta en Redes
                  </span>
                  <div className="flex rounded-lg border border-emerald-800/70 bg-[#0A1C19] p-0.5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setCalendarView("week")}
                      className={`rounded-md px-2 py-0.5 font-semibold ${
                        calendarView === "week" ? "bg-[#D96B27] text-white" : "text-emerald-300/70"
                      }`}
                    >
                      Semana
                    </button>
                    <button
                      type="button"
                      onClick={() => setCalendarView("month")}
                      className={`rounded-md px-2 py-0.5 font-semibold ${
                        calendarView === "month" ? "bg-[#D96B27] text-white" : "text-emerald-300/70"
                      }`}
                    >
                      Mes
                    </button>
                  </div>
                </div>

                {pieces.length === 0 ? (
                  <p className="text-xs text-emerald-300/70">
                    Aún no hay piezas programadas. Genera una campaña semanal para llenar el calendario.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"].map((day, idx) => {
                      const dayPieces = pieces.filter((_, pIdx) => pIdx % 5 === idx);
                      return (
                        <div
                          key={day}
                          className="rounded-xl border border-emerald-800/60 bg-[#14352F]/70 p-2.5 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold uppercase text-[#FDBA74]">{day}</span>
                            <span className="text-emerald-300/80">
                              {dayPieces.length} {dayPieces.length === 1 ? "publicación" : "publicaciones"}
                            </span>
                          </div>
                          {dayPieces.length > 0 ? (
                            dayPieces.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  const pendIdx = pendingPieces.findIndex((x) => x.id === p.id);
                                  if (pendIdx !== -1) setCurrentPieceIndex(pendIdx);
                                  setActiveTab("approve");
                                }}
                                className="w-full text-left rounded-lg border border-emerald-800/50 bg-[#0D2420]/70 p-2 flex items-center justify-between gap-2 hover:border-[#D96B27]/60 transition"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-semibold text-white">{p.title}</p>
                                  <p className="text-[10px] text-emerald-300/80">
                                    {p.platform} · {p.schedule}
                                  </p>
                                </div>
                                <span
                                  className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                    p.status === "approved"
                                      ? "bg-[#10B981]/20 text-[#10B981]"
                                      : "bg-amber-500/20 text-amber-300"
                                  }`}
                                >
                                  {p.status === "approved" ? "Aprobado" : "Por aprobar"}
                                </span>
                              </button>
                            ))
                          ) : (
                            <p className="text-[11px] text-emerald-400/50">Sin pauta asignada</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "whatsapp" && (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#10B981]/40 bg-[#14352F]/70 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#10B981]">
                    Proceso 2 · Ventas &amp; Servicio en WhatsApp (Sofía)
                  </p>
                  <p className="mt-1 text-xs text-emerald-100">
                    Lista de rotación semanal para no repetir producto y empujar el stock con atención al cliente.
                  </p>
                </div>

                {pieces.length === 0 ? (
                  <p className="text-xs text-emerald-300/70">
                    Genera la campaña semanal para asignar los combos del día a Sofía.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {pieces.map((p, idx) => {
                      const days = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
                      return (
                        <div
                          key={p.id}
                          className="rounded-xl border border-emerald-800/60 bg-[#14352F]/60 p-3 space-y-1.5"
                        >
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="font-bold uppercase text-[#FDBA74]">
                              {days[idx] || `Día ${idx + 1}`}
                            </span>
                            <span className="rounded bg-[#10B981]/20 px-1.5 py-0.5 font-semibold text-[#10B981]">
                              Meta: 5–8 piezas
                            </span>
                          </div>
                          <p className="text-xs font-bold text-white">{p.title}</p>
                          <p className="text-[11px] text-emerald-200/80">
                            💬 <strong>Cómo venderlo:</strong> Ofrece el combo con envío rápido y resalta últimas piezas disponibles en grupo VIP.
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === "roi" && (
              <div className="space-y-3">
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

                {pieces.filter((p) => p.status === "approved").map((p) => {
                  const m = dbMetrics.find((x) => x.deliverable_id === p.id);
                  return (
                    <div
                      key={p.id}
                      className="rounded-xl border border-emerald-800/60 bg-[#14352F]/50 p-3 space-y-2"
                    >
                      <p className="text-xs font-bold text-white truncate">{p.title}</p>
                      <div className="grid grid-cols-3 gap-2 text-[11px]">
                        <label className="block">
                          <span className="text-emerald-300/70">Clics WA</span>
                          <input
                            type="number"
                            defaultValue={m?.clicks_to_whatsapp ?? 0}
                            onBlur={(e) => upsertMetric(p.id, { clicks_to_whatsapp: Number(e.target.value) || 0 })}
                            className="mt-0.5 w-full rounded bg-[#0D2420] px-2 py-1 text-white border border-emerald-800/70"
                          />
                        </label>
                        <label className="block">
                          <span className="text-emerald-300/70">Miembros</span>
                          <input
                            type="number"
                            defaultValue={m?.new_group_members ?? 0}
                            onBlur={(e) => upsertMetric(p.id, { new_group_members: Number(e.target.value) || 0 })}
                            className="mt-0.5 w-full rounded bg-[#0D2420] px-2 py-1 text-white border border-emerald-800/70"
                          />
                        </label>
                        <label className="block">
                          <span className="text-emerald-300/70">Ventas MXN</span>
                          <input
                            type="number"
                            defaultValue={m?.closed_sales_mxn ?? 0}
                            onBlur={(e) => upsertMetric(p.id, { closed_sales_mxn: Number(e.target.value) || 0 })}
                            className="mt-0.5 w-full rounded bg-[#0D2420] px-2 py-1 text-white border border-emerald-800/70"
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Agent Chat */}
          <form
            onSubmit={handleSendChat}
            className="border-t border-emerald-800/60 bg-[#0A1C19] p-3 space-y-2"
          >
            {agentReply && (
              <div className="rounded-lg border border-emerald-800/60 bg-[#14352F]/80 px-2.5 py-1.5 text-[11px] text-emerald-100">
                <span className="font-bold text-[#FDBA74]">{selectedAgent.name}: </span>
                {agentReply}
              </div>
            )}
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
        <div className="w-full">
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
