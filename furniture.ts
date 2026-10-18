/** Arte procedural dos móveis (interior das casas) e das decorações novas de quintal. */
import { PixelBuffer } from "./pixel";

/** Altura extra (px) acima da área ocupada — móveis altos "sobem" na parede. */
export const TALL: Record<string, number> = {
  geladeira: 12, guarda_roupa: 12, estante: 12, luminaria: 12, planta_casa: 8, arvore_natal: 14, caixa_dagua: 12,
  piano: 6, fliperama: 12, armario: 8, quadro_meli: 0, poste: 12, arvore: 12, estatua_van: 12, moto_meli: 4, bicicleta: 4,
  computador_gamer: 8, aquario: 6, tv_casa: 8, placa_meli: 8, balanco: 10, varal: 8, cofre: 2, esteira_mini: 2, baker_decor: 6,
};

function circle(b: PixelBuffer, cx: number, cy: number, r: number, col: string, alpha?: number) {
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) b.set(cx + x, cy + y, col, alpha);
}

/** Desenha o móvel no buffer (W x H). Retorna false se o tipo não é conhecido aqui. */
export function furnitureArt(kind: string, b: PixelBuffer): boolean {
  const W = b.w;
  const H = b.h;
  const B = H - 1; // última linha
  switch (kind) {
    // ------------------------------------------------------------------ quarto
    case "cama": {
      b.fill(1, 1, 14, B - 1, "#6b4428"); // estrutura
      b.fill(2, 2, 12, 6, "#f4f4f4"); // travesseiro
      b.fill(3, 3, 10, 3, "#ffffff");
      b.fill(2, 8, 12, B - 10, "#3483fa"); // cobertor
      b.fill(2, 8, 12, 2, "#5a9cff");
      for (let y = 12; y < B - 2; y += 4) b.fill(2, y, 12, 1, "#2a6fd6");
      b.fill(1, B - 2, 14, 2, "#4a2e1a");
      return true;
    }
    case "cama_casal": {
      b.fill(1, 1, W - 2, B - 1, "#6b4428");
      b.fill(1, 1, W - 2, 3, "#4a2e1a"); // cabeceira
      b.fill(3, 4, 11, 6, "#f4f4f4");
      b.fill(18, 4, 11, 6, "#f4f4f4");
      b.fill(2, 10, W - 4, B - 12, "#ffe600");
      b.fill(2, 10, W - 4, 2, "#fff38a");
      for (let x = 4; x < W - 4; x += 6) b.fill(x, 14, 3, 3, "#f0c400");
      b.fill(1, B - 2, W - 2, 2, "#4a2e1a");
      return true;
    }
    case "guarda_roupa": {
      b.fill(1, 0, W - 2, H, "#8a5a30");
      b.fill(2, 1, W / 2 - 3, H - 3, "#b98552");
      b.fill(W / 2 + 1, 1, W / 2 - 3, H - 3, "#b98552");
      b.fill(W / 2 - 1, 1, 2, H - 3, "#6b4428");
      b.fill(W / 2 - 3, H / 2, 1, 4, "#f2c94c");
      b.fill(W / 2 + 2, H / 2, 1, 4, "#f2c94c");
      b.fill(1, H - 2, W - 2, 2, "#4a2e1a");
      return true;
    }
    case "armario": {
      b.fill(1, 2, W - 2, H - 2, "#e8e2d4");
      b.fill(1, 2, W - 2, 3, "#c9c0ae");
      for (let i = 0; i < 4; i++) {
        b.fill(2 + i * 7, 6, 6, H - 9, "#f6f1e6");
        b.set(4 + i * 7, 10, "#6b737c");
      }
      b.fill(1, H - 2, W - 2, 2, "#9a917f");
      return true;
    }
    // ------------------------------------------------------------------ sala
    case "sofa_casa": {
      b.fill(0, 1, W, 8, "#2d3277"); // encosto
      b.fill(0, 1, W, 2, "#4a52a8");
      b.fill(0, 8, W, 7, "#3a43a0"); // assento
      for (let x = 3; x < W - 3; x += 14) b.fill(x, 9, 12, 4, "#4a52a8");
      b.fill(0, 4, 4, 11, "#1f2450");
      b.fill(W - 4, 4, 4, 11, "#1f2450");
      b.fill(6, 4, 4, 4, "#ffe600"); // almofada amarela
      return true;
    }
    case "poltrona": {
      b.fill(2, 1, 12, 7, "#9a3a2c");
      b.fill(2, 1, 12, 2, "#c24f3d");
      b.fill(1, 6, 14, 7, "#b8483a");
      b.fill(1, 5, 3, 8, "#7d2e23");
      b.fill(12, 5, 3, 8, "#7d2e23");
      b.fill(3, 13, 2, 3, "#4a2e1a");
      b.fill(11, 13, 2, 3, "#4a2e1a");
      return true;
    }
    case "mesa_centro": {
      b.fill(2, 4, W - 4, 7, "#8a5a30");
      b.fill(2, 4, W - 4, 2, "#b98552");
      b.fill(3, 11, 2, 4, "#5c3a20");
      b.fill(W - 5, 11, 2, 4, "#5c3a20");
      b.fill(8, 5, 4, 3, "#f4f4f4"); // caneca
      b.fill(18, 5, 6, 2, "#ffe600"); // revista
      return true;
    }
    case "tv_casa": {
      b.fill(2, 0, W - 4, H - 7, "#1d1d26");
      b.fill(4, 2, W - 8, H - 11, "#2a6fd6");
      b.fill(6, 4, 10, 3, "#5fbaff");
      b.fill(W / 2 - 4, 6, 8, 4, "#ffe600"); // logo amarelo na tela
      b.fill(W / 2 - 2, H - 7, 4, 2, "#33363d");
      b.fill(1, H - 5, W - 2, 5, "#6b4428"); // rack
      b.fill(1, H - 5, W - 2, 1, "#8a5a30");
      return true;
    }
    case "estante": {
      b.fill(0, 0, W, H, "#6b4428");
      const cols = ["#e5533d", "#3483fa", "#ffe600", "#3fae5a", "#b39dff", "#f08a24", "#f4f4f4"];
      for (let r = 0; r < 3; r++) {
        const y = 2 + r * Math.floor((H - 4) / 3);
        b.fill(1, y, W - 2, Math.floor((H - 4) / 3) - 2, "#4a2e1a");
        for (let x = 2, i = r; x < W - 3; x += 3, i++) b.fill(x, y + 1, 2, Math.floor((H - 4) / 3) - 3, cols[i % cols.length]);
      }
      return true;
    }
    case "tapete":
    case "tapete_meli": {
      const a = kind === "tapete" ? "#9a3a2c" : "#ffe600";
      const c = kind === "tapete" ? "#e8c07a" : "#2d3277";
      b.fill(0, 1, W, H - 2, a);
      b.fill(2, 3, W - 4, H - 6, c);
      b.fill(4, 5, W - 8, H - 10, a);
      if (kind === "tapete_meli") {
        // aperto de mãos estilizado
        b.fill(W / 2 - 6, H / 2 - 2, 12, 4, "#2d3277");
        b.fill(W / 2 - 3, H / 2 - 3, 6, 6, "#f4f4f4");
      }
      for (let x = 1; x < W; x += 2) {
        b.set(x, 0, a);
        b.set(x, H - 1, a);
      }
      return true;
    }
    case "quadro_meli": {
      b.fill(2, 1, W - 4, H - 4, "#8a5a30");
      b.fill(4, 3, W - 8, H - 8, "#87c3ef");
      b.fill(4, H - 9, W - 8, 4, "#3fae5a");
      b.fill(9, 5, 14, 6, "#9aa3ad"); // galpão
      b.fill(9, 5, 14, 2, "#ffe600");
      b.fill(12, 8, 3, 3, "#33363d");
      return true;
    }
    case "luminaria": {
      b.fill(7, 8, 2, H - 10, "#33363d");
      b.fill(4, H - 3, 8, 2, "#33363d");
      b.fill(3, 1, 10, 7, "#fff3b0");
      b.fill(3, 1, 10, 2, "#ffe680");
      b.fill(2, 6, 12, 2, "#f2c94c");
      return true;
    }
    case "planta_casa":
    case "vaso_flores": {
      b.fill(4, H - 7, 8, 7, kind === "planta_casa" ? "#c96f3b" : "#3483fa");
      b.fill(3, H - 8, 10, 2, kind === "planta_casa" ? "#e08a52" : "#5a9cff");
      if (kind === "planta_casa") {
        circle(b, 5, H - 13, 4, "#2f7a2a");
        circle(b, 11, H - 14, 4, "#3f8a3a");
        circle(b, 8, H - 18, 4, "#4f9a3c");
        b.set(5, H - 14, "#1f5a1c");
        b.set(11, H - 15, "#1f5a1c");
      } else {
        b.fill(7, H - 13, 2, 5, "#3f7a32");
        circle(b, 5, H - 12, 2, "#ff6b8a");
        circle(b, 11, H - 12, 2, "#ffe066");
        circle(b, 8, H - 15, 2, "#ffffff");
      }
      return true;
    }
    case "aquario": {
      b.fill(1, 1, W - 2, H - 6, "#bfe9ff", 200);
      b.fill(2, 4, W - 4, H - 10, "#3fb5e8");
      b.fill(2, H - 8, W - 4, 2, "#e8c07a"); // areia
      b.fill(6, 8, 4, 2, "#f08a24");
      b.set(5, 8, "#f08a24");
      b.fill(20, 11, 4, 2, "#ffe600");
      b.set(24, 11, "#ffe600");
      b.fill(12, H - 12, 1, 5, "#3f8a3a");
      b.fill(26, H - 13, 1, 6, "#3f8a3a");
      b.fill(0, H - 5, W, 5, "#33363d");
      return true;
    }
    case "piano": {
      b.fill(0, 0, W, H - 3, "#1d1d26");
      b.fill(1, 1, W - 2, 3, "#33363d");
      b.fill(1, H - 10, W - 2, 4, "#f4f4f4");
      for (let x = 2; x < W - 2; x += 3) b.fill(x, H - 10, 1, 2, "#1d1d26");
      b.fill(2, H - 3, 2, 3, "#1d1d26");
      b.fill(W - 4, H - 3, 2, 3, "#1d1d26");
      return true;
    }
    case "computador_gamer": {
      b.fill(0, H - 7, W, 3, "#33363d"); // mesa
      b.fill(2, H - 4, 2, 4, "#1d1d26");
      b.fill(W - 4, H - 4, 2, 4, "#1d1d26");
      b.fill(4, 1, 16, 11, "#1d1d26"); // monitor
      b.fill(5, 2, 14, 8, "#5fffb0");
      b.fill(7, 4, 6, 3, "#ff5fd2");
      b.fill(11, 12, 2, H - 19, "#1d1d26");
      b.fill(22, 2, 8, H - 9, "#2b2b35"); // gabinete RGB
      for (let y = 4; y < H - 9; y += 3) b.fill(23, y, 6, 1, ["#ff5fd2", "#5fffb0", "#3483fa"][y % 3]);
      b.fill(6, H - 8, 12, 1, "#9aa3ad"); // teclado
      return true;
    }
    case "fliperama": {
      b.fill(1, 0, 14, H, "#2d3277");
      b.fill(1, 0, 14, 4, "#ffe600");
      b.fill(3, 5, 10, 8, "#1d1d26");
      b.fill(4, 6, 8, 6, "#5fffb0");
      b.fill(6, 8, 2, 2, "#ff5fd2");
      b.fill(2, 14, 12, 4, "#3483fa");
      circle(b, 5, 16, 1, "#e5533d");
      b.set(10, 16, "#ffe600");
      b.set(12, 16, "#5fffb0");
      b.fill(1, H - 3, 14, 3, "#1f2450");
      return true;
    }
    // ------------------------------------------------------------------ cozinha / banheiro
    case "geladeira": {
      b.fill(2, 0, 12, H, "#e8eef2");
      b.fill(2, 0, 12, 1, "#ffffff");
      b.fill(2, 10, 12, 1, "#9aa3ad");
      b.fill(11, 3, 1, 5, "#6b737c");
      b.fill(11, 13, 1, 7, "#6b737c");
      b.fill(4, 13, 3, 3, "#ffe600"); // ímã MELI
      b.fill(2, H - 2, 12, 2, "#9aa3ad");
      return true;
    }
    case "fogao": {
      b.fill(1, 2, 14, 14, "#f4f4f4");
      b.fill(1, 2, 14, 6, "#33363d");
      circle(b, 5, 4, 1, "#e5533d");
      circle(b, 11, 4, 1, "#9aa3ad");
      circle(b, 5, 7, 1, "#9aa3ad");
      circle(b, 11, 7, 1, "#9aa3ad");
      b.fill(3, 10, 10, 4, "#1d1d26");
      b.fill(4, 11, 8, 1, "#ff8a1f", 160);
      return true;
    }
    case "pia": {
      b.fill(0, 2, W, 14, "#e8e2d4");
      b.fill(0, 2, W, 5, "#9aa3ad");
      b.fill(4, 3, 12, 3, "#5d6670");
      b.fill(9, 0, 2, 3, "#c0c6cc");
      b.fill(20, 3, 8, 3, "#f4f4f4"); // pratos
      for (let i = 0; i < 4; i++) b.fill(2 + i * 8, 8, 6, 7, "#f6f1e6");
      return true;
    }
    case "banheira": {
      b.fill(0, 2, W, H - 3, "#f4f4f4");
      b.fill(2, 4, W - 4, H - 8, "#87d4ff");
      circle(b, 9, 7, 2, "#ffffff");
      circle(b, 13, 9, 2, "#ffffff");
      circle(b, 20, 7, 2, "#ffffff");
      b.fill(24, 6, 3, 2, "#ffe600"); // patinho
      b.fill(W - 4, 0, 2, 4, "#c0c6cc");
      return true;
    }
    case "mesa_jantar": {
      b.fill(1, 3, W - 2, H - 10, "#8a5a30");
      b.fill(1, 3, W - 2, 2, "#b98552");
      b.fill(3, H - 7, 2, 7, "#5c3a20");
      b.fill(W - 5, H - 7, 2, 7, "#5c3a20");
      circle(b, 10, 10, 3, "#f4f4f4");
      circle(b, 22, 12, 3, "#f4f4f4");
      b.fill(15, 7, 3, 4, "#e5533d"); // vaso/suco
      return true;
    }
    case "cadeira_casa": {
      b.fill(3, 0, 10, 8, "#8a5a30");
      b.fill(4, 1, 8, 2, "#b98552");
      b.fill(2, 7, 12, 4, "#b98552");
      b.fill(3, 11, 2, 5, "#5c3a20");
      b.fill(11, 11, 2, 5, "#5c3a20");
      return true;
    }
    case "cofre": {
      b.fill(1, 1, 14, H - 1, "#4a5568");
      b.fill(2, 2, 12, H - 4, "#5d6670");
      circle(b, 8, Math.floor(H / 2), 3, "#c0c6cc");
      b.set(8, Math.floor(H / 2), "#2b2b2b");
      b.fill(12, 5, 1, H - 9, "#f2c94c");
      return true;
    }
    // ------------------------------------------------------------------ bichos e coleção
    case "gato_galpao": {
      b.fill(4, 8, 8, 6, "#f08a24");
      b.fill(5, 4, 6, 5, "#f08a24");
      b.set(5, 3, "#f08a24");
      b.set(10, 3, "#f08a24");
      b.set(6, 6, "#1d1d26");
      b.set(9, 6, "#1d1d26");
      b.set(7, 7, "#ff8aa0");
      b.fill(12, 9, 2, 1, "#f08a24");
      b.fill(13, 6, 1, 4, "#f08a24");
      b.fill(5, 10, 6, 1, "#c96a1a");
      b.fill(4, 14, 2, 1, "#c96a1a");
      b.fill(10, 14, 2, 1, "#c96a1a");
      return true;
    }
    case "cachorro": {
      b.fill(2, 8, 10, 5, "#d9a35a");
      b.fill(9, 3, 6, 6, "#d9a35a");
      b.fill(14, 6, 2, 2, "#6b4428");
      b.fill(9, 3, 2, 4, "#b8803c");
      b.set(12, 5, "#1d1d26");
      b.fill(1, 6, 1, 3, "#d9a35a");
      b.fill(3, 13, 2, 3, "#b8803c");
      b.fill(9, 13, 2, 3, "#b8803c");
      b.fill(9, 9, 4, 1, "#e5533d"); // coleira
      return true;
    }
    case "esteira_mini": {
      b.fill(0, 4, W, 8, "#33363d");
      for (let x = 1; x < W - 1; x += 4) b.fill(x, 5, 3, 6, "#4a4d55");
      b.fill(0, 4, W, 1, "#ffe600");
      b.fill(0, 11, W, 1, "#ffe600");
      b.fill(6, 1, 8, 6, "#9c7a52");
      b.fill(22, 2, 6, 5, "#c48a52");
      b.fill(34, 1, 7, 6, "#9c7a52");
      b.fill(2, 12, 2, 4, "#1d1d26");
      b.fill(W - 4, 12, 2, 4, "#1d1d26");
      return true;
    }
    case "baker_decor": {
      b.fill(2, 2, W - 4, H - 6, "#9aa3ad");
      for (let x = 4; x < W - 3; x += 4) b.fill(x, 3, 1, H - 8, "#6b737c");
      for (let y = 6; y < H - 5; y += 6) b.fill(2, y, W - 4, 1, "#6b737c");
      b.fill(6, 8, 8, 6, "#9c7a52");
      b.fill(16, 12, 9, 7, "#c48a52");
      b.fill(8, 18, 8, 6, "#9c7a52");
      b.fill(2, 2, W - 4, 2, "#ffe600");
      circle(b, 6, H - 3, 2, "#1d1d26");
      circle(b, W - 7, H - 3, 2, "#1d1d26");
      return true;
    }
    // ------------------------------------------------------------------ quintal
    case "balanco": {
      b.fill(1, 0, 2, H, "#6b4428");
      b.fill(W - 3, 0, 2, H, "#6b4428");
      b.fill(1, 0, W - 2, 2, "#8a5a30");
      b.fill(10, 2, 1, H - 8, "#c0c6cc");
      b.fill(21, 2, 1, H - 8, "#c0c6cc");
      b.fill(8, H - 7, 16, 3, "#e5533d");
      return true;
    }
    case "arvore_natal": {
      for (let y = 2; y < H - 4; y++) {
        const half = Math.floor((y - 1) / 2.4) + 1;
        b.fill(8 - half, y, half * 2, 1, y % 5 === 0 ? "#2f7a2a" : "#3f8a3a");
      }
      b.fill(6, H - 4, 4, 4, "#8a5a30");
      b.fill(7, 0, 2, 3, "#ffe600");
      const lights = ["#e5533d", "#ffe600", "#3483fa", "#ffffff"];
      for (let i = 0; i < 10; i++) b.set(4 + ((i * 5) % 9), 6 + i * 2, lights[i % 4]);
      return true;
    }
    case "varal": {
      b.fill(1, 0, 2, H, "#6b4428");
      b.fill(W - 3, 0, 2, H, "#6b4428");
      b.fill(2, 3, W - 4, 1, "#c0c6cc");
      b.fill(6, 4, 6, 8, "#ffe600"); // camisa MELI
      b.fill(5, 4, 8, 3, "#ffe600");
      b.fill(15, 4, 5, 9, "#3483fa");
      b.fill(22, 4, 5, 6, "#f4f4f4");
      return true;
    }
    case "bicicleta": {
      circle(b, 4, H - 5, 3, "#1d1d26");
      circle(b, 4, H - 5, 2, "#9aa3ad");
      circle(b, 12, H - 5, 3, "#1d1d26");
      circle(b, 12, H - 5, 2, "#9aa3ad");
      b.fill(4, H - 9, 8, 1, "#e5533d");
      b.fill(7, H - 9, 1, 4, "#e5533d");
      b.fill(11, H - 12, 1, 4, "#33363d");
      b.fill(10, H - 12, 3, 1, "#33363d");
      b.fill(4, H - 11, 3, 1, "#33363d");
      b.fill(2, H - 13, 5, 3, "#ffe600"); // caixinha de entrega
      return true;
    }
    case "moto_meli": {
      circle(b, 6, H - 5, 4, "#1d1d26");
      circle(b, 6, H - 5, 2, "#9aa3ad");
      circle(b, W - 7, H - 5, 4, "#1d1d26");
      circle(b, W - 7, H - 5, 2, "#9aa3ad");
      b.fill(8, H - 11, 16, 5, "#3483fa");
      b.fill(12, H - 13, 8, 2, "#1d1d26");
      b.fill(W - 9, H - 15, 2, 6, "#33363d");
      b.fill(1, H - 18, 9, 8, "#ffe600"); // baú
      b.fill(3, H - 16, 5, 2, "#2d3277");
      return true;
    }
    case "fogueira": {
      b.fill(2, H - 4, 12, 3, "#6b4428");
      b.fill(4, H - 6, 8, 2, "#8a5a30");
      circle(b, 8, H - 9, 4, "#ff8a1f");
      circle(b, 8, H - 10, 2, "#ffe066");
      b.set(8, H - 14, "#ff8a1f");
      for (let i = 0; i < 5; i++) b.fill(2 + i * 3, H - 2, 2, 2, "#9aa3ad");
      return true;
    }
    case "caixa_dagua": {
      b.fill(3, 8, 2, H - 8, "#6b737c");
      b.fill(11, 8, 2, H - 8, "#6b737c");
      b.fill(1, 1, 14, 10, "#3483fa");
      b.fill(1, 1, 14, 2, "#5a9cff");
      b.fill(1, 9, 14, 2, "#2a6fd6");
      return true;
    }
    case "placa_meli": {
      b.fill(7, 10, 2, H - 10, "#6b4428");
      b.fill(0, 1, 16, 10, "#ffe600");
      b.fill(1, 2, 14, 8, "#fff38a");
      b.fill(3, 4, 10, 1, "#2d3277");
      b.fill(4, 6, 8, 1, "#2d3277");
      b.fill(5, 8, 6, 1, "#2d3277");
      return true;
    }
  }
  return false;
}

