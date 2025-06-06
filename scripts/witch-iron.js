/**
 * Main system script for the Witch Iron system
 */

console.log("=== WITCH IRON SYSTEM SCRIPT LOADING ===");
console.log("=== THIS SHOULD APPEAR IN THE CONSOLE ===");

// Import sheet classes
import { WitchIronDescendantSheet } from "./descendant-sheet.js";
import { WitchIronMonsterSheet } from "./monster-sheet.js";
import { WitchIronActor } from "./actor.js";
import { WitchIronItem } from "./item.js";
import { WitchIronInjurySheet } from "./injury-sheet.js";
import { WitchIronItemSheet } from "./item-sheet.js";
import { initQuarrel, manualQuarrel, quarrelTracker } from "./quarrel.js";
import { HitLocationSelector } from "./hit-location.js";
import { InjuryTables } from "./injury-tables.js";
import { HitLocationHUD } from "./hit-location-hud.js";
import { registerCommonHandlebarsHelpers } from "./handlebars-helpers.js";
import { FORMATION_SHAPES } from "./ghost-tokens.js";
import "./ghost-tokens.js";

// Define the system configuration object
CONFIG.WITCH_IRON = {
  // Define attributes
  attributes: {
    muscle: "Muscle",
    robustness: "Robustness",
    agility: "Agility",
    quickness: "Quickness",
    finesse: "Finesse",
    intellect: "Intellect",
    willpower: "Willpower",
    personality: "Personality", 
    luck: "Luck"
  },
  // Define skills and their linked attributes
  skills: {
    combat: {
      athletics: { label: "Athletics", ability: "muscle" },
      intimidate: { label: "Intimidate", ability: "muscle" },
      melee: { label: "Melee", ability: "muscle" }
    },
    physical: {
      hardship: { label: "Hardship", ability: "robustness" },
      labor: { label: "Labor", ability: "robustness" },
      imbibe: { label: "Imbibe", ability: "robustness" },
      lightfoot: { label: "Light-Foot", ability: "agility" },
      ride: { label: "Ride", ability: "agility" },
      skulk: { label: "Skulk", ability: "agility" }
    },
    quickness: {
      cunning: { label: "Cunning", ability: "quickness" },
      perception: { label: "Perception", ability: "quickness" },
      ranged: { label: "Ranged", ability: "quickness" }
    },
    finesse: {
      art: { label: "Art", ability: "finesse" },
      operate: { label: "Operate", ability: "finesse" },
      trade: { label: "Trade", ability: "finesse" }
    },
    mental: {
      heal: { label: "Heal", ability: "intellect" },
      research: { label: "Research", ability: "intellect" },
      navigation: { label: "Navigation", ability: "intellect" },
      steel: { label: "Steel", ability: "willpower" },
      survival: { label: "Survival", ability: "willpower" },
      husbandry: { label: "Husbandry", ability: "willpower" }
    },
    social: {
      leadership: { label: "Leadership", ability: "personality" },
      carouse: { label: "Carouse", ability: "personality" },
      coerce: { label: "Coerce", ability: "personality" }
    }
  },

  // Dropdown configuration values
  sizes: {
    tiny: "Tiny",
    small: "Small",
    medium: "Medium",
    large: "Large",
    huge: "Huge",
    gigantic: "Gigantic"
  },

  weaponTypes: {
    none: "None",
    light: "Light",
    medium: "Medium",
    heavy: "Heavy",
    superheavy: "Superheavy",
    unarmed: "Unarmed"
  },

  armorTypes: {
    none: "None",
    light: "Light",
    medium: "Medium",
    heavy: "Heavy",
    superheavy: "Superheavy"
  }
};

/* -------------------------------------------- */
/*  Initialization                              */
/* -------------------------------------------- */

