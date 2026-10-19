/** Casas e decorações dos lotes do Bairro Vila Logística + modo decoração (colocar itens no quintal). */
import Phaser from "phaser";
import { DECORS, getWorld, HOUSE_FOOT, interiorAt, interiorRect, interiorSpotError, ITEMS, setHouseSolid, TILE } from "@shared/index";
import { bus } from "../store";
import { net } from "../net/Net";
import { store } from "../store";
import * as Hud from "../ui/hud";

interface PlotView {
  tier: number;
  decorJson: string;
  owner: string;
  house: Phaser.GameObjects.Image | null;
  label: Phaser.GameObjects.Text;
  decor: Phaser.GameObjects.Image[];
  insideJson: string;
  inside: Phaser.GameObjects.Image[];
  access: string;
  doorLabel: Phaser.GameObjects.Text | null;
}

const FLOOR_KINDS = new Set(["tapete", "tapete_meli", "piscina", "horta"]);

export class PlotLayer {
  private world = getWorld();
  private views = new Map<string, PlotView>();
  private ghost: Phaser.GameObjects.Image;
  private ghostBox: Phaser.GameObjects.Rectangle;
  buildItem = "";
  buildPlot = "";
  buildInside = false;
  /** celular: em vez do botão direito, um modo "remover" */
  removeMode = false;

