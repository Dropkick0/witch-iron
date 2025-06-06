export async function openModifierDialog(actor, {title="Roll Modifiers", defaultHits=0}={}) {
  const blind = actor?.system?.conditions?.blind?.value || 0;
  const deaf = actor?.system?.conditions?.deaf?.value || 0;
  const pain = actor?.system?.conditions?.pain?.value || 0;
  const prone = actor?.system?.conditions?.prone?.value || 0;
  const trauma = actor?.system?.conditions?.trauma || {};

  // ------------------------------------------------------------
  // Active Effect Parsing
  // ------------------------------------------------------------
  // Witch Iron uses Active Effects to represent miscellaneous bonuses
  // or penalties that may apply to rolls. Each effect that should show
  // up in the modifier dialog is expected to have a flag under
  // `flags.witch-iron.modifier` with the following structure:
  // {
  //   type: "hits" | "target",  // what the modifier affects
  //   value: Number             // amount applied when selected
  // }
  // Effects without this flag are ignored by the dialog but still
  // apply normally through Foundry's standard Active Effect system.

  const effects = actor?.effects?.contents || [];
  let effectRows = effects.map(e => {
    const mod = e.flags?.["witch-iron"]?.modifier;
    if (!mod) return "";
    const label = e.name ?? e.label ?? "Unnamed";
    const val = Number(mod.value) || 0;
    const dataAttr = mod.type === "hits"
      ? `data-hits="${val}" data-target="0"`
      : `data-hits="0" data-target="${val}"`;
    const valueLabel = mod.type === "hits"
      ? `${val >= 0 ? "+" : ""}${val} Hits`
      : `${val >= 0 ? "+" : ""}${val} TN`;
    return `<div class="form-group effect-row">
              <label><input type="checkbox" name="effect-${e.id}" ${dataAttr}/> ${label}</label>
              <span>${valueLabel}</span>
            </div>`;
  }).join("");

  // Detect if any targeted token is prone
  const targets = Array.from(game.user?.targets || []);
  const targetProne = targets.some(t => t.actor?.system?.conditions?.prone?.value > 0);

  const conditionRows = [];
  if (blind > 0) {
    const blindPenalty = -10 * blind;
    conditionRows.push(`
        <div class="form-group modifier-row" data-toggle="useBlind">
          <label>Blind</label>
          <span class="modifier-value">${blindPenalty}%</span>
          <input type="number" name="blindRating" value="${blind}" min="0" />
          <input type="hidden" name="useBlind" value="0">
        </div>`);
  }
  if (deaf > 0) {
    const deafPenalty = -10 * deaf;
    conditionRows.push(`
        <div class="form-group modifier-row" data-toggle="useDeaf">
          <label>Deaf</label>
          <span class="modifier-value">${deafPenalty}%</span>
          <input type="number" name="deafRating" value="${deaf}" min="0" />
          <input type="hidden" name="useDeaf" value="0">
        </div>`);
  }
  if (pain > 0) {
    const painPenalty = -10 * pain;
    conditionRows.push(`
        <div class="form-group modifier-row selected" data-toggle="usePain">
          <label>Pain</label>
          <span class="modifier-value">${painPenalty}%</span>
          <input type="number" name="painRating" value="${pain}" min="0" />
          <input type="hidden" name="usePain" value="1">
        </div>`);
  }
  if (prone > 0) {
    const pronePenalty = -20 * prone;
    conditionRows.push(`
        <div class="form-group modifier-row selected" data-toggle="useProne">
          <label>Prone</label>
          <span class="modifier-value">${pronePenalty}%</span>
          <input type="number" name="proneRating" value="${prone}" min="0" disabled />
          <input type="hidden" name="useProne" value="1">
        </div>`);
  }

  if (targetProne) {
    conditionRows.push(`
        <div class="form-group modifier-row" data-toggle="useTargetProne">
          <label>Target Prone</label>
          <span class="modifier-value">+20%</span>
          <span class="rating-spacer"></span>
          <input type="hidden" name="useTargetProne" value="0">
        </div>`);
  }

  for (const [loc, data] of Object.entries(trauma)) {
    const val = Number(data?.value) || 0;
    if (val > 0) {
      const locLabel = loc.replace(/([A-Z])/g, ' $1');
      const traumaPenalty = -20 * val;
      conditionRows.push(`
        <div class="form-group modifier-row" data-toggle="useTrauma-${loc}">
          <label>Trauma (${locLabel})</label>
          <span class="modifier-value">${traumaPenalty}%</span>
          <input type="number" name="traumaRating-${loc}" value="${val}" min="0" />
          <input type="hidden" name="useTrauma-${loc}" value="0">
        </div>`);
    }
  }

  return new Promise(resolve => {
    const content = `
      <form class="witch-iron modifier-dialog">
        <h3>Difficulty Modifier</h3>
        <div class="form-group">
          <select name="difficulty">
            <option value="40">Very Easy +40%</option>
            <option value="20">Easy +20%</option>
            <option value="0" selected>Normal +0%</option>
            <option value="-20">Hard -20%</option>
            <option value="-40">Very Hard -40%</option>
          </select>
        </div>
        ${conditionRows.length ? `<h3>Condition Modifiers</h3>${conditionRows.join('')}` : ''}
        <h3>Hits Modifiers</h3>
        <div class="form-group">
          <label>Additional +Hits</label>
          <input type="number" name="additionalHits" value="${defaultHits}" />
        </div>
        ${effectRows ? `<h3>Active Effects</h3><div class="effects-list">${effectRows}</div>` : ''}
      </form>`;
    const dialog = new Dialog({
      title,
      content,
      buttons: {
        roll: {
          label: "Roll",
          callback: html => {
            const form = html[0].querySelector("form");
            let situationalMod = Number(form.difficulty.value) || 0;
            const useBlind = form.querySelector('[name="useBlind"]')?.value;
            const blindRating = form.querySelector('[name="blindRating"]')?.value;
            if (parseInt(useBlind)) situationalMod -= 10 * (parseInt(blindRating) || 0);
            const useDeaf = form.querySelector('[name="useDeaf"]')?.value;
            const deafRating = form.querySelector('[name="deafRating"]')?.value;
            if (parseInt(useDeaf)) situationalMod -= 10 * (parseInt(deafRating) || 0);
            const usePain = form.querySelector('[name="usePain"]')?.value;
            const painRating = form.querySelector('[name="painRating"]')?.value;
            if (parseInt(usePain)) situationalMod -= 10 * (parseInt(painRating) || 0);
            const useProne = form.querySelector('[name="useProne"]')?.value;
            const proneRating = form.querySelector('[name="proneRating"]')?.value;
            if (parseInt(useProne)) situationalMod -= 20 * (parseInt(proneRating) || 1);

            const useTargetProne = form.querySelector('[name="useTargetProne"]')?.value;
            if (parseInt(useTargetProne)) situationalMod += 20;

            for (const [loc, data] of Object.entries(trauma)) {
              const useTrauma = form.querySelector(`[name="useTrauma-${loc}"]`)?.value;
              const traumaRating = form.querySelector(`[name="traumaRating-${loc}"]`)?.value;
              if (parseInt(useTrauma)) situationalMod -= 20 * (parseInt(traumaRating) || 0);
            }
            let additionalHits = parseInt(form.additionalHits.value) || 0;

            // Apply selected Active Effects
            form.querySelectorAll('.effect-row input:checked').forEach(cb => {
              const hits = Number(cb.dataset.hits) || 0;
              const tgt = Number(cb.dataset.target) || 0;
              additionalHits += hits;
              situationalMod += tgt;
            });

            resolve({ situationalMod, additionalHits });
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "roll",
      render: html => {
        // Toggle rows when clicked
        html.find('.modifier-row').on('click', ev => {
          const row = $(ev.currentTarget);
          const hidden = row.find('input[type="hidden"]');
          row.toggleClass('selected');
          hidden.val(row.hasClass('selected') ? 1 : 0);
        });

        // Support pressing Enter to confirm the roll
        html.closest('.app.dialog').on('keydown.mod', ev => {
          if (ev.key === 'Enter') {
            ev.preventDefault();
            html.closest('.app.dialog').find('button[data-button="roll"]').click();
          }
        });
      },
      close: html => {
        html.closest('.app.dialog').off('keydown.mod');
      }
    }, { classes: ["witch-iron", "modifier-dialog"] });
    dialog.render(true);
  });
}
