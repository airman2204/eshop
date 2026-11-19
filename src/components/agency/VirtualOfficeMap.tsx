"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Play, Sparkles, CheckCircle2, Clock } from "lucide-react";

export type AgentStatus = "active" | "working" | "review" | "approved";

export interface OfficeAgent {
  id: string;
  name: string;
  role: string;
  homeTop: string;
  homeLeft: string;
  currentTop: string;
  currentLeft: string;
  status: AgentStatus;
  bubbleText: string;
  avatarColor: string;
  hairColor: string;
  emoji: string;
  isMoving?: boolean;
}

interface VirtualOfficeMapProps {
  agents: OfficeAgent[];
  selectedAgentId: string;
  onSelectAgent: (id: string) => void;
  onSimulateFlow: () => void;
  isSimulating: boolean;
}

const ROOM_LABELS = [
  { id: "strategy", label: "Sala de Estrategia", top: "7%", left: "6%" },
  { id: "creative", label: "Estudio Creativo", top: "55%", left: "6%" },
  { id: "approval", label: "Mesa de Aprobación", top: "40%", left: "50%", center: true },
  { id: "growth", label: "Crecimiento & Redes", top: "7%", left: "68%" },
  { id: "sales", label: "Ventas & ROI", top: "55%", left: "68%" },
];

function AgentCharacter({
  agent,
  isSelected,
  onSelect,
}: {
  agent: OfficeAgent;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const currentX = parseFloat(agent.currentLeft) || 0;
  const prevXRef = useRef<number>(currentX);
  const [facingLeft, setFacingLeft] = useState(false);
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    if (currentX < prevXRef.current - 0.5) {
      setFacingLeft(true);
    } else if (currentX > prevXRef.current + 0.5) {
      setFacingLeft(false);
    }
    prevXRef.current = currentX;
  }, [currentX]);

  const activeVariant =
    isMoving || agent.isMoving
      ? "walking"
      : agent.status === "working"
      ? "working"
      : agent.status === "review"
      ? "waiting_approval"
      : "idle";

  const statusColor =
    agent.status === "approved" || agent.status === "active"
      ? "border-[#10B981] bg-[#0D2420]/95 text-emerald-200"
      : agent.status === "review"
      ? "border-amber-400 bg-[#0D2420]/95 text-amber-200"
      : "border-[#D96B27] bg-[#0D2420]/95 text-orange-200";

  return (
    <motion.div
      initial={false}
      animate={{
        left: agent.currentLeft,
        top: agent.currentTop,
      }}
      transition={{
        type: "spring",
        stiffness: 55,
        damping: 16,
        mass: 1,
      }}
      onAnimationStart={() => setIsMoving(true)}
      onAnimationComplete={() => setIsMoving(false)}
      style={{ position: "absolute", transform: "translate(-50%, -50%)" }}
      className="z-20 flex flex-col items-center"
    >
      <motion.button
        type="button"
        onClick={onSelect}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex flex-col items-center focus:outline-none"
      >
        {/* Burbuja de estado estilo videojuego (independiente del volteo) */}
        <div
          className={`mb-1 max-w-[145px] truncate rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-lg backdrop-blur-sm ${statusColor}`}
        >
          {agent.status === "approved" && (
            <CheckCircle2 className="mr-1 inline h-2.5 w-2.5 text-[#10B981]" />
          )}
          {agent.status === "review" && (
            <Clock className="mr-1 inline h-2.5 w-2.5 text-amber-400" />
          )}
          {agent.bubbleText}
        </div>

        {/* Contenedor del sprite + partículas + sombra */}
        <div className="relative flex flex-col items-center">
          {/* Partículas flotantes cuando está working */}
          {activeVariant === "working" && (
            <div className="pointer-events-none absolute -top-4 inset-x-0 flex justify-center gap-1.5">
              {[0, 1, 2].map((idx) => (
                <motion.span
                  key={idx}
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: [0, 1, 0], y: [0, -14] }}
                  transition={{
                    repeat: Infinity,
                    duration: 1.4,
                    delay: idx * 0.35,
                    ease: "easeOut",
                  }}
                  className="text-[10px] text-[#D96B27]"
                >
                  ✨
                </motion.span>
              ))}
            </div>
          )}

          {/* Anillo pulsante dorado cuando espera aprobación */}
          {activeVariant === "waiting_approval" && (
            <motion.span
              animate={{ scale: [0.95, 1.25, 0.95], opacity: [0.85, 0.25, 0.85] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
              className="pointer-events-none absolute -bottom-1.5 h-5 w-12 rounded-full border-2 border-[#D96B27] bg-[#D96B27]/20"
            />
          )}

          {/* Halo luminoso de selección */}
          {isSelected && (
            <span className="pointer-events-none absolute -bottom-1.5 h-5 w-12 rounded-full border-2 border-[#D96B27] bg-[#D96B27]/25 shadow-[0_0_18px_#D96B27]" />
          )}

          {/* Sprite PNG del zorrito con rigging/elástico */}
          <motion.img
            src={`/images/agents/${agent.id}.png`}
            alt={agent.name}
            draggable={false}
            animate={activeVariant}
            variants={{
              walking: {
                y: [0, -7, 0],
                rotate: [-5, 5, -5],
                scaleX: facingLeft ? -1 : 1,
                transition: {
                  y: { repeat: Infinity, duration: 0.42, ease: "easeInOut" },
                  rotate: { repeat: Infinity, duration: 0.42, ease: "easeInOut" },
                  scaleX: { duration: 0.15 },
                },
              },
              working: {
                scaleY: [1, 0.94, 1.03, 1],
                y: [0, 1.5, -1, 0],
                scaleX: facingLeft ? -1 : 1,
                transition: {
                  repeat: Infinity,
                  duration: 1.1,
                  ease: "easeInOut",
                },
              },
              waiting_approval: {
                y: [0, -8, 0, -5, 0],
                scaleX: facingLeft ? -1 : 1,
                transition: {
                  repeat: Infinity,
                  repeatDelay: 1.8,
                  duration: 0.55,
                  ease: "easeOut",
                },
              },
              idle: {
                scaleY: [1, 1.025, 1],
                scaleX: facingLeft ? -1 : 1,
                transition: {
                  repeat: Infinity,
                  duration: 2.4,
                  ease: "easeInOut",
                },
              },
            }}
            className={`relative z-10 h-14 w-14 object-contain select-none ${
              isSelected ? "drop-shadow-[0_0_10px_rgba(217,107,39,0.9)]" : "drop-shadow-md"
            }`}
          />

          {/* Sombra dinámica en el piso */}
          <motion.span
            animate={
              activeVariant === "walking"
                ? { scale: [1, 0.82, 1] }
                : activeVariant === "waiting_approval"
                ? { scale: [1, 0.8, 1, 0.85, 1] }
                : { scale: 1 }
            }
            transition={
              activeVariant === "walking"
                ? { repeat: Infinity, duration: 0.42, ease: "easeInOut" }
                : activeVariant === "waiting_approval"
                ? { repeat: Infinity, repeatDelay: 1.8, duration: 0.55, ease: "easeOut" }
                : { duration: 0.3 }
            }
            className=" -mt-1.5 h-2.5 w-9 rounded-full bg-black/45 blur-[2px]"
          />
        </div>

        {/* Etiqueta de nombre y rol */}
        <div className="mt-1 rounded-md border border-emerald-900/80 bg-[#0D2420]/90 px-2 py-0.5 text-center shadow">
          <p className="text-[10px] font-bold leading-tight text-white">{agent.name}</p>
          <p className="text-[9px] leading-tight text-emerald-300/80">{agent.role}</p>
        </div>
      </motion.button>
    </motion.div>
  );
}

