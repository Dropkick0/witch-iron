/**
 * Data models for the Witch Iron system
 */

// Import required foundry data model classes
import { SystemDataModel } from "../../../systems/witch-iron/module/data-models.mjs";
const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField, ObjectField } = foundry.data.fields;

/**
 * Base Actor data model for Witch Iron
 */
export class SystemDataModel extends foundry.abstract.TypeDataModel {
  // Base implementation that can be extended
}

/**
 * Character data model
 */
export class CharacterDataModel extends SystemDataModel {
  static defineSchema() {
    return {
      // Primary Ability Scores (percentile-based)
      abilities: new SchemaField({
        muscle: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        robustness: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        agility: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        quickness: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        finesse: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        intelligence: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        willpower: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        personality: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        luck: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          }),
          current: new NumberField({
            required: true,
            initial: 10,
            min: 0
          })
        })
      }),
      
      // Secondary Ability Scores
      secondary: new SchemaField({
        maxEncumbrance: new NumberField({
          required: true,
          initial: 10,
          min: 0
        }),
        currentEncumbrance: new NumberField({
          required: true,
          initial: 0,
          min: 0
        }),
        speed: new NumberField({
          required: true,
          initial: 30,
          min: 0
        }),
        attacks: new NumberField({
          required: true,
          initial: 1,
          min: 1
        }),
        // Only one of these can be active (magick or faith)
        magick: new NumberField({
          required: true,
          initial: 0,
          min: 0
        }),
        faith: new NumberField({
          required: true,
          initial: 0,
          min: 0
        }),
        lifespan: new NumberField({
          required: true,
          initial: 40,
          min: 0
        })
      }),
      
      // Injuries system
      injuries: new ArrayField(
        new SchemaField({
          location: new StringField({
            required: true,
            choices: ["head", "torso", "rightArm", "leftArm", "rightLeg", "leftLeg"]
          }),
          severity: new NumberField({
            required: true, 
            initial: 1,
            min: 1,
            max: 10
          }),
          description: new StringField({
            required: true
          }),
          treated: new BooleanField({
            initial: false
          }),
          permanent: new BooleanField({
            initial: false
          }),
          timestamp: new NumberField({
            initial: 0
          })
        }),
        {
          initial: []
        }
      ),
      
      // Flag for left-handed characters (affects arm injury penalties)
      leftHanded: new BooleanField({
        initial: false
      }),
      
      // Lineage system
      lineage: new SchemaField({
        primary: new StringField({
          required: true,
          initial: ""
        }),
        secondary: new StringField({
          required: true,
          initial: ""
        }),
        final: new StringField() // Unlocked lineage (optional)
      }),
      
      // Genetic traits (3 slots)
      geneticTraits: new ArrayField(
        new SchemaField({
          name: new StringField({
            required: true,
            initial: ""
          }),
          description: new StringField(),
          isDuality: new BooleanField({
            initial: false
          })
        }),
        {
          initial: []
        }
      ),
      
      // Skills and specializations
      skills: new ObjectField({
        required: true,
        initial: {
          // Muscle skills
          athletics: { value: 0, specializations: [] },
          intimidate: { value: 0, specializations: [] },
          melee: { value: 0, specializations: [] },
          
          // Robustness skills
          hardship: { value: 0, specializations: [] },
          labor: { value: 0, specializations: [] },
          imbibe: { value: 0, specializations: [] },
          
          // Agility skills
          lightFoot: { value: 0, specializations: [] },
          ride: { value: 0, specializations: [] },
          skulk: { value: 0, specializations: [] },
          
          // Quickness skills
          cunning: { value: 0, specializations: [] },
          perception: { value: 0, specializations: [] },
          ranged: { value: 0, specializations: [] },
          
          // Finesse skills
          art: { value: 0, specializations: [] },
          operate: { value: 0, specializations: [] },
          trade: { value: 0, specializations: [] },
          
          // Intelligence skills
          heal: { value: 0, specializations: [] },
          research: { value: 0, specializations: [] },
          navigation: { value: 0, specializations: [] },
          
          // Willpower skills
          steel: { value: 0, specializations: [] },
          survival: { value: 0, specializations: [] },
          husbandry: { value: 0, specializations: [] },
          
          // Personality skills
          leadership: { value: 0, specializations: [] },
          carouse: { value: 0, specializations: [] },
          coerce: { value: 0, specializations: [] }
        }
      }),
      
      // Subsystems
      corruption: new SchemaField({
        value: new NumberField({
          required: true,
          initial: 0,
          min: 0,
          max: 100
        }),
        threshold: new NumberField({
          required: true,
          initial: 20,
          min: 0
        })
      }),
      
      stress: new SchemaField({
        value: new NumberField({
          required: true,
          initial: 0,
          min: 0,
          max: 100
        }),
        threshold: new NumberField({
          required: true,
          initial: 20,
          min: 0
        })
      }),
      
      // Character details
      biography: new HTMLField(),
      notes: new HTMLField(),
      
      // Contacts and Followers (max based on personality)
      contacts: new ArrayField(
        new SchemaField({
          name: new StringField({
            required: true
          }),
          ability: new StringField(),
          hits: new NumberField({
            required: true,
            initial: 1,
            min: 0
          }),
          assistance: new StringField(),
          limits: new StringField()
        }),
        {
          initial: []
        }
      ),
      
      followers: new ArrayField(
        new SchemaField({
          name: new StringField({
            required: true
          }),
          ability: new StringField(),
          hits: new NumberField({
            required: true,
            initial: 1,
            min: 0
          }),
          assistance: new StringField(),
          limits: new StringField()
        }),
        {
          initial: []
        }
      ),

      // Inventory for instant access items
      instantAccessItems: new ArrayField(
        new StringField(),
        {
          initial: []
        }
      )
    };
  }
}

