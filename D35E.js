/**
 * The D35E edition game system for Foundry Virtual Tabletop
 * Author: LoopeeDK, Rughalt
 * Software License: GNU GPLv3
 */

// Import Modules
import { D35E } from "./module/config.js";
import { registerSystemSettings } from "./module/settings.js";
import { preloadHandlebarsTemplates } from "./module/templates.js";
import {measureDistances, measureDistance, getConditions} from "./module/canvas.js";
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
import { createCustomChatMessage } from "./module/chat.js";
import {
  getItemOwner,
  sizeDie,
  getActorFromId,
  isMinimumCoreVersion,
  sizeNaturalDie,
  sizeMonkDamageDie
} from "./module/lib.js";
import { ChatMessagePF } from "./module/sidebar/chat-message.js";
import { TokenQuickActions } from "./module/token-quick-actions.js";
import { TopPortraitBar } from "./module/top-portrait-bar.js";
import * as chat from "./module/chat.js";
import * as migrations from "./module/migration.js";
import {SemanticVersion} from "./semver.js";
import {sizeInt} from "./module/lib.js";
import * as cache from "./module/cache.js";
import {CACHE} from "./module/cache.js";
import D35ELayer from "./module/layer.js";
import {EncounterGeneratorDialog} from "./module/apps/encounter-generator-dialog.js";
import {TreasureGeneratorDialog} from "./module/apps/treasure-generator-dialog.js";
import {ActorSheetTrap} from "./module/actor/sheets/trap.js";
import {applyConfigModifications} from "./module/config-tools.js";
import {addLowLightVisionToLightConfig} from "./module/low-light-vision.js";
import {Roll35e} from "./module/roll.js";
import {genTreasureFromToken} from "./module/treasure/treasure.js"
import { ActiveEffectD35E } from "./module/ae/entity.js";
import { CollateAuras } from "./module/auras/aura-helpers.js";

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
      sizeNaturalRoll: sizeNaturalDie,
      sizeMonkDamageRoll: sizeMonkDamageDie,
      sizeVal: sizeInt
    },
    migrateWorld: migrations.migrateWorld,
    createdMeasureTemplates: new Set()
  };

  // Record Configuration Values
  CONFIG.D35E = D35E;
  CONFIG.debug.hooks = true;
  CONFIG.Actor.documentClass = ActorPF;
  CONFIG.Item.documentClass = ItemPF;
  CONFIG.ActiveEffect.documentClass = ActiveEffectD35E;
  CONFIG.ui.compendium = CompendiumDirectoryPF;
  CONFIG.ChatMessage.documentClass = ChatMessagePF;

  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("D35E", ActorSheetPFCharacter, { types: ["character"], makeDefault: true, label: game.i18n.localize("D35E.ActorSheetPFCharacter") });
  Actors.registerSheet("D35E", ActorSheetPFNPC, { types: ["npc"], makeDefault: true, label: game.i18n.localize("D35E.ActorSheetPFNPC")  });
  Actors.registerSheet("D35E", ActorSheetPFNPCLite, { types: ["npc"], makeDefault: false, label: game.i18n.localize("D35E.ActorSheetPFNPCLite")  });
  Actors.registerSheet("D35E", ActorSheetPFNPCMonster, { types: ["npc"], makeDefault: false, label: game.i18n.localize("D35E.ActorSheetPFNPCMonster")  });
  Actors.registerSheet("D35E", ActorSheetTrap, { types: ["trap"], makeDefault: true, label: game.i18n.localize("D35E.ActorSheetPFNPCTrap")  });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("D35E", ItemSheetPF, { types: ["class", "feat", "spell", "consumable","equipment", "loot", "weapon", "buff", "aura", "attack", "race", "enhancement","damage-type","material","full-attack","card"], makeDefault: true });


  // Register System Settings
  registerSystemSettings();

  CONFIG.statusEffects = getConditions();


  CONFIG.Canvas.layers["d35e"] = D35ELayer;

  // Patch Core Functions
  PatchCore();
  // Preload Handlebars Templates
  await preloadHandlebarsTemplates();
  applyConfigModifications();

  // Register sheet application classes

  // Enable skin
  $('body').toggleClass('d35ecustom', game.settings.get("D35E", "customSkin"));
  $('body').toggleClass('color-blind', game.settings.get("D35E", "colorblindColors"));
  $('body').toggleClass('no-players-list', game.settings.get("D35E", "hidePlayersList"));
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
    "abilities", "abilitiesShort", "alignments", "currencies", "distanceUnits","distanceUnitsShort", "itemActionTypes", "senses", "skills", "targetTypes",
    "timePeriods", "savingThrows", "ac", "acValueLabels", "featTypes", "conditions", "lootTypes", "flyManeuverabilities",
    "spellPreparationModes", "weaponTypes", "weaponProperties", "spellComponents", "spellSchools", "spellLevels", "conditionTypes",
    "favouredClassBonuses", "armorProficiencies", "weaponProficiencies", "actorSizes", "actorTokenSizes", "abilityActivationTypes", "abilityActivationTypesPlurals",
    "limitedUsePeriods", "equipmentTypes", "equipmentSlots", "consumableTypes", "attackTypes", "attackTypesShort", "buffTypes", "buffTargets", "contextNoteTargets",
    "healingTypes", "divineFocus", "classSavingThrows", "classBAB", "classTypes", "measureTemplateTypes", "creatureTypes", "race", "damageTypes", "conditionalTargets",
    "savingThrowTypes","requirements","savingThrowCalculationTypes",
    "abilityTypes", "auraTarget"
  ];

  const doLocalize = function(obj) {
    return Object.entries(obj).reduce((obj, e) => {
      if (typeof e[1] === "string") obj[e[0]] = game.i18n.localize(e[1]);
      else if (typeof e[1] === "object") obj[e[0]] = doLocalize(e[1]);
      return obj;
    }, {});
  };
  for ( let o of toLocalize ) {
    try {
      CONFIG.D35E[o] = doLocalize(CONFIG.D35E[o]);
    } catch (e) {
      //ignore
    }
  }
});