Hooks.once("init", function() {
  console.log("Witch Iron | Initializing Witch Iron System");

  // Register shared Handlebars helpers
  registerCommonHandlebarsHelpers();
  
  // Register system settings
  game.settings.register("witch-iron", "extendedRollVisibility", {
    name: "Extended Roll Visibility",
    hint: "When enabled, private rolls will be completely hidden from other players, and blind rolls will only be visible to the GM.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: value => {
      // Notify users when the setting changes
      if (game.user.isGM) {
        const status = value ? "enabled" : "disabled";
        ui.notifications.info(`Witch Iron: Extended roll visibility ${status}`);
      }
    }
  });

  // Setting for mob formation shape
  const formationChoices = FORMATION_SHAPES.reduce((obj, s) => {
    const label = s.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
    obj[s] = label;
    return obj;
  }, {});
  game.settings.register("witch-iron", "mobFormationShape", {
    name: "Mob Formation Shape",
    hint: "Shape used for mob ghost tokens.",
    scope: "world",
    config: true,
    type: String,
    choices: formationChoices,
    default: "skirmish",
    onChange: value => {
      if (game.user.isGM) {
        ui.notifications.info(`Witch Iron: Mob formation set to ${value}`);
      }
    }
  });

  // Register hidden world setting for injury sheet default values
  game.settings.register("witch-iron", "injurySheetDefaults", {
    name: "Injury Sheet Default Values",
    hint: "Internal storage for the last-saved values of the injury sheet.",
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  // Register custom Document classes
  CONFIG.Actor.documentClass = WitchIronActor;
  CONFIG.Item.documentClass = WitchIronItem;
  
  // Register sheet application classes - Force unregister all core sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);
  
  // Debug: Log all registered actor types
  console.log("Witch Iron | Available Actor Types:", Object.keys(CONFIG.Actor.dataModels));
  
  // Register actor sheets - only for descendant type
  Actors.registerSheet("witch-iron", WitchIronDescendantSheet, { 
    types: ["descendant"], // Only apply to descendant actor type
    makeDefault: true, // Make default for descendant type
    label: "Witch Iron Descendant",
    classes: ["witch-iron"]
  });
  console.log("Witch Iron | Descendant Sheet Registered");
  
  // Register Monster sheet only for monster type
  Actors.registerSheet("witch-iron", WitchIronMonsterSheet, {
    types: ["monster"], // Only apply to monster actor type
    makeDefault: true, // Make default for monster type
    label: "Witch Iron Monster",
    classes: ["witch-iron"]
  });
  console.log("Witch Iron | Monster Sheet Registered");
  
  // Register item sheets
  Items.registerSheet("witch-iron", WitchIronInjurySheet, {
    types: ["injury"],
    makeDefault: true,
    label: "Witch Iron Injury"
  });

  Items.registerSheet("witch-iron", WitchIronItemSheet, {
    types: ["weapon", "armor", "gear", "consumable", "artifact", "mutation", "madness"],
    makeDefault: true,
    label: "Witch Iron Item"
  });
  
  // Initialize the Quarrel system
  initQuarrel();
  // Expose manualQuarrel API for sheets to use
  game.witchIron = { manualQuarrel };
  
  // TODO: Register other sheet classes (InjurySheet, etc.)
});

Hooks.once("ready", function() {
  // Any code that should run when Foundry is fully loaded
  console.log("Witch Iron | System Ready");

  // Initialize the hit location HUD
  HitLocationHUD.init();
  
  // Debug: Log all actors and their types
  console.log("ACTOR TYPES DEBUG:");
  game.actors.forEach(actor => {
    console.log(`Actor "${actor.name}" has type: "${actor.type}"`);
  });
  
  // Add click handler for hit calculation toggle in chat cards
  $('body').on('click', '.witch-iron .toggle-hit-details', function() {
    const hitDetails = $(this).siblings('.hit-details-content');
    hitDetails.toggleClass('hidden');
    
    // Change the icon based on state
    const icon = $(this).find('i');
    if (hitDetails.hasClass('hidden')) {
      icon.removeClass('fa-minus').addClass('fa-calculator');
    } else {
      icon.removeClass('fa-calculator').addClass('fa-minus');
    }
  });
});

// Track actors that need automatic condition quarrels after updates
const pendingConditionQuarrels = new Map();

// Check for Stress or Corruption thresholds before the actor is updated
Hooks.on("preUpdateActor", (actor, changes, options, userId) => {
  if (game.user.id !== userId) return;

  const pending = {};

  const stressNew = foundry.utils.getProperty(changes, "system.conditions.stress.value");
  if (stressNew !== undefined) {
    const oldStress = actor.system.conditions.stress?.value || 0;
    if (Math.floor(stressNew / 3) > Math.floor(oldStress / 3)) {
      pending.stress = stressNew;
    }
  }

  const corruptNew = foundry.utils.getProperty(changes, "system.conditions.corruption.value");
  if (corruptNew !== undefined) {
    const oldCorrupt = actor.system.conditions.corruption?.value || 0;
    if (Math.floor(corruptNew / 3) > Math.floor(oldCorrupt / 3)) {
      pending.corruption = corruptNew;
    }
  }

  if (Object.keys(pending).length > 0) {
    pendingConditionQuarrels.set(actor.id, pending);
  }
});

// After the actor updates, trigger any pending Stress/Corruption quarrels
Hooks.on("updateActor", async (actor) => {
  const pending = pendingConditionQuarrels.get(actor.id);
  if (!pending) return;

  const token = actor.getActiveTokens()[0] || null;

  if (pending.stress !== undefined) {
    await manualQuarrel({
      actorId: actor.id,
      hits: pending.stress,
      skill: "Steel",
      customName: "Stress Quarrel",
      customIcon: quarrelTracker.CONDITION_ICONS.stress,
      resultMessages: {
        success: "Your mind breaks! You gain a Madness.",
        failure: "You steel your mind, avoiding Madness.",
        cost: "You hold on, but something snaps."
      },
      isConditionQuarrel: true,
      condition: "stress"
    }, token);

    if (actor.type === "monster") {
      await actor.rollMonsterCheck({
        label: "Specialized Check",
        additionalHits: actor.system.derived?.plusHits || 0
      });
    } else {
      await actor.rollSkill("steel");
    }
  }

  if (pending.corruption !== undefined) {
    await manualQuarrel({
      actorId: actor.id,
      hits: pending.corruption,
      skill: "Steel",
      customName: "Corruption Quarrel",
      customIcon: quarrelTracker.CONDITION_ICONS.corruption,
      resultMessages: {
        success: "Corruption takes hold! You gain a Mutation.",
        failure: "You purge the corruption, avoiding Mutation.",
        cost: "You push back the corruption, but at a price."
      },
      isConditionQuarrel: true,
      condition: "corruption"
    }, token);

    if (actor.type === "monster") {
      await actor.rollMonsterCheck({
        label: "Specialized Check",
        additionalHits: actor.system.derived?.plusHits || 0
      });
    } else {
      await actor.rollSkill("steel");
    }
  }

  pendingConditionQuarrels.delete(actor.id);
});

// Handle roll visibility in chat messages
Hooks.on("preCreateChatMessage", (message, data, options, userId) => {
  const extendedVisibility = game.settings.get("witch-iron", "extendedRollVisibility");
  if (!extendedVisibility) return true;

  // Only modify roll messages
  if (!message.isRoll) return true;

  const rollMode = game.settings.get("core", "rollMode");
  
  // Handle different roll modes with extended visibility
  switch (rollMode) {
    case "blindroll": // Only GM can see
      message.updateSource({
        "whisper": ChatMessage.getWhisperRecipients("GM"),
        "blind": true
      });
      break;
    
    case "selfroll": // Only the user can see
      message.updateSource({
        "whisper": [game.user.id],
        "blind": false
      });
      break;
    
    case "gmroll": // GM and user can see
      const recipients = ChatMessage.getWhisperRecipients("GM");
      recipients.push(game.user.id);
      message.updateSource({
        "whisper": recipients,
        "blind": false
      });
      break;
    
    case "roll": // Public roll - no changes needed
      break;
  }

  return true;
});

// Add debugging for sheet data
Hooks.on("renderActorSheet", (app, html, data) => {
  console.log("Witch Iron | Sheet Rendered:", {
    type: app.actor.type,
    id: app.actor.id,
    data: data,
    html: html
  });
  
  // Directly add our CSS class to any actor sheet
  html.closest(".app.window-app.sheet").addClass("witch-iron");
  
  // Set the correct CSS class based on actor type
  if (app.actor.type === "monster") {
    html.closest(".app.window-app.sheet").removeClass("descendant").addClass("monster");
  } else {
    html.closest(".app.window-app.sheet").removeClass("monster").addClass("descendant");
  }
  
  // Log the fact that we modified the sheet
  console.log(`Witch Iron | Added CSS class for ${app.actor.name}, type: ${app.actor.type}`);
});


// Hook into actor creation dialog to add our custom types
Hooks.on("renderDialog", (dialog, html, data) => {
  // Only modify the create actor dialog
  if (dialog.data.title === "Create New Actor") {
    // Check if we need to add our types
    const typeSelect = html.find('select[name="type"]');
    if (typeSelect.length && !typeSelect.find('option[value="monster"]').length) {
      // Add our types if they don't exist
      typeSelect.append(`<option value="monster">Monster</option>`);
      typeSelect.append(`<option value="descendant">Descendant</option>`);
      
      // Set default to monster
      typeSelect.val("monster");
      
      console.log("Added custom actor types to creation dialog");
    }
  }
});

// Export classes for module use
export { WitchIronActor, WitchIronItem, WitchIronDescendantSheet, WitchIronMonsterSheet, WitchIronInjurySheet, HitLocationHUD };