// ----------------------------------------------------------------------------- armas novas
export function newWeaponArt(id: string, b: PixelBuffer): boolean {
  switch (id) {
    case "grampeador":
      b.fill(4, 6, 9, 4, "#e5533d");
      b.fill(4, 6, 9, 1, "#ff7a66");
      b.fill(4, 10, 9, 2, "#33363d");
      b.fill(5, 12, 3, 4, "#33363d");
      b.set(13, 8, "#c0c6cc");
      return true;
    case "tesoura_industrial":
      b.fill(7, 0, 1, 9, "#c0c6cc");
      b.fill(9, 0, 1, 9, "#e8eef2");
      b.fill(7, 8, 3, 2, "#5a5f68");
      circle(b, 5, 12, 2, "#f08a24");
      circle(b, 11, 12, 2, "#f08a24");
      return true;
    case "lanca_coletor":
      b.fill(7, 3, 2, 13, "#5a5f68");
      b.fill(6, 0, 4, 3, "#33363d");
      b.fill(7, 1, 2, 1, "#5fffb0");
      b.set(8, 0, "#e5533d");
      b.fill(6, 9, 4, 2, "#ffe600");
      return true;
    case "espada_onda_branca":
      b.fill(7, 0, 3, 11, "#f4f4f4");
      b.fill(8, 0, 1, 11, "#ffffff");
      b.fill(7, 0, 1, 11, "#c9d4dc");
      b.fill(4, 11, 9, 2, "#9aa3ad");
      b.fill(7, 13, 3, 3, "#3483fa");
      return true;
    case "machado_fita":
      b.fill(7, 3, 2, 13, "#8a5a30");
      b.fill(2, 1, 6, 7, "#c0c6cc");
      b.fill(9, 1, 5, 7, "#c0c6cc");
      b.fill(2, 3, 12, 2, "#c9a96e"); // fita enrolada
      b.fill(3, 1, 1, 7, "#e8eef2");
      return true;
  }
  return false;
}

