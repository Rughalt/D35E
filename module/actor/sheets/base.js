import { ActorTraitSelector } from "../../apps/trait-selector.js";
import { ActorRestDialog } from "../../apps/actor-rest.js";
import { LevelUpDialog } from "../../apps/level-up-box.js";
import { LevelUpDataDialog } from "../../apps/level-up-data.js";
import { ActorSheetFlags } from "../../apps/actor-flags.js";
import { DicePF } from "../../dice.js";
import { createTag, createTabs, isMinimumCoreVersion } from "../../lib.js";
import { NoteEditor } from "../../apps/note-editor.js";
import {SpellbookEditor} from "../../apps/spellbook-editor.js";
import {D35E} from "../../config.js";
import {PointBuyCalculator} from "../../apps/point-buy-calculator.js";
import {ItemPF} from "../../item/entity.js";

/**
 * Extend the basic ActorSheet class to do all the PF things!
 * This sheet is an Abstract layer which is not used.
 *
 * @type {ActorSheet}
 */
export class ActorSheetPF extends ActorSheet {
  constructor(...args) {
    super(...args);

    this.options.submitOnClose = false;

    /**
     * The scroll position on the active tab
     * @type {number}
     */
    this._scrollTab = {};
    this._initialTab = {};

    /**
     * Track the set of item filters which are applied
     * @type {Set}
     */
    this._filters = {
      inventory: new Set(),
      spellbook: new Set(),
      features: new Set(),
      buffs: new Set()
    };

    /**
     * Track item updates from the actor sheet.
     * @type {Object[]}
     */
    this._itemUpdates = [];


  }

  get currentSpellbookKey() {
    const elems = this.element.find("nav.spellbooks .item.active");
    if (elems.length !== 1) return Object.keys(getProperty(this.data, "data.attributes.spells.spellbook") || { "primary": null })[0];
    return elems.attr("data-tab");
  }

  /* -------------------------------------------- */

  /**
   * Add some extra data when rendering the sheet to reduce the amount of logic required within the template.
   */
  getData() {
    // Basic data
    let isOwner = this.entity.owner;
    const data = {
      owner: isOwner,
      limited: this.entity.limited,
      options: this.options,
      editable: this.isEditable,
      cssClass: isOwner ? "editable" : "locked",
      isCharacter: this.entity.data.type === "character",
      hasRace: false,
      config: CONFIG.D35E,
      useBGSkills: this.entity.data.type === "character" && game.settings.get("D35E", "allowBackgroundSkills"),
      spellFailure: this.entity.spellFailure,
      isGM: game.user.isGM,
      race: this.entity.race != null ? duplicate(this.entity.race.data) : null,

    };

    // The Actor and its Items
    data.actor = duplicate(this.actor.data);
    data.items = this.actor.items.map(i => {
      i.data.labels = i.labels;
      i.data.id = i._id;
      i.data.hasAttack = i.hasAttack;
      i.data.hasMultiAttack = i.hasMultiAttack;
      i.data.containerId = getProperty(i.data, "data.containerId");
      i.data.hasDamage = i.hasDamage;
      i.data.hasEffect = i.hasEffect;
      i.data.container = getProperty(i.data, "data.container");
      i.data.hasAction = i.hasAction || i.isCharged;
      i.data.timelineLeftText = i.getTimelineTimeLeftDescriptive();
      i.data.showUnidentifiedData = i.showUnidentifiedData;
      if (i.showUnidentifiedData) i.data.name = getProperty(i.data, "data.unidentified.name") || getProperty(i.data, "data.identifiedName") || i.data.name;
      else i.data.name = getProperty(i.data, "data.identifiedName") || i.data.name;
      return i.data;
    });
    data.items.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    data.data = data.actor.data;
    data.labels = this.actor.labels || {};
    data.filters = this._filters;

    // Hit point sources
    if (this.actor.sourceDetails != null) data.sourceDetails = expandObject(this.actor.sourceDetails);
    else data.sourceDetails = null;

    // Ability Scores

    data.abilitiesChanged = false;

    for ( let [a, abl] of Object.entries(data.actor.data.abilities)) {
      abl.label = CONFIG.D35E.abilitiesShort[a];
      abl.tempvalue = data.actor.data.abilities[a].total;
      if (data.actor.data.abilities[a].value !== 10)
        data.abilitiesChanged = true
      abl.sourceDetails = data.sourceDetails != null ? data.sourceDetails.data.abilities[a].total : [];
    }



    // Armor Class
    for (let [a, ac] of Object.entries(data.actor.data.attributes.ac)) {
      ac.label = CONFIG.D35E.ac[a];
      ac.labelShort = CONFIG.D35E.acShort[a];
      ac.valueLabel = CONFIG.D35E.acValueLabels[a];
      ac.sourceDetails = data.sourceDetails != null ? data.sourceDetails.data.attributes.ac[a].total : [];
    }

    // Saving Throws
    for (let [a, savingThrow] of Object.entries(data.actor.data.attributes.savingThrows)) {
      savingThrow.label = CONFIG.D35E.savingThrows[a];
      savingThrow.sourceDetails = data.sourceDetails != null ? data.sourceDetails.data.attributes.savingThrows[a].total : [];
    }

    // Update skill labels
    for ( let [s, skl] of Object.entries(data.actor.data.skills)) {
      skl.label = CONFIG.D35E.skills[s];
      skl.arbitrary = CONFIG.D35E.arbitrarySkills.includes(s);
      skl.sourceDetails = (data.sourceDetails != null && data.sourceDetails.data.skills[s] != null) ? data.sourceDetails.data.skills[s].changeBonus : [];
      if (skl.subSkills != null) {
        for (let [s2, skl2] of Object.entries(skl.subSkills)) {
          if (data.sourceDetails == null) continue;
          if (data.sourceDetails.data.skills[s] == null) continue;
          if (data.sourceDetails.data.skills[s].subSkills == null) continue;
          skl2.sourceDetails = data.sourceDetails.data.skills[s].subSkills[s2] != null ? data.sourceDetails.data.skills[s].subSkills[s2].changeBonus : [];
        }
      }
    }

    // Update spellbook info
    for (let spellbook of Object.values(data.actor.data.attributes.spells.spellbooks)) {
      const cl = spellbook.cl.total;
      spellbook.range = {
        close: 25 + 5 * Math.floor(cl / 2),
        medium: 100 + 10 * cl,
        long: 400 + 40 * cl
      };
    }

    // Control items
    data.items.filter(obj => { return obj.type === "spell"; })
    .forEach(obj => {
      obj.isPrepared = obj.data.preparation.mode === "prepared";
    });

    data.isShapechanged = false;
    data.items.filter(obj => { return obj.type === "buff" && obj.data.buffType === "shapechange"; })
        .forEach(obj => {
          if (obj.data.active) {
            data.isShapechanged = true;
            data.shapechangeName = obj.name;
          }
        });
    data.items.filter(obj => { return obj.type === "buff" && obj.data.buffType === "shapechange"; })
        .forEach(obj => {
          obj.canToggleShapechange = !data.isShapechanged || (data.isShapechanged && obj.data.active)
        });
    // Update traits
    this._prepareTraits(data.actor.data.traits);

    // Prepare owned items
    this._prepareItems(data);

    let classNamesAndLevels = []

    data.items.filter(i => i.type == "class").forEach(c => classNamesAndLevels.push(c.name + " " + c.data.levels))

    data.classList = classNamesAndLevels.join(", ")

    // Compute encumbrance
    data.encumbrance = this._computeEncumbrance(data);

    // Prepare skillsets
    data.skillsets = this._prepareSkillsets(data.actor.data.skills);

    // Skill rank counting
    const skillRanks = { allowed: 0, used: 0, bgAllowed: 0, bgUsed: 0, sentToBG: 0 };
    // Count used skill ranks
    for (let skl of Object.values(this.actor.data.data.skills)) {
      if (skl.subSkills != null) {
        for (let subSkl of Object.values(skl.subSkills)) {
          if (data.useBGSkills && skl.background) {
            skillRanks.bgUsed += subSkl.rank;
          }
          else {
            skillRanks.used += subSkl.rank;
          }
        }
      }
      else if (data.useBGSkills && skl.background) {
        skillRanks.bgUsed += skl.rank;
      }
      else {
        skillRanks.used += skl.rank;
      }
    }
    // Count allowed skill ranks
    let firstOnList = true;
    this.actor.data.items.filter(obj => { return obj.type === "class"; }).forEach(cls => {
      const clsLevel = cls.data.levels;
      const clsSkillsPerLevel = cls.data.skillsPerLevel;
      const fcSkills = cls.data.fc.skill.value;
      if (clsLevel > 0) {
        if (firstOnList) {
          skillRanks.allowed += (Math.max(((clsLevel - 1) + 4 ) , (((this.actor.data.data.abilities.int.mod + clsSkillsPerLevel) * 3) + ((this.actor.data.data.abilities.int.mod + clsSkillsPerLevel) * clsLevel)) + fcSkills));
          firstOnList = false;
        } else {
          skillRanks.allowed += (((this.actor.data.data.abilities.int.mod + clsSkillsPerLevel) * clsLevel));
        }
      }
      if (data.useBGSkills) skillRanks.bgAllowed = this.actor.data.data.details.level.value * 2;
    });
    if (this.actor.data.data.details.bonusSkillRankFormula !== "") {
      let roll = new Roll(
        this.actor.data.data.details.bonusSkillRankFormula,
        duplicate(this.actor.data.data)
      ).roll();
      skillRanks.allowed += roll.total;
    }
    // Calculate used background skills
    if (data.useBGSkills) {
      if (skillRanks.bgUsed > skillRanks.bgAllowed) {
        skillRanks.sentToBG = (skillRanks.bgUsed - skillRanks.bgAllowed);
        skillRanks.allowed -= skillRanks.sentToBG;
        skillRanks.bgAllowed += skillRanks.sentToBG;
      }
    }
    data.skillRanks = skillRanks;
    let sizeMod = CONFIG.D35E.sizeMods[this.actor.data.data.traits.size] || 0
    data.attackBonuses = { melee: this.actor.data.data.attributes.bab.total + this.actor.data.data.abilities.str.mod + sizeMod, ranged: this.actor.data.data.attributes.bab.total + this.actor.data.data.abilities.dex.mod + sizeMod}

    // Fetch the game settings relevant to sheet rendering.
    data.healthConfig =  game.settings.get("D35E", "healthConfig");

    // Return data to the sheet
    return data
  }

