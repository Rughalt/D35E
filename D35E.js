/**
 * The D35E edition game system for Foundry Virtual Tabletop
 * Author: LoopeeDK, Rughalt
 * Software License: GNU GPLv3
 */

// Import Modules
import { D35E } from "./module/config.js";
import { registerSystemSettings } from "./module/settings.js";
import { preloadHandlebarsTemplates } from "./module/templates.js";
import { measureDistances, measureDistance } from "./module/canvas.js";
import { ActorPF } from "./module/actor/entity.js";
import { ActorSheetPFCharacter } from "./module/actor/sheets/character.js";
import { ActorSheetPFNPC } from "./module/actor/sheets/npc.js";
import { ActorSheetPFNPCLite } from "./module/actor/sheets/npc-lite.js";
import { ActorSheetPFNPCLoot } from "./module/actor/sheets/npc-loot.js";
import { ActorSheetPFNPCMonster } from "./module/actor/sheets/npc-monster.js";
import { ItemPF } from "./module/item/entity.js";
import { ItemSheetPF } from "./module/item/sheets/base.js";
import { CompendiumDirectoryPF } from "./module/sidebar/compendium.js";
import { PatchCore } from "./module/patch-core.js";
import { DicePF } from "./module/dice.js";
import { getItemOwner, sizeDie, getActorFromId, isMinimumCoreVersion } from "./module/lib.js";
import { ChatMessagePF } from "./module/sidebar/chat-message.js";
import { TokenQuickActions } from "./module/token-quick-actions.js";
import { TopPortraitBar } from "./module/top-portrait-bar.js";
import * as chat from "./module/chat.js";
import * as migrations from "./module/migration.js";
import {SemanticVersion} from "./semver.js";
import {sizeInt} from "./module/lib.js";
import * as cache from "./module/cache.js";
import {CACHE} from "./module/cache.js";

// Add String.format
if (!String.prototype.format) {
  String.prototype.format = function(...args) {
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return args[number] != null
        ? args[number]
        : match
      ;
    });
  };
}

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

Hooks.once("init", async function() {
  console.log(`D35E | Initializing D35E 1 System`);

  // Create a D35E namespace within the game global
  game.D35E = {
    ActorPF,
    DicePF,
    ItemPF,
    migrations,
    rollItemMacro,
    rollDefenses,
    rollTurnUndead,
    CompendiumDirectoryPF,
    rollPreProcess: {
      sizeRoll: sizeDie,
      sizeVal: sizeInt
    },
    migrateWorld: migrations.migrateWorld,
  };

  // Record Configuration Values
  CONFIG.D35E = D35E;
  CONFIG.debug.hooks = true;
  CONFIG.Actor.entityClass = ActorPF;
  CONFIG.Item.entityClass = ItemPF;
  CONFIG.ui.compendium = CompendiumDirectoryPF;
  CONFIG.ChatMessage.entityClass = ChatMessagePF;

  // Register System Settings
  registerSystemSettings();

  // Preload Handlebars Templates
  await preloadHandlebarsTemplates();

  // Patch Core Functions
  PatchCore();

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("D35E", ActorSheetPFCharacter, { types: ["character"], makeDefault: true });
  Actors.registerSheet("D35E", ActorSheetPFNPC, { types: ["npc"], makeDefault: true });
  Actors.registerSheet("D35E", ActorSheetPFNPCLite, { types: ["npc"], makeDefault: false });
  Actors.registerSheet("D35E", ActorSheetPFNPCLoot, { types: ["npc"], makeDefault: false });
  Actors.registerSheet("D35E", ActorSheetPFNPCMonster, { types: ["npc"], makeDefault: false });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("D35E", ItemSheetPF, { types: ["class", "feat", "spell", "consumable", "equipment", "loot", "weapon", "buff", "attack", "race", "enhancement"], makeDefault: true });

  // Enable skin
  $('body').toggleClass('d35ecustom', game.settings.get("D35E", "customSkin"));
  $('body').toggleClass('d35gm', game.user.isGM);
});


