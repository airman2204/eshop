"use client";

import React, { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { Play } from "lucide-react";
import { OfficeScene } from "./phaser/OfficeScene";
import { officeEvents } from "./phaser/officeEvents";

interface VirtualOfficeProps {
  onSelectAgent: (id: string) => void;
  onSimulateFlow: () => void;
  isSimulating: boolean;
}

export default function VirtualOffice({
  onSelectAgent,
  onSimulateFlow,
  isSimulating,
}: VirtualOfficeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const offSelect = officeEvents.on<string>("agent:selected", (id) => {
      onSelectAgent(id);
    });
    return () => offSelect();
  }, [onSelectAgent]);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 1024,
      height: 768,
      backgroundColor: "#0D2420",
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
      scene: [OfficeScene],
    };

    gameRef.current = new Phaser.Game(config);

    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 rounded-full border border-emerald-800/70 bg-[#0D2420] px-3 py-1 text-xs text-emerald-200/90">
          <span className="h-2 w-2 rounded-full bg-[#10B981] animate-pulse" />
          <span>Oficina Virtual Phaser 3 · 7 agentes en línea</span>
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

      {/* Phaser 3 Canvas Container (4:3, fits viewport without scroll) */}
      <div
        ref={containerRef}
        className="w-full aspect-[4/3] max-h-[calc(100vh-230px)] overflow-hidden rounded-2xl border border-emerald-800/60 bg-[#0D2420] shadow-2xl"
      />
    </div>
  );
}