  /* -------------------------------------------- */

  _prepareTraits(traits) {
    const map = {
      // "dr": CONFIG.D35E.damageTypes,
      "di": CONFIG.D35E.damageTypes,
      "dv": CONFIG.D35E.damageTypes,
      "ci": CONFIG.D35E.conditionTypes,
      "languages": CONFIG.D35E.languages,
      "armorProf": CONFIG.D35E.armorProficiencies,
      "weaponProf": CONFIG.D35E.weaponProficiencies
    };
    for ( let [t, choices] of Object.entries(map) ) {
      const trait = traits[t];
      if ( !trait ) continue;
      let values = [];
      if ( trait.value ) {
        values = trait.value instanceof Array ? trait.value : [trait.value];
      }
      trait.selected = values.reduce((obj, t) => {
        obj[t] = choices[t];
        return obj;
      }, {});

      // Add custom entry
      if ( trait.custom ) {
        trait.custom.split(CONFIG.D35E.re.traitSeparator).forEach((c, i) => trait.selected[`custom${i+1}`] = c.trim());
      }
      trait.cssClass = !isObjectEmpty(trait.selected) ? "" : "inactive";
    }
  }

  /* -------------------------------------------- */

  /**
   * Insert a spell into the spellbook object when rendering the character sheet
   * @param {Object} data     The Actor data being prepared
   * @param {Array} spells    The spell data being prepared
   * @param {String} bookKey  The key of the spellbook being prepared
   * @private
   */
  _prepareSpellbook(data, spells, bookKey) {
    const owner = this.actor.owner;
    const book = this.actor.data.data.attributes.spells.spellbooks[bookKey];

    // Reduce spells to the nested spellbook structure
    let spellbook = {};
    for (let a = 0; a < 10; a++) {
      spellbook[a] = {
        level: a,
        usesSlots: true,
        spontaneous: book.spontaneous,
        usePowerPoints: book.usePowerPoints,
        powerPoints: book.powerPoints,
        canCreate: owner === true,
        canPrepare: (data.actor.type === "character"),
        label: CONFIG.D35E.spellLevels[a],
        slotsLeft: false,
        spells: [],
        maxPrestigeClSources: (data.sourceDetails !== null && data.sourceDetails.data.attributes.prestigeCl !== undefined && data.sourceDetails.data.attributes.prestigeCl[book.spellcastingType] !== undefined
            && data.sourceDetails.data.attributes.prestigeCl[book.spellcastingType].max != null) ? data.sourceDetails.data.attributes.prestigeCl[book.spellcastingType].max : [],
        uses: book.spells === undefined ? 0 : book.spells["spell"+a].value || 0,
        baseSlots: book.spells === undefined ? 0 : book.spells["spell"+a].base,
        slots: book.spells === undefined ? 0 : book.spells["spell"+a].max || 0,
        dataset: { type: "spell", level: a, spellbook: bookKey },
      };
    }
    spells.forEach(spell => {
      const lvl = spell.data.level || 0;
      spellbook[lvl].spells.push(spell);
    });


    for (let a = 0; a < 10; a++) {
      spellbook[a].slotsLeft = spellbook[a].spells.map(item => item.data.preparation.maxAmount || 0).reduce((prev, next) => prev + next, 0) < spellbook[a].slots
    }



    // Sort the spellbook by section order
    spellbook = Object.values(spellbook);
    spellbook.sort((a, b) => a.level - b.level);
    return spellbook;
  }

  _prepareSkillsets(skillset) {
    let result = {
      all: { skills: {} },
      adventure: { skills: {} },
      background: { skills: {} },
      known: { skills: {} }
    };

    // sort skills by label
    let keys = Object.keys(skillset).sort(function(a,b) {
      if (skillset[a].custom && !skillset[b].custom) return 1;
      if (!skillset[a].custom && skillset[b].custom) return -1;
      return ('' + skillset[a].label).localeCompare(skillset[b].label)
    });

    keys.forEach( a => {
      let skl = skillset[a]
      result.all.skills[a] = skl;
      if (skl.rank > 0) result.known.skills[a] = skl;
      else if (skl.subSkills !== undefined) {
        result.known.skills[a] = skl;
      }
      if (skl.background) result.background.skills[a] = skl;
      else result.adventure.skills[a] = skl;
    })

    return result;
  }

  /* -------------------------------------------- */

  /**
   * Determine whether an Owned Item will be shown based on the current set of filters
   * @return {boolean}
   * @private
   */
  _filterItems(items, filters) {
    return items.filter(item => {
      const data = item.data;

      // Action usage
      for ( let f of ["action", "bonus", "reaction"] ) {
        if ( filters.has(f) ) {
          if ((data.activation && (data.activation.type !== f))) return false;
        }
      }

      if ( filters.has("prepared") ) {
        if ( data.level === 0 || ["pact", "innate"].includes(data.preparation.mode) ) return true;
        if ( this.actor.data.type === "npc" ) return true;
        return data.preparation.prepared;
      }

      // Equipment-specific filters
      if ( filters.has("equipped") ) {
        if (data.equipped && data.equipped !== true) return false;
      }

      // Whether active
      if (filters.has("active")) {
        if (!data.active) return false;
      }

      return true;
    });
  }