/* -------------------------------------------- */
/*  Foundry VTT Setup                           */
/* -------------------------------------------- */

/**
 * This function runs after game data has been requested and loaded from the servers, so entities exist
 */
Hooks.once("setup", function() {

  // Localize CONFIG objects once up-front
  const toLocalize = [
    "abilities", "abilitiesShort", "alignments", "currencies", "distanceUnits", "itemActionTypes", "senses", "skills", "targetTypes",
    "timePeriods", "savingThrows", "ac", "acValueLabels", "featTypes", "conditions", "lootTypes", "flyManeuverabilities",
    "spellPreparationModes", "weaponTypes", "weaponProperties", "spellComponents", "spellSchools", "spellLevels", "conditionTypes",
    "favouredClassBonuses", "armorProficiencies", "weaponProficiencies", "actorSizes", "actorTokenSizes", "abilityActivationTypes", "abilityActivationTypesPlurals",
    "limitedUsePeriods", "equipmentTypes", "equipmentSlots", "consumableTypes", "attackTypes", "buffTypes", "buffTargets", "contextNoteTargets",
    "healingTypes", "divineFocus", "classSavingThrows", "classBAB", "classTypes", "measureTemplateTypes", "creatureTypes", "race"
  ];

  const doLocalize = function(obj) {
    return Object.entries(obj).reduce((obj, e) => {
      if (typeof e[1] === "string") obj[e[0]] = game.i18n.localize(e[1]);
      else if (typeof e[1] === "object") obj[e[0]] = doLocalize(e[1]);
      return obj;
    }, {});
  };
  for ( let o of toLocalize ) {
    CONFIG.D35E[o] = doLocalize(CONFIG.D35E[o]);
  }
});

/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", async function() {
  const NEEDS_MIGRATION_VERSION = "0.87.0";
  let PREVIOUS_MIGRATION_VERSION = game.settings.get("D35E", "systemMigrationVersion");
  if (typeof PREVIOUS_MIGRATION_VERSION === "number") {
    PREVIOUS_MIGRATION_VERSION = PREVIOUS_MIGRATION_VERSION.toString() + ".0";
  }
  else if (typeof PREVIOUS_MIGRATION_VERSION === "string" && PREVIOUS_MIGRATION_VERSION.match(/^([0-9]+)\.([0-9]+)$/)) {
    PREVIOUS_MIGRATION_VERSION = `${PREVIOUS_MIGRATION_VERSION}.0`;
  }
  console.log(PREVIOUS_MIGRATION_VERSION)
  // Previous migration version is unparseable
  let needMigration = SemanticVersion.fromString(PREVIOUS_MIGRATION_VERSION) == null ? true : SemanticVersion.fromString(NEEDS_MIGRATION_VERSION).isHigherThan(SemanticVersion.fromString(PREVIOUS_MIGRATION_VERSION));
  if (needMigration && game.user.isGM) {
    await migrations.migrateWorld();
  }

  await cache.buildCache();
  console.log("D35E | Cache is ", CACHE)
  game.actors.entities.forEach(obj => { obj._updateChanges({ sourceOnly: true }); });
  
  Hooks.on('renderTokenHUD', (app, html, data) => { TokenQuickActions.addTop3Attacks(app, html, data) });
  Hooks.on('renderTokenHUD', (app, html, data) => { TokenQuickActions.addTop3Buffs(app, html, data) });

  for (let key of game.actors.keys()) {
    TopPortraitBar.render(game.actors.get(key))
  }

  if (!game.user.isGM) {
    (await import(
            /* webpackChunkName: "welcome-screen" */
            './module/onboarding.js'
            )
    ).default();
    return;
  }
  // Edit next line to match module.
  const system = game.system;
  const title = system.data.title;
  const moduleVersion = system.data.version;
  game.settings.register(title, 'version', {
    name: `${title} Version`,
    default: "0.0.0",
    type: String,
    scope: 'world',
  });
  const oldVersion = game.settings.get(title, "version");

  if (!isNewerVersion(moduleVersion, oldVersion))
    return;
  (await import(
          /* webpackChunkName: "welcome-screen" */
          './module/onboarding.js'
          )
  ).default();
  (await import(
          /* webpackChunkName: "welcome-screen" */
          './module/welcome-screen.js'
          )
  ).default();

});

