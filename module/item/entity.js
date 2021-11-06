import {DicePF} from "../dice.js";
import {createCustomChatMessage} from "../chat.js";
import {alterRoll, createTag, linkData} from "../lib.js";
import {ActorPF} from "../actor/entity.js";
import AbilityTemplate from "../pixi/ability-template.js";
import {ChatAttack} from "../misc/chat-attack.js";
import {D35E} from "../config.js";
import {CACHE} from "../cache.js";
import {Roll35e} from "../roll.js"

/**
 * Override and extend the basic :class:`Item` implementation
 */
export class ItemPF extends Item {

    /* -------------------------------------------- */
    /*  Item Properties                             */

    /* -------------------------------------------- */



    /**
     * Does the Item implement an attack roll as part of its usage
     * @type {boolean}
     */
    get hasAttack() {
        return ["mwak", "rwak", "msak", "rsak"].includes(this.data.data.actionType);
    }

    get tag() {
        return createTag(this.name)
    }


    get hasRolltableDraw() {
        return this.data.data?.rollTableDraw?.id || false;
    }

    get hasMultiAttack() {
        return this.hasAttack && this.data.data.attackParts != null && this.data.data.attackParts.length > 0;
    }

    get hasTemplate() {
        const v = getProperty(this.data, "data.measureTemplate.type");
        const s = getProperty(this.data, "data.measureTemplate.size");
        return (typeof v === "string" && v !== "") && ((typeof s === "string" && s.length > 0) || (typeof s === "number" && s > 0));
    }

    get hasAction() {
        return this.hasAttack
            || this.hasDamage
            || this.hasEffect
            || this.hasRolltableDraw
            || this.hasTemplate || (getProperty(this.data, "data.actionType") === "special");
    }

    get isSingleUse() {
        return getProperty(this.data, "data.uses.per") === "single";
    }

    get isCharged() {
        if (this.type === "card") return true;
        if (getProperty(this.data, "data.requiresPsionicFocus") && !this.actor?.data?.data?.attributes?.psionicFocus) return false;
        if (this.type === "consumable" && getProperty(this.data, "data.uses.per") === "single") return true;
        return ["day", "week", "charges"].includes(getProperty(this.data, "data.uses.per"));
    }

    get combatChangeName() {
        return this.data.data.combatChangeCustomDisplayName || this.name;
    }

    get autoDeductCharges() {
        return this.type === "spell"
            ? getProperty(this.data, "data.preparation.autoDeductCharges") === true
            : (this.isCharged && getProperty(this.data, "data.uses.autoDeductCharges") === true);
    }

    get charges() {
        return ItemPF.getCharges(this)
    }

    get originalName() {
        if (typeof Babele !== "undefined")
            return this.getFlag("babele", "translated") ? this.getFlag("babele", "originalName") : this.name;
        else
            return this.name
    }

    static getCharges(item) {
        if (item.type === "card") return item.data.data.state === "hand"
        if (item.data.data?.linkedChargeItem?.id) {
            return item.actor.getChargesFromItemById(item.data.data?.linkedChargeItem?.id)
        } else {
            if (getProperty(item.data, "data.uses.per") === "single") return getProperty(item.data, "data.quantity");
            if (item.type === "spell") return item.getSpellUses();
            return getProperty(item.data, "data.uses.value") || 0;
        }
    }

    get maxCharges() {
        return ItemPF.getMaxCharges(this)
    }

    static getMaxCharges(item) {
        if (item.data.data?.linkedChargeItem?.id) {
            return item.actor.getMaxChargesFromItemById(item.data.data?.linkedChargeItem?.id)
        } else {
            if (getProperty(item.data, "data.uses.per") === "single") return getProperty(item.data, "data.quantity");
            if (item.type === "spell") return item.getSpellUses();
            return getProperty(item.data, "data.uses.max") || 0;
        }
    }

    get chargeCost() {
        if (getProperty(this.data, "data.uses.per") === "single") return 1;
        if (this.type === "spell") return 1;
        return getProperty(this.data, "data.uses.chargesPerUse") || 1;
    }

    /**
     * @param {String} type - The item type (such as "attack" or "equipment")
     * @param {Number} colorType - 0 for the primary color, 1 for the secondary color
     * @returns {String} A color hex, in the format "#RRGGBB"
     */
    static getTypeColor(type, colorType) {
        switch (colorType) {
            case 0:
                switch (type) {
                    case "feat":
                        return "#8900EA";
                    case "spell":
                        return "#5C37FF";
                    case "class":
                        return "#85B1D2";
                    case "race":
                        return "#00BD29";
                    case "attack":
                        return "#F21B1B";
                    case "weapon":
                    case "equipment":
                    case "consumable":
                    case "loot":
                        return "#E5E5E5";
                    case "buff":
                        return "#FDF767";
                    default:
                        return "#FFFFFF";
                }
            case 1:
                switch (type) {
                    case "feat":
                        return "#5F00A3";
                    case "spell":
                        return "#4026B2";
                    case "class":
                        return "#6A8DA8";
                    case "race":
                        return "#00841C";
                    case "attack":
                        return "#A91212";
                    case "weapon":
                    case "equipment":
                    case "consumable":
                    case "loot":
                        return "#B7B7B7";
                    case "buff":
                        return "#FDF203";
                    default:
                        return "#C1C1C1";
                }
        }

        return "#FFFFFF";
    }

    get typeColor() {
        return this.constructor.getTypeColor(this.type, 0);
    }

    get typeColor2() {
        return this.constructor.getTypeColor(this.type, 1);
    }

    get isRecharging() {
        return this.data.data?.recharge?.enabled && this.data.data?.recharge?.current
    }

    get hasTimedRecharge() {
        return this.data.data?.recharge?.enabled
    }

    /**
     * Generic charge addition (or subtraction) function that either adds charges
     * or quantity, based on item data.
     * @param {number} value       - The amount of charges to add.
     * @param {Object} [data=null] - An object in the style of that of an update call to alter, rather than applying the change immediately.
     * @returns {Promise}
     */
    async addCharges(value, data = null) {
        let chargeItem = this;
        let isChargeLinked = false;
        if (this.data.data?.linkedChargeItem?.id) {
            isChargeLinked = true;
            chargeItem = this.actor.getItemByUidOrId(this.data.data?.linkedChargeItem?.id)
            if (!chargeItem) return;
        }

        if (getProperty(this.data, "data.requiresPsionicFocus")) {
            if (this.actor) {
                await this.actor.update({'data.attributes.psionicFocus': false})
            }
        }

        if (getProperty(chargeItem.data, "data.uses.per") === "single"
            && getProperty(chargeItem.data, "data.quantity") == null) return;

        if (this.type === "card") return this.addCardCharges(value, data);
        if (this.type === "spell") return this.addSpellUses(value, data);

        let prevValue = this.isSingleUse ? getProperty(chargeItem.data, "data.quantity") : getProperty(chargeItem.data, "data.uses.value");
        if (data != null && this.isSingleUse && data["data.quantity"] != null) prevValue = data["data.quantity"];
        else if (data != null && !this.isSingleUse && data["data.uses.value"] != null) prevValue = data["data.uses.value"];

        let newUses = prevValue + value;
        let rechargeTime = 0;
        let rechargeFormula = null;
        if (!isChargeLinked && newUses === 0) {
            rechargeFormula =  getProperty(this.data, "data.recharge.formula")
        } else if (isChargeLinked && newUses === 0) {
            rechargeFormula = getProperty(chargeItem.data, "data.recharge.formula")
        }
        
        if (rechargeFormula) {
            rechargeTime = new Roll35e(rechargeFormula, {}).roll().total
        }
        console.log('D35E | Recharge and uses', data, newUses, rechargeFormula, rechargeTime)
        if (data != null && !isChargeLinked) {
            if (this.isSingleUse) {
                data["data.quantity"] = newUses;
            }
            else {
                data["data.uses.value"] = newUses;
                data["data.recharge.current"] = rechargeTime;
            }
        } else {
            if (this.isSingleUse) await chargeItem.update({"data.quantity": newUses}, {stopUpdates: true});
            else await chargeItem.update({"data.uses.value": newUses, "data.recharge.current": rechargeTime}, {stopUpdates: true});
        }
        
    }

    /* -------------------------------------------- */

    /**
     * Does the Item implement a damage roll as part of its usage
     * @type {boolean}
     */
    get hasDamage() {
        return !!(this.data.data.damage && this.data.data.damage.parts.length);
    }

    /* -------------------------------------------- */

    /**
     * Does the item provide an amount of healing instead of conventional damage?
     * @return {boolean}
     */
    get isHealing() {
        return (this.data.data.actionType === "heal") && this.data.data.damage.parts.length;
    }

    get hasEffect() {
        return this.hasDamage || (this.data.data.effectNotes && this.data.data.effectNotes.length > 0) || (this.data.data.specialActions && this.data.data.specialActions.length > 0);
    }

    /* -------------------------------------------- */

    /**
     * Does the Item implement a saving throw as part of its usage
     * @type {boolean}
     */
    get hasSave() {
        return !!(this.data.data.save && this.data.data.save.ability);
    }

    /**
     * Should the item show unidentified data
     * @type {boolean}
     */
    get showUnidentifiedData() {
        return (!game.user.isGM && getProperty(this.data, "data.identified") === false);
    }

    /* -------------------------------------------- */
    /*	Data Preparation														*/

    /* -------------------------------------------- */

    /**
     * Augment the basic Item data model with additional dynamic data.
     */
    prepareData() {
        super.prepareData();

        const itemData = this.data;
        const data = itemData.data;
        const C = CONFIG.D35E;
        const labels = {};
        
        // Physical items
        if (hasProperty(itemData, "data.weight")) {
            // Sync name
            if (!hasProperty(this.data, "data.identifiedName")) setProperty(this.data, "data.identifiedName", this.name);
            // Prepare unidentified cost
            if (!hasProperty(this.data, "data.unidentified.price")) setProperty(this.data, "data.unidentified.price", 0);

            // Set basic data
            itemData.data.hp = itemData.data.hp || {max: 10, value: 10};
            itemData.data.hardness = itemData.data.hardness || 0;
            itemData.data.carried = itemData.data.carried == null ? true : itemData.data.carried;

            // Equipped label
            labels.equipped = "";
            if (itemData.data.equipped === true) labels.equipped = game.i18n.localize("D35E.Yes");
            else labels.equipped = game.i18n.localize("D35E.No");

            // Carried label
            labels.carried = "";
            if (itemData.data.carried === true) labels.carried = game.i18n.localize("D35E.Yes");
            else labels.carried = game.i18n.localize("D35E.No");

            // Identified label
            labels.identified = "";
            if (itemData.data.identified === true) labels.identified = game.i18n.localize("D35E.YesShort");
            else labels.identified = game.i18n.localize("D35E.NoShort");

            // Slot label
            if (itemData.data.slot) {
                // Add equipment slot
                const equipmentType = getProperty(this.data, "data.equipmentType") || null;
                if (equipmentType != null) {
                    const equipmentSlot = getProperty(this.data, "data.slot") || null;
                    labels.slot = equipmentSlot == null ? null : CONFIG.D35E.equipmentSlots[equipmentType][equipmentSlot];
                } else labels.slot = null;
            }


        }

        // Spell Level,  School, and Components
        if (itemData.type === "spell") {
            labels.level = C.spellLevels[data.level];
            labels.school = C.spellSchools[data.school];
            labels.components = Object.entries(data.components).map(c => {
                c[1] === true ? c[0].titleCase().slice(0, 1) : null
            }).filterJoin(",");
            if (this.actor) {
                let spellbook  = this.actor?.data?.data?.attributes?.spells.spellbooks[data.spellbook]
                if (spellbook)
                    data.spellbookData = {class: spellbook.class,name: spellbook.name}
            }
        }

        // Feat Items
        else if (itemData.type === "feat") {
            labels.featType = C.featTypes[data.featType];
        }

        // Buff Items
        else if (itemData.type === "buff") {
            labels.buffType = C.buffTypes[data.buffType];
        }

        // Weapon Items
        else if (itemData.type === "weapon") {
            // Type and subtype labels
            let wType = getProperty(this.data, "data.weaponType");
            let typeKeys = Object.keys(C.weaponTypes);
            if (!typeKeys.includes(wType)) wType = typeKeys[0];

            let wSubtype = getProperty(this.data, "data.weaponSubtype");
            let subtypeKeys = Object.keys(C.weaponTypes[wType]).filter(o => !o.startsWith("_"));
            if (!subtypeKeys.includes(wSubtype)) wSubtype = subtypeKeys[0];

            labels.weaponType = C.weaponTypes[wType]._label;
            labels.weaponSubtype = C.weaponTypes[wType][wSubtype];
        }

        // Equipment Items
        else if (itemData.type === "equipment") {
            // Type and subtype labels
            let eType = getProperty(this.data, "data.equipmentType");
            let typeKeys = Object.keys(C.equipmentTypes);
            if (!typeKeys.includes(eType)) eType = typeKeys[0];

            let eSubtype = getProperty(this.data, "data.equipmentSubtype");
            let subtypeKeys = Object.keys(C.equipmentTypes[eType]).filter(o => !o.startsWith("_"));
            if (!subtypeKeys.includes(eSubtype)) eSubtype = subtypeKeys[0];

            labels.equipmentType = C.equipmentTypes[eType]._label;
            labels.equipmentSubtype = C.equipmentTypes[eType][eSubtype];

            // AC labels
            labels.armor = data.armor.value ? `${data.armor.value} AC` : "";
            if (data.armor.dex === "") data.armor.dex = null;
            else if (typeof data.armor.dex === "string" && /\d+/.test(data.armor.dex)) {
                data.armor.dex = parseInt(data.armor.dex);
            }
            // Add enhancement bonus
            if (data.armor.enh == null) data.armor.enh = 0;
        }

        // Activated Items
        if (data.hasOwnProperty("activation")) {

            // Ability Activation Label
            let act = data.activation || {};
            if (act) labels.activation = [["minute", "hour"].includes(act.type) ? act.cost.toString() : "", C.abilityActivationTypes[act.type]].filterJoin(" ");

            // Target Label
            let tgt = data.target || {};
            if (["none", "touch", "personal"].includes(tgt.units)) tgt.value = null;
            if (["none", "personal"].includes(tgt.type)) {
                tgt.value = null;
                tgt.units = null;
            }
            labels.target = [tgt.value, C.distanceUnits[tgt.units], C.targetTypes[tgt.type]].filterJoin(" ");
            if (labels.target) labels.target = `Target: ${labels.target}`;

            // Range Label
            let rng = data.range || {};
            if (!["ft", "mi", "spec"].includes(rng.units)) {
                rng.value = null;
                rng.long = null;
            }
            labels.range = [rng.value, rng.long ? `/ ${rng.long}` : null, C.distanceUnits[rng.units]].filterJoin(" ");
            if (labels.range.length > 0) labels.range = ["Range:", labels.range].join(" ");

            // Duration Label
            let dur = data.duration || {};
            if (["inst", "perm", "spec"].includes(dur.units)) dur.value = null;
            labels.duration = [dur.value, C.timePeriods[dur.units]].filterJoin(" ");
        }

        // Item Actions
        if (data.hasOwnProperty("actionType")) {
            // Save DC
            let save = data.save || {};
            if (save.description || save.type) {
                labels.save = `DC ${save.dc}`;
            }

            // Damage
            let dam = data.damage || {};
            if (dam.parts) {
                labels.damage = dam.parts.map(d => d[0]).join(" + ").replace(/\+ -/g, "- ");
                labels.damageTypes = dam.parts.map(d => d[1]).join(", ");
            }

            // Add attack parts
            if (!data.attack) data.attack = {parts: []};
        }
        itemData['custom'] = {}
        if (data.hasOwnProperty('customAttributes')) {
            //console.log(data.customAttributes)
            for (let prop in data.customAttributes || {}) {
                let propData = data.customAttributes[prop];
                itemData['custom'][(propData.name || propData.id).replace(/ /g, '').toLowerCase()] = propData.value;
            }
        }
        //console.log('D35E | Custom properties', itemData['custom'])

        // Assign labels and return the Item
        this.labels = labels;
    }

    static _fillTemplate(templateString, templateVars){
        return new Function("return `"+templateString +"`;").call(templateVars);
    }

