import * as Phaser from "phaser";
import EasyStar from "easystarjs";
import { AgentSprite, PhaserAgentStatus } from "./AgentSprite";
import { officeEvents } from "./officeEvents";

const AGENT_META: Array<{ id: string; name: string; role: string }> = [
  { id: "mateo", name: "Mateo", role: "CMO" },
  { id: "valeria", name: "Valeria", role: "Copy" },
  { id: "diego", name: "Diego", role: "Arte/Flux" },
  { id: "andres", name: "Andrés", role: "Ads" },
  { id: "camila", name: "Camila", role: "Community" },
  { id: "sofia", name: "Sofía", role: "Ventas WA" },
  { id: "bruno", name: "Bruno", role: "Analista" },
];

export class OfficeScene extends Phaser.Scene {
  private easystar = new EasyStar.js();
  private agents: Record<string, AgentSprite> = {};
  private waypoints: Record<string, { x: number; y: number }> = {};
  private tileSize = 32;

  constructor() {
    super({ key: "OfficeScene" });
  }

  preload() {
    this.load.tilemapTiledJSON("oficina_map", "/assets/oficina.json");
    this.load.image("office_bg", "/images/foxdrop-office-map.jpg");
    AGENT_META.forEach((a) => {
      this.load.image(`agent_${a.id}`, `/images/agents/${a.id}.png`);
    });
  }

  create() {
    // Fondo visual de la oficina 4:3 (1024x768)
    const bg = this.add.image(512, 384, "office_bg");
    bg.setDisplaySize(1024, 768);

    // Cargar mapa Tiled y construir cuadrícula navegable para EasyStar
    const mapData = this.cache.tilemap.get("oficina_map")?.data;
    const width = mapData?.width || 32;
    const height = mapData?.height || 24;
    this.tileSize = mapData?.tilewidth || 32;

    const wallLayer = mapData?.layers?.find((l: any) => l.name === "Paredes_Muebles");
    const grid: number[][] = [];
    for (let y = 0; y < height; y++) {
      const row: number[] = [];
      for (let x = 0; x < width; x++) {
        const tileVal = wallLayer?.data?.[y * width + x] ?? 0;
        row.push(tileVal > 0 ? 1 : 0);
      }
      grid.push(row);
    }

    this.easystar.setGrid(grid);
    this.easystar.setAcceptableTiles([0]);
    this.easystar.enableDiagonals();

    // Leer capa de objetos Puntos_Ruta
    const routeLayer = mapData?.layers?.find((l: any) => l.name === "Puntos_Ruta");
    (routeLayer?.objects || []).forEach((obj: any) => {
      if (obj.name) {
        this.waypoints[obj.name] = { x: obj.x, y: obj.y };
      }
    });

    // Instanciar los 7 AgentSprite
    AGENT_META.forEach((meta) => {
      const pt = this.waypoints[meta.id] || { x: 512, y: 384 };
      const sprite = new AgentSprite(this, pt.x, pt.y, meta.id, meta.name, meta.role, "En espera");
      sprite.setDepth(pt.y);
      this.agents[meta.id] = sprite;
    });

    // Seleccionar Diego por defecto
    this.agents["diego"]?.setSelected(true);

    // Escuchar eventos desde React / Supabase
    const offMove = officeEvents.on<{
      agentId: string;
      targetPoint: string;
      status?: PhaserAgentStatus;
    }>("agent:move", ({ agentId, targetPoint, status }) => {
      const agent = this.agents[agentId];
      const dest = this.waypoints[targetPoint];
      if (!agent || !dest) return;

      if (status) agent.setStatus(status);

      const startX = Math.floor(agent.x / this.tileSize);
      const startY = Math.floor(agent.y / this.tileSize);
      const endX = Math.floor(dest.x / this.tileSize);
      const endY = Math.floor(dest.y / this.tileSize);

      this.easystar.findPath(startX, startY, endX, endY, (path) => {
        if (path && path.length > 0) {
          agent.walkPath(path, this.tileSize);
        }
      });
      this.easystar.calculate();
    });

    const offSelect = officeEvents.on<string>("agent:selected", (selectedId) => {
      Object.values(this.agents).forEach((a) => a.setSelected(a.agentId === selectedId));
    });

    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      offMove();
      offSelect();
    });
  }
}
