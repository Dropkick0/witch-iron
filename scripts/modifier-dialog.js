export async function openModifierDialog(actor, { title = "Roll Modifiers", defaultHits = 0 } = {}) {
  const blind = actor?.system?.conditions?.blind?.value || 0;
  const deaf = actor?.system?.conditions?.deaf?.value || 0;
  const pain = actor?.system?.conditions?.pain?.value || 0;

  return new Promise(resolve => {
    const content = `
      <form class="witch-iron modifier-dialog">
        <h3>Difficulty Modifier</h3>
        <ul class="option-list difficulty">
          <li class="option-row" data-value="40">Very Easy +40%</li>
          <li class="option-row" data-value="20">Easy +20%</li>
          <li class="option-row selected" data-value="0">Normal +0%</li>
          <li class="option-row" data-value="-20">Hard -20%</li>
          <li class="option-row" data-value="-40">Very Hard -40%</li>
        </ul>
        <h3>Condition Modifiers</h3>
        <ul class="option-list conditions">
          <li class="option-row${blind ? ' selected' : ''}" data-cond="blind">
            <span class="label">Blind</span>
            <input type="number" name="blindRating" value="${blind}" min="0" />
          </li>
          <li class="option-row${deaf ? ' selected' : ''}" data-cond="deaf">
            <span class="label">Deaf</span>
            <input type="number" name="deafRating" value="${deaf}" min="0" />
          </li>
          <li class="option-row selected" data-cond="pain">
            <span class="label">Pain</span>
            <input type="number" name="painRating" value="${pain}" min="0" />
          </li>
        </ul>
        <h3>Hits Modifiers</h3>
        <div class="form-group hits">
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
            let situationalMod = 0;
            const diffSel = html[0].querySelector('.difficulty .selected');
            if (diffSel) situationalMod += Number(diffSel.dataset.value) || 0;

            html[0]
              .querySelectorAll('.conditions .option-row.selected')
              .forEach(li => {
                const cond = li.dataset.cond;
                const rating = parseInt(form[cond + 'Rating'].value) || 0;
                situationalMod -= 10 * rating;
              });

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

    const html = dialog.element;

    html.on('click', '.difficulty .option-row', ev => {
      html.find('.difficulty .option-row').removeClass('selected');
      $(ev.currentTarget).addClass('selected');
    });

    html.on('click', '.conditions .option-row', ev => {
      $(ev.currentTarget).toggleClass('selected');
    });

    html.on('keydown', ev => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        html.find('button.default').click();
      }
    });
  });
}
