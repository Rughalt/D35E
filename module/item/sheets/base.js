import { createTabs } from "../../lib.js";
import { EntrySelector } from "../../apps/entry-selector.js";
import {ItemPF} from "../entity.js";

/**
 * Override and extend the core ItemSheet implementation to handle D&D5E specific item types
 * @type {ItemSheet}
 */
export class ItemSheetPF extends ItemSheet {
  constructor(...args) {
    super(...args);

    this.options.submitOnClose = false;

    /**
     * Track the set of item filters which are applied
     * @type {Set}
     */
    this._filters = {
    };

    this.items = [];
    this.childItemMap = new Map()
    this.ehnancementItemMap = new Map()
    this.containerMap = new Map()
  }

  /* -------------------------------------------- */

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      width: 560,
      height: 600,
      classes: ["D35E", "sheet", "item"],
      resizable: false
    });
  }

  /* -------------------------------------------- */

  /**
   * Return a dynamic reference to the HTML template path used to render this Item Sheet
   * @return {string}
   */
  get template() {
    const path = "systems/D35E/templates/items/";
    return `${path}/${this.item.data.type}.html`;
  }

  /* -------------------------------------------- */

  

  /**
   * Prepare item sheet data
   * Start with the base item data and extending with additional properties for rendering.
   */
  async getData() {
    const data = await super.getData();
    data.labels = this.item.labels;
    // Include sub-items
    data.items = [];
    if (this.item.items != null) {
      data.items = this.item.items.map(i => {
        i.data.labels = i.labels;
        return i.data;
      });
    }

    // Include CONFIG values
    data.config = CONFIG.D35E;

    // Item Type, Status, and Details
    data.itemType = data.item.type.titleCase();
    data.itemStatus = this._getItemStatus(data.item);
    data.itemProperties = this._getItemProperties(data.item);
    data.itemName = data.item.name;
    data.isPhysical = data.item.data.hasOwnProperty("quantity");
    data.isSpell = this.item.type === "spell";
    data.isClass = this.item.type === "class";
    data.isRace = this.item.type === "race";
    data.isShapechangeBuff = this.item.type === "buff" && this.item.subType === "shapechange";
    data.canMeld = this.item.type === "weapon" || this.item.type === "attack" || this.item.type === "equipment";
    data.isAmmo = this.item.data.data.subType === "ammo";
    data.isContainer = this.item.data.data.subType  === "container";
    data.owner = this.item.actor != null;
    data.isGM = game.user.isGM;
    data.showIdentifyDescription = data.isGM && data.isPhysical;
    data.showUnidentifiedData = this.item.showUnidentifiedData;
    

    // Unidentified data
    if (this.item.showUnidentifiedData) {
      data.itemName = getProperty(this.item.data, "data.unidentified.name") || getProperty(this.item.data, "data.identifiedName") || this.item.name;
    }
    else {
      data.itemName = getProperty(this.item.data, "data.identifiedName") || this.item.name;
    }


    // Action Details
    data.hasAttackRoll = this.item.hasAttack;
    data.isHealing = data.item.data.actionType === "heal";

    data.isCharged = false;
    if (data.item.data.uses != null) {
      data.isCharged = ["day", "week", "charges", "encounter"].includes(data.item.data.uses.per);
    }
    if (data.item.data.range != null) {
      data.canInputRange = ["ft", "mi", "spec"].includes(data.item.data.range.units);
    }
    if (data.item.data.duration != null) {
      data.canInputDuration = !(["", "inst", "perm", "seeText"].includes(data.item.data.duration.units));
    }

    // Prepare feat specific stuff
    if (data.item.type === "feat") {
      data.isClassFeature = true; //Any feat can be a class feature
    }

    data.availableContainers = {}
    data.availableContainers['none'] = "None"


    if (this.actor != null) {
      this.actor.items.forEach(i => {
        if (i.data.type === "loot" && i.data.data.subType === "container") {
          data.availableContainers[i._id] = i.name
          this.containerMap.set(i._id,i)
        }
      })
    }


    // Prepare weapon specific stuff
    if (data.item.type === "weapon") {
      data.isRanged = (data.item.data.weaponSubtype === "ranged" || data.item.data.properties["thr"] === true);

      // Prepare categories for weapons
      data.weaponCategories = { types: {}, subTypes: {} };
      for (let [k, v] of Object.entries(CONFIG.D35E.weaponTypes)) {
        if (typeof v === "object") data.weaponCategories.types[k] = v._label;
      }
      const type = data.item.data.weaponType;
      if (hasProperty(CONFIG.D35E.weaponTypes, type)) {
        for (let [k, v] of Object.entries(CONFIG.D35E.weaponTypes[type])) {
          // Add static targets
          if (!k.startsWith("_")) data.weaponCategories.subTypes[k] = v;
        }
      }
      data.enhancements = []
      this.item.data.data.enhancements.items.forEach(e => {
        let item = new ItemPF(e, {owner: this.item.owner})
        this.ehnancementItemMap.set(e._id,item);
        e.hasAction = item.hasAction || item.isCharged;
        e.hasUses = e.data.uses && (e.data.uses.max > 0);
        e.isCharged = ["day", "week", "charges","encounter"].includes(getProperty(e, "data.uses.per"));
        data.enhancements.push(e)
      })
      data.hasEnhancements = true;
    }

    // Prepare enhancement specific stuff
    if (data.item.type === "enhancement") {
      data.enhancementTypes = { types: {}, subTypes: {} };
      for (let [k, v] of Object.entries(CONFIG.D35E.enhancementType)) {
        data.enhancementTypes.types[k] = v;
      }

      data.isWeaponEnhancement = data.item.data.enhancementType === 'weapon'
      data.isArmorEnhancement = data.item.data.enhancementType === 'armor'
      data.isMiscEnhancement = data.item.data.enhancementType === 'misc'

    }

    // Prepare equipment specific stuff
    if (data.item.type === "equipment") {
      // Prepare categories for equipment
      data.equipmentCategories = { types: {}, subTypes: {} };
      for (let [k, v] of Object.entries(CONFIG.D35E.equipmentTypes)) {
        if (typeof v === "object") data.equipmentCategories.types[k] = v._label;
      }
      const type = data.item.data.equipmentType;
      if (hasProperty(CONFIG.D35E.equipmentTypes, type)) {
        for (let [k, v] of Object.entries(CONFIG.D35E.equipmentTypes[type])) {
          // Add static targets
          if (!k.startsWith("_")) data.equipmentCategories.subTypes[k] = v;
        }
      }

      // Prepare slots for equipment
      data.equipmentSlots = CONFIG.D35E.equipmentSlots[type];

      // Whether the equipment should show armor data
      data.showArmorData = ["armor", "shield"].includes(type);

      // Whether the current equipment type has multiple slots
      data.hasMultipleSlots = Object.keys(data.equipmentSlots).length > 1;
      data.enhancements = []

      this.item.data.data.enhancements.items.forEach(e => {
        let item = new ItemPF(e, {owner: this.item.owner})
        this.ehnancementItemMap.set(e._id,item);
        e.hasAction = item.hasAction || item.isCharged;
        e.hasUses = e.data.uses && (e.data.uses.max > 0);
        e.isCharged = ["day", "week", "charges","encounter"].includes(getProperty(e, "data.uses.per"));
        data.enhancements.push(e)
      })
      data.hasEnhancements = true;
    }

    // Prepare attack specific stuff
    if (data.item.type === "attack") {
      data.isWeaponAttack = data.item.data.attackType === "weapon";
      data.isNaturalAttack = data.item.data.attackType === "natural";
    }

    // Prepare spell specific stuff
    if (data.item.type === "spell") {
      let spellbook = null;
      if (this.actor != null) {
        spellbook = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${this.item.data.data.spellbook}`);
      }

      data.isPreparedSpell = spellbook != null ? !spellbook.spontaneous : false;
      data.isAtWill = data.item.data.atWill;
      data.spellbooks = {};
      if (this.item.actor) {
        data.spellbooks = duplicate(this.item.actor.data.data.attributes.spells.spellbooks);
      }

      // Enrich description
      data.description = TextEditor.enrichHTML(data.data.description.value);
    }
    if (data.item.type === "race") {
      data.children = {
        spelllikes: [],
        abilities: [],
        traits: [],
      }

      {
        let spellLikes = game.packs.get("D35E.spelllike");
        let spellikeItems = []
        await spellLikes.getIndex().then(index => spellikeItems = index);
        for (let entry of spellikeItems) {
          await spellLikes.getEntity(entry._id).then(e => 
          {
            if (e.data.data.tags.some(el => el[0] === this.item.data.name)) {
              data.children.spelllikes.push(e);
              this.childItemMap.set(entry._id,e);
            }
          }
          )
        }
      
      }

      {
        let itemPack = game.packs.get("D35E.racial-abilities");
        let items = []
        await itemPack.getIndex().then(index => items = index);
        for (let entry of items) {
          await itemPack.getEntity(entry._id).then(e => 
          {
            if (e.data.data.tags.some(el => el[0] === this.item.data.name))
            {
              if (e.data.type === "feat")
                data.children.traits.push(e);
              else
                data.children.abilities.push(e);
              this.childItemMap.set(entry._id,e);
            }
          }
          )
        }
      
      }
    }


    // Prepare class specific stuff
    if (data.item.type === "class") {
      for (let [a, s] of Object.entries(data.data.savingThrows)) {
        s.label = CONFIG.D35E.savingThrows[a];
      }
      for (let [a, s] of Object.entries(data.data.fc)) {
        s.label = CONFIG.D35E.favouredClassBonuses[a];
      }
      data.powerPointLevels = {}
      if (data.data.powerPointTable !== undefined && data.data.powerPointTable !== null) {
        Object.keys(data.data.powerPointTable).forEach(key => {
          data.powerPointLevels[key] = {value: data.data.powerPointTable[key]}
        })
      } else {
        data.data.powerPointTable = {}
        for (let i = 1; i <= 20; i++) {
          data.data.powerPointTable[i] = 0;
          data.powerPointLevels[i] = {value: 0}
        }
      }

      data.powerPointBonusBaseAbility = data.data.powerPointBonusBaseAbility
      data.abilities = {}
      for (let [a, s] of Object.entries(CONFIG.D35E.abilities)) {
        data.abilities[a] = {}
        data.abilities[a].label = s;
      }
      data.isBaseClass = data.data.classType === "base";
      data.isRacialHD = data.data.classType === "racial";

      data.children = {
        spelllikes: [],
        abilities: [],
        traits: [],
      }

      {
        let spellLikes = game.packs.get("D35E.spelllike");
        let spellikeItems = []
        await spellLikes.getIndex().then(index => spellikeItems = index);
        for (let entry of spellikeItems) {
          await spellLikes.getEntity(entry._id).then(e => 
          {
            
            if (e.data.data.associations !== undefined && e.data.data.associations.classes !== undefined && e.data.data.associations.classes.some(el => el[0] === this.item.data.name)) {
              data.children.spelllikes.push(e);
              this.childItemMap.set(entry._id,e);
            }
          }
          )
        }
      
      }

      {
        let itemPack = game.packs.get("D35E.class-abilities");
        let items = []
        await itemPack.getIndex().then(index => items = index);
        for (let entry of items) {
          await itemPack.getEntity(entry._id).then(e => 
          {
            if (e.data.data.associations !== undefined && e.data.data.associations.classes !== undefined && e.data.data.associations.classes.some(el => el[0] === this.item.data.name))
            {
              if (e.data.type === "feat")
                data.children.traits.push(e);
              else
                data.children.abilities.push(e);
              
              this.childItemMap.set(entry._id,e);
            }
          }
          )
        }

      }

      if (this.actor != null) {
        let healthConfig  = game.settings.get("D35E", "healthConfig");
        data.healthConfig =  data.isRacialHD ? healthConfig.hitdice.Racial : this.actor.data.type === "character" ? healthConfig.hitdice.PC : healthConfig.hitdice.NPC;
      } else data.healthConfig = {auto: false};

      // Add skill list
      if (!this.item.actor) {
        data.skills = Object.entries(CONFIG.D35E.skills).reduce((cur, o) => {
          cur[o[0]] = { name: o[1], classSkill: getProperty(this.item.data, `data.classSkills.${o[0]}`) === true };
          return cur;
        }, {});
      }



      else {
        data.skills = Object.entries(this.item.actor.data.data.skills).reduce((cur, o) => {
          const key = o[0];
          const name = CONFIG.D35E.skills[key] != null ? CONFIG.D35E.skills[key] : o[1].name;
          cur[o[0]] = { name: name, classSkill: getProperty(this.item.data, `data.classSkills.${o[0]}`) === true };
          return cur;
        }, {});
      }
    }

    // Prepare stuff for items with changes
    if (data.item.data.changes) {
      data.changes = { targets: {}, modifiers: CONFIG.D35E.bonusModifiers };
      for (let [k, v] of Object.entries(CONFIG.D35E.buffTargets)) {
        if (typeof v === "object") data.changes.targets[k] = v._label;
      }
      data.item.data.changes.forEach(item => {
        item.subTargets = {};
        // Add specific skills
        if (item[1] === "skill") {
          if (this.item.actor != null) {
            const actorSkills = this.item.actor.data.data.skills;
            for (let [s, skl] of Object.entries(actorSkills)) {
              if (!skl.subSkills) {
                if (skl.custom) item.subTargets[`skill.${s}`] = skl.name;
                else item.subTargets[`skill.${s}`] = CONFIG.D35E.skills[s];
              } else {
                for (let [s2, skl2] of Object.entries(skl.subSkills)) {
                  item.subTargets[`skill.${s}.subSkills.${s2}`] = `${CONFIG.D35E.skills[s]} (${skl2.name})`;
                }
              }
            }
          } else {
            for (let [s, skl] of Object.entries(CONFIG.D35E.skills)) {
              if (!skl.subSkills) {
                if (skl.custom) item.subTargets[`skill.${s}`] = skl.name;
                else item.subTargets[`skill.${s}`] = CONFIG.D35E.skills[s];
              } else {
                for (let [s2, skl2] of Object.entries(skl.subSkills)) {
                  item.subTargets[`skill.${s}.subSkills.${s2}`] = `${CONFIG.D35E.skills[s]} (${skl2.name})`;
                }
              }
            }
          }
        }
        // Add static targets
        else if (item[1] != null && CONFIG.D35E.buffTargets.hasOwnProperty(item[1])) {
          for (let [k, v] of Object.entries(CONFIG.D35E.buffTargets[item[1]])) {
            if (!k.startsWith("_")) item.subTargets[k] = v;
          }
        }
      });
    }

    // Prepare stuff for items with context notes
    if (data.item.data.contextNotes) {
      data.contextNotes = { targets: {} };
      for (let [k, v] of Object.entries(CONFIG.D35E.contextNoteTargets)) {
        if (typeof v === "object") data.contextNotes.targets[k] = v._label;
      }
      data.item.data.contextNotes.forEach(item => {
        item.subNotes = {};
        // Add specific skills
        if (item[1] === "skill") {

          if (this.item.actor != null) {
          const actorSkills = this.item.actor.data.data.skills;
          for (let [s, skl] of Object.entries(actorSkills)) {
            if (!skl.subSkills) {
              if (skl.custom) item.subNotes[`skill.${s}`] = skl.name;
              else item.subNotes[`skill.${s}`] = CONFIG.D35E.skills[s];
            }
            else {
              for (let [s2, skl2] of Object.entries(skl.subSkills)) {
                item.subNotes[`skill.${s2}`] = `${CONFIG.D35E.skills[s]} (${skl2.name})`;
              }
            }
          }
          } else {
            for (let [s, skl] of Object.entries(CONFIG.D35E.skills)) {
              if (!skl.subSkills) {
                if (skl.custom) item.subNotes[`skill.${s}`] = skl.name;
                else item.subNotes[`skill.${s}`] = CONFIG.D35E.skills[s];
              } else {
                for (let [s2, skl2] of Object.entries(skl.subSkills)) {
                  item.subNotes[`skill.${s}`] = `${CONFIG.D35E.skills[s]} (${skl2.name})`;
                }
              }
            }
          }
        }
        // Add static targets
        else if (item[1] != null && CONFIG.D35E.contextNoteTargets.hasOwnProperty(item[1])) {
          for (let [k, v] of Object.entries(CONFIG.D35E.contextNoteTargets[item[1]])) {
            if (!k.startsWith("_")) item.subNotes[k] = v;
          }
        }
      });
    }

    return data;
  }

  /* -------------------------------------------- */

  /**
   * Get the text item status which is shown beneath the Item type in the top-right corner of the sheet
   * @return {string}
   * @private
   */
  _getItemStatus(item) {
    if ( item.type === "spell" ) {
      if (item.data.preparation.mode === "prepared") {
        return item.data.preparation.preparedAmount > 0 ? game.i18n.localize("D35E.AmountPrepared").format(item.data.preparation.preparedAmount) : game.i18n.localize("D35E.Unprepared");
      }
      else if (item.data.preparation.mode) {
        return item.data.preparation.mode.titleCase();
      }
      else return "";
    }
    else if ( ["weapon", "equipment"].includes(item.type) ) return item.data.equipped ? game.i18n.localize("D35E.Equipped") : game.i18n.localize("D35E.NotEquipped");
  }

  /* -------------------------------------------- */

  /**
   * Get the Array of item properties which are used in the small sidebar of the description tab
   * @return {Array}
   * @private
   */
  _getItemProperties(item) {
    const props = [];
    const labels = this.item.labels;

    if ( item.type === "weapon" ) {
      props.push(...Object.entries(item.data.properties)
        .filter(e => e[1] === true)
        .map(e => CONFIG.D35E.weaponProperties[e[0]]));
    }

    else if ( item.type === "spell" ) {
      props.push(
        labels.components,
        labels.materials
      )
    }

    else if ( item.type === "equipment" ) {
      props.push(CONFIG.D35E.equipmentTypes[item.data.armor.type]);
      props.push(labels.armor);
    }

    else if ( item.type === "feat" ) {
      props.push(labels.featType);
    }

    // Action type
    if ( item.data.actionType ) {
      props.push(CONFIG.D35E.itemActionTypes[item.data.actionType]);
    }

    // Action usage
    if ( (item.type !== "weapon") && item.data.activation && !isObjectEmpty(item.data.activation) ) {
      props.push(
        labels.activation,
        labels.range,
        labels.target,
        labels.duration
      )
    }

    // Tags
    if (getProperty(item, "data.tags") != null) {
      props.push(...getProperty(item, "data.tags").map(o => {
        return o[0];
      }));
    }

    return props.filter(p => !!p);
  }

  /* -------------------------------------------- */

  setPosition(position={}) {
    // if ( this._sheetTab === "details" ) position.height = "auto";
    return super.setPosition(position);
  }

  /* -------------------------------------------- */
  /*  Form Submission                             */
  /* -------------------------------------------- */

  /**
   * Extend the parent class _updateObject method to ensure that damage ends up in an Array
   * @private
   */
  _updateObject(event, formData) {
    // Handle Damage Array
    let damage = Object.entries(formData).filter(e => e[0].startsWith("data.damage.parts"));
    formData["data.damage.parts"] = damage.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(3);
      if ( !arr[i] ) arr[i] = [];
      arr[i][j] = entry[1];
      return arr;
    }, []);

    // Handle Attack Array
    let attacks = Object.entries(formData).filter(e => e[0].startsWith("data.attackParts"));
    formData["data.attackParts"] = attacks.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if ( !arr[i] ) arr[i] = [];
      arr[i][j] = entry[1];
      return arr;
    }, []);

    // Handle change array
    let change = Object.entries(formData).filter(e => e[0].startsWith("data.changes"));
    formData["data.changes"] = change.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if ( !arr[i] ) arr[i] = [];
      arr[i][j] = entry[1];
      return arr;
    }, []);

    // Handle notes array
    let note = Object.entries(formData).filter(e => e[0].startsWith("data.contextNotes"));
    formData["data.contextNotes"] = note.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if ( !arr[i] ) arr[i] = [];
      arr[i][j] = entry[1];
      return arr;
    }, []);

    let actions = Object.entries(formData).filter(e => e[0].startsWith("data.specialActions"));
    formData["data.specialActions"] = actions.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if ( !arr[i] ) arr[i] = {name: "", action: ""};

      arr[i][j] = entry[1];
      return arr;
    }, []);

    let activateActions = Object.entries(formData).filter(e => e[0].startsWith("data.activateActions"));
    formData["data.activateActions"] = activateActions.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if ( !arr[i] ) arr[i] = {name: "", action: ""};

      arr[i][j] = entry[1];
      return arr;
    }, []);

    let deactivateActions = Object.entries(formData).filter(e => e[0].startsWith("data.deactivateActions"));
    formData["data.deactivateActions"] = deactivateActions.reduce((arr, entry) => {
      let [i, j] = entry[0].split(".").slice(2);
      if ( !arr[i] ) arr[i] = {name: "", action: ""};

      arr[i][j] = entry[1];
      return arr;
    }, []);

    // Update the Item

    if (this.containerMap.has(formData['data.containerId'])) {
      formData['data.container'] = this.containerMap.get(formData['data.containerId']).name
      formData['data.containerWeightless'] = this.containerMap.get(formData['data.containerId']).data.data.bagOfHoldingLike
    }
    else {
      formData['data.container'] = "None"
      formData['data.containerWeightless'] = false
    }
    super._updateObject(event, formData);
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for interactive item sheet events
   */
  activateListeners(html) {
    super.activateListeners(html);

    // Activate tabs
    // Only run this if TabsV2 is already available (which is available since FoundryVTT 0.5.2)
    if (typeof TabsV2 !== "undefined") {
      const tabGroups = {
        "primary": {
          "description": {},
        },
      };
      createTabs.call(this, html, tabGroups);
    }
    // Run older Tabs as a fallback
    else {
      new Tabs(html.find(".tabs"), {
        initial: this["_sheetTab"],
        callback: clicked => {
          this._scrollTab = 0;
          this["_sheetTab"] = clicked.data("tab");
          this.setPosition();
        }
      });

      // Save scroll position
      html.find(".tab.active")[0].scrollTop = this._scrollTab;
      html.find(".tab").scroll(ev => this._scrollTab = ev.currentTarget.scrollTop);
    }

    // Tooltips
    html.mousemove(ev => this._moveTooltips(ev));

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Trigger form submission from textarea elements.
    html.find("textarea").change(this._onSubmit.bind(this));

    // Add drop handler to textareas
    html.find("textarea").on("drop", this._onTextAreaDrop.bind(this));

    // Shapechange source drop handles
    html.find("shapechange").on("drop", this._onShapechangeDrop.bind(this));

    // Modify attack formula
    html.find(".attack-control").click(this._onAttackControl.bind(this));


    // Modify special formula
    html.find(".special-control").click(this._onSpecialControl.bind(this));
    html.find(".a-special-control").click(this._onActivateSpecialControl.bind(this));
    html.find(".d-special-control").click(this._onDeactivateSpecialControl.bind(this));

    // Modify damage formula
    html.find(".damage-control").click(this._onDamageControl.bind(this));

    // Modify buff changes
    html.find(".change-control").click(this._onBuffControl.bind(this));

    // Modify note changes
    html.find(".context-note-control").click(this._onNoteControl.bind(this));

    // Create attack
    if (["weapon"].includes(this.item.data.type)) {
      html.find("button[name='create-attack']").click(this._createAttack.bind(this));
    }

    // Listen to field entries
    html.find(".entry-selector").click(this._onEntrySelector.bind(this));


    // Item summaries
    html.find('.item .child-item h4').click(event => this._onChildItemSummary(event));
    html.find('.item .enh-item h4').click(event => this._onEnhItemSummary(event));
    
    let handler = ev => this._onDragStart(ev);
    html.find('li.item').each((i, li) => {
      if ( li.classList.contains("inventory-header") ) return;
      li.setAttribute("draggable", true);
      li.addEventListener("dragstart", handler, false);
    });


    html.find('div[data-tab="enhancements"]').on("drop", this._onDrop.bind(this));

    html.find('div[data-tab="enhancements"] .item-delete').click(this._onEnhItemDelete.bind(this));
    html.find("div[data-tab='enhancements'] .item-detail.item-uses input[type='text']:not(:disabled)").off("change").change(this._setEnhUses.bind(this));

    html.find('div[data-tab="enhancements"] .item .item-image').click(event => this._onEnhRoll(event));

    // Quick Item Action control
    html.find(".item-actions a").mouseup(ev => this._quickItemActionControl(ev));
  }

  /* -------------------------------------------- */

  _moveTooltips(event) {
    $(event.currentTarget).find(".tooltip:hover .tooltipcontent").css("left", `${event.clientX}px`).css("top", `${event.clientY + 24}px`);
  }

  _onTextAreaDrop(event) {
    event.preventDefault();
    const elem = event.currentTarget;
  }

  /**
   * Add or remove a damage part from the damage formula
   * @param {Event} event     The original click event
   * @return {Promise}
   * @private
   */
  async _onDamageControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new damage component
    if ( a.classList.contains("add-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const damage = this.item.data.data.damage;
      return this.item.update({"data.damage.parts": damage.parts.concat([["", ""]])});
    }

    // Remove a damage component
    if ( a.classList.contains("delete-damage") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".damage-part");
      const damage = duplicate(this.item.data.data.damage);
      damage.parts.splice(Number(li.dataset.damagePart), 1);
      return this.item.update({"data.damage.parts": damage.parts});
    }
  }

  async _onAttackControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new attack component
    if ( a.classList.contains("add-attack") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const attackParts = this.item.data.data.attackParts;
      return this.item.update({"data.attackParts": attackParts.concat([["", ""]])});
    }

    // Remove an attack component
    if ( a.classList.contains("delete-attack") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".attack-part");
      const attackParts = duplicate(this.item.data.data.attackParts);
      attackParts.splice(Number(li.dataset.attackPart), 1);
      return this.item.update({"data.attackParts": attackParts});
    }
  }

  async _onSpecialControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    // Add new attack component
    if ( a.classList.contains("add-special") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      let specialActions = this.item.data.data.specialActions;
      if (specialActions === undefined)
        specialActions = []
      return this.item.update({"data.specialActions": specialActions.concat([[{name:"",action:"",range:"",img:"",condition:""}]])});
    }

    // Remove an attack component
    if ( a.classList.contains("delete-special") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".special-part");
      const specialActions = duplicate(this.item.data.data.specialActions);
      specialActions.splice(Number(li.dataset.specialActions), 1);
      return this.item.update({"data.specialActions": specialActions});
    }
  }

  async _onActivateSpecialControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    // Add new attack component
    if ( a.classList.contains("add-special") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      let activateActions = this.item.data.data.activateActions;
      if (activateActions === undefined)
        activateActions = []
      return this.item.update({"data.activateActions": activateActions.concat([[{name:"",action:"",range:"",img:"",condition:""}]])});
    }

    // Remove an attack component
    if ( a.classList.contains("delete-special") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".special-part");
      const activateActions = duplicate(this.item.data.data.activateActions);
      activateActions.splice(Number(li.dataset.activateActions), 1);
      return this.item.update({"data.activateActions": activateActions});
    }
  }

  async _onDeactivateSpecialControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    // Add new attack component
    if ( a.classList.contains("add-special") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      let deactivateActions = this.item.data.data.deactivateActions;
      if (deactivateActions === undefined)
        deactivateActions = []
      return this.item.update({"data.deactivateActions": deactivateActions.concat([[{name:"",action:"",range:"",img:"",condition:""}]])});
    }

    // Remove an attack component
    if ( a.classList.contains("delete-special") ) {
      await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".special-part");
      const deactivateActions = duplicate(this.item.data.data.deactivateActions);
      deactivateActions.splice(Number(li.dataset.deactivateActions), 1);
      return this.item.update({"data.deactivateActions": deactivateActions});
    }
  }

  async _onBuffControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new change
    if (a.classList.contains("add-change")) {
      //await this._onSubmit(event);  // Submit any unsaved changes
      const changes = this.item.data.data.changes || [];
      return this.item.update({"data.changes": changes.concat([["", "", "", "", 0]])});
    }

    // Remove a change
    if (a.classList.contains("delete-change")) {
      //await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".change");
      const changes = duplicate(this.item.data.data.changes);
      changes.splice(Number(li.dataset.change), 1);
      return this.item.update({"data.changes": changes});
    }
  }

  async _onNoteControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    // Add new note
    if (a.classList.contains("add-note")) {
      //await this._onSubmit(event);  // Submit any unsaved changes
      const contextNotes = this.item.data.data.contextNotes || [];
      return this.item.update({"data.contextNotes": contextNotes.concat([["", "", "", 0]])});
    }

    // Remove a note
    if (a.classList.contains("delete-note")) {
      //await this._onSubmit(event);  // Submit any unsaved changes
      const li = a.closest(".context-note");
      const contextNotes = duplicate(this.item.data.data.contextNotes);
      contextNotes.splice(Number(li.dataset.note), 1);
      return this.item.update({"data.contextNotes": contextNotes});
    }
  }

  async _onShapechangeDrop(event) {

  }

  async _createAttack(event) {
    if (this.item.actor == null) throw new Error(game.i18n.localize("D35E.ErrorItemNoOwner"));

    await this._onSubmit(event);

    await this.item.actor.createAttackFromWeapon(this.item);
  }

  _onEntrySelector(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const options = {
      name: a.getAttribute("for"),
      title: a.innerText,
      fields: a.dataset.fields,
      dtypes: a.dataset.dtypes,
    };
    new EntrySelector(this.item, options).render(true);
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

    if (manualUpdate && Object.keys(updateData).length > 0) await this.item.update(updateData);
  }

  _onChildItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item-box"),
        item = this.childItemMap.get(li.attr("data-item-id"));


    item.sheet.render(true);

    // // Toggle summary
    // if ( li.hasClass("expanded") ) {
    //   let summary = li.children(".item-summary");
    //   summary.slideUp(200, () => summary.remove());
    // } else {
    //   let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
    //   let props = $(`<div class="item-properties"></div>`);
    //   chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
    //   div.append(props);
    //   li.append(div.hide());
    //   div.slideDown(200);
    // }
    // li.toggleClass("expanded");
  }

  _onEnhItemSummary(event) {
    event.preventDefault();
    let li = $(event.currentTarget).parents(".item-box"),
        item = this.ehnancementItemMap.get(li.attr("data-item-id")),
        chatData = item.getChatData({secrets: this.actor.owner});

    // Toggle summary
    if ( li.hasClass("expanded") ) {
      let summary = li.children(".item-summary");
      summary.slideUp(200, () => summary.remove());
    } else {
      let div = $(`<div class="item-summary">${chatData.description.value}</div>`);
      let props = $(`<div class="item-properties"></div>`);
      chatData.properties.forEach(p => props.append(`<span class="tag">${p}</span>`));
      div.append(props);
      li.append(div.hide());
      div.slideDown(200);
    }
    li.toggleClass("expanded");
  }

  _onDragStart(event) {
    // Get the Compendium pack
    const li = event.currentTarget;
    const packName = li.parentElement.getAttribute("data-pack");
    const pack = game.packs.get(packName);
    // console.log(event)
    if ( !pack ) return;
    // Set the transfer data
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: pack.entity,
      pack: pack.collection,
      id: li.getAttribute('data-item-id')
    }));
  }

  async _onDrop(event) {
    event.preventDefault();
    console.log(event)
    let data;
    try {
      data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
      if (data.type !== "Item") return;
    } catch (err) {
      return false;
    }

    let dataType = "";

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
      return this.importItem(itemData, dataType);
    }


  }

  async importItem(itemData, itemType) {
    const updateData = {};
    let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
    const enhancement = itemData
    _enhancements.push(enhancement);
    updateData[`data.enhancements.items`] = _enhancements;
    await this.item.update(updateData);

  }

  /**
   * Handle deleting an existing Enhancement item
   * @param {Event} event   The originating click event
   * @private
   */
  async _onEnhItemDelete(event) {
    event.preventDefault();

    const button = event.currentTarget;
    if (button.disabled) return;

    const li = event.currentTarget.closest(".item");
    if (keyboard.isDown("Shift")) {
      const updateData = {};
      let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
      _enhancements = _enhancements.filter(function( obj ) {
        return obj._id !== li.dataset.itemId;
      });
      updateData[`data.enhancements.items`] = _enhancements;
      this.item.update(updateData);
    }
    else {
      button.disabled = true;

      const msg = `<p>${game.i18n.localize("D35E.DeleteItemConfirmation")}</p>`;
      Dialog.confirm({
        title: game.i18n.localize("D35E.DeleteItem"),
        content: msg,
        yes: () => {
          const updateData = {};
          let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
          _enhancements = _enhancements.filter(function( obj ) {
            return obj._id !== li.dataset.itemId;
          });
          updateData[`data.enhancements.items`] = _enhancements;
          this.item.update(updateData);
          button.disabled = false;
        },
        no: () => button.disabled = false
      });
    }
  }

  _setEnhUses(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    const updateData = {};

    const value = Number(event.currentTarget.value);
    let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
    _enhancements.filter(function( obj ) {
      return obj._id === itemId
    }).forEach(i => {
      i.data.uses.value = value;
    });
    updateData[`data.enhancements.items`] = _enhancements;
    this.item.update(updateData);
  }

  /**
   * Handle rolling of an item from the Actor sheet, obtaining the Item instance and dispatching to it's roll method
   * @private
   */
  _onEnhRoll(event) {
    event.preventDefault();
    const itemId = event.currentTarget.closest(".item").dataset.itemId;
    //const item = this.actor.getOwnedItem(itemId);
    let item = this.ehnancementItemMap.get(itemId);
    return item.roll({}, this.item.actor);
  }

  async _quickItemActionControl(event) {
    event.preventDefault();
    const a = event.currentTarget;
    const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");

    let item = this.ehnancementItemMap.get(itemId);

    // Quick Attack
    if (a.classList.contains("item-attack")) {

      if (this.item.data.data.enhancements.uses.commonPool) {
        if (this.item.data.data.enhancements.uses.value < item.chargeCost) {
          return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoCharges").format(this.name));
        }
      }
      let roll = await item.use({ev: event, skipDialog: event.shiftKey},this.item.actor,this.item.data.data.enhancements.uses.commonPool === true);
      if (roll) {
        if (this.item.data.data.enhancements.uses.commonPool) {
          let updateData = {}
          updateData[`data.enhancements.uses.value`] = this.item.data.data.enhancements.uses.value - item.chargeCost;
          await this.item.update(updateData);
        } else {
          await this.addEnhancementCharges(item, -1*item.chargeCost)
        }
      }
    }
  }

  async addEnhancementCharges(item, charges) {
    let updateData = {}
    let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
    _enhancements.filter(function( obj ) {
      return obj._id === item._id
    }).forEach(i => {
      i.data.uses.value = i.data.uses.value + charges;
    });
    updateData[`data.enhancements.items`] = _enhancements;
    await this.item.update(updateData);
  }

}