/**
 * Enemy data model
 */
export class EnemyDataModel extends SystemDataModel {
  static defineSchema() {
    const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField, ObjectField } = foundry.data.fields;
    return {
      // Primary Ability Scores (for enemies, may be simplified)
      abilities: new SchemaField({
        muscle: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        robustness: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        agility: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        quickness: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        intelligence: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        }),
        willpower: new SchemaField({
          value: new NumberField({
            required: true,
            initial: 30,
            min: 0,
            max: 100
          }),
          bonus: new NumberField({
            required: true,
            initial: 3,
            min: 0,
            max: 10
          })
        })
      }),
      
      // Secondary stats
      secondary: new SchemaField({
        maxEncumbrance: new NumberField({
          required: true,
          initial: 10,
          min: 0
        }),
        speed: new NumberField({
          required: true,
          initial: 30,
          min: 0
        }),
        attacks: new NumberField({
          required: true,
          initial: 1,
          min: 1
        }),
        // Enemy supernatural powers (if any)
        magick: new NumberField({
          required: true,
          initial: 0,
          min: 0
        })
      }),
      
      // Enemy type and classification
      type: new StringField({
        required: true,
        initial: "beast" // beast, undead, outsider, etc.
      }),
      
      // No HP - Injury-based system for enemies too
      injuries: new ArrayField(
        new SchemaField({
          name: new StringField({
            required: true
          }),
          description: new StringField(),
          severity: new NumberField({
            required: true,
            initial: 1,
            min: 1,
            max: 5
          }),
          location: new StringField(),
          treated: new BooleanField({
            initial: false
          })
        }),
        {
          initial: []
        }
      ),
      
      // Enemy skills (simplified list compared to characters)
      skills: new ObjectField({
        required: true,
        initial: {
          melee: { value: 0 },
          ranged: { value: 0 },
          skulk: { value: 0 },
          perception: { value: 0 }
        }
      }),
      
      // Enemy special abilities
      specialAbilities: new ArrayField(
        new SchemaField({
          name: new StringField({
            required: true
          }),
          description: new StringField(),
          type: new StringField({
            initial: "passive" // passive, active, reactive
          })
        }),
        {
          initial: []
        }
      ),
      
      // Enemy equipment/attacks
      attacks: new ArrayField(
        new SchemaField({
          name: new StringField({
            required: true
          }),
          damage: new StringField({
            required: true,
            initial: "1d6"
          }),
          damageType: new StringField({
            required: true,
            initial: "physical"
          }),
          range: new StringField({
            initial: "melee"
          }),
          properties: new ArrayField(new StringField())
        }),
        {
          initial: []
        }
      ),
      
      // Challenge and XP
      challenge: new NumberField({
        required: true,
        initial: 1,
        min: 0
      }),
      
      xpValue: new NumberField({
        required: true,
        initial: 100,
        min: 0
      }),
      
      description: new HTMLField()
    };
  }
}

/**
 * Weapon data model
 */
