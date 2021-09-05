/**
 * Perform a system migration for the entire World, applying migrations for Actors, Items, and Compendium packs
 * @return {Promise}      A Promise which resolves once the migration is completed
 */
export const migrateWorld = async function() {
  if (!game.user.isGM) return ui.notifications.error(game.i18n.localize("D35E.ErrorUnauthorizedAction"));
  ui.notifications.info(`Applying D35E System Migration for version ${game.system.data.version}. Please stand by.`);
  //console.log(`Applying D35E System Migration for version ${game.system.data.version}. Please stand by.`);

  // Migrate World Actors
  for ( let a of game.actors.contents ) {
    try {

      let itemsToAdd = []
      const updateData = await migrateActorData(a,itemsToAdd);
      //console.log(`Migrating Actor entity ${a.name}`);
      await a.update(updateData);
      //console.log(`Adding missing items to ${a.name}`);
      if (itemsToAdd.length)
        await a.createEmbeddedEntity("OwnedItem", itemsToAdd, {stopUpdates: true});
    } catch(err) {
      console.error(err);
    }
  }

  // Migrate World Items
  for ( let i of game.items.contents ) {
    try {
      const updateData = migrateItemData(i);
      //console.log(`Migrating Item entity ${i.name}`);
      await i.update(updateData, {enforceTypes: false});
    } catch(err) {
      console.error(err);
    }
  }

  // Migrate Actor Override Tokens
  for ( let s of game.scenes.contents ) {
    try {
      const updateData = await migrateSceneData(s.data);
      //console.log(`Migrating Scene entity ${s.name}`);
      await s.update(updateData);
    } catch(err) {
      console.error(err);
    }
  }

  // Migrate World Compendium Packs
  const packs = game.packs.filter(p => {
    return (p.metadata.package === "world") && ["Actor", "Item", "Scene"].includes(p.metadata.entity)
  });
  for ( let p of packs ) {
    await migrateCompendium(p);
  }

  // Set the migration as complete
  game.settings.set("D35E", "systemMigrationVersion", game.system.data.version);
  ui.notifications.info(`D35E System Migration to version ${game.system.data.version} succeeded!`);
};

/* -------------------------------------------- */

/**
 * Apply migration rules to all Entities within a single Compendium pack
 * @param pack
 * @return {Promise}
 */
export const migrateCompendium = async function(pack) {
  const entity = pack.metadata.entity;
  if ( !["Actor", "Item", "Scene"].includes(entity) ) return;
  let content = []
  try {
    // Begin by requesting server-side data model migration and get the migrated content
    await pack.migrate();
    content = await pack.getDocuments();
  } catch(err) {
    ui.notifications.error(game.i18n.localize("D35E.ErrorProblemWithMigratingPack") + pack.collection);
    console.error(err);
  }

  // Iterate over compendium entries - applying fine-tuned migration functions
  for ( let ent of content ) {
    try {
      let updateData = null;
      if (entity === "Item") updateData = migrateItemData(ent);
      else if (entity === "Actor") updateData = await migrateActorData(ent);
      else if ( entity === "Scene" ) updateData = await migrateSceneData(ent);
      expandObject(updateData);
      updateData["_id"] = ent._id;
      await pack.updateEntity(updateData);
      //console.log(`Migrated ${entity} entity ${ent.name} in Compendium ${pack.collection}`);
    } catch(err) {
      console.error(err);
    }
  }
  //console.log(`Migrated all ${entity} entities from Compendium ${pack.collection}`);
};

/* -------------------------------------------- */
/*  Entity Type Migration Helpers               */
/* -------------------------------------------- */


/**
 * Migrate a single Actor entity to incorporate latest data model changes
 * Return an Object of updateData to be applied
 * @param {Actor} actor   The actor to Update
 * @return {Object}       The updateData to apply
 */