  /* -------------------------------------------- */

  /**
   * Get the font-awesome icon used to display a certain level of skill proficiency
   * @private
   */
  _getProficiencyIcon(level) {
    const icons = {
      0: '<i class="far fa-circle"></i>',
      0.5: '<i class="fas fa-adjust"></i>',
      1: '<i class="fas fa-check"></i>',
      2: '<i class="fas fa-check-double"></i>'
    };
    return icons[level];
  }

  /* -------------------------------------------- */

  /**
   * Compute the level and percentage of encumbrance for an Actor.
   *
   * @param {Object} actorData      The data object for the Actor being rendered
   * @return {Object}               An object describing the character's encumbrance level
   * @private
   */
  _computeEncumbrance(actorData) {
    const carriedWeight = actorData.data.attributes.encumbrance.carriedWeight;
    const load = {
      light: actorData.data.attributes.encumbrance.levels.light,
      medium: actorData.data.attributes.encumbrance.levels.medium,
      heavy: actorData.data.attributes.encumbrance.levels.heavy
    };
    const carryLabel = game.settings.get("D35E", "units") === "metric" ? game.i18n.localize("D35E.CarryLabelKg").format(carriedWeight) : game.i18n.localize("D35E.CarryLabel").format(carriedWeight);
    const enc = {
      pct: {
        light: Math.max(0, Math.min(carriedWeight * 100 / load.light, 99.5)),
        medium: Math.max(0, Math.min((carriedWeight - load.light) * 100 / (load.medium - load.light), 99.5)),
        heavy: Math.max(0, Math.min((carriedWeight - load.medium) * 100 / (load.heavy - load.medium), 99.5)),
      },
      encumbered: {
        light: actorData.data.attributes.encumbrance.level >= 1,
        medium: actorData.data.attributes.encumbrance.level >= 2,
        heavy: actorData.data.attributes.encumbrance.carriedWeight >= actorData.data.attributes.encumbrance.levels.heavy,
      },
      light: actorData.data.attributes.encumbrance.levels.light,
      medium: actorData.data.attributes.encumbrance.levels.medium,
      heavy: actorData.data.attributes.encumbrance.levels.heavy,
      value: actorData.data.attributes.encumbrance.carriedWeight,
      carryLabel: carryLabel,
    };

    return enc;
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers
  /* -------------------------------------------- */

  /**
   * Activate event listeners using the prepared sheet HTML
   * @param html {HTML}   The prepared HTML object ready to be rendered into the DOM
   */
  activateListeners(html) {
    super.activateListeners(html);

    this.createTabs(html);

    // Tooltips
    html.mousemove(ev => this._moveTooltips(ev));

    // Activate Item Filters
    const filterLists = html.find(".filter-list");
    filterLists.each(this._initializeFilterItemList.bind(this));
    filterLists.on("click", ".filter-item", this._onToggleFilter.bind(this));

    // Item summaries
    html.find('.item .item-name h4').click(event => this._onItemSummary(event));

    // Item Dragging
    let handler = ev => this._onDragItemStart(ev);
    html.find('li.item').each((i, li) => {
      if ( li.classList.contains("inventory-header") ) return;
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Trigger form submission from textarea elements.
    html.find("textarea").change(this._onSubmit.bind(this));

    /* -------------------------------------------- */
    /*  Abilities, Skills, Defenses and Traits
    /* -------------------------------------------- */

    // Ability Checks
    html.find('.ability-name').click(this._onRollAbilityTest.bind(this));

    // BAB Check
    html.find(".attribute.bab .attribute-name").click(this._onRollBAB.bind(this));

    html.find(".attribute.melee-bab .attribute-name").click(this._onRollSimpleMelee.bind(this));
    html.find(".attribute.ranged-bab .attribute-name").click(this._onRollSimpleRanged.bind(this));

    // CMB Check
    html.find(".attribute.cmb .attribute-name").click(this._onRollCMB.bind(this));

    // Initiative Check
    html.find(".attribute.initiative .attribute-name").click(this._onRollInitiative.bind(this));

    // Saving Throw
    html.find(".saving-throw .attribute-name").click(this._onRollSavingThrow.bind(this));

    // Add arbitrary skill
    html.find(".skill.arbitrary .skill-create").click(ev => this._onArbitrarySkillCreate(ev));

    // Delete arbitrary skill
    html.find(".sub-skill > .skill-controls > .skill-delete").click(ev => this._onArbitrarySkillDelete(ev));

    // Add custom skill
    html.find(".skill-controls.skills .skill-create").click(ev => this._onSkillCreate(ev));

    // Delete custom skill
    html.find(".skill > .skill-controls > .skill-delete").click(ev => this._onSkillDelete(ev));

    // Quick Item Action control
    html.find(".item-actions a").mouseup(ev => this._quickItemActionControl(ev));


    // Roll Skill Checks
    html.find(".skill > .skill-name > .rollable").click(this._onRollSkillCheck.bind(this));
    html.find(".sub-skill > .skill-name > .rollable").click(this._onRollSubSkillCheck.bind(this));

    // Trait Selector
    html.find('.trait-selector').click(this._onTraitSelector.bind(this));

    // Configure Special Flags
    html.find('.configure-flags').click(this._onConfigureFlags.bind(this));

    // Roll defenses
    html.find(".defense-rolls .generic-defenses .rollable").click(ev => { this.actor.rollDefenses(); });


    html.find(".turnUndeadHdTotal .rollable").click(ev => { this.actor.rollTurnUndead(); });

    // Rest
    html.find(".rest").click(this._onRest.bind(this));

    // Level up
    html.find(".level-up").click(this._onLevelUp.bind(this));
    html.find(".point-buy").click(this._onPointBuy.bind(this));


    html.find(".note-editor").click(this._onNoteEditor.bind(this));
    html.find(".configure-spellbook").click(this._onSpellbookEditor.bind(this));
    html.find(".configure-level-up-data").click(this._onLevelDataUp.bind(this));
    /* -------------------------------------------- */
    /*  Inventory
    /* -------------------------------------------- */

    // Owned Item management
    html.find('.item-create').click(ev => this._onItemCreate(ev));
    html.find('.item-edit').click(this._onItemEdit.bind(this));
    html.find('.item-delete').click(this._onItemDelete.bind(this));


    html.find('.spell-add-uses').click(ev => this._onSpellAddUses(ev));
    html.find('.spell-remove-uses').click(this._onSpellRemoveUses.bind(this));
    html.find('.spell-add-metamagic').click(this._onSpellAddMetamagic.bind(this));


    // Item Rolling
    html.find('.item .item-image').click(event => this._onItemRoll(event));
    html.find('.item .item-enh-image').click(event => this._onEnhRoll(event));


    html.find(".item .feat-group-selector").change(ev => { this._onFeatChangeGroup(ev) });

    // Quick add item quantity
    html.find("a.item-control.item-quantity-add").click(ev => { this._quickChangeItemQuantity(ev, 1); });
    // Quick subtract item quantity
    html.find("a.item-control.item-quantity-subtract").click(ev => { this._quickChangeItemQuantity(ev, -1); });

    // Quick (un)equip item
    html.find("a.item-control.item-equip").click(ev => { this._quickEquipItem(ev); });

    // Quick carry item
    html.find("a.item-control.item-carry").click(ev => { this._quickCarryItem(ev); });

    // Quick (un)identify item
    html.find("a.item-control.item-identify").click(ev => { this._quickIdentifyItem(ev); });


    html.find("a.random-hp-roll").click(ev => { this._rollRandomHitDie(ev); });


    /* -------------------------------------------- */
    /*  Master/Minion
    /* -------------------------------------------- */

    html.find('a.unbind-master').click(event => this._onMasterUnbind(event));

    /* -------------------------------------------- */
    /*  Feats
    /* -------------------------------------------- */

    html.find(".item-detail.item-uses input[type='text']:not(:disabled)").off("change").change(this._setFeatUses.bind(this));

    /* -------------------------------------------- */
    /*  Spells
    /* -------------------------------------------- */

    html.find(".item-list .spell-uses input[type='text'][data-type='amount']").off("change").change(this._setSpellUses.bind(this));
    html.find(".item-list .spell-uses input[type='text'][data-type='max']").off("change").change(this._setMaxSpellUses.bind(this));

    html.find(".spellcasting-concentration .rollable").click(this._onRollConcentration.bind(this));

    html.find(".spellcasting-cl .rollable").click(this._onRollCL.bind(this));

    /* -------------------------------------------- */
    /*  Buffs
    /* -------------------------------------------- */

    html.find(".item-detail.item-active input[type='checkbox']").off("change").change(this._setItemActive.bind(this));

    html.find(".item-detail.item-level input[type='text']").off("change").change(this._setBuffLevel.bind(this));

    /*
        Race
     */

    // Race controls
    html.find(".race-container .item-control").click(this._onRaceControl.bind(this));


    // Open Compendium packs
    html.find(".open-compendium-pack").click(ev => this._openCompendiumPack(ev));


    html.find(".warning").click(ev => this._openClassTab());


    // Quick add item quantity
    html.find("a.remove-prestige-cl").click(ev => { this._changeSpellbokPrestigeCl(ev, -1); });
    html.find("a.add-prestige-cl").click(ev => { this._changeSpellbokPrestigeCl(ev, 1); });
  }

  createTabs(html) {
    const tabGroups = {
      "primary": {
        "inventory": {},
        "feats": {},
        "skillset": {},
        "buffs": {},
        "attacks": {},
        "spellbooks": {},
      },
    };
    // Add spellbooks to tabGroups
    for (let a of Object.keys(this.actor.data.data.attributes.spells.spellbooks)) {
      tabGroups["primary"]["spellbooks"][`spells_${a}`] = {};
    }
    createTabs.call(this, html, tabGroups);
  }


  _rollRandomHitDie(event) {
    this.actor.data.items.filter(obj => { return obj.type === "class" }).forEach(item => {
      let hd = item['data']['hd']
      let hp = 0;
      let levels = item['data']['levels'];
      for (let i = 0; i < levels; i++) {
        hp += this.getRandomInt(1,hd);
      }
      this.setItemUpdate(item._id, "data.hp", hp);
    });
  }

  getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /* -------------------------------------------- */

  _moveTooltips(event) {
    $(event.currentTarget).find(".tooltip:hover .tooltipcontent").css("left", `${event.clientX}px`).css("top", `${event.clientY + 24}px`);
  }

  /**
   * Initialize Item list filters by activating the set of filters which are currently applied
   * @private
   */
  _initializeFilterItemList(i, ul) {
    const set = this._filters[ul.dataset.filter];
    const filters = ul.querySelectorAll(".filter-item");
    for ( let li of filters ) {
      if ( set.has(li.dataset.filter) ) li.classList.add("active");
    }
  }

  /* -------------------------------------------- */
  /*  Event Listeners and Handlers                */
  /* -------------------------------------------- */

  /**
   * Handle click events for the Traits tab button to configure special Character Flags
   */
  _onConfigureFlags(event) {
    event.preventDefault();
    new ActorSheetFlags(this.actor).render(true);
  }

  _onRest(event) {
    event.preventDefault();
    new ActorRestDialog(this.actor).render(true);
  }

  _onPointBuy(event) {
    event.preventDefault();
    new PointBuyCalculator(this).render(true);
  }

  _onLevelUp(event) {
    event.preventDefault();
    new LevelUpDialog(this.actor).render(true);
  }



  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onItemRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);

    return item.roll();
  }

  _setFeatUses(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);

    const value = Number(event.currentTarget.value);
    const updateData = {};
    this.setItemUpdate(item._id, "data.uses.value", value);
  }

