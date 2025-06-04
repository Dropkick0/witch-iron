export function createItem(actor, type, {name, img, system} = {}) {
  if (!actor) throw new Error('Actor is required to create an item');
  const capitalized = type.charAt(0).toUpperCase() + type.slice(1);
  const itemData = {
    name: name || `New ${capitalized}`,
    type,
    system: system || {}
  };
  if (img) itemData.img = img;
  return actor.createEmbeddedDocuments('Item', [itemData]);
}

/**
 * Show a unified modifier dialog for rolls.
 * @param {string} title       Dialog title
 * @param {Function} callback  Called with {situationalMod, additionalHits}
 */
export function showModifierDialog(title, callback) {
  const content = `
    <form>
      <h3>Target Number Modifiers</h3>
      <div class="form-group">
        <label>Difficulty</label>
        <select name="difficulty">
          <option value="40">Very Easy +40%</option>
          <option value="20">Easy +20%</option>
          <option value="0" selected>Normal +0%</option>
          <option value="-20">Hard -20%</option>
          <option value="-40">Very Hard -40%</option>
        </select>
      </div>
      <div class="form-group">
        <label>Situational Modifier</label>
        <input type="number" name="situationalMod" value="0" step="10" />
      </div>
      <div class="form-group">
        <label><input type="checkbox" name="condBlind"/> Blind Rating</label>
        <input type="number" name="blindRating" value="0" min="0" />
      </div>
      <div class="form-group">
        <label><input type="checkbox" name="condDeaf"/> Deaf Rating</label>
        <input type="number" name="deafRating" value="0" min="0" />
      </div>
      <div class="form-group">
        <label><input type="checkbox" name="condPain" checked/> Pain Rating</label>
        <input type="number" name="painRating" value="0" min="0" />
      </div>
      <h3>Hits Modifiers</h3>
      <div class="form-group">
        <label>Additional +Hits</label>
        <input type="number" name="additionalHits" value="0" />
      </div>
    </form>
  `;

  const dialog = new Dialog({
    title,
    content,
    classes: ["witch-iron", "modifier-dialog"],
    buttons: {
      roll: {
        label: "Roll",
        callback: html => {
          const form = html[0].querySelector("form");
          let situationalMod = parseInt(form.situationalMod.value) || 0;
          const diffMod = parseInt(form.difficulty.value) || 0;
          const additionalHits = parseInt(form.additionalHits.value) || 0;

          if (form.condBlind.checked) {
            situationalMod -= 10 * (parseInt(form.blindRating.value) || 0);
          }
          if (form.condDeaf.checked) {
            situationalMod -= 10 * (parseInt(form.deafRating.value) || 0);
          }
          if (form.condPain.checked) {
            situationalMod -= 10 * (parseInt(form.painRating.value) || 0);
          }

          situationalMod += diffMod;

          callback({ situationalMod, additionalHits });
        }
      },
      cancel: { label: "Cancel" }
    },
    default: "roll"
  });

  dialog.render(true);
}
