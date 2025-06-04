export const FORMATION_SHAPES = [
  "line",
  "doubleLine",
  "tripleLine",
  "column",
  "wedge",
  "echelonLeft",
  "echelonRight",
  "square",
  "diamond",
  "circle",
  "triangle",
  "skirmish"
];

export function computeOffsets(count, start = 0, formation = "skirmish") {
  const grid = canvas.scene.grid.size;
  const needed = count + start;
  const coords = [];
  const add = (x, y) => coords.push({ x: x * grid, y: y * grid });

  switch (formation) {
    case "line": {
      for (let i = 1; coords.length < needed; i++) add(i, 0);
      break;
    }
    case "doubleLine": {
      for (let i = 1; coords.length < needed; i++) {
        add(i, 0);
        if (coords.length < needed) add(i, 1);
      }
      break;
    }
    case "tripleLine": {
      for (let i = 1; coords.length < needed; i++) {
        add(i, 0);
        if (coords.length < needed) add(i, 1);
        if (coords.length < needed) add(i, -1);
      }
      break;
    }
    case "column": {
      for (let i = 1; coords.length < needed; i++) add(0, i);
      break;
    }
    case "wedge": {
      for (let r = 1; coords.length < needed; r++) {
        for (let i = -r; i <= r && coords.length < needed; i++) add(i, r);
      }
      break;
    }
    case "echelonLeft": {
      for (let i = 1; coords.length < needed; i++) add(-i, i);
      break;
    }
    case "echelonRight": {
      for (let i = 1; coords.length < needed; i++) add(i, i);
      break;
    }
    case "square": {
      const side = Math.ceil(Math.sqrt(needed));
      for (let r = 1; r <= side && coords.length < needed; r++) {
        for (let c = 0; c < side && coords.length < needed; c++) {
          add(c - Math.floor(side / 2), r);
        }
      }
      break;
    }
    case "diamond": {
      for (let d = 1; coords.length < needed; d++) {
        for (let x = -d; x <= d && coords.length < needed; x++) {
          const y = d - Math.abs(x);
          if (y > 0) {
            add(x, y);
            if (coords.length < needed) add(x, -y);
          } else {
            add(x, 0);
          }
        }
      }
      break;
    }
    case "circle": {
      const radius = Math.ceil(Math.sqrt(needed));
      for (let i = 0; i < needed; i++) {
        const ang = (i / needed) * 2 * Math.PI;
        add(Math.round(radius * Math.cos(ang)), Math.round(radius * Math.sin(ang)));
      }
      break;
    }
    case "triangle": {
      for (let r = 1; coords.length < needed; r++) {
        for (let i = 0; i < r && coords.length < needed; i++) {
          add(i - Math.floor(r / 2), r);
        }
      }
      break;
    }
    default: { // skirmish/random spread
      const visited = new Set(["0,0"]);
      let frontier = [{ x: 0, y: 0 }];
      while (coords.length < needed) {
        const next = [];
        for (const { x, y } of frontier) {
          const deltas = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
            { x: 1, y: 1 },
            { x: 1, y: -1 },
            { x: -1, y: 1 },
            { x: -1, y: -1 },
          ].sort(() => Math.random() - 0.5);
          for (const d of deltas) {
            const nx = x + d.x;
            const ny = y + d.y;
            const key = `${nx},${ny}`;
            if (visited.has(key)) continue;
            visited.add(key);
            next.push({ x: nx, y: ny });
            add(nx, ny);
            if (coords.length >= needed) break;
          }
          if (coords.length >= needed) break;
        }
        frontier = next;
      }
      break;
    }
  }

  return coords.slice(start, start + count);
}

export async function spawnGhostTokens(token) {
  const actor = token.actor;
  if (!actor?.system?.mob?.isMob?.value) return;

  const bodies = actor.system.mob.bodies?.value || 1;
  if (bodies < 5) return;
  await token.update({
    [`flags.witch-iron.isMobLeader`]: true,
    overlayEffect: "icons/svg/target.svg"
  });
  await syncGhostTiles(token, bodies - 1);
}

