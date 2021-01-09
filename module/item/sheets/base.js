import {createTabs, uuidv4} from "../../lib.js";
import {EntrySelector} from "../../apps/entry-selector.js";
import {ItemPF} from "../entity.js";
import {CACHE} from "../../cache.js";
import {isMinimumCoreVersion} from "../../lib.js";
import {DamageTypes} from "../../damage-types.js";

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
        this._filters = {};

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

        // Include relevant settings
        data.usesImperialSystem = game.settings.get("D35E", "units") === "imperial";

        data.randomUuid = uuidv4();

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
        data.isContainer = this.item.data.data.subType === "container";
        data.owner = this.item.actor != null;
        data.isGM = game.user.isGM;
        data.showIdentifyDescription = data.isGM && data.isPhysical;
        data.showUnidentifiedData = this.item.showUnidentifiedData;
        data.materials = Array.from(CACHE.Materials.values());
        data.damageTypes = Array.from(CACHE.DamageTypes.values());
        data.baseDamageTypes = DamageTypes.getBaseDRDamageTypes()
        data.energyDamageTypes = DamageTypes.getERDamageTypes();

        // Unidentified data
        if (this.item.showUnidentifiedData) {
            data.itemName = getProperty(this.item.data, "data.unidentified.name") || getProperty(this.item.data, "data.identifiedName") || this.item.name;
        } else {
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
            if (data.item.data.featType === 'spellSpecialization')
                data.isSpellSpecialization = true;
        }

        data.is07Xup = isMinimumCoreVersion("0.7.2");

        data.availableContainers = {}
        data.availableContainers['none'] = "None"


        if (this.actor != null) {
            this.actor.items.forEach(i => {
                if (i.data.type === "loot" && i.data.data.subType === "container") {
                    data.availableContainers[i._id] = i.name
                    this.containerMap.set(i._id, i)
                }
            })
        }


        // Prepare weapon specific stuff
        if (data.item.type === "weapon") {
            data.isRanged = (data.item.data.weaponSubtype === "ranged" || data.item.data.properties["thr"] === true);

            // Prepare categories for weapons
            data.weaponCategories = {types: {}, subTypes: {}};
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
            data.enhancementsBase = []
            data.enhancementsFromSpell = []
            data.enhancementsFromBuff = []
            let _enhancements = getProperty(this.item.data, `data.enhancements.items`) || [];
            _enhancements.forEach(e => {
                let item = new ItemPF(e, {owner: this.item.owner})
                this.ehnancementItemMap.set(e._id, item);
                e.hasAction = item.hasAction || item.isCharged;
                e.incorrect = !((e.data.enhancementType === 'weapon' && this.item.type === 'weapon') || (e.data.enhancementType === 'armor' && this.item.type === 'equipment') || (e.data.enhancementType === 'misc'));
                e.hasUses = e.data.uses && (e.data.uses.max > 0);
                e.calcPrice = e.data.enhIncrease !== undefined && e.data.enhIncrease !== null && e.data.enhIncrease > 0 ? `+${e.data.enhIncrease}` : `${e.data.price}`
                e.isCharged = ["day", "week", "charges", "encounter"].includes(getProperty(e, "data.uses.per"));
                data.enhancements.push(e)
                if (e.data.isFromSpell)
                    data.enhancementsFromSpell.push(e)
                else if (e.data.isFromBuff)
                    data.enhancementsFromBuff.push(e)
                else
                    data.enhancementsBase.push(e)
            })
            data.hasEnhancements = true;
            data.lightMagical = (data.item.data.enh || 0) > 0 && (data.item.data.enh || 0) < 6;
            data.veryMagical = (data.item.data.enh || 0) > 5;
        }

        // Prepare enhancement specific stuff
        if (data.item.type === "enhancement") {
            data.enhancementTypes = {types: {}, subTypes: {}};
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
            data.equipmentCategories = {types: {}, subTypes: {}};
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
            data.enhancementsBase = []
            data.enhancementsFromSpell = []
            data.enhancementsFromBuff = []
            let _enhancements = getProperty(this.item.data, `data.enhancements.items`) || [];
            _enhancements.forEach(e => {
                let item = new ItemPF(e, {owner: this.item.owner})
                this.ehnancementItemMap.set(e._id, item);
                e.hasAction = item.hasAction || item.isCharged;
                e.incorrect = !((e.data.enhancementType === 'weapon' && this.item.type === 'weapon') || (e.data.enhancementType === 'armor' && this.item.type === 'equipment') || (e.data.enhancementType === 'misc'));
                e.hasUses = e.data.uses && (e.data.uses.max > 0);
                e.calcPrice = e.data.enhIncrease !== undefined && e.data.enhIncrease !== null && e.data.enhIncrease > 0 ? `+${e.data.enhIncrease}` : `${e.data.price}`
                e.isCharged = ["day", "week", "charges", "encounter"].includes(getProperty(e, "data.uses.per"));
                data.enhancements.push(e)
                if (e.data.isFromSpell)
                    data.enhancementsFromSpell.push(e)
                else if (e.data.isFromBuff)
                    data.enhancementsFromBuff.push(e)
                else
                    data.enhancementsBase.push(e)
            })
            data.hasEnhancements = true;
        }

        // Prepare attack specific stuff
        if (data.item.type === "attack") {
            data.isWeaponAttack = data.item.data.attackType === "weapon";
            data.isNaturalAttack = data.item.data.attackType === "natural";
        }

        if (data.item.data.weight) {
            const conversion = game.settings.get("D35E", "units") === "metric" ? 0.5 : 1;
            data.convertedWeight = data.item.data.weight * conversion;
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
                addedAbilities: []
            }

            let alreadyAddedAbilities = new Set();

            {
                let spellLikes = game.packs.get("D35E.spelllike");
                let spellikeItems = []
                await spellLikes.getIndex().then(index => spellikeItems = index);
                for (let entry of spellikeItems) {
                    await spellLikes.getEntity(entry._id).then(e => {
                            if (e.data.data.tags.some(el => el[0] === this.item.data.name)) {
                                data.children.spelllikes.push(e);
                                this.childItemMap.set(entry._id, e);
                            }
                        }
                    )
                }

            }

            {

                for (let e of new Set(CACHE.RacialFeatures.get(this.item.data.name) || [])) {
                    if (e.data.data.tags.some(el => el[0] === this.item.data.name)) {
                        data.children.abilities.push({
                            item:e,
                            pack:e.pack,
                            disabled: (this.item.data.data.disabledAbilities || []).some(obj => obj.uid === e.data.data.uniqueId)
                        });
                        this.childItemMap.set(e._id, e);
                    }

                }

            }

            for (let ability of this.item.data.data.addedAbilities || []) {
                let e = CACHE.AllAbilities.get(ability.uid);
                data.children.addedAbilities.push({
                    item:e,
                    pack:e.pack,
                });
                if (e.data.data.uniqueId.indexOf("*" === -1)) alreadyAddedAbilities.add(e.data.data.uniqueId)
            }

            data.allAbilities = []
            for (var e of CACHE.AllAbilities.values()) {
                if (!alreadyAddedAbilities.has(e.data.data.uniqueId))
                    data.allAbilities.push(e);
            }
        }


        if (data.item.type === "buff") {
            data.hasCombatChanges = true;
        }
        if (data.item.type === "feat") {
            data.isFeat = data.item.data.featType === "feat"
            data.hasCombatChanges = true;
            data.featCounters = []
            if (this.item.actor) {
                for (let [a, s] of Object.entries(this.item.actor.data.data.counters.feat || [])) {
                    if (a === "base") continue;
                    data.featCounters.push({name: a.charAt(0).toUpperCase() + a.substr(1).toLowerCase(), val: a})
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
            Object.keys(data.data.powerPointTable).forEach(key => {
                data.powerPointLevels[key] = {
                    value: data.data.powerPointTable[key],
                    known: data.data.powersKnown !== undefined ? data.data.powersKnown[key] || 0 : 0,
                    maxLevel: data.data.powersMaxLevel !== undefined ? data.data.powersMaxLevel[key] || 0 : 0
                }
            })

            data.powerPointBonusBaseAbility = data.data.powerPointBonusBaseAbility
            data.abilities = {}
            for (let [a, s] of Object.entries(CONFIG.D35E.abilities)) {
                data.abilities[a] = {}
                data.abilities[a].label = s;
            }
            data.hasMaxLevel = data.data.maxLevel !== undefined && data.data.maxLevel !== null && data.data.maxLevel !== "" && data.data.maxLevel !== 0;
            data.isBaseClass = data.data.classType === "base";
            data.isRacialHD = data.data.classType === "racial";
            data.isTemplate = data.data.classType === "template";
            data.isPsionSpellcaster = data.data.spellcastingType === "psionic";
            data.isSpellcaster = data.data.spellcastingType !== undefined && data.data.spellcastingType !== null && data.data.spellcastingType !== "none";
            data.isNonPsionSpellcaster = data.isSpellcaster && !data.isPsionSpellcaster
            data.progression = []
            data.spellProgression = []
            data.knownSpellProgression = []
            data.childItemLevels = new Map()
            data.children = {
                spelllikes: [],
                abilities: [],
                traits: [],
                addedAbilities: []
            }
            let alreadyAddedAbilities = new Set();
            let alreadyAddedDescriptions = new Set();
            data.abilitiesDescription = []
            {
                for (let e of new Set(CACHE.ClassFeatures.get(this.item.data.name) || [])) {

                    this.childItemMap.set(e._id, e);

                    let levels = e.data.data.associations.classes.filter(el => el[0] === this.item.data.name)
                    for (let _level of levels) {
                        const level = _level[1]
                        if (!data.childItemLevels.has(level)) {
                            data.childItemLevels.set(level, [])
                        }
                        let _e = {
                            item:e,
                            level:level,
                            pack:e.pack,
                            disabled: (this.item.data.data.disabledAbilities || []).some(obj => parseInt(obj.level || "0") === level && obj.uid === e.data.data.uniqueId)
                        }
                        data.children.abilities.push(_e);
                        data.childItemLevels.get(level).push(_e);
                        if (e.data.data.uniqueId.indexOf("*") === -1) alreadyAddedAbilities.add(e.data.data.uniqueId)
                        if (e.data.data.description.value !== "" && !alreadyAddedDescriptions.has(e._id)) {
                            data.abilitiesDescription.push({
                                level: level,
                                name: e.name,
                                description: TextEditor.enrichHTML(e.data.data.description.value)
                            })
                            alreadyAddedDescriptions.add(e._id)
                        }

                    }
                }

                for (let ability of this.item.data.data.addedAbilities || []) {
                    let e = CACHE.AllAbilities.get(ability.uid);
                    let _e = {
                        item:e,
                        level:ability.level,
                        pack:e.pack,
                    }
                        data.children.addedAbilities.push(_e);
                    if (!data.childItemLevels.has(ability.level)) {
                        data.childItemLevels.set(ability.level, [])
                    }
                    data.childItemLevels.get(ability.level).push(_e);
                    if (e.data.data.uniqueId.indexOf("*") === -1) alreadyAddedAbilities.add(e.data.data.uniqueId)
                    if (e.data.data.description.value !== "" && !alreadyAddedDescriptions.has(e._id)) {
                        data.abilitiesDescription.push({
                            level: ability.level,
                            name: e.name,
                            description: TextEditor.enrichHTML(e.data.data.description.value)
                        })
                        alreadyAddedDescriptions.add(e._id)
                    }
                }

            }

            data.allAbilities = []
            for (var e of CACHE.AllAbilities.values()) {
                if (!alreadyAddedAbilities.has(e.data.data.uniqueId) || e.data.data.uniqueId.indexOf("*") !== -1)
                    data.allAbilities.push(e);
            }


            for (let level = 1; level < data.data.maxLevel + 1; level++) {
                let progressionData = {}
                let spellProgressionData = {}
                let knownSpellProgressionData = {}

                progressionData.level = level
                spellProgressionData.level = level
                knownSpellProgressionData.level = level
                for (let a of ['fort', 'ref', 'will']) {
                    const classType = getProperty(data.data, "classType") || "base";

                    let formula = CONFIG.D35E.classSavingThrowFormulas[classType][data.data.savingThrows[a].value] != null ? CONFIG.D35E.classSavingThrowFormulas[classType][data.data.savingThrows[a].value] : "0";
                    progressionData[a] = Math.floor(new Roll(formula, {level: level}).roll().total);
                }
                {
                    const formula = CONFIG.D35E.classBABFormulas[data.data.bab] != null ? CONFIG.D35E.classBABFormulas[data.data.bab] : "0";
                    let bab = Math.floor(new Roll(formula, {level: level}).roll().total);
                    let babModifiers = []
                    while (bab > 0) {
                        babModifiers.push("+" + bab);
                        bab-=5
                    }
                    progressionData.bab = babModifiers.join("/");
                }
                progressionData.abilities = data.childItemLevels.get(level)
                progressionData.hasNonActive = false
                data.progression.push(progressionData)
                data.hasKnownSpells = false;
                if (data.isSpellcaster) {
                    for (let spellLevel = 0; spellLevel <= 9; spellLevel++) {
                        if (getProperty(data.data, "spellsPerLevel") !== undefined && getProperty(data.data, "spellsPerLevel")[level - 1]) {
                            let spellPerLevel = getProperty(data.data, "spellsPerLevel")[level - 1][spellLevel + 1];
                            spellProgressionData[`spells${spellLevel}`] = spellPerLevel !== undefined && parseInt(spellPerLevel) !== -1 ? spellPerLevel : "-"
                        }
                        if (getProperty(data.data, "spellsKnownPerLevel") !== undefined && getProperty(data.data, "spellsKnownPerLevel")[level - 1]) {
                            let spellPerLevel = getProperty(data.data, "spellsKnownPerLevel")[level - 1][spellLevel + 1];
                            knownSpellProgressionData[`spells${spellLevel}`] = spellPerLevel !== undefined && parseInt(spellPerLevel) !== -1 ? spellPerLevel : "-"
                            data.hasKnownSpells = true;
                        }
                    }
                    data.spellProgression.push(spellProgressionData)
                    data.knownSpellProgression.push(knownSpellProgressionData)
                }
            }


            if (data.data.nonActiveClassAbilities !== undefined && data.data.nonActiveClassAbilities !== null) {
                data.data.nonActiveClassAbilities.forEach(a => {
                    if (a[0] !== 0) {
                        if (data.progression[a[0] - 1]['nonActive'] === undefined) {
                            data.progression[a[0] - 1]['nonActive'] = [];
                            data.progression[a[0] - 1].hasNonActive = true;
                        }
                        data.progression[a[0] - 1]['nonActive'].push({'name': a[1], 'desc': a[2]});
                    }
                    if (a[2] !== '') {
                        data.abilitiesDescription.push({level: a[0], name: a[1], description: TextEditor.enrichHTML(a[2])})
                    }
                })
            }

            data.abilitiesDescription.sort((a, b) => (a.level > b.level) ? 1 : ((b.level > a.level) ? -1 : 0));

            if (this.actor != null) {
                let healthConfig = game.settings.get("D35E", "healthConfig");
                data.healthConfig = data.isRacialHD ? healthConfig.hitdice.Racial : this.actor.data.type === "character" ? healthConfig.hitdice.PC : healthConfig.hitdice.NPC;
            } else data.healthConfig = {auto: false};

            // Add skill list
            if (!this.item.actor) {
                data.skills = Object.entries(CONFIG.D35E.skills).reduce((cur, o) => {
                    cur[o[0]] = {
                        name: o[1],
                        classSkill: getProperty(this.item.data, `data.classSkills.${o[0]}`) === true
                    };
                    return cur;
                }, {});
            } else {
                data.skills = Object.entries(this.item.actor.data.data.skills).reduce((cur, o) => {
                    const key = o[0];
                    const name = CONFIG.D35E.skills[key] != null ? CONFIG.D35E.skills[key] : o[1].name;
                    cur[o[0]] = {
                        name: name,
                        classSkill: getProperty(this.item.data, `data.classSkills.${o[0]}`) === true
                    };
                    return cur;
                }, {});
            }
        }

        // Prepare stuff for items with changes
        if (data.item.data.changes) {
            data.changes = {targets: {}, modifiers: CONFIG.D35E.bonusModifiers};
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

        // Prepare stuff for attacks with conditionals
        if (data.item.data.conditionals) {
            data.conditionals = { targets: {}, conditionalModifierTypes: {} };
            for (const conditional of data.item.data.conditionals) {
                for (const modifier of conditional.modifiers) {
                    modifier.targets = this.item.getConditionalTargets();
                    modifier.subTargets = this.item.getConditionalSubTargets(modifier.target);
                    modifier.conditionalModifierTypes = this.item.getConditionalModifierTypes(modifier.target);
                    modifier.conditionalCritical = this.item.getConditionalCritical(modifier.target);
                    modifier.isAttack = modifier.target === "attack";
                    modifier.isDamage = modifier.target === "damage";
                    modifier.isSpell = modifier.target === "spell";
                }
            }
        }


        // Prepare stuff for items with context notes
        if (data.item.data.contextNotes) {
            data.contextNotes = {targets: {}};
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
                            } else {
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
        if (item.type === "spell") {
            if (item.data.preparation.mode === "prepared") {
                return item.data.preparation.preparedAmount > 0 ? game.i18n.localize("D35E.AmountPrepared").format(item.data.preparation.preparedAmount) : game.i18n.localize("D35E.Unprepared");
            } else if (item.data.preparation.mode) {
                return item.data.preparation.mode.titleCase();
            } else return "";
        } else if (["weapon", "equipment"].includes(item.type)) return item.data.equipped ? game.i18n.localize("D35E.Equipped") : game.i18n.localize("D35E.NotEquipped");
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

        if (item.type === "weapon") {
            props.push(...Object.entries(item.data.properties)
                .filter(e => e[1] === true)
                .map(e => CONFIG.D35E.weaponProperties[e[0]]));
        } else if (item.type === "spell") {
            props.push(
                labels.components,
                labels.materials
            )
        }

        if (item.type === "enhancement") {
            props.push(...Object.entries(item.data.allowedTypes)
                .map(e => e[1]));
        } else if (item.type === "equipment") {
            props.push(CONFIG.D35E.equipmentTypes[item.data.armor.type]);
            props.push(labels.armor);
        } else if (item.type === "feat") {
            props.push(labels.featType);
        }

        // Action type
        if (item.data.actionType) {
            props.push(CONFIG.D35E.itemActionTypes[item.data.actionType]);
        }

        // Action usage
        if ((item.type !== "weapon") && item.data.activation && !isObjectEmpty(item.data.activation)) {
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

    setPosition(position = {}) {
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
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        // Handle Attack Array
        let attacks = Object.entries(formData).filter(e => e[0].startsWith("data.attackParts"));
        formData["data.attackParts"] = attacks.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        // Handle conditionals array
        let conditionals = Object.entries(formData).filter((e) => e[0].startsWith("data.conditionals"));
        formData["data.conditionals"] = conditionals.reduce((arr, entry) => {
            let [i, j, k] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = ItemPF.defaultConditional;
            if (k) {
                const target = formData[`data.conditionals.${i}.${j}.target`];
                if (!arr[i].modifiers[j]) arr[i].modifiers[j] = ItemPF.defaultConditionalModifier;
                arr[i].modifiers[j][k] = entry[1];
                // Target dependent keys
                if (["subTarget", "critical", "type"].includes(k)) {
                    const target = (conditionals.find((o) => o[0] === `data.conditionals.${i}.${j}.target`) || [])[1];
                    const val = entry[1];
                    if (typeof target === "string") {
                        let keys;
                        switch (k) {
                            case "subTarget":
                                keys = Object.keys(this.item.getConditionalSubTargets(target));
                                break;
                            case "type":
                                keys = Object.keys(this.item.getConditionalModifierTypes(target));
                                break;
                            case "critical":
                                keys = Object.keys(this.item.getConditionalCritical(target));
                                break;
                        }
                        // Reset subTarget, non-damage type, and critical if necessary
                        if (!keys.includes(val) && target !== "damage" && k !== "type") arr[i].modifiers[j][k] = keys[0];
                    }
                }
            } else {
                arr[i][j] = entry[1];
            }
            return arr;
        }, []);


        // Handle change array
        let change = Object.entries(formData).filter(e => e[0].startsWith("data.changes"));
        formData["data.changes"] = change.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        let changes = Object.entries(formData).filter(e => e[0].startsWith("data.combatChanges"));
        formData["data.combatChanges"] = changes.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        let resistances = Object.entries(formData).filter(e => e[0].startsWith("data.resistances"));
        formData["data.resistances"] = resistances.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        let damageReduction = Object.entries(formData).filter(e => e[0].startsWith("data.damageReduction"));
        formData["data.damageReduction"] = damageReduction.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        // Handle notes array
        let note = Object.entries(formData).filter(e => e[0].startsWith("data.contextNotes"));
        formData["data.contextNotes"] = note.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = [];
            arr[i][j] = entry[1];
            return arr;
        }, []);

        let actions = Object.entries(formData).filter(e => e[0].startsWith("data.specialActions"));
        formData["data.specialActions"] = actions.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = {name: "", action: ""};

            arr[i][j] = entry[1];
            return arr;
        }, []);

        let activateActions = Object.entries(formData).filter(e => e[0].startsWith("data.activateActions"));
        formData["data.activateActions"] = activateActions.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = {name: "", action: ""};

            arr[i][j] = entry[1];
            return arr;
        }, []);

        let deactivateActions = Object.entries(formData).filter(e => e[0].startsWith("data.deactivateActions"));
        formData["data.deactivateActions"] = deactivateActions.reduce((arr, entry) => {
            let [i, j] = entry[0].split(".").slice(2);
            if (!arr[i]) arr[i] = {name: "", action: ""};

            arr[i][j] = entry[1];
            return arr;
        }, []);

        // Update the Item

        if (this.containerMap.has(formData['data.containerId'])) {
            formData['data.container'] = this.containerMap.get(formData['data.containerId']).name
            formData['data.containerWeightless'] = this.containerMap.get(formData['data.containerId']).data.data.bagOfHoldingLike
        } else {
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
                    "configuration": {},
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

        // Modify custom fields
        html.find(".custom-field-control").click(this._onCustomFieldControl.bind(this));

        // Modify special formula
        html.find(".special-control").click(this._onSpecialControl.bind(this));
        html.find(".a-special-control").click(this._onActivateSpecialControl.bind(this));
        html.find(".d-special-control").click(this._onDeactivateSpecialControl.bind(this));

        // Modify damage formula
        html.find(".damage-control").click(this._onDamageControl.bind(this));

        // Modify buff changes
        html.find(".change-control").click(this._onChangeControl.bind(this));
        html.find(".combat-change-control").click(this._onCombatChangeControl.bind(this));
        html.find(".resistance-control").click(this._onResistanceControl.bind(this));
        html.find(".dr-control").click(this._onDRControl.bind(this));


        // Modify note changes
        html.find(".context-note-control").click(this._onNoteControl.bind(this));

        // Create attack
        if (["weapon"].includes(this.item.data.type)) {
            html.find("button[name='create-attack']").click(this._createAttack.bind(this));
        }

        if (["feat"].includes(this.item.data.type)) {
            html.find("button[name='add-domain-spells']").click(this._addSpellsToSpellbook.bind(this));
        }


        // Modify conditionals
        html.find(".conditional-control").click(this._onConditionalControl.bind(this));


        // Listen to field entries
        html.find(".entry-selector").click(this._onEntrySelector.bind(this));


        // Item summaries
        html.find('.item .child-item h4').click(event => this._onChildItemSummary(event));
        html.find('.item .enh-item h4').click(event => this._onEnhItemSummary(event));
        html.find('.item a.disable-ability').click(event => this._onDisableAbility(event));
        html.find('.item a.enable-ability').click(event => this._onEnableAbility(event));
        html.find('.item a.delete-ability').click(event => this._onDeleteAbility(event));
        html.find('.item a.add-ability').click(event => this._onAddAbility(event));
        html.find(".item .change-class-ability-level").off("change").change(this._onAbilityLevelChange.bind(this));


        html.find('.view-details-material').click(event => this._onMaterialItemSummary(event));

        let handler = ev => this._onDragStart(ev);
        html.find('li.item').each((i, li) => {
            if (li.classList.contains("inventory-header")) return;
            li.setAttribute("draggable", true);
            li.addEventListener("dragstart", handler, false);
        });


        html.find('.spell').on("drop", this._onDropSpell.bind(this));
        html.find('.full-attack').on("drop", this._onDropFullAttack.bind(this));
        html.find('div[data-tab="enhancements"]').on("drop", this._onDrop.bind(this));

        html.find('div[data-tab="enhancements"] .item-delete').click(this._onEnhItemDelete.bind(this));
        html.find("div[data-tab='enhancements'] .item-detail.item-uses input.uses").off("change").change(this._setEnhUses.bind(this));
        html.find("div[data-tab='enhancements'] .item-detail.item-uses input.maxuses").off("change").change(this._setEnhMaxUses.bind(this));
        html.find("div[data-tab='enhancements'] .item-detail.item-per-use input[type='text']:not(:disabled)").off("change").change(this._setEnhPerUse.bind(this));
        html.find("div[data-tab='enhancements'] .item-detail.item-enh input[type='text']:not(:disabled)").off("change").change(this._setEnhValue.bind(this));

        html.find('div[data-tab="enhancements"] .item-edit').click(this._onItemEdit.bind(this));
        html.find('div[data-tab="enhancements"] .item .item-image').click(event => this._onEnhRoll(event));
        html.find("button[name='update-item-name']").click(event => this._onEnhUpdateName(event));

        // Quick Item Action control
        html.find(".item-actions a").mouseup(ev => this._quickItemActionControl(ev));

        html.find(".search-list").on("change", event => event.stopPropagation());

        // Conditional Dragging
        html.find("li.conditional").each((i, li) => {
            li.setAttribute("draggable", true);
            li.addEventListener("dragstart", (ev) => this._onDragConditionalStart(ev), false);
        });

        // Conditional Dropping
        html.find('div[data-tab="conditionals"]').on("drop", this._onConditionalDrop.bind(this));

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
        if (a.classList.contains("add-damage")) {
            await this._onSubmit(event);  // Submit any unsaved changes
            const damage = this.item.data.data.damage;
            return this.item.update({"data.damage.parts": damage.parts.concat([["", ""]])});
        }

        // Remove a damage component
        if (a.classList.contains("delete-damage")) {
            await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".damage-part");
            const damage = duplicate(this.item.data.data.damage);
            damage.parts.splice(Number(li.dataset.damagePart), 1);
            return this.item.update({"data.damage.parts": damage.parts});
        }
    }

    generateId() {
        return '_' + Math.random().toString(36).substr(2, 9);
    };

    async _onCustomFieldControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new attack component
        if (a.classList.contains("add")) {
            await this._onSubmit(event);  // Submit any unsaved changes
            let _customAttributes = duplicate(this.item.data.data.customAttributes || {});
            let newAttribute = {id: this.generateId(),name:'',value:''};
            _customAttributes[newAttribute.id] = newAttribute;
            console.log(`D35E | Adding custom attribute | `,_customAttributes)
            return this.item.update({"data.customAttributes": _customAttributes});
        }

        // Remove an attack component
        if (a.classList.contains("delete")) {
            await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".custom-field");
            console.log(`D35E | Removing custom attribute | ${li.dataset.customField}`, this.item.data.data.customAttributes)
            const updateData = {};
            updateData[`data.customAttributes.-=${li.dataset.customField}`] = null;
            return this.item.update(updateData);
        }
    }

    async _onAttackControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new attack component
        if (a.classList.contains("add-attack")) {
            await this._onSubmit(event);  // Submit any unsaved changes
            const attackParts = this.item.data.data.attackParts;
            return this.item.update({"data.attackParts": attackParts.concat([["", ""]])});
        }

        // Remove an attack component
        if (a.classList.contains("delete-attack")) {
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
        if (a.classList.contains("add-special")) {
            await this._onSubmit(event);  // Submit any unsaved changes
            let specialActions = this.item.data.data.specialActions;
            if (specialActions === undefined)
                specialActions = []
            return this.item.update({
                "data.specialActions": specialActions.concat([[{
                    name: "",
                    action: "",
                    range: "",
                    img: "",
                    condition: ""
                }]])
            });
        }

        // Remove an attack component
        if (a.classList.contains("delete-special")) {
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
        if (a.classList.contains("add-special")) {
            await this._onSubmit(event);  // Submit any unsaved changes
            let activateActions = this.item.data.data.activateActions;
            if (activateActions === undefined)
                activateActions = []
            return this.item.update({
                "data.activateActions": activateActions.concat([[{
                    name: "",
                    action: "",
                    range: "",
                    img: "",
                    condition: ""
                }]])
            });
        }

        // Remove an attack component
        if (a.classList.contains("delete-special")) {
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
        if (a.classList.contains("add-special")) {
            await this._onSubmit(event);  // Submit any unsaved changes
            let deactivateActions = this.item.data.data.deactivateActions;
            if (deactivateActions === undefined)
                deactivateActions = []
            return this.item.update({
                "data.deactivateActions": deactivateActions.concat([[{
                    name: "",
                    action: "",
                    range: "",
                    img: "",
                    condition: ""
                }]])
            });
        }

        // Remove an attack component
        if (a.classList.contains("delete-special")) {
            await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".special-part");
            const deactivateActions = duplicate(this.item.data.data.deactivateActions);
            deactivateActions.splice(Number(li.dataset.deactivateActions), 1);
            return this.item.update({"data.deactivateActions": deactivateActions});
        }
    }

    async _onChangeControl(event) {
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

    async _onCombatChangeControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new change
        if (a.classList.contains("add-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const changes = this.item.data.data.combatChanges || [];
            // Combat Changes are
            return this.item.update({"data.combatChanges": changes.concat([["", "", "", "", "", 0]])});
        }

        // Remove a change
        if (a.classList.contains("delete-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".change");
            const changes = duplicate(this.item.data.data.combatChanges);
            changes.splice(Number(li.dataset.change), 1);
            return this.item.update({"data.combatChanges": changes});
        }
    }

    async _onResistanceControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new change
        if (a.classList.contains("add-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const changes = this.item.data.data.resistances || [];
            // Combat Changes are
            return this.item.update({"data.resistances": changes.concat([["", "", false, false]])});
        }

        // Remove a change
        if (a.classList.contains("delete-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".change");
            const changes = duplicate(this.item.data.data.resistances);
            changes.splice(Number(li.dataset.change), 1);
            return this.item.update({"data.resistances": changes});
        }
    }

    async _onDRControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new change
        if (a.classList.contains("add-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const changes = this.item.data.data.damageReduction || [];
            // Combat Changes are
            return this.item.update({"data.damageReduction": changes.concat([["", ""]])});
        }

        // Remove a change
        if (a.classList.contains("delete-change")) {
            //await this._onSubmit(event);  // Submit any unsaved changes
            const li = a.closest(".change");
            const changes = duplicate(this.item.data.data.damageReduction);
            changes.splice(Number(li.dataset.change), 1);
            return this.item.update({"data.damageReduction": changes});
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

    async _addSpellsToSpellbook(event) {
        if (this.item.actor == null) throw new Error(game.i18n.localize("D35E.ErrorItemNoOwner"));
        await this.item.actor.addSpellsToSpellbook(this.item);

    }

    _onEntrySelector(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const options = {
            name: a.getAttribute("for"),
            isProgression: a.getAttribute("data-progression"),
            title: a.innerText,
            fields: a.dataset.fields,
            dtypes: a.dataset.dtypes,
        };
        new EntrySelector(this.item, options).render(true);
    }

    async saveMCEContent(updateData = null) {
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

    async _onAbilityLevelChange(event) {
        event.preventDefault();
        let li = $(event.currentTarget).parents(".item-box"),
            uid = li.attr("data-item-uid"),
            level = li.attr("data-item-level"),
            pack = li.attr("data-pack");

        let updateData = {}
        const value = Number(event.currentTarget.value);
        let _addedAbilities = duplicate(getProperty(this.item.data, `data.addedAbilities`) || []);
        _addedAbilities.filter(function (obj) {
            return (obj.uid === uid && (level === "" || parseInt(obj.level) === parseInt(level)))
        }).forEach(i => {
            i.level = value;
        });
        updateData[`data.addedAbilities`] = _addedAbilities;
        this.item.update(updateData);
    }

    async _onAddAbility(event) {
        event.preventDefault();
        let li = $(event.currentTarget).parents(".item-box"),
            uid = li.attr("data-item-uid"),
            level = li.attr("data-item-level"),
            pack = li.attr("data-pack");

        let updateData = {}
        let _addedAbilities = duplicate(getProperty(this.item.data, `data.addedAbilities`) || []);
        _addedAbilities.push({uid: uid, level: 0})
        updateData[`data.addedAbilities`] = _addedAbilities;
        await this.item.update(updateData);
    }

    async _onDeleteAbility(event) {
        event.preventDefault();
        let li = $(event.currentTarget).parents(".item-box"),
            uid = li.attr("data-item-uid"),
            level = li.attr("data-item-level"),
            pack = li.attr("data-pack");

        let updateData = {}
        let _addedAbilities = duplicate(getProperty(this.item.data, `data.addedAbilities`) || []);
        _addedAbilities = _addedAbilities.filter(function (obj) {
            return !(obj.uid === uid && (level === "" || parseInt(obj.level) === parseInt(level)));
        });
        updateData[`data.addedAbilities`] = _addedAbilities;
        await this.item.update(updateData);
    }
    async _onEnableAbility(event) {
        event.preventDefault();
        let li = $(event.currentTarget).parents(".item-box"),
            uid = li.attr("data-item-uid"),
            level = li.attr("data-item-level"),
            pack = li.attr("data-pack");

        let updateData = {}
        let _disabledAbilities = duplicate(getProperty(this.item.data, `data.disabledAbilities`) || []);
        _disabledAbilities = _disabledAbilities.filter(function (obj) {
            return !(obj.uid === uid && (level === "" || parseInt(obj.level) === parseInt(level)));
        });
        updateData[`data.disabledAbilities`] = _disabledAbilities;
        await this.item.update(updateData);
    }

    async _onDisableAbility(event) {
        event.preventDefault();
        let li = $(event.currentTarget).parents(".item-box"),
            uid = li.attr("data-item-uid"),
            level = li.attr("data-item-level"),
            pack = li.attr("data-pack");
        let updateData = {}
        let _disabledAbilities = duplicate(getProperty(this.item.data, `data.disabledAbilities`) || []);
        _disabledAbilities.push({uid: uid, level: level})
        updateData[`data.disabledAbilities`] = _disabledAbilities;
        await this.item.update(updateData);
    }

    _onChildItemSummary(event) {
        event.preventDefault();
        let li = $(event.currentTarget).parents(".item-box"),
            item = CACHE.AllAbilities.get(li.attr("data-item-uid")),
            pack = this.childItemMap.get(li.attr("data-pack"));


        item.sheet.render(true);
    }

    _onMaterialItemSummary(event) {
        event.preventDefault();
        let li = $(event.currentTarget).parents(".item-box"),
            item = CACHE.Materials.get(this.item.data.data.material.data.uniqueId),
            pack = this.childItemMap.get(li.attr("data-pack"));


        item.sheet.render(true);
    }

    _onEnhItemSummary(event) {
        event.preventDefault();
        let li = $(event.currentTarget).parents(".item-box"),
            item = this.ehnancementItemMap.get(li.attr("data-item-id")),
            chatData = item.getChatData({secrets: this.actor ? this.actor.owner : false});

        // Toggle summary
        if (li.hasClass("expanded")) {
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
        const packName = li.getAttribute('data-pack');
        const pack = game.packs.get(packName);
        // console.log(event)
        if (!pack) return;
        // Set the transfer data
        event.dataTransfer.setData("text/plain", JSON.stringify({
            type: pack.entity,
            pack: pack.collection,
            id: li.getAttribute('data-item-id')
        }));
    }

    async _onDropFullAttack(event) {
        event.preventDefault();
        let attackId = $(event.delegateTarget).attr('data-attack')
        let data;

        try {
            data = JSON.parse(event.originalEvent.dataTransfer.getData('text/plain'));
            if (data.type !== "Item") return;
        } catch (err) {
            return false;
        }

        if (!data.actorId) {
            return ui.notifications.warn(game.i18n.localize("D35E.FullAttackNeedDropFromActor"));
        }
        if (data.type === "Item" && data?.data?.type === "attack") {
            let updateData = {}
            updateData[`data.attacks.${attackId}.id`] = data.data._id;
            updateData[`data.attacks.${attackId}.name`] = data.data.name;
            updateData[`data.attacks.${attackId}.img`] = data.data.img;
            updateData[`data.attacks.${attackId}.count`] = 1;
            updateData[`data.attacks.${attackId}.primary`] = data.data.data.attackType === "natural" && data.data.data.primaryAttack;
            updateData[`data.attacks.${attackId}.isWeapon`] = data.data.data.attackType === "weapon";
            this.item.update(updateData)
        }
    }

    async _onDropSpell(event) {
        event.preventDefault();
        let spellLevel = $(event.delegateTarget).attr('data-spell')
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
            if (data.pack) {
                let updateData = {}
                dataType = "compendium";
                const pack = game.packs.find(p => p.collection === data.pack);
                const packItem = await pack.getEntity(data.id);
                if (packItem != null) 
                {
                    itemData = packItem.data;
                    updateData[`data.spellSpecialization.spells.${spellLevel}.id`] = data.id;
                    updateData[`data.spellSpecialization.spells.${spellLevel}.pack`] = data.pack;
                    updateData[`data.spellSpecialization.spells.${spellLevel}.name`] = packItem.name;
                    updateData[`data.spellSpecialization.spells.${spellLevel}.img`] = packItem.img;
                    this.item.update(updateData)
                }
            }
        }


    }

    async _onDrop(event) {
        event.preventDefault();
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
        if (itemData.type === 'enhancement') {
            const updateData = {};
            let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
            const enhancement = duplicate(itemData)
            if (enhancement._id) enhancement._id = this.item._id + "-" + itemData._id;
            _enhancements.push(enhancement);
            this.updateMagicItemName(updateData, _enhancements);
            this.updateMagicItemProperties(updateData, _enhancements);
            updateData[`data.enhancements.items`] = _enhancements;
            await this.item.update(updateData);
        }
        if (itemData.type === 'spell') {
            this._createEnhancementSpellDialog(itemData)
        }
        if (itemData.type === 'buff') {
            await this.createEnhBuff(itemData)
        }


    }




    _createEnhancementSpellDialog(itemData) {
        new Dialog({
            title: game.i18n.localize("D35E.CreateEnhForSpell").format(itemData.name),
            content: game.i18n.localize("D35E.CreateEnhForSpellD").format(itemData.name),
            buttons: {
                potion: {
                    icon: '<i class="fas fa-prescription-bottle"></i>',
                    label: "50 Charges",
                    callback: () => this.createEnhSpell(itemData, "charges"),
                },
                scroll: {
                    icon: '<i class="fas fa-scroll"></i>',
                    label: "Per Day (Command Word)",
                    callback: () => this.createEnhSpell(itemData, "command"),
                },
                wand: {
                    icon: '<i class="fas fa-magic"></i>',
                    label: "Per Day (Use)",
                    callback: () => this.createEnhSpell(itemData, "use"),
                },
            },
            default: "command",
        }).render(true);
    }

    async createEnhSpell(itemData, type) {
        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
        let enhancement = await ItemPF.toEnhancement(itemData, type);
        if (enhancement.id) enhancement._id = this.item._id + "-" + enhancement.id;
        _enhancements.push(enhancement);
        this.updateMagicItemName(updateData, _enhancements);
        this.updateMagicItemProperties(updateData, _enhancements);
        updateData[`data.enhancements.items`] = _enhancements;
        await this.item.update(updateData);
    }

    async createEnhBuff(itemData) {
        const updateData = {};
        let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
        let enhancement = await ItemPF.toEnhancementBuff(itemData);
        if (enhancement.id) enhancement._id = this.item._id + "-" + enhancement.id;
        _enhancements.push(enhancement);
        this.updateMagicItemName(updateData, _enhancements);
        this.updateMagicItemProperties(updateData, _enhancements);
        updateData[`data.enhancements.items`] = _enhancements;
        await this.item.update(updateData);
    }

    updateMagicItemName(updateData, _enhancements, force = false) {

        if ((this.item.data.data.enhancements !== undefined && this.item.data.data.enhancements.automation !== undefined && this.item.data.data.enhancements.automation !== null) || force) {
            if (this.item.data.data.enhancements.automation.updateName || force) {
                let baseName = this.item.data.data.unidentified.name
                if (this.item.data.data.unidentified.name === '') {
                    updateData[`data.unidentified.name`] = this.item.name;
                    baseName = this.item.name
                }
                updateData[`data.identifiedName`] = this.buildName(baseName, _enhancements)
            }
        }
    }

    // This updates not only price, but also physical properties
    updateMagicItemProperties(updateData, _enhancements, force = false) {
        if ((this.item.data.data.enhancements !== undefined && this.item.data.data.enhancements.automation !== undefined && this.item.data.data.enhancements.automation !== null) || force) {
            if (this.item.data.data.enhancements.automation.updateName || force) {
                let basePrice = this.item.data.data.unidentified.price
                if (this.item.data.data.unidentified.price === 0) {
                    updateData[`data.unidentified.price`] = this.item.data.data.price;
                    basePrice = this.item.data.data.price
                }
                updateData[`data.price`] = this.buildPrice(basePrice, _enhancements)
            }
        }
    }

    buildName(name, enhancements) {
        let prefixes = []
        let suffixes = []
        let totalEnchancement = 0;
        for (const obj of enhancements) {
            if (obj.data.nameExtension !== undefined && obj.data.nameExtension !== null) {
                if (obj.data.nameExtension.prefix !== null && obj.data.nameExtension.prefix.trim() !== "") prefixes.push(obj.data.nameExtension.prefix.trim())
                if (obj.data.nameExtension.suffix !== null && obj.data.nameExtension.suffix.trim() !== "") suffixes.push(obj.data.nameExtension.suffix.trim())
            }

            if (obj.data.enhancementType === "weapon" && this.item.type === 'weapon')
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
            if (obj.data.enhancementType === "armor" && this.item.type === 'equipment')
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
        }
        let enhSuffix = ''
        let ofSuffix = ''
        if (totalEnchancement > 0)
            enhSuffix = ` +${totalEnchancement}`
        if (suffixes.length > 0) {
            ofSuffix = ` of ${suffixes.join(' and ').trim()}`
        }
        return `${prefixes.join(' ')} ${name}${ofSuffix}`.trim() + `${enhSuffix}`
    }

    buildPrice(basePrice, enhancements) {
        let totalPrice = basePrice;
        let totalEnchancementIncrease = 0;
        let totalEnchancement = 0;
        let maxSingleEnhancementIncrease = 0;
        let flatPrice = 0;
        for (const obj of enhancements) {
            if (obj.data.enhancementType === "weapon" && this.item.type === 'weapon') {
                totalEnchancementIncrease += obj.data.enhIncrease
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
                flatPrice += obj.data.price
                maxSingleEnhancementIncrease = Math.max(obj.data.enhIncrease, maxSingleEnhancementIncrease)
            }
            if (obj.data.enhancementType === "armor" && this.item.type === 'equipment') {
                totalEnchancementIncrease += obj.data.enhIncrease
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
                flatPrice += obj.data.price
                maxSingleEnhancementIncrease = Math.max(obj.data.enhIncrease, maxSingleEnhancementIncrease)
            }
            if (obj.data.enhancementType === "misc") {
                totalEnchancementIncrease += obj.data.enhIncrease
                flatPrice += obj.data.price
                maxSingleEnhancementIncrease = Math.max(obj.data.enhIncrease, maxSingleEnhancementIncrease)
            }
        }
        let useEpicPricing = false
        if (maxSingleEnhancementIncrease > 5 || totalEnchancement > 5)
            useEpicPricing = true
        // Base price for weapon
        if (this.item.type === 'weapon') {
            if (totalEnchancementIncrease > 0)
                totalPrice += 300
            if (!useEpicPricing)
                totalPrice = totalEnchancementIncrease * totalEnchancementIncrease * 2000 + flatPrice
            else
                totalPrice = totalEnchancementIncrease * totalEnchancementIncrease * 2000 * 10 + 10 * flatPrice
        } else if (this.item.type === 'equipment') {
            if (totalEnchancementIncrease > 0)
                totalPrice += 150
            if (!useEpicPricing)
                totalPrice = totalEnchancementIncrease * totalEnchancementIncrease * 1000 + flatPrice
            else
                totalPrice = totalEnchancementIncrease * totalEnchancementIncrease * 1000 * 10 + 10 * flatPrice
        }

        return totalPrice;
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
            _enhancements = _enhancements.filter(function (obj) {
                return obj._id !== li.dataset.itemId;
            });

            this.updateMagicItemName(updateData, _enhancements);
            this.updateMagicItemProperties(updateData, _enhancements);
            updateData[`data.enhancements.items`] = _enhancements;
            this.item.update(updateData);
        } else {
            button.disabled = true;

            const msg = `<p>${game.i18n.localize("D35E.DeleteItemConfirmation")}</p>`;
            Dialog.confirm({
                title: game.i18n.localize("D35E.DeleteItem"),
                content: msg,
                yes: () => {
                    const updateData = {};
                    let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
                    _enhancements = _enhancements.filter(function (obj) {
                        return obj._id !== li.dataset.itemId;
                    });

                    this.updateMagicItemName(updateData, _enhancements);
                    this.updateMagicItemProperties(updateData, _enhancements);
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
        _enhancements.filter(function (obj) {
            return obj._id === itemId
        }).forEach(i => {
            i.data.uses.value = value;
        });
        updateData[`data.enhancements.items`] = _enhancements;
        this.item.update(updateData);
    }

    _setEnhMaxUses(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest(".item").dataset.itemId;
        const updateData = {};

        const value = Number(event.currentTarget.value);
        let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
        _enhancements.filter(function (obj) {
            return obj._id === itemId
        }).forEach(i => {
            i.data.uses.max = value;
            i.data.uses.maxFormula = `${value}`;
        });
        updateData[`data.enhancements.items`] = _enhancements;
        this.item.update(updateData);
    }

    _setEnhPerUse(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest(".item").dataset.itemId;
        const updateData = {};

        const value = Number(event.currentTarget.value);
        let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
        _enhancements.filter(function (obj) {
            return obj._id === itemId
        }).forEach(i => {
            i.data.uses.chargesPerUse = value;
        });
        updateData[`data.enhancements.items`] = _enhancements;
        this.item.update(updateData);
    }

    async _setEnhValue(event) {
        event.preventDefault();
        const itemId = event.currentTarget.closest(".item").dataset.itemId;
        const updateData = {};

        const value = Number(event.currentTarget.value);
        let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
        _enhancements.filter(function (obj) {
            return obj._id === itemId
        }).forEach(i => {
            i.data.enh = value;
            this._setEnhItemPrice(i);
        });
        updateData[`data.enhancements.items`] = _enhancements;
        this.updateMagicItemName(updateData, _enhancements);
        this.updateMagicItemProperties(updateData, _enhancements);
        await this.item.update(updateData);
    }

    _setEnhItemPrice(item) {
        {
            let rollData = {};
            if (this.actor != null) rollData = this.actor.getRollData();
            rollData.enhancement = item.data.enh;
            if (item.data.enhIncreaseFormula !== undefined && item.data.enhIncreaseFormula !== null && item.data.enhIncreaseFormula !== "") {
                item.data.enhIncrease = new Roll(item.data.enhIncreaseFormula, rollData).roll().total;
            }
        }
        {
            let rollData = {};
            if (this.actor != null) rollData = this.actor.getRollData();
            rollData.enhancement = item.data.enh;
            rollData.enhIncrease = item.data.enhIncrease;
            if (item.data.priceFormula !== undefined && item.data.priceFormula !== null && item.data.priceFormula !== "") {
                item.data.price = new Roll(item.data.priceFormula, rollData).roll().total;
            }
        }
    }


    _onItemEdit(event) {
        event.preventDefault();
        const li = event.currentTarget.closest(".item");
        const item = this.ehnancementItemMap.get(li.dataset.itemId);
        item.sheet.render(true);
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

    async _onEnhUpdateName(event) {
        event.preventDefault();
        const updateData = {};
        //console.log("updating name")
        let _enhancements = duplicate(getProperty(this.item.data, `data.enhancements.items`) || []);
        this.updateMagicItemName(updateData, _enhancements, true);
        this.updateMagicItemProperties(updateData, _enhancements, true);
        await this.item.update(updateData);
    }

    async _quickItemActionControl(event) {
        event.preventDefault();
        const a = event.currentTarget;
        const itemId = $(event.currentTarget).parents(".item").attr("data-item-id");

        let item = this.item.getEnhancementItem(itemId);
        // Quick Attack
        if (a.classList.contains("item-attack")) {
            await this.item.useEnhancementItem(item)
        }
    }

    _onDragConditionalStart(event) {
        const elem = event.currentTarget;
        const conditional = this.object.data.data.conditionals[elem.dataset?.conditional];
        event.dataTransfer.setData("text/plain", JSON.stringify(conditional));
    }

    async _onConditionalDrop(event) {
        event.preventDefault();

        let data;
        try {
            data = JSON.parse(event.originalEvent.dataTransfer.getData("text/plain"));
            // Surface-level check for conditional
            if (!(data.default != null && typeof data.name === "string" && Array.isArray(data.modifiers))) return;
        } catch (e) {
            return false;
        }

        const item = this.object;
        // Check targets and other fields for valid values, reset if necessary
        for (let modifier of data.modifiers) {
            if (!Object.keys(item.getConditionalTargets()).includes(modifier.target)) modifier.target = "";
            let keys;
            for (let [k, v] of Object.entries(modifier)) {
                switch (k) {
                    case "subTarget":
                        keys = Object.keys(item.getConditionalSubTargets(modifier.target));
                        break;
                    case "type":
                        keys = Object.keys(item.getConditionalModifierTypes(modifier.target));
                        break;
                    case "critical":
                        keys = Object.keys(item.getConditionalCritical(modifier.target));
                        break;
                }
                if (!keys?.includes(v)) v = keys?.[0] ?? "";
            }
        }

        const conditionals = item.data.data.conditionals || [];
        await this.object.update({ "data.conditionals": conditionals.concat([data]) });
    }
    async _onConditionalControl(event) {
        event.preventDefault();
        const a = event.currentTarget;

        // Add new conditional
        if (a.classList.contains("add-conditional")) {
            await this._onSubmit(event); // Submit any unsaved changes
            const conditionals = this.item.data.data.conditionals || [];
            return this.item.update({ "data.conditionals": conditionals.concat([ItemPF.defaultConditional]) });
        }

        // Remove a conditional
        if (a.classList.contains("delete-conditional")) {
            await this._onSubmit(event); // Submit any unsaved changes
            const li = a.closest(".conditional");
            const conditionals = duplicate(this.item.data.data.conditionals);
            conditionals.splice(Number(li.dataset.conditional), 1);
            return this.item.update({ "data.conditionals": conditionals });
        }

        // Add a new conditional modifier
        if (a.classList.contains("add-conditional-modifier")) {
            await this._onSubmit(event);
            const li = a.closest(".conditional");
            const conditionals = this.item.data.data.conditionals;
            conditionals[Number(li.dataset.conditional)].modifiers.push(ItemPF.defaultConditionalModifier);
            // duplicate object to ensure update
            return this.item.update({ "data.conditionals": duplicate(conditionals) });
        }

        // Remove a conditional modifier
        if (a.classList.contains("delete-conditional-modifier")) {
            await this._onSubmit(event);
            const li = a.closest(".conditional-modifier");
            const conditionals = duplicate(this.item.data.data.conditionals);
            conditionals[Number(li.dataset.conditional)].modifiers.splice(Number(li.dataset.modifier), 1);
            return this.item.update({ "data.conditionals": conditionals });
        }
    }


}