    async update(data, options = {}) {
        if (options['recursive'] !== undefined && options['recursive'] === false) {
            //console.log('D35E | Skipping update logic since it is not recursive')
            await super.update(data, options);
            return
        }
        console.log('Is true/false', data, this.data.data.active)
        const srcData = mergeObject(this.data.toObject(), expandObject(data), {inplace: false});

        let needsUpdate = false; // if we do not have changes we often do not need to update actor
        if (this.type === 'class' ||
            srcData.data?.changes?.length > 0 ||
            srcData.data?.damageReduction?.length > 0 ||
            srcData.data?.resistances?.length > 0 ||
            srcData.data?.requirements?.length > 0 ||
            srcData.data.uses?.isResource ||
            srcData.data.uses?.canBeLinked ||
            data['data.quantity'] !== undefined ||
            data['data.equipped'] !== undefined ||
            data['data.carried'] !== undefined)
            needsUpdate = true

        console.log('Should be true/false, is true true', data, this.data.data.active)
        //const srcDataWithRolls = srcData.data;
        if (data['data.nameFromFormula'] || getProperty(this.data, "data.nameFromFormula")) {
            const srcDataWithRolls = this.getRollData(srcData);
            data["name"] = ItemPF._fillTemplate(data['data.nameFormula'] || getProperty(this.data, "data.nameFormula"), srcDataWithRolls) || data["name"]
        }
        // Update name
        if (data["data.identifiedName"]) data["name"] = data["data.identifiedName"];
        else if (data["name"]) data["data.identifiedName"] = data["name"];

        let activateBuff = data["data.active"] && data["data.active"] !== this.data.data.active;
        let deactivateBuff = this.data.data.active && (data["data.active"] === undefined || !data["data.active"]);
        // Update description
        if (this.type === "spell") await this._updateSpellDescription(data, srcData);
        if (this.type === "card") await this._updateCardDescription(data, srcData);

        // Set weapon subtype
        if (data["data.weaponType"] != null && data["data.weaponType"] !== getProperty(this.data, "data.weaponType")) {
            const type = data["data.weaponType"];
            const subtype = data["data.weaponSubtype"] || getProperty(this.data, "data.weaponSubtype") || "";
            const keys = Object.keys(CONFIG.D35E.weaponTypes[type])
                .filter(o => !o.startsWith("_"));
            if (!subtype || !keys.includes(subtype)) {
                data["data.weaponSubtype"] = keys[0];
            }
        }

        if (this.pack && this.pack.startsWith("D35E")) {
            data["data.originVersion"] = this.data.data.originVersion + 1;
        }

        if (data["data.weaponData.size"] && data["data.weaponData.size"] !== this.data.data.weaponData.size) {
            let newSize = Object.keys(CONFIG.D35E.actorSizes).indexOf(data["data.weaponData.size"] || "");
            let oldSize = Object.keys(CONFIG.D35E.actorSizes).indexOf(this.data.data.weaponData.size || "");
            let weightChange = Math.pow(2,newSize-oldSize);
            data["data.weight"] = this.data.data.weight * weightChange;
        }

        //console.log("D35E Item Update", data)
        if (data["data.convertedWeight"] !== undefined && data["data.convertedWeight"] !== null ) {
            const conversion = game.settings.get("D35E", "units") === "metric" ? 2 : 1;
            data["data.weight"] = data["data.convertedWeight"] * conversion;
        }

        if (data["data.save.dcAutoType"] !== undefined && data["data.save.dcAutoType"] !== null && data["data.save.dcAutoType"] !== "" ) {
            if (this.actor) {
                let autoType = data["data.save.dcAutoType"];
                let autoDCBonus = 0;
                switch (autoType) {
                    case "racialHD":                    
                        autoDCBonus += this.actor.racialHD.data.data.levels;
                        break;
                    case "halfRacialHD":                    
                        autoDCBonus += this.actor.racialHD.data.data.levels;
                        autoDCBonus = Math.floor(autoDCBonus/2.0);
                        break;
                    case "HD":                    
                        autoDCBonus += this.actor.data.data.attributes.hd.total;
                        break;
                    case "halfHD":                    
                        autoDCBonus += this.actor.data.data.attributes.hd.total;
                        autoDCBonus = Math.floor(autoDCBonus/2.0);
                        break;
                    default:
                        break;
                }
                let ability = data["data.save.dcAutoAbility"];
                data["data.save.dc"] = 10 + (this.actor.data.data.abilities[ability]?.mod || 0) + autoDCBonus;
            } else {
                data["data.save.dc"] = 0;
            }
        }

        if (data["data.convertedCapacity"] !== undefined && data["data.convertedCapacity"] !== null) {
            const conversion = game.settings.get("D35E", "units") === "metric" ? 2 : 1;
            data["data.capacity"] = data["data.convertedCapacity"] * conversion;
        }

        if (data["data.selectedMaterial"] && data["data.selectedMaterial"] !== "none") {
            data["data.material"] = duplicate(CACHE.Materials.get(data["data.selectedMaterial"]).data);
        } else if (data["data.selectedMaterial"]  && data["data.selectedMaterial"] === "none") {
            data["data.-=material"] = null;
        }




        {
            let rollData = {};
            if (this.actor != null) rollData = this.actor.getRollData();
            let rollFormula = getProperty(this.data, "data.timeline.formula");
            if (data["data.timeline.formula"] != null && data["data.timeline.formula"] !== getProperty(this.data, "data.timeline.formula"))
                rollFormula = data["data.timeline.formula"]
            if (rollFormula !== undefined && rollFormula !== null && rollFormula !== "") {

                rollData.item = {};
                rollData.item.level = getProperty(this.data, "data.level");
                if (data["data.level"] != null && data["data.level"] !== getProperty(this.data, "data.level"))
                    rollData.item.level = data["data.level"]
                try {
                    data["data.timeline.total"] = new Roll35e(rollFormula, rollData).roll().total;
                } catch (e) {
                    data["data.timeline.total"] = 0;
                }
            }

            rollData.enhancement = data["data.enh"] !== undefined ? data["data.enh"] : getProperty(this.data, "data.enh");
            rollFormula = getProperty(this.data, "data.enhIncreaseFormula");
            if (data["data.enhIncreaseFormula"] != null && data["data.enhIncreaseFormula"] !== getProperty(this.data, "data.enhIncreaseFormula"))
                rollFormula = data["data.enhIncreaseFormula"]
            if (rollFormula !== undefined && rollFormula !== null && rollFormula !== "") {
                data["data.enhIncrease"] = new Roll35e(rollFormula, rollData).roll().total;
            }
            rollData.enhancement = data["data.enh"] !== undefined ? data["data.enh"] : getProperty(this.data, "data.enh");
            rollData.enhIncrease = data["data.enhIncrease"] !== undefined ? data["data.enhIncrease"] : getProperty(this.data, "data.enhIncrease");
            rollFormula = getProperty(this.data, "data.priceFormula");
            if (data["data.priceFormula"] != null && data["data.priceFormula"] !== getProperty(this.data, "data.priceFormula"))
                rollFormula = data["data.priceFormula"]
            if (rollFormula !== undefined && rollFormula !== null && rollFormula !== "") {
                data["data.price"] = new Roll35e(rollFormula, rollData).roll().total;
            }


            if (data["data.maxDamageDiceFormula"] != null && data["data.maxDamageDiceFormula"] !== getProperty(this.data, "data.maxDamageDiceFormula")) {
                let roll = new Roll35e(data["data.maxDamageDiceFormula"], rollData).roll();
                data["data.maxDamageDice"] = roll.total;
            }
        }

        // Set equipment subtype and slot
        if (data["data.equipmentType"] != null && data["data.equipmentType"] !== getProperty(this.data, "data.equipmentType")) {
            // Set subtype
            const type = data["data.equipmentType"];
            const subtype = data["data.equipmentSubtype"] || getProperty(this.data, "data.equipmentSubtype") || "";
            let keys = Object.keys(CONFIG.D35E.equipmentTypes[type])
                .filter(o => !o.startsWith("_"));
            if (!subtype || !keys.includes(subtype)) {
                data["data.equipmentSubtype"] = keys[0];
            }

            // Set slot
            const slot = data["data.slot"] || getProperty(this.data, "data.slot") || "";
            keys = Object.keys(CONFIG.D35E.equipmentSlots[type]);
            if (!slot || !keys.includes(slot)) {
                data["data.slot"] = keys[0];
            }
        }

        // Update enh from Enhancements
        let _enhancements = duplicate(getProperty(srcData, `data.enhancements.items`) || []);
        this._updateBaseEnhancement(data, _enhancements, this.type, srcData);
        this._updateAlignmentEnhancement(data, _enhancements, this.type, srcData);




        this._updateMaxUses(data, {srcData: srcData});

        const diff = diffObject(flattenObject(this.data), data);
        let updatedItem = null;
        // if (Object.keys(diff).length) {
        //     updatedItem = await super.update(diff, options);
        // }

        if (activateBuff) {
            data["data.timeline.elapsed"] = 0;
        }
        let updateData = await super.update(data, options);
        if (this.actor !== null && !options.massUpdate) {

            console.log('ACTIVATING BUFF', data, this.data.data.active)
            if (activateBuff) {
                //Buff or item was activated
                data["data.timeline.elapsed"] = 0
                let actionValue = (this.data.data.activateActions || []).map(a => a.action).join(";")
                if (!actionValue) await this.actor.refresh(options); 
                else {
                    if (this.actor && this.actor.token !== null) {
                        const srcDataWithRolls = this.getRollData(srcData);
                        await this.actor.token.actor.applyActionOnSelf(actionValue, this.actor.token.actor, srcDataWithRolls, "self")
                    } else if (this.actor) {
                        const srcDataWithRolls = this.getRollData(srcData);
                        await this.actor.applyActionOnSelf(actionValue, this.actor, srcDataWithRolls, "self")
                    }
                }
                if (this.data.data.buffType === "shapechange") {
                    if (this.data.data.shapechange.type === "wildshape" || this.data.data.shapechange.type === "polymorph") {
                        let itemsToCreate = []
                        for (const i of this.data.data.shapechange.source.items) {
                            if (i.type === "attack" && i.data.attackType === "natural") {
                                //console.log('add polymorph attack')
                                if (!this.actor) continue;
                                let data = duplicate(i);
                                data.name = i.name + ` (Polymorhped ${this.data.data.shapechange.source.name})`
                                delete data._id;
                                itemsToCreate.push(data)
                            }
                        }
    
                        if (this.actor.token !== null) {
                            await this.actor.token.actor.createEmbeddedDocuments("Item", itemsToCreate,{stopUpdates: true})
                        } else {
                            await this.actor.createEmbeddedDocuments("Item", itemsToCreate,{stopUpdates: true})
                        }
                    }
                }
                if (this.type === "aura") {
                    await this.actor.refresh({reloadAuras: true})
                }

            } else if (deactivateBuff) {
                if (this.data.data.buffType === "shapechange") {
                    if (this.data.data.shapechange.type === "wildshape" || this.data.data.shapechange.type === "polymorph") {
                        let itemsToDelete = []
                        if (this.actor) {
                            for (const i of this.actor.items) {
    
                                if (i.data.type === "attack" && i.data.data.attackType === "natural" && !i.data.data.melded) {
                                    //console.log('remove polymorph attack',i,this.actor,this.actor.token)
                                    itemsToDelete.push(i._id)
                                }
                            }
                        }
                        if (itemsToDelete.length)
                            if (this.actor.token !== null) {
                                await this.actor.token.actor.deleteEmbeddedDocuments("Item",itemsToDelete,{stopUpdates: true})
                            } else {
                                await this.actor.deleteEmbeddedDocuments("Item",itemsToDelete,{stopUpdates: true})
                            }
                    }
                }
                let actionValue = (this.data.data.deactivateActions || []).map(a => a.action).join(";")
                if (!actionValue) await this.actor.refresh(options); 
                else {
                    if (this.actor && this.actor.token !== null) {
                        const srcDataWithRolls = this.getRollData(srcData);
                        await this.actor.token.actor.applyActionOnSelf(actionValue, this.actor.token.actor, srcDataWithRolls, "self")
                    } else if (this.actor) {
                        const srcDataWithRolls = this.getRollData(srcData);
                        await this.actor.applyActionOnSelf(actionValue, this.actor, srcDataWithRolls, "self")
                    }
                }
                if (this.type === "aura") {
                    await this.actor.refresh({reloadAuras: true})
                }
    
            } else {
                if (needsUpdate)
                    await this.actor.refresh(options);
            }

        }

        console.log('D35E | ITEM UPDATE | Updated')
        return Promise.resolve(updateData);
        // return super.update(data, options);
    }

    _updateAlignmentEnhancement(data, enhancements, type, srcData) {
        let doLinkData = true;
        if (srcData == null) {
            srcData = this.data;
            doLinkData = false;
        }

        let alignment = {
            "good": false,
                "evil": false,
                "lawful": false,
                "chaotic": false
        }

        enhancements.forEach(function( obj ) {
            if (obj.data.weaponData.alignment) {
                alignment.good = obj.data.weaponData.alignment.good || alignment.good;
                alignment.evil = obj.data.weaponData.alignment.evil || alignment.evil;
                alignment.lawful = obj.data.weaponData.alignment.lawful || alignment.lawful;
                alignment.chaotic = obj.data.weaponData.alignment.chaotic || alignment.chaotic;
            }
        });
        //console.log('Total enh',totalEnchancement, type)
        if (type === 'weapon' && enhancements.length) {
            if (doLinkData) linkData(srcData, data, "data.weaponData.alignment", alignment);
            else data['data.weaponData.alignment'] = alignment
        }
    }

    _updateBaseEnhancement(data, enhancements, type, srcData) {
        let doLinkData = true;
        if (srcData == null) {
            srcData = this.data;
            doLinkData = false;
        }
        let totalEnchancement = 0;
        enhancements.forEach(function( obj ) {

            if (!obj.data.enhIsLevel) {
                if (obj.data.enhancementType === "weapon" && type === 'weapon')
                    totalEnchancement += obj.data.enh
                if (obj.data.enhancementType === "armor" && type === 'equipment')
                    totalEnchancement += obj.data.enh
            }
        });
        //console.log('Total enh',totalEnchancement, type)
        if (totalEnchancement > 0) {
            if (type === 'weapon') {
                if (doLinkData) linkData(srcData, data, "data.enh", totalEnchancement);
                else data['data.enh'] = totalEnchancement
            }
            else if (type === 'equipment') {
                if (doLinkData) linkData(srcData, data, "data.armor.enh", totalEnchancement);
                else data['data.armor.enh'] = totalEnchancement
            }
        }
    }