/* -------------------------------------------- */

/**
 * Once the entire VTT framework is initialized, check to see if we should perform a data migration
 */
Hooks.once("ready", async function() {

  $('body').toggleClass('d35gm', game.user.isGM);
  $('body').toggleClass('hide-special-action', !game.settings.get("D35E", "allowPlayersApplyActions"));
  $('body').toggleClass('transparent-sidebar', game.settings.get("D35E", "transparentSidebarWhenUsingTheme"));


  const NEEDS_MIGRATION_VERSION = "0.87.7";
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
  let isDemo = game.settings.get("D35E", "demoWorld")
  if (isDemo) {

    $('#chat-message').val('Chat is disabled in Demo Mode. This world resets every 2 hours!')
    $('#chat-message').prop('disabled',true)
    if (game.paused) game.togglePause();
  }




  await cache.buildCache();
  console.log("D35E | Cache is ", CACHE)
  //game.actors.contents.forEach(obj => { obj._updateChanges({sourceOnly: true}, {skipToken: true}); });

  Hooks.on('renderTokenHUD', (app, html, data) => { TokenQuickActions.addTop3Attacks(app, html, data) });
  Hooks.on('renderTokenHUD', (app, html, data) => { TokenQuickActions.addTop3Buffs(app, html, data) });

  for (let key of game.actors.keys()) {
    TopPortraitBar.render(game.actors.get(key))
  }

  let updateRequestArray = []

  const interval = setInterval(function() {
    if (updateRequestArray.length === 0) {
      game.actors.contents.filter(obj => obj.testUserPermission(game.user, "OWNER") && obj.data.data.companionUuid && obj.canAskForRequest).forEach(a => {
        updateRequestArray.push(a);
      });
    }
  }, 1000);

  const actionRequestInterval = setInterval(function() {
    let a = updateRequestArray.shift();
    if (a)
      a.getQueuedActions();
  }, 500);

  if (!game.user.isGM) {
    let isDemo = game.settings.get("D35E", "demoWorld")
        if (isDemo){
          (await import(
                  /* webpackChunkName: "welcome-screen" */
                  './module/demo-screen.js'
                  )
          ).default();
        } else {
          (await import(
                  /* webpackChunkName: "welcome-screen" */
                  './module/onboarding.js'
                  )
          ).default();
        }
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

  (await import(
    /* webpackChunkName: "welcome-screen" */
    './module/onboarding.js'
    )
).default();
  if (!isNewerVersion(moduleVersion, oldVersion))
    return;
  (await import(
          /* webpackChunkName: "welcome-screen" */
          './module/welcome-screen.js'
          )
  ).default();

});

Hooks.on("renderSettings", (app, html) => {
  let lotdSection = $(`<h2 id="d35e-help-section" data-action="d35e-help">3.5e SRD Help</h2>`);
  html.find('#settings-game').after(lotdSection);
  let lotdDiv = $(`<div id="d352-help"></div>`);
  lotdSection.after(lotdDiv);
  let helpButton = $(`<button id="d35e-help-btn" data-action="d35e-help"><i class="fas fa-question-circle"></i> Documentation</button>`);
  lotdDiv.append(helpButton);
  helpButton.on('click', ev => {
    ev.preventDefault();
    window.open('https://docs.legaciesofthedragon.com', 'lotdHelp', 'width=1032,height=900');
  });


  let dicordButton = $(`<button id="d35e-discord" data-action="d35e-discord"><i class="fab fa-discord"></i> Community Discord</button>`);
  lotdDiv.append(dicordButton);
  dicordButton.on('click', ev => {
    ev.preventDefault();
    window.open('https://discord.gg/wDyUaZH', '_blank');
  });


  let patreonButton = $(`<button id="d35e-discord" data-action="d35e-discord"><i class="fab fa-patreon"></i> Support on Patreon</button>`);
  lotdDiv.append(patreonButton);
  patreonButton.on('click', ev => {
    ev.preventDefault();
    window.open('https://patreon.com/rughalt', '_blank');
  });

});

Hooks.on("renderActorSheet",function(sheet, window, data) {
  //sheet.object.refresh({render: false})
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
    let updateData = {}
    if (actor.data.data.details?.levelUpProgression === undefined || actor.data.data.details?.levelUpProgression === null) {
      updateData["data.details.levelUpProgression"] = true;
    }
    updateData["token.vision"] = true;
    updateData["token.actorLink"] = true;
    if (updateData)
      actor.update(updateData)
  } else if ( actor.data.type === 'npc') {
    let updateData = {}
    updateData["token.bar1"] = {attribute: "attributes.hp"};
    updateData["token.displayName"] = 20;
    updateData["token.displayBars"] = 40;
    if (updateData)
      actor.update(updateData)
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

  chat.enableToggles(app, html, data);

  // Optionally collapse the content
  if (game.settings.get("D35E", "autoCollapseItemCards")) html.find(".card-content.item").hide();
});

// Hooks.on("getChatLogEntryContext", addChatMessageContextOptions);
Hooks.on("renderChatLog", (_, html) => ItemPF.chatListeners(html));
Hooks.on("renderChatLog", (_, html) => ActorPF.chatListeners(html));

const debouncedCollate = debounce((a, b, c, d) => CollateAuras(a, b, c, d), 500)
Hooks.on("updateItem", (item, changedData, options, user) => {
  console.log('D35E | Updated Item', item,changedData,options,user,game.userId)
  let actor = item.parent;
  if (actor) {
    TopPortraitBar.render(actor)
    if (!(actor instanceof Actor)) return;

    if (user !== game.userId) {
      console.log("Not updating actor as action was started by other user")
      return
    }
    //actor.refresh(options)
  }
});


Hooks.on("renderTokenConfig", async (app, html) => {
  console.log(app.object.data)
  let token = app.object.data.token || app.object.data;
  let newHTML = await renderTemplate("systems/D35E/templates/internal/token-light-info.html", {
    object: duplicate(token.actorLink ? token.document.data.toObject(false) : app.object.data.toObject(false)),
    globalDisable: game.settings.get("D35E", "globalDisableTokenLight")
  });
  html.find('.tab[data-tab="vision"] > *:nth-child(5)').after(newHTML);
  let newHTML2 = await renderTemplate("systems/D35E/templates/internal/token-config.html", {
    object: duplicate(token.actorLink ? token.toObject(false) : app.object.data)
  });
  html.find('.tab[data-tab="vision"] > *:nth-child(2)').after(newHTML2);
});

Hooks.on("renderLightConfig", (app, html) => {
  addLowLightVisionToLightConfig(app, html);
});


Hooks.on("createToken", async (token, options, userId) => {
  if (userId !== game.user._id) return;

  const actor = game.actors.tokens[token._id] ?? game.actors.get(token.data.actorId);
  actor.toggleConditionStatusIcons();

  // Update changes and generate sourceDetails to ensure valid actor data
  if (actor != null) await actor.refresh();

  if (game.settings.get("D35E", "randomizeHp") && token.actor.type === 'npc' && !token.actor.hasPlayerOwner){
    function getRandomInt(min, max) {
      min = Math.ceil(min);
      max = Math.floor(max);
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    let itemUpdates = []
    token.actor.data.items.filter(obj => { return obj.type === "class" }).forEach(item => {
      let hd = item.data.data.hd
      let hp = 0;
      let levels = item.data.data.levels;
      for (let i = 0; i < levels; i++) {
        hp += getRandomInt(1,hd);
      }
      itemUpdates.push({_id: item._id, "data.hp": hp});
    });
    await token.actor.updateEmbeddedEntity("Item", itemUpdates, {stopUpdates: false, ignoreSpellbookAndLevel: true})
  }

  debouncedCollate(canvas.scene.id, true, true, "updateToken")

});

Hooks.on("updateToken", async (token, options, userId) => {
  if (options?.stopAuraUpdate) return;
  if (options.tokenOnly) return;
  debouncedCollate(canvas.scene.id, true, true, "updateToken")
});

Hooks.on("deleteToken", async (token, options, userId) => {
  if (options?.stopAuraUpdate) return;
  if (options.tokenOnly) return;
  debouncedCollate(canvas.scene.id, true, true, "updateToken")
});


Hooks.on("createCombatant", (combat, combatant, info, data) => {
  if (!game.user.isGM)
    return;
  const actor = game.actors.tokens[combatant.tokenId];
  if (actor != null) {
    let itemResourcesData = {}
    for (let i of actor.items || []) {
      actor.getItemResourcesUpdate(i, itemResourcesData);
    }
    actor.refreshWithData(itemResourcesData, {})
  }
});

Hooks.on("updateCombat", async (combat, combatant, info, data) => {
  if (!game.user.isGM)
    return;
  if ((combat.current.turn <= combat.previous.turn && combat.current.round === combat.previous.round) || combat.current.round < combat.previous.round)
    return; // We moved back in time
  const actor = combat.combatant.actor;
  if (actor != null) {
    await actor.progressTime(1);
    debouncedCollate(canvas.scene.id, true, true, "updateToken")
  }
});


Hooks.on("createMeasuredTemplate", (scene, _template, data, user) => {
  game.D35E.createdMeasureTemplates.add(_template._id)
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

Hooks.on("createItem", (data, options, user) => {
  if (!(data.parent instanceof Actor)) return;

  if (user !== game.userId) {
    console.log("Not updating actor as action was started by other user")
    return
  }
  //data.parent.refresh(options);
});
Hooks.on("deleteItem", (data, options, user) => {
  if (!(data.parent instanceof Actor)) return;

  if (user !== game.userId) {
    console.log("Not updating actor as action was started by other user")
    return
  }
  //data.parent.refresh(options);
});

Hooks.on("getChatLogEntryContext", chat.addChatMessageContextOptions);

Hooks.on("updateActor",  (actor, data, options, user) => {
  TopPortraitBar.render(actor)
  if (!(actor instanceof Actor)) return;
  if (user !== game.userId) {
    console.log("Not updating actor as action was started by other user")
    return
  } else {

    debouncedCollate(canvas.scene.id, true, true, "updateToken")
    if (actor.data.data.companionAutosync) {
      actor.syncToCompendium()
    }
  }
});

Hooks.on("controlToken", (token, selected) => {
  // Refresh canvas sight
  canvas.lighting.initializeSources();
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

Hooks.on("hotbarDrop", (bar, data, slot) => {
  if ( data.type !== "Item" ) return;
  createItemMacro(data.data, slot);
  return false;
});

Hooks.on("updateWorldTime", async (date, delta, other) => {
  let roundsDelta = Math.floor(delta / 6);
  if (roundsDelta === 0) return;
  if (!game.user.isGM)
    return;
  let alreadyChecked = new Set();
  let updatePromises = []
  for (const source of canvas.tokens.placeables) {
    if (!source.actor) continue;
    let actor = ActorPF.getActorFromTokenPlaceable(source)

    let trueId = actor.id;
    if (actor.isToken) trueId = source.id;
    if (alreadyChecked.has(trueId)) continue;
    alreadyChecked.add(trueId)
    
    if (actor) {
      updatePromises.push(actor.progressTime(roundsDelta));
    }
  }
  Promise.all(updatePromises).then(() => {
    debouncedCollate(canvas.scene.id, true, true, "updateToken")
  })
    
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
  let macro = game.macros.contents.find(m => (m.name === item.name) && (m.command === command));
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
  if (actor && !actor.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));
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
  let actor = game.actors.contents.filter(o => {
    if (!actorName && !actorId) return false;
    if (actorName && o.name !== actorName) return false;
    if (actorId && o._id !== actorId) return false;
    return true;
  })[0];
  if (speaker.token && !actor) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  if (!actor) return ui.notifications.warn("No applicable actor found");

  return actor.displayDefenses();
};

function rollTurnUndead({actorName=null, actorId=null}={}) {
  const speaker = ChatMessage.getSpeaker();
  let actor = game.actors.contents.filter(o => {
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


Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;
  controls.push({
    name: "d35e-gm-tools",
    title: "D35E.GMTools",
    icon: "fas fa-dungeon",
    layer: "d35e",
    tools: [
      {
        name: "select",
        title: "CONTROLS.BasicSelect",
        icon: "fas fa-expand",
      },
      {
        name: "d35e-gm-tools-encounter-generator",
        title: "D35E.EncounterGenerator",
        icon: "fas fa-dragon",
        onClick: () => {
          new EncounterGeneratorDialog().render(true);
          //QuestLog.render(true)
          // Place your code here - <app class name>.render()
          // Remember you must import file on the top - look at imports
        },
        button: true,
      },
      {
        name: "d35e-gm-tools-treasure-generator",
        title: "D35E.TreasureGenerator",
        icon: "fas fa-gem",
        onClick: async () => {
          let selectedNpcTokens = canvas.tokens.controlled.filter(
            (t) => game.actors.get(t.data.actorId).data.type === "npc"
          );
          if (selectedNpcTokens.length === 0) {
            ui.notifications.error(`Please select at least a token`);
            return;
          }
          for (let token of canvas.tokens.controlled.filter(
            (t) => game.actors.get(t.data.actorId).data.type === "npc"
          ))
            {await genTreasureFromToken(token);}
            ui.notifications.info(`Treasure generation finished`);
        },
        button: true,
      },
      {
        name: "d35e-gm-tools-custom-treasure-generator",
        title: "D35E.CustomTreasureGenerator",
        icon: "fas fa-store",
        onClick: () => {
          new TreasureGeneratorDialog().render(true);
        },
        button: true,
      },
      {
        name: "d35e-gm-tools-rest-party",
        title: "D35E.RestParty",
        icon: "fas fa-bed",
        onClick: () => {
          if (typeof SimpleCalendar !== "undefined") {
            SimpleCalendar.api.changeDate({hour: 8});
          }
          let restingPromises = []
          for (let actor of game.actors.filter(a => a.data.data.isPartyMember)) {
            restingPromises.push(actor.rest(true,true,false))
          }
          Promise.all(restingPromises).then(() => {
            let chatTemplateData = {
                name: game.i18n.localize("D35E.PartyRestedHeader"),
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                rollMode: "public",
                text: game.i18n.localize("D35E.PartyRested")
            };
            createCustomChatMessage("systems/D35E/templates/chat/gm-message.html", chatTemplateData, {}, {});
          })
        
        },
        button: true,
      },
    ],
    activeTool: "select",
  });
});