// ----------------------------------------------------------------------------- ícones novos
export function newIconArt(id: string, b: PixelBuffer): boolean {
  switch (id) {
    case "colete_turbo":
      b.fill(3, 2, 10, 13, "#f08a24");
      b.clear(6, 2, 4, 3);
      b.fill(3, 8, 10, 2, "#e8eef2");
      b.fill(3, 12, 10, 1, "#e8eef2");
      return true;
    case "uniforme_platinum":
      b.fill(3, 2, 10, 13, "#c9d4dc");
      b.clear(6, 2, 4, 2);
      b.fill(3, 2, 3, 4, "#9aa3ad");
      b.fill(10, 2, 3, 4, "#9aa3ad");
      b.fill(6, 6, 4, 3, "#ffe600");
      b.fill(7, 7, 2, 1, "#2d3277");
      return true;
    case "capa_mp":
      for (let y = 2; y < 15; y++) b.fill(8 - Math.floor(y / 2.2) - 1, y, Math.floor(y / 1.1) + 2, 1, "#00b1ea");
      b.fill(5, 2, 6, 2, "#2d3277");
      b.fill(6, 8, 4, 3, "#ffffff");
      b.set(7, 9, "#00b1ea");
      return true;
    case "acai":
      b.fill(2, 8, 12, 6, "#f4f4f4");
      b.fill(3, 13, 10, 2, "#c9c0ae");
      circle(b, 8, 7, 5, "#5b2a6e");
      b.fill(5, 4, 2, 2, "#ffe066");
      b.fill(9, 5, 2, 1, "#e5533d");
      b.set(7, 3, "#f4f4f4");
      return true;
    case "pastel":
      for (let x = 2; x < 15; x++) b.fill(x, 6 + Math.round(Math.abs(x - 8) / 3), 1, 8 - Math.round(Math.abs(x - 8) / 3), "#f2b94c");
      for (let x = 3; x < 14; x += 2) b.set(x, 13, "#c98a24");
      b.fill(5, 8, 2, 1, "#ffe680");
      return true;
    case "cafe_leite":
      b.fill(3, 4, 9, 10, "#f4f4f4");
      b.fill(4, 5, 7, 2, "#c48a52");
      b.fill(12, 7, 2, 4, "#f4f4f4");
      b.set(6, 2, "#c9c0ae");
      b.set(8, 1, "#c9c0ae");
      return true;
    case "brigadeiro":
      b.fill(3, 9, 10, 5, "#8a5a30");
      circle(b, 8, 8, 4, "#4a2e1a");
      for (const [x, y] of [[6, 6], [9, 7], [7, 9], [10, 9], [5, 8]]) b.set(x, y, ["#e5533d", "#ffe600", "#3fae5a", "#3483fa", "#ff6b8a"][x % 5]);
      return true;
    case "feijoada":
      b.fill(1, 6, 14, 8, "#5c3a20");
      b.fill(2, 7, 12, 4, "#2b1b17");
      b.fill(4, 8, 3, 2, "#9a3a2c");
      b.fill(9, 8, 2, 2, "#e8c07a");
      b.fill(0, 7, 2, 2, "#5c3a20");
      b.fill(14, 7, 2, 2, "#5c3a20");
      b.set(6, 4, "#c9c0ae");
      b.set(10, 3, "#c9c0ae");
      return true;
    case "suco_detox":
      b.fill(4, 3, 8, 12, "#c8ffd9", 200);
      b.fill(5, 6, 6, 8, "#5fbf4a");
      b.fill(10, 0, 1, 7, "#e5533d");
      b.fill(3, 2, 3, 2, "#3f8a3a");
      return true;
    case "etiqueta_dourada":
      b.fill(2, 4, 12, 8, "#f2c94c");
      b.fill(3, 5, 10, 6, "#ffe680");
      for (let x = 4; x < 12; x += 2) b.fill(x, 6, 1, 4, "#b8860b");
      b.fill(0, 7, 2, 2, "#b8860b");
      b.set(13, 3, "#ffffff");
      return true;
    case "engrenagem_sorter":
      circle(b, 8, 8, 5, "#9aa3ad");
      for (const [x, y] of [[8, 1], [8, 14], [1, 8], [14, 8], [3, 3], [12, 3], [3, 12], [12, 12]]) b.fill(x - 1, y - 1, 2, 2, "#9aa3ad");
      circle(b, 8, 8, 2, "#5d6670");
      return true;
    case "caixa_misteriosa":
      b.fill(2, 4, 12, 11, "#9c7a52");
      b.fill(2, 4, 12, 3, "#b8946a");
      b.fill(7, 4, 2, 11, "#ffe600");
      b.fill(2, 9, 12, 2, "#ffe600");
      b.fill(5, 1, 6, 3, "#ffe600");
      b.set(8, 11, "#2d3277");
      b.fill(11, 12, 2, 2, "#2d3277"); // "?"
      return true;
  }
  return false;
}