    _updateMaxUses(data, {srcData = null, actorData = null, actorRollData = null} = {}) {
        if (data['data.uses.max'] !== undefined) return;
        let doLinkData = true;
        if (srcData == null) {
            srcData = this.data;
            doLinkData = false;
        }
        let rollData = {};
        if (actorRollData == null) {
            if (this.actor != null) rollData = this.actor.getRollData();
            if (actorData !== null) {
                rollData = mergeObject(rollData, actorData.data, {inplace: false});
            }
        } else {
            rollData = actorRollData;
        }
        rollData.item = this.getRollData();

        if (hasProperty(srcData, "data.uses.maxFormula")) {
            if (getProperty(srcData, "data.uses.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(srcData, "data.uses.maxFormula"), rollData).roll();
                if (doLinkData) linkData(srcData, data, "data.uses.max", roll.total);
                else data["data.uses.max"] = roll.total;
            }
        }


        if (hasProperty(srcData, "data.uses.maxPerUseFormula")) {
            if (getProperty(srcData, "data.uses.maxPerUseFormula") !== "") {
                let roll = new Roll35e(getProperty(srcData, "data.uses.maxPerUseFormula"), rollData).roll();
                if (doLinkData) linkData(srcData, data, "data.uses.maxPerUse", roll.total);
                else data["data.uses.maxPerUse"] = roll.total;
            }
        }

        if (hasProperty(srcData, "data.enhancements.uses.maxFormula")) {
            if (getProperty(srcData, "data.enhancements.uses.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(srcData, "data.enhancements.uses.maxFormula"), rollData).roll();
                if (doLinkData) linkData(srcData, data, "data.enhancements.uses.max", roll.total);
                else data["data.enhancements.uses.max"] = roll.total;
            }
        }

        if (hasProperty(srcData, "data.combatChangesRange.maxFormula")) {
            if (getProperty(srcData, "data.combatChangesRange.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(srcData, "data.combatChangesRange.maxFormula"), rollData).roll();
                if (doLinkData) linkData(srcData, data, "data.combatChangesRange.max", roll.total);
                else data["data.combatChangesRange.max"] = roll.total;
            }
        }
        for (let i = 1; i <= 3; i++)
            if (hasProperty(srcData, `data.combatChangesAdditionalRanges.slider${i}.maxFormula`)) {
                if (getProperty(srcData, `data.combatChangesAdditionalRanges.slider${i}.maxFormula`) !== "") {
                    let roll = new Roll35e(getProperty(srcData, `data.combatChangesAdditionalRanges.slider${i}.maxFormula`), rollData).roll();
                    if (doLinkData) linkData(srcData, data, `data.combatChangesAdditionalRanges.slider${i}.max`, roll.total);
                    else data[`data.combatChangesAdditionalRanges.slider${i}.max`] = roll.total;
                }
            }
    }

    static setMaxUses(data, rollData) {
        if (hasProperty(data, "data.uses.maxFormula")) {
            if (getProperty(data, "data.uses.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(data, "data.uses.maxFormula"), rollData).roll();
                data.data.uses.max = roll.total;
            }
        }



        if (hasProperty(data, "data.uses.maxPerUseFormula")) {
            if (getProperty(data, "data.uses.maxPerUseFormula") !== "") {
                let roll = new Roll35e(getProperty(data, "data.uses.maxPerUseFormula"), rollData).roll();
                data.data.uses.maxPerUse = roll.total;
            }
        }
        
        if (hasProperty(data, "data.enhancements.uses.maxFormula")) {
            if (getProperty(data, "data.enhancements.uses.maxFormula") !== "") {
                let roll = new Roll35e(getProperty(data, "data.enhancements.uses.maxFormula"), rollData).roll();
                data.data.enhancements.uses.max = roll.total;
            }
        }
    }

    /* -------------------------------------------- */

    /**
     * Roll the item to Chat, creating a chat card which contains follow up attack or damage roll options
     * @return {Promise}
     */
    async roll(altChatData = {}, tempActor = null) {
        let actor = this.actor;
        if (tempActor != null)
            actor = tempActor;
        if (actor && !actor.isOwner) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        // Basic template rendering data
        const token = actor ? actor.token : null;
        const templateData = {
            actor: actor,
            tokenId: token ? `${token.parent._id}.${token.id}` : null,
            item: this.data,
            data: this.getChatData(),
            labels: this.labels,
            hasAttack: this.hasAttack,
            hasMultiAttack: this.hasMultiAttack,
            hasAction: this.hasAction || this.isCharged,
            isHealing: this.isHealing,
            hasDamage: this.hasDamage,
            hasEffect: this.hasEffect,
            isVersatile: this.isVersatile,
            hasSave: this.hasSave,
            isSpell: this.data.type === "spell",
        };

        // Roll spell failure chance
        if (templateData.isSpell && this.actor != null && this.actor.spellFailure > 0) {
            const spellbook = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${this.data.data.spellbook}`);
            if (spellbook && spellbook.arcaneSpellFailure) {
                templateData.spellFailure = new Roll35e("1d100").roll().total;
                templateData.spellFailureSuccess = templateData.spellFailure > this.actor.spellFailure;
            }
        }

        // Render the chat card template
        const templateType = ["consumable"].includes(this.data.type) ? this.data.type : "item";
        const template = `systems/D35E/templates/chat/${templateType}-card.html`;

        // Basic chat message data
        const chatData = mergeObject({
            user: game.user._id,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            speaker: ChatMessage.getSpeaker({actor: actor}),
        }, altChatData);

        // Toggle default roll mode
        let rollMode = chatData.rollMode || game.settings.get("core", "rollMode");
        if (["gmroll", "blindroll"].includes(rollMode)) chatData["whisper"] = ChatMessage.getWhisperRecipients("GM");
        if (rollMode === "blindroll") chatData["blind"] = true;

        // Create the chat message
        return createCustomChatMessage(template, templateData, chatData);
    }

    /* -------------------------------------------- */
    /*  Chat Cards																	*/

    /* -------------------------------------------- */

    getChatData(htmlOptions, rollData) {
        const data = duplicate(this.data.data);
        const labels = this.labels;
        if (!rollData) {
            rollData = this.actor ? this.actor.getRollData() : {};
            rollData.item = data;
            if (this.actor) {
                let allCombatChanges = []
                let attackType = this.type;
                this.actor.items.filter(o => (o.type === "aura" || o.type === "feat" || (o.type === "buff" && o.data.data.active) || (o.type === "equipment" && o.data.data.equipped === true && !o.data.data.melded)) && o.hasCombatChange(attackType, rollData)).forEach(i => {
                    allCombatChanges = allCombatChanges.concat(i.getPossibleCombatChanges(attackType, rollData))
                })

                this._addCombatChangesToRollData(allCombatChanges, rollData);
            }
        }

        // Get the spell specific info
        let spellbookIndex, spellAbility, ablMod = 0;
        let spellbook = null;
        let cl = 0;
        let sl = 0;
        if (this.type === "spell") {
            spellbookIndex = data.spellbook;
            spellbook = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${spellbookIndex}`) || {};
            spellAbility = spellbook.ability;
            if (spellAbility !== "") ablMod = getProperty(this.actor.data, `data.abilities.${spellAbility}.mod`);

            cl += getProperty(spellbook, "cl.total") || 0;
            cl += data.clOffset || 0;
            cl += rollData.featClBonus || 0;
            cl -= this.actor.data.data.attributes.energyDrain || 0

            sl += data.level;
            sl += data.slOffset || 0;

            rollData.cl = cl;
            rollData.sl = sl;
            rollData.ablMod = ablMod;
        } else if (this.type === "card") {
            let deckIndex = data.deck;
            let deck = getProperty(this.actor.data, `data.attributes.cards.decks.${deckIndex}`) || {};
            spellAbility = deck.ability;
            if (spellAbility !== "") ablMod = getProperty(this.actor.data, `data.abilities.${spellAbility}.mod`);

            cl += getProperty(deck, "cl.total") || 0;
            cl += data.clOffset || 0;
            cl += rollData.featClBonus || 0;
            cl -= this.actor.data.data.attributes.energyDrain || 0

            sl += data.level;
            sl += data.slOffset || 0;

            rollData.cl = cl;
            rollData.sl = sl;
            rollData.ablMod = ablMod;
        }


        // Rich text description
        if (this.showUnidentifiedData) {
            data.description.value = TextEditor.enrichHTML(data.description.unidentified, htmlOptions);
        } else {
            data.description.value = TextEditor.enrichHTML(data.description.value, htmlOptions);
        }

        // General equipment properties
        const props = [];
        if (data.hasOwnProperty("equipped") && ["weapon", "equipment"].includes(this.data.type)) {
            props.push(
                data.equipped ? game.i18n.localize("D35E.Equipped") : game.i18n.localize("D35E.NotEquipped"),
            );
        }

        if (!this.showUnidentifiedData) {
            // Gather dynamic labels
            const dynamicLabels = {};
            dynamicLabels.range = labels.range || "";
            dynamicLabels.level = labels.sl || "";
            let rangeModifier = rollData.spellEnlarged ? 2 : 1
            // Range
            if (data.range != null) {
                if (data.range.units === "close") dynamicLabels.range = game.i18n.localize("D35E.RangeNote").format(rangeModifier * 25 +rangeModifier *  Math.floor(cl / 2) * 5);
                else if (data.range.units === "medium") dynamicLabels.range = game.i18n.localize("D35E.RangeNote").format(rangeModifier * 100 + rangeModifier * cl * 10);
                else if (data.range.units === "long") dynamicLabels.range = game.i18n.localize("D35E.RangeNote").format(rangeModifier * 400 + rangeModifier * cl * 40);
                else if (["ft", "mi", "spec"].includes(data.range.units) && typeof data.range.value === "string") {
                    let range = new Roll35e(data.range.value.length > 0 ? data.range.value : "0", rollData).roll().total;
                    dynamicLabels.range = [range > 0 ? "Range:" : null, range, CONFIG.D35E.distanceUnits[data.range.units]].filterJoin(" ");
                }
            }
            // Duration
            if (data.duration != null) {
                if (!["inst", "perm"].includes(data.duration.units) && typeof data.duration.value === "string") {
                    let duration = new Roll35e(data.duration.value.length > 0 ? data.duration.value : "0", rollData).roll().total;
                    dynamicLabels.duration = [duration, CONFIG.D35E.timePeriods[data.duration.units]].filterJoin(" ");
                }
            }

            // Item type specific properties
            const fn = this[`_${this.data.type}ChatData`];
            if (fn) fn.bind(this)(data, labels, props);

            // Ability activation properties
            if (data.hasOwnProperty("activation")) {
                props.push(
                    labels.target,
                    labels.activation,
                    dynamicLabels.range,
                    dynamicLabels.duration
                );
            }


            rollData.powerAbl = 0;
            if (data.school === "bol") rollData.powerAbl = getProperty(this.actor.data, `data.abilities.str.mod`)
            if (data.school === "kin") rollData.powerAbl = getProperty(this.actor.data, `data.abilities.con.mod`)
            if (data.school === "por") rollData.powerAbl = getProperty(this.actor.data, `data.abilities.dex.mod`)
            if (data.school === "met") rollData.powerAbl = getProperty(this.actor.data, `data.abilities.int.mod`)
            if (data.school === "cla") rollData.powerAbl = getProperty(this.actor.data, `data.abilities.wis.mod`)
            if (data.school === "tel") rollData.powerAbl = getProperty(this.actor.data, `data.abilities.cha.mod`)

            // Add save DC
            if (data.hasOwnProperty("actionType") && (getProperty(data, "save.description") || getProperty(data, "save.type")) && getProperty(data, "save.description") !== "None") {
                let saveDC = new Roll35e(data.save.dc.length > 0 ? data.save.dc : "0", rollData).roll().total;
                let saveType = data.save.type ? CONFIG.D35E.savingThrowTypes[data.save.type] : data.save.description;
                if (this.type === "spell") {
                    saveDC += new Roll35e(spellbook.baseDCFormula || "", rollData).roll().total;
                }
                saveDC += (rollData.featSpellDCBonus || 0)
                if (saveDC > 0 && saveType) {
                    props.push(`DC ${saveDC}`);
                    props.push(saveType);
                }

                //
                // //console.log('D35E | Calculated spell DC for props', saveDC)
            }
        }

        // Add SR reminder
        if (this.type === "spell") {
            if (data.sr) {
                props.push(game.i18n.localize("D35E.SpellResistance"));
            }
            if (data.pr) {
                props.push(game.i18n.localize("D35E.PowerResistance"));
            }
        }

        // Filter properties and return
        data.properties = props.filter(p => !!p);
        return data;
    }

    _addCombatChangesToRollData(allCombatChanges, rollData) {
        allCombatChanges.forEach(change => {
            if (change[3].indexOf('$') !== -1) {
                setProperty(rollData, change[3].substr(1), ItemPF._fillTemplate(change[4], rollData))
            } else if (change[3].indexOf('&') !== -1) {
                setProperty(rollData, change[3].substr(1), (getProperty(rollData, change[3].substr(1)) || "0") + " + " + ItemPF._fillTemplate(change[4], rollData))
            } else {
                setProperty(rollData, change[3], (getProperty(rollData, change[3]) || 0) + (change[4] || 0))
            }
        })
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for equipment type items
     * @private
     */
    _equipmentChatData(data, labels, props) {
        props.push(
            CONFIG.D35E.equipmentTypes[data.equipmentType][data.equipmentSubtype],
            labels.armor || null,
        );
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for weapon type items
     * @private
     */
    _weaponChatData(data, labels, props) {
        props.push(
            CONFIG.D35E.weaponTypes[data.weaponType]._label,
            CONFIG.D35E.weaponTypes[data.weaponType][data.weaponSubtype],
        );
    }



    /* -------------------------------------------- */

    /**
     * Prepare chat card data for consumable type items
     * @private
     */
    _consumableChatData(data, labels, props) {
        props.push(
            CONFIG.D35E.consumableTypes[data.consumableType]
        );
        if (["day", "week", "charges"].includes(data.uses.per)) {
            props.push(data.uses.value + "/" + data.uses.max + " Charges");
        } else props.push(CONFIG.D35E.limitedUsePeriods[data.uses.per]);
        data.hasCharges = data.uses.value >= 0;
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for tool type items
     * @private
     */
    _lootChatData(data, labels, props) {
        props.push(
            data.weight ? data.weight + " " + (game.settings.get("D35E", "units") === "metric" ? game.i18n.localize("D35E.Kgs") : game.i18n.localize("D35E.Lbs")) : null
        );
    }

    /* -------------------------------------------- */

    /**
     * Render a chat card for Spell type data
     * @return {Object}
     * @private
     */
    _spellChatData(data, labels, props) {
        const ad = this.actor.data.data;

        // Spell saving throw text
        // const abl = data.ability || ad.attributes.spellcasting || "int";
        // if ( this.hasSave && !data.save.dc ) data.save.dc = 8 + ad.abilities[abl].mod + ad.attributes.prof;
        // labels.save = `DC ${data.save.dc} ${CONFIG.D35E.abilities[data.save.ability]}`;

        // Spell properties
        props.push(
            labels.level,
            labels.components,
        );
    }

    /* -------------------------------------------- */

    /**
     * Prepare chat card data for items of the "Feat" type
     */
    _featChatData(data, labels, props) {
        //const ad = this.actor.data.data;

        // Spell saving throw text
        // const abl = data.ability || ad.attributes.spellcasting || "str";
        // if ( this.hasSave && !data.save.dc ) data.save.dc = 8 + ad.abilities[abl].mod + ad.attributes.prof;
        // labels.save = `DC ${data.save.dc} ${CONFIG.D35E.abilities[data.save.ability]}`;

        // Feat properties
        props.push(
            CONFIG.D35E.featTypes[data.featType]
        );
    }

    /* -------------------------------------------- */
    /*  Item Rolls - Attack, Damage, Saves, Checks  */

    /* -------------------------------------------- */

    async use({ev = null, skipDialog = false, replacementId = null, rollModeOverride = null}, tempActor= null, skipChargeCheck=false) {
        let actor = this.actor;
        if (tempActor !== null) {
            actor = tempActor;
        }

        if (getProperty(this.data, "data.requiresPsionicFocus") && !this.actor?.data?.data?.attributes?.psionicFocus) return ui.notifications.warn(game.i18n.localize("D35E.RequiresPsionicFocus"));
        if (this.type === "spell") {
            if (replacementId) {
                return actor.useSpell(this, ev, {skipDialog: skipDialog, replacement: true, replacementItem: actor.items.get(replacementId), rollModeOverride: rollModeOverride}, actor);
            } else {
                return actor.useSpell(this, ev, {skipDialog: skipDialog, rollModeOverride: rollModeOverride}, actor);
            }
        } else if (this.type === "full-attack") {
            if (game.settings.get("D35E", "showFullAttackChatCard")) await this.roll();
            for (let attack of Object.values(this.data.data.attacks)) {
                if (!attack.id) continue;
                let attackItem = actor.items.find(i => i._id === attack.id);
                for (let i = 0; i < attack.count; i++) {
                    let result = await attackItem.useAttack({
                        ev: ev,
                        skipDialog: skipDialog,
                        attackType: attack.attackMode,
                        isFullAttack: true,
                        rollModeOverride: rollModeOverride
                    }, actor, skipChargeCheck)
                    if (!result.wasRolled && !ev.originalEvent?.shiftKey)
                        return ;
                }
            }
            return;
        } else if (this.type === "enhancement" || this.hasAction) {
            return this.useAttack({ev: ev, skipDialog: skipDialog, rollModeOverride: rollModeOverride, attackType: this.data.data.weaponSubtype === "2h" ? 'two-handed' : 'primary'},actor,skipChargeCheck);
        }

        if (this.isCharged && !skipChargeCheck) {
            if (this.charges < this.chargeCost) {
                if (this.isSingleUse) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoQuantity"));
                return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoCharges").format(this.name));
            }
            await this.addCharges(-1*this.chargeCost);

        }
        return this.roll({rollMode: rollModeOverride});
    }

    async useAttack({ev = null, skipDialog = false, attackType = "primary", isFullAttack = false, rollModeOverride = null} = {}, tempActor= null, skipChargeCheck = false) {
        if (ev && ev.originalEvent) ev = ev.originalEvent;
        let actor = this.actor;
        if (tempActor !== null) {
            actor = tempActor;
        }
        if (actor && !actor.isOwner) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        const itemQuantity = getProperty(this.data, "data.quantity");
        if (itemQuantity != null && itemQuantity <= 0 && !skipChargeCheck) {
            return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoQuantity"));
        }

        if (getProperty(this.data, "data.requiresPsionicFocus") && !this.actor?.data?.data?.attributes?.psionicFocus && !skipChargeCheck) return ui.notifications.warn(game.i18n.localize("D35E.RequiresPsionicFocus"));

        if (this.isCharged && this.charges < this.chargeCost && !skipChargeCheck) {
            return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoCharges").format(this.name));
        }

        const itemData = this.getRollData();
        const rollData = actor ? duplicate(actor.getRollData(null, true)) : {};
        rollData.item = duplicate(itemData);
        const itemUpdateData = {};
        itemUpdateData._id = this._id;
        console.log('D35E | Attack item update', itemUpdateData)

        let rolled = false;
        const _roll = async function (fullAttack, form) {
            let attackExtraParts = [],
                damageExtraParts = [],
                primaryAttack = true,
                useMeasureTemplate = false,
                useAmmoId = "none",
                useAmmoDamage = "",
                useAmmoAttack = "",
                useAmmoDamageType = "",
                useAmmoNote = "",
                useAmmoName = "",
                rapidShot = false,
                flurryOfBlows = false,
                manyshot = false,
                nonLethal = false,
                manyshotCount = 0,
                greaterManyshot = false,
                greaterManyshotCount = 0,
                twoWeaponFightingOffhand = false,
                hasTwoWeaponFightingFeat = actor.items.filter(o => o.type === "feat" && o.name === "Two-Weapon Fighting").length > 0,
                multiweaponFighting = actor.items.filter(o => o.type === "feat" && (o.name === "Multiweapon Fighting" || o.data.data.changeFlags.multiweaponAttack)).length > 0,
                hasTwoImprovedWeaponFightingFeat = actor.items.filter(o => o.type === "feat" && o.name === "Improved Two-Weapon Fighting").length > 0,
                hasTwoGreaterFightingFeat = actor.items.filter(o => o.type === "feat" && o.name === "Greater Two-Weapon Fighting").length > 0,
                rollMode = null,
                optionalFeatIds = [],
                optionalFeatRanges = new Map(),
                enabledConditionals = [],
                props = [],
                rollModifiers = [],
                extraText = "";

            let selectedTargets = [];
            let selectedTargetIds = '';


            let damageModifiers = {
                maximize: false,
                multiplier: 1,
            }
            // Get form data
            if (form) {


                rollData.attackBonus = form.find('[name="attack-bonus"]').val();
                if (rollData.attackBonus) {
                    attackExtraParts.push("@attackBonus");
                    rollModifiers.push(`${game.i18n.localize("D35E.AttackRollBonus")} ${rollData.attackBonus}`)
                }
                rollData.damageBonus = form.find('[name="damage-bonus"]').val();
                if (rollData.damageBonus) {
                    damageExtraParts.push(["@damageBonus",game.i18n.localize("D35E.DamageBonus"),"base"]);
                    rollModifiers.push(`${game.i18n.localize("D35E.DamageBonus")} ${rollData.damageBonus}`)
                }
                rollMode = form.find('[name="rollMode"]').val();

                rollData.useAmount = form.find('[name="use"]').val();
                if (rollData.useAmount === undefined) {
                    // Spells by default do not have any useAmount, as useAmount can be used with them only as *bonus* power points
                    if (this.type !== "spell")
                        rollData.useAmount = 1
                    else
                        rollData.useAmount = 0
                } else {
                    rollData.useAmount = parseFloat(form.find('[name="use"]').val())
                }


                if (form.find('[name="ammunition-id"]').val() !== undefined) {
                    useAmmoId = form.find('[name="ammunition-id"]').val()
                    useAmmoDamage = form.find('[name="ammo-dmg-formula"]').val()
                    useAmmoDamageType = form.find('[name="ammo-dmg-type"]').val()
                    useAmmoAttack = form.find('[name="ammo-attack"]').val()
                    useAmmoNote = form.find('[name="ammo-note"]').val()
                    useAmmoName = form.find('[name="ammo-name"]').val()
                    if (useAmmoDamage !== '') {
                        damageExtraParts.push([useAmmoDamage,useAmmoDamageType]);
                    }
                    if (useAmmoAttack !== '') {
                        attackExtraParts.push(useAmmoAttack);
                    }
                    rollModifiers.push(`${useAmmoName}`)
                    // //console.log('D35E | Selected ammo', useAmmoDamage, useAmmoAttack)
                }


                // Power Attack
                rollData.powerAttackBonus = form.find('[name="power-attack"]').val();
                if (rollData.powerAttackBonus !== undefined) {
                    rollData.powerAttackBonus = parseInt(form.find('[name="power-attack"]').val())
                    rollData.weaponHands = 1
                    damageExtraParts.push(["floor(@powerAttackBonus * @weaponHands) * @critMult",game.i18n.localize("D35E.PowerAttack"),"base"]);
                    rollData.powerAttackPenalty = -rollData.powerAttackBonus;
                    attackExtraParts.push("@powerAttackPenalty");
                    if (rollData.powerAttackBonus > 0)
                        rollModifiers.push(`${game.i18n.localize("D35E.PowerAttack")} ${rollData.powerAttackBonus}`)
                }
                if (form.find('[name="manyshot"]').prop("checked")) {
                    manyshot = true;
                    manyshotCount = parseInt(form.find('[name="manyshot-count"]').val())
                    rollData.manyshotPenalty = -manyshotCount*2;
                    attackExtraParts.push("@manyshotPenalty");
                    rollModifiers.push(`${game.i18n.localize("D35E.FeatManyshot")}`)
                }

                if (form.find('[name="nonLethal"]').prop("checked")) {
                    nonLethal = true
                }
                const itemNonLethal = getProperty(this.data, "data.nonLethal") || false;
                if (nonLethal !== itemNonLethal) {
                    rollData.nonLethalPenalty = -4;
                    attackExtraParts.push("@nonLethalPenalty");
                    rollModifiers.push(`${game.i18n.localize("D35E.WeaponPropNonLethal")}`)

                }

                if (form.find('[name="prone"]').prop("checked")) {
                    rollData.pronePenalty = -4;
                    if (!rollData.attackToggles) rollData.attackToggles = {};
                    rollData.attackToggles.prone = true;
                    attackExtraParts.push("@pronePenalty");
                    rollModifiers.push(`${game.i18n.localize("D35E.Prone")}`)
                }
                if (form.find('[name="squeezing"]').prop("checked")) {
                    rollData.squeezingPenalty = -4;
                    if (!rollData.attackToggles) rollData.attackToggles = {};
                    rollData.attackToggles.squeezing = true;
                    attackExtraParts.push("@squeezingPenalty");
                    rollModifiers.push(`${game.i18n.localize("D35E.Squeezing")}`)
                }
                if (form.find('[name="highground"]').prop("checked")) {
                    rollData.highground = 1;
                    if (!rollData.attackToggles) rollData.attackToggles = {};
                    rollData.attackToggles.highGround = true;
                    attackExtraParts.push("@highground");
                    rollModifiers.push(`${game.i18n.localize("D35E.HighGround")}`)
                }
                if (form.find('[name="defensive"]').prop("checked")) {
                    rollData.defensive = -4;
                    if (!rollData.attackToggles) rollData.attackToggles = {};
                    rollData.attackToggles.defensive = true;
                    attackExtraParts.push("@defensive");
                    rollModifiers.push(`${game.i18n.localize("D35E.DefensiveFighting")}`)
                }
                if (form.find('[name="charge"]').prop("checked")) {
                    rollData.charge = 2;
                    if (!rollData.attackToggles) rollData.attackToggles = {};
                    rollData.attackToggles.charge = true;
                    attackExtraParts.push("@charge");
                    rollModifiers.push(`${game.i18n.localize("D35E.Charge")}`)
                }
                if (form.find('[name="ccshot"]').prop("checked")) {
                    rollData.ccshot = -4;
                    if (!rollData.attackToggles) rollData.attackToggles = {};
                    rollData.attackToggles.closeQuartersShot = true;
                    attackExtraParts.push("@ccshot");
                    rollModifiers.push(`${game.i18n.localize("D35E.CloseQuartersShot")}`)
                }
                if (form.find('[name="flanking"]').prop("checked")) {
                    rollData.flanking = 2;
                    if (!rollData.attackToggles) rollData.attackToggles = {};
                    rollData.attackToggles.flanking = true;
                    attackExtraParts.push("@flanking");
                    rollModifiers.push(`${game.i18n.localize("D35E.Flanking")}`)
                }

                if (form.find('[name="greater-manyshot"]').prop("checked")) {
                    greaterManyshotCount = parseInt(form.find('[name="greater-manyshot-count"]').val())
                    greaterManyshot = true;
                    rollData.greaterManyshotPenalty = -greaterManyshotCount*2;
                    attackExtraParts.push("@greaterManyshotPenalty");
                    rollModifiers.push(`${game.i18n.localize("D35E.FeatGreaterManyshot")}`)
                }
                if (form.find('[name="rapid-shot"]').prop("checked")) {
                    rapidShot = true;
                }
                if (form.find('[name="flurry-of-blows"]').prop("checked")) {
                    flurryOfBlows = true;
                }
                // Primary Attack (for natural attacks)
                let html = form.find('[name="primary-attack"]');
                if (typeof html.prop("checked") === "boolean") {
                    primaryAttack = html.prop("checked");
                    rollData.primaryAttack = true;
                }
                // Use measure template
                html = form.find('[name="measure-template"]');
                if (typeof html.prop("checked") === "boolean") {
                    useMeasureTemplate = html.prop("checked");
                }
                // Damage ability multiplier
                html = form.find('[name="damage-ability-multiplier"]');
                if (html.length > 0) {
                    rollData.damageAbilityMultiplier = parseFloat(html.val());

                }


                let twoWeaponMode = ''
                if (form.find('[name="twf-attack-mode"]').val() !== undefined) {
                    twoWeaponMode = form.find('[name="twf-attack-mode"]').val()
                    if (twoWeaponMode === 'main-offhand-light') {
                        rollData.twoWeaponPenalty = -4;
                        if (hasTwoWeaponFightingFeat)
                            rollData.twoWeaponPenalty = -2;
                        if (multiweaponFighting)
                            rollData.twoWeaponPenalty = -2;
                        attackExtraParts.push("@twoWeaponPenalty");
                    }
                    else if (twoWeaponMode === 'main-offhand-normal') {
                        rollData.twoWeaponPenalty = -6;
                        if (hasTwoWeaponFightingFeat)
                            rollData.twoWeaponPenalty = -4;
                        if (multiweaponFighting)
                            rollData.twoWeaponPenalty = -4;
                        attackExtraParts.push("@twoWeaponPenalty");
                    }
                    else if (twoWeaponMode === 'offhand-light') {
                        rollData.twoWeaponPenalty = -8;
                        if (hasTwoWeaponFightingFeat)
                            rollData.twoWeaponPenalty = -2;
                        if (multiweaponFighting)
                            rollData.twoWeaponPenalty = -2;
                        attackExtraParts.push("@twoWeaponPenalty");
                        twoWeaponFightingOffhand = true;
                    }
                    else if (twoWeaponMode === 'offhand-normal') {
                        rollData.twoWeaponPenalty = -10;
                        if (hasTwoWeaponFightingFeat)
                            rollData.twoWeaponPenalty = -4;
                        if (multiweaponFighting)
                            rollData.twoWeaponPenalty = -4;
                        attackExtraParts.push("@twoWeaponPenalty");
                        twoWeaponFightingOffhand = true;
                    }
                    else if (twoWeaponMode === 'two-handed') {
                        rollData.weaponHands = 2
                    }
                }

                if (form.find('[name="target-ids"]').val() !== undefined) {
                    selectedTargetIds = form.find('[name="target-ids"]').val()
                    let targetIdSet = new Set(selectedTargetIds.split(";"));
                    selectedTargets = canvas.tokens.objects.children.filter(t => targetIdSet.has(t.data._id))
                }
                $(form).find('[data-type="optional"]').each(function() {
                    if ($(this).prop("checked")) {
                        let featId = $(this).attr('data-feat-optional');
                        optionalFeatIds.push(featId);
                        if ($(form).find(`[name="optional-range-${featId}"]`).val() !== undefined)
                            optionalFeatRanges.set(featId,
                                {
                                    "base": $(form).find(`[name="optional-range-${featId}"]`)?.val() || 0,
                                    "slider1": $(form).find(`[name="optional-range-1-${featId}"]`)?.val() || 0,
                                    "slider2": $(form).find(`[name="optional-range-2-${featId}"]`)?.val() || 0,
                                    "slider3": $(form).find(`[name="optional-range-3-${featId}"]`)?.val() || 0
                                }
                            )
                    }
                })
                $(form).find('[data-type="conditional"]').each(function() {
                    if ($(this).prop("checked"))
                        enabledConditionals.push($(this).attr('data-conditional-optional'));
                })
            }

            // Prepare the chat message data
            let chatTemplateData = {
                name: this.name,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                rollMode: rollMode,
            };

            let allAttacks = []
            // Auto scaling attacks

            let autoScaleAttacks = (game.settings.get("D35E", "autoScaleAttacksBab") && actor.data.type !== "npc" && getProperty(this.data, "data.attackType") === "weapon" && getProperty(this.data, "data.autoScaleOption") !== "never") || getProperty(this.data, "data.autoScaleOption") === "always";
            if (autoScaleAttacks && fullAttack) {
                allAttacks.push({bonus: 0, label: `${game.i18n.localize("D35E.Attack")}`})
                for (let a = 5; a < actor.data.data.attributes.bab.total; a += 5) {
                    allAttacks.push({bonus:`-${a}`, label:`${game.i18n.localize("D35E.Attack")} ${Math.floor((a + 5) / 5)}`});
                }
            } else {
                allAttacks = fullAttack ? this.data.data.attackParts.reduce((cur, r) => {
                    cur.push({bonus: r[0], label: r[1]});
                    return cur;
                }, [{bonus: 0, label: `${game.i18n.localize("D35E.Attack")}`}]) : [{
                    bonus: 0,
                    label: `${game.i18n.localize("D35E.Attack")}`
                }];
            }

            if ((fullAttack || actor.data.data.attributes.bab.total < 6) && rapidShot) {
                allAttacks.unshift({
                    bonus: 0,
                    label: `Rapid Shot`
                })
                rollData.rapidShotPenalty = -2;
                attackExtraParts.push("@rapidShotPenalty");
            }

            if (flurryOfBlows) {
                allAttacks.push({
                    bonus: 0,
                    label: `Flurry of Blows`
                })
                let monkClass = (actor?.items || []).filter(o => o.type === "class" && (o.name === "Monk"  || o.data.data.customTag === "monk"))[0];
                //1-4 = -2
                if(monkClass.data.data.levels < 5) {
                    rollData.flurryOfBlowsPenalty = -2;
                    attackExtraParts.push("@flurryOfBlowsPenalty");
                }
                //5-8 = -1
                else if(monkClass.data.data.levels < 9) {
                    rollData.flurryOfBlowsPenalty = -1;
                    attackExtraParts.push("@flurryOfBlowsPenalty");
                //9+ = 0
                //11+ = 2nd extra attack
                } else if(monkClass.data.data.levels > 10) {
                    allAttacks.push({
                        bonus: 0,
                        label: `Flurry of Blows 2`
                    })
                }
            }


            let isHasted = (actor?.items || []).filter(o => o.type === "buff" && o.data.data.active && (o.name === "Haste" || o.data.data.changeFlags.hasted)).length > 0;
            if ((fullAttack || actor.data.data.attributes.bab.total < 6) && isHasted && (getProperty(this.data, "data.attackType") === "weapon" || getProperty(this.data, "data.attackType") === "natural")) {
                allAttacks.unshift({
                    bonus: 0,
                    label: `Haste`
                })
            }

            if (hasTwoImprovedWeaponFightingFeat && twoWeaponFightingOffhand) {
                allAttacks.push({
                    bonus: "-5",
                    label: `${game.i18n.localize("D35E.Attack")} 2`
                })
            }
            if (hasTwoGreaterFightingFeat && twoWeaponFightingOffhand) {
                allAttacks.push({
                    bonus: "-10",
                    label: `${game.i18n.localize("D35E.Attack")} 3`
                })
            }

            // //console.log('D35E | Enabled conditionals', enabledConditionals)
            let attackEnhancementMap = new Map();
            let damageEnhancementMap = new Map();
            for (let enabledConditional of enabledConditionals) {
                let conditional = itemData.conditionals.find(c => c.name === enabledConditional);
                rollModifiers.push(`${conditional.name}`)
                for (let modifier of conditional.modifiers) {
                    if (modifier.target === "attack") {
                        if (modifier.subTarget !== "allAttack") {
                            if (!attackEnhancementMap.has(modifier.subTarget))
                                attackEnhancementMap.set(modifier.subTarget, [])
                            attackEnhancementMap.get(modifier.subTarget).push(modifier.formula)
                        }
                        else
                            attackExtraParts.push(modifier.formula)
                    }
                    if (modifier.target === "damage") {
                        if (modifier.subTarget !== "allDamage") {

                            if (!damageEnhancementMap.has(modifier.subTarget))
                                damageEnhancementMap.set(modifier.subTarget, [])
                            damageEnhancementMap.get(modifier.subTarget).push({
                                formula: modifier.formula,
                                type: modifier.type
                            })
                        }
                        else
                            damageExtraParts.push([modifier.formula,CACHE.DamageTypes.get(modifier.type)?.data?.name || game.i18n.localize("D35E.UnknownDamageType"),modifier.type]);
                    }
                }
            }

            // Getting all combat changes from items
            let allCombatChanges = []
            let attackType = this.type;
            actor.items.filter(o => (o.type === "aura" || o.type === "feat" || (o.type ==="buff" && o.data.data.active) || (o.type === "equipment" && o.data.data.equipped === true && !o.data.data.melded))).forEach(i => {
                if (i.hasCombatChange(attackType,rollData)) {
                    allCombatChanges = allCombatChanges.concat(i.getPossibleCombatChanges(attackType, rollData))
                    rollModifiers.push(`${i.data.data.combatChangeCustomReferenceName || i.name}`)
                }
                if (i.hasCombatChange(attackType+'Optional',rollData) && optionalFeatIds.indexOf(i._id) !== -1) {
                    allCombatChanges = allCombatChanges.concat(i.getPossibleCombatChanges(attackType+'Optional', rollData, optionalFeatRanges.get(i._id)))
                    i.addCharges(-1 * (i.data.data.combatChangesUsesCost === 'chargesPerUse' ? i.data.data?.uses?.chargesPerUse || 1 : optionalFeatRanges.get(i._id).base));
                    if (optionalFeatRanges.get(i._id)) {
                        let ranges = []
                        if (optionalFeatRanges.get(i._id).base) ranges.push(optionalFeatRanges.get(i._id).base)
                        if (optionalFeatRanges.get(i._id).slider1) ranges.push(optionalFeatRanges.get(i._id).slider1)
                        if (optionalFeatRanges.get(i._id).slider2) ranges.push(optionalFeatRanges.get(i._id).slider2)
                        if (optionalFeatRanges.get(i._id).slider3) ranges.push(optionalFeatRanges.get(i._id).slider3)
                        rollModifiers.push(`${i.data.data.combatChangeCustomReferenceName || i.name} (${ranges.join(", ")})`)
                    }
                    else
                        rollModifiers.push(`${i.data.data.combatChangeCustomReferenceName || i.name}`)
                }
            })
            this._addCombatChangesToRollData(allCombatChanges, rollData);

            if (rollData.isKeen && !this.data.data.threatRangeExtended) {
                let baseCrit = this.data.data.ability.critRange || 20;
                baseCrit = 21 - 2 * (21 - baseCrit)
                rollData.item.ability.critRange = baseCrit;
                //this.data.data.ability.critRange = baseCrit;
            }

            if (rollData.featDamageBonus) {
                if (rollData.featDamageBonus !== 0) damageExtraParts.push(["@critMult*(${this.featDamageBonus})",'Feats','base']);
            }
            if (rollData.featDamagePrecision) {
                damageExtraParts.push(["(${this.featDamagePrecision})",'Precision']);
            }
            if (rollData.featDamage) {
                for (let dmg of Object.keys(rollData.featDamage)) {
                    // //console.log('Bonus damage!', dmg, rollData.featDamage[dmg])
                    damageExtraParts.push(["(${this.featDamage."+dmg+"})",dmg]);
                }
            }


            if (rollData.featAdditionalAttacksBAB) {
                if (rollData.featAdditionalAttacksBAB > 0) {
                    for (let i = 0; i < rollData.featAttackNumberBonus; i++) {
                        allAttacks.push({
                            bonus: "0",
                            label: `${game.i18n.localize("D35E.Feat")} Bonus Attack`
                        })
                    }
                }
            }

            let dc = this._getSpellDC(rollData)
            if (this.data.data?.metamagicFeats?.maximized) {
                damageModifiers.maximize = true;
                rollModifiers.push(`${game.i18n.localize("D35E.SpellMaximized")}`)
            }
            if (this.data.data?.metamagicFeats?.empowered) {
                damageModifiers.multiplier = 1.5
                rollModifiers.push(`${game.i18n.localize("D35E.SpellEmpowered")}`)
            }
            if (this.data.data?.metamagicFeats?.intensified) {
                damageModifiers.maximize = true;
                damageModifiers.multiplier = 2
                rollModifiers.push(`${game.i18n.localize("D35E.SpellIntensified")}`)
            }
            if (this.data.data?.metamagicFeats?.enlarged) {
                rollData.spellEnlarged = true;
                rollModifiers.push(`${game.i18n.localize("D35E.SpellEnlarged")}`)
            }
            if (this.data.data?.metamagicFeats?.widened) {
                rollData.spellWidened = true;
                rollModifiers.push(`${game.i18n.localize("D35E.SpellWidened")}`)
            }
            if (this.data.data?.metamagicFeats?.enhanced) {
                rollData.maxDamageDice += 10;
                rollModifiers.push(`${game.i18n.localize("D35E.SpellEnhanced")}`)
            }


            let manyshotAttacks = []
            if (greaterManyshot) {
                allAttacks.forEach(attack => {
                    let label = attack.label;
                    for (let i = 0; i < greaterManyshotCount; i++) {
                        let _attack = duplicate(attack)
                        _attack.label = label + ` (Greater Manyshot Arrow ${i+1})`
                        manyshotAttacks.push(_attack)
                    }
                });
                allAttacks = manyshotAttacks
            }

            // Lock useAmount for powers to max value
            if (this.type === "spell" && getProperty(this.data, "data.isPower")) {
                rollData.useAmount = Math.min(rollData.useAmount, rollData.cl - (getProperty(this.data, "data.powerPointsCost") || 0))
            }
            let attacks = [];
            if (this.hasAttack) {
                let attackId = 0;
                // Scaling number of attacks for spells (based on formula provided)
                if (itemData.attackCountFormula && itemData.attackParts.length === 0) {
                    let attackCount = (new Roll35e(itemData.attackCountFormula, rollData).roll().total || 1) - 1;
                    for (let i = 0; i < attackCount; i++) {
                        allAttacks.push({
                            bonus: "0",
                            label: "Attack"
                        })
                    }
                }
                for (let atk of allAttacks) {
                    // Create attack object
                    let attack = new ChatAttack(this, atk.label, actor, rollData);
                    let localAttackExtraParts = duplicate(attackExtraParts);
                    for (let aepConditional of attackEnhancementMap.get(`attack.${attackId}`) || []) {
                        localAttackExtraParts.push(aepConditional)
                    }
                    let localDamageExtraParts = duplicate(damageExtraParts);
                    for (let aepConditional of damageEnhancementMap.get(`attack.${attackId}`) || []) {
                        localDamageExtraParts.push([aepConditional.formula,CACHE.DamageTypes.get(aepConditional.type)?.data?.name || game.i18n.localize("D35E.UnknownDamageType"),aepConditional.type])
                    }
                    await attack.addAttack({
                        bonus: atk.bonus || 0,
                        extraParts: localAttackExtraParts,
                        primaryAttack: primaryAttack,
                        actor: actor,
                        critConfirmBonus: new Roll35e(`${getProperty(this.data, "data.critConfirmBonus")}` || "0", rollData).roll().total,
                    });
                    if (this.hasDamage) {
                        await attack.addDamage({
                            extraParts: localDamageExtraParts,
                            primaryAttack: primaryAttack,
                            critical: false,
                            actor: actor,
                            modifiers: damageModifiers
                        });
                        if (attack.hasCritConfirm) {
                            await attack.addDamage({
                                extraParts: localDamageExtraParts,
                                primaryAttack: primaryAttack,
                                critical: true,
                                actor: actor,
                                modifiers: damageModifiers
                            });
                        }
                        if (manyshot) {
                            for (let i = 1; i < manyshotCount; i++){
                                await attack.addDamage({
                                    extraParts: localDamageExtraParts,
                                    primaryAttack: primaryAttack,
                                    critical: false,
                                    actor: actor,
                                    multiattack: i,
                                    modifiers: damageModifiers
                                });
                            }

                        }
                    }
                    await attack.addEffect({primaryAttack: primaryAttack, actor:actor, useAmount: rollData.useAmount || 1, cl: rollData.cl || null, spellPenetration: rollData.spellPenetration || null});
                    await this._addCombatSpecialActionsToAttack(allCombatChanges, attack, actor, rollData, optionalFeatRanges, attackId);
                    // Add to list
                    attacks.push(attack);
                    attackId++;
                }
            }
            // Add damage only
            else if (this.hasDamage) {
                let attackCount = 1;
                if (itemData.attackCountFormula)
                    attackCount = new Roll35e(itemData.attackCountFormula,rollData).roll().total || 1;
                for (let i = 0; i < attackCount; i++) {
                    let attack = new ChatAttack(this,"",actor, rollData);
                    attack.rollData = rollData;
                    await attack.addDamage({
                        extraParts: damageExtraParts,
                        primaryAttack: primaryAttack,
                        critical: false,
                        modifiers: damageModifiers
                    });
                    await attack.addEffect({primaryAttack: primaryAttack, actor:actor, useAmount: rollData.useAmount || 1, cl: rollData.cl || null, spellPenetration: rollData.spellPenetration || null});

                    await this._addCombatSpecialActionsToAttack(allCombatChanges, attack, actor, rollData, optionalFeatRanges, 0);

                    attacks.push(attack);
                }
            }
            // Add effect notes only
            else if (this.hasEffect) {
                let attack = new ChatAttack(this,"",actor, rollData);
                attack.rollData = rollData;
                await attack.addEffect({primaryAttack: primaryAttack, actor:actor, useAmount: rollData.useAmount || 1, cl: rollData.cl || null, spellPenetration: rollData.spellPenetration || null});
                await this._addCombatSpecialActionsToAttack(allCombatChanges, attack, actor, rollData, optionalFeatRanges, 0);
                // Add to list
                attacks.push(attack);
            } else if (getProperty(this.data, "data.actionType") === "special") {
                let attack = new ChatAttack(this,"",actor, rollData);
                attack.rollData = rollData;
                await attack.addSpecial(actor,rollData.useAmount || 1,rollData.cl, rollData.spellPenetration);
                await this._addCombatSpecialActionsToAttack(allCombatChanges, attack, actor, rollData, optionalFeatRanges, 0);
                // Add to list
                attacks.push(attack);
            }
            let rolls = []
            attacks.forEach(a => {
                rolls.push(...a.rolls)
            })
            chatTemplateData.attacks = attacks;

            // Prompt measure template
            if (useMeasureTemplate) {

                // //console.log(`D35E | Creating measure template.`)
                // Create template
                const template = AbilityTemplate.fromItem(this, rollData.spellWidened ? 2 : 1, rollData);
                if (template) {
                    if (getProperty(this, "actor.sheet.rendered")) actor.sheet.minimize();
                    const success = await template.drawPreview(ev);
                    if (getProperty(this, "actor.sheet.rendered")) actor.sheet.maximize();
                    if (!success) {
                        return;
                    }
                }
            }

            // //console.log(`D35E | Updating item on attack.`)
            // Deduct charge
            if (this.autoDeductCharges && !skipChargeCheck) {
                // //console.log(`D35E | Deducting ${this.chargeCost} charges.`)
                if (rollData.useAmount === undefined)
                    await this.addCharges(-1*this.chargeCost, itemUpdateData);
                else
                    await this.addCharges(-1 * parseFloat(rollData.useAmount)*this.chargeCost, itemUpdateData);
            } else {
                if (getProperty(this.data, "data.requiresPsionicFocus")) {
                    if (this.actor) {
                        await this.actor.update({'data.attributes.psionicFocus': false})
                    }
                }
            }
            if (useAmmoId !== "none" && actor !== null && !this.data.data.returning) {
                await actor.quickChangeItemQuantity(useAmmoId, -1 * attacks.length * (1 + Math.max(0,manyshotCount - 1)))
            }
            // Update item, only if it has an id (is real item, not item from enhancement)
            if (itemUpdateData._id)
                await this.update(itemUpdateData);

            // Set chat data
            let chatData = {
                speaker: ChatMessage.getSpeaker({actor: actor}),
                rollMode: rollMode,
                sound: CONFIG.sounds.dice,
                "flags.D35E.noRollRender": true,
            };

            // Post message
            if (this.data.type === "spell" || this.data.data.isFromSpell) {
                if (!game.settings.get("D35E", "hideSpellDescriptionsIfHasAction"))
                    await this.roll({rollMode: rollMode});
            }
            let rolled = false;
            if (this.hasAttack || this.hasDamage || this.hasEffect || getProperty(this.data, "data.actionType") === "special") {

                // //console.log(`D35E | Generating chat message.`)
                // Get extra text and properties
                let hasBoxInfo = this.hasAttack || this.hasDamage || this.hasEffect;
                let attackNotes = []
                const noteObjects = actor.getContextNotes("attacks.attack");
                for (let noteObj of noteObjects) {
                    rollData.item = {};
                    if (noteObj.item != null) rollData.item = duplicate(noteObj.item.data.data);

                    for (let note of noteObj.notes) {

                        attackNotes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(`<span class="tag">${ItemPF._fillTemplate(o,rollData)}</span>`, {rollData: rollData})));
                    }
                }
                if (typeof itemData.attackNotes === "string" && itemData.attackNotes.length) {
                    attackNotes.push(...itemData.attackNotes.split(/[\n\r]+/));
                }

                if (useAmmoNote !== '') {
                    attackNotes.push(...useAmmoNote.split(/[\n\r]+/));
                }
                let attackStr = "";
                for (let an of attackNotes) {
                    attackStr += `<span class="tag">${an}</span>`;
                }

                if (attackStr.length > 0) {
                    const innerHTML = TextEditor.enrichHTML(attackStr, {rollData: rollData});
                    extraText += `<div class="flexcol property-group"><label>${game.i18n.localize("D35E.AttackNotes")}</label><div class="flexrow">${innerHTML}</div></div>`;
                }

                const properties = this.getChatData({}, rollData).properties;
                if (properties.length > 0) props.push({
                    header: game.i18n.localize("D35E.InfoShort"),
                    value: properties
                });
                if (rollModifiers.length > 0) props.push({
                    header: game.i18n.localize("D35E.RollModifiers"),
                    value: rollModifiers
                });

                const token = actor ? actor.token : null;
                const templateData = mergeObject(chatTemplateData, {
                    extraText: extraText,
                    hasExtraText: extraText.length > 0,
                    properties: props,
                    hasProperties: props.length > 0,
                    item: this.data,
                    actor: actor.data,
                    tokenId: token ? `${token.parent._id}.${token.id}` : null,
                    hasBoxInfo: hasBoxInfo,
                    useAmmoName: useAmmoName,
                    dc: dc,
                    nonLethal: nonLethal,
                    useAmmoId: useAmmoId,
                    incorporeal: this.data.data.incorporeal || this.actor?.data?.data?.traits?.incorporeal,
                    targets: selectedTargets,
                    targetIds: selectedTargetIds,
                    hasTargets: selectedTargets.length,
                    isSpell: this.type === "spell",
                    hasPr: this.data.data.pr,
                    hasSr: this.data.data.sr,
                    cl: rollData.cl,
                    spellPenetration: rollData.cl + (rollData.featSpellPenetrationBonus || 0)
                }, {inplace: false});
                // Create message
                await createCustomChatMessage("systems/D35E/templates/chat/attack-roll.html", templateData, chatData, {rolls: rolls});
                rolled = true;
            }
            if (this.hasRolltableDraw) {
                let rollTable = await game.packs.get(this.data.data.rollTableDraw.pack).getEntity(this.data.data.rollTableDraw.id)
                if (this.data.data.rollTableDraw.formula) {
                    var roll = new Roll35e(this.data.data.rollTableDraw.formula, rollData);
                    await rollTable.draw({roll:roll, rollMode:rollMode});
                } else {
                    await rollTable.draw({rollMode:rollMode});
                }
            }
            return {rolled: rolled, rollData: rollData};
        };

        // Handle fast-forwarding
        if (skipDialog || (ev instanceof MouseEvent && (ev.shiftKey || ev.button === 2)) || getProperty(this.data, "data.actionType") === "special") return _roll.call(this, true);

        // Render modal dialog
        let template = "systems/D35E/templates/apps/attack-roll-dialog.html";
        let weaponName = this.data.data.baseWeaponType || "";
        let featWeaponName = `(${weaponName})`;
        let bonusMaxPowerPoints = 0;
        if (this.type === "spell" && getProperty(this.data, "data.isPower")) {
            let spellbookIndex = this.data.data.spellbook;
            let spellbook = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${spellbookIndex}`) || {};
            let availablePowerPoints = (spellbook.powerPoints || 0) - (this.data.data.powerPointsCost || 0);
            bonusMaxPowerPoints = Math.min((this?.actor?.data?.data?.attributes?.hd.total || 0) + 10 - (this.data.data.powerPointsCost || 0),availablePowerPoints);
        }
        let autoScaleAttacks = (game.settings.get("D35E", "autoScaleAttacksBab") && actor.data.type !== "npc" && getProperty(this.data, "data.attackType") === "weapon" && getProperty(this.data, "data.autoScaleOption") !== "never") || getProperty(this.data, "data.autoScaleOption") === "always"
        let extraAttacksCount = autoScaleAttacks ? Math.ceil((actor.data.data.attributes.bab.total)/5.0) : (getProperty(this.data, "data.attackParts") || []).length + 1;
        let rc = game.settings.get("D35E", `rollConfig`).rollConfig;
        let dialogData = {
            data: rollData,
            id: this.id,
            item: this.data.data,
            targets: Array.from(game.user.targets) || [],
            hasTargets: (game.user.targets || new Set()).size,
            rollMode: rollModeOverride ? rollModeOverride : (game.settings.get("D35E", `rollConfig`).rollConfig[actor.type]?.attack  || game.settings.get("core", "rollMode")),
            rollModes: CONFIG.Dice.rollModes,
            twoWeaponAttackTypes: D35E.twoWeaponAttackType,
            attackType: attackType ? attackType : "primary",
            attackTypeSet: isFullAttack,
            hasAttack: this.hasAttack,
            hasDamage: this.hasDamage,
            allowNoAmmo: game.settings.get("D35E", "allowNoAmmo") || actor.type === "npc",
            nonLethal: getProperty(this.data, "data.nonLethal") || false,
            allowMultipleUses: this.data.data?.uses?.allowMultipleUses,
            multipleUsesMax: this.data.data?.uses?.maxPerUse ? Math.min(Math.floor(this.charges/this.chargeCost),this.data.data.uses.maxPerUse) : Math.floor(this.charges/this.chargeCost),
            bonusPowerPointsMax: bonusMaxPowerPoints,
            isSpell: this.type === "spell" && !getProperty(this.data, "data.isPower"),
            isPower: this.type === "spell" && getProperty(this.data, "data.isPower"),
            hasDamageAbility: getProperty(this.data, "data.ability.damage") !== "",
            isNaturalAttack: getProperty(this.data, "data.attackType") === "natural",
            isWeaponAttack: getProperty(this.data, "data.attackType") === "weapon",
            isRangedWeapon: getProperty(this.data, "data.attackType") === "weapon" && getProperty(this.data, "data.actionType") === "rwak",
            ammunition: this.data.data.thrown ? actor.items.filter(o => o._id === this.data.data.originalWeaponId) : actor.items.filter(o => o.type === "loot" && o.data.data.subType === "ammo" && o.data.data.quantity > 0),
            extraAttacksCount: extraAttacksCount,
            hasTemplate: this.hasTemplate,
            canPowerAttack: actor.items.filter(o => o.type === "feat" && o.originalName === "Power Attack").length > 0,
            maxPowerAttackValue: getProperty(actor.data, "data.attributes.bab.total"),
            canManyshot: actor.items.filter(o => o.type === "feat" && o.originalName === "Manyshot").length > 0,
            maxManyshotValue: 2 + Math.floor((getProperty(actor.data, "data.attributes.bab.total") - 6) / 5),
            canGreaterManyshot: actor.items.filter(o => o.type === "feat" && o.originalName === "Greater Manyshot").length > 0,
            canRapidShot: actor.items.filter(o => o.type === "feat" && o.originalName === "Rapid Shot").length > 0,
            canFlurryOfBlows: actor.items.filter(o => o.type === "feat" && (o.originalName === "Flurry of Blows" || o.data.data.customTag === "flurryOfBlows")).length > 0,
            maxGreaterManyshotValue: getProperty(actor.data, "data.abilities.wis.mod"),
            weaponFeats: actor.items.filter(o => (o.type === "aura" || o.type === "feat" || (o.type ==="buff" && o.data.data.active) || (o.type === "equipment" && o.data.data.equipped === true && !o.data.data.melded)) && o.hasCombatChange(this.type,rollData)),
            weaponFeatsOptional: actor.items.filter(o => (o.type === "aura" || o.type === "feat" || (o.type ==="buff" && o.data.data.active) || (o.type === "equipment" && o.data.data.equipped === true && !o.data.data.melded)) && o.hasCombatChange(`${this.type}Optional`,rollData)),
            conditionals: this.data.data.conditionals,
        };
        const html = await renderTemplate(template, dialogData);
        // //console.log(dialogData)
        let roll;
        const buttons = {};
        let wasRolled = false;
        if (this.hasAttack) {
            if (this.type !== "spell") {
                buttons.normal = {
                    label: game.i18n.localize("D35E.SingleAttack"),
                    callback: html => {
                        wasRolled = true;
                        roll = _roll.call(this, false, html)
                    }
                };
            }
            if (extraAttacksCount > 1 || this.type === "spell") {
                buttons.multi = {
                    label: this.type === "spell" ? game.i18n.localize("D35E.Cast") : (game.i18n.localize("D35E.FullAttack") + " (" + (extraAttacksCount) + " attacks)"),
                    callback: html => {
                        wasRolled = true;
                        roll = _roll.call(this, true, html)
                    }
                };
            }
        } else {
            buttons.normal = {
                label: this.type === "spell" ? game.i18n.localize("D35E.Cast") : game.i18n.localize("D35E.Use"),
                callback: html => {
                    wasRolled = true;
                    roll = _roll.call(this, false, html)
                }
            };
        }
        await new Promise(resolve => {
            new Dialog({
                title: `${game.i18n.localize("D35E.Use")}: ${this.name} - ${actor.name}`,
                content: html,
                buttons: buttons,
                classes: ['custom-dialog'],
                default: buttons.multi != null ? "multi" : "normal",
                close: html => {
                    return resolve(rolled ? roll : false);
                }
            }).render(true);
        });
        return {wasRolled: wasRolled, roll: roll};
    }

    async _addCombatSpecialActionsToAttack(allCombatChanges, attack, actor, rollData, optionalFeatRanges, attackId) {
        for (const c of allCombatChanges) {
            if (c[5] && c[5] !== "0") {
                if (c[9] && attackId !== 0) continue;
                await attack.addCommandAsSpecial(c[7], c[8], c[5], actor, rollData.useAmount || 1, rollData.cl, optionalFeatRanges.get(c[6])?.base || 0);
            }
        }
    }

    _getSpellDC(_rollData) {
        const data = duplicate(this.data.data);
        let spellDC = {dc: null, type: null, description: null}

        const rollData = _rollData ? _rollData : this.actor ? this.actor.getRollData() : {};
        if (!_rollData) {
            rollData.item = data;
            if (this.actor) {
                let allCombatChanges = []
                let attackType = this.type;
                this.actor.items.filter(o => (o.type === "aura" || o.type === "feat" || (o.type === "buff" && o.data.data.active) || (o.type === "equipment" && o.data.data.equipped === true && !o.data.data.melded)) && o.hasCombatChange(attackType, rollData)).forEach(i => {
                    allCombatChanges = allCombatChanges.concat(i.getPossibleCombatChanges(attackType, rollData))
                })

                this._addCombatChangesToRollData(allCombatChanges, rollData);
            }
        }

        // Get the spell specific info
        let spellbookIndex, spellAbility, ablMod = 0;
        let spellbook = null;
        let cl = 0;
        let sl = 0;
        if (this.type === "spell") {
            spellbookIndex = data.spellbook;
            spellbook = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${spellbookIndex}`) || {};
            spellAbility = spellbook.ability;
            if (spellAbility !== "") ablMod = getProperty(this.actor.data, `data.abilities.${spellAbility}.mod`);

            cl += getProperty(spellbook, "cl.total") || 0;
            cl += data.clOffset || 0;
            cl -= this.actor.data.data.attributes.energyDrain || 0

            cl += rollData.featClBonus || 0;

            sl += data.level;
            sl += data.slOffset || 0;

            rollData.cl = cl;
            rollData.sl = sl;
            rollData.ablMod = ablMod;
        } else if (this.type === "card") {
            let deckIndex = data.deck;
            let deck = getProperty(this.actor.data, `data.attributes.cards.decks.${deckIndex}`) || {};
            spellAbility = deck.ability;
            if (spellAbility !== "") ablMod = getProperty(this.actor.data, `data.abilities.${spellAbility}.mod`);

            cl += getProperty(deck, "cl.total") || 0;
            cl += data.clOffset || 0;
            cl += rollData.featClBonus || 0;
            cl -= this.actor.data.data.attributes.energyDrain || 0

            sl += data.level;
            sl += data.slOffset || 0;

            rollData.cl = cl;
            rollData.sl = sl;
            rollData.ablMod = ablMod;
        }

        spellDC.cl = cl;

        if (data.hasOwnProperty("actionType") && (getProperty(data, "save.description") || getProperty(data, "save.type")) && getProperty(data, "save.description") !== "None") {
            let saveDC = new Roll35e(data.save.dc.length > 0 ? data.save.dc : (data.save.dc.toString() || "0"), rollData).roll().total;
            let saveDesc = data.save.description;
            if (this.type === "spell") {
                saveDC += new Roll35e(spellbook.baseDCFormula || "", rollData).roll().total;
            }

            if (saveDC > 0 && data?.save?.type) {
                spellDC.dc = saveDC + (rollData.featSpellDCBonus || 0);
                spellDC.type = data.save.type;
                spellDC.ability = data.save.ability;
                spellDC.isHalf = data.save.type.indexOf('half') !== -1;
                spellDC.isPartial = data.save.type.indexOf('partial') !== -1;
                spellDC.description = `${CONFIG.D35E.savingThrowTypes[data.save.type]}`;
                if (data.save.ability) spellDC.description += ` (${CONFIG.D35E.abilitiesShort[data.save.ability]})`;
            }
            else if (saveDC > 0 && saveDesc) {
                spellDC.dc = saveDC + (rollData.featSpellDCBonus || 0);
                if (saveDesc.toLowerCase().indexOf('will') !== -1) {
                    spellDC.type = 'will';
                } else if (saveDesc.toLowerCase().indexOf('reflex') !== -1) {
                    spellDC.type = 'reflex';
                } else if (saveDesc.toLowerCase().indexOf('fortitude') !== -1) {
                    spellDC.type = 'fortitude';
                }
                else if (saveDesc.toLowerCase().indexOf('will') !== -1) {
                    spellDC.type = 'will';
                } else if (saveDesc.toLowerCase().indexOf('ref') !== -1) {
                    spellDC.type = 'reflex';
                } else if (saveDesc.toLowerCase().indexOf('fort') !== -1) {
                    spellDC.type = 'fortitude';
                }
                if (saveDesc.toLowerCase().indexOf('negates') !== -1) {
                    spellDC.type += 'negates';
                } if (saveDesc.toLowerCase().indexOf('partial') !== -1) {
                    spellDC.type += 'partial';
                    spellDC.isPartial = true;
                } else if (saveDesc.toLowerCase().indexOf('half') !== -1) {
                    spellDC.type += 'half';
                    spellDC.isHalf = true;
                }

                if (saveDesc.toLowerCase().indexOf('cha') !== -1) {
                    spellDC.ability += 'cha';
                } else if (saveDesc.toLowerCase().indexOf('con') !== -1) {
                    spellDC.ability += 'con';
                } else if (saveDesc.toLowerCase().indexOf('dex') !== -1) {
                    spellDC.ability += 'dex';
                } else if (saveDesc.toLowerCase().indexOf('str') !== -1) {
                    spellDC.ability += 'str';
                } else if (saveDesc.toLowerCase().indexOf('int') !== -1) {
                    spellDC.ability += 'int';
                } else if (saveDesc.toLowerCase().indexOf('wis') !== -1) {
                    spellDC.ability += 'wis';
                }
                spellDC.description = saveDesc;
            }
        }
        // //console.log('D35E | Calculated spell DC', spellDC)
        return spellDC;
    }

    hasCombatChange(itemType, rollData) {
        let combatChanges = getProperty(this.data,"data.combatChanges") || [];
        let attackType = getProperty(rollData,"item.actionType") || ""
        let combatChangesRollData = duplicate(rollData);
        combatChangesRollData.self =  mergeObject(this.data.data, this.getRollData(), {inplace: false})
        try {
            return combatChanges.some(change => {
                return (change[0] === 'all' || change[0] === itemType) && (change[1] === '' || attackType === change[1]) && (change[2] === '' || new Roll35e(change[2], combatChangesRollData).roll().total === true)
            });
        } catch {
            return false;
        }
    }

    getPossibleCombatChanges(itemType, rollData, range = {base: 0, slider1: 0, slider2: 0, slider3: 0}) {
        if (itemType.endsWith('Optional') && this.isCharged && !this.charges) return [];
        let combatChanges = getProperty(this.data,"data.combatChanges") || [];
        let attackType = getProperty(rollData,"item.actionType") || ""
        let combatChangesRollData = duplicate(rollData);
        combatChangesRollData.self =  mergeObject(this.data.data, this.getRollData(), {inplace: false})
        combatChangesRollData.range = range.base || 0
        combatChangesRollData.range1 = range.slider1 || 0
        combatChangesRollData.range2 = range.slider2 || 0
        combatChangesRollData.range3 = range.slider3 || 0
        return combatChanges.filter(change => {
            return (change[0] === 'all' || change[0] === itemType) && (change[1] === '' || attackType === change[1]) && (change[2] === '' || new Roll35e(change[2], combatChangesRollData).roll().total === true)
        }).map(c => {
            if (typeof c[4] === "string") {
                c[4] = c[4].replace(/@range1/g, combatChangesRollData.range1)
                c[4] = c[4].replace(/@range2/g, combatChangesRollData.range2)
                c[4] = c[4].replace(/@range3/g, combatChangesRollData.range3)
                c[4] = c[4].replace(/@range/g, combatChangesRollData.range)
            }
            if (c[3].indexOf('$') === -1 && c[3].indexOf('&') === -1) {
                if (c[4] !== "")
                    c[4] = new Roll35e(`${c[4]}`,combatChangesRollData).roll().total
                else {
                    c[4] = 0;
                    ui.notifications.warn(game.i18n.localize("D35E.EmptyCombatChange").format(this.name));
                }
            }
            if (c.length === 6) {
                if (typeof c[5] === "string") {
                    c[5] = c[5].replace(/@range1/g, combatChangesRollData.range1)
                    c[5] = c[5].replace(/@range2/g, combatChangesRollData.range2)
                    c[5] = c[5].replace(/@range3/g, combatChangesRollData.range3)
                    c[5] = c[5].replace(/@range/g, combatChangesRollData.range)
                }
                c.push(this.id)
                c.push(this.name)
                c.push(this.img)
                c.push(this.data.data.combatChangesApplySpecialActionsOnce)
            }
            return c;
        });
    }

    get hasUseableChange() {
        if (this.isCharged && !this.charges) return false;
        return true;
    }

    /**
     * Place an attack roll using an item (weapon, feat, spell, or equipment)
     * Rely upon the DicePF.d20Roll logic for the core implementation
     */
    rollAttack(options = {}) {
        const itemData = this.data.data;
        let rollData;
        if (!options.data) {
            rollData = this.actor.getRollData();
            rollData.item = mergeObject(duplicate(itemData), this.getRollData(), {inplace: false});
        } else rollData = options.data;

        // Add CL

        if (this.type === "spell" || this.data.data.actionType === "rsak" || this.data.data.actionType === "msak" || this.data.data.actionType === "spellsave" || this.data.data.actionType === "heal") {
            this._adjustSpellCL(itemData, rollData)
        }
        // Determine size bonus
        rollData.sizeBonus = CONFIG.D35E.sizeMods[rollData.traits.actualSize];
        // Add misc bonuses/penalties
        rollData.item.proficiencyPenalty = -4;

        // Determine ability score modifier
        let abl = rollData.item.ability.attack;

        // Define Roll parts
        let parts = [];
        // Add ability modifier
        if (abl != "" && rollData.abilities[abl] != null && rollData.abilities[abl].mod !== 0) parts.push(`@abilities.${abl}.mod`);
        // Add bonus parts
        if (options.parts != null) parts = parts.concat(options.parts);
        // Add size bonus
        if (rollData.sizeBonus !== 0) parts.push("@sizeBonus");
        if (rollData.featAttackBonus) {
            if (rollData.featAttackBonus !== 0) parts.push("${this.featAttackBonus}");
        }
        
        // Add attack bonus
        if (itemData.attackBonus !== "") {
            let attackBonus = new Roll35e(itemData.attackBonus, rollData).roll().total;
            rollData.item.attackBonus = attackBonus.toString();
            parts.push("@item.attackBonus");
        }

        // Add certain attack bonuses
        if (rollData.attributes.attack.general !== 0) {
            parts.push("@attributes.attack.general");
        }
        if (["mwak", "msak"].includes(itemData.actionType) && rollData.attributes.attack.melee !== 0) {
            parts.push("@attributes.attack.melee");
        } else if (["rwak", "rsak"].includes(itemData.actionType) && rollData.attributes.attack.ranged !== 0) {
            parts.push("@attributes.attack.ranged");
        }
        // Add BAB
        if (rollData.attributes.bab.total !== 0 && rollData.attributes.bab.total != null) {
            parts.push("@attributes.bab.total");
        }
        // Add item's enhancement bonus
        if (rollData.item.enh !== 0 && rollData.item.enh != null) {
            parts.push("@item.enh");
        }
        // Subtract energy drain
        if (rollData.attributes.energyDrain != null && rollData.attributes.energyDrain !== 0) {
            parts.push("- max(0, abs(@attributes.energyDrain))");
        }
        // Add proficiency penalty
        if ((this.data.type === "attack") && !itemData.proficient) {
            parts.push("@item.proficiencyPenalty");
        }
        // Add masterwork bonus
        if (this.data.type === "attack" && itemData.masterwork === true && itemData.enh < 1) {
            rollData.item.masterworkBonus = 1;
            parts.push("@item.masterworkBonus");
        }
        // Add secondary natural attack penalty

        let hasMultiattack = this.actor ? this.actor.items.filter(o => o.type === "feat" && (o.name === "Multiattack" || o.data.data.changeFlags.multiAttack)).length > 0 : false;
        if (options.primaryAttack === false && hasMultiattack) parts.push("-2");
        if (options.primaryAttack === false && !hasMultiattack) parts.push("-5");
        // Add bonus

        if (options.bonus) {
            rollData.bonus = options.bonus;
            parts.push("@bonus");
        }
        // Add extra parts
        if (options.extraParts != null) {
            parts = parts.concat(options.extraParts);
        }
        let roll = new Roll35e(["1d20"].concat(parts).join("+"), rollData).roll();
        return roll;
    }


    /* -------------------------------------------- */

    /**
     * Only roll the item's effect.
     */
    rollEffect({critical = false, primaryAttack = true} = {}, tempActor = null, _rollData = rollData) {
        const itemData = this.data.data;
        let actor = this.actor;
        if (tempActor !== null) {
            actor = tempActor;
        }

        const actorData = actor.data.data;
        const rollData = mergeObject(duplicate(actorData), {
            item: mergeObject(itemData, this.getRollData(), {inplace: false}),
            ablMult: 0
        }, {inplace: false});

        if (!this.hasEffect) {
            throw new Error("You may not make an Effect Roll with this Item.");
        }

        // Add spell data
        if (this.type === "spell" || this.data.data.actionType === "rsak" || this.data.data.actionType === "msak" || this.data.data.actionType === "spellsave" || this.data.data.actionType === "heal") {
            this._adjustSpellCL(itemData, rollData)
            const sl = this.data.data.level + (this.data.data.slOffset || 0);
            rollData.sl = sl;
        }


        // Determine critical multiplier
        rollData.critMult = 1;
        if (critical) rollData.critMult = rollData.item.ability.critMult;
        // Determine ability multiplier
        if (rollData.item.ability.damageMult != null) rollData.ablMult = rollData.item.ability.damageMult;
        if (primaryAttack === false && rollData.ablMult > 0) rollData.ablMult = 0.5;
        let naturalAttackCount = (this.actor?.items || []).filter(o => o.type === "attack" && o.data.data.attackType === "natural").length;
        if (rollData.item.attackType === "natural" && primaryAttack && naturalAttackCount === 1) rollData.ablMult = 1.5;

        // Create effect string
        let notes = []
        const noteObjects = actor.getContextNotes("attacks.effect");

        for (let noteObj of noteObjects) {
            rollData.item = {};
            //if (noteObj.item != null) rollData.item = duplicate(noteObj.item.data.data);
            if (noteObj.item != null) rollData.item = mergeObject(duplicate(noteObj.item.data.data), noteObj.item.getRollData(), {inplace: false})

            for (let note of noteObj.notes) {
                notes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(`<span class="tag">${ItemPF._fillTemplate(o,rollData)}</span>`, {rollData: rollData})));
            }
        }
        notes.push(...(itemData.effectNotes || "").split(/[\n\r]+/).filter(o => o.length > 0).map(o => TextEditor.enrichHTML(`<span class="tag">${ItemPF._fillTemplate(o,rollData)}</span>`, {rollData: rollData})));

        const inner = notes.join('')
        if  (notes.length > 0) {
            return `<div class="flexcol property-group"><label>${game.i18n.localize("D35E.EffectNotes")}</label><div class="flexrow">${inner}</div></div>`;
        } else
            return '';
    }

    /**
     * Place a damage roll using an item (weapon, feat, spell, or equipment)
     * Rely upon the DicePF.damageRoll logic for the core implementation
     */
    rollDamage({data = null, critical = false, extraParts = [], primaryAttack = true, modifiers = {}} = {}) {
        const itemData = this.data.data;
        let rollData = null;
        let baseModifiers = [];
        if (!data) {
            rollData = this.actor.getRollData();
            rollData.item = duplicate(itemData);
        } else rollData = data;

        if (!this.hasDamage) {
            throw new Error("You may not make a Damage Roll with this Item.");
        }

        // Add CL
        if (this.type === "spell" || this.data.data.actionType === "rsak" || this.data.data.actionType === "msak" || this.data.data.actionType === "spellsave" || this.data.data.actionType === "heal") {
            this._adjustSpellCL(itemData, rollData);
        }

        // Determine critical multiplier
        rollData.critMult = 1;
        rollData.ablMult = 1;
        if (critical) rollData.critMult = this.data.data.ability.critMult;
        // Determine ability multiplier
        if (rollData.damageAbilityMultiplier !== undefined && rollData.damageAbilityMultiplier !== null) rollData.ablMult = rollData.damageAbilityMultiplier;
        if (primaryAttack === false && rollData.ablMult > 0) rollData.ablMult = 0.5;
        let naturalAttackCount = (this.actor?.items || []).filter(o => o.type === "attack" && o.data.data.attackType === "natural").length;
        if (rollData.item.attackType === "natural" && primaryAttack && naturalAttackCount === 1) rollData.ablMult = 1.5;


        // Define Roll parts
        let parts = this._mapDamageTypes(itemData.damage.parts);

        parts[0].base = alterRoll(parts[0].base, 0, rollData.critMult);

        // Determine ability score modifier
        let abl = rollData.item.ability.damage;
        if (typeof abl === "string" && abl !== "") {
            rollData.ablDamage = Math.floor(rollData.abilities[abl].mod * (rollData.ablMult || 1));
            if (rollData.abilities[abl].mod < 0) rollData.ablDamage = rollData.abilities[abl].mod;
            if (rollData.ablDamage < 0) parts.push({base: "@ablDamage", extra: [], damageType: "Ability", damageTypeUid: parts[0].damageTypeUid});
            else if (rollData.critMult !== 1) parts.push({base: "@ablDamage * @critMult", extra: [], damageType: "Ability", damageTypeUid: parts[0].damageTypeUid});
            else if (rollData.ablDamage !== 0) parts.push({base: "@ablDamage", extra: [], damageType: "Ability", damageTypeUid: parts[0].damageTypeUid});
        }
        // Add enhancement bonus
        if (rollData.item.enh != null && rollData.item.enh !== 0 && rollData.item.enh != null) {
            if (rollData.critMult !== 1) parts.push({base: "@item.enh * @critMult", extra: [], damageType: "Enhancement", damageTypeUid: parts[0].damageTypeUid});
            else parts.push({base: "@item.enh", extra: [], damageType: "Enhancement", damageTypeUid: parts[0].damageTypeUid});;
        }

        // Add general damage
        if (rollData.attributes.damage.general !== 0) {
            if (rollData.critMult !== 1) parts.push({base: "@attributes.damage.general * @critMult", extra: [], damageType: "General", damageTypeUid: parts[0].damageTypeUid});
            else parts.push({base: "@attributes.damage.general", extra: [], damageType: "General", damageTypeUid: parts[0].damageTypeUid});
        }
        // Add melee or spell damage
        if (rollData.attributes.damage.weapon !== 0 && ["mwak", "rwak"].includes(itemData.actionType)) {
            if (rollData.critMult !== 1) parts.push({base: "@attributes.damage.weapon * @critMult", extra: [], damageType: "Weapon", damageTypeUid: parts[0].damageTypeUid});
            else parts.push({base: "@attributes.damage.weapon", extra: [], damageType: "Weapon", damageTypeUid: parts[0].damageTypeUid});
        } else if (rollData.attributes.damage.spell !== 0 && ["msak", "rsak", "spellsave"].includes(itemData.actionType)) {
            if (rollData.critMult !== 1) parts.push({base: "@attributes.damage.spell * @critMult", extra: [], damageType: "Spell", damageTypeUid: parts[0].damageTypeUid});
            else parts.push({base: "@attributes.damage.spell", extra: [], damageType: "Spell", damageTypeUid: parts[0].damageTypeUid});
        }
        let simpleExtraParts = extraParts.filter(p => !Array.isArray(p));
        parts = parts.concat(extraParts.filter(p => Array.isArray(p)).map(p => {
            if (p[2] === "base")
                return {base: p[0], extra: [], damageType: p[1], damageTypeUid: parts[0].damageTypeUid}
            if (p[2])
                p[1] = CACHE.DamageTypes.get(p[2]).data.name
            else if (p[1]) {
                for(let damageType of CACHE.DamageTypes.values()) {
                    if (damageType.data.data.identifiers.some(i => i[0].toLowerCase() === p[1].toLowerCase()))
                        p[2] = damageType.data.data.uniqueId;
                }
            }
            return {base: p[0], extra: [], damageType: p[1], damageTypeUid: p[2]}

        }));
        // Create roll
        let rolls = [];
        for (let a = 0; a < parts.length; a++) {
            const part = parts[a];
            let roll = {}
            if (a === 0) {
                let rollString = `${modifiers.multiplier ? modifiers.multiplier+'*' : ''}((${[part.base, ...part.extra, ...simpleExtraParts].join("+")}))`;
                if (modifiers.maximize) rollString = rollString.replace(/d([1-9]+)/g,"*\$1")
                roll = {
                    roll: new Roll35e(rollString, rollData).roll(),
                    damageType: part.damageType,
                    damageTypeUid: part.damageTypeUid
                };
            } else {
                let rollString = `${modifiers.multiplier ? modifiers.multiplier+'*' : ''}((${[part.base, ...part.extra].join("+")}))`;
                if (modifiers.maximize) rollString = rollString.replace(/d([1-9]+)/g,"*\$1")
                roll = {
                    roll: new Roll35e(rollString, rollData).roll(),
                    damageType: part.damageType,
                    damageTypeUid: part.damageTypeUid
                };
            }
            rolls.push(roll);
        }
        // //console.log(rolls);
        return rolls;
    }

    rollAlternativeDamage({data = null} = {}) {
        const itemData = this.data.data;
        let rollData = null;
        let baseModifiers = [];
        if (!data) {
            rollData = this.actor.getRollData();
            rollData.item = duplicate(itemData);
        } else rollData = data;

        // Add CL
        if (this.type === "spell" || this.data.data.actionType === "rsak" || this.data.data.actionType === "msak" || this.data.data.actionType === "spellsave" || this.data.data.actionType === "heal") {
            this._adjustSpellCL(itemData, rollData);
        }

        // Define Roll parts
        let parts = this._mapDamageTypes(itemData.damage.alternativeParts);

        let rolls = [];
        for (let a = 0; a < parts.length; a++) {
            const part = parts[a];
            let roll = {}
            let rollString = `((${[part.base, ...part.extra].join("+")}))`;
            roll = {
                roll: new Roll35e(rollString, rollData).roll(),
                damageType: part.damageType,
                damageTypeUid: part.damageTypeUid
            };
            rolls.push(roll);
        }
        return rolls;
    }

    /**
     * Map damage types in damage parts
     * @private
     */
    _mapDamageTypes(damageParts) {
        let parts = damageParts.map(p => {
            if (p[2])
                p[1] = CACHE.DamageTypes.get(p[2]).data.name
            else if (p[1]) {
                for (let damageType of CACHE.DamageTypes.values()) {
                    if (damageType.data.data.identifiers.some(i => i[0].toLowerCase() === p[1].toLowerCase()))
                        p[2] = damageType.data.data.uniqueId;
                }
            }

            return {base: p[0], extra: [], damageType: p[1], damageTypeUid: p[2]};
        });
        return parts;
    }

    /**
     * Adjust spell CL based on item and actor
     * @private
     */
    _adjustSpellCL(itemData, rollData) {
        let cl = 0
        if (itemData.spellbook) {
            const spellbookIndex = itemData.spellbook;
            const spellbook = this.actor.data.data.attributes.spells.spellbooks[spellbookIndex];
            cl = spellbook.cl.total + (itemData.clOffset || 0) + (rollData.featClBonus || 0) - (this.actor.data.data.attributes.energyDrain || 0);
        }
        if (itemData.deck) {
            const deckIndex = itemData.deck;
            const deck = this.actor.data.data.attributes.cards.deck[deckIndex];
            cl = deck.cl.total + (itemData.clOffset || 0) + (rollData.featClBonus || 0) - (this.actor.data.data.attributes.energyDrain || 0);
        }
        rollData.cl = Math.max((new Roll35e(`${itemData.baseCl}`, rollData).roll()).total, cl);
        rollData.spellPenetration = rollData.cl + (rollData?.featSpellPenetrationBonus || 0);
    }

    /* -------------------------------------------- */

    /**
     * Adjust a cantrip damage formula to scale it for higher level characters and monsters
     * @private
     */
    _scaleCantripDamage(parts, level, scale) {
        const add = Math.floor((level + 1) / 6);
        if (add === 0) return;
        if (scale && (scale !== parts[0])) {
            parts[0] = parts[0] + " + " + scale.replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${add}d${d}`);
        } else {
            parts[0] = parts[0].replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${parseInt(nd) + add}d${d}`);
        }
    }

