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
import { initQuarrel } from "./quarrel.js";
import { HitLocationSelector } from "./hit-location.js";

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
  }
};

// Register Handlebars helpers with proper block helper format
Handlebars.registerHelper('range', function(context, options) {
  let output = "";
  const data = Handlebars.createFrame(options.data);
  
  for (let i = 0; i < context; i++) {
    data.index = i;
    output += options.fn(this, { data: data });
  }
  
  return output;
});

// Add Array constructor helper
Handlebars.registerHelper('Array', function(n) {
  return [...Array(n).keys()];
});

// Add JSON stringify helper for debugging
Handlebars.registerHelper('json', function(context) {
  return JSON.stringify(context, null, 2);
});

// Block helpers for comparison
Handlebars.registerHelper('eq', function(v1, v2, options) {
  // When used as {{eq value1 value2}} without a block
  if (!options.fn) return v1 === v2;
  
  // When used as {{#eq value1 value2}}...{{/eq}}
  if (v1 === v2) {
    return options.fn(this);
  }
  return options.inverse ? options.inverse(this) : '';
});

Handlebars.registerHelper('lt', function(v1, v2, options) {
  // When used as {{lt value1 value2}} without a block
  if (!options.fn) return v1 < v2;
  
  // When used as {{#lt value1 value2}}...{{/lt}}
  if (v1 < v2) {
    return options.fn(this);
  }
  return options.inverse ? options.inverse(this) : '';
});

Handlebars.registerHelper('gt', function(v1, v2, options) {
  // When used as {{gt value1 value2}} without a block
  if (!options.fn) return v1 > v2;
  
  // When used as {{#gt value1 value2}}...{{/gt}}
  if (v1 > v2) {
    return options.fn(this);
  }
  return options.inverse ? options.inverse(this) : '';
});

Handlebars.registerHelper('le', function(v1, v2, options) {
  // When used as {{le value1 value2}} without a block
  if (!options.fn) return v1 <= v2;
  
  // When used as {{#le value1 value2}}...{{/le}}
  if (v1 <= v2) {
    return options.fn(this);
  }
  return options.inverse ? options.inverse(this) : '';
});

Handlebars.registerHelper('ge', function(v1, v2, options) {
  // When used as {{ge value1 value2}} without a block
  if (!options.fn) return v1 >= v2;
  
  // When used as {{#ge value1 value2}}...{{/ge}}
  if (v1 >= v2) {
    return options.fn(this);
  }
  return options.inverse ? options.inverse(this) : '';
});

// Ensure gte alias exists for greater than or equal
Handlebars.registerHelper('gte', function(v1, v2, options) {
  return Handlebars.helpers.ge(v1, v2, options);
});

// Simple expression helpers
Handlebars.registerHelper('add', function(v1, v2) {
  return Number(v1) + Number(v2);
});

Handlebars.registerHelper('subtract', function(v1, v2) {
  return Number(v1) - Number(v2);
});

Handlebars.registerHelper('multiply', function(v1, v2) {
  return Number(v1) * Number(v2);
});

Handlebars.registerHelper('divide', function(v1, v2) {
  return Number(v1) / Number(v2);
});

Handlebars.registerHelper('floor', function(v1) {
  return Math.floor(Number(v1));
});

/* -------------------------------------------- */
/*  Initialization                              */
/* -------------------------------------------- */

Hooks.once("init", function() {
  console.log("Witch Iron | Initializing Witch Iron System");
  
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

  // Register custom Document classes
  CONFIG.Actor.documentClass = WitchIronActor;
  CONFIG.Item.documentClass = WitchIronItem;
  
  // Register sheet application classes - Force unregister all core sheets
  Actors.unregisterSheet("core", ActorSheet);
  Items.unregisterSheet("core", ItemSheet);
  
  // Debug: Log all registered actor types
  console.log("Witch Iron | Available Actor Types:", Object.keys(CONFIG.Actor.dataModels));
  
  // Register actor sheets - make them apply to all actor types again
  Actors.registerSheet("witch-iron", WitchIronDescendantSheet, { 
    types: [], // Empty array means apply to ALL actor types
    makeDefault: false, // Not default so we can choose
    label: "Witch Iron Descendant",
    classes: ["witch-iron"]
  });
  console.log("Witch Iron | Descendant Sheet Registered");
  
  // Register Monster sheet for all types
  Actors.registerSheet("witch-iron", WitchIronMonsterSheet, {
    types: [], // Empty array means apply to ALL actor types
    makeDefault: true, // Make default so it's selected by default
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
  
  // Initialize the Quarrel system
  initQuarrel();
  
  // TODO: Register other sheet classes (InjurySheet, etc.)
});

Hooks.once("ready", function() {
  // Any code that should run when Foundry is fully loaded
  console.log("Witch Iron | System Ready");
  
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

// Hook to filter available sheets based on actor type
Hooks.on("getActorSheetHeaderButtons", (app, buttons) => {
  const actor = app.actor;
  
  // Add a helper button to set actor type
  buttons.unshift({
    label: actor.type === "monster" ? "Set as Descendant" : "Set as Monster",
    class: "change-actor-type",
    icon: "fas fa-exchange-alt",
    onclick: () => {
      const newType = actor.type === "monster" ? "descendant" : "monster";
      actor.update({ "type": newType }).then(() => {
        // Re-render the sheet with the appropriate sheet class
        const sheetClass = newType === "monster" ? 
          WitchIronMonsterSheet : WitchIronDescendantSheet;
        const sheet = new sheetClass(actor);
        sheet.render(true);
      });
    }
  });
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
export { WitchIronActor, WitchIronItem, WitchIronDescendantSheet, WitchIronMonsterSheet, WitchIronInjurySheet }; import './debugger.js';
