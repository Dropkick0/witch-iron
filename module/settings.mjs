/**
 * Register game settings for the Witch Iron system
 */
export function registerSettings() {
  game.settings.register("witch-iron", "useSideInitiative", {
    name: "WITCHIRON.Settings.UseSideInitiative",
    hint: "WITCHIRON.Settings.UseSideInitiativeHint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
    onChange: () => window.location.reload()
  });
  
  game.settings.register("witch-iron", "sideInitiativePlayerValue", {
    name: "WITCHIRON.Settings.SideInitiativePlayerValue",
    hint: "WITCHIRON.Settings.SideInitiativePlayerValueHint",
    scope: "world",
    config: true,
    type: Number,
    default: 20,
    range: {
      min: 1,
      max: 100,
      step: 1
    }
  });
  
  game.settings.register("witch-iron", "sideInitiativeNPCValue", {
    name: "WITCHIRON.Settings.SideInitiativeNPCValue",
    hint: "WITCHIRON.Settings.SideInitiativeNPCValueHint",
    scope: "world",
    config: true,
    type: Number,
    default: 10,
    range: {
      min: 1,
      max: 100,
      step: 1
    }
  });
}

/**
 * Roll initiative for a combat encounter using the side-based initiative system
 * @param {Combat} combat - The combat encounter
 * @returns {Promise<string>} - A message indicating which side won initiative
 */
export async function rollSideInitiative(combat) {
  // Roll a d6 to determine which side goes first
  const roll = new Roll("1d6");
  await roll.evaluate({async: true});
  
  // Get initiative values from settings
  const playerValue = game.settings.get("witch-iron", "sideInitiativePlayerValue");
  const npcValue = game.settings.get("witch-iron", "sideInitiativeNPCValue");
  
  // Determine which side goes first based on the roll
  const playersFirst = roll.total >= 4; // 4-6 players go first, 1-3 NPCs go first
  
  // Set initiative values for all combatants
  for (const combatant of combat.combatants) {
    const isNPC = combatant.actor.type === "enemy" || !combatant.isOwner;
    const initiativeValue = isNPC 
      ? (playersFirst ? npcValue : playerValue) 
      : (playersFirst ? playerValue : npcValue);
    
    await combat.updateCombatant({
      _id: combatant.id,
      initiative: initiativeValue
    });
  }
  
  // Return a message about which side won initiative
  return playersFirst 
    ? game.i18n.localize("WITCHIRON.Combat.PlayersWinInitiative") 
    : game.i18n.localize("WITCHIRON.Combat.NPCsWinInitiative");
} 