export const migrateActorData = async function(actor, itemsToAdd) {
  const updateData = {};
  _migrateCharacterLevel(actor, updateData);
  _migrateActorEncumbrance(actor, updateData);
  _migrateActorDefenseNotes(actor, updateData);
  _migrateActorSpeed(actor, updateData);
  _migrateSpellDivineFocus(actor, updateData);
  _migrateActorSpellbookSlots(actor, updateData);
  _migrateActorBaseStats(actor, updateData);
  _migrateActorCreatureType(actor, updateData);
  _migrateActorSpellbookDCFormula(actor, updateData);
  _migrateActorRace(actor, updateData)
  _migrateActorTokenVision(actor, updateData);
  await _migrateWeaponProficiencies(actor,updateData,itemsToAdd)
  await _migrateArmorProficiencies(actor,updateData,itemsToAdd)

  if ( !actor.items ) return updateData;

  // Migrate Owned Items
  let items = [];
  const actorItems = Array.from(actor.items);
  for (let a = 0; a < actorItems.length; a++) {
    let i = actorItems[a];
    items[a] = i;
    let itemUpdate = migrateItemData(i);

    // Update the Owned Item
    items[a] = mergeObject(i, itemUpdate, { enforceTypes: false, inplace: false });
  }
  updateData.items = items;
  return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate a single Item entity to incorporate latest data model changes
 * @param item
 */
export const migrateItemData = function(item) {
  const updateData = {};

  _migrateIcon(item, updateData);
  _migrateItemSpellUses(item, updateData);
  _migrateWeaponDamage(item, updateData);
  _migrateWeaponImprovised(item, updateData);
  _migrateSpellDescription(item, updateData);
  _migrateItemDC(item, updateData);
  _migrateClassDynamics(item, updateData);
  _migrateClassType(item, updateData);
  _migrateWeaponCategories(item, updateData);
  _migrateEquipmentCategories(item, updateData);
  _migrateWeaponSize(item, updateData);
  _migrateContainer(item, updateData);
  _migrateEnhancement(item, updateData);
  _migrateSpellName(item, updateData);

  // Return the migrated update data
  return updateData;
};

/* -------------------------------------------- */

/**
 * Migrate a single Scene entity to incorporate changes to the data model of it's actor data overrides
 * Return an Object of updateData to be applied
 * @param {Object} scene  The Scene data to Update
 * @return {Object}       The updateData to apply
 */
export const migrateSceneData = async function(scene) {
  const result = { tokens: duplicate(scene.tokens) };
  for (let t of result.tokens) {
    if (!t.actorId || t.actorLink || !t.actorData.data) {
      t.actorData = {};
      continue;
    }
    const token = new Token(t);

    migrateTokenVision(token, t)

    if (!token.actor) {
      t.actorId = null;
      t.actordata = {};
    }
    const originalActor = game.actors.get(token.actor?.id);
    if (!originalActor) {
      t.actorId = null;
      t.actorData = {};
    }
    else {
      const updateData = await migrateActorData(token.data.actorData);
      t.actorData = mergeObject(token.data.actorData, updateData);
    }
  }
  return result;
};

const _migrateActorTokenVision = function(ent, updateData) {
  const vision = getProperty(ent.data, "data.attributes.vision");
  if (!vision) return;

  updateData["data.attributes.-=vision"] = null;
  updateData["token.flags.D35E.lowLightVision"] = vision.lowLight;
  if (!getProperty(ent.data, "token.brightSight")) updateData["token.brightSight"] = vision.darkvision;
};

const migrateTokenVision = function(token, updateData) {
  if (!token.actor) return;

  setProperty(updateData, "flags.D35E.lowLightVision", getProperty(token.actor.data, "token.flags.D35E.lowLightVision"));
  setProperty(updateData, "brightSight", getProperty(token.actor.data, "token.brightSight"));
};



/* -------------------------------------------- */
/*  Low level migration utilities
/* -------------------------------------------- */

/**
 * Migrate string format traits with a comma separator to an array of strings
 * @private
 */
const _migrateActorTraits = function(actor, updateData) {
  if ( !actor.data.traits ) return;
  const dt = invertObject(CONFIG.D35E.damageTypes);
  const map = {
    "dr": dt,
    "di": dt,
    "dv": dt,
    "ci": invertObject(CONFIG.D35E.conditionTypes),
    "languages": invertObject(CONFIG.D35E.languages)
  };
  for ( let [t, choices] of Object.entries(map) ) {
    const trait = actor.data.traits[t];
    if ( trait && (typeof trait.value === "string") ) {
      updateData[`data.traits.${t}.value`] = trait.value.split(",").map(t => choices[t.trim()]).filter(t => !!t);
    }
  }
};

/* -------------------------------------------- */


/**
 * Flatten several attributes which currently have an unnecessarily nested {value} object
 * @private
 */
const _migrateFlattenValues = function(ent, updateData, toFlatten) {
  for ( let a of toFlatten ) {
    const attr = getProperty(ent.data, a);
    if ( attr instanceof Object && !updateData.hasOwnProperty("data."+a) ) {
      updateData["data."+a] = attr.hasOwnProperty("value") ? attr.value : null;
    }
  }
};

const _migrateAddValues = function(ent, updateData, toAdd) {
  for (let [k, v] of Object.entries(toAdd)) {
    const attr = getProperty(ent.data, k);
    if (!attr && !updateData.hasOwnProperty(k)) {
      updateData[k] = v;
    }
  }
};

/* -------------------------------------------- */

const _migrateCharacterLevel = function(ent, updateData) {
  const arr = ["details.level.value", "details.level.min", "details.level.max"];
  for (let k of arr) {
    const value = getProperty(ent.data.data, k);
    if (value == null) {
      updateData["data."+k] = 0;
    }
  }
  let k = "details.levelUpProgression"
  const value = getProperty(ent.data.data, k);
  //console.log(`D35E | Migrate | Level up progression ${value}`)
  if (value === null || value === undefined) {

    updateData["data.details.levelUpProgression"] = false;
  }
};

const _migrateActorEncumbrance = function(ent, updateData) {
  const arr = ["attributes.encumbrance.level", "attributes.encumbrance.levels.light",
  "attributes.encumbrance.levels.medium", "attributes.encumbrance.levels.heavy",
  "attributes.encumbrance.levels.carry", "attributes.encumbrance.levels.drag",
  "attributes.encumbrance.carriedWeight"];
  for (let k of arr) {
    const value = getProperty(ent.data.data, k);
    if (value == null) {
      updateData["data."+k] = 0
    }
  }
};

const _migrateWeaponProficiencies = async function(actor, updateData, itemsToAdd) {
  if (!itemsToAdd) return;
  let weaponProfItemId = "F7ouXcMvMxDFNq8S";
  let martialWeaponProfItemId = "L6Zih954XajPhxk0";
  let simpleWeaponProfItemId = "5jR5ehCRndtJpCGb";
  let pack = game.packs.get("D35E.feats");
  if (!(actor instanceof Actor)) return;
  let data = actor.data.data;
  if (data.traits && data.traits.weaponProf && data.traits.weaponProf.value) {
    if (data.traits.weaponProf.value.indexOf("sim") !== -1) {
      let item = await pack.getEntity(simpleWeaponProfItemId)
      let data = duplicate(item.data);
      delete data._id;
      itemsToAdd.push(data);
    }
    if (data.traits.weaponProf.value.indexOf("mar") !== -1) {
      let item = await pack.getEntity(martialWeaponProfItemId)
      let data = duplicate(item.data);
      delete data._id;
      itemsToAdd.push(data);
    }
    updateData["data.traits.weaponProf.value"] = [];
  }
  if (data.traits && data.traits.weaponProf && data.traits.weaponProf.custom) {
    let weaponProfsCustom =  data.traits.weaponProf.custom.split(";");
    for (const weaponName of weaponProfsCustom) {
      let item = await pack.getEntity(weaponProfItemId)
      let data = duplicate(item.data);
      delete data._id;
      data.data.customAttributes["_87nolel8u"].value = weaponName
      data.name = data.data.nameFormula.replace("${this.custom.weaponname}",weaponName)
      itemsToAdd.push(data);
    }
    updateData["data.traits.weaponProf.custom"] = '';
  }
}

const _migrateArmorProficiencies = async function(actor, updateData, itemsToAdd) {
  if (!itemsToAdd) return;
  let spr = "AfSyZ6BqEOyyDzBD"
  let sprTower = "L2aYtdPHUaGH8UPE"
  let armProfLight = "tflks0QMIbzAyEle"
  let armProfMed = "ZwIMzns2opN6xxIo"
  let armProfHeavy = "sh3SLeHp45GMtm3n"
  let pack = game.packs.get("D35E.feats");
  if (!(actor instanceof Actor)) return;
  let data = actor.data.data;
  if (data.traits && data.traits.weaponProf && data.traits.armorProf.value) {
    if (data.traits.armorProf.value.indexOf("twr") !== -1) {
      let item = await pack.getEntity(sprTower)
      let data = duplicate(item.data);
      delete data._id;
      itemsToAdd.push(data);
    }
    if (data.traits.armorProf.value.indexOf("shl") !== -1) {
      let item = await pack.getEntity(spr)
      let data = duplicate(item.data);
      delete data._id;
      itemsToAdd.push(data);
    }
    if (data.traits.armorProf.value.indexOf("lgt") !== -1) {
      let item = await pack.getEntity(armProfLight)
      let data = duplicate(item.data);
      delete data._id;
      itemsToAdd.push(data);
    }
    if (data.traits.armorProf.value.indexOf("med") !== -1) {
      let item = await pack.getEntity(armProfMed)
      let data = duplicate(item.data);
      delete data._id;
      itemsToAdd.push(data);
    }
    if (data.traits.armorProf.value.indexOf("hvy") !== -1) {
      let item = await pack.getEntity(armProfHeavy)
      let data = duplicate(item.data);
      delete data._id;
      itemsToAdd.push(data);
    }
    updateData["data.traits.armorProf.value"] = [];
  }

}


const _migrateActorRace = function(actor, updateData) {
  // if (!(actor instanceof Actor)) return;
  // if (actor.race == null) return;
  //
  // if (item.type === "race") {
  //   actor.race.update(item);
  //   return false;
  // }
}


const _migrateActorDefenseNotes = function(ent, updateData) {
  const arr = ["attributes.acNotes", "attributes.cmdNotes", "attributes.srNotes"];
  for (let k of arr) {
    const value = getProperty(ent.data.data, k);
    if (value == null) {
      updateData["data."+k] = "";
    }
  }
};

const _migrateActorSpeed = function(ent, updateData) {
  const arr = ["attributes.speed.land", "attributes.speed.climb", "attributes.speed.swim", "attributes.speed.fly", "attributes.speed.burrow"];
  for (let k of arr) {
    let value = getProperty(ent.data.data, k);
    if (typeof value === "string") value = parseInt(value);
    if (typeof value === "number") {
      updateData[`data.${k}.base`] = value;
      updateData[`data.${k}.total`] = value;
    }
    else if (value == null) {
      updateData[`data.${k}.base`] = 0;
      updateData[`data.${k}.total`] = null;
    }

    // Add maneuverability
    if (k === "attributes.speed.fly" && getProperty(ent.data.data, `${k}.maneuverability`) === undefined) {
      updateData[`data.${k}.maneuverability`] = "average";
    }
  }
};

const _migrateActorSpellbookSlots = function(ent, updateData) {
  for (let spellbookSlot of Object.keys(getProperty(ent.data.data, "attributes.spells.spellbooks") || {})) {
    if (getProperty(ent.data.data, `attributes.spells.spellbooks.${spellbookSlot}.autoSpellLevels`) == null) {
      updateData[`data.attributes.spells.spellbooks.${spellbookSlot}.autoSpellLevels`] = true;
    }

    for (let a = 0; a < 10; a++) {
      const baseKey = `data.attributes.spells.spellbooks.${spellbookSlot}.spells.spell${a}.base`;
      const maxKey = `data.attributes.spells.spellbooks.${spellbookSlot}.spells.spell${a}.max`;
      const base = getProperty(ent.data, baseKey);
      const max = getProperty(ent.data, maxKey);
      if (base === undefined && typeof max === "number" && max > 0) {
        updateData[baseKey] = max.toString();
      }
      else if (base === undefined) {
        updateData[baseKey] = "";
      }
    }
  }
};

const _migrateActorBaseStats = function(ent, updateData) {
  const keys = ["attributes.hp.base", "attributes.hd.base", "attributes.savingThrows.fort.value",
    "attributes.savingThrows.ref.value", "attributes.savingThrows.will.value"];
  for (let k of keys) {
    if (k === "attributes.hp.base" && !(getProperty(ent, "items") || []).filter(o => o.type === "class").length) continue;
    if (getProperty(ent.data.data, k) != null) {
      let kList = k.split(".");
      kList[kList.length-1] = `-=${kList[kList.length-1]}`;
      updateData[`data.${kList.join(".")}`] = null;
    }
  }

  if (getProperty(ent.data, "data.attributes.conditions.wildshaped") == null) {
    updateData["data.attributes.conditions.wildshaped"] = false;
  }

  if (getProperty(ent.data, "data.attributes.conditions.polymorphed") == null) {
    updateData["data.attributes.conditions.polymorphed"] = false;
  }


};

const _migrateActorCreatureType = function(ent, updateData) {
  if (getProperty(ent.data, "data.attributes.creatureType") == null) {
    updateData["data.attributes.creatureType"] = "humanoid";
  }
};

const _migrateActorSpellbookDCFormula = function(ent, updateData) {
  const spellbooks = Object.keys(getProperty(ent.data, "data.attributes.spells.spellbooks") || {});

  for (let k of spellbooks) {
    const key = `data.attributes.spells.spellbooks.${k}.baseDCFormula`;
    const curFormula = getProperty(ent.data, key);
    if (curFormula == null) updateData[key] = "10 + @sl + @ablMod";
  }
};

const _migrateIcon = function(ent, updateData) {
  const value = getProperty(ent.data, "img");
  if (value.endsWith("/con.png")) updateData["img"] = value.replace("/con.png","/con_.png");
};

const _migrateItemSpellUses = function(ent, updateData) {
  if (getProperty(ent.data.data, "preparation") === undefined) return;

  const value = getProperty(ent.data.data, "preparation.maxAmount");
  if (typeof value !== "number") updateData["data.preparation.maxAmount"] = 0;
};

const _migrateWeaponDamage = function(ent, updateData) {
  if (ent.type !== "weapon") return;

  const value = getProperty(ent.data.data, "weaponData");
  if (typeof value !== "object") {
    updateData["data.weaponData"] = {};
    updateData["data.weaponData.critRange"] = 20;
    updateData["data.weaponData.critMult"] = 2;
  }

  if (getProperty(ent.data, "data.threatRangeExtended") == null) {
    updateData["data.threatRangeExtended"] = false;
  }
  if (getProperty(ent.data, "data.finesseable") == null) {
    updateData["data.finesseable"] = false;
  }
};

const _migrateEnhancement = function(ent, updateData) {
  if (ent.type !== "weapon" || ent.type !== "equipment" ) return;

  const value = getProperty(ent.data.data, "enhancement");
  if (typeof value !== "object") {
    updateData["data.enhancement"] = {};
    updateData["data.enhancement.items"] = [];
    updateData["data.enhancement.uses"] = {
          "value": 0,
          "max": 0,
          "per": null,
          "autoDeductCharges": true,
          "allowMultipleUses": false
    };
  }
};

const _migrateWeaponImprovised = function(ent, updateData) {
  if (ent.type !== "weapon") return;

  const value = getProperty(ent.data.data, "weaponType");
  if (value === "improv") {
    updateData["data.weaponType"] = "misc";
    updateData["data.properties.imp"] = true;
  }
};

const _migrateSpellName = function(ent, updateData) {
  if (ent.type !== "spell") return;
  updateData["name"] = ent.data.name.trim()
}

const _migrateSpellDescription = function(ent, updateData) {
  if (ent.type !== "spell") return;

  const curValue = getProperty(ent.data.data, "shortDescription");
  if (curValue != null) return;

  const obj = getProperty(ent.data.data, "description.value");
  if (typeof obj !== "string") return;
  const html = $(`<div>${obj}</div>`);
  const elem = html.find("h2").next();
  if (elem.length === 1) updateData["data.shortDescription"] = elem.prop("outerHTML");
  else updateData["data.shortDescription"] = html.prop("innerHTML");
};

const _migrateSpellDivineFocus = function(ent, updateData) {
  if (ent.type !== "spell") return;

  const value = getProperty(ent.data.data, "components.divineFocus");
  if (typeof value === "boolean") updateData["data.components.divineFocus"] = (value === true ? 1 : 0);
};

const _migrateItemDC = function(ent, updateData) {
  // const value = getProperty(ent.data.data, "save.type");
  // if (value == null) return;
  // if (value === "") updateData["data.save.description"] = "";
  // else if (value === "fort") updateData["data.save.description"] = "Fortitude partial";
  // else if (value === "ref") updateData["data.save.description"] = "Reflex half";
  // else if (value === "will") updateData["data.save.description"] = "Will negates";
  // updateData["data.save.-=type"] = null;
};

const _migrateClassDynamics = function(ent, updateData) {
  if (ent.type !== "class") return;

  const bab = getProperty(ent.data.data, "bab");
  if (typeof bab === "number") updateData["data.bab"] = "low";

  const stKeys = ["data.savingThrows.fort.value", "data.savingThrows.ref.value", "data.savingThrows.will.value"];
  for (let key of stKeys) {
    let value = getProperty(ent.data, key);
    if (typeof value === "number") updateData[key] = "low";
  }
};

const _migrateClassType = function(ent, updateData) {
  if (ent.type !== "class") return;

  if (getProperty(ent.data.data, "classType") == null) updateData["data.classType"] = "base";


  if (getProperty(ent.data.data, "powersKnown" === null)) {
    let powersKnown = {}
    for (let i = 1; i <= 20; i++) {
      powersKnown[i] = 0;
    }
    updateData["data.powersKnown"] = powersKnown
  }
  if (getProperty(ent.data.data, "powerPointTable" === null)) {
    let powerPointTable = {}
    for (let i = 1; i <= 20; i++) {
      powerPointTable[i] = 0;
    }
    updateData["data.powerPointTable"] = powerPointTable
  }
  if (getProperty(ent.data.data, "powersMaxLevel" === null)) {
    let powersMaxLevel = {}
    for (let i = 1; i <= 20; i++) {
      powersMaxLevel[i] = 0;
    }
    updateData["data.powersMaxLevel"] = powersMaxLevel
  }
};

const _migrateWeaponCategories = function(ent, updateData) {
  if (ent.type !== "weapon") return;

  // Change category
  const type = getProperty(ent.data.data, "weaponType");
  if (type === "misc") {
    updateData["data.weaponType"] = "misc";
    updateData["data.weaponSubtype"] = "other";
  }
  else if (type === "splash") {
    updateData["data.weaponType"] = "misc";
    updateData["data.weaponSubtype"] = "splash";
  }

  const changeProp = (["simple", "martial", "exotic"].includes(type));
  if (changeProp && getProperty(ent.data.data, "weaponSubtype") == null) {
    updateData["data.weaponSubtype"] = "1h";
  }

  // Change light property
  const lgt = getProperty(ent.data.data, "properties.lgt");
  if (lgt != null) {
    updateData["data.properties.-=lgt"] = null;
    if (lgt === true && changeProp) {
      updateData["data.weaponSubtype"] = "light";
    }
  }

  // Change two-handed property
  const two = getProperty(ent.data.data, "properties.two");
  if (two != null) {
    updateData["data.properties.-=two"] = null;
    if (two === true && changeProp) {
      updateData["data.weaponSubtype"] = "2h";
    }
  }

  // Change melee property
  const melee = getProperty(ent.data.data, "weaponData.isMelee");
  if (melee != null) {
    updateData["data.weaponData.-=isMelee"] = null;
    if (melee === false && changeProp) {
      updateData["data.weaponSubtype"] = "ranged";
    }
  }
};

const _migrateEquipmentCategories = function(ent, updateData) {
  if (ent.type !== "equipment") return;

  const oldType = getProperty(ent.data.data, "armor.type");
  if (oldType == null) return;

  if (oldType === "clothing") {
    updateData["data.equipmentType"] = "misc";
    updateData["data.equipmentSubtype"] = "clothing";
  }
  else if (oldType === "shield") {
    updateData["data.equipmentType"] = "shield";
    updateData["data.equipmentSubtype"] = "lightShield";
    updateData["data.slot"] = "shield";
  }
  else if (oldType === "misc") {
    updateData["data.equipmentType"] = "misc";
    updateData["data.equipmentSubtype"] = "wondrous";
  }
  else if (["light", "medium", "heavy"].includes(oldType)) {
    updateData["data.equipmentType"] = "armor";
    updateData["data.equipmentSubtype"] = `${oldType}Armor`;
  }

  updateData["data.armor.-=type"] = null;
};

const _migrateWeaponSize = function(ent, updateData) {
  if (ent.type !== "weapon") return;
  
  if (!getProperty(ent.data, "data.weaponData.size")) {
    updateData["data.weaponData.size"] = "med";
  }
};

const _migrateContainer = function(ent, updateData) {
  if (!getProperty(ent.data, "data.quantity")) return;

  if (!getProperty(ent.data, "data.container")) {
    updateData["data.container"] = "None";
    updateData["data.containerId"] = "none";
    updateData["data.containerWeightless"] = false;
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a string spell casting time like "1 Bonus Action" to separate fields for activation type and numeric cost
 * @private
 */
const _migrateCastTime = function(item, updateData) {
  const value = getProperty(item.data, "time.value");
  if ( !value ) return;
  const ATS = invertObject(CONFIG.D35E.abilityActivationTypes);
  let match = value.match(/([\d]+\s)?([\w\s]+)/);
  if ( !match ) return;
  let type = ATS[match[2]] || "none";
  let cost = match[1] ? Number(match[1]) : 0;
  if ( type === "none" ) cost = 0;
  updateData["data.activation"] = {type, cost};
};

/* -------------------------------------------- */
/*  General Migrations                          */
/* -------------------------------------------- */

/**
 * Migrate from a string based damage formula like "2d6 + 4 + 1d4" and a single string damage type like "slash" to
 * separated damage parts with associated damage type per part.
 * @private
 */
const _migrateDamage = function(item, updateData) {

  // Regular Damage
  let damage = item.data.damage;
  if ( damage && damage.value ) {
    let type = item.data.damageType ? item.data.damageType.value : "";
    const parts = damage.value.split("+").map(s => s.trim()).map(p => [p, type || null]);
    if ( item.type === "weapon" && parts.length ) parts[0][0] += " + @mod";
    updateData["data.damage.parts"] = parts;
    updateData["data.damage.-=value"] = null;
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a string duration field like "1 Minute" to separate fields for duration units and numeric value
 * @private
 */
const _migrateDuration = function(item, updateData) {
  const TIME = invertObject(CONFIG.D35E.timePeriods);
  const dur = item.data.duration;
  if ( dur && dur.value && !dur.units ) {
    let match = dur.value.match(/([\d]+\s)?([\w\s]+)/);
    if ( !match ) return;
    let units = TIME[match[2]] || "inst";
    let value = units === "inst" ? "" : Number(match[1]) || "";
    updateData["data.duration"] = {units, value};
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a string range field like "150 ft." to separate fields for units and numeric distance value
 * @private
 */
const _migrateRange = function(item, updateData) {
  if ( updateData["data.range"] ) return;
  const range = item.data.range;
  if ( range && range.value && !range.units ) {
    let match = range.value.match(/([\d\/]+)?(?:[\s]+)?([\w\s]+)?/);
    if ( !match ) return;
    let units = "none";
    if ( /ft/i.test(match[2]) ) units = "ft";
    else if ( /mi/i.test(match[2]) ) units = "mi";
    else if ( /touch/i.test(match[2]) ) units = "touch";
    updateData["data.range.units"] = units;

    // Range value
    if ( match[1] ) {
      let value = match[1].split("/").map(Number);
      updateData["data.range.value"] = value[0];
      if ( value[1] ) updateData["data.range.long"] = value[1];
    }
  }
};

/* -------------------------------------------- */

const _migrateRarity = function(item, updateData) {
  const rar = item.data.rarity;
  if ( (rar instanceof Object) && !rar.value ) updateData["data.rarity"] = "Common";
  else if ( (typeof rar === "string") && (rar === "") ) updateData["data.rarity"] = "Common";
};

/* -------------------------------------------- */


/**
 * A general migration to remove all fields from the data model which are flagged with a _deprecated tag
 * @private
 */
const _migrateRemoveDeprecated = function(ent, updateData, toFlatten) {
  const flat = flattenObject(ent.data);

  // Deprecate entire objects
  const toDeprecate = Object.entries(flat).filter(e => e[0].endsWith("_deprecated") && (e[1] === true)).map(e => {
    let parent = e[0].split(".");
    parent.pop();
    return parent.join(".");
  });
  for ( let k of toDeprecate ) {
    let parts = k.split(".");
    parts[parts.length-1] = "-=" + parts[parts.length-1];
    updateData[`data.${parts.join(".")}`] = null;
  }

  // Deprecate types and labels
  for ( let [k, v] of Object.entries(flat) ) {
    let parts = k.split(".");
    parts.pop();

    // Skip any fields which have already been touched by other migrations
    if ( toDeprecate.some(f => k.startsWith(f) ) ) continue;
    if ( toFlatten.some(f => k.startsWith(f)) ) continue;
    if ( updateData.hasOwnProperty(`data.${k}`) ) continue;

    // Remove the data type field
    const dtypes = ["Number", "String", "Boolean", "Array", "Object"];
    if ( k.endsWith("type") && dtypes.includes(v) ) {
      updateData[`data.${k.replace(".type", ".-=type")}`] = null;
    }

    // Remove string label
    else if ( k.endsWith("label") ) {
      updateData[`data.${k.replace(".label", ".-=label")}`] = null;
    }
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a target string like "15 ft. Radius" to a more explicit data model with a value, units, and type
 * @private
 */
const _migrateTarget = function(item, updateData) {
  const target = item.data.target;
  if ( target.value && !Number.isNumeric(target.value) ) {

    // Target Type
    let type = null;
    for ( let t of Object.keys(CONFIG.D35E.targetTypes) ) {
      let rgx = new RegExp(t, "i");
      if ( rgx.test(target.value) ) {
        type = t;
        continue;
      }
    }

    // Target Units
    let units = null;
    if ( /ft/i.test(target.value) ) units = "ft";
    else if ( /mi/i.test(target.value) ) units = "mi";
    else if ( /touch/i.test(target.value) ) units = "touch";

    // Target Value
    let value = null;
    let match = target.value.match(/([\d]+)([\w\s]+)?/);
    if ( match ) value = Number(match[1]);
    else if ( /one/i.test(target.value) ) value = 1;
    updateData["data.target"] = {type, units, value};
  }
};

/* -------------------------------------------- */

/**
 * Migrate from string based components like "V,S,M" to boolean flags for each component
 * Move concentration and ritual flags into the components object
 * @private
 */
const _migrateSpellComponents = function(item, updateData) {
  const components = item.data.components;
  if ( !components.value ) return;
  let comps = components.value.toUpperCase().replace(/\s/g, "").split(",");
  updateData["data.components"] = {
    value: "",
    verbal: comps.includes("V"),
    somatic: comps.includes("M"),
    material: comps.includes("S"),
    concentration: item.data.concentration.value === true,
    ritual: item.data.ritual.value === true
  };
};

/* -------------------------------------------- */

/**
 * Migrate from a simple object with save.value to an expanded object where the DC is also configured
 * @private
 */
const _migrateSpellAction = function(item, updateData) {

  // Set default action type for spells
  if ( item.data.spellType ) {
    updateData["data.actionType"] = {
      "attack": "rsak",
      "save": "save",
      "heal": "heal",
      "utility": "util",
    }[item.data.spellType.value] || "util";
  }

  // Spell saving throw
  const save = item.data.save;
  if ( !save.value ) return;
  updateData["data.save"] = {
    ability: save.value,
    dc: null
  };
  updateData["data.save.-=value"] = null;
};

/* -------------------------------------------- */

/**
 * Migrate spell preparation data to the new preparation object
 * @private
 */
const _migrateSpellPreparation = function(item, updateData) {
  const prep = item.data.preparation;
  if ( prep && !prep.mode ) {
    updateData["data.preparation.mode"] = "prepared";
    updateData["data.preparation.prepared"] = item.data.prepared ? Boolean(item.data.prepared.value) : false;
  }
};

/* -------------------------------------------- */

/**
 * Migrate from a string based weapon properties like "Heavy, Two-Handed" to an object of boolean flags
 * @private
 */
const _migrateWeaponProperties = function(item, updateData) {

  // Set default activation mode for weapons
  updateData["data.activation"] = {type: "action", cost: 1};

  // Set default action type for weapons
  updateData["data.actionType"] = {
    "simpleM": "mwak",
    "simpleR": "rwak",
    "martialM": "mwak",
    "martialR": "rwak",
    "natural": "mwak",
    "improv": "mwak",
    "ammo": "rwak"
  }[item.data.weaponType.value] || "mwak";

  // Set default melee weapon range
  if ( updateData["data.actionType"] === "mwak" ) {
    updateData["data.range"] = {
      value: updateData["data.properties.rch"] ? 10 : 5,
      units: "ft"
    }
  }

  // Map weapon property strings to boolean flags
  const props = item.data.properties;
  if ( props.value ) {
    const labels = invertObject(CONFIG.D35E.weaponProperties);
    for (let k of props.value.split(",").map(p => p.trim())) {
      if (labels[k]) updateData[`data.properties.${labels[k]}`] = true;
    }
    updateData["data.properties.-=value"] = null;
  }
};

const migrateTokenStatuses = function (token, updateData) {
  if (!token.actor) return;

  if (token.data.effects.length) {
    var effects = token.data.effects;
    effects = effects.filter((e) => {
      const [key, tex] = Object.entries(CONFIG.D35E.conditionTextures).find((t) => e === t[1]) ?? [];
      if (key && token.actor.data.data.attributes.conditions[key]) return false;
      if (token.actor.items.find((i) => i.type === "buff" && i.data.data.active && i.img === e)) return false;
      return true;
    });
  }
  setProperty(updateData, "effects", effects);
};