  _setSpellUses(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);

    const value = Number(event.currentTarget.value);
    this.setItemUpdate(item._id, "data.preparation.preparedAmount", value);
  }
  _setMaxSpellUses(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);

    const value = Number(event.currentTarget.value);
    this.setItemUpdate(item._id, "data.preparation.maxAmount", value);
  }

  _setBuffLevel(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);

    const value = Number(event.currentTarget.value);
    this.setItemUpdate(item._id, "data.level", value);
  }

  _onRollConcentration(event) {
    event.preventDefault();

    const spellbookKey = $(event.currentTarget).closest(".spellbook-group").data("tab");
    const spellbook = this.actor.data.data.attributes.spells.spellbooks[spellbookKey];
    const rollData = duplicate(this.actor.data.data);
    rollData.cl = spellbook.cl.total;

    // Add contextual concentration string
    let notes = [];
    if (spellbook.concentrationNotes.length > 0) {
      if (!isMinimumCoreVersion("0.5.2")) {
        let noteStr = DicePF.messageRoll({
          data: rollData,
          msgStr: spellbook.concentrationNotes
        });
        notes.push(...noteStr.split(/[\n\r]+/));
      }
      else notes.push(...spellbook.concentrationNotes.split(/[\n\r]+/));
    }

    let props = [];
    if (notes.length > 0) props.push({ header: game.i18n.localize("D35E.Notes"), value: notes });
    let formulaRoll = {}
    try {
      formulaRoll = new Roll(spellbook.concentrationFormula, rollData).roll();
    } catch (e) {
      formulaRoll = {total: 0}
    }
    return DicePF.d20Roll({
      event: event,
      parts: ["@concentrationBonus + @formulaBonus"],
      data: {
        concentrationBonus: this.actor.data.data.skills["coc"].mod, // This is standard concentration skill
        formulaBonus: formulaRoll.total
      },
      title: game.i18n.localize("D35E.ConcentrationCheck"),
      speaker: ChatMessage.getSpeaker({actor: this}),
      takeTwenty: false,
      chatTemplate: "systems/D35E/templates/chat/roll-ext.html",
      chatTemplateData: { hasProperties: props.length > 0, properties: props }
    });
  }

  _onRollCL(event) {
    event.preventDefault();

    const spellbookKey = $(event.currentTarget).closest(".spellbook-group").data("tab");
    const spellbook = this.actor.data.data.attributes.spells.spellbooks[spellbookKey];
    const rollData = duplicate(this.actor.data.data);

    // Add contextual caster level string
    let notes = [];
    if (spellbook.clNotes.length > 0) {
      if (!isMinimumCoreVersion("0.5.2")) {
        let noteStr = DicePF.messageRoll({
          data: rollData,
          msgStr: spellbook.clNotes
        });
        notes.push(...noteStr.split(/[\n\r]+/));
      }
      else notes.push(...spellbook.clNotes.split(/[\n\r]+/));
    }

    let props = [];
    if (notes.length > 0) props.push({ header: game.i18n.localize("D35E.Notes"), value: notes });
    return DicePF.d20Roll({
      event: event,
      parts: [`@cl`],
      data: { cl: spellbook.cl.total },
      title: game.i18n.localize("D35E.CasterLevelCheck"),
      speaker: ChatMessage.getSpeaker({actor: this}),
      takeTwenty: false,
      chatTemplate: "systems/D35E/templates/chat/roll-ext.html",
      chatTemplateData: { hasProperties: props.length > 0, properties: props }
    });
  }

  async _setItemActive(event) {
    event.preventDefault();
    if (this.actor.isToken) {
      $(`#actor-${this.actor._id}-${this.actor.token.id}`).addClass('isWorking');
    } else {
      $(`#actor-${this.actor._id}`).addClass('isWorking');
    }
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);

    const value = $(event.currentTarget).prop("checked");
    const updateData = {};
    updateData["data.active"] = value;
    if (item.hasPerm(game.user, "OWNER"))
    {
      await item.update(updateData);
    }

    if (this.actor.isToken) {
      $(`#actor-${this.actor._id}-${this.actor.token.id}`).removeClass('isWorking');
    } else {
      $(`#actor-${this.actor._id}`).removeClass('isWorking');
    }

  }

  /* -------------------------------------------- */

  /**
   * Handle attempting to recharge an item usage by rolling a recharge check
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemRecharge(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);
    return item.rollRecharge();
  };


  /* -------------------------------------------- */

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).closest(".item"),
        item = this.actor.getOwnedItem(li.attr("data-item-id")),
        chatData = item.getChatData({secrets: this.actor.owner});

    // Toggle summary
    if ( li.hasClass("expanded") ) {
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      let subElements = $(`<ul class="item-enh-list"></ul>`);
      let props = $(`<div class="item-properties"></div>`);
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      console.log('D35E | Enchancement item data',getProperty(item.data, `data.enhancements.items`) || [] );
      (getProperty(item.data, `data.enhancements.items`) || []).forEach(_enh => {
        let enh = new ItemPF(_enh, {owner: this.owner})
        if (enh.hasAction) {
          let enhString = `<li class="item enh-item item-box flexrow" data-item-id="${item._id}" data-enh-id="${enh._id}">
                    <div class="item-name  flexrow">
                        <div class="item-image item-enh-image" style="background-image: url('${enh.img}')"></div>
                        <h4 class="rollable{{#if item.incorrect}} strikethrough-text{{/if}}">
                            ${enh.name} <em style="opacity: 0.7">${enh.data.data.uses.per}</em>
                        </h4>
                    </div>
                    <div class="item-detail item-actions">
                        <div class="item-attack">
                            <a class="item-control item-enh-attack"><img class="icon"
                                                                     src="systems/D35E/icons/actions/gladius.svg"></a>
                        </div>
                    </div>`+ (enh.isCharged ? `
                    <div class="item-detail item-uses flexrow {{#if item.isCharged}}tooltip{{/if}}">
                        <input type="text" class="uses" disabled value="${enh.data.data.uses.value}" data-dtype="Number"/>
                        <span class="sep"> of </span>
                        <input type="text" class="maxuses" disabled value="${enh.data.data.uses.max}" data-dtype="Number"/>
                    </div>
                    <div class="item-detail item-per-use flexrow {{#if item.isCharged}}tooltip{{/if}}"  style="flex: 0 48px">
                        <input type="text" disabled value="${enh.data.data.uses.chargesPerUse}" data-dtype="Number"/>
                    </div>

                </li>` : `</li>`)
          subElements.append(enhString)
        }
      })
      div.append(subElements);
      div.append(props);

      div.find(".item-enh-attack").mouseup(ev => this._quickItemEnhActionControl(ev));
      div.find(".item-enh-image").mouseup(ev => this._onEnhRoll(ev));
      li.append(div.hide());
      div.slideDown(200);

    }
    li.toggleClass("expanded");
  }

  async _quickItemEnhActionControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const itemId = $(event.currentTarget).parents(".enh-item").attr("data-item-id");
    const enhId = $(event.currentTarget).parents(".enh-item").attr("data-enh-id");
    const item = this.actor.getOwnedItem(itemId);

    // Quick Attack
    if (a.classList.contains("item-enh-attack")) {
      item.useEnhancementItem(item.getEnhancementItem(enhId));
    }
  }


  _onEnhRoll(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).parents(".enh-item").attr("data-item-id");
    const enhId = $(event.currentTarget).parents(".enh-item").attr("data-enh-id");
    const item = this.actor.getOwnedItem(itemId);
    let enh = item.getEnhancementItem(enhId);
    return enh.roll({}, this.actor);
  }

  /* -------------------------------------------- */

  _onMasterUnbind(event) {
    event.preventDefault();
    this.actor._setMaster(null);
  }

  /* -------------------------------------------- */

  _onArbitrarySkillCreate(event) {
    event.preventDefault();
    const skillId = $(event.currentTarget).parents(".skill").attr("data-skill");
    const mainSkillData = this.actor.data.data.skills[skillId];
    const skillData = {
      name: "",
      ability: mainSkillData.ability,
      rank: 0,
      notes: "",
      mod: 0,
      rt: mainSkillData.rt,
      cs: mainSkillData.cs,
      acp: mainSkillData.acp,
    };

    // Get tag
    let count = 1;
    let tag = `${skillId}${count}`;
    while (mainSkillData.subSkills[tag] != null) {
      count++;
      tag = `${skillId}${count}`;
    }

    const updateData = {};
    updateData[`data.skills.${skillId}.subSkills.${tag}`] = skillData;
    if (this.actor.hasPerm(game.user, "OWNER")) this.actor.update(updateData);
  }

  _onSkillCreate(event) {
    event.preventDefault();
    const isBackground = $(event.currentTarget).parents(".skills-list").attr("data-background") === "true";
    const skillData = {
      name: "",
      ability: "int",
      rank: 0,
      notes: "",
      mod: 0,
      rt: false,
      cs: false,
      acp: false,
      background: isBackground,
      custom: true
    };

    let tag = createTag(skillData.name || "skill");
    let count = 1;
    while (this.actor.data.data.skills[tag] != null) {
      count++;
      tag = createTag(skillData.name || "skill") + count.toString();
    }

    const updateData = {};
    updateData[`data.skills.${tag}`] = skillData;
    if (this.actor.hasPerm(game.user, "OWNER")) this.actor.update(updateData);
  }

  _onArbitrarySkillDelete(event) {
    event.preventDefault();
    const mainSkillId = $(event.currentTarget).parents(".sub-skill").attr("data-main-skill");
    const subSkillId = $(event.currentTarget).parents(".sub-skill").attr("data-skill");

    const updateData = {};
    updateData[`data.skills.${mainSkillId}.subSkills.-=${subSkillId}`] = null;
    if (this.actor.hasPerm(game.user, "OWNER")) this.actor.update(updateData);
  }

  _onSkillDelete(event) {
    event.preventDefault();
    const skillId = $(event.currentTarget).parents(".skill").attr("data-skill");

    const updateData = {};
    updateData[`data.skills.-=${skillId}`] = null;
    if (this.actor.hasPerm(game.user, "OWNER")) this.actor.update(updateData);
  }

  async _quickItemActionControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
    const item = this.actor.getOwnedItem(itemId);

    // Quick Attack
    if (a.classList.contains("item-attack")) {
      await item.use({ev: event, skipDialog: event.shiftKey});
    }
  }

  async _changeSpellbokPrestigeCl(event, add = 1) {
    event.preventDefault();
    const spellbookKey = $(event.currentTarget).closest(".spellbook-group").data("tab");

    const currentCl = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${spellbookKey}.bonusPrestigeCl`) || 0;
    const newCl = Math.max(0, currentCl + add);
    const k = `data.attributes.spells.spellbooks.${spellbookKey}.bonusPrestigeCl`;
    let updateData = {}
    updateData[k] = newCl
    this.actor.update(updateData);
  }

  async _onFeatChangeGroup(event) {
    
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const item = this.actor.getOwnedItem(itemId);
    const newSource = $(event.currentTarget).val();
    item.update({ "data.classSource": newSource });
  }

  async _quickChangeItemQuantity(event, add=1) {
    event.preventDefault();
    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
    const item = this.actor.getOwnedItem(itemId);

    const curQuantity = getProperty(item.data, "data.quantity") || 0;
    const newQuantity = Math.max(0, curQuantity + add);
    item.update({ "data.quantity": newQuantity });
  }

  async _quickEquipItem(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
    const item = this.actor.getOwnedItem(itemId);

    if (hasProperty(item.data, "data.equipped")) {
      item.update({ "data.equipped": !item.data.data.equipped });
    }
  }

  async _quickCarryItem(event) {
    event.preventDefault();
    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
    const item = this.actor.getOwnedItem(itemId);

    if (hasProperty(item.data, "data.carried")) {
      item.update({ "data.carried": !item.data.data.carried });
    }
  }

  async _quickIdentifyItem(event) {
    event.preventDefault();
    if (!game.user.isGM) {
      ui.notifications.error("You are not allowed to identify items");
      return;
    }
    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
    const item = this.actor.getOwnedItem(itemId);

    if (hasProperty(item.data, "data.identified")) {
      item.update({ "data.identified": !item.data.data.identified });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    const type = header.dataset.type;
    const itemData = {
      name: `New ${type.capitalize()}`,
      type: type,
      data: duplicate(header.dataset)
    };
    delete itemData.data["type"];
    return this.actor.createOwnedItem(itemData);
  }

  /* -------------------------------------------- */

  /**
   * Handle editing an existing Owned Item for the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemEdit(event) {
    event.preventDefault();
    const li = event.currentTarget.closest(".item");
    const item = this.actor.getOwnedItem(li.dataset.itemId);
    item.sheet.render(true);
  }

  /**
   * Handle deleting an existing Owned Item for the Actor
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemDelete(event) {
    event.preventDefault();

    const button = event.currentTarget;
    if (button.disabled) return;

    const li = event.currentTarget.closest(".item");
    if (keyboard.isDown("Shift")) {
      this.actor.deleteOwnedItem(li.dataset.itemId);
    }
    else {
      button.disabled = true;

      const msg = `<p>${game.i18n.localize("D35E.DeleteItemConfirmation")}</p>`;
      Dialog.confirm({
        title: game.i18n.localize("D35E.DeleteItem"),
        content: msg,
        yes: () => {
          this.actor.deleteOwnedItem(li.dataset.itemId);
          button.disabled = false;
        },
        no: () => button.disabled = false
      });
    }
  }

  _onSpellAddUses(event) {
    event.preventDefault();
    let add = 1
    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
    const item = this.actor.getOwnedItem(itemId);

    const curQuantity = getProperty(item.data, "data.preparation.maxAmount") || 0;
    const newQuantity = Math.max(0, curQuantity + add);
    item.update({ "data.preparation.maxAmount": newQuantity });
  }

  _onSpellRemoveUses(event) {
    event.preventDefault();
    let add = -1
    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");
    const item = this.actor.getOwnedItem(itemId);

    const curQuantity = getProperty(item.data, "data.preparation.maxAmount") || 0;
    const newQuantity = Math.max(0, curQuantity + add);
    item.update({ "data.preparation.maxAmount": newQuantity });
  }

  _onSpellAddMetamagic(event) {

  }

  /**
   * Handle rolling an Ability check, either a test or a saving throw
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollAbilityTest(event) {
    event.preventDefault();
    let ability = event.currentTarget.parentElement.dataset.ability;
    this.actor.rollAbility(ability, {event: event});
  }

  _onRollBAB(event) {
    event.preventDefault();
    this.actor.rollBAB({event: event});
  }

  _onRollSimpleMelee(event) {
    event.preventDefault();
    this.actor.rollMelee({event: event});
  }

  _onRollSimpleRanged(event) {
    event.preventDefault();
    this.actor.rollRanged({event: event});
  }

  _onRollCMB(event) {
    event.preventDefault();
    this.actor.rollCMB({event: event});
  }

  _onRollInitiative(event) {
    event.preventDefault();
    this.actor.rollInitiative();
  }

  _onRollSavingThrow(event) {
    event.preventDefault();
    let savingThrow = event.currentTarget.parentElement.dataset.savingthrow;
    this.actor.rollSavingThrow(savingThrow, {event: event});
  }

  async _onRaceControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add race
    if (a.classList.contains("add")) {
      const itemData = {
        name: "New Race",
        type: "race",
      };
      this.actor.createOwnedItem(itemData);
    }
    // Edit race
    else if (a.classList.contains("edit")) {
      this._onItemEdit(event);
    }
    // Delete race
    else if (a.classList.contains("delete")) {
      this._onItemDelete(event);
    }
  }


  /* -------------------------------------------- */

  /**
   * Organize and classify Owned Items
   * @private
   */
  _prepareItems(data) {
    // Set item tags
    for (let [key, res] of Object.entries(getProperty(this.actor.data, "data.resources"))) {
      if (!res) continue;
      const id = res._id;
      if (!id) continue;
      const item = this.actor.items.find(o => o._id === id);
      if (!item) continue;
      item.data.tag = key;
    }

    // Categorize items as inventory, spellbook, features, and classes
    const inventory = {
      weapon: { label: game.i18n.localize("D35E.InventoryWeapons"), canCreate: true, hasActions: false, items: [], canEquip: true, dataset: { type: "weapon" } },
      equipment: { label: game.i18n.localize("D35E.InventoryArmorEquipment"), canCreate: true, hasActions: false, items: [], canEquip: true, dataset: { type: "equipment" }, hasSlots: true },
      consumable: { label: game.i18n.localize("D35E.InventoryConsumables"), canCreate: true, hasActions: true, items: [], canEquip: false, dataset: { type: "consumable" } },
      gear: { label: CONFIG.D35E.lootTypes["gear"], canCreate: true, hasActions: false, items: [], canEquip: false, dataset: { type: "loot", "sub-type": "gear" } },
      ammo: { label: CONFIG.D35E.lootTypes["ammo"], canCreate: true, hasActions: false, items: [], canEquip: false, dataset: { type: "loot", "sub-type": "ammo" } },
      misc: { label: CONFIG.D35E.lootTypes["misc"], canCreate: true, hasActions: false, items: [], canEquip: false, dataset: { type: "loot", "sub-type": "misc" } },
      container: { label: CONFIG.D35E.lootTypes["container"], canCreate: true, hasActions: false, items: [], canEquip: false, dataset: { type: "loot", "sub-type": "container" }, isContainer: true },
      tradeGoods: { label: CONFIG.D35E.lootTypes["tradeGoods"], canCreate: true, hasActions: false, items: [], canEquip: false, dataset: { type: "loot", "sub-type": "tradeGoods" } },
      all: { label: game.i18n.localize("D35E.All"), canCreate: false, hasActions: true, items: [], canEquip: true, dataset: {} },
    };

    let containerItems = new Map()

    // Partition items by category
    let [items, spells, feats, classes, attacks] = data.items.reduce((arr, item) => {
      item.img = item.img || DEFAULT_TOKEN;
      item.isStack = item.data.quantity ? item.data.quantity > 1 : false;
      item.hasUses = item.data.uses && (item.data.uses.max > 0);
      item.isCharged = ["day", "week", "charges","encounter"].includes(getProperty(item, "data.uses.per"));

      const itemQuantity = getProperty(item, "data.quantity") != null ? getProperty(item, "data.quantity") : 1;
      const itemCharges = getProperty(item, "data.uses.value") != null ? getProperty(item, "data.uses.value") : 1;
      item.empty = itemQuantity <= 0 || (item.isCharged && itemCharges <= 0);

      if ( item.type === "spell" ) arr[1].push(item);
      else if ( item.type === "feat" ) arr[2].push(item);
      else if ( item.type === "class" ) arr[3].push(item);
      else if (item.type === "attack") arr[4].push(item);
      else if ( Object.keys(inventory).includes(item.type) || (item.data.subType != null && Object.keys(inventory).includes(item.data.subType)) ) {
        console.log(`D35E | Item container | ${item.name}, ${item.data.containerId} |`, item)
        if (item.data.containerId !== "none") {
          if (!containerItems.has(item.data.containerId)) {
            containerItems.set(item.data.containerId,[])
          }
          containerItems.get(item.data.containerId).push(item)
        } else {
          arr[0].push(item)
        }
      }

      return arr;
    }, [[], [], [], [], []]);


    items.forEach(c => {
      c['containerItems'] = containerItems.get(c.id) || []
    })

    // Apply active item filters
    items = this._filterItems(items, this._filters.inventory);
    spells = this._filterItems(spells, this._filters.spellbook);
    feats = this._filterItems(feats, this._filters.features);

    // Organize Spellbook
    let spellbookData = {};
    const spellbooks = data.actor.data.attributes.spells.spellbooks;
    
    for (let [a, spellbook] of Object.entries(spellbooks)) {
      const spellbookSpells = spells.filter(obj => { return obj.data.spellbook === a; });
      spellbookData[a] = {
        data: this._prepareSpellbook(data, spellbookSpells, a),
        prepared: spellbookSpells.filter(obj => { return obj.data.preparation.mode === "prepared" && obj.data.preparation.prepared; }).length,
        orig: spellbook,
        concentration: this.actor.data.data.skills["coc"].mod,
        spellcastingTypeName: spellbook.spellcastingType !== undefined && spellbook.spellcastingType !== null ? game.i18n.localize(CONFIG.D35E.spellcastingType[spellbook.spellcastingType]) : "None"
      };

    }

    // Organize Inventory
    for ( let i of items ) {
      const subType = i.type === "loot" ? i.data.subType || "gear" : i.data.subType;
      i.data.quantity = i.data.quantity || 0;
      i.data.weight =  i.data.weight || 0;
      let weightMult = i.data.containerWeightless ? 0 : 1
      i.totalWeight = weightMult * Math.round(i.data.quantity * i.data.weight * 10) / 10;
      i.units = game.settings.get("D35E", "units") === "metric" ? game.i18n.localize("D35E.Kgs") : game.i18n.localize("D35E.Lbs")
      if (inventory[i.type] != null) inventory[i.type].items.push(i);
      if (subType != null && inventory[subType] != null) inventory[subType].items.push(i);
      inventory.all.items.push(i);
    }

    // Organize Features
    const features = {
      classes: { label: game.i18n.localize("D35E.ClassPlural"), hasPack: true, pack: "D35E.classes", emptyLabel: "D35E.ListDragAndDropClass", items: [], canCreate: true, hasActions: false, dataset: { type: "class" }, isClass: true},
      feat: { label: game.i18n.localize("D35E.FeatPlural"), hasPack: true, pack: "D35E.feats", emptyLabel: "D35E.ListDragAndDropFeat", items: [], canCreate: true, hasActions: true, dataset: { type: "feat", "feat-type": "feat" }, isFeat: true },
      classFeat: { label: game.i18n.localize("D35E.ClassFeaturePlural"), hasPack: true, pack: 'actor-first-class', emptyLabel: "D35E.ListDragAndDropClassFeature", items: [], canCreate: true, hasActions: true, dataset: { type: "feat", "feat-type": "classFeat" }, isClassFeat: true },
      trait: { label: game.i18n.localize("D35E.TraitPlural"), hasPack: false, pack: "", emptyLabel: "D35E.ListDragAndDropNone", items: [], canCreate: true, hasActions: true, dataset: { type: "feat", "feat-type": "trait" } },
      racial: { label: game.i18n.localize("D35E.RacialTraitPlural"), hasPack: true, pack: "actor-race", emptyLabel: "D35E.ListDragAndDropRacialTrait", items: [], canCreate: true, hasActions: true, dataset: { type: "feat", "feat-type": "racial" } },
      misc: { label: game.i18n.localize("D35E.Misc"), hasPack: false, pack: "", emptyLabel: "D35E.ListDragAndDropNone", items: [], canCreate: true, hasActions: true, dataset: { type: "feat", "feat-type": "misc" } },
      all: { label: game.i18n.localize("D35E.All"), hasPack: false, pack: "", emptyLabel: "D35E.ListDragAndDropNone", items: [], canCreate: false, hasActions: true, dataset: { type: "feat" } },
    };

    let classFeaturesMap = new Map()

    for (let f of feats) {
      let k = f.data.featType;
      if (f.data.source) {
        let className = f.data.source.split(' ')
        className.pop()
        let sourceClassName = className.join(' ')
        if (!classFeaturesMap.has(sourceClassName))
          classFeaturesMap.set(sourceClassName,[])
        classFeaturesMap.get(sourceClassName).push(f);
      } else {
        features[k].items.push(f);
        features.all.items.push(f);
      }
    }
    classes.sort((a, b) => b.levels - a.levels);
    features.classes.items = classes;
    classes.forEach(c => {
      c['classFeatures'] = classFeaturesMap.get(c.name) || []
    })
    // Buffs
    let buffs = data.items.filter(obj => { return obj.type === "buff"; });
    buffs = this._filterItems(buffs, this._filters.buffs);
    const buffSections = {
      temp: { label: game.i18n.localize("D35E.Temporary"), items: [], hasActions: false, dataset: { type: "buff", "buff-type": "temp" } },
      perm: { label: game.i18n.localize("D35E.Permanent"), items: [], hasActions: false, dataset: { type: "buff", "buff-type": "perm" } },
      item: { label: game.i18n.localize("D35E.Item"), items: [], hasActions: false, dataset: { type: "buff", "buff-type": "item" } },
      misc: { label: game.i18n.localize("D35E.Misc"), items: [], hasActions: false, dataset: { type: "buff", "buff-type": "misc" } },
      all: { label: game.i18n.localize("D35E.All"), items: [], hasActions: false, dataset: { type: "buff" } },
    };

    data.shapechanges = []
    for (let b of buffs) {
      let s = b.data.buffType;
      if (s === 'shapechange') data.shapechanges.push(b)
      if (!buffSections[s]) continue;
      buffSections[s].items.push(b);
      buffSections.all.items.push(b);
    }


    // Attacks

    data.useableAttacks = []

    const attackSections = {
      weapon: { label: game.i18n.localize("D35E.AttackTypeWeaponPlural"), items: [], canCreate: true, initial: false, showTypes: false, dataset: { type: "attack", "attack-type": "weapon" } },
      natural: { label: game.i18n.localize("D35E.AttackTypeNaturalPlural"), items: [], canCreate: true, initial: false, showTypes: false, dataset: { type: "attack", "attack-type": "natural" } },
      ability: { label: game.i18n.localize("D35E.AttackTypeAbilityPlural"), items: [], canCreate: true, initial: false, showTypes: false, dataset: { type: "attack", "attack-type": "ability" } },
      racialAbility: { label: game.i18n.localize("D35E.AttackTypeRacialPlural"), items: [], canCreate: true, initial: false, showTypes: false, dataset: { type: "attack", "attack-type": "racialAbility" } },
      misc: { label: game.i18n.localize("D35E.Misc"), items: [], canCreate: true, initial: false, showTypes: false, dataset: { type: "attack", "attack-type": "misc" } },
      all: { label: game.i18n.localize("D35E.All"), items: [], canCreate: false, initial: true, showTypes: true, dataset: { type: "attack" } },
    };

    for (let a of attacks) {
      let s = a.data.attackType;
      if (!a.data.melded) data.useableAttacks.push(a)
      if (!attackSections[s]) continue;
      attackSections[s].items.push(a);
      attackSections.all.items.push(a);
    }

    // Assign and return
    data.inventory = Object.values(inventory);
    data.spellbookData = spellbookData;
    data.features = Object.values(features);
    data.buffs = buffSections;
    data.attacks = attackSections;
    data.counters = this.actor.data.data.counters;
    data.featCounters = []
    for (let [a, s] of Object.entries(data.actor.data.counters.feat || [])) {
        if (a === "base") continue;
        data.featCounters.push({name: a.charAt(0).toUpperCase() + a.substr(1).toLowerCase(), val: a})
    }

    // Handlebars.registerPartial('myPartial', 'This is a tab generated from something!{{prefix}}');
    // data.myVariable = "myPartial";
  }

  /**
   * Handle rolling a Skill check
   * @param {Event} event   The originating click event
   * @private
   */
  _onRollSkillCheck(event) {
    event.preventDefault();
    const skill = event.currentTarget.parentElement.parentElement.dataset.skill;
    this.actor.rollSkill(skill, {event: event});
  }

  _onRollSubSkillCheck(event) {
    event.preventDefault();
    const mainSkill = event.currentTarget.parentElement.parentElement.dataset.mainSkill;
    const skill = event.currentTarget.parentElement.parentElement.dataset.skill;
    this.actor.rollSkill(`${mainSkill}.subSkills.${skill}`, {event: event});
  }

  /* -------------------------------------------- */

  /**
   * Handle toggling of filters to display a different set of owned items
   * @param {Event} event     The click event which triggered the toggle
   * @private
   */
  _onToggleFilter(event) {
    event.preventDefault();
    const li = event.currentTarget;
    const set = this._filters[li.parentElement.dataset.filter];
    const filter = li.dataset.filter;
    if ( set.has(filter) ) set.delete(filter);
    else set.add(filter);
    this.render();
  }

  /* -------------------------------------------- */

  /**
   * Handle spawning the ActorTraitSelector application which allows a checkbox of multiple trait options
   * @param {Event} event   The click event which originated the selection
   * @private
   */
  _onTraitSelector(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const label = a.parentElement.querySelector("label");
    const options = {
      name: label.getAttribute("for"),
      title: label.innerText,
      choices: CONFIG.D35E[a.dataset.options]
    };
    new ActorTraitSelector(this.actor, options).render(true)
  }


  async saveMCEContent(updateData=null) {
    let manualUpdate = false;
    if (updateData == null) {
      manualUpdate = true;
      updateData = {};
    }

    for (const [key, editor] of Object.entries(this.editors)) {
      if (editor.mce == null) continue;

      updateData[key] = editor.mce.getContent();
    }

    if (manualUpdate && Object.keys(updateData).length > 0) await this.actor.update(updateData);
  }

  setItemUpdate(id, key, value) {
    let obj = this._itemUpdates.filter(o => { return o._id === id; })[0];
    if (obj == null) {
      obj = { _id: id };
      this._itemUpdates.push(obj);
    }

    obj[key] = value;
    this._updateItems();
  }

  async _render(...args) {
    // Trick to avoid error on elements with changing name
    let focus = this.element.find(":focus");
    focus = focus.length ? focus[0] : null;
    if (focus && focus.name.match(/^data\.skills\.(?:[a-zA-Z0-9]*)\.name$/)) focus.blur();

    return super._render(...args);
  }

  async _onSubmit(event, {updateData=null, preventClose=false}={}) {
    event.preventDefault();
    //todo: wait for foundry fix
    this._updateItems();

    return super._onSubmit(event, {updateData, preventClose});
  }

  async _updateItems() {
    let promises = [];

    const updates = duplicate(this._itemUpdates);
    this._itemUpdates = [];

    for (const data of updates) {
      const item = this.actor.items.filter(o => { return o._id === data._id; })[0];
      if (item == null) continue;

      delete data._id;
      if (item.hasPerm(game.user, "OWNER")) promises.push(item.update(data));
    }

    await Promise.all(promises);
  }

  /**
   * @override
   */
  async _onDrop(event) {
    event.preventDefault();

    // Try to extract the data
    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData('text/plain'));
      if (data.type !== "Item" && data.type !== "Actor") return;
    } catch (err) {
      return false;
    }
    let dataType = "";
    const actor = this.actor;
    if (data.type === "Item") {
      let itemData = {};
      // Case 1 - Import from a Compendium pack
      if (data.pack) {
        dataType = "compendium";
        const pack = game.packs.find(p => p.collection === data.pack);
        const packItem = await pack.getEntity(data.id);
        if (packItem != null) itemData = packItem.data;
      }

      // Case 2 - Data explicitly provided
      else if (data.data) {
        let sameActor = data.actorId === actor._id;
        if (sameActor && actor.isToken) sameActor = data.tokenId === actor.token.id;
        if (sameActor) return this._onSortItem(event, data.data); // Sort existing items

        dataType = "data";
        itemData = data.data;
      }

      // Case 3 - Import from World entity
      else {
        dataType = "world";
        itemData = game.items.get(data.id).data;
      }

      return this.importItem(mergeObject(itemData, this.getDropData(itemData), {inplace: false}), dataType);
    } else if (data.type === "Actor") {
      let actorData = {};
      // Case 1 - Import from a Compendium pack
      if (data.pack) {
        dataType = "compendium";
        const pack = game.packs.find(p => p.collection === data.pack);
        const packItem = await pack.getEntity(data.id);
        if (packItem != null) actorData = packItem.data;
      }

      // Case 2 - Data explicitly provided
      else if (data.data) {
        let sameActor = data.actorId === actor._id;
        if (sameActor && actor.isToken) sameActor = data.tokenId === actor.token.id;
        if (sameActor) return this._onSortItem(event, data.data); // Sort existing items

        dataType = "data";
        actorData = data.data;
      }

      // Case 3 - Import from World entity
      else {
        dataType = "world";
        actorData = game.actors.get(data.id).data;
      }

      return this.importActor(mergeObject(actorData, this.getDropData(actorData), {inplace: false}), dataType);
    }
  }

  get currentPrimaryTab() {
    const primaryElem = this.element.find('nav[data-group="primary"] .item.active');
    if (primaryElem.length !== 1) return null;
    return primaryElem.attr("data-tab");
  }

  async importItem(itemData, dataType) {
    if (itemData.type === "spell" && !itemData.data.isPower && this.currentPrimaryTab === "inventory") {
      return this.actor._createConsumableSpellDialog(itemData);
    }
    if (itemData.type === "spell" && itemData.data.isPower && this.currentPrimaryTab === "inventory") {
      return this.actor._createConsumablePowerDialog(itemData);
    }


    if (itemData.type === "actor") {
      return this.actor._createConsumablePowerDialog(itemData);
    }

    if (itemData._id) delete itemData._id;
    return this.actor.createEmbeddedEntity("OwnedItem", itemData);
  }
  async importActor(itemData, dataType) {
    if (itemData.type === "npc") {
      return this.actor._createPolymorphBuffDialog(itemData);
    }
    if (this.actor.data.type === "npc" && itemData.type === "character") {
      if (dataType === "world")
        return this.actor._setMaster(itemData);
    }
  }



  getDropData(origData) {
    let result = {};

    // Set spellbook for spell
    console.log(this.currentPrimaryTab)
    if (getProperty(origData, "type") === "spell") setProperty(result, "data.spellbook", this.currentPrimaryTab === "spellbook" ? this.currentSpellbookKey : null);

    return result;
  }


  _openCompendiumPack(event) {
    event.preventDefault();
    let div = $(event.currentTarget),
        pack = div.attr("data-pack");
    if (pack !== 'actor-race' && pack !== 'actor-first-class') {
      game.packs.get(pack).render(true)
    } else if (pack === 'actor-race') {
      if (this.entity.race !== null) {
        this.entity.race.sheet.render(true)
      }
    } else if (pack === 'actor-first-class')
    {
      this.entity.items.find(o => o.type === "class").sheet.render(true)
    }
  }

  _onNoteEditor(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.getAttribute("for"),
      title: a.innerText,
      fields: a.dataset.fields,
      dtypes: a.dataset.dtypes,
    };
    new NoteEditor(this.actor, options).render(true);
  }


  _onSpellbookEditor(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.getAttribute("for"),
      title: a.innerText,
      fields: a.dataset.fields,
      dtypes: a.dataset.dtypes,
    };
    new SpellbookEditor(this.actor, options).render(true);
  }

  _onLevelDataUp(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      id: a.getAttribute("for"),
      skillset: this._prepareSkillsets(this.getData().actor.data.skills)
    };
    new LevelUpDataDialog(this.actor, options).render(true);
  }
}
