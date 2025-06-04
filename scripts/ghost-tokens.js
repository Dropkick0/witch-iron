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
  await token.update({ [`flags.witch-iron.isMobLeader`]: true, overlayEffect: "icons/svg/target.svg" });
  await adjustGhostTokenCount(token, bodies - 1);
}

export async function adjustGhostTokenCount(token, required) {
  const ghosts = canvas.scene.tokens.filter(t => t.getFlag("witch-iron", "ghostParent") === token.id);
  const diff = required - ghosts.length;
  if (diff > 0) {
    const offsets = computeOffsets(diff, ghosts.length);
    const createData = offsets.map((o, i) => {
      const data = token.toObject();
      data.x = token.x + o.x;
      data.y = token.y + o.y;
      data.flags = foundry.utils.mergeObject(data.flags || {}, {
        "witch-iron": { ghostParent: token.id, ghostIndex: ghosts.length + i },
      });
      data.overlayEffect = "";
      return data;
    });
    await canvas.scene.createEmbeddedDocuments("Token", createData);
  } else if (diff < 0) {
    const remove = ghosts.slice(diff);
    const ids = remove.map(g => g.id);
    await canvas.scene.deleteEmbeddedDocuments("Token", ids);
  }
  updateGhostTokenPositions(token);
}

export function updateGhostTokenPositions(token) {
  if (!token.getFlag("witch-iron", "isMobLeader")) return;
  const ghosts = canvas.scene.tokens.filter(t => t.getFlag("witch-iron", "ghostParent") === token.id);
  const offsets = computeOffsets(ghosts.length, 0);
  ghosts.forEach((g, i) => {
    const o = offsets[i];
    g.update({ x: token.x + o.x, y: token.y + o.y, rotation: token.rotation });
  });
}

export async function deleteGhostTokens(token) {
  const ghosts = canvas.scene.tokens.filter(t => t.getFlag("witch-iron", "ghostParent") === token.id);
  const ids = ghosts.map(g => g.id);
  if (ids.length) await canvas.scene.deleteEmbeddedDocuments("Token", ids);
}

Hooks.on("createToken", (token) => spawnGhostTokens(token));
Hooks.on("updateToken", (token) => updateGhostTokenPositions(token));
Hooks.on("deleteToken", (token) => deleteGhostTokens(token));
Hooks.on("updateActor", (actor) => {
  const tokens = canvas.scene.tokens.filter(t => t.actor?.id === actor.id && t.getFlag("witch-iron", "isMobLeader"));
  const bodies = actor.system?.mob?.bodies?.value || 1;
  tokens.forEach(t => adjustGhostTokenCount(t, bodies - 1));
});