export class WeaponDataModel extends SystemDataModel {
  static defineSchema() {
    const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField } = foundry.data.fields;
    return {
      description: new HTMLField(),
      
      // Weapon type
      weaponType: new StringField({
        required: true,
        initial: "melee", // melee, ranged
        choices: ["melee", "ranged", "thrown"]
      }),
      
      // Weapon classification for skill specializations
      classification: new StringField({
        required: true,
        initial: "common", // yeoman, common, aristocratic, battlefield, etc.
        choices: ["yeoman", "dockside", "common", "aristocratic", "battlefield", "tournament", "frontier", "urban", "prototype"]
      }),
      
      // Damage and properties
      damage: new StringField({
        required: true,
        initial: "1d6"
      }),
      
      damageType: new StringField({
        required: true,
        initial: "physical",
        choices: ["physical", "fire", "cold", "lightning", "arcane", "necrotic"]
      }),
      
      range: new StringField({
        initial: "melee"
      }),
      
      properties: new ArrayField(
        new StringField(),
        {
          initial: []
        }
      ),
      
      // Physical properties
      encumbrance: new NumberField({
        required: true,
        initial: 1,
        min: 0
      }),
      
      // Equipment status
      equipped: new BooleanField({
        initial: false
      }),
      
      instantAccess: new BooleanField({
        initial: false
      }),
      
      // Economic properties
      cost: new NumberField({
        required: true,
        initial: 0,
        min: 0
      }),
      
      // Lineage requirements if any
      requiredLineage: new StringField()
    };
  }
}

/**
 * Spell data model
 */
export class SpellDataModel extends SystemDataModel {
  static defineSchema() {
    const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField } = foundry.data.fields;
    return {
      description: new HTMLField(),
      
      // Spell classification
      spellType: new StringField({
        required: true,
        initial: "arcane", // arcane, miracle, rune
        choices: ["arcane", "miracle", "rune"]
      }),
      
      // Power level
      level: new NumberField({
        required: true,
        initial: 1,
        min: 1
      }),
      
      // Cost to cast
      magickCost: new NumberField({
        required: true,
        initial: 1,
        min: 0
      }),
      
      faithCost: new NumberField({
        required: true,
        initial: 0,
        min: 0
      }),
      
      // Spell effects
      effect: new StringField({
        required: true
      }),
      
      range: new StringField({
        required: true,
        initial: "close"
      }),
      
      duration: new StringField({
        required: true,
        initial: "instant"
      }),
      
      // Corruption and stress risk
      corruptionRisk: new NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 100
      }),
      
      stressRisk: new NumberField({
        required: true,
        initial: 0,
        min: 0,
        max: 100
      }),
      
      // Lineage requirements if any
      requiredLineage: new StringField()
    };
  }
}

// Now let's create a few more item types specific to Witch Iron

/**
 * Artifact data model for Witch Iron's three-stage artifacts
 */
export class ArtifactDataModel extends SystemDataModel {
  static defineSchema() {
    const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField } = foundry.data.fields;
    return {
      description: new HTMLField(),
      
      // Artifact classification
      stage: new NumberField({
        required: true,
        initial: 1,
        min: 1,
        max: 3
      }),
      
      // Associated lineage
      lineage: new StringField({
        required: true
      }),
      
      // Physical properties
      encumbrance: new NumberField({
        required: true,
        initial: 1,
        min: 0
      }),
      
      // Power and abilities
      powers: new ArrayField(
        new SchemaField({
          name: new StringField({
            required: true
          }),
          description: new StringField(),
          cost: new StringField()
        }),
        {
          initial: []
        }
      ),
      
      // Requirements to advance to next stage
      advancementRequirements: new StringField()
    };
  }
}

/**
 * Alchemical item data model
 */
export class AlchemicalDataModel extends SystemDataModel {
  static defineSchema() {
    const { SchemaField, NumberField, StringField, HTMLField, BooleanField, ArrayField } = foundry.data.fields;
    return {
      description: new HTMLField(),
      
      // Item classification
      itemType: new StringField({
        required: true,
        initial: "potion", // potion, poison, reagent
        choices: ["potion", "poison", "reagent", "explosive"]
      }),
      
      // Physical properties
      encumbrance: new NumberField({
        required: true,
        initial: 1,
        min: 0
      }),
      
      // Effect details
      effect: new StringField({
        required: true
      }),
      
      duration: new StringField({
        initial: "instant"
      }),
      
      // Crafting information
      craftingDifficulty: new NumberField({
        required: true,
        initial: 20,
        min: 0,
        max: 100
      }),
      
      ingredients: new ArrayField(
        new StringField(),
        {
          initial: []
        }
      ),
      
      // Economic properties
      cost: new NumberField({
        required: true,
        initial: 0,
        min: 0
      })
    };
  }
} 