export async function syncGhostTiles(token, required, overrides = {}) {
  const tiles = canvas.scene.tiles.filter(t => t.getFlag("witch-iron", "ghostParent") === token.id);
  const formation = token.actor?.system?.mob?.formation?.value || "skirmish";
  const offsets = computeOffsets(required, 0, formation);

  const tilesByIndex = new Map();
  for (const tile of tiles) {
    const idx = tile.getFlag("witch-iron", "ghostIndex");
    tilesByIndex.set(idx, tile);
  }

  const grid = canvas.scene.grid.size;
  const doc = token.document ?? token;
  const width = doc.width * grid;
  const height = doc.height * grid;
  const xBase = overrides.x ?? token.x;
  const yBase = overrides.y ?? token.y;
  const rotation = overrides.rotation ?? token.rotation;
  const imgPath = doc.texture?.src || doc.img || token.actor?.prototypeToken?.texture?.src || token.actor?.prototypeToken?.img || "icons/svg/mystery-man.svg";
  const updateData = [];
  const createData = [];
  const idsToDelete = [];

  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];
    const tile = tilesByIndex.get(i);
    const base = {
      x: xBase + offset.x,
      y: yBase + offset.y,
      rotation,
      width,
      height,
      texture: { src: imgPath },
      overhead: true,
      occlusion: { mode: 0 },
      flags: { "witch-iron": { ghostParent: token.id, ghostIndex: i } }
    };

    if (tile) {
      updateData.push({ _id: tile.id, ...base });
      tilesByIndex.delete(i);
    } else {
      createData.push(base);
    }
  }

  for (const tile of tilesByIndex.values()) idsToDelete.push(tile.id);

  if (updateData.length) await canvas.scene.updateEmbeddedDocuments("Tile", updateData);
  if (createData.length) await canvas.scene.createEmbeddedDocuments("Tile", createData);
  if (idsToDelete.length) await canvas.scene.deleteEmbeddedDocuments("Tile", idsToDelete);
}

export function updateGhostTokenPositions(token, changes = {}) {
  if (!token.getFlag("witch-iron", "isMobLeader")) return;
  const tiles = canvas.scene.tiles.filter(t => t.getFlag("witch-iron", "ghostParent") === token.id);
  const overrides = {
    x: "x" in changes ? changes.x : token.x,
    y: "y" in changes ? changes.y : token.y,
    rotation: "rotation" in changes ? changes.rotation : token.rotation
  };
  syncGhostTiles(token, tiles.length, overrides);
}

export async function deleteGhostTokens(token) {
  const tiles = canvas.scene.tiles.filter(t => t.getFlag("witch-iron", "ghostParent") === token.id);
  const ids = tiles.map(t => t.id);
  if (ids.length) await canvas.scene.deleteEmbeddedDocuments("Tile", ids);
}

Hooks.on("createToken", token => spawnGhostTokens(token));

Hooks.on("updateToken", (token, changes) => {
  if ("x" in changes || "y" in changes || "rotation" in changes) {
    updateGhostTokenPositions(token, changes);
  }
});

Hooks.on("deleteToken", token => deleteGhostTokens(token));

Hooks.on("updateActor", actor => {
  const tokens = canvas.scene.tokens.filter(t => t.actor?.id === actor.id);
  const isMob = actor.system?.mob?.isMob?.value;
  const bodies = actor.system?.mob?.bodies?.value || 1;
  const show = isMob && bodies >= 5;
  tokens.forEach(t => {
    if (show) {
      if (!t.getFlag("witch-iron", "isMobLeader")) {
        spawnGhostTokens(t);
      } else {
        syncGhostTiles(t, bodies - 1);
      }
    } else if (t.getFlag("witch-iron", "isMobLeader")) {
      t.update({ "flags.witch-iron.isMobLeader": null, overlayEffect: "" });
      deleteGhostTokens(t);
    }
  });
});