    /* -------------------------------------------- */

    /**
     * Place an attack roll using an item (weapon, feat, spell, or equipment)
     * Rely upon the DicePF.d20Roll logic for the core implementation
     */
    async rollFormula(options = {}) {
        const itemData = this.data.data;
        if (!itemData.formula) {
            throw new Error(game.i18n.localize("D35E.ErrorNoFormula").format(this.name));
        }

        // Define Roll Data
        const rollData = this.actor.getRollData();
        rollData.item = itemData;
        const title = `${this.name} - ${game.i18n.localize("D35E.OtherFormula")}`;

        const roll = new Roll35e(itemData.formula, rollData).roll();
        return roll.toMessage({
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            flavor: itemData.chatFlavor || title,
            rollMode: game.settings.get("core", "rollMode")
        });
    }

    /* -------------------------------------------- */

    /**
     * Use a consumable item
     */
    async rollConsumable(options = {}) {
        let itemData = this.data.data;
        const labels = this.labels;
        let parts = itemData.damage.parts;
        const data = this.actor.getRollData();

        // Add effect string
        let effectStr = "";
        if (typeof itemData.effectNotes === "string" && itemData.effectNotes.length) {
            effectStr = DicePF.messageRoll({
                data: data,
                msgStr: itemData.effectNotes
            });
        }

        parts = parts.map(obj => {
            return obj[0];
        });
        // Submit the roll to chat
        if (effectStr === "") {
            new Roll35e(parts.join("+")).toMessage({
                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                flavor: game.i18n.localize("D35E.UsesItem").format(this.name)
            });
        } else {
            const chatTemplate = "systems/D35E/templates/chat/roll-ext.html";
            const chatTemplateData = {hasExtraText: true, extraText: effectStr};
            // Execute the roll
            let roll = new Roll35e(parts.join("+"), data).roll();

            // Create roll template data
            const rollData = mergeObject({
                user: game.user._id,
                formula: roll.formula,
                tooltip: await roll.getTooltip(),
                total: roll.total,
            }, chatTemplateData || {});

            // Create chat data
            let chatData = {
                user: game.user._id,
                type: CONST.CHAT_MESSAGE_TYPES.CHAT,
                sound: CONFIG.sounds.dice,
                speaker: ChatMessage.getSpeaker({actor: this.actor}),
                flavor: game.i18n.localize("D35E.UsesItem").format(this.name),
                rollMode: game.settings.get("core", "rollMode"),
                roll: roll,
                content: await renderTemplate(chatTemplate, rollData),
            };
            // Handle different roll modes
            switch (chatData.rollMode) {
                case "gmroll":
                    chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
                    break;
                case "selfroll":
                    chatData["whisper"] = [game.user._id];
                    break;
                case "blindroll":
                    chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
                    chatData["blind"] = true;
            }

            // Send message
            ChatMessage.create(chatData);
        }
    }

