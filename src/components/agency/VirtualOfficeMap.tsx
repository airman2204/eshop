"use client";

import React from "react";
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

        {/* 7 Animated Chibi/2D Agents */}
        {agents.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          const statusColor =
            agent.status === "approved" || agent.status === "active"
              ? "border-[#10B981] bg-[#0D2420]/95 text-emerald-200"
              : agent.status === "review"
              ? "border-amber-400 bg-[#0D2420]/95 text-amber-200"
              : "border-[#D96B27] bg-[#0D2420]/95 text-orange-200";

          return (
            <motion.button
              key={agent.id}
              type="button"
              onClick={() => onSelectAgent(agent.id)}
              initial={false}
              animate={{
                top: agent.currentTop,
                left: agent.currentLeft,
              }}
              transition={{
                type: "spring",
                stiffness: 90,
                damping: 16,
                mass: 0.9,
              }}
              style={{ transform: "translate(-50%, -50%)" }}
              className="group absolute z-20 flex flex-col items-center focus:outline-none"
            >
              {/* Video-game Status Bubble Above */}
              <div
                className={`mb-1.5 max-w-[140px] truncate rounded-full border px-2 py-0.5 text-[10px] font-medium shadow-lg backdrop-blur-sm transition-transform group-hover:scale-105 ${statusColor}`}
              >
                {agent.status === "approved" && (
                  <CheckCircle2 className="mr-1 inline h-2.5 w-2.5 text-[#10B981]" />
                )}
                {agent.status === "review" && (
                  <Clock className="mr-1 inline h-2.5 w-2.5 text-amber-400" />
                )}
                {agent.bubbleText}
              </div>

              {/* Character Body + Floor Shadow + Golden Selection Ring */}
              <motion.div
                animate={
                  agent.isMoving
                    ? { y: [0, -5, 0, -4, 0] }
                    : { y: [0, -1.5, 0] }
                }
                transition={{
                  repeat: Infinity,
                  duration: agent.isMoving ? 0.45 : 2.6,
                  ease: "easeInOut",
                }}
                className="relative flex flex-col items-center"
              >
                {/* Golden selection ring on the floor */}
                {isSelected && (
                  <span className="absolute -bottom-1.5 h-5 w-11 rounded-full border-2 border-[#D96B27] bg-[#D96B27]/25 shadow-[0_0_16px_#D96B27]" />
                )}

                {/* Floor shadow */}
                <span className="absolute -bottom-1 h-2.5 w-8 rounded-full bg-black/55 blur-[2px]" />

                {/* 2D Chibi Avatar */}
                <div
                  className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 shadow-lg transition-transform group-hover:scale-110 ${
                    isSelected
                      ? "border-[#D96B27] ring-2 ring-[#D96B27]/50"
                      : "border-white/80"
                  }`}
                  style={{ backgroundColor: agent.avatarColor }}
                >
                  <span className="text-lg leading-none select-none">{agent.emoji}</span>
                  {/* Online dot */}
                  <span
                    className={`absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full border-2 border-[#0D2420] ${
                      agent.status === "working"
                        ? "bg-[#D96B27]"
                        : agent.status === "review"
                        ? "bg-amber-400"
                        : "bg-[#10B981]"
                    }`}
                  />
                </div>
              </motion.div>

              {/* Name & Role Pill Below */}
              <div className="mt-1.5 rounded-md bg-[#0D2420]/90 px-2 py-0.5 text-center shadow border border-emerald-900/80">
                <p className="text-[10px] font-bold leading-tight text-white">
                  {agent.name}
                </p>
                <p className="text-[9px] leading-tight text-emerald-300/80">
                  {agent.role}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
