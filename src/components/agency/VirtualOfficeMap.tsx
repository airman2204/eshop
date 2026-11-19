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
              <div className="relative flex flex-col items-center">
                {/* Golden selection ring on the floor */}
                {isSelected && (
                  <span className="absolute -bottom-1.5 h-5 w-11 rounded-full border-2 border-[#D96B27] bg-[#D96B27]/25 shadow-[0_0_16px_#D96B27]" />
                )}

                {/* Floor shadow */}
                <span className="absolute -bottom-1 h-2.5 w-8 rounded-full bg-black/55 blur-[2px]" />

                {/* 2D Chibi Fox Character SVG */}
                <div
                  className={`relative flex h-12 w-12 items-center justify-center transition-transform group-hover:scale-110 ${
                    isSelected ? "drop-shadow-[0_0_10px_#D96B27]" : "drop-shadow-md"
                  }`}
                >
                  <svg viewBox="0 0 48 48" className="h-12 w-12 overflow-visible">
                    {/* Fluffy Fox Tail */}
                    <path
                      d="M30 37 C40 35, 44 26, 39 22 C36 25, 34 30, 29 33 Z"
                      fill="#D96B27"
                      stroke="#0D2420"
                      strokeWidth="1.6"
                    />
                    <path d="M39 22 C41 24, 41 27, 38 28 C37 26, 37 24, 39 22 Z" fill="#FFF7ED" />
                    {/* Torso / Hoodie */}
                    <path
                      d="M14 30 C14 25, 34 25, 34 30 L36 42 C36 44, 32 45, 24 45 C16 45, 12 44, 12 42 Z"
                      fill={agent.avatarColor}
                      stroke={isSelected ? "#D96B27" : "#0D2420"}
                      strokeWidth="1.8"
                    />
                    {/* Paws / Shoes */}
                    <ellipse cx="18" cy="45" rx="4" ry="2.2" fill="#111827" />
                    <ellipse cx="30" cy="45" rx="4" ry="2.2" fill="#111827" />
                    {/* Fox Ears */}
                    <polygon points="12,15 14,3 21,11" fill="#D96B27" stroke="#0D2420" strokeWidth="1.6" />
                    <polygon points="14,13 15,6 19,11" fill="#FDBA74" />
                    <polygon points="36,15 34,3 27,11" fill="#D96B27" stroke="#0D2420" strokeWidth="1.6" />
                    <polygon points="34,13 33,6 29,11" fill="#FDBA74" />
                    {/* Fox Head */}
                    <ellipse
                      cx="24"
                      cy="18"
                      rx="12"
                      ry="10.5"
                      fill="#EA580C"
                      stroke={isSelected ? "#FDBA74" : "#0D2420"}
                      strokeWidth="1.8"
                    />
                    {/* White Fox Cheeks */}
                    <path d="M12.5 19 C15 17, 20 21, 24 27 C17 27, 13 24, 12.5 19 Z" fill="#FFF7ED" />
                    <path d="M35.5 19 C33 17, 28 21, 24 27 C31 27, 35 24, 35.5 19 Z" fill="#FFF7ED" />
                    {/* Cute Eyes */}
                    <circle cx="19" cy="17.5" r="1.8" fill="#111827" />
                    <circle cx="29" cy="17.5" r="1.8" fill="#111827" />
                    <circle cx="19.5" cy="16.9" r="0.65" fill="#FFFFFF" />
                    <circle cx="29.5" cy="16.9" r="0.65" fill="#FFFFFF" />
                    {/* Fox Nose */}
                    <ellipse cx="24" cy="21.5" rx="2" ry="1.4" fill="#111827" />
                    {/* Role Badge on Chest */}
                    <text x="24" y="38" textAnchor="middle" fontSize="9">
                      {agent.emoji}
                    </text>
                  </svg>
                  {/* Online dot */}
                  <span
                    className={`absolute right-0.5 bottom-1 h-3 w-3 rounded-full border-2 border-[#0D2420] ${
                      agent.status === "working"
                        ? "bg-[#D96B27]"
                        : agent.status === "review"
                        ? "bg-amber-400"
                        : "bg-[#10B981]"
                    }`}
                  />
                </div>
              </div>

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
