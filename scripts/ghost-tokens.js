export function computeOffsets(count, start = 0) {
  const grid = canvas.scene.grid.size;
  const offsets = [];
  const visited = new Set(["0,0"]);
  let frontier = [{ x: 0, y: 0 }];
  let idx = 0;

  while (offsets.length < count) {
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
      ];
      for (const d of deltas) {
        const nx = x + d.x;
        const ny = y + d.y;
        const key = `${nx},${ny}`;
        if (visited.has(key)) continue;
        visited.add(key);
        next.push({ x: nx, y: ny });
        if (idx >= start && offsets.length < count) {
          offsets.push({ x: nx * grid, y: ny * grid });
        }
        idx++;
        if (offsets.length >= count) break;
      }
      if (offsets.length >= count) break;
    }
    frontier = next;
  }
  return offsets;
}

export async function spawnGhostTokens(token) {
  const actor = token.actor;
  if (!actor?.system?.mob?.isMob?.value) return;

  const bodies = actor.system.mob.bodies?.value || 1;
  await token.update({
    [`flags.witch-iron.isMobLeader`]: true,
    overlayEffect: "icons/svg/target.svg"
  });
  await adjustGhostTokenCount(token, bodies - 1);
}

export async function adjustGhostTokenCount(token, required) {
  const tiles = canvas.scene.tiles.filter(t => t.getFlag("witch-iron", "ghostParent") === token.id);
  const offsets = computeOffsets(required, 0);

  const tilesByIndex = new Map();
  for (const tile of tiles) {
    const idx = tile.getFlag("witch-iron", "ghostIndex");
    tilesByIndex.set(idx, tile);
  }

  const grid = canvas.scene.grid.size;
  const doc = token.document ?? token;
  const width = doc.width * grid;
  const height = doc.height * grid;
  const newTiles = [];
  const idsToDelete = [];

  for (let i = 0; i < offsets.length; i++) {
    const offset = offsets[i];
    const tile = tilesByIndex.get(i);
    const data = {
      x: token.x + offset.x,
      y: token.y + offset.y,
      rotation: token.rotation,
      width,
      height,
      img: doc.texture?.src || doc.img,
      flags: { "witch-iron": { ghostParent: token.id, ghostIndex: i } }
    };
    if (tile) {
      await tile.update(data);
      tilesByIndex.delete(i);
    } else {
      newTiles.push(data);
    }
  }

  // Remaining tiles in tilesByIndex are excess and should be removed
  for (const tile of tilesByIndex.values()) idsToDelete.push(tile.id);

  if (newTiles.length) await canvas.scene.createEmbeddedDocuments("Tile", newTiles);
  if (idsToDelete.length) await canvas.scene.deleteEmbeddedDocuments("Tile", idsToDelete);
}

export function updateGhostTokenPositions(token) {
  if (!token.getFlag("witch-iron", "isMobLeader")) return;
  const tiles = canvas.scene.tiles.filter(t => t.getFlag("witch-iron", "ghostParent") === token.id);
  tiles.sort((a, b) => a.getFlag("witch-iron", "ghostIndex") - b.getFlag("witch-iron", "ghostIndex"));
  const offsets = computeOffsets(tiles.length, 0);
  tiles.forEach((tile, i) => {
    const o = offsets[i];
    tile.update({ x: token.x + o.x, y: token.y + o.y, rotation: token.rotation });
  });
}

export async function deleteGhostTokens(token) {
  const tiles = canvas.scene.tiles.filter(t => t.getFlag("witch-iron", "ghostParent") === token.id);
  const ids = tiles.map(t => t.id);
  if (ids.length) await canvas.scene.deleteEmbeddedDocuments("Tile", ids);
}

Hooks.on("createToken", token => spawnGhostTokens(token));

Hooks.on("updateToken", (token, changes) => {
  if ("x" in changes || "y" in changes || "rotation" in changes) {
    updateGhostTokenPositions(token);
  }
});

Hooks.on("deleteToken", token => deleteGhostTokens(token));

Hooks.on("updateActor", actor => {
  const tokens = canvas.scene.tokens.filter(t => t.actor?.id === actor.id);
  const isMob = actor.system?.mob?.isMob?.value;
  const bodies = actor.system?.mob?.bodies?.value || 1;
  tokens.forEach(t => {
    if (isMob) {
      if (!t.getFlag("witch-iron", "isMobLeader")) {
        spawnGhostTokens(t);
      } else {
        adjustGhostTokenCount(t, bodies - 1);
      }
    } else if (t.getFlag("witch-iron", "isMobLeader")) {
      t.update({ "flags.witch-iron.isMobLeader": null, overlayEffect: "" });
      deleteGhostTokens(t);
    }
  });
});