export default function VirtualOfficeMap({
  agents,
  selectedAgentId,
  onSelectAgent,
  onSimulateFlow,
  isSimulating,
}: VirtualOfficeMapProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 rounded-full border border-emerald-800/70 bg-[#0D2420] px-3 py-1 text-xs text-emerald-200/90">
          <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>Oficina Virtual · {agents.length} agentes en línea</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-emerald-200/70">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#10B981]" /> Activo
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-[#D96B27]" /> Trabajando
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Por revisar
            </span>
          </div>

          <button
            type="button"
            onClick={onSimulateFlow}
            disabled={isSimulating}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#D96B27]/60 bg-[#D96B27]/15 px-3 py-1.5 text-xs font-semibold text-[#FDBA74] transition hover:bg-[#D96B27]/25 disabled:opacity-50"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            {isSimulating ? "Simulando flujo..." : "Simular Flujo Semanal"}
          </button>
        </div>
      </div>

      {/* 4:3 Gather-Town Style Map Container */}
      <div className="relative w-full aspect-[4/3] overflow-hidden rounded-2xl border border-emerald-800/60 bg-[#0D2420] shadow-2xl">
        <img
          src="/images/foxdrop-office-map.jpg"
          alt="FoxDrop Virtual Office Map"
          className="h-full w-full object-cover select-none"
          draggable={false}
        />

        {/* Subtle vignette for contrast */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0D2420]/50 via-transparent to-[#0D2420]/30" />

        {/* 5 Floating Room Labels */}
        {ROOM_LABELS.map((room) => (
          <div
            key={room.id}
            style={{ top: room.top, left: room.left }}
            className={`pointer-events-none absolute z-10 ${
              room.center ? "-translate-x-1/2" : ""
            }`}
          >
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/20 bg-[#0D2420]/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-100/90 backdrop-blur-sm shadow">
              {room.center && <Sparkles className="h-2.5 w-2.5 text-[#D96B27]" />}
              {room.label}
            </span>
          </div>
        ))}

        {/* 7 Animated Fox PNG Characters */}
        {agents.map((agent) => (
          <AgentCharacter
            key={agent.id}
            agent={agent}
            isSelected={agent.id === selectedAgentId}
            onSelect={() => onSelectAgent(agent.id)}
          />
        ))}
      </div>
    </div>
  );
}