    /* -------------------------------------------- */

    /**
     * @returns {Object} An object with data to be used in rolls in relation to this item.
     */
    getRollData(customData = null) {
        let _base = this.data.toObject(false).data;
        let result = {}
        if (customData)
            result = mergeObject(_base, customData.data, {inplace: false})
        else
            result = _base

        if (this.type === "buff") result.level = result.level;
        if (this.type === "enhancement") result.enhancement = result.enh;
        if (this.type === "enhancement") result.enhIncrease = result.enhIncrease;
        if (this.type === "spell") result.name = this.name;
        result['custom'] = {}
        if (result.hasOwnProperty('customAttributes')) {
            for (let prop in result.customAttributes || {}) {
                let propData = result.customAttributes[prop];
                result['custom'][(propData.name || propData.id).replace(/ /g, '').toLowerCase()] = propData.value;
            }
        }
        //console.log('D35E | Roll data', result)
        return result;
    }

    /* -------------------------------------------- */

    static chatListeners(html) {
        html.on('click', '.card-buttons button', this._onChatCardAction.bind(this));
        html.on('click', '.item-name', this._onChatCardToggleContent.bind(this));
    }

    /* -------------------------------------------- */

    static async _onChatCardAction(event) {
        event.preventDefault();

        // Extract card data
        const button = event.currentTarget;
        button.disabled = true;
        const canBeUsedByEveryone = $(button).hasClass('everyone');
        const singleUse = $(button).hasClass('single-use');
        const card = button.closest(".chat-card");
        const messageId = card.closest(".message").dataset.messageId;
        const message = game.messages.get(messageId);
        const action = button.dataset.action;

        // Validate permission to proceed with the roll
        // const isTargetted = action === "save";
        const isTargetted = false;
        let _actor = game.actors.get(message.data.speaker.actor);
        let isOwnerOfToken = false;
        if (_actor)
            isOwnerOfToken = _actor.testUserPermission(game.user, "OWNER");
        if (!(isTargetted || game.user.isGM || message.isAuthor || isOwnerOfToken || canBeUsedByEveryone)) {
            //console.log('No permission', isTargetted, game.user.isGM, isOwnerOfToken)
            button.disabled = false;
            return;
        }

        // Get the Actor from a synthetic Token
        const actor = this._getChatCardActor(card);
        if (!actor) {
            button.disabled = false;
            return;
        }

        // Get the Item
        const item = actor.getOwnedItem(card.dataset.itemId);

        // Get card targets
        const targets = isTargetted ? this._getChatCardTargets(card) : [];

        // Consumable usage
        if (action === "consume") await item.rollConsumable({event});
        // Apply damage
        else if (action === "applyDamage" || action === "applyDamageHalf") {
            //const value = button.dataset.value;
            const damage = JSON.parse(button.dataset.json || {});
            const normalDamage = JSON.parse(button.dataset.normaljson || "{}");
            const material = (button.dataset.material && button.dataset.material !== "") ? JSON.parse(button.dataset.material): {};
            const alignment = (button.dataset.alignment && button.dataset.alignment !== "") ? JSON.parse(button.dataset.alignment) : {};
            const enh = parseInt(button.dataset.enh || "0");
            const roll = parseInt(button.dataset.roll || "-1337");
            const isSpell = button.dataset.spell === "true";
            const critroll = parseInt(button.dataset.critroll || "0");
            const nonLethal = button.dataset.nonlethal === "true";
            const natural20 = button.dataset.natural === "true";
            const natural20Crit = button.dataset.naturalcrit === "true";
            const fumble = button.dataset.fumble === "true";
            const fumbleCrit = button.dataset.fumblecrit === "true";
            const attackerToken = button.dataset.attackertoken;
            const attacker = button.dataset.attacker;
            const ammoId = button.dataset.ammoid;
            const incorporeal = button.dataset.incorporeal === "true";
            event.applyHalf = action === "applyDamageHalf";
            ActorPF.applyDamage(event,roll,critroll,natural20,natural20Crit,fumble,fumbleCrit,damage,normalDamage,material,alignment,enh,nonLethal,!damage,null,attacker,attackerToken,ammoId,incorporeal);
        } else if (action === "applyHealing") {
            const value = button.dataset.value;
            ActorPF.applyDamage(event,roll,null,null,null,null,null,value,null,null,null,null,false,true);
        }

        // Roll saving throw
        else if (action === "rollSave") {
            const type = button.dataset.value;
            const ability = button.dataset.ability;
            const target = button.dataset.target;
            if (type) ActorPF._rollSave(type,ability,target);
        } else if (action === "rollPR") {
            const spellPenetration = button.dataset.spellpen;
            ActorPF._rollPowerResistance(spellPenetration);
        } else if (action === "rollSR") {
            const spellPenetration = button.dataset.spellpen;
            ActorPF._rollSpellResistance(spellPenetration);
        } else if (action === "customAction") {
            const value = button.dataset.value;
            const actionValue = value;
            /*
             * Action Value syntax
             * <action> <object> on <target>, for example:
             * - Add <item name> from <compendium> on self
             * - Remove <quantity> <item name> <?type> on self
             * - Clear <buff> <temporary> on target
             * - Damage <roll> on self
             * -
             */

            await actor.applyActionOnSelf(actionValue, actor)
            await ActorPF.applyAction(actionValue, actor);

        }

        // Re-enable the button
        if (!singleUse)
            button.disabled = false;
        else {
            await message.update({'content':message.data.content.replace(button.outerHTML,`<button disabled class="disabled-action-button">${button.innerText}</button>`)})
            //console.log(message, button)
        }
    }

