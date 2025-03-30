// Combat Quarrel Macro for Witch Iron
// This macro initiates a combat quarrel between the selected token and a targeted token

// Check if a token is selected
if (!canvas.tokens.controlled.length) {
  ui.notifications.warn("Please select a token to attack with!");
  return;
}

// Get the selected token
const attacker = canvas.tokens.controlled[0].actor;

// Check if a token is targeted
if (!game.user.targets.size) {
  ui.notifications.warn("Please target a token to attack!");
  return;
}

// Get the targeted token
const defender = game.user.targets.first().actor;

// Open a dialog to choose attack type and defense type
new Dialog({
  title: "Combat Quarrel",
  content: `
    <form>
      <div class="form-group">
        <label>Attack Type:</label>
        <select name="attack-type">
          <option value="melee">Melee Attack</option>
          <option value="ranged">Ranged Attack</option>
        </select>
      </div>
      <div class="form-group">
        <label>Defense Type (if melee):</label>
        <select name="defense-type">
          <option value="melee">Melee (Parry/Block)</option>
          <option value="lightFoot">Light-Foot (Dodge)</option>
        </select>
      </div>
    </form>
  `,
  buttons: {
    attack: {
      icon: '<i class="fas fa-fist-raised"></i>',
      label: "Attack",
      callback: html => {
        const form = html.find('form')[0];
        const attackType = form.elements['attack-type'].value;
        let defenseType = form.elements['defense-type'].value;
        
        // For ranged attacks, force Light-Foot
        if (attackType === "ranged") {
          defenseType = "lightFoot";
        }
        
        // Execute the combat quarrel
        game.witchIron.initiateCombatQuarrel(attacker, attackType, defender, defenseType);
      }
    },
    cancel: {
      icon: '<i class="fas fa-times"></i>',
      label: "Cancel"
    }
  },
  default: "attack"
}).render(true); 