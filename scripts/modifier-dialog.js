export async function openModifierDialog(actor, {title="Roll Modifiers", defaultHits=0}={}) {
  const blind = actor?.system?.conditions?.blind?.value || 0;
  const deaf = actor?.system?.conditions?.deaf?.value || 0;
  const pain = actor?.system?.conditions?.pain?.value || 0;

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
        <h3>Condition Modifiers</h3>
        <div class="form-group">
          <label><input type="checkbox" name="useBlind" ${blind ? "checked" : ""}/> Blind</label>
          <input type="number" name="blindRating" value="${blind}" min="0" />
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="useDeaf" ${deaf ? "checked" : ""}/> Deaf</label>
          <input type="number" name="deafRating" value="${deaf}" min="0" />
        </div>
        <div class="form-group">
          <label><input type="checkbox" name="usePain" checked/> Pain</label>
          <input type="number" name="painRating" value="${pain}" min="0" />
        </div>
        <h3>Hits Modifiers</h3>
        <div class="form-group">
          <label>Additional +Hits</label>
          <input type="number" name="additionalHits" value="${defaultHits}" />
        </div>
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
            if (form.useBlind.checked) situationalMod -= 10 * (parseInt(form.blindRating.value) || 0);
            if (form.useDeaf.checked) situationalMod -= 10 * (parseInt(form.deafRating.value) || 0);
            if (form.usePain.checked) situationalMod -= 10 * (parseInt(form.painRating.value) || 0);
            const additionalHits = parseInt(form.additionalHits.value) || 0;
            resolve({ situationalMod, additionalHits });
          }
        },
        cancel: {
          label: "Cancel",
          callback: () => resolve(null)
        }
      },
      default: "roll"
    }, { classes: ["witch-iron", "modifier-dialog"] });
    dialog.render(true);
  });
}