    static parseAction(action) {
        let actions = []
        for (let group of action.split(";")) {
            let condition = "";
            let groupAction = group;
            if (group.indexOf(" if ") !== -1) {
                condition = group.split(" if ")[1]
                groupAction = group.split(" if ")[0]
            }
            let actionParts = groupAction.match('([A-Za-z]+) (.*?) on (target|self)')
            if (actionParts !== null)
                actions.push({
                    action: actionParts[1],
                    condition: condition,
                    parameters: actionParts[2].match(/(?:[^\s"]+|"[^"]*")+/g),
                    body: actionParts[2],
                    target: actionParts[3]
                })
        }
        return actions
    }

    /* -------------------------------------------- */

    /**
     * Handle toggling the visibility of chat card content when the name is clicked
     * @param {Event} event   The originating click event
     * @private
     */
    static _onChatCardToggleContent(event) {
        event.preventDefault();
        const header = event.currentTarget;
        const card = header.closest(".chat-card");
        const content = card.querySelector(".card-content.item");
        content.style.display = content.style.display === "none" ? "block" : "none";
    }

    /**
     * Get the Actor which is the author of a chat card
     * @param {HTMLElement} card    The chat card being used
     * @return {Actor|null}         The Actor entity or null
     * @private
     */
    static _getChatCardActor(card) {

        // Case 1 - a synthetic actor from a Token
        const tokenKey = card.dataset.tokenId;
        if (tokenKey) {
            const [sceneId, tokenId] = tokenKey.split(".");
            const scene = game.scenes.get(sceneId);
            if (!scene) return null;
            const tokenData = scene.getEmbeddedEntity("Token", tokenId);
            if (!tokenData) return null;
            const token = new Token(tokenData);
            return token.actor;
        }

        // Case 2 - use Actor ID directory
        const actorId = card.dataset.actorId;
        return game.actors.get(actorId) || null;
    }


    resetPerEncounterUses() {
        if (this.data.data.uses != null && this.data.data.activation != null && this.data.data.activation.type !== "") {
            let itemData = this.data.data
            let updateData = {}
            if (itemData.uses && itemData.uses.per === "encounter" && itemData.uses.value !== itemData.uses.max) {
                updateData["data.uses.value"] = itemData.uses.max;
                this.update(updateData);
            }
        }
    }

    async addElapsedTime(time) {
        if (this.data.data.timeline !== undefined && this.data.data.timeline !== null) {
            if (!this.data.data.timeline.enabled)
                return
            if (!this.data.data.active)
                return
            if (this.data.data.timeline.elapsed + time >= this.data.data.timeline.total) {
                if (!this.data.data.timeline.deleteOnExpiry) {
                    let updateData = {}
                    updateData["data.active"] = false;
                    await this.update(updateData);
                } else {
                    if (!this.actor) return;
                    await this.actor.deleteOwnedItem(this.id)
                }
            } else {
                let updateData = {}
                updateData["data.timeline.elapsed"] = this.data.data.timeline.elapsed + time;
                await this.update(updateData);
            }
        }
    }

    getElapsedTimeUpdateData(time) {
        if (this.data.data.timeline !== undefined && this.data.data.timeline !== null) {
            if (this.data.data.timeline.enabled && this.data.data.active) {
                if (this.data.data.timeline.elapsed + time >= this.data.data.timeline.total) {
                    if (!this.data.data.timeline.deleteOnExpiry) {
                        let updateData = {}
                        updateData["data.active"] = false;
                        updateData["data.timeline.elapsed"] = 0;
                        updateData["_id"] = this._id;
                        return updateData;
                    } else {
                        if (!this.actor) return;
                        if (this.actor.token) {
                            let updateData = {}
                            updateData["data.active"] = false;
                            updateData["data.timeline.elapsed"] = 0;
                            updateData["_id"] = this._id;
                            return updateData;
                        } else
                            return {'_id': this._id, 'delete': true};
                    }
                } else {
                    let updateData = {}
                    updateData["data.timeline.elapsed"] = this.data.data.timeline.elapsed + time;
                    updateData["_id"] = this._id;
                    return updateData;
                }
            }
        }
        if (this.data.data.recharge !== undefined && this.data.data.recharge !== null) {
            if (this.data.data.recharge.enabled) {

                if (this.data.data.recharge.current - time < 1) {
                    let updateData = {}
                    updateData["data.recharge.current"] = 0;
                    updateData["data.uses.value"] = this.data.data.uses.max;
                    updateData["_id"] = this._id;
                    return updateData;
                } else {
                    let updateData = {}
                    updateData["data.recharge.current"] = this.data.data.recharge.current - time;
                    updateData["_id"] = this._id;
                    return updateData;
                }

            }
        }
        return {'_id': this._id, 'ignore': true};
    }

    getTimelineTimeLeft() {
        if (this.data.data.timeline !== undefined && this.data.data.timeline !== null) {
            if (!this.data.data.timeline.enabled)
                return -1;
            if (!this.data.data.active)
                return -1;
            return this.data.data.timeline.total - this.data.data.timeline.elapsed
        }
        return 0
    }

    getTimelineTimeLeftDescriptive() {
        if (this.data.data.timeline !== undefined && this.data.data.timeline !== null) {
            if (!this.data.data.timeline.enabled)
                return "Indefinite";
            if (!this.data.data.active)
                return "Not active";
            if (this.data.data.timeline.total - this.data.data.timeline.elapsed >= 600) {
                return Math.floor((this.data.data.timeline.total - this.data.data.timeline.elapsed) / 600) + "h"
            } else if (this.data.data.timeline.total - this.data.data.timeline.elapsed >= 10) {
                return Math.floor((this.data.data.timeline.total - this.data.data.timeline.elapsed) / 10) + "min"
            } else if (this.data.data.timeline.total - this.data.data.timeline.elapsed > 1)
                return (this.data.data.timeline.total - this.data.data.timeline.elapsed) + " rounds"
            return "Last round";
        }
        return "Indefinite"
    }

    /**
     * Updates the spell's description.
     */
    async _updateSpellDescription(updateData, srcData) {
        const data = this._generateSpellDescription(srcData);

        linkData(srcData, updateData, "data.description.value", await renderTemplate("systems/D35E/templates/internal/spell-description.html", data));
    }

    async _updateCardDescription(updateData, srcData) {
        const data = this._generateSpellDescription(srcData);

        linkData(srcData, updateData, "data.description.value", await renderTemplate("systems/D35E/templates/internal/spell-description.html", data));
    }

    _generateSpellDescription(srcData) {
        const reSplit = CONFIG.D35E.re.traitSeparator;

        const label = {
            school: (CONFIG.D35E.spellSchools[getProperty(srcData, "data.school")] || "").toLowerCase(),
            subschool: (getProperty(srcData, "data.subschool") || ""),
            types: "",
        };
        const data = {
            data: mergeObject(this.data.data, srcData.data, {inplace: false}),
            label: label,
        };

        // Set subschool and types label
        const types = getProperty(srcData, "data.types");
        if (typeof types === "string" && types.length > 0) {
            label.types = types.split(reSplit).join(", ");
        }
        // Set information about when the spell is learned
        data.learnedAt = {};
        data.learnedAt.class = (getProperty(srcData, "data.learnedAt.class") || []).map(o => {
            return `${o[0]} ${o[1]}`;
        }).sort().join(", ");
        data.learnedAt.domain = (getProperty(srcData, "data.learnedAt.domain") || []).map(o => {
            return `${o[0]} ${o[1]}`;
        }).sort().join(", ");
        data.learnedAt.subDomain = (getProperty(srcData, "data.learnedAt.subDomain") || []).map(o => {
            return `${o[0]} ${o[1]}`;
        }).sort().join(", ");
        data.learnedAt.elementalSchool = (getProperty(srcData, "data.learnedAt.elementalSchool") || []).map(o => {
            return `${o[0]} ${o[1]}`;
        }).sort().join(", ");
        data.learnedAt.bloodline = (getProperty(srcData, "data.learnedAt.bloodline") || []).map(o => {
            return `${o[0]} ${o[1]}`;
        }).sort().join(", ");

        // Set casting time label
        if (getProperty(srcData, "data.activation")) {
            const activationCost = getProperty(srcData, "data.activation.cost");
            const activationType = getProperty(srcData, "data.activation.type");

            if (activationType) {
                if (CONFIG.D35E.abilityActivationTypesPlurals[activationType] != null) {
                    if (activationCost === 1) label.castingTime = `${CONFIG.D35E.abilityActivationTypes[activationType]}`;
                    else label.castingTime = `${CONFIG.D35E.abilityActivationTypesPlurals[activationType]}`;
                } else label.castingTime = `${CONFIG.D35E.abilityActivationTypes[activationType]}`;
            }
            if (!Number.isNaN(activationCost) && label.castingTime != null) label.castingTime = `${activationCost} ${label.castingTime}`;
            if (label.castingTime) label.castingTime = label.castingTime.toLowerCase();
        }


        data.psionicPower = getProperty(srcData, "data.isPower");

        // Set components label
        let components = [];
        for (let [key, value] of Object.entries(getProperty(srcData, "data.components") || {})) {
            if (key === "value" && value.length > 0) components.push(...value.split(reSplit));
            else if (key === "verbal" && value) components.push("V");
            else if (key === "somatic" && value) components.push("S");
            else if (key === "material" && value) components.push("M");
            else if (key === "focus" && value) components.push("F");
        }
        if (getProperty(srcData, "data.components.divineFocus") === 1) components.push("DF");
        const df = getProperty(srcData, "data.components.divineFocus");
        // Sort components
        const componentsOrder = ["V", "S", "M", "F", "DF"];
        components.sort((a, b) => {
            let index = [componentsOrder.indexOf(a), components.indexOf(b)];
            if (index[0] === -1 && index[1] === -1) return 0;
            if (index[0] === -1 && index[1] >= 0) return 1;
            if (index[0] >= 0 && index[1] === -1) return -1;
            return index[0] - index[1];
        });
        components = components.map(o => {
            if (o === "M") {
                if (df === 2) o = "M/DF";
                if (getProperty(srcData, "data.materials.value")) o = `${o} (${getProperty(srcData, "data.materials.value")})`;
            }
            if (o === "F") {
                if (df === 3) o = "F/DF";
                if (getProperty(srcData, "data.materials.focus")) o = `${o} (${getProperty(srcData, "data.materials.focus")})`;
            }
            return o;
        });
        if (components.length > 0) label.components = components.join(", ");

        // Set duration label
        {
            const duration = getProperty(srcData, "data.spellDuration");
            if (duration) label.duration = duration;
        }
        // Set effect label
        {
            const effect = getProperty(srcData, "data.spellEffect");
            if (effect) label.effect = effect;
        }
        // Set targets label
        {
            const targets = getProperty(srcData, "data.target.value");
            if (targets) label.targets = targets;
        }
        // Set range label
        {
            const rangeUnit = getProperty(srcData, "data.range.units");
            const rangeValue = getProperty(srcData, "data.range.value");

            if (rangeUnit != null && rangeUnit !== "none") {
                label.range = (CONFIG.D35E.distanceUnits[rangeUnit] || "").toLowerCase();
                if (rangeUnit === "close") label.range = `${label.range} (25 ft. + 5 ft./2 levels)`;
                else if (rangeUnit === "medium") label.range = `${label.range} (100 ft. + 10 ft./level)`;
                else if (rangeUnit === "long") label.range = `${label.range} (400 ft. + 40 ft./level)`;
                else if (["ft", "mi"].includes(rangeUnit)) {
                    if (!rangeValue) label.range = "";
                    else label.range = `${rangeValue} ${label.range}`;
                }
            }
        }
        // Set area label
        {
            const area = getProperty(srcData, "data.spellArea");

            if (area) label.area = area;
        }

        // Set DC and SR
        {
            const savingThrowDescription = data?.data?.save?.type ? CONFIG.D35E.savingThrowTypes[data.data.save.type] : (data?.data?.save?.description || "");
            if (savingThrowDescription) label.savingThrow = savingThrowDescription;
            else label.savingThrow = "none";

            const sr = getProperty(srcData, "data.sr");
            label.sr = (sr === true ? "yes" : "no");
            const pr = getProperty(srcData, "data.pr");
            label.pr = (pr === true ? "yes" : "no");

            if (getProperty(srcData, "data.range.units") !== "personal") data.useDCandSR = true;
        }

        if (getProperty(srcData, "data.powerPointsCost") > 0)
            label.powerPointsCost = getProperty(srcData, "data.powerPointsCost");
        label.display = getProperty(srcData, "data.display");
        return data;
    }

    /* -------------------------------------------- */

    /**
     * Get the Actor which is the author of a chat card
     * @param {HTMLElement} card    The chat card being used
     * @return {Array.<Actor>}      The Actor entity or null
     * @private
     */
    static _getChatCardTargets(card) {
        const character = game.user.character;
        const controlled = canvas.tokens.controlled;
        const targets = controlled.reduce((arr, t) => t.actor ? arr.concat([t.actor]) : arr, []);
        if (character && (controlled.length === 0)) targets.push(character);
        if (!targets.length) throw new Error(`You must designate a specific Token as the roll target`);
        return targets;
    }

    async addCardCharges(value, data) {
        let newState = "deck"
        if (value < 0) newState = "discarded"
        if (value >= 0) newCharges = "hand"
        const key = "data.state";
        if (data == null) {
            data = {};
            data[key] = newState;
            return this.update(data);
        } else {
            data[key] = newState;
        }
    }

    async addSpellUses(value, data = null) {
        if (!this.actor) return;
        if (this.data.data.atWill) return;
        //if (this.data.data.level === 0) return;

        //console.log(`D35E | Adding spell uses ${value}`)
        const spellbook = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${this.data.data.spellbook}`),
            isSpontaneous = spellbook.spontaneous, usePowerPoints = spellbook.usePowerPoints,
            spellbookKey = getProperty(this.data, "data.spellbook") || "primary",
            spellLevel = getProperty(this.data, "data.level");
        const newCharges = usePowerPoints ? Math.max(0, (getProperty(spellbook, `powerPoints`) || 0) + value * getProperty(this.data, "data.powerPointsCost")) : isSpontaneous
            ? Math.max(0, (getProperty(spellbook, `spells.spell${spellLevel}.value`) || 0) + value)
            : Math.max(0, (getProperty(this.data, "data.preparation.preparedAmount") || 0) + value);

        if (!isSpontaneous && !usePowerPoints) {
            const key = "data.preparation.preparedAmount";
            if (data == null) {
                data = {};
                data[key] = newCharges;
                return this.update(data);
            } else {
                data[key] = newCharges;
            }
        } else if (usePowerPoints) {
            const key = `data.attributes.spells.spellbooks.${spellbookKey}.powerPoints`;
            const actorUpdateData = {};
            if (getProperty(this.data, "data.requiresPsionicFocus"))
                actorUpdateData['data.attributes.psionicFocus'] = false;
            actorUpdateData[key] = newCharges;
            return this.actor.update(actorUpdateData);
        } else {
            const key = `data.attributes.spells.spellbooks.${spellbookKey}.spells.spell${spellLevel}.value`;
            const actorUpdateData = {};
            actorUpdateData[key] = newCharges;
            return this.actor.update(actorUpdateData);
        }

        return null;
    }

    getSpellUses() {
        if (!this.actor) return 0;
        if (this.data.data.atWill) return Number.POSITIVE_INFINITY;

        if (getProperty(this.data, "data.requiresPsionicFocus") && !this.actor?.data?.data?.attributes?.psionicFocus) return 0;
        const spellbook = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${this.data.data.spellbook}`),
            isSpontaneous = spellbook.spontaneous, usePowerPoints = spellbook.usePowerPoints, isEpic = this.data.data.level > 9,
            spellLevel = getProperty(this.data, "data.level");
        return usePowerPoints ? (getProperty(spellbook, `powerPoints`) - getProperty(this.data, "data.powerPointsCost") >= 0 || 0) : (isSpontaneous && !isEpic)
            ? (getProperty(spellbook, `spells.spell${spellLevel}.value`) || 0)
            : (getProperty(this.data, "data.preparation.preparedAmount") || 0);
    }

    static getMinimumCasterLevelBySpellData(itemData) {
        const learnedAt = getProperty(itemData, "learnedAt.class").reduce((cur, o) => {
            const classes = o[0].split("/");
            for (let cls of classes) cur.push([cls, o[1]]);
            return cur;
        }, []);
        let result = [9, 20];
        for (let o of learnedAt) {
            result[0] = Math.min(result[0], o[1]);

            // Hardcoding classes... this seems stupid. This probably is for spell DC.
            // We assume High
            result[1] = Math.min(result[1], 1 + Math.max(0, (o[1] - 1)) * 2)
            // const tc = CONFIG.PF1.classCasterType[o[0]] || "high";
            // if (tc === "high") {
            //   result[1] = Math.min(result[1], 1 + Math.max(0, (o[1] - 1)) * 2);
            // }
            // else if (tc === "med") {
            //   result[1] = Math.min(result[1], 1 + Math.max(0, (o[1] - 1)) * 3);
            // }
            // else if (tc === "low") {
            //   result[1] = Math.min(result[1], 4 + Math.max(0, (o[1] - 1)) * 3);
            // }
        }

        return result;
    }


    static async toPolymorphBuff(origData, type) {
        let data = duplicate(game.system.template.Item.buff);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = await this.polymorphBuffFromActor(data, origData, type)
        return data;
    }

    static async polymorphBuffFromActor(data, origData,type) {

        data = {
            type: "buff",
            name: origData.name,
            img: origData.img,
            data: data,
        };

        data.data.shapechange = {source: origData, type:type}
        data.data.buffType = "shapechange";
        data.data.sizeOverride = origData.data.traits.size;


        data.data.changes = []
        data.data.changes.push(
            ...(origData.items.find(i => i.type === "class")?.data?.changes || [])
        )
        if (type === "polymorph" || type === "wildshape") {
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.abilities.str.total")}`, "ability", "str", "replace", getProperty(origData, "data.abilities.str.total")]]) // Strength
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.abilities.dex.total")}`, "ability", "dex", "replace", getProperty(origData, "data.abilities.dex.total")]]) // Dexterity
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.abilities.con.total")}`, "ability", "con", "replace", getProperty(origData, "data.abilities.con.total")]]) // Constitution
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.land.total")}`, "speed", "landSpeed", "replace", getProperty(origData, "data.attributes.speed.land.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.climb.total")}`, "speed", "climbSpeed", "replace", getProperty(origData, "data.attributes.speed.climb.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.swim.total")}`, "speed", "swimSpeed", "replace", getProperty(origData, "data.attributes.speed.swim.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.burrow.total")}`, "speed", "burrowSpeed", "replace", getProperty(origData, "data.attributes.speed.burrow.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.speed.fly.total")}`, "speed", "flySpeed", "replace", getProperty(origData, "data.attributes.speed.fly.total")]])
            data.data.changes = data.data.changes.concat([[`${getProperty(origData, "data.attributes.naturalACTotal")}`, "ac", "nac", "base", getProperty(origData, "data.attributes.naturalACTotal")]])
        }

        data.data.activateActions = []
        if (type === "wildshape") {
            data.data.activateActions = data.data.activateActions.concat([{
                "name": "Activate Wildshape",
                "action": "Condition set wildshaped to true on self",
                "condition": "",
                "img": ""
            },{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to ${origData.data.tokenImg} on self`,
                "condition": "",
                "img": ""
            },{
                "name": "Meld weapons",
                "action": "Set attack * field data.melded to true on self; Set weapon * field data.melded to true on self; Set equipment * field data.melded to true on self",
                "condition": "",
                "img": ""
            }])
        } else if (type === "polymorph") {
            data.data.activateActions = data.data.activateActions.concat([ {
                "name": "Activate Polymorph",
                "action": "Condition set polymorph to true on self",
                "condition": "",
                "img": ""
            },{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to ${origData.data.tokenImg} on self`,
                "condition": "",
                "img": ""
            },{
                "name": "Meld weapons",
                "action": "Set attack:natural * field data.melded to true on self;",
                "condition": "",
                "img": ""
            }])
        } else if (type === "alter-self") {
            data.data.activateActions = data.data.activateActions.concat([{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to ${origData.data.tokenImg} on self`,
                "condition": "",
                "img": ""
            }])
        }

        data.data.deactivateActions = []

        if (type === "wildshape") {
            data.data.deactivateActions = data.data.deactivateActions.concat([{
                "name": "Deactivate Wildshape",
                "action": "Condition set wildshaped to false on self",
                "condition": "",
                "img": ""
            },{
                "name": "Unmeld weapons",
                "action": "Set attack * field data.melded to false on self; Set weapon * field data.melded to false on self; Set equipment * field data.melded to false on self",
                "condition": "",
                "img": ""
            },{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to icons/svg/mystery-man.svg on self`,
                "condition": "",
                "img": ""
            }])
        } else if (type === "polymorph") {
            data.data.deactivateActions = data.data.deactivateActions.concat([ {
                "name": "Deactivate Polymorph",
                "action": "Condition set polymorph to false on self",
                "condition": "",
                "img": ""
            },{
                "name": "Unmeld weapons",
                "action": "Set attack:natural * field data.melded to false on self;",
                "condition": "",
                "img": ""
            },{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to icons/svg/mystery-man.svg on self`,
                "condition": "",
                "img": ""
            }])
        } else if (type === "alter-self") {
            data.data.deactivateActions = data.data.deactivateActions.concat([{
                "name": "Set Portrait",
                "action": `Update set data.shapechangeImg to icons/svg/mystery-man.svg on self`,
                "condition": "",
                "img": ""
            }])
        }

        // Speedlist
        let speedDesc = []
        for (let speedKey of Object.keys(origData.data.attributes.speed)) {
            if (getProperty(origData, `data.attributes.speed.${speedKey}.total`) > 0)
                speedDesc.push(speedKey.charAt(0).toUpperCase() + speedKey.slice(1) + " " + getProperty(origData, `data.attributes.speed.${speedKey}.total`) + " ft.")
        }

        // Set description
        data.data.description.value = await renderTemplate("systems/D35E/templates/internal/shapechange-description.html", {
            size: game.i18n.localize(CONFIG.D35E.actorSizes[origData.data.traits.size]),
            type: origData.data.details.type,
            speed: speedDesc.join(', '),
            str: origData.data.abilities.str.total,
            dex: origData.data.abilities.dex.total,
            con: origData.data.abilities.con.total,
        });
        return data;
    }

    static async toEnhancement(origData, type, cl) {
        let data = duplicate(game.system.template.Item.enhancement);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "enhancement",
            name: origData.name,
            data: data,
        };

        const slcl = this.getMinimumCasterLevelBySpellData(origData.data);
        data.data.enhancementType = "misc";

        // Set name
        data.name = `${origData.name}`;
        data.img = origData.img;
        data.id = origData._id
        if (type === 'command' || type === 'use') {
            data.data.uses.per = "day";
            data.data.uses.maxFormula = "1";
            data.data.uses.value = 1;
            data.data.uses.max = 1;
        } else {
            data.data.uses.per = "charges";
            data.data.uses.maxFormula = "50";
            data.data.uses.value = 50;
            data.data.uses.max = 50;
        }

        data.data.uses.chargesPerUse = 1


        data.data.baseCl = slcl[1]
        data.data.enhIncreaseFormula = ""
        data.data.priceFormula = ""
        data.data.price = 0

        data.data.isFromSpell = true;

        // Set activation method
        data.data.activation.type = "standard";

        data.data.measureTemplate = getProperty(origData, "data.measureTemplate");


        // Set damage formula
        data.data.actionType = origData.data.actionType;
        for (let d of getProperty(origData, "data.damage.parts")) {
            d[0] = d[0].replace(/@sl/g, slcl[0]);
            data.data.damage.parts.push(d);
        }

        // Set saves
        data.data.save.description = origData.data.save.description;
        data.data.save.type = origData.data.save.type;
        data.data.save.ability = origData.data.save.ability;
        data.data.save.dc = 10 + slcl[0] + Math.floor(slcl[0] / 2);

        // Copy variables
        data.data.attackNotes = origData.data.attackNotes;
        data.data.effectNotes = origData.data.effectNotes;
        data.data.attackBonus = origData.data.attackBonus;
        data.data.critConfirmBonus = origData.data.critConfirmBonus;
        data.data.specialActions = origData.data.specialActions;

        // Determine aura power
        let auraPower = "faint";
        for (let a of CONFIG.D35E.magicAuraByLevel.item) {
            if (a.level <= slcl[1]) auraPower = a.power;
        }
        let clLabel;
        switch (slcl[1]) {
            case 1:
                clLabel = "1st";
                break;
            case 2:
                clLabel = "2nd";
                break;
            case 3:
                clLabel = "3rd";
                break;
            default:
                clLabel = `${slcl[1]}th`;
                break;
        }
        // Determine spell level label
        let slLabel;
        switch (slcl[0]) {
            case 1:
                slLabel = "1st";
                break;
            case 2:
                slLabel = "2nd";
                break;
            case 3:
                slLabel = "3rd";
                break;
            default:
                slLabel = `${slcl[1]}th`;
                break;
        }

        // Set description
        data.data.description.value = getProperty(origData, "data.description.value");

        return data;
    }

    static async toEnhancementBuff(origData) {
        let data = duplicate(game.system.template.Item.enhancement);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "enhancement",
            name: origData.name,
            data: data,
        };


        data.data.enhancementType = "misc";

        // Set name
        data.name = `${origData.name}`;
        data.img = origData.img;
        data.id = origData._id

        data.data.isFromBuff = true;

        data.data.enh = 1
        data.data.enhIncreaseFormula = ""
        data.data.priceFormula = ""
        data.data.price = 0


        data.data.changes = origData.data.changes;
        for (const c of data.data.changes) {
            c[0] = c[0].replace(new RegExp('@item.level', 'g'), '@enhancement');
        }
        data.data.contextNotes = origData.data.contextNotes;
        for (const c of data.data.contextNotes) {
            c[0] = c[0].replace(new RegExp('@item.level', 'g'), '@enhancement');
        }


        data.data.description.value = getProperty(origData, "data.description.value");

        return data;
    }

    static async toAttack(origData, type) {
        let data = duplicate(game.system.template.Item.attack);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "attack",
            name: origData.name,
            data: data,
        };

        const slcl = this.getMinimumCasterLevelBySpellData(origData.data);

        data.name = `${origData.name}`;
        data.img = `${origData.img}`;


        // Set activation method
        data.data.activation.type = "standard";

        // Set measure template
        if (type !== "potion" && type !== "tattoo") {
            data.data.measureTemplate = getProperty(origData, "data.measureTemplate");
        }

        // Set damage formula
        data.data.actionType = origData.data.actionType;
        for (let d of getProperty(origData, "data.damage.parts")) {
            d[0] = d[0].replace(/@sl/g, slcl[0]);
            d[0] = d[0].replace(/@cl/g, slcl[1]);
            data.data.damage.parts.push(d);
        }
        data.data.attackType = "misc"
        // Set saves
        data.data.save.description = origData.data.save.description;
        data.data.save.type = origData.data.save.type;
        data.data.save.ability = origData.data.save.ability;
        data.data.save.dc = 10 + slcl[0] + Math.floor(slcl[0] / 2);

        // Copy variables
        data.data.attackNotes = origData.data.attackNotes;
        data.data.effectNotes = origData.data.effectNotes;
        data.data.attackBonus = origData.data.attackBonus;
        data.data.critConfirmBonus = origData.data.critConfirmBonus;
        data.data.specialActions = origData.data.specialActions;
        data.data.attackCountFormula = origData.data.attackCountFormula.replace(/@cl/g, slcl[1]).replace(/@sl/g, slcl[0]);

        // Determine aura power
        let auraPower = "faint";
        for (let a of CONFIG.D35E.magicAuraByLevel.item) {
            if (a.level <= slcl[1]) auraPower = a.power;
        }
        if (type === "potion") {
            data.img = `systems/D35E/icons/items/potions/generated/${auraPower}.png`;
        }
        // Determine caster level label
        let clLabel;
        switch (slcl[1]) {
            case 1:
                clLabel = "1st";
                break;
            case 2:
                clLabel = "2nd";
                break;
            case 3:
                clLabel = "3rd";
                break;
            default:
                clLabel = `${slcl[1]}th`;
                break;
        }
        // Determine spell level label
        let slLabel;
        switch (slcl[0]) {
            case 1:
                slLabel = "1st";
                break;
            case 2:
                slLabel = "2nd";
                break;
            case 3:
                slLabel = "3rd";
                break;
            default:
                slLabel = `${slcl[1]}th`;
                break;
        }

        // Set description
        data.data.description.value = getProperty(origData, "data.description.value");

        return data;
    }
    static async toConsumable(origData, type, cl) {
        let data = duplicate(game.system.template.Item.consumable);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "consumable",
            name: origData.name,
            data: data,
        };

        const slcl = this.getMinimumCasterLevelBySpellData(origData.data);
        if (cl) slcl[1] = cl;
        // Set consumable type
        data.data.consumableType = type;

        // Set name
        if (type === "wand") {
            data.name = `Wand of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/wand-low.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 750;
            data.data.hardness = 5;
            data.data.hp.max = 5;
            data.data.hp.value = 5;
        } else if (type === "potion") {
            data.name = `Potion of ${origData.name}`;
            data.img = "systems/D35E/icons/items/potions/generated/med.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 50;
            data.data.hardness = 1;
            data.data.hp.max = 1;
            data.data.hp.value = 1;
        } else if (type === "scroll") {
            data.name = `Scroll of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/scroll.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 25;
            data.data.hardness = 0;
            data.data.hp.max = 1;
            data.data.hp.value = 1;
        } else if (type === "dorje") {
            data.name = `Dorje of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/droje.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 750;
            data.data.hardness = 5;
            data.data.hp.max = 5;
            data.data.hp.value = 5;
        } else if (type === "tattoo") {
            data.name = `Tattoo of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/tattoo.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 50;
            data.data.hardness = 1;
            data.data.hp.max = 1;
            data.data.hp.value = 1;
        } else if (type === "powerstone") {
            data.name = `Power Stone of ${origData.name}`;
            data.img = "systems/D35E/icons/items/magic/generated/crystal.png";
            data.data.price = Math.max(0.5, slcl[0]) * slcl[1] * 25;
            data.data.hardness = 0;
            data.data.hp.max = 1;
            data.data.hp.value = 1;
        }


        // Set charges
        if (type === "wand" || type === "dorje") {
            data.data.uses.maxFormula = "50";
            data.data.uses.value = 50;
            data.data.uses.max = 50;
            data.data.uses.per = "charges";
        } else {
            data.data.uses.per = "single";
        }

        // Set activation method
        data.data.activation.type = "standard";

        // Set measure template
        if (type !== "potion" && type !== "tattoo") {
            data.data.measureTemplate = getProperty(origData, "data.measureTemplate");
        }

        // Set damage formula
        data.data.actionType = origData.data.actionType;
        for (let d of getProperty(origData, "data.damage.parts")) {
            d[0] = d[0].replace(/@sl/g, slcl[0]);
            data.data.damage.parts.push(d);
        }

        // Set saves
        data.data.save.description = origData.data.save.description;
        data.data.save.type = origData.data.save.type;
        data.data.save.ability = origData.data.save.ability;
        data.data.save.dc = 10 + slcl[0] + Math.floor(slcl[0] / 2);
        data.data.baseCl = `${slcl[1]}`
        data.data.sr = origData.data.sr
        data.data.pr = origData.data.pr
        // Copy variables
        data.data.attackNotes = origData.data.attackNotes;
        data.data.effectNotes = origData.data.effectNotes;
        data.data.attackBonus = origData.data.attackBonus;
        data.data.critConfirmBonus = origData.data.critConfirmBonus;
        data.data.specialActions = origData.data.specialActions;


        data.data.attackCountFormula = origData.data.attackCountFormula.replace(/@sl/g, slcl[0]);

        // Determine aura power
        let auraPower = "faint";
        for (let a of CONFIG.D35E.magicAuraByLevel.item) {
            if (a.level <= slcl[1]) auraPower = a.power;
        }
        if (type === "potion") {
            data.img = `systems/D35E/icons/items/potions/generated/${auraPower}.png`;
        }
        // Determine caster level label
        let clLabel;
        switch (slcl[1]) {
            case 1:
                clLabel = "1st";
                break;
            case 2:
                clLabel = "2nd";
                break;
            case 3:
                clLabel = "3rd";
                break;
            default:
                clLabel = `${slcl[1]}th`;
                break;
        }
        // Determine spell level label
        let slLabel;
        switch (slcl[0]) {
            case 1:
                slLabel = "1st";
                break;
            case 2:
                slLabel = "2nd";
                break;
            case 3:
                slLabel = "3rd";
                break;
            default:
                slLabel = `${slcl[1]}th`;
                break;
        }

        // Set description
        data.data.description.value = await renderTemplate("systems/D35E/templates/internal/consumable-description.html", {
            origData: origData,
            data: data,
            isWand: type === "wand" || type === "dorje",
            isPotion: type === "potion" || type === "tattoo",
            isScroll: type === "scroll" || type === "powerstone",
            auraPower: auraPower,
            aura: (CONFIG.D35E.spellSchools[origData.data.school] || "").toLowerCase(),
            sl: slcl[0],
            cl: slcl[1],
            slLabel: slLabel,
            clLabel: clLabel,
            config: CONFIG.D35E,
        });



        return data;
    }


    static async toTrait(origData, type) {
        let data = duplicate(game.system.template.Item.feat);
        for (let t of data.templates) {
            mergeObject(data, duplicate(game.system.template.Item.templates[t]));
        }
        delete data.templates;
        data = {
            type: "feat",
            name: origData.name,
            data: data,
        };

        const slcl = this.getMinimumCasterLevelBySpellData(origData.data);


        data.name = `${origData.name}`;
        data.img = origData.img;

        data.data.featType = "trait";

        data.data.activation.type = "standard";

        data.data.measureTemplate = getProperty(origData, "data.measureTemplate");

        // Set damage formula
        data.data.actionType = origData.data.actionType;
        for (let d of getProperty(origData, "data.damage.parts")) {
            d[0] = d[0].replace(/@sl/g, slcl[0]);
            d[0] = d[0].replace(/@cl/g, "@attributes.hd.total");
            data.data.damage.parts.push(d);
        }

        // Set saves
        data.data.save.description = origData.data.save.description;
        data.data.save.dc = origData.data.save.dc;
        data.data.save.type = origData.data.save.type;

        // Copy variables
        data.data.attackNotes = origData.data.attackNotes;
        data.data.effectNotes = origData.data.effectNotes;
        data.data.attackBonus = origData.data.attackBonus;
        data.data.critConfirmBonus = origData.data.critConfirmBonus;
        data.data.specialActions = origData.data.specialActions;
        data.data.attackCountFormula = origData.data.attackCountFormula.replace(/@cl/g, slcl[1]).replace(/@sl/g, slcl[0]);

        data.data.description.value = getProperty(origData, "data.description.value");

        return data;
    }


    async getEnhancementItem(tag) {
        const enhancements = getProperty(this.data, `data.enhancements.items`) || [];
        let itemData = (enhancements).find(i => createTag(i.name) === tag)
        if (itemData != null) {
            return new ItemPF(itemData, {owner: this.isOwner});
        }
        else
            return itemData;
    }

    async useEnhancementItem(item) {
        let chargeCost = item.data.data?.uses?.chargesPerUse !== undefined ? item.data.data.uses.chargesPerUse : item.chargeCost;
        let chargesLeft = item.data.data?.uses?.value || 0;
        if (this.data.data.enhancements.uses.commonPool) {
            if (this.data.data.enhancements.uses.value < chargeCost) {
                    return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoCharges").format(this.name));
                }
        } else {

            if (chargesLeft < chargeCost) {
                return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoCharges").format(this.name));
            }
        }
        if (this.data.data.enhancements.clFormula) {
            item.data.data.baseCl = new Roll35e(this.data.data.enhancements.clFormula, this.actor.getRollData()).roll().total;
        }
        if (item.data.data.save) {
            let ablMod = 0
            if (this.data.data.enhancements.spellcastingAbility !== "") ablMod = getProperty(this.actor.data, `data.abilities.${this.data.data.enhancements.spellcastingAbility}.mod`);
            item.data.data.save.dc += ablMod;
        }

        let roll = await item.use({ev: event, skipDialog: event.shiftKey},this.actor,true);
        if (roll.wasRolled) {
            if (this.data.data.enhancements.uses.commonPool) {
                let updateData = {}
                updateData[`data.enhancements.uses.value`] = this.data.data.enhancements.uses.value - chargeCost;
                updateData[`data.uses.value`] = this.data.data.enhancements.uses.value - chargeCost;
                updateData[`data.uses.max`] = this.data.data.enhancements.uses.max;
                await this.update(updateData);
            } else {
                await this.addEnhancementCharges(item, -1*chargeCost)
            }
        }
    }


    async addEnhancementCharges(item, charges) {
        let updateData = {}
        let _enhancements = duplicate(getProperty(this.data, `data.enhancements.items`) || []);
        _enhancements.filter(function( obj ) {
            return createTag(obj.name) === createTag(item.name)
        }).forEach(i => {
            i.data.uses.value = i.data.uses.value + charges;
        });
        updateData[`data.enhancements.items`] = _enhancements;
        await this.update(updateData);
    }

    /*
    ---- Conditional modifiers support
     */
    /**
     * Generates a list of targets this modifier can have.
     * @param {ItemPF} item - The item for which the modifier is to be created.
     * @returns {Object.<string, string>} A list of targets
     */
    getConditionalTargets() {
        let result = {};
        if (this.hasAttack) result["attack"] = game.i18n.localize(CONFIG.D35E.conditionalTargets.attack._label);
        if (this.hasDamage) result["damage"] = game.i18n.localize(CONFIG.D35E.conditionalTargets.damage._label);
        if (this.type === "spell" || this.hasSave)
            result["effect"] = game.i18n.localize(CONFIG.D35E.conditionalTargets.effect._label);
        // Only add Misc target if subTargets are available
        if (Object.keys(this.getConditionalSubTargets("misc")).length > 0) {
            result["misc"] = game.i18n.localize(CONFIG.D35E.conditionalTargets.misc._label);
        }
        return result;
    }

    /**
     * Generates lists of conditional subtargets this attack can have.
     * @param {string} target - The target key, as defined in CONFIG.PF1.conditionTargets.
     * @returns {Object.<string, string>} A list of conditionals
     */
    getConditionalSubTargets(target) {
        let result = {};
        // Add static targets
        if (hasProperty(CONFIG.D35E.conditionalTargets, target)) {
            for (let [k, v] of Object.entries(CONFIG.D35E.conditionalTargets[target])) {
                if (!k.startsWith("_")) result[k] = v;
            }
        }
        // Add subtargets depending on attacks
        if (["attack", "damage"].includes(target)) {
            // Add specific attacks
            if (this.hasAttack) {
                result["attack.0"] = `${game.i18n.localize("D35E.Attack")} 1`;
            }
            if (this.hasMultiAttack) {
                for (let [k, v] of Object.entries(this.data.data.attackParts)) {
                    result[`attack.${Number(k) + 1}`] = v[1];
                }
            }
        }
        // Add subtargets affecting effects
        if (target === "effect") {
            if (this.data.type === "spell") result["cl"] = game.i18n.localize("D35E.CasterLevel");
            if (this.hasSave) result["dc"] = game.i18n.localize("D35E.DC");
        }
        // Add misc subtargets
        if (target === "misc") {
            // Add charges subTarget with specific label
            if (this.type === "spell" && this.useSpellPoints()) result["charges"] = game.i18n.localize("D35E.SpellPointsCost");
            else if (this.isCharged) result["charges"] = game.i18n.localize("D35E.ChargeCost");
        }
        return result;
    }

    /* Generates lists of conditional modifier bonus types applicable to a formula.
     * @param {string} target - The target key as defined in CONFIG.PF1.conditionTargets.
     * @returns {Object.<string, string>} A list of bonus types.
     * */
    getConditionalModifierTypes(target) {
        let result = {};
        if (target === "attack") {
            // Add bonusModifiers from CONFIG.PF1.bonusModifiers
            for (let [k, v] of Object.entries(CONFIG.D35E.bonusModifiers)) {
                result[k] = v;
            }
        }
        if (target === "damage") {
            for (let [k, v] of CACHE.DamageTypes.entries()) {
                result[k] = v.data.name;
            }
        }
        return result;
    }

    /* Generates a list of critical applications for a given formula target.
     * @param {string} target - The target key as defined in CONFIG.D35E.conditionalTargets.
     * @returns {Object.<string, string>} A list of critical applications.
     * */
    getConditionalCritical(target) {
        let result = {};
        // Attack bonuses can only apply as critical confirm bonus
        if (target === "attack") {
            result = { ...result, normal: "D35E.Normal"};
        }
        // Damage bonuses can be multiplied or not
        if (target === "damage") {
            result = { ...result, normal: "D35E.Normal" };
        }
        return result;
    }
    static get defaultConditional() {
        return {
            default: false,
            name: "",
            modifiers: [],
        };
    }

    static get defaultConditionalModifier() {
        return {
            formula: "",
            target: "",
            subTarget: "",
            type: "",
            critical: "",
        };
    }

    useSpellPoints() {
        if (!this.actor) return false;
        if (this.data.data.atWill) return false;

        const spellbook = getProperty(this.actor.data, `data.attributes.spells.spellbooks.${this.data.data.spellbook}`);
        return spellbook.usePowerPoints;
    }

    /***
     * Adds item from compendium to this instance as enhancement
     * @param packName name of compendium that enhancement is imported from
     * @param packId id of enhancement to add to item
     * @param enhValue value to set on enhancement
     * @returns {Promise<void>} awaitable item promise
     */
    async addEnhancementFromCompendium(packName, packId, enhValue) {
        let itemData = {}
        const packItem = await game.packs.find(p => p.collection === packName).getEntity(packId);
        if (packItem != null) {
            itemData = packItem.data
            itemData.data.enh = enhValue;
            ItemPF.setEnhItemPrice(itemData)
            return await this.getEnhancementFromData(itemData)
        }

    }

    static setEnhItemPrice(item) {
        {
            let rollData = {};
            if (this.actor != null) rollData = this.actor.getRollData();
            rollData.enhancement = item.data.enh;
            if (item.data.enhIncreaseFormula !== undefined && item.data.enhIncreaseFormula !== null && item.data.enhIncreaseFormula !== "") {
                item.data.enhIncrease = new Roll35e(item.data.enhIncreaseFormula, rollData).roll().total;
            }
        }
        {
            let rollData = {};
            if (this.actor != null) rollData = this.actor.getRollData();
            rollData.enhancement = item.data.enh;
            rollData.enhIncrease = item.data.enhIncrease;
            if (item.data.priceFormula !== undefined && item.data.priceFormula !== null && item.data.priceFormula !== "") {
                item.data.price = new Roll35e(item.data.priceFormula, rollData).roll().total;
            }
        }
    }

    async addLinkedItemFromData(itemData) {
        return this.update(await this.getLinkDataFromData(itemData))
    }

    async getLinkDataFromData(itemData) {
        const updateData = {};
        let _linkedItems = duplicate(getProperty(this.data, `data.linkedItems`) || []);
        let linkedData = {};
        linkedData.name = itemData.name;
        linkedData.img = itemData.img;
        linkedData.itemId = itemData._id;
        linkedData.packId = itemData.document.pack;
        _linkedItems.push(linkedData);
        updateData[`data.linkedItems`] = _linkedItems;
        return updateData
    }

    async addEnhancementFromData(itemData) {
        if (this.hasEnhancement(itemData.name)) return;
        return this.update(await this.getEnhancementFromData(itemData))
    }

    async getEnhancementFromData(itemData) {
        const updateData = {};
        let _enhancements = duplicate(getProperty(this.data, `data.enhancements.items`) || []);
        const enhancement = duplicate(itemData)
        if (enhancement._id) enhancement.id = this._id + "-" + itemData._id;
        _enhancements.push(enhancement);
        this.updateMagicItemName(updateData, _enhancements);
        this.updateMagicItemProperties(updateData, _enhancements);
        updateData[`data.enhancements.items`] = _enhancements;
        return updateData
    }

    hasEnhancement(name) {
        const tag = createTag(name)
        return (getProperty(this.data, `data.enhancements.items`) || []).some(i => createTag(i.name) === tag);
    }

    async createEnhSpell(itemData, type) {
        if (this.hasEnhancement(itemData.name)) return;

        const updateData = {};
        let _enhancements = duplicate(getProperty(this.data, `data.enhancements.items`) || []);
        let enhancement = await ItemPF.toEnhancement(itemData, type);
        if (enhancement.id) enhancement._id = this._id + "-" + enhancement.id;
        _enhancements.push(enhancement);
        this.updateMagicItemName(updateData, _enhancements);
        this.updateMagicItemProperties(updateData, _enhancements);
        updateData[`data.enhancements.items`] = _enhancements;
        await this.update(updateData);
    }

    async createEnhBuff(itemData) {
        if (this.hasEnhancement(itemData.name)) return;

        const updateData = {};
        let _enhancements = duplicate(getProperty(this.data, `data.enhancements.items`) || []);
        let enhancement = await ItemPF.toEnhancementBuff(itemData);
        if (enhancement.id) enhancement._id = this._id + "-" + enhancement.id;
        _enhancements.push(enhancement);
        this.updateMagicItemName(updateData, _enhancements);
        this.updateMagicItemProperties(updateData, _enhancements);
        updateData[`data.enhancements.items`] = _enhancements;
        await this.update(updateData);
    }

    updateMagicItemName(updateData, _enhancements, force = false, useIdentifiedName = false) {
        if ((this.data.data.enhancements !== undefined && this.data.data.enhancements.automation !== undefined && this.data.data.enhancements.automation !== null) || force) {
            if (this.data.data.enhancements.automation.updateName || force) {
                let baseName = useIdentifiedName && this.data.data.identifiedName || this.data.data.unidentified.name 
                if (this.data.data.unidentified.name === '') {
                    updateData[`data.unidentified.name`] = this.name;
                    baseName = this.name
                }
                updateData[`data.identifiedName`] = this.buildName(baseName, _enhancements)
            }
        }
    }

    updateMagicItemProperties(updateData, _enhancements, force = false) {
        if ((this.data.data.enhancements !== undefined && this.data.data.enhancements.automation !== undefined && this.data.data.enhancements.automation !== null) || force) {
            if (this.data.data.enhancements.automation.updateName || force) {
                let basePrice = this.data.data.unidentified.price
                if (!this.data.data.unidentified.price) {
                    updateData[`data.unidentified.price`] = this.data.data.price;
                    basePrice = this.data.data.price
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

            if (obj.data.enhancementType === "weapon" && this.type === 'weapon')
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
            if (obj.data.enhancementType === "armor" && this.type === 'equipment')
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
            if (obj.data.enhancementType === "weapon" && this.type === 'weapon') {
                totalEnchancementIncrease += obj.data.enhIncrease
                if (!obj.data.enhIsLevel)
                    totalEnchancement += obj.data.enh
                flatPrice += obj.data.price
                maxSingleEnhancementIncrease = Math.max(obj.data.enhIncrease, maxSingleEnhancementIncrease)
            }
            if (obj.data.enhancementType === "armor" && this.type === 'equipment') {
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
        if (this.type === 'weapon') {
            if (totalEnchancementIncrease > 0)
                totalPrice += 300
            if (!useEpicPricing)
                totalPrice += totalEnchancementIncrease * totalEnchancementIncrease * 2000 + flatPrice
            else
                totalPrice += totalEnchancementIncrease * totalEnchancementIncrease * 2000 * 10 + 10 * flatPrice
        } else if (this.type === 'equipment') {
            if (totalEnchancementIncrease > 0)
                totalPrice += 150
            if (!useEpicPricing)
                totalPrice += totalEnchancementIncrease * totalEnchancementIncrease * 1000 + flatPrice
            else
                totalPrice += totalEnchancementIncrease * totalEnchancementIncrease * 1000 * 10 + 10 * flatPrice
        }

        return totalPrice;
    }

 

    getRawEffectData() {
        const createData = { label: this.name, icon: this.img, origin: this.uuid, disabled: this.type === "aura" ? false : !this.data.data.active };
        if (this.type === "buff")
            createData["flags.D35E.show"] = !this.data.data.hideFromToken && !game.settings.get("D35E", "hideTokenConditions");
        if (this.type === "aura")
            createData["flags.D35E.show"] = !this.data.data.hideFromToken && !game.settings.get("D35E", "hideTokenConditions");
        return createData;
      }
    

    async renderBuffEndChatCard() {
        const chatTemplate = "systems/D35E/templates/chat/roll-ext.html";

        // Create chat data
        let chatData = {
            user: game.user._id,
            type: CONST.CHAT_MESSAGE_TYPES.CHAT,
            sound: CONFIG.sounds.dice,
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            rollMode: game.settings.get("core", "rollMode"),
            content: await renderTemplate(chatTemplate, {item: this, actor: this.actor}),
        };
        // Handle different roll modes
        switch (chatData.rollMode) {
            case "gmroll":
                chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
                break;
            case "selfroll":
                chatData["whisper"] = [game.user._id];
                break;
            case "blindroll":
                chatData["whisper"] = game.users.contents.filter(u => u.isGM).map(u => u._id);
                chatData["blind"] = true;
        }

        // Send message
        await createCustomChatMessage("systems/D35E/templates/chat/deactivate-buff.html", {items: [this], actor: this.actor}, chatData,  {rolls: []})
    }

    capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    hasUnmetRequirements(rollData) {
        if (!rollData) {
            if (!this.actor) return []; //There are no requirements when item has no actor!
            rollData = this.actor.getRollData();
        }
        let unmetRequirements = []
        rollData.item = this.getRollData();
        for (const _requirement of this.data.data.requirements || []) {
            if (_requirement[2] === "generic") {
                if (!(new Roll35e(_requirement[1], rollData).roll().total)){
                    unmetRequirements.push(_requirement[0])
                }
            } else if (_requirement[2] === "feat") {
                if (!this.actor.getItemByTag(_requirement[1])) {
                    unmetRequirements.push(_requirement[0])
                }
            } else if (_requirement[2] === "bab") {
                if (rollData.attributes.bab.total < parseInt(_requirement[1])) {

                    unmetRequirements.push(_requirement[0] || (game.i18n.localize("D35E.BAB") + " " + _requirement[1]))
                }
            } else {
                if (_requirement[2] && rollData.abilities[_requirement[2]].value < parseInt(_requirement[1])) {

                    unmetRequirements.push(_requirement[0] || (game.i18n.localize(`D35E.Ability${this.capitalizeFirstLetter(_requirement[2])}`) + " " + _requirement[1]))
                }
            }
        }
        return unmetRequirements;
    }

    attackDescription(rollData) {
        // //console.log('D35E | AB ', this.hasAttack)
        if (!rollData) {
            if (!this.actor) return []; //There are no requirements when item has no actor!
            rollData = this.actor.getRollData();
        }
        rollData.item = this.getRollData();

        if (this.hasAttack) {
            let bab = 0;
            let attackBonus = ((this.data.data.enh || 0) ? this.data.data.enh : (this.data.data.masterwork ? "1" : "0")) + "+" + (this.data.data.attackBonus || "0");
            let abilityBonus = "0";
            let sizeBonus = CONFIG.D35E.sizeMods[this.actor.data.data.traits.actualSize] || 0;
            if (this.actor) {
                bab = this.actor.data.data.attributes.bab.total;
                if (this.data.data.ability.attack)
                    abilityBonus = this.actor.data.data.abilities[this.data.data.ability.attack].mod
            }
            let totalBonus = new Roll35e(`${bab} + ${attackBonus} + ${abilityBonus} + ${sizeBonus}`, rollData).roll().total;
            return `${totalBonus >= 0 ? '+'+totalBonus : totalBonus}`

        }
        return "";
    }

    damageDescription(rollData) {
        // //console.log('D35E | DD ', this.hasDamage)
        if (!rollData) {
            if (!this.actor) return []; //There are no requirements when item has no actor!
            rollData = this.actor.getRollData();
        }
        rollData.critMult = 1;
        rollData.item = this.getRollData()
        let abilityBonus = 0;
        let results = []
        if (this.hasDamage) {
            this.data.data.damage.parts.forEach(d => {
                if (d) {
                    try {
                        let roll = new Roll35e(d[0].replace('@useAmount', 1), rollData).roll();
                        results.push(roll.formula)
                    } catch (e) {

                    }
                }
            })
        }
        if (this.data.data.ability.damage)
            abilityBonus = parseInt(this.actor.data.data.abilities[this.data.data.ability.damage].mod)*this.data.data.ability.damageMult
        if (abilityBonus) results.push(abilityBonus)
        if (this.data.data.enh) results.push(this.data.data.enh)
        return results.join(" + ");
    }

    get range() {

        let rng = this.data.data.range || {};
        if (!["ft", "mi", "spec"].includes(rng.units)) {
            rng.value = null;
            rng.long = null;
        }
        if (rng.units === 'ft')
            if (this.data.data.thrown) {
                rng.long = rng.value*5;
            } else {
                if (this.data.data.actionType === "rwak")
                    rng.long = rng.value*10;
            }
        let range = [rng.value, rng.long ? `/ ${rng.long}` : null, CONFIG.D35E.distanceUnitsShort[rng.units]].filterJoin(" ");
        if (range.length > 0) return [range].join(" ");
        return "";
    }

}
