import * as Phaser from "phaser";
import { officeEvents } from "./officeEvents";

export type PhaserAgentStatus = "Activo" | "Trabajando" | "En espera" | "Por revisar";

export class AgentSprite extends Phaser.GameObjects.Container {
  public agentId: string;
  public agentName: string;
  public agentRole: string;
  private sprite: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private selectionRing: Phaser.GameObjects.Ellipse;
  private badgeBg: Phaser.GameObjects.Graphics;
  private badgeText: Phaser.GameObjects.Text;
  private walkTween?: Phaser.Tweens.Tween;
  private idleTween?: Phaser.Tweens.Tween;
  private isWalking = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: string,
    name: string,
    role: string,
    status: PhaserAgentStatus = "En espera"
  ) {
    super(scene, x, y);
    this.agentId = id;
    this.agentName = name;
    this.agentRole = role;

    // 1. Anillo dorado de selección en el piso
    this.selectionRing = scene.add.ellipse(0, 22, 56, 20, 0xd96b27, 0.28);
    this.selectionRing.setStrokeStyle(2, 0xd96b27, 1);
    this.selectionRing.setVisible(false);
    this.add(this.selectionRing);

    // 2. Sombra dinámica en el piso
    this.shadow = scene.add.ellipse(0, 22, 42, 14, 0x000000, 0.45);
    this.add(this.shadow);

    // 3. Sprite del zorrito
    this.sprite = scene.add.image(0, -10, `agent_${id}`);
    this.sprite.setDisplaySize(76, 76);
    this.add(this.sprite);

    // 4. Contenedor superior dinámico (Nombre + Rol + Badge de estado)
    this.badgeBg = scene.add.graphics();
    this.add(this.badgeBg);

    this.badgeText = scene.add
      .text(0, -58, `${name} · ${status}`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "12px",
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0.5, 0.5);
    this.add(this.badgeText);

    const roleLabel = scene.add
      .text(0, 36, `${name} (${role})`, {
        fontFamily: "Arial, sans-serif",
        fontSize: "11px",
        color: "#a7f3d0",
        backgroundColor: "#0D2420",
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 0.5);
    this.add(roleLabel);

    this.setStatus(status);
    this.setSize(76, 86);
    this.setInteractive({ useHandCursor: true });

    this.on("pointerdown", () => {
      officeEvents.emit("agent:selected", this.agentId);
    });

    this.startIdleAnimation();
    scene.add.existing(this);
  }

  public setSelected(selected: boolean) {
    this.selectionRing.setVisible(selected);
  }

  public setStatus(status: PhaserAgentStatus) {
    this.badgeText.setText(`${status}`);
    const w = Math.max(68, this.badgeText.width + 16);
    const h = 18;
    const color =
      status === "Activo"
        ? 0x10b981
        : status === "Trabajando"
        ? 0xd96b27
        : status === "Por revisar"
        ? 0xf59e0b
        : 0x1e4d43;

    this.badgeBg.clear();
    this.badgeBg.fillStyle(0x0d2420, 0.92);
    this.badgeBg.lineStyle(1.5, color, 1);
    this.badgeBg.fillRoundedRect(-w / 2, -58 - h / 2, w, h, 9);
    this.badgeBg.strokeRoundedRect(-w / 2, -58 - h / 2, w, h, 9);
  }

  private startIdleAnimation() {
    if (this.idleTween) this.idleTween.stop();
    const baseScaleY = this.sprite.scaleY;
    this.idleTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleY: { from: baseScaleY, to: baseScaleY * 1.04 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  public walkPath(
    path: Array<{ x: number; y: number }>,
    tileSize: number,
    onDone?: () => void
  ) {
    if (!path || path.length <= 1) {
      onDone?.();
      return;
    }

    if (this.walkTween) this.walkTween.stop();
    if (this.idleTween) this.idleTween.stop();
    this.isWalking = true;

    // Animación de pasos (rebote + balanceo)
    const stepTween = this.scene.tweens.add({
      targets: this.sprite,
      y: { from: -6, to: -15 },
      angle: { from: -7, to: 7 },
      duration: 160,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    const shadowTween = this.scene.tweens.add({
      targets: this.shadow,
      scaleX: { from: 1, to: 0.78 },
      duration: 160,
      yoyo: true,
      repeat: -1,
    });

    let stepIndex = 1;
    const moveNext = () => {
      if (stepIndex >= path.length) {
        stepTween.stop();
        shadowTween.stop();
        this.sprite.setPosition(0, -6);
        this.sprite.setAngle(0);
        this.shadow.setScale(1);
        this.isWalking = false;
        this.startIdleAnimation();
        onDone?.();
        return;
      }

      const nextTile = path[stepIndex];
      const targetX = nextTile.x * tileSize + tileSize / 2;
      const targetY = nextTile.y * tileSize + tileSize / 2;

      // Dirección (izquierda / derecha / arriba / abajo)
      if (targetX < this.x - 1) this.sprite.setFlipX(true);
      else if (targetX > this.x + 1) this.sprite.setFlipX(false);

      this.walkTween = this.scene.tweens.add({
        targets: this,
        x: targetX,
        y: targetY,
        duration: 130,
        ease: "Linear",
        onComplete: () => {
          this.setDepth(this.y);
          stepIndex++;
          moveNext();
        },
      });
    };

    moveNext();
  }
}