/* -------------------------------------------- */
/*  Canvas Initialization                       */
/* -------------------------------------------- */

Hooks.on("canvasInit", function() {

  // Extend Diagonal Measurement
  canvas.grid.diagonalRule = game.settings.get("D35E", "diagonalMovement");
  if (isMinimumCoreVersion("0.5.6")) SquareGrid.prototype.measureDistances = measureDistances;
  else SquareGrid.prototype.measureDistance = measureDistance;
});

Hooks.on("renderSceneNavigation", function() {
  for (let key of game.actors.keys()) {
    TopPortraitBar.render(game.actors.get(key))
  }
});

Hooks.on("deleteActor", function() {
  TopPortraitBar.clear()
  for (let key of game.actors.keys()) {
    TopPortraitBar.render(game.actors.get(key))
  }
});

Hooks.on('createActor', (actor, data, options) => {
  if( actor.data.type === 'character') {
    if (actor.data.data.details?.levelUpProgression === undefined || actor.data.data.details?.levelUpProgression === null) {
      let updateData = {}
      updateData["data.details.levelUpProgression"] = true;
      actor.update(updateData)
    }
  }
});
/* -------------------------------------------- */
/*  Other Hooks                                 */
/* -------------------------------------------- */

Hooks.on("renderChatMessage", (app, html, data) => {
  // Display action buttons
  chat.displayChatActionButtons(app, html, data);

  // Hide roll info
  chat.hideRollInfo(app, html, data);

  // Hide GM sensitive info
  chat.hideGMSensitiveInfo(app, html, data);

  // Optionally collapse the content
  if (game.settings.get("D35E", "autoCollapseItemCards")) html.find(".card-content").hide();
});

// Hooks.on("getChatLogEntryContext", addChatMessageContextOptions);
Hooks.on("renderChatLog", (_, html) => ItemPF.chatListeners(html));
Hooks.on("renderChatLog", (_, html) => ActorPF.chatListeners(html));


Hooks.on("updateOwnedItem", (actor, _, changedData, options, user) => {
  if (!(actor instanceof Actor)) return;

  if (user !== game.userId) {
    console.log("Not updating actor as action was started by other user")
    return
  }
  //actor.updateContainerData(updateData)
  const item = actor.getOwnedItem(changedData._id);
  if (item == null) return;
  actor.updateItemResources(item);
});
Hooks.on("updateToken", (scene, sceneId, data, options, user) => {
  const actor = game.actors.tokens[data._id];
  if (actor != null && user === game.userId && hasProperty(data, "actorData.items")) {
    actor.refresh(options);

    // Update items
    for (let i of actor.items) {
      actor.updateItemResources(i);
    }
  }
  if (user !== game.userId) {
    console.log("Not updating actor as action was started by other user")
  }
});

Hooks.on("renderTokenConfig", async (app, html) => {
  let newHTML = await renderTemplate("systems/D35E/templates/internal/token-config.html", {
    object: duplicate(app.object.data),
  });
  html.find('.tab[data-tab="vision"] > *:nth-child(2)').after(newHTML);
});


Hooks.on("createCombatant", (combat, combatant, info, data) => {
  const actor = game.actors.tokens[combatant.tokenId];
  if (actor != null) {
    actor.refresh();
    if (actor.items !== undefined && actor.items.size > 0) {
      // Update items
      for (let i of actor.items) {
        actor.updateItemResources(i);
        i.resetPerEncounterUses();
      }
    }
  }
});