  constructor(private scene: Phaser.Scene) {
    for (const pl of this.world.plots) {
      const label = scene.add
        .text((pl.x + 5) * TILE, pl.y * TILE - 2, `${pl.id} · À VENDA`, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "6px", color: "#ffe600", fontStyle: "bold", stroke: "#000", strokeThickness: 2 })
        .setOrigin(0.5, 1)
        .setResolution(4)
        .setDepth(9400);
      this.views.set(pl.id, { tier: -1, decorJson: "", owner: "", house: null, label, decor: [], insideJson: "", inside: [], access: "", doorLabel: null });
    }
    this.ghost = scene.add.image(0, 0, "decor_banco").setOrigin(0, 1).setAlpha(0.6).setVisible(false).setDepth(9900);
    this.ghostBox = scene.add.rectangle(0, 0, 16, 16).setOrigin(0, 0).setStrokeStyle(1, 0xffe600).setVisible(false).setDepth(9899);
    scene.input.on("pointermove", (ptr: Phaser.Input.Pointer) => this.moveGhost(ptr));
    scene.input.on("pointerdown", (ptr: Phaser.Input.Pointer) => {
      if (!this.buildItem) return;
      const t = this.tileInPlot(ptr);
      if (!t) return;
      const sfx = this.buildInside ? "_in" : "";
      if (ptr.rightButtonDown() || this.removeMode) net.send("plot", { op: "remove_decor" + sfx, plotId: this.buildPlot, x: t[0], y: t[1] });
      else net.send("plot", { op: "decor" + sfx, plotId: this.buildPlot, itemId: this.buildItem, x: t[0], y: t[1] });
    });
    scene.input.mouse?.disableContextMenu();
    // sai do modo decoração quando o item acaba
    bus.on("profile", (p: any) => {
      if (this.buildItem && !p.inventory.some((i: any) => i.id === this.buildItem && i.qty > 0)) this.stopBuild();
    });
  }

  /** Chamado a cada quadro: sai do modo decoração se o jogador se afastar do lote. */
  checkDistance(px: number, py: number) {
    if (!this.buildItem) return;
    const pl = this.world.plots.find((p) => p.id === this.buildPlot);
    if (this.buildInside) {
      const i = interiorAt(this.world, px, py);
      if (i < 0 || this.world.plots[i].id !== this.buildPlot) this.stopBuild();
      return;
    }
    if (!pl || Math.hypot(px - (pl.x + 5) * TILE, py - (pl.y + 5) * TILE) > 14 * TILE) this.stopBuild();
  }

  /** Origem (tiles) do sistema de coordenadas do modo decoração atual. */
  private origin(): [number, number] | null {
    const i = this.world.plots.findIndex((p) => p.id === this.buildPlot);
    if (i < 0) return null;
    if (this.buildInside) {
      const r = interiorRect(i);
      return [r.x, r.y];
    }
    return [this.world.plots[i].x, this.world.plots[i].y];
  }

  /** Mesmas regras do servidor (Economy.plotOp "decor"). */
  private validSpot(x: number, y: number, w: number, h: number): boolean {
    if (this.buildInside) {
      let list: { kind: string; x: number; y: number }[] = [];
      try {
        list = JSON.parse(this.views.get(this.buildPlot)?.insideJson || "[]");
      } catch {
        list = [];
      }
      return !interiorSpotError(list, ITEMS[this.buildItem]?.decor ?? "", x, y);
    }
    if (!(x >= 1 && y >= 1 && x + w - 1 <= 8 && y + h - 1 <= 8)) return false;
    const v = this.views.get(this.buildPlot);
    const hx0 = HOUSE_FOOT.dx;
    const hy0 = HOUSE_FOOT.dy;
    if (v && v.tier > 0 && x < hx0 + HOUSE_FOOT.w && x + w > hx0 && y < hy0 + HOUSE_FOOT.h + 1 && y + h > hy0) return false;
    if (y + h - 1 >= 8 && x <= 5 && x + w - 1 >= 4) return false;
    let list: { kind: string; x: number; y: number }[] = [];
    try {
      list = JSON.parse(v?.decorJson || "[]");
    } catch {
      list = [];
    }
    for (const o of list) {
      const od = DECORS[o.kind] ?? { w: 1, h: 1 };
      if (x < o.x + od.w && x + w > o.x && y < o.y + od.h && y + h > o.y) return false;
    }
    return true;
  }

  startBuild(plotId: string, itemId: string, inside = false) {
    this.buildPlot = plotId;
    this.buildItem = itemId;
    this.buildInside = inside;
    const kind = ITEMS[itemId]?.decor ?? "banco";
    this.ghost.setTexture(`decor_${kind}`).setVisible(true);
    Hud.setBanner(`${inside ? "Mobiliando" : "Modo decoração"} · ${ITEMS[itemId]?.name}: clique ${inside ? "no piso da casa" : "no quintal"} para colocar · botão direito remove · Esc sai`);
  }

  stopBuild() {
    this.buildItem = "";
    this.removeMode = false;
    this.ghost.setVisible(false);
    this.ghostBox.setVisible(false);
    Hud.setBanner(null);
  }

  private tileInPlot(ptr: Phaser.Input.Pointer): [number, number] | null {
    const o = this.origin();
    if (!o) return null;
    const wx = Math.floor(ptr.worldX / TILE) - o[0];
    const wy = Math.floor(ptr.worldY / TILE) - o[1];
    if (this.buildInside) {
      if (wx < 1 || wy < 4 || wx > 14 || wy > 9) return null;
    } else if (wx < 1 || wy < 1 || wx > 8 || wy > 8) return null;
    return [wx, wy];
  }

  private moveGhost(ptr: Phaser.Input.Pointer) {
    if (!this.buildItem) return;
    const pl = this.origin();
    const t = this.tileInPlot(ptr);
    if (!pl || !t) {
      this.ghost.setVisible(false);
      this.ghostBox.setVisible(false);
      return;
    }
    const kind = ITEMS[this.buildItem]?.decor ?? "banco";
    const d = DECORS[kind] ?? { w: 1, h: 1 };
    const x = (pl[0] + t[0]) * TILE;
    const y = (pl[1] + t[1]) * TILE;
    this.ghost.setVisible(true).setPosition(x, y + d.h * TILE);
    this.ghostBox.setVisible(true).setPosition(x, y).setSize(d.w * TILE, d.h * TILE);
    const ok = this.validSpot(t[0], t[1], d.w, d.h);
    this.ghostBox.setStrokeStyle(1, ok ? 0xffe600 : 0xe5533d);
    if (ok) this.ghost.clearTint();
    else this.ghost.setTint(0xff6b5a);
  }

  sync(plots: any) {
    plots?.forEach?.((st: any, id: string) => {
      const v = this.views.get(id);
      const pl = this.world.plots.find((p) => p.id === id);
      if (!v || !pl) return;
      if (v.tier !== st.tier) {
        v.tier = st.tier;
        setHouseSolid(this.world, pl, st.tier > 0);
        v.house?.destroy();
        v.house = null;
        if (st.tier > 0) {
          const variant = (pl.x + pl.y) % 4;
          v.house = this.scene.add.image((pl.x + HOUSE_FOOT.dx) * TILE, (pl.y + HOUSE_FOOT.dy + HOUSE_FOOT.h + 1) * TILE, `house_${st.tier}_${variant}`).setOrigin(0, 1);
          v.house.setDepth((pl.y + HOUSE_FOOT.dy + HOUSE_FOOT.h) * TILE);
        }
      }
      const owner = st.ownerName || "";
      if (v.owner !== owner + st.tier + st.ownerId + store.playerId) {
        v.owner = owner + st.tier + st.ownerId + store.playerId;
        const mine = st.ownerId && st.ownerId === store.playerId;
        v.label.setText(!st.ownerId ? `${id} · À VENDA` : `${mine ? "Sua casa" : "Casa de " + owner}${st.tier ? "" : " (terreno)"}`);
        v.label.setColor(!st.ownerId ? "#ffe600" : mine ? "#9effa8" : "#ffffff");
        v.label.setY((st.tier > 0 ? pl.y - 1 : pl.y) * TILE - 2);
      }
      if (v.decorJson !== st.decor) {
        v.decorJson = st.decor;
        for (const im of v.decor) im.destroy();
        v.decor = [];
        let list: { kind: string; x: number; y: number }[] = [];
        try {
          list = JSON.parse(st.decor || "[]");
        } catch {
          list = [];
        }
        for (const d of list) {
          const def = DECORS[d.kind] ?? { w: 1, h: 1 };
          const bottom = (pl.y + d.y + def.h) * TILE;
          const im = this.scene.add.image((pl.x + d.x) * TILE, bottom, `decor_${d.kind}`).setOrigin(0, 1).setDepth(FLOOR_KINDS.has(d.kind) ? bottom - 20 : bottom);
          v.decor.push(im);
        }
      }
      const insideJson = st.inside ?? "[]";
      if (v.insideJson !== insideJson) {
        v.insideJson = insideJson;
        for (const im of v.inside) im.destroy();
        v.inside = [];
        let list: { kind: string; x: number; y: number }[] = [];
        try {
          list = JSON.parse(insideJson);
        } catch {
          list = [];
        }
        const r = interiorRect(this.world.plots.indexOf(pl));
        for (const d of list) {
          const def = DECORS[d.kind] ?? { w: 1, h: 1 };
          const bottom = (r.y + d.y + def.h) * TILE;
          const floor = FLOOR_KINDS.has(d.kind);
          const im = this.scene.add.image((r.x + d.x) * TILE, bottom, `decor_${d.kind}`).setOrigin(0, 1).setDepth(floor ? 1 : bottom);
          v.inside.push(im);
        }
      }
      const access = `${st.access}|${st.tier}|${st.ownerName}`;
      if (v.access !== access) {
        v.access = access;
        v.doorLabel?.destroy();
        v.doorLabel = null;
        if (st.tier > 0) {
          const icon = st.access === "public" ? "🌐 aberta" : st.access === "guests" ? "👥 convidados" : "🔒";
          v.doorLabel = this.scene.add
            .text((pl.x + 5) * TILE, (pl.y + HOUSE_FOOT.dy + HOUSE_FOOT.h + 1) * TILE + 2, icon, { fontFamily: "Trebuchet MS, sans-serif", fontSize: "5px", color: "#ffffff", stroke: "#000", strokeThickness: 2 })
            .setOrigin(0.5, 0)
            .setResolution(4)
            .setDepth(9400);
        }
      }
    });
  }

  /** Lote cuja porta da casa (ou placa) está perto do ponto. */
  doorNear(px: number, py: number): { id: string; d: number } | null {
    let best: { id: string; d: number } | null = null;
    for (const pl of this.world.plots) {
      const v = this.views.get(pl.id);
      if (!v || v.tier <= 0) continue;
      const dx = (pl.x + 5) * TILE;
      const dy = (pl.y + HOUSE_FOOT.dy + HOUSE_FOOT.h + 1) * TILE;
      const d = Math.hypot(px - dx, py - dy);
      if (d < 26 && (!best || d < best.d)) best = { id: pl.id, d };
    }
    return best;
  }
}
