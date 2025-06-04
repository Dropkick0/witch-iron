/**
 * Open a dialog for applying situational modifiers to a roll.
 *
 * @param {Actor} actor                    Actor owning the roll
 * @param {Object} [opts]                  Options for the dialog
 * @param {string} [opts.title]            Title of the dialog
 * @param {number} [opts.defaultHits]      Initial value for additional hits
 * @param {Array<Object>} [opts.effects]   Active effects to offer for selection
 *                                         Each effect object should contain:
 *                                           {id: string, label: string,
 *                                            mode: 'hits'|'target', value: number}
 */
export async function openModifierDialog(actor, {title="Roll Modifiers", defaultHits=0, effects=[]}={}) {
  const blind = actor?.system?.conditions?.blind?.value || 0;
  const deaf = actor?.system?.conditions?.deaf?.value || 0;
  const pain = actor?.system?.conditions?.pain?.value || 0;

  const hitsEffects = effects.filter(e => e.mode === 'hits');
  const targetEffects = effects.filter(e => e.mode === 'target');

  return new Promise(resolve => {
    const hitsRows = hitsEffects.map((e, i) => `
        <div class="form-group modifier-row" data-toggle="effect${i}" data-type="hits" data-value="${e.value}">
          <label>${e.label}</label>
          <span>${e.value >= 0 ? '+' : ''}${e.value}</span>
          <input type="hidden" name="effect${i}" value="0">
        </div>`).join('');

    const targetRows = targetEffects.map((e, i) => `
        <div class="form-group modifier-row" data-toggle="target${i}" data-type="target" data-value="${e.value}">
          <label>${e.label}</label>
          <span>${e.value >= 0 ? '+' : ''}${e.value}</span>
          <input type="hidden" name="target${i}" value="0">
        </div>`).join('');

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
        <h3>Condition Modifiers</h3>
        <div class="form-group modifier-row ${blind ? 'selected' : ''}" data-toggle="useBlind">
          <label>Blind</label>
          <input type="number" name="blindRating" value="${blind}" min="0" />
          <input type="hidden" name="useBlind" value="${blind ? 1 : 0}">
        </div>
        <div class="form-group modifier-row ${deaf ? 'selected' : ''}" data-toggle="useDeaf">
          <label>Deaf</label>
          <input type="number" name="deafRating" value="${deaf}" min="0" />
          <input type="hidden" name="useDeaf" value="${deaf ? 1 : 0}">
        </div>
        <div class="form-group modifier-row selected" data-toggle="usePain">
          <label>Pain</label>
          <input type="number" name="painRating" value="${pain}" min="0" />
          <input type="hidden" name="usePain" value="1">
        </div>
        <h3>Hits Modifiers</h3>
        <div class="form-group">
          <label>Additional +Hits</label>
          <input type="number" name="additionalHits" value="${defaultHits}" />
        </div>
        ${hitsRows ? `<div class="modifier-list">${hitsRows}</div>` : ''}
        ${targetRows ? `<h3>Target Modifiers</h3><div class="modifier-list">${targetRows}</div>` : ''}
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
            if (parseInt(form.useBlind.value)) situationalMod -= 10 * (parseInt(form.blindRating.value) || 0);
            if (parseInt(form.useDeaf.value)) situationalMod -= 10 * (parseInt(form.deafRating.value) || 0);
            if (parseInt(form.usePain.value)) situationalMod -= 10 * (parseInt(form.painRating.value) || 0);
            let additionalHits = parseInt(form.additionalHits.value) || 0;

            form.querySelectorAll('.modifier-row').forEach(row => {
              const hidden = row.querySelector('input[type="hidden"]');
              if (!hidden || !parseInt(hidden.value) || row.dataset.value === undefined) return;
              const value = parseInt(row.dataset.value) || 0;
              if (row.dataset.type === 'hits') additionalHits += value;
              if (row.dataset.type === 'target') situationalMod += value;
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