Hooks.on("updateCombat", (combat, combatant, info, data) => {
  if (!game.user.isGM)
    return;
  const actor = combat.combatant.actor;
  if (actor != null) {
    actor.refresh();
    if (actor.items !== undefined && actor.items.size > 0) {
      // Update items
      for (let i of actor.items) {
        actor.updateItemResources(i);
        i.addElapsedTime(1);
      }
    }
  }
});

// Create race on actor
Hooks.on("preCreateOwnedItem", (actor, item) => {
  if (!(actor instanceof Actor)) return;
  if (actor.race == null) return;


  if (item.type === "race") {
    actor.race.update(item);
    return false;
  }
});

Hooks.on("createOwnedItem", (actor, data, options, user) => {
  if (!(actor instanceof Actor)) return;

  if (user !== game.userId) {
    console.log("Not updating actor as action was started by other user")
    return
  }
  actor.refresh(options);
});
Hooks.on("deleteOwnedItem", (actor, data, options, user) => {
  if (!(actor instanceof Actor)) return;

  if (user !== game.userId) {
    console.log("Not updating actor as action was started by other user")
    return
  }
  actor.refresh(options);
});

Hooks.on("updateActor",  (actor, data, options, user) => {
  if (!(actor instanceof Actor)) return;
  if (user !== game.userId) {
    console.log("Not updating actor as action was started by other user")
    return
  }
  TopPortraitBar.render(actor)
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if ( data.type !== "Item" ) return;
  createItemMacro(data.data, slot);
  return false;
});

Hooks.on('diceSoNiceReady', (dice3d) => {
  dice3d.addColorset({
    name: 'Legacies of the Dragon',
    description: "Legacies of the Dragon",
    category: "Standard",
    foreground: '#fff4eb',
    background: "#340403",
    texture: 'dragon',
    edge: '#340403'
  },"default");

})

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} item     The item data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(item, slot) {
  const actor = getItemOwner(item);
  const command = `game.D35E.rollItemMacro("${item.name}", {\n` +
  `  itemId: "${item._id}",\n` +
  `  itemType: "${item.type}",\n` +
  (actor != null ? `  actorId: "${actor._id}",\n` : "") +
  `});`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if ( !macro ) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: {"D35E.itemMacro": true}
    }, {displaySheet: false});
  }
  game.user.assignHotbarMacro(macro, slot);
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @param {object} [options={}]
 * @return {Promise}
 */
function rollItemMacro(itemName, {itemId=null, itemType=null, actorId=null}={}) {
  let actor = getActorFromId(actorId);
  if (actor && !actor.hasPerm(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));
  const item = actor ? actor.items.find(i => {
    if (itemId != null && i._id !== itemId) return false;
    if (itemType != null && i.type !== itemType) return false;
    return i.name === itemName;
  }) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

   // Trigger the item roll
   if (!game.keyboard.isDown("Control")) {
    return item.use({skipDialog: keyboard.isDown("Shift")});
   }
   return item.roll();
 }
 

/**
 * Show an actor's defenses.
 */
function rollDefenses({actorName=null, actorId=null}={}) {
  const speaker = ChatMessage.getSpeaker();
  let actor = game.actors.entities.filter(o => {
    if (!actorName && !actorId) return false;
    if (actorName && o.name !== actorName) return false;
    if (actorId && o._id !== actorId) return false;
    return true;
  })[0];
  if (speaker.token && !actor) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  if (!actor) return ui.notifications.warn("No applicable actor found");

  return actor.rollDefenses();
};

function rollTurnUndead({actorName=null, actorId=null}={}) {
  const speaker = ChatMessage.getSpeaker();
  let actor = game.actors.entities.filter(o => {
    if (!actorName && !actorId) return false;
    if (actorName && o.name !== actorName) return false;
    if (actorId && o._id !== actorId) return false;
    return true;
  })[0];
  if (speaker.token && !actor) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  if (!actor) return ui.notifications.warn("No applicable actor found");

  return actor.rollTurnUndead();
};
