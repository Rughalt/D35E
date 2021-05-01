import { DicePF } from "../dice.js";
import { ItemPF } from "../item/entity.js";
import { createTag, linkData, isMinimumCoreVersion } from "../lib.js";
import { createCustomChatMessage } from "../chat.js";
import { _getInitiativeFormula } from "../combat.js";
import { CACHE } from "../cache.js";
import {DamageTypes} from "../damage-types.js";
import {D35E} from "../config.js";
import {Roll35e} from "../roll.js"

/**
 * Extend the base Actor class to implement additional logic specialized for D&D5e.
 */
export class ActorPF extends Actor {
    /* -------------------------------------------- */
    API_URI = 'https://companion.legaciesofthedragon.com/';

    static chatListeners(html) {
        html.on('click', 'button[data-action]', this._onChatCardButtonAction.bind(this));
    }

    static async _onChatCardButtonAction(event) {
        event.preventDefault();

        // Extract card data
        const button = event.currentTarget;
        const card = button.closest(".chat-card");
        const action = button.dataset.action;

        // Get the Actor
        const actor = ItemPF._getChatCardActor(card);


        button.disabled = true;
        // Roll saving throw
        if (action === "save") {
            const saveId = button.dataset.save;
            if (actor) await actor.rollSavingThrow(saveId,null,null, { event: event });
        }

        button.disabled = false;
    }

    /* -------------------------------------------- */

    get spellFailure() {
        if (this.items == null) return this.data.data.attributes.arcaneSpellFailure || 0;
        return this.items.filter(o => {
            return o.type === "equipment" && o.data.data.equipped === true && !o.data.data.melded;
        }).reduce((cur, o) => {
            if (typeof o.data.data.spellFailure === "number") return cur + o.data.data.spellFailure;
            return cur;
        }, this.data.data.attributes.arcaneSpellFailure || 0);
    }

    get race() {
        if (this.items == null) return null;
        return this.items.filter(o => o.type === "race")[0];
    }

    get racialHD() {
        if (this.items == null) return null;
        return this.items.find(o => o.type === "class" && getProperty(o.data, "classType") === "racial")[0];
    }

    static _translateSourceInfo(type, subtype, name) {
        let result = "";
        if (type === "size") result = "Size";
        if (type === "buff") {
            result = "Buffs";
            if (subtype === "temp") result = "Temporary Buffs";
            if (subtype === "perm") result = "Permanent Buffs";
            if (subtype === "item") result = "Item Buffs";
            if (subtype === "misc") result = "Misc Buffs";
        }
        if (type === "race") {
            result = "Race";
        }
        if (type === "equipment") result = "Equipment";
        if (type === "weapon") result = "Weapons";
        if (type === "feat") {
            result = "Feats";
            if (subtype === "classFeat") result = "Class Features";
            if (subtype === "trait") result = "Traits";
            if (subtype === "racial") result = "Racial Traits";
            if (subtype === "misc") result = "Misc Features";
        }

        if (!name || name.length === 0) return result;
        if (result === "") return name;
        return `${result} (${name})`;
    }

    static _getChangeItemSubtype(item) {
        if (item.type === "buff") return item.data.buffType;
        if (item.type === "feat") return item.data.featType;
        return "";
    }

    static _blacklistChangeData(result, changeTarget) {
        //let result = duplicate(data);

        switch (changeTarget) {
            case "mhp":
                result.attributes.hp = null;
                result.skills = null;
                break;
            case "wounds":
                result.attributes.wounds = null;
                result.skills = null;
                break;
            case "vigor":
                result.attributes.vigor = null;
                result.skills = null;
                break;
            case "str":
                result.abilities.str = null;
                result.skills = null;
                result.attributes.savingThrows = null;
                break;
            case "con":
                result.abilities.con = null;
                result.attributes.hp = null;
                result.attributes.wounds = null;
                result.skills = null;
                result.attributes.savingThrows = null;
                break;
            case "dex":
                result.abilities.dex = null;
                result.attributes.ac = null;
                result.skills = null;
                result.attributes.savingThrows = null;
                break;
            case "int":
                result.abilities.int = null;
                result.skills = null;
                result.attributes.savingThrows = null;
                break;
            case "wis":
                result.abilities.wis = null;
                result.skills = null;
                result.attributes.savingThrows = null;
                break;
            case "cha":
                result.abilities.cha = null;
                result.skills = null;
                result.attributes.savingThrows = null;
                break;
            case "ac":
            case "aac":
            case "sac":
            case "nac":
                result.attributes.ac = null;
                break;
            case "attack":
            case "mattack":
            case "rattack":
                result.attributes.attack = null;
                break;
            case "babattack":
                result.attributes.bab = null;
                break;
            case "damage":
            case "wdamage":
            case "sdamage":
                result.attributes.damage = null;
                break;
            case "allSavingThrows":
            case "fort":
            case "ref":
            case "will":
                result.attributes.savingThrows = null;
                break;
            case "skills":
            case "strSkills":
            case "dexSkills":
            case "conSkills":
            case "intSkills":
            case "wisSkills":
            case "chaSkills":
                result.skills = null;
                break;
            case "cmb":
                result.attributes.cmb = null;
                break;
            case "cmd":
                result.attributes.cmd = null;
                break;
            case "init":
                result.attributes.init = null;
                break;
        }

        if (changeTarget.match(/^data\.skills/)) {
            result.skills = null;
        }

        return result;
    }

    get _sortChangePriority() {
        const skillTargets = this._skillTargets;
        return {
            targets: [
                "ability", "misc", "ac", "attack", "damage", "savingThrows", "skills", "skill", "prestigeCl","resistance","dr"
            ], types: [
                "str", "dex", "con", "int", "wis", "cha",
                "allSpeeds", "landSpeed", "climbSpeed", "swimSpeed", "burrowSpeed", "flySpeed",
                "skills", "strSkills", "dexSkills", "conSkills", "intSkills", "wisSkills", "chaSkills","perfSkills","craftSkills","knowSkills", ...skillTargets,
                "allChecks", "strChecks", "dexChecks", "conChecks", "intChecks", "wisChecks", "chaChecks",
                "ac", "aac", "sac", "nac","tch","ddg","pac",
                "attack", "mattack", "rattack", 'babattack',
                "damage", "wdamage", "sdamage",
                "allSavingThrows", "fort", "ref", "will", "turnUndead","turnUndeadDiceTotal", "spellResistance", "powerPoints", "sneakAttack",
                "cmb", "cmd", "init", "mhp", "wounds", "vigor", "arcaneCl", "divineCl", "psionicCl", "cr", "fortification", "regen", "fastHeal", "concealment"
            ], modifiers: [
                "untyped", "base", "enh", "dodge", "inherent", "deflection",
                "morale", "luck", "sacred", "insight", "resist", "profane",
                "trait", "racial", "size", "competence", "circumstance",
                "alchemical", "penalty"
            ]
        };
    }

    get _skillTargets() {
        let skills = [];
        let subSkills = [];
        for (let [sklKey, skl] of Object.entries(this.data.data.skills)) {
            if (skl == null) continue;
            if (skl.subSkills != null) {
                for (let subSklKey of Object.keys(skl.subSkills)) {
                    subSkills.push(`skill.${sklKey}.subSkills.${subSklKey}`);
                }
            } else skills.push(`skill.${sklKey}`);
        }
        return [...skills, ...subSkills];
    }

    _sortChanges(a, b) {
        const targetA = a.raw[1];
        const targetB = b.raw[1];
        const typeA = a.raw[2];
        const typeB = b.raw[2];
        const modA = a.raw[3];
        const modB = b.raw[3];
        const priority = this._sortChangePriority;
        let firstSort = priority.types.indexOf(typeA) - priority.types.indexOf(typeB);
        let secondSort = priority.modifiers.indexOf(modA) - priority.modifiers.indexOf(modB);
        let thirdSort = priority.targets.indexOf(targetA) - priority.targets.indexOf(targetB);
        secondSort += (Math.sign(firstSort) * priority.types.length);
        thirdSort += (Math.sign(secondSort) * priority.modifiers.length);
        return firstSort + secondSort + thirdSort;
    }

    _parseChange(change, changeData, flags) {
        if (flags == null) flags = {};
        const changeType = change.raw[3];
        const changeValue = change.raw[4];

        if (!changeData[changeType]) return;
        if (changeValue === 0) return;
        if (flags.loseDexToAC && changeType === "dodge") return;

        change.source.value = changeValue;

        const prevValue = {
            positive: changeData[changeType].positive.value,
            negative: changeData[changeType].negative.value
        };
        // Add value
        if (changeValue > 0) {
            if (["untyped", "dodge", "penalty"].includes(changeType)) changeData[changeType].positive.value += changeValue;
            else {
                changeData[changeType].positive.value = Math.max(changeData[changeType].positive.value, changeValue);
            }
        } else {
            if (["untyped", "dodge", "penalty"].includes(changeType)) changeData[changeType].negative.value += changeValue;
            else changeData[changeType].negative.value = Math.min(changeData[changeType].negative.value, changeValue);
        }

        // Add source
        if (changeValue > 0) {
            if (["untyped", "dodge", "penalty"].includes(changeType)) {
                const compareData = changeData[changeType].positive.sources.filter(o => {
                    return o.type === change.source.type && o.subtype === change.source.subtype;
                });
                if (compareData.length > 0) compareData[0].value += changeValue;
                else {
                    changeData[changeType].positive.sources.push(change.source);
                }
            } else if (prevValue.positive < changeValue) {
                changeData[changeType].positive.sources = [change.source];
            }
        } else {
            if (["untyped", "dodge", "penalty"].includes(changeType)) {
                const compareData = changeData[changeType].negative.sources.filter(o => {
                    return o.type === change.source.type && o.subtype === change.source.subtype;
                });
                if (compareData.length > 0) compareData[0].value += changeValue;
                else {
                    changeData[changeType].negative.sources.push(change.source);
                }
            } else if (prevValue.negative > changeValue) {
                changeData[changeType].negative.sources = [change.source];
            }
        }
    }

    _getChangeFlat(changeTarget, changeType, curData) {
        if (curData == null) curData = this.data.data;
        let result = [];

        switch (changeTarget) {
            case "mhp":
                if (changeType === "replace") return "data.attributes.hp.replace";
                return "data.attributes.hp.max";
            case "wounds":
                return "data.attributes.wounds.max";
            case "vigor":
                return "data.attributes.vigor.max";
            case "str":
                if (changeType === "penalty") return "data.abilities.str.penalty";
                if (changeType === "replace") return "data.abilities.str.replace";
                return "data.abilities.str.total";
            case "dex":
                if (changeType === "penalty") return "data.abilities.dex.penalty";
                if (changeType === "replace") return "data.abilities.dex.replace";
                return "data.abilities.dex.total";
            case "con":
                if (changeType === "penalty") return "data.abilities.con.penalty";
                if (changeType === "replace") return "data.abilities.con.replace";
                if (changeType === "total") return "data.abilities.con.total";
                return "data.abilities.con.total";
            case "int":
                if (changeType === "penalty") return "data.abilities.int.penalty";
                if (changeType === "replace") return "data.abilities.int.replace";
                return "data.abilities.int.total";
            case "wis":
                if (changeType === "penalty") return "data.abilities.wis.penalty";
                if (changeType === "replace") return "data.abilities.wis.replace";
                return "data.abilities.wis.total";
            case "cha":
                if (changeType === "penalty") return "data.abilities.cha.penalty";
                if (changeType === "replace") return "data.abilities.cha.replace";
                return "data.abilities.cha.total";
            case "ac":
                if (changeType === "dodge") return ["data.attributes.ac.normal.total", "data.attributes.ac.touch.total", "data.attributes.cmd.total"];
                else if (changeType === "deflection") {
                    return ["data.attributes.ac.normal.total", "data.attributes.ac.touch.total",
                        "data.attributes.ac.flatFooted.total", "data.attributes.cmd.total", "data.attributes.cmd.flatFootedTotal"];
                }
                return ["data.attributes.ac.normal.total", "data.attributes.ac.touch.total", "data.attributes.ac.flatFooted.total"];
            case "aac":
                return ["data.attributes.ac.normal.total", "data.attributes.ac.flatFooted.total"];
            case "sac":
                return ["data.attributes.ac.normal.total", "data.attributes.ac.flatFooted.total"];
            case "nac":
                return ["data.attributes.ac.normal.total", "data.attributes.ac.flatFooted.total", "data.attributes.naturalACTotal"];
            case "tch":
                return ["data.attributes.ac.touch.total"];
            case "pac":
                return ["data.attributes.ac.normal.total"];
            case "attack":
                return "data.attributes.attack.general";
            case "mattack":
                return "data.attributes.attack.melee";
            case "rattack":
                return "data.attributes.attack.ranged";
            case "babattack":
                return ["data.attributes.bab.total", "data.attributes.cmb.total"];
            case "damage":
                return "data.attributes.damage.general";
            case "wdamage":
                return "data.attributes.damage.weapon";
            case "sdamage":
                return "data.attributes.damage.spell";
            case "allSavingThrows":
                return ["data.attributes.savingThrows.fort.total", "data.attributes.savingThrows.ref.total", "data.attributes.savingThrows.will.total"];
            case "fort":
                return "data.attributes.savingThrows.fort.total";
            case "ref":
                return "data.attributes.savingThrows.ref.total";
            case "will":
                return "data.attributes.savingThrows.will.total";
            case "skills":
                for (let [a, skl] of Object.entries(curData.skills)) {
                    if (skl == null) continue;
                    result.push(`data.skills.${a}.changeBonus`);

                    if (skl.subSkills != null) {
                        for (let b of Object.keys(skl.subSkills)) {
                            result.push(`data.skills.${a}.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            case "strSkills":
                for (let [a, skl] of Object.entries(curData.skills)) {
                    if (skl == null) continue;
                    if (skl.ability === "str") result.push(`data.skills.${a}.changeBonus`);

                    if (skl.subSkills != null) {
                        for (let [b, subSkl] of Object.entries(skl.subSkills)) {
                            if (subSkl != null && subSkl.ability === "str") result.push(`data.skills.${a}.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            case "dexSkills":
                for (let [a, skl] of Object.entries(curData.skills)) {
                    if (skl == null) continue;
                    if (skl.ability === "dex") result.push(`data.skills.${a}.changeBonus`);

                    if (skl.subSkills != null) {
                        for (let [b, subSkl] of Object.entries(skl.subSkills)) {
                            if (subSkl != null && subSkl.ability === "dex") result.push(`data.skills.${a}.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            case "conSkills":
                for (let [a, skl] of Object.entries(curData.skills)) {
                    if (skl == null) continue;
                    if (skl.ability === "con") result.push(`data.skills.${a}.changeBonus`);

                    if (skl.subSkills != null) {
                        for (let [b, subSkl] of Object.entries(skl.subSkills)) {
                            if (subSkl != null && subSkl.ability === "con") result.push(`data.skills.${a}.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            case "intSkills":
                for (let [a, skl] of Object.entries(curData.skills)) {
                    if (skl == null) continue;
                    if (skl.ability === "int") result.push(`data.skills.${a}.changeBonus`);

                    if (skl.subSkills != null) {
                        for (let [b, subSkl] of Object.entries(skl.subSkills)) {
                            if (subSkl != null && subSkl.ability === "int") result.push(`data.skills.${a}.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            case "wisSkills":
                for (let [a, skl] of Object.entries(curData.skills)) {
                    if (skl == null) continue;
                    if (skl.ability === "wis") result.push(`data.skills.${a}.changeBonus`);

                    if (skl.subSkills != null) {
                        for (let [b, subSkl] of Object.entries(skl.subSkills)) {
                            if (subSkl != null && subSkl.ability === "wis") result.push(`data.skills.${a}.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            case "chaSkills":
                for (let [a, skl] of Object.entries(curData.skills)) {
                    if (skl == null) continue;
                    if (skl.ability === "cha") result.push(`data.skills.${a}.changeBonus`);

                    if (skl.subSkills != null) {
                        for (let [b, subSkl] of Object.entries(skl.subSkills)) {
                            if (subSkl != null && subSkl.ability === "cha") result.push(`data.skills.${a}.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            case "perfSkills": {
                let skl = curData.skills["prf"];
                if (skl != null) {
                    result.push(`data.skills.prf.changeBonus`);
                    if (skl.subSkills != null) {
                        for (let [b, subSkl] of Object.entries(skl.subSkills)) {
                            if (subSkl != null) result.push(`data.skills.prf.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            }
            case "profSkills": {
                let skl = curData.skills["pro"];
                if (skl != null) {
                    result.push(`data.skills.pro.changeBonus`);
                    if (skl.subSkills != null) {
                        for (let [b, subSkl] of Object.entries(skl.subSkills)) {
                            if (subSkl != null) result.push(`data.skills.pro.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            }
            case "craftSkills": {
                let skl = curData.skills["crf"];
                if (skl != null) {
                    result.push(`data.skills.crf.changeBonus`);
                    if (skl.subSkills != null) {
                        for (let [b, subSkl] of Object.entries(skl.subSkills)) {
                            if (subSkl != null) result.push(`data.skills.crf.subSkills.${b}.changeBonus`);
                        }
                    }
                }
                return result;
            }

            case "knowSkills": {
                let knowledgeSkills = new Set(['kna','kno','kpl','kre','klo','khi','kge','ken','kdu','kar','kps'])
                for (let [a, skl] of Object.entries(curData.skills)) {
                    if (skl == null) continue;
                    if (knowledgeSkills.has(a))
                        result.push(`data.skills.${a}.changeBonus`);
                }
                return result;
            }
            case "allChecks":
                return ["data.abilities.str.checkMod", "data.abilities.dex.checkMod", "data.abilities.con.checkMod",
                    "data.abilities.int.checkMod", "data.abilities.wis.checkMod", "data.abilities.cha.checkMod"];
            case "strChecks":
                return "data.abilities.str.checkMod";
            case "dexChecks":
                return "data.abilities.dex.checkMod";
            case "conChecks":
                return "data.abilities.con.checkMod";
            case "intChecks":
                return "data.abilities.int.checkMod";
            case "wisChecks":
                return "data.abilities.wis.checkMod";
            case "chaChecks":
                return "data.abilities.cha.checkMod";
            case "allSpeeds":
                for (let speedKey of Object.keys(curData.attributes.speed)) {
                    if (getProperty(curData, `attributes.speed.${speedKey}.base`)) result.push(`data.attributes.speed.${speedKey}.total`);
                }
                return result;
            case "landSpeed":
                if (changeType === "replace") return "data.attributes.speed.land.replace";
                return "data.attributes.speed.land.total";
            case "climbSpeed":
                if (changeType === "replace") return "data.attributes.speed.climb.replace";
                return "data.attributes.speed.climb.total";
            case "swimSpeed":
                if (changeType === "replace") return "data.attributes.speed.swim.replace";
                return "data.attributes.speed.swim.total";
            case "burrowSpeed":
                if (changeType === "replace") return "data.attributes.speed.burrow.replace";
                return "data.attributes.speed.burrow.total";
            case "flySpeed":
                if (changeType === "replace") return "data.attributes.speed.fly.replace";
                return "data.attributes.speed.fly.total";
            case "cmb":
                return "data.attributes.cmb.total";
            case "sneakAttack":
                return "data.attributes.sneakAttackDiceTotal";
            case "powerPoints":
                return "data.attributes.powerPointsTotal";
            case "turnUndead":
                return "data.attributes.turnUndeadUsesTotal";
            case "turnUndeadDiceTotal":
                return "data.attributes.turnUndeadHdTotal";
            case "regen":
                return "data.traits.regenTotal";
            case "fastHeal":
                return "data.traits.fastHealingTotal";
            case "cmd":
                return ["data.attributes.cmd.total", "data.attributes.cmd.flatFootedTotal"];
            case "init":
                return "data.attributes.init.total";
            case "spellResistance":
                return "data.attributes.sr.total";
            case "size":
                return "size";
            case "arcaneCl":
                return "data.attributes.prestigeCl.arcane.max";
            case "psionicCl":
                return "data.attributes.prestigeCl.psionic.max";
            case "divineCl":
                return "data.attributes.prestigeCl.divine.max";
            case "cr":
                return "data.details.totalCr";
            case "fortification":
                return "data.attributes.fortification.total";
            case "concealment":
                return "data.attributes.concealment.total";
            case "asf":
                return "data.attributes.arcaneSpellFailure";
        }

        if (changeTarget.match(/^skill\.([a-zA-Z0-9]+)$/)) {
            const sklKey = RegExp.$1;
            if (curData.skills[sklKey] != null) {
                return `data.skills.${sklKey}.changeBonus`;
            }
        } else if (changeTarget.match(/^skill\.([a-zA-Z0-9]+)\.subSkills\.([a-zA-Z0-9]+)$/)) {
            const sklKey = RegExp.$1;
            const subSklKey = RegExp.$2;
            if (curData.skills[sklKey] != null && curData.skills[sklKey].subSkills[subSklKey] != null) {
                return `data.skills.${sklKey}.subSkills.${subSklKey}.changeBonus`;
            }
        }

        if (changeTarget.match(/^resistance\.([a-zA-Z0-9\-]+)$/)) {
            const resistanceKey = RegExp.$1;
            return `data.resistances.${resistanceKey}.changeBonus`;
        }

        return null;
    }

    _dataIsPC(data) {
        if (data.permission != null) {
            const nonGM = game.users.entities.filter(u => !u.isGM);
            return nonGM.some(u => {
                if (data.permission["default"] >= CONST.ENTITY_PERMISSIONS["OWNER"]) return true;
                return data.permission[u._id] >= CONST.ENTITY_PERMISSIONS["OWNER"];
            });
        }
        return this.hasPlayerOwner;
    }


    async _addDefaultChanges(data, changes, flags, sourceInfo, fullConditions, sizeOverride, options = {}, updateData) {
        // Class hit points
        const classes = data.items.filter(o => o.type === "class" && getProperty(o.data, "classType") !== "racial").sort((a, b) => {
            return a.sort - b.sort;
        });
        const racialHD = data.items.filter(o => o.type === "class" && getProperty(o.data, "classType") === "racial").sort((a, b) => {
            return a.sort - b.sort;
        });

        const healthConfig = game.settings.get("D35E", "healthConfig");
        const cls_options = this.data.type === "character" ? healthConfig.hitdice.PC : healthConfig.hitdice.NPC;
        const race_options = healthConfig.hitdice.Racial;
        const round = { up: Math.ceil, nearest: Math.round, down: Math.floor }[healthConfig.rounding];
        const continuous = { discrete: false, continuous: true }[healthConfig.continuity];

        const push_health = (value, source) => {
            changes.push({
                raw: [value.toString(), "misc", "mhp", "untyped", 0],
                source: { name: source.name, subtype: source.name.toString() }
            });
            changes.push({
                raw: [value.toString(), "misc", "vigor", "untyped", 0],
                source: { name: source.name, subtype: source.name.toString() }
            });
        }
        const manual_health = (health_source) => {
            let health = health_source.data.hp + (health_source.data.classType === "base") * health_source.data.fc.hp.value;
            if (!continuous) health = round(health);
            push_health(health, health_source);
        }
        const auto_health = (health_source, options, maximized = 0) => {
            let die_health = 1 + (health_source.data.hd - 1) * options.rate;
            if (!continuous) die_health = round(die_health);

            const maxed_health = Math.min(health_source.data.levels, maximized) * health_source.data.hd;
            const level_health = Math.max(0, health_source.data.levels - maximized) * die_health;
            const favor_health = (health_source.data.classType === "base") * health_source.data.fc.hp.value;
            let health = maxed_health + level_health + favor_health;

            push_health(health, health_source);
        }
        const compute_health = (health_sources, options) => {
            // Compute and push health, tracking the remaining maximized levels.
            if (options.auto) {
                let maximized = options.maximized;
                for (const hd of health_sources) {
                    auto_health(hd, options, maximized);
                    maximized = Math.max(0, maximized - hd.data.levels);
                }
            } else health_sources.forEach(race => manual_health(race));
        }

        compute_health(racialHD, race_options);
        compute_health(classes, cls_options);

        // Add Constitution to HP
        changes.push({
            raw: ["@abilities.con.origMod * @attributes.hd.racialClass", "misc", "mhp", "untyped", 0],
            source: { name: "Constitution" }
        });
        changes.push({
            raw: ["2 * (@abilities.con.origTotal + @abilities.con.drain)", "misc", "wounds", "base", 0],
            source: { name: "Constitution" }
        });


        // Natural armor
        {
            const natAC = getProperty(data, "data.attributes.naturalAC") || 0;
            if (natAC > 0) {
                changes.push({
                    raw: [natAC.toString(), "ac", "nac", "base", 0],
                    source: {
                        name: "Natural Armor"
                    }
                });
            }
        }


        // Add armor bonuses from equipment
        data.items.filter(obj => {
            return obj.type === "equipment" && obj.data.equipped && !obj.data.melded;
        }).forEach(item => {
            let armorTarget = "aac";
            if (item.data.equipmentType === "shield") armorTarget = "sac";
            // Push base armor
            if (item.data.armor.value) {
                changes.push({
                    raw: [`${item.data.armor.value + (item.data.armor.enh || 0)}`, "ac", armorTarget, "base", 0],
                    source: {
                        type: item.type,
                        name: item.name
                    }
                });
            } else if (item.data.armor.enh && item.data.equipmentType !== "misc") {
                changes.push({
                    raw: [item.data.armor.enh.toString(), "ac", armorTarget, "enh", 0],
                    source: {
                        type: item.type,
                        name: item.name
                    }
                });
            }
        });


        // Add fly bonuses or penalties based on maneuverability
        const flyKey = getProperty(data, "data.attributes.speed.fly.maneuverability");
        let flyValue = 0;
        if (flyKey != null) flyValue = CONFIG.D35E.flyManeuverabilityValues[flyKey];
        if (flyValue !== 0) {
            changes.push({
                raw: [flyValue.toString(), "skill", "skill.fly", "untyped", 0],
                source: {
                    name: game.i18n.localize("D35E.FlyManeuverability"),
                },
            });
        }
        // Add swim and climb skill bonuses based on having speeds for them
        {
            const climbSpeed = getProperty(data, "data.attributes.speed.climb.total") || 0;
            const swimSpeed = getProperty(data, "data.attributes.speed.swim.total") || 0;
            if (climbSpeed > 0) {
                changes.push({
                    raw: ["8", "skill", "skill.clm", "racial", 0],
                    source: {
                        name: game.i18n.localize("D35E.SpeedClimb"),
                    },
                });
            }
            if (swimSpeed > 0) {
                changes.push({
                    raw: ["8", "skill", "skill.swm", "racial", 0],
                    source: {
                        name: game.i18n.localize("D35E.SpeedSwim"),
                    },
                });
            }
        }

        // Add size bonuses to various attributes
        let sizeKey = data.data.traits.size;
        let tokenSizeKey = data.data.traits.tokenSize || "actor";
        if (sizeOverride !== undefined && sizeOverride !== null && sizeOverride !== "") {
            sizeKey = sizeOverride;
            tokenSizeKey = sizeOverride;
        }
        if (tokenSizeKey === "actor") {
            tokenSizeKey = sizeKey;
        }
        linkData(data, updateData, "data.traits.actualSize", sizeKey);
        if (sizeKey !== "med") {
            // AC
            changes.push({
                raw: [CONFIG.D35E.sizeMods[sizeKey].toString(), "ac", "ac", "size", 0],
                source: {
                    type: "size"
                }
            });
            // Stealth skill
            changes.push({
                raw: [CONFIG.D35E.sizeStealthMods[sizeKey].toString(), "skill", "skill.hid", "size", 0],
                source: {
                    type: "size"
                }
            });
            // Fly skill
            changes.push({
                raw: [CONFIG.D35E.sizeFlyMods[sizeKey].toString(), "skill", "skill.fly", "size", 0],
                source: {
                    type: "size"
                }
            });
            // CMB
            changes.push({
                raw: [CONFIG.D35E.sizeSpecialMods[sizeKey].toString(), "misc", "cmb", "size", 0],
                source: {
                    type: "size"
                }
            });
            // CMD
            changes.push({
                raw: [CONFIG.D35E.sizeSpecialMods[sizeKey].toString(), "misc", "cmd", "size", 0],
                source: {
                    type: "size"
                }
            });
        }


        // Apply changes in Actor size to Token width/height
        if (!options.skipToken && tokenSizeKey !== 'none' && this.data.type !== "trap" && !this.data.data.noTokenOverride)
        {
            let size = CONFIG.D35E.tokenSizes[tokenSizeKey];
            //console.log(size)
            if (this.isToken) {
                let tokens = []
                tokens.push(this.token);
                tokens.forEach(o => {
                    if (size.w !== o.data.width || size.h !== o.data.height || size.scale !== o.data.scale)
                        o.update({ width: size.w, height: size.h, scale: size.scale }, { stopUpdates: true });
                });
            }
            if (!this.isToken) {
                let tokens = this.getActiveTokens().filter(o => o.data.actorLink);
                tokens.forEach(o => {
                    if (size.w !== o.data.width || size.h !== o.data.height || size.scale !== o.data.scale)
                        o.update({ width: size.w, height: size.h, scale: size.scale }, { stopUpdates: true });
                });
                data["token.width"] = size.w;
                data["token.height"] = size.h;
                data["token.scale"] = size.scale;
            }
        }
        if (!options.skipToken && this.data.type !== "trap" && !this.data.data.noLightOverride && !game.settings.get("D35E", "globalDisableTokenLight"))
        {
            let dimLight = 0;
            let brightLight = 0;
            let alpha = 0.0;
            let color = '#000000'
            let animationIntensity = 5
            let lightAngle = 360
            let animationSpeed = 5
            let type = ""
            for (let i of this.items.values()) {
                if (!i.data.data.hasOwnProperty("light")) continue;
                if (i.data.data.equipped && !i.data.data.melded && i.data.data.light.emitLight) {
                    dimLight = i.data.data.light.dimRadius ? i.data.data.light.dimRadius : Math.floor(2 * i.data.data.light.radius);
                    brightLight = Math.floor(i.data.data.light.radius);
                    color = i.data.data.light.color || '#000';
                    type = i.data.data.light.type;
                    alpha = i.data.data.light.alpha;
                    animationIntensity = i.data.data.light.animationIntensity;
                    lightAngle = i.data.data.light.lightAngle;
                    animationSpeed = i.data.data.light.animationSpeed;
                    break;
                }
            }
            if (this.isToken) {
                let tokens = []
                tokens.push(this.token);
                tokens.forEach(o => {
                    if (dimLight !== o.data.dimLight ||
                        brightLight !== o.data.brightLight ||
                        color !== o.data.lightColor ||
                        animationIntensity !== o.data.lightAnimation.intensity ||
                        type !== o.data.lightAnimation.type ||
                        animationSpeed !== o.data.lightAnimation.speed ||
                        lightAngle !== o.data.lightAnimation.lightAngle
                    )
                        o.update({
                            dimLight: dimLight,
                            brightLight: brightLight,
                            lightColor: color || '#000',
                            lightAlpha: alpha,
                            lightAngle: lightAngle,
                            lightAnimation: { type: type, intensity: animationIntensity, speed: animationSpeed }
                        }, { stopUpdates: true });
                });
            }
            if (!this.isToken) {
                let tokens = this.getActiveTokens().filter(o => o.data.actorLink);
                tokens.forEach(o => {
                    if (dimLight !== o.data.dimLight || brightLight !== o.data.brightLight || color !== o.data.lightColor ||
                        animationIntensity !== o.data.lightAnimation.intensity ||
                        type !== o.data.lightAnimation.type ||
                        color !== o.data.lightColor ||
                        lightAngle !== o.data.lightAnimation.lightAngle ||
                        animationSpeed !== o.data.lightAnimation.speed)
                        o.update({
                            dimLight: dimLight,
                            brightLight: brightLight,
                            lightColor: color || '#000',
                            lightAlpha: alpha,
                            lightAngle: lightAngle,
                            lightAnimation: { type: type, intensity: animationIntensity, animationSpeed: animationSpeed }
                        }, { stopUpdates: true });
                });
                data[`token.dimLight`] = dimLight;
                data[`token.brightLight`] = brightLight;
                data[`token.lightColor`] = color || '#000';
                data[`token.lightAnimation.type`] = type;
                data[`token.lightAlpha`] = alpha;
            }
        }


        for (let [con, v] of Object.entries(fullConditions)) {
            if (!v) continue;

            switch (con) {
                case "blind":
                    changes.push({
                        raw: ["-2", "ac", "ac", "penalty", 0],
                        source: { name: "Blind" }
                    });
                    flags["loseDexToAC"] = true;
                    sourceInfo["data.attributes.ac.normal.total"] = sourceInfo["data.attributes.ac.normal.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.ac.touch.total"] = sourceInfo["data.attributes.ac.touch.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.cmd.total"] = sourceInfo["data.attributes.cmd.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.cmd.flatFootedTotal"] = sourceInfo["data.attributes.cmd.flatFootedTotal"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.ac.normal.total"].negative.push({
                        name: "Blind",
                        value: "Lose Dex to AC"
                    });
                    sourceInfo["data.attributes.ac.touch.total"].negative.push({
                        name: "Blind",
                        value: "Lose Dex to AC"
                    });
                    sourceInfo["data.attributes.cmd.total"].negative.push({ name: "Blind", value: "Lose Dex to AC" });
                    sourceInfo["data.attributes.cmd.flatFootedTotal"].negative.push({
                        name: "Blind",
                        value: "Lose Dex to AC"
                    });
                    break;
                case "dazzled":
                    changes.push({
                        raw: ["-1", "attack", "attack", "penalty", 0],
                        source: { name: "Dazzled" }
                    });
                    break;
                case "deaf":
                    changes.push({
                        raw: ["-4", "misc", "init", "penalty", 0],
                        source: { name: "Deaf" }
                    });
                    break;
                case "entangled":
                    changes.push({
                        raw: ["-4", "ability", "dex", "penalty", 0],
                        source: { name: "Entangled" }
                    });
                    changes.push({
                        raw: ["-2", "attack", "attack", "penalty", 0],
                        source: { name: "Entangled" }
                    });
                    break;
                case "grappled":
                    changes.push({
                        raw: ["-4", "ability", "dex", "penalty", 0],
                        source: { name: "Grappled" }
                    });
                    changes.push({
                        raw: ["-2", "attack", "attack", "penalty", 0],
                        source: { name: "Grappled" }
                    });
                    changes.push({
                        raw: ["-2", "misc", "cmb", "penalty", 0],
                        source: { name: "Grappled" }
                    });
                    break;
                case "helpless":
                    flags["noDex"] = true;
                    sourceInfo["data.abilities.dex.total"] = sourceInfo["data.abilities.dex.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.abilities.dex.total"].negative.push({ name: "Helpless", value: "0 Dex" });
                    break;
                case "paralyzed":
                    flags["noDex"] = true;
                    flags["noStr"] = true;
                    sourceInfo["data.abilities.dex.total"] = sourceInfo["data.abilities.dex.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.abilities.dex.total"].negative.push({ name: "Paralyzed", value: "0 Dex" });
                    sourceInfo["data.abilities.str.total"] = sourceInfo["data.abilities.str.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.abilities.str.total"].negative.push({ name: "Paralyzed", value: "0 Str" });
                    break;
                case "pinned":
                    flags["loseDexToAC"] = true;
                    sourceInfo["data.attributes.ac.normal.total"] = sourceInfo["data.attributes.ac.normal.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.ac.touch.total"] = sourceInfo["data.attributes.ac.touch.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.cmd.total"] = sourceInfo["data.attributes.cmd.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.ac.normal.total"].negative.push({
                        name: "Pinned",
                        value: "Lose Dex to AC"
                    });
                    sourceInfo["data.attributes.ac.touch.total"].negative.push({
                        name: "Pinned",
                        value: "Lose Dex to AC"
                    });
                    sourceInfo["data.attributes.cmd.total"].negative.push({ name: "Pinned", value: "Lose Dex to AC" });
                    break;
                case "fear":
                    changes.push({
                        raw: ["-2", "attack", "attack", "penalty", 0],
                        source: { name: "Fear" }
                    });
                    changes.push({
                        raw: ["-2", "savingThrows", "allSavingThrows", "penalty", 0],
                        source: { name: "Fear" }
                    });
                    changes.push({
                        raw: ["-2", "skills", "skills", "penalty", 0],
                        source: { name: "Fear" }
                    });
                    changes.push({
                        raw: ["-2", "abilityChecks", "allChecks", "penalty", 0],
                        source: { name: "Fear" }
                    });
                    break;
                case "sickened":
                    changes.push({
                        raw: ["-2", "attack", "attack", "penalty", 0],
                        source: { name: "Sickened" }
                    });
                    changes.push({
                        raw: ["-2", "damage", "wdamage", "penalty", 0],
                        source: { name: "Sickened" }
                    });
                    changes.push({
                        raw: ["-2", "savingThrows", "allSavingThrows", "penalty", 0],
                        source: { name: "Sickened" }
                    });
                    changes.push({
                        raw: ["-2", "skills", "skills", "penalty", 0],
                        source: { name: "Sickened" }
                    });
                    changes.push({
                        raw: ["-2", "abilityChecks", "allChecks", "penalty", 0],
                        source: { name: "Sickened" }
                    });
                    break;
                case "stunned":
                    changes.push({
                        raw: ["-2", "ac", "ac", "penalty", 0],
                        source: { name: "Stunned" }
                    });
                    flags["loseDexToAC"] = true;
                    sourceInfo["data.attributes.ac.normal.total"] = sourceInfo["data.attributes.ac.normal.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.ac.touch.total"] = sourceInfo["data.attributes.ac.touch.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.cmd.total"] = sourceInfo["data.attributes.cmd.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.ac.normal.total"].negative.push({
                        name: "Stunned",
                        value: "Lose Dex to AC"
                    });
                    sourceInfo["data.attributes.ac.touch.total"].negative.push({
                        name: "Stunned",
                        value: "Lose Dex to AC"
                    });
                    sourceInfo["data.attributes.cmd.total"].negative.push({ name: "Stunned", value: "Lose Dex to AC" });
                    break;
                case "wildshaped":
                    sourceInfo["data.attributes.ac.normal.total"] = sourceInfo["data.attributes.ac.normal.total"] || {
                        positive: [],
                        negative: []
                    };
                    sourceInfo["data.attributes.ac.normal.total"].positive.push({
                        name: "Wild Shape",
                        value: "Item bonuses disabled"
                    });
                    break;
            }
        }

        for (let flagKey of Object.keys(flags)) {
            if (!flags[flagKey]) continue;

            switch (flagKey) {
                case "noCon":
                    changes.push({
                        raw: ["(-(@abilities.con.origMod)) * @attributes.hd.total", "misc", "mhp", "untyped", 0],
                        source: { name: "0 Con" }
                    });
                    changes.push({
                        raw: ["5", "savingThrows", "fort", "untyped", 0],
                        source: { name: "0 Con" }
                    });
                    break;
            }
        }

        // Handle fatigue and exhaustion so that they don't stack
        if (data.data.attributes.conditions.exhausted) {
            changes.push({
                raw: ["-6", "ability", "str", "penalty", 0],
                source: { name: "Exhausted" }
            });
            changes.push({
                raw: ["-6", "ability", "dex", "penalty", 0],
                source: { name: "Exhausted" }
            });
        } else if (data.data.attributes.conditions.fatigued) {
            changes.push({
                raw: ["-2", "ability", "str", "penalty", 0],
                source: { name: "Fatigued" }
            });
            changes.push({
                raw: ["-2", "ability", "dex", "penalty", 0],
                source: { name: "Fatigued" }
            });
        }

        if (data.data.attributes.conditions.shaken) {
            changes.push({
                raw: ["-2", "savingThrows", "allAavingThrows", "penalty", 0],
                source: { name: "Shaken" }
            });
            changes.push({
                raw: ["-2", "skills", "skills", "penalty", 0],
                source: { name: "Shaken" }
            });
            changes.push({
                raw: ["-2", "abilityChecks", "allChecks", "penalty", 0],
                source: { name: "Shaken" }
            });
            changes.push({
                raw: ["-2", "attack", "attack", "penalty", 0],
                source: { name: "Shaken" }
            });
        }

        //Bluff
        if (data.data.skills.blf.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.dip", "untyped", 0],
                source: { name: "Skill synergy" }
            });
            changes.push({
                raw: ["2", "skill", "skill.int", "untyped", 0],
                source: { name: "Skill synergy" }
            });
            changes.push({
                raw: ["2", "skill", "skill.slt", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        //Knowledge arcana
        if (data.data.skills.kar.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.spl", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        // Kno Noblility
        if (data.data.skills.kno.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.dip", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        // Kno local
        if (data.data.skills.klo.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.gif", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        // Handle animals
        if (data.data.skills.han.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.rid", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        // Sense motive
        if (data.data.skills.sen.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.dip", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        // Jump
        if (data.data.skills.jmp.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.tmb", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        // Tumble
        if (data.data.skills.tmb.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.blc", "untyped", 0],
                source: { name: "Skill synergy" }
            });

            changes.push({
                raw: ["2", "skill", "skill.jmp", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        // Survival
        if (data.data.skills.sur.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.kna", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        // Concentration
        if (data.data.skills.coc.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.aut", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }

        if (data.data.skills.aut.rank >= 5) {
            changes.push({
                raw: ["2", "skill", "skill.kps", "untyped", 0],
                source: { name: "Skill synergy" }
            });
        }
        if (data.data.jumpSkillAdjust) {
            changes.push({
                raw: [`4*floor((@attributes.speed.land.total - 30)/10)`, "skill", "skill.jmp", "untyped", 0],
                source: {name: "Speed bonus"}
            });
        }

        // Apply level drain to hit points
        if (!Number.isNaN(data.data.attributes.energyDrain) && data.data.attributes.energyDrain > 0) {
            changes.push({
                raw: ["-(@attributes.energyDrain * 5)", "misc", "mhp", "untyped", 0],
                source: { name: "Negative Levels" }
            });
            changes.push({
                raw: ["-(@attributes.energyDrain * 5)", "misc", "vigor", "untyped", 0],
                source: { name: "Negative Levels" }
            });
        }
    }

    isChangeAllowed(item, change, fullConditions) {
        if ((fullConditions.wildshaped || fullConditions.polymorph) && item.type === "race" && change[1] === "ac" && change[2] === "natural") return false;
        if ((fullConditions.wildshaped || fullConditions.polymorph) && item.type === "race" && change[1] === "ability" && change[2] === "str") return false;
        if ((fullConditions.wildshaped || fullConditions.polymorph) && item.type === "race" && change[1] === "ability" && change[2] === "dex") return false;
        if ((fullConditions.wildshaped || fullConditions.polymorph) && item.type === "race" && change[1] === "speed") return false;
        return true;
    }

    async _updateChanges({data = null} = {}, options = {}) {
        let updateData = {};
        let srcData1 = mergeObject(this.data, expandObject(data || {}), { inplace: false });
        srcData1.items = this.items;

        // srcData1.items = this.items.reduce((cur, i) => {
        //     const otherItem = srcData1.items.filter(o => o._id === i._id)[0];
        //     if (otherItem) cur.push(mergeObject(i.data, otherItem, { inplace: false }));
        //     else cur.push(i.data);
        //     return cur;
        // }, []);

        // const allChangeObjects = srcData1.items.filter(obj => {
        //     return obj.data.changes != null;
        // }).filter(obj => {
        //     if (obj.type === "buff") return obj.data.active;
        //     if (obj.type === "equipment" || obj.type === "weapon") return (obj.data.equipped);
        //     return true;
        // });



        let sizeOverride = "";
        // Add conditions
        let fullConditions = srcData1.data.attributes.conditions || {}

        const changeObjects = srcData1.items.filter(obj => {
            return obj.data.data.changes != null;
        }).filter(obj => {
            let z = obj.type;
            if (obj.type === "buff") return obj.data.data.active;
            if (obj.type === "equipment" || obj.type === "weapon") return (obj.data.data.equipped && !obj.data.data.melded);
            return true;
        });

        // Track previous values
        const prevValues = {
            mhp: this.data.data.attributes.hp.max,
            wounds: getProperty(this.data, "data.attributes.wounds.max") || 0,
            vigor: getProperty(this.data, "data.attributes.vigor.max") || 0,
        };

        // Gather change types
        const changeData = {};
        const changeDataTemplate = {
            positive: {
                value: 0,
                sources: []
            },
            negative: {
                value: 0,
                sources: []
            }
        };
        for (let [key, buffTarget] of Object.entries(CONFIG.D35E.buffTargets)) {
            if (typeof buffTarget === "object") {
                // Add specific skills as targets
                if (key === "skill") {
                    for (let [s, skl] of Object.entries(this.data.data.skills)) {
                        if (skl == null) continue;
                        if (!skl.subSkills) {
                            changeData[`skill.${s}`] = {};
                            Object.keys(CONFIG.D35E.bonusModifiers).forEach(b => {
                                changeData[`skill.${s}`][b] = duplicate(changeDataTemplate);
                            });
                        } else {
                            for (let s2 of Object.keys(skl.subSkills)) {
                                changeData[`skill.${s}.subSkills.${s2}`] = {};
                                Object.keys(CONFIG.D35E.bonusModifiers).forEach(b => {
                                    changeData[`skill.${s}.subSkills.${s2}`][b] = duplicate(changeDataTemplate);
                                });
                            }
                        }
                    }
                }
                // Add static targets
                else {
                    for (let subKey of Object.keys(buffTarget)) {
                        if (subKey.startsWith("_")) continue;
                        changeData[subKey] = {};
                        Object.keys(CONFIG.D35E.bonusModifiers).forEach(b => {
                            changeData[subKey][b] = duplicate(changeDataTemplate);
                        });
                    }
                }
            }
        }


        // Create an array of changes
        let allChanges = [];
        for (const item of changeObjects) {
            // Get changes from base item
            for (const change of item.data.data.changes) {
                if (!this.isChangeAllowed(item, change, fullConditions)) continue;
                allChanges.push({
                    raw: change,
                    source: {
                        value: 0,
                        type: item.type,
                        subtype: this.constructor._getChangeItemSubtype(item),
                        name: item.name,
                        item: item,
                        itemRollData: item.getRollData()
                    }
                })
            }

            // Get changes from all enhancement
            if (item.type === "weapon" || item.type === "equipment") {
                if (item.data.data.enhancements !== undefined) {
                    for (const enhancementItem of item.data.data.enhancements.items) {
                        for (const change of enhancementItem.data.changes) {
                            if (!this.isChangeAllowed(item, change, fullConditions)) continue;
                            change[0] = change[0].replace(/@enhancement/gi, enhancementItem.data.enh)
                            allChanges.push({
                                raw: change,
                                source: {
                                    value: 0,
                                    type: item.type,
                                    subtype: this.constructor._getChangeItemSubtype(item),
                                    name: item.name,
                                    item: item,
                                    itemRollData: new ItemPF(item.data, {temporary: true}).getRollData()
                                }
                            });
                        }
                    }
                }
            }
        }

        // Add more changes
        let flags = {},
            sourceInfo = {};

        // Check flags
        for (let obj of changeObjects) {

            if (obj.data.sizeOverride !== undefined && obj.data.sizeOverride !== null && obj.data.sizeOverride !== "") {
                sizeOverride = obj.data.sizeOverride;

            }
            if (!obj.data.changeFlags) continue;
            for (let [flagKey, flagValue] of Object.entries(obj.data.changeFlags)) {
                if (flagValue === true) {
                    flags[flagKey] = true;

                    let targets = [];
                    let value = "";

                    switch (flagKey) {
                        case "loseDexToAC":
                            sourceInfo["data.attributes.ac.normal.total"] = sourceInfo["data.attributes.ac.normal.total"] || {
                                positive: [],
                                negative: []
                            };
                            sourceInfo["data.attributes.ac.touch.total"] = sourceInfo["data.attributes.ac.touch.total"] || {
                                positive: [],
                                negative: []
                            };
                            sourceInfo["data.attributes.cmd.total"] = sourceInfo["data.attributes.cmd.total"] || {
                                positive: [],
                                negative: []
                            };
                            targets = [
                                sourceInfo["data.attributes.ac.normal.total"].negative,
                                sourceInfo["data.attributes.ac.touch.total"].negative,
                                sourceInfo["data.attributes.cmd.total"].negative
                            ];
                            value = "Lose Dex to AC";
                            break;
                        case "noInt":
                            sourceInfo["data.abilities.int.total"] = sourceInfo["data.abilities.int.total"] || {
                                positive: [],
                                negative: []
                            };
                            targets = [sourceInfo["data.abilities.int.total"].negative];
                            value = "0 Int";
                            break;
                        case "noCon":
                            sourceInfo["data.abilities.con.total"] = sourceInfo["data.abilities.con.total"] || {
                                positive: [],
                                negative: []
                            };
                            targets = [sourceInfo["data.abilities.con.total"].negative];
                            value = "0 Con";
                            break;
                        case "noDex":
                            sourceInfo["data.abilities.dex.total"] = sourceInfo["data.abilities.dex.total"] || {
                                positive: [],
                                negative: []
                            };
                            targets = [sourceInfo["data.abilities.dex.total"].negative];
                            value = "0 Dex";
                            break;
                        case "noStr":
                            sourceInfo["data.abilities.str.total"] = sourceInfo["data.abilities.str.total"] || {
                                positive: [],
                                negative: []
                            };
                            targets = [sourceInfo["data.abilities.str.total"].negative];
                            value = "0 Str";
                            break;
                        case "oneInt":
                            sourceInfo["data.abilities.int.total"] = sourceInfo["data.abilities.int.total"] || {
                                positive: [],
                                negative: []
                            };
                            targets = [sourceInfo["data.abilities.int.total"].negative];
                            value = "1 Int";
                            break;
                        case "oneWis":
                            sourceInfo["data.abilities.wis.total"] = sourceInfo["data.abilities.wis.total"] || {
                                positive: [],
                                negative: []
                            };
                            targets = [sourceInfo["data.abilities.wis.total"].negative];
                            value = "1 Wis";
                            break;
                        case "oneCha":
                            sourceInfo["data.abilities.cha.total"] = sourceInfo["data.abilities.cha.total"] || {
                                positive: [],
                                negative: []
                            };
                            targets = [sourceInfo["data.abilities.cha.total"].negative];
                            value = "1 Cha";
                            break;
                    }

                    for (let t of Object.values(targets)) {
                        t.push({ type: obj.type, subtype: this.constructor._getChangeItemSubtype(obj), value: value });
                    }
                }
            }
        }


        // Initialize data
        await this._resetData(updateData, srcData1, flags, sourceInfo, allChanges, fullConditions);
        await this._addDefaultChanges(srcData1, allChanges, flags, sourceInfo, fullConditions, sizeOverride, options, updateData);

        // Sort changes
        allChanges.sort(this._sortChanges.bind(this));
        // Parse changes
        let temp = [];
        const origData = mergeObject(this.data, data != null ? expandObject(data) : {}, { inplace: false });
        updateData = flattenObject({ data: mergeObject(origData.data, expandObject(updateData).data, { inplace: false }) });
        this._addDynamicData(updateData, {}, flags, Object.keys(this.data.data.abilities), srcData1, true);

        if (!this.data.data?.master?.id) {
            let _changesLength = allChanges.length;
            allChanges = allChanges.filter((c) => (c.raw[0] || "").indexOf('@master') === -1)
            if (_changesLength !== allChanges.length) {
                return ui.notifications.warn(game.i18n.localize("D35E.FamiliarNoMaster"));
                console.log('D35E | Minion has some changes removed |', _changesLength,allChanges.length);
            }
        }

        let currentChangeTarget = null;
        let changeRollData = null;
        // All changes are sorted and lumped together
        allChanges.forEach((change, a) => {
            const formula = change.raw[0] || "";
            if (formula === "") return;
            const changeTarget = change.raw[2];
            if (changeData[changeTarget] == null) return;
            if (currentChangeTarget !== changeTarget) {
                currentChangeTarget = changeTarget;

                // Cleaning up roll data from blacklisted stuff for this type of change
                changeRollData = this.constructor._blacklistChangeData(this.getRollData(srcData1.data), changeTarget);
            }


            changeRollData.item = {};
            if (change.source.itemRollData != null) {
                changeRollData.item = change.source.itemRollData;
            }

            const roll = new Roll35e(formula, changeRollData);

            try {
                change.raw[4] = roll.roll().total;
            } catch (e) {
                ui.notifications.error(game.i18n.localize("D35E.ErrorItemFormula").format(change.source.item.name, this.name));
            }
            this._parseChange(change, changeData[changeTarget], flags);
            temp.push(changeData[changeTarget]);

            if (allChanges.length <= a + 1 || allChanges[a + 1].raw[2] !== changeTarget) {
                const newData = this._applyChanges(changeTarget, temp, srcData1);
                this._addDynamicData(updateData, newData, flags, Object.keys(this.data.data.abilities), srcData1, false, changeTarget);
                temp = [];
            }
        });


        for (let flagKey of Object.keys(flags)) {
            if (!flags[flagKey]) continue;

            switch (flagKey) {
                case "noDex":
                    linkData(srcData1, updateData, "data.abilities.dex.total", 0);
                    linkData(srcData1, updateData, "data.abilities.dex.mod", -5);
                    break;
                case "noStr":
                    linkData(srcData1, updateData, "data.abilities.str.total", 0);
                    linkData(srcData1, updateData, "data.abilities.str.mod", -5);
                    break;
                case "noCon":
                    linkData(srcData1, updateData, "data.abilities.con.total", 0);
                    linkData(srcData1, updateData, "data.abilities.con.mod", -5);
                    break;
                case "noInt":
                    linkData(srcData1, updateData, "data.abilities.int.total", 0);
                    linkData(srcData1, updateData, "data.abilities.int.mod", -5);
                    break;
                case "oneInt":
                    linkData(srcData1, updateData, "data.abilities.int.total", 1);
                    linkData(srcData1, updateData, "data.abilities.int.mod", -5);
                    break;
                case "oneWis":
                    linkData(srcData1, updateData, "data.abilities.wis.total", 1);
                    linkData(srcData1, updateData, "data.abilities.wis.mod", -5);
                    break;
                case "oneCha":
                    linkData(srcData1, updateData, "data.abilities.cha.total", 1);
                    linkData(srcData1, updateData, "data.abilities.cha.mod", -5);
                    break;
            }
        }

        // Reduce final speed under certain circumstances
        let armorItems = srcData1.items.filter(o => o.type === "equipment");
        if ((updateData["data.attributes.encumbrance.level"] >= 1 && !flags.noEncumbrance) ||
            (armorItems.filter(o => getProperty(o.data, "equipmentSubtype") === "mediumArmor" && o.data.equipped && !o.data.melded).length && !flags.mediumArmorFullSpeed) ||
            (armorItems.filter(o => getProperty(o.data, "equipmentSubtype") === "heavyArmor" && o.data.equipped && !o.data.melded).length && !flags.heavyArmorFullSpeed)) {
            for (let speedKey of Object.keys(srcData1.data.attributes.speed)) {
                let value = updateData[`data.attributes.speed.${speedKey}.total`];
                linkData(srcData1, updateData, `data.attributes.speed.${speedKey}.total`, ActorPF.getReducedMovementSpeed(value));
            }
        }
        // Reset spell slots
        for (let spellbookKey of Object.keys(getProperty(srcData1, "data.attributes.spells.spellbooks"))) {
            const spellbookAbilityKey = getProperty(srcData1, `data.attributes.spells.spellbooks.${spellbookKey}.ability`);
            const spellslotAbilityKey = getProperty(srcData1, `data.attributes.spells.spellbooks.${spellbookKey}.spellslotAbility`) || spellbookAbilityKey
            let spellbookAbilityMod = getProperty(srcData1, `data.abilities.${spellbookAbilityKey}.mod`);
            let spellslotAbilityMod = getProperty(srcData1, `data.abilities.${spellslotAbilityKey}.mod`);
            const spellbookClass = getProperty(srcData1, `data.attributes.spells.spellbooks.${spellbookKey}.class`);
            const autoSetup = getProperty(srcData1, `data.attributes.spells.spellbooks.${spellbookKey}.autoSetup`);
            let classLevel = getProperty(srcData1, `data.classes.${spellbookClass}.level`) + parseInt(getProperty(srcData1, `data.attributes.spells.spellbooks.${spellbookKey}.bonusPrestigeCl`));
            if (classLevel > getProperty(srcData1, `data.classes.${spellbookClass}.maxLevel`))
                classLevel = getProperty(srcData1, `data.classes.${spellbookClass}.maxLevel`);
            const classProgression = getProperty(srcData1, `data.classes.${spellbookClass}.spellPerLevel${classLevel}`);
            let autoSpellLevels = getProperty(srcData1, `data.attributes.spells.spellbooks.${spellbookKey}.autoSpellLevels`);
            if (autoSetup) {
                const autoSpellcastingAbilityKey = getProperty(srcData1, `data.classes.${spellbookClass}.spellcastingAbility`)
                const autoSpellslotAbilityKey = getProperty(srcData1, `data.classes.${spellbookClass}.spellslotAbility`) || autoSpellcastingAbilityKey
                for (let property of [["spellcastingType", "spellcastingType"], ["ability", "spellcastingAbility"], ["spellslotAbility", "spellslotAbility"], ["spontaneous", "isSpellcastingSpontaneus"]])
                    linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.${property[0]}`, getProperty(srcData1, `data.classes.${spellbookClass}.${property[1]}`));
                linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.autoSpellLevels`, true);
                linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.usePowerPoints`, getProperty(srcData1, `data.classes.${spellbookClass}.isPsionSpellcaster`));
                linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.arcaneSpellFailure`, getProperty(srcData1, `data.classes.${spellbookClass}.isArcane`));
                linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.hasSpecialSlot`, getProperty(srcData1, `data.classes.${spellbookClass}.hasSpecialSlot`));

                autoSpellLevels = true;
                spellbookAbilityMod = getProperty(srcData1, `data.abilities.${autoSpellcastingAbilityKey}.mod`)
                spellslotAbilityMod = getProperty(srcData1, `data.abilities.${autoSpellslotAbilityKey}.mod`)
            }

            for (let a = 0; a < 10; a++) {
                const classBase = classProgression !== undefined ? parseInt(classProgression[a + 1]) : -1;
                let base = parseInt(getProperty(srcData1, `data.attributes.spells.spellbooks.${spellbookKey}.spells.spell${a}.base`));
                if (!autoSpellLevels) {
                    if (Number.isNaN(base)) {
                        linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.spells.spell${a}.base`, null);
                        linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.spells.spell${a}.max`, 0);
                    } else {
                        linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.spells.spell${a}.max`, base);
                    }
                } else {
                    if (classBase >= 0) {
                        const value = (typeof spellslotAbilityMod === "number") ? (classBase + ActorPF.getSpellSlotIncrease(spellslotAbilityMod, a)) : classBase;
                        linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.spells.spell${a}.max`, value);
                    } else {
                        linkData(srcData1, updateData, `data.attributes.spells.spellbooks.${spellbookKey}.spells.spell${a}.max`, 0);
                    }
                }

            }
        }
        // Add dex mod to AC
        if (updateData["data.abilities.dex.mod"] < 0 || !flags.loseDexToAC) {
            const maxDexBonus = updateData["data.attributes.maxDexBonus"] || (this.data.data.attributes.maxDexBonus || null);
            const dexBonus = maxDexBonus != null ? Math.min(maxDexBonus, updateData["data.abilities.dex.mod"]) : updateData["data.abilities.dex.mod"];
            linkData(srcData1, updateData, "data.attributes.ac.normal.total", updateData["data.attributes.ac.normal.total"] + dexBonus);
            linkData(srcData1, updateData, "data.attributes.ac.touch.total", updateData["data.attributes.ac.touch.total"] + dexBonus);
            if (updateData["data.abilities.dex.mod"] < 0) {
                linkData(srcData1, updateData, "data.attributes.ac.flatFooted.total", updateData["data.attributes.ac.flatFooted.total"] + dexBonus);
            }
            if (flags.uncannyDodge && !flags.loseDexToAC) {
                linkData(srcData1, updateData, "data.attributes.ac.flatFooted.total", updateData["data.attributes.ac.flatFooted.total"] + dexBonus);
            }
        }
        // Add current hit points

        if (fullConditions.wildshaped || fullConditions.polymorph) {
            linkData(srcData1, updateData, "data.attributes.hp.value", Math.min(prevValues.mhp, srcData1.data.attributes.hp.value));
        } else {
            if (updateData["data.attributes.hp.max"]) {
                const hpDiff = updateData["data.attributes.hp.max"] - prevValues.mhp;
                if (hpDiff !== 0) {
                    linkData(srcData1, updateData, "data.attributes.hp.value", Math.min(updateData["data.attributes.hp.max"], srcData1.data.attributes.hp.value + hpDiff));
                }
            }
        }
        if (updateData["data.attributes.wounds.max"]) {
            const wDiff = updateData["data.attributes.wounds.max"] - prevValues.wounds;
            if (wDiff !== 0) {
                linkData(srcData1, updateData, "data.attributes.wounds.value", Math.min(updateData["data.attributes.wounds.max"], srcData1.data.attributes.wounds.value + wDiff));
            }
        }
        if (updateData["data.attributes.vigor.max"]) {
            const vDiff = updateData["data.attributes.vigor.max"] - prevValues.vigor;
            if (vDiff !== 0) {
                linkData(srcData1, updateData, "data.attributes.vigor.value", Math.min(updateData["data.attributes.vigor.max"], srcData1.data.attributes.vigor.value + vDiff));
            }
        }
        if (srcData1 !== null) {
            if (srcData1.img !== this.data.data.tokenImg && this.data.data.tokenImg === "icons/svg/mystery-man.svg") {
                srcData1.tokenImg = srcData1.img;
                linkData(srcData1, updateData, "data.tokenImg", srcData1.img);
            }
        }

        let shapechangeImg = updateData["data.shapechangeImg"];
        let tokenImg = updateData["data.tokenImg"];

        if (data !== null && data.token !== undefined && data.token.img !== undefined) {
            tokenImg = data.token.img;
            linkData(srcData1, updateData, "data.tokenImg", tokenImg);
        }
        if (!options.skipToken && !this.data.data.noTokenOverride) {
            if (shapechangeImg !== "icons/svg/mystery-man.svg") {
                if (this.isToken) {
                    let tokens = []
                    tokens.push(this.token);
                    for (const o of tokens) {
                        if (shapechangeImg !== o.data.img)
                            o.update({'img': shapechangeImg}, {stopUpdates: true});
                    }
                }
                if (!this.isToken) {
                    let tokens = this.getActiveTokens().filter(o => o.data.actorLink);

                    for (const o of tokens) {
                        if (shapechangeImg !== o.data.img)
                            o.update({'img': shapechangeImg}, {stopUpdates: true});
                    }
                    if (srcData1 !== null)
                        srcData1["token.img"] = shapechangeImg;
                }
            } else {
                if (this.isToken) {
                    let tokens = []
                    tokens.push(this.token);
                    for (const o of tokens) {
                        if (tokenImg && tokenImg !== o.data.img)
                            o.update({'img': tokenImg}, {stopUpdates: true});
                    }
                }
                if (!this.isToken) {
                    let tokens = this.getActiveTokens().filter(o => o.data.actorLink);

                    for (const o of tokens) {
                        if (tokenImg && tokenImg !== o.data.img)
                            o.update({'img': tokenImg}, {stopUpdates: true});
                    }

                    if (srcData1 !== null) {
                        srcData1["token.img"] = tokenImg;
                    }
                }
            }
        }


        // Refresh source info
        for (let [bt, change] of Object.entries(changeData)) {
            for (let [ct, values] of Object.entries(change)) {
                let customBuffTargets = this._getChangeFlat(bt, ct, srcData1.data);
                if (!(customBuffTargets instanceof Array)) customBuffTargets = [customBuffTargets];

                // Replace certain targets
                // Replace ability penalties
                customBuffTargets = customBuffTargets.filter(t => {
                    return t != null;
                }).map(t => {
                    return t.replace(/^data\.abilities\.([a-zA-Z0-9]+)\.penalty$/, "data.abilities.$1.total");
                });

                // Add sources
                for (let ebt of Object.values(customBuffTargets)) {
                    sourceInfo[ebt] = sourceInfo[ebt] || { positive: [], negative: [] };
                    if (values.positive.value > 0) sourceInfo[ebt].positive.push(...values.positive.sources);
                    if (values.negative.value < 0) sourceInfo[ebt].negative.push(...values.negative.sources);
                }
            }
        }
        if (fullConditions.wildshaped || fullConditions.polymorph) //This retains max HP
            linkData(srcData1, updateData, "data.attributes.hp.max", prevValues.mhp);


        this._updateAbilityRelatedFields(srcData1, updateData, sourceInfo);


        this._setSourceDetails(mergeObject(this.data, srcData1, { inplace: false }), sourceInfo, flags);

        const diffData = diffObject(this.data, srcData1);
        // Apply changes
        if (this.collection != null && Object.keys(diffData).length > 0) {
            let newData = {};
            if (data != null) newData = flattenObject(mergeObject(data, flattenObject(diffData), { inplace: false }));
            return { data: newData, diff: diffData };
        }
        return { data: {}, diff: {} };
    }

    _updateAbilityRelatedFields(srcData1, updateData, sourceInfo) {

        {
            const k = "data.attributes.turnUndeadUsesTotal";
            let chaMod = getProperty(srcData1, `data.abilities.cha.mod`)
            //console.log(updateData)
            if (getProperty(srcData1, `data.attributes.turnUndeadHdTotal`) > 0) {
                linkData(srcData1, updateData, k, new Roll35e("3+@chaMod", { chaMod: chaMod }).roll().total + updateData[k]);

                sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                sourceInfo[k].positive.push({ name: "Base", value: 3 });
                sourceInfo[k].positive.push({ name: "Charisma", value: chaMod });
            } else
                linkData(srcData1, updateData, k, 0);
        }

        {

            const classes = srcData1.items.filter(o => o.type === "class" && getProperty(o.data, "classType") !== "racial").sort((a, b) => {
                return a.sort - b.sort;
            });
            const k = "data.attributes.powerPointsTotal";
            linkData(srcData1, updateData, k, updateData[k] + classes.reduce((cur, obj) => {
                try {
                    if (obj.data.powerPointTable === undefined || obj.data.powerPointTable[obj.data.levels] === undefined)
                        return cur
                    let ablMod = 0;
                    if (obj.data.powerPointBonusBaseAbility !== undefined && obj.data.powerPointBonusBaseAbility !== null && obj.data.powerPointBonusBaseAbility !== "")
                        ablMod = getProperty(srcData1, `data.abilities.${obj.data.powerPointBonusBaseAbility}.mod`) || 0;
                    const v = new Roll35e("ceil(0.5*@level*@ablMod)", {
                        level: obj.data.levels,
                        ablMod: ablMod
                    }).roll().total + obj.data.powerPointTable[obj.data.levels];

                    if (v !== 0) {
                        sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                        sourceInfo[k].positive.push({ name: getProperty(obj, "name"), value: v });
                    }

                    return cur + v;
                } catch (e) {

                    return cur;
                }
            }, 0));
        }
    }

    _applyChanges(buffTarget, changeData, rollData) {
        let consolidatedChanges = {};
        let changes = {};
        for (let change of changeData) {
            for (let b of Object.keys(change)) {
                changes[b] = { positive: 0, negative: 0 };
            }
            for (let [changeType, data] of Object.entries(change)) {
                // Add positive value
                if (data.positive.value !== 0) {
                    changes[changeType].positive += data.positive.value;
                }
                // Add negative value
                if (data.negative.value !== 0) {
                    changes[changeType].negative += data.negative.value;
                }
            }
        }

        for (let [changeTarget, value] of Object.entries(changes)) {
            if (value.positive !== 0 || value.negative !== 0) {
                let flatTargets = this._getChangeFlat(buffTarget, changeTarget, rollData.data);
                if (flatTargets == null) continue;

                if (!(flatTargets instanceof Array)) flatTargets = [flatTargets];
                for (let target of flatTargets) {
                    consolidatedChanges[target] = (consolidatedChanges[target] || 0) + value.positive + value.negative;

                    // Apply final rounding of health, if required.
                    if (["data.attributes.hp.max", "data.attributes.wounds.max", "data.attributes.vigor.max"].includes(target)) {
                        const healthConfig = game.settings.get("D35E", "healthConfig")
                        const continuous = { discrete: false, continuous: true }[healthConfig.continuity]
                        if (continuous) {
                            const round = { up: Math.ceil, nearest: Math.round, down: Math.floor }[healthConfig.rounding]
                            consolidatedChanges[target] = round(consolidatedChanges[target])
                        }
                    }
                }
            }
        }
        return consolidatedChanges;
    }

    async _resetData(updateData, data, flags, sourceInfo, changes, fullConditions) {
        const data1 = data.data;
        if (flags == null) flags = {};
        const items = data.items;
        const classes = items.filter(obj => {
            return obj.type === "class";
        });

        const racialHD = classes.filter(o => getProperty(o.data, "classType") === "racial");
        const templateHD = classes.filter(o => getProperty(o.data, "classType") === "template");
        const useFractionalBaseBonuses = game.settings.get("D35E", "useFractionalBaseBonuses") === true;



        // Reset HD, taking into account race LA
        let raceLA = 0;
        if (this.items != null) {
            try {
                let raceObject = this.items.filter(o => o.type === "race")[0];
                if (raceObject != null) {
                    raceLA = raceObject.data.data.la || 0
                    linkData(data, updateData, "data.attributes.creatureType", getProperty(raceObject.data.data, "creatureType") || "humanoid");

                }
                this.items.filter(o => o.type === "class").forEach(c => {
                    raceLA += c.data.data?.la || 0
                })
            } catch (e) {
            }
        }

        // Set creature type
        if (racialHD.length > 0) {
            linkData(data, updateData, "data.attributes.creatureType", getProperty(racialHD[0].data, "creatureType") || "humanoid");
        }
        // Set creature type
        if (templateHD.length > 0) {
            linkData(data, updateData, "data.attributes.creatureType", getProperty(templateHD[0].data, "creatureType") || "humanoid");
        }

        linkData(data, updateData, "data.attributes.hd.total", data1.details.level.value - raceLA);
        //linkData(data, updateData, "data.attributes.hd.racialClass", data1.details.level.value - raceLA);

        let cr = data1.details.cr || 0
        linkData(data, updateData, "data.details.totalCr", cr < 1 ? cr : Math.floor(cr));



        // Reset abilities
        for (let [a, abl] of Object.entries(data1.abilities)) {
            linkData(data, updateData, `data.abilities.${a}.penalty`, 0);
            if (a === "str" && flags.noStr === true) continue;
            if (a === "dex" && flags.noDex === true) continue;
            if (a === "con" && flags.noCon === true) continue;
            if (a === "int" && flags.noInt === true) continue;
            if (a === "int" && flags.oneInt === true) continue;
            if (a === "wis" && flags.oneWis === true) continue;
            if (a === "cha" && flags.oneCha === true) continue;
            linkData(data, updateData, `data.abilities.${a}.checkMod`, 0);
            linkData(data, updateData, `data.abilities.${a}.total`, abl.value - Math.abs(abl.drain));
            linkData(data, updateData, `data.abilities.${a}.mod`, Math.floor((updateData[`data.abilities.${a}.total`] - 10) / 2));
        }

        // Reset maximum hit points
        linkData(data, updateData, "data.attributes.hp.max", getProperty(data, "data.attributes.hp.base") || 0);
        linkData(data, updateData, "data.attributes.wounds.max", getProperty(data, "data.attributes.wounds.base") || 0);
        linkData(data, updateData, "data.attributes.vigor.max", getProperty(data, "data.attributes.vigor.base") || 0);

        // Reset AC
        for (let type of Object.keys(data1.attributes.ac)) {
            linkData(data, updateData, `data.attributes.ac.${type}.total`, 10);
        }

        // Reset attack and damage bonuses
        linkData(data, updateData, "data.attributes.attack.general", 0);
        linkData(data, updateData, "data.attributes.attack.melee", 0);
        linkData(data, updateData, "data.attributes.attack.ranged", 0);
        linkData(data, updateData, "data.attributes.damage.general", 0);
        linkData(data, updateData, "data.attributes.damage.weapon", 0);
        linkData(data, updateData, "data.attributes.damage.spell", 0);


        linkData(data, updateData, "data.attributes.naturalACTotal", 0);
        linkData(data, updateData, "data.attributes.turnUndeadUsesTotal", 0);
        linkData(data, updateData, "data.attributes.powerPointsTotal", 0);
        linkData(data, updateData, "data.attributes.arcaneSpellFailure", 0);
        linkData(data, updateData, "data.traits.regenTotal", data1.traits.regen);
        linkData(data, updateData, "data.traits.fastHealingTotal", data1.traits.fastHealing);

        let levelUpData = duplicate(data1.details.levelUpData) || []
        if (levelUpData.length !== data1.details.level.available) {

            console.log('D35E | ActorPF | Will update actor level')
            while (levelUpData.length < data1.details.level.available) {
                levelUpData.push({ 'level': levelUpData.length + 1, 'id': '_' + Math.random().toString(36).substr(2, 9), 'classId': null, 'class': null, 'classImage': null, 'skills': {}, 'hp': 0, hasFeat: (levelUpData.length + 1) % 3 === 0, hasAbility: (levelUpData.length + 1) % 4 === 0 })
            }
            while (levelUpData.length > data1.details.level.available) {
                levelUpData.pop();
            }
            await this.updateClassProgressionLevel(data, updateData, data1, levelUpData);
            console.log('D35E | LevelUpData | ', levelUpData)
            linkData(data, updateData, "data.details.levelUpData", levelUpData);
        }


        let currencyConfig = game.settings.get("D35E", "currencyConfig");
        for (let currency of currencyConfig.currency) {
            if (currency[0])
                if (data1.attributes.customCurrency === undefined || data1.attributes.customCurrency[currency[0]] === undefined) {
                    linkData(data, updateData, `data.attributes.customCurrency.${currency[0]}`, 0);
                }
        }


        if (data1.attributes.prestigeCl === undefined) {
            linkData(data, updateData, "data.attributes.prestigeCl", {
                "psionic": {
                    "max": 0,
                    "value": 0
                },
                "arcane": {
                    "max": 0,
                    "value": 0
                },
                "divine": {
                    "max": 0,
                    "value": 0
                }
            })
        } else {
            for (let type of ["psionic", "arcane", "divine"]) {
                // parseInt(getProperty(srcData1, `data.attributes.spells.spellbooks.${spellbookKey}.bonusPrestigeCl`))
                if (data1.attributes.prestigeCl[type] === undefined) {
                    linkData(data, updateData, `data.attributes.prestigeCl.${type}`, {
                        "max": 0,
                        "value": 0
                    });
                } else {
                    linkData(data, updateData, `data.attributes.prestigeCl.${type}.max`, 0);
                }
            }
        }


        // Reset saving throws
        for (let a of Object.keys(data1.attributes.savingThrows)) {
            {
                const k = `data.attributes.savingThrows.${a}.total`;
                const j = `data.attributes.savingThrows.${a}.base`;
                let totalLevel = 0;
                let epicLevels = 0;
                if (useFractionalBaseBonuses) {
                    let highStart = false;
                    linkData(data, updateData, k,
                        Math.floor(classes.reduce((cur, obj) => {
                            const saveScale = getProperty(obj, `data.savingThrows.${a}.value`) || "";
                            if (saveScale === "high") {
                                const acc = highStart ? 0 : 2;
                                highStart = true;
                                return cur + obj.data.levels / 2 + acc;
                            }
                            if (saveScale === "low") return cur + obj.data.levels / 3;
                            return cur;
                        }, 0)) - data1.attributes.energyDrain
                    );

                    const v = updateData[k];
                    if (v !== 0) {
                        sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                        sourceInfo[k].positive.push({ name: game.i18n.localize("D35E.Base"), value: updateData[k] });
                    }
                } else {
                    let epicST = 0;
                    let baseST = classes.reduce((cur, obj) => {
                        const classType = getProperty(obj.data, "classType") || "base";
                        let formula = CONFIG.D35E.classSavingThrowFormulas[classType][obj.data.savingThrows[a].value];
                        if (formula == null) formula = "0";
                        let classLevel = obj.data.levels;

                        // Epic level/total level should only be calculated when taking into account non-racial hd
                        if (getProperty(obj.data, "classType") === "base" || (obj.data, "classType") === "prestige") {
                            if (totalLevel + classLevel > 20) {
                                classLevel = 20 - totalLevel;
                                totalLevel = 20;
                                epicLevels += obj.data.levels - classLevel;
                            } else {
                                totalLevel = totalLevel + classLevel
                            }
                        }
                        const v = Math.floor(new Roll35e(formula, { level: classLevel }).roll().total);

                        if (v !== 0) {
                            sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                            sourceInfo[k].positive.push({ name: getProperty(obj, "name"), value: v });
                        }

                        return cur + v;
                    }, 0) - data1.attributes.energyDrain

                    if (epicLevels > 0) {
                        epicST = new Roll35e('floor(@level/2)', { level: epicLevels }).roll().total;
                        sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                        sourceInfo[k].positive.push({ name: 'Epic Levels', value: epicST });
                    }
                    linkData(data, updateData, k, baseST + epicST);
                    linkData(data, updateData, j, baseST + epicST);
                }
            }
        }

        // Reset ACP and Max Dex bonus
        linkData(data, updateData, "data.attributes.acp.gear", 0);
        linkData(data, updateData, "data.attributes.maxDexBonus", null);

        linkData(data, updateData, "data.attributes.fortification.total", (data1.attributes.fortification?.value || 0));
        linkData(data, updateData, "data.attributes.concealment.total", (data1.attributes.concealment?.value || 0));
        items.filter(obj => {
            return obj.type === "equipment" && obj.data.equipped && !obj.data.melded;
        }).forEach(obj => {
            let itemAcp = Math.abs(obj.data.armor.acp);
            if (obj.data.masterwork)
                itemAcp = Math.max(0, itemAcp - 1)
            linkData(data, updateData, "data.attributes.acp.gear", updateData["data.attributes.acp.gear"] + itemAcp);
            let test = getProperty(obj.data,'armor.dex');
            if (getProperty(obj.data,'armor.dex') !== null && getProperty(obj.data,'armor.dex') !== "") {
                if (updateData["data.attributes.maxDexBonus"] == null) linkData(data, updateData, "data.attributes.maxDexBonus", Math.abs(obj.data.armor.dex));
                else {
                    linkData(data, updateData, "data.attributes.maxDexBonus", Math.min(updateData["data.attributes.maxDexBonus"], Math.abs(obj.data.armor.dex)));
                }
            }
        });


        // Reset specific skill bonuses
        for (let sklKey of this._getChangeFlat("skills", "", this.data.data)) {
            if (hasProperty(data, sklKey)) linkData(data, updateData, sklKey, 0);
        }

        // Reset movement speed
        for (let speedKey of Object.keys(this.data.data.attributes.speed)) {
            let base = getProperty(data, `data.attributes.speed.${speedKey}.base`);
            linkData(data, updateData, `data.attributes.speed.${speedKey}.total`, base || 0);
        }

        // Reset BAB, CMB and CMD
        {
            const k = "data.attributes.bab.total";
            const j = "data.attributes.bab.base";
            let totalLevel = 0;
            let epicLevels = 0;
            if (useFractionalBaseBonuses) {
                linkData(data, updateData, k, Math.floor(classes.reduce((cur, obj) => {
                    const babScale = getProperty(obj, "data.bab") || "";
                    if (babScale === "high") return cur + obj.data.levels;
                    if (babScale === "med") return cur + obj.data.levels * 0.75;
                    if (babScale === "low") return cur + obj.data.levels * 0.5;
                    return cur;
                }, 0)));

                const v = updateData[k];
                if (v !== 0) {
                    sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                    sourceInfo[k].positive.push({ name: game.i18n.localize("D35E.Base"), value: v });
                }
            } else {
                let epicBab = 0
                let bab = classes.reduce((cur, obj) => {
                    const formula = CONFIG.D35E.classBABFormulas[obj.data.bab] != null ? CONFIG.D35E.classBABFormulas[obj.data.bab] : "0";
                    let classLevel = obj.data.levels;

                    // Epic level/total level should only be calculated when taking into account non-racial hd
                    if (getProperty(obj.data, "classType") === "base" || (obj.data, "classType") === "prestige") {
                        if (totalLevel + classLevel > 20) {
                            classLevel = 20 - totalLevel;
                            totalLevel = 20;
                            epicLevels += obj.data.levels - classLevel;
                        } else {
                            totalLevel = totalLevel + classLevel
                        }
                    }
                    const v = new Roll35e(formula, { level: classLevel }).roll().total;

                    if (v !== 0) {
                        sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                        sourceInfo[k].positive.push({ name: getProperty(obj, "name"), value: v });
                    }

                    return cur + v;
                }, 0)
                if (epicLevels > 0) {
                    epicBab = new Roll35e('ceil(@level/2)', { level: epicLevels }).roll().total;
                    sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                    sourceInfo[k].positive.push({ name: 'Epic Levels', value: epicBab });
                }
                linkData(data, updateData, k, bab + epicBab);
                linkData(data, updateData, j, bab + epicBab);
            }
        }

        // Turn undead total level
        {
            const k = "data.attributes.turnUndeadHdTotal";
            linkData(data, updateData, k, classes.reduce((cur, obj) => {
                try {
                    const v = new Roll35e(obj.data.turnUndeadLevelFormula, { level: obj.data.levels }).roll().total;

                    if (v !== 0) {
                        sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                        sourceInfo[k].positive.push({ name: getProperty(obj, "name"), value: v });
                    }

                    return cur + v;
                } catch (e) {
                    return cur;
                }
            }, 0));
        }

        {
            const k = "data.attributes.sr.total";
            // Set spell resistance
            if (getProperty(data, `data.attributes.sr.formula`).length > 0) {
                let roll = new Roll35e(getProperty(data, `data.attributes.sr.formula`), data.data).roll();
                linkData(data, updateData, k, roll.total);
            } else {

                linkData(data, updateData, k, 0);
            }
        }


        // Total sneak attak dice
        {
            const k = "data.attributes.sneakAttackDiceTotal";
            let totalSneakAttakDice = 0
            let groupLevels = new Map()
            let groupFormulas = new Map()
            classes.forEach(obj => {
                try {
                    if (obj.data.sneakAttackGroup == null || obj.data.sneakAttackGroup === "")
                        return;
                    if (!groupLevels.has(obj.data.sneakAttackGroup)) {
                        groupLevels.set(obj.data.sneakAttackGroup, 0)
                    }
                    if (!groupFormulas.has(obj.data.sneakAttackGroup)) {
                        groupFormulas.set(obj.data.sneakAttackGroup, obj.data.sneakAttackFormula)
                    }
                    groupLevels.set(obj.data.sneakAttackGroup, groupLevels.get(obj.data.sneakAttackGroup) + obj.data.levels)
                } catch (e) {
                }
            })
            for (var key of groupLevels.keys()) {
                const v = new Roll35e(groupFormulas.get(key), { level: groupLevels.get(key) }).roll().total;

                if (v !== 0) {
                    sourceInfo[k] = sourceInfo[k] || { positive: [], negative: [] };
                    sourceInfo[k].positive.push({ name: key, value: v });
                }
                totalSneakAttakDice = totalSneakAttakDice + v
            }
            linkData(data, updateData, k, totalSneakAttakDice);

        }

        // Total sneak attak dice
        {
            const k = "data.attributes.minionClassLevels";
            let groupLevels = new Map()
            let groupFormulas = new Map()
            let minionLevels = {}

            for (var key of Object.keys(data.data.attributes.minionClassLevels || {})) {
                minionLevels[key.toLowerCase()] = 0
            }
            classes.forEach(obj => {
                try {
                    if (obj.data.minionGroup == null || obj.data.minionGroup === "")
                        return;
                    if (!groupLevels.has(obj.data.minionGroup)) {
                        groupLevels.set(obj.data.minionGroup, 0)
                    }
                    if (!groupFormulas.has(obj.data.minionGroup)) {
                        groupFormulas.set(obj.data.minionGroup, obj.data.minionLevelFormula)
                    }
                    groupLevels.set(obj.data.minionGroup, groupLevels.get(obj.data.minionGroup) + obj.data.levels)
                } catch (e) {
                }
            })
            for (var key of groupLevels.keys()) {
                const v = new Roll35e(groupFormulas.get(key), {level: groupLevels.get(key)}).roll().total;
                minionLevels[key.toLowerCase()] = v
            }
            linkData(data, updateData, k, minionLevels);

        }

        linkData(data, updateData, "data.attributes.cmb.total", updateData["data.attributes.bab.total"] - data1.attributes.energyDrain);
        linkData(data, updateData, "data.attributes.cmd.total", 10 + updateData["data.attributes.bab.total"] - data1.attributes.energyDrain);
        linkData(data, updateData, "data.attributes.cmd.flatFootedTotal", 10 + updateData["data.attributes.bab.total"] - data1.attributes.energyDrain);

        // Reset initiative
        linkData(data, updateData, "data.attributes.init.total", 0);

        // Reset class skills
        for (let [k, s] of Object.entries(getProperty(data, "data.skills"))) {
            if (!s) continue;
            const isClassSkill = classes.reduce((cur, o) => {
                if ((getProperty(o, "data.classSkills") || {})[k] === true) return true;
                return cur;
            }, false);
            linkData(data, updateData, `data.skills.${k}.cs`, isClassSkill);
            for (let k2 of Object.keys(getProperty(s, "subSkills") || {})) {
                linkData(data, updateData, `data.skills.${k}.subSkills.${k2}.cs`, isClassSkill);
            }
        }
        {
            let level = classes.reduce((cur, o) => {
                if (o.data.classType === "minion" || o.data.classType === "template") return cur;
                return cur + o.data.levels;
            }, 0);

            console.log(`D35E | Setting attributes hd total | ${level}`)
            linkData(data, updateData, "data.attributes.hd.total", level);

            linkData(data, updateData, "data.attributes.hd.racialClass", level);

            let templateClassesToUpdate = []
            for (const templateClass of classes.filter(o => getProperty(o.data, "classType") === "template")) {
                if (!!templateClass) {
                    if (templateClass.data.levels === level) return
                    let updateObject = {}
                    updateObject["_id"] = templateClass.id || templateClass._id;
                    updateObject["data.levels"] = level;
                    templateClassesToUpdate.push(updateObject)
                }
            }
            if (templateClassesToUpdate.length && !this.token) {
                await this.updateOwnedItem(templateClassesToUpdate, {stopUpdates: true})
            }

            level += raceLA;
            let existingAbilities = new Set()
            let classNames = new Set()
            let addedAbilities = new Set()
            let itemsWithUid = new Map()
            let itemsToAdd = []
            let itemsToRemove = []
            for (let i of this.items.values()) {
                if (!i.data.data.hasOwnProperty("uniqueId")) continue;
                if (i.data.data.uniqueId === null) continue;
                if (i.data.data.uniqueId === "") continue;
                existingAbilities.add(i.data.data.uniqueId)
                itemsWithUid.set(i.data.data.uniqueId, i._id)
            }

            if (getProperty(data, "data.classLevels") !== this.data.classLevels) {
                linkData(data, updateData, "data.details.level.value", level);
                let classes = this.items.filter(o => o.type === "class" && getProperty(o.data, "classType") !== "racial" && o.data.data.automaticFeatures).sort((a, b) => {
                    return a.sort - b.sort;
                });

                for (let i of classes) {
                    classNames.add([i.name, i.data.data.levels,i.data.data.addedAbilities || [],i.data.data.disabledAbilities || []])
                }

                let itemPack = game.packs.get("D35E.class-abilities");
                let items = []
                await itemPack.getIndex().then(index => items = index);

                for (const classInfo of classNames) {
                    let added = false;
                    for (let feature of classInfo[2]) {
                        let e = CACHE.AllAbilities.get(feature.uid)
                        const level = parseInt(feature.level)
                        let uniqueId = e?.data?.data?.uniqueId;
                        if (!uniqueId) {
                            ui.notifications.warn(game.i18n.localize("D35E.NotAddingAbilityWithNoUID").replace("{0}",feature.uid));
                            continue;
                        }
                        if (uniqueId.endsWith("*")) {
                            uniqueId = uniqueId.replace("*", `${classInfo[0]}-${level}`)
                        }
                        this.addClassFeatureToActorIfPossible(addedAbilities, uniqueId, level, classInfo, existingAbilities, e, fullConditions, changes, itemsToAdd, added);
                    }
                    for (let e of CACHE.ClassFeatures.get(classInfo[0]) || []) {
                        if (e.data.data.associations === undefined || e.data.data.associations.classes === undefined) continue;
                        let levels = e.data.data.associations.classes.filter(el => el[0] === classInfo[0])
                        for (let _level of levels) {
                            const level = _level[1]
                            let uniqueId = e.data.data.uniqueId;
                            if (uniqueId.endsWith("*")) {
                                uniqueId = uniqueId.replace("*", `${classInfo[0]}-${level}`)
                            }
                            if ((classInfo[3] || []).some(a => a.uid === uniqueId && parseInt(level) === parseInt(a.level))) continue;
                            this.addClassFeatureToActorIfPossible(addedAbilities, uniqueId, level, classInfo, existingAbilities, e, fullConditions, changes, itemsToAdd, added);
                        }
                    }
                }


            }
            {
                // Racial items
                let raceObject = this.items.filter(o => o.type === "race")[0];
                if (raceObject) {
                    for (let feature of raceObject.data.data.addedAbilities || []) {
                        let e = CACHE.AllAbilities.get(feature.uid)
                        let uniqueId = e.data.data.uniqueId;
                        if (!uniqueId || uniqueId === "") {
                            ui.notifications.warn(game.i18n.localize("D35E.NotAddingAbilityWithNoUID").format(e.data.name));
                            continue;
                        }
                        if (uniqueId.endsWith("*")) {
                            ui.notifications.warn(game.i18n.localize("D35E.NotAddingAbilityWithStarUIDRace").format(e.data.name));
                            continue;
                        }
                        let canAdd = !addedAbilities.has(uniqueId)
                        if (canAdd) {
                            if (!existingAbilities.has(uniqueId)) {
                                let eItem = duplicate(e.data)
                                ItemPF.setMaxUses(eItem, this.getRollData());
                                eItem.data.uniqueId = uniqueId;
                                eItem.data.source = `${raceObject.data.name}`
                                eItem.data.userNonRemovable = true;
                                if (e.type === "spell") {
                                    eItem.data.spellbook = "spelllike"
                                    eItem.data.level = 0;
                                }
                                (eItem.data.changes || []).forEach(change => {
                                    if (!this.isChangeAllowed(eItem, change, fullConditions)) return;
                                    changes.push({
                                        raw: change,
                                        source: {
                                            value: 0,
                                            type: eItem.type,
                                            subtype: this.constructor._getChangeItemSubtype(eItem),
                                            name: eItem.name,
                                            item: eItem,
                                            itemRollData: new ItemPF(eItem, { owner: this.owner }).getRollData()
                                        }
                                    });
                                });
                                itemsToAdd.push(eItem)
                            }
                            addedAbilities.add(uniqueId)
                        }
                    }

                    for (let e of CACHE.RacialFeatures.get(raceObject.data.name) || []) {
                        let uniqueId = e.data.data.uniqueId;
                        if (uniqueId.endsWith("*")) {
                            uniqueId = uniqueId.replace("*", `${classInfo[0]}-${level}`)
                        }

                        if (!uniqueId || uniqueId === "") {
                            ui.notifications.warn(game.i18n.localize("D35E.NotAddingAbilityWithNoUID").format(e.data.name));
                            continue;
                        }
                        if ((raceObject.data.data.disabledAbilities || []).some(a => a.uid === uniqueId)) continue;
                        let canAdd = !addedAbilities.has(uniqueId)
                        if (canAdd) {
                            if (!existingAbilities.has(uniqueId)) {
                                let eItem = duplicate(e.data)
                                ItemPF.setMaxUses(eItem, this.getRollData());
                                eItem.data.uniqueId = uniqueId;
                                eItem.data.source = `${raceObject.data.name}`
                                eItem.data.userNonRemovable = true;
                                if (e.type === "spell") {
                                    eItem.data.spellbook = "spelllike"
                                    eItem.data.level = 0;
                                }
                                (eItem.data.changes || []).forEach(change => {
                                    if (!this.isChangeAllowed(eItem, change, fullConditions)) return;
                                    changes.push({
                                        raw: change,
                                        source: {
                                            value: 0,
                                            type: eItem.type,
                                            subtype: this.constructor._getChangeItemSubtype(eItem),
                                            name: eItem.name,
                                            item: eItem,
                                            itemRollData: new ItemPF(eItem, { owner: this.owner }).getRollData()
                                        }
                                    });
                                });
                                itemsToAdd.push(eItem)
                            }
                            addedAbilities.add(uniqueId)
                        }
                    }
                }
            }

            for (let abilityUid of existingAbilities) {
                if (!addedAbilities.has(abilityUid)) {
                    console.log(`D35E | Removing existing ability ${abilityUid}`, changes)
                    changes.splice(changes.findIndex(change => change.source.item.data.uniqueId === abilityUid), 1)
                    itemsToRemove.push(abilityUid)
                }
            }
            let idsToRemove = []
            for (let entry of itemsToRemove) {
                idsToRemove.push(itemsWithUid.get(entry))
            }
            if (idsToRemove.length)
                await this.deleteEmbeddedEntity("Item", idsToRemove, {stopUpdates: true});
            if (itemsToAdd.length)
                await this.createEmbeddedEntity("Item", itemsToAdd, {stopUpdates: true, ignoreSpellbookAndLevel: true});

        }

    }

    addClassFeatureToActorIfPossible(addedAbilities, uniqueId, level, classInfo, existingAbilities, e, fullConditions, changes, itemsToAdd, added) {
        let canAdd = !addedAbilities.has(uniqueId)
        if (canAdd) {
            if (level <= classInfo[1]) {
                if (!existingAbilities.has(uniqueId)) {
                    let eItem = duplicate(e.data)
                    ItemPF.setMaxUses(eItem, this.getRollData());
                    eItem.data.uniqueId = uniqueId;
                    eItem.data.source = `${classInfo[0]} ${level}`
                    eItem.data.userNonRemovable = true;
                    if (e.type === "spell") {
                        eItem.data.spellbook = "spelllike"
                        eItem.data.level = 0;
                    }
                    (eItem.data.changes || []).forEach(change => {
                        if (!this.isChangeAllowed(eItem, change, fullConditions)) return;
                        changes.push({
                            raw: change,
                            source: {
                                value: 0,
                                type: eItem.type,
                                subtype: this.constructor._getChangeItemSubtype(eItem),
                                name: eItem.name,
                                item: eItem
                            }
                        });
                    });
                    itemsToAdd.push(eItem)
                }
                addedAbilities.add(uniqueId)
                added = true;
            }
        }
    }

    _addDynamicData(updateData, changes, flags, abilities, data, forceModUpdate = false, changeTarget = null) {
        if (changes == null) changes = {};

        const prevMods = {};
        const modDiffs = {};
        // Reset ability modifiers
        for (let a of abilities) {
            prevMods[a] = forceModUpdate ? 0 : updateData[`data.abilities.${a}.mod`];
            if ((a === "str" && flags.noStr) ||
                (a === "dex" && flags.noDex) ||
                (a === "con" && flags.noCon) ||
                (a === "int" && flags.noInt) ||
                (a === "int" && flags.oneInt) ||
                (a === "wis" && flags.oneWis) ||
                (a === "cha" && flags.oneCha)) {
                modDiffs[a] = forceModUpdate ? -5 : 0;
                if (changes[`data.abilities.${a}.total`]) delete changes[`data.abilities.${a}.total`]; // Remove used mods to prevent doubling
                continue;
            }
            const ablPenalty = Math.abs(updateData[`data.abilities.${a}.penalty`] || 0) + (updateData[`data.abilities.${a}.userPenalty`] || 0);
            if (changes[`data.abilities.${a}.replace`]) {
                linkData(data, updateData, `data.abilities.${a}.total`, changes[`data.abilities.${a}.replace`] + (changes[`data.abilities.${a}.total`] || 0));
                linkData(data, updateData, `data.abilities.${a}.origTotal`, updateData[`data.abilities.${a}.total`] + (changes[`data.abilities.${a}.total`] || 0));
            } else {
                linkData(data, updateData, `data.abilities.${a}.total`, updateData[`data.abilities.${a}.total`] + (changes[`data.abilities.${a}.total`] || 0));
                linkData(data, updateData, `data.abilities.${a}.origTotal`, updateData[`data.abilities.${a}.total`]);
            }
            if (changes[`data.abilities.${a}.total`]) delete changes[`data.abilities.${a}.total`]; // Remove used mods to prevent doubling
            if (changes[`data.abilities.${a}.replace`]) delete changes[`data.abilities.${a}.replace`]; // Remove used mods to prevent doubling
            linkData(data, updateData, `data.abilities.${a}.mod`, Math.floor((updateData[`data.abilities.${a}.total`] - updateData[`data.abilities.${a}.damage`] - ablPenalty - 10) / 2));
            linkData(data, updateData, `data.abilities.${a}.mod`, Math.max(-5, updateData[`data.abilities.${a}.mod`]));
            linkData(data, updateData, `data.abilities.${a}.origMod`, Math.floor((updateData[`data.abilities.${a}.origTotal`] - updateData[`data.abilities.${a}.damage`] - ablPenalty - 10) / 2));
            linkData(data, updateData, `data.abilities.${a}.origMod`, Math.max(-5, updateData[`data.abilities.${a}.origMod`]));
            linkData(data, updateData, `data.abilities.${a}.drain`, updateData[`data.abilities.${a}.drain`] + (changes[`data.abilities.${a}.drain`] || 0));
            modDiffs[a] = updateData[`data.abilities.${a}.mod`] - prevMods[a];
        }


        // Update encumbrance
        if (this._changeAffects("encumbrance", changeTarget) || forceModUpdate)
            this._computeEncumbrance(updateData, data);

        switch (data.data.attributes.encumbrance.level) {
            case 0:
                linkData(data, updateData, "data.attributes.acp.encumbrance", 0);
                break;
            case 1:
                linkData(data, updateData, "data.attributes.acp.encumbrance", 3);
                linkData(data, updateData, "data.attributes.maxDexBonus", Math.min(updateData["data.attributes.maxDexBonus"] || Number.POSITIVE_INFINITY, 3));
                break;
            case 2:
                linkData(data, updateData, "data.attributes.acp.encumbrance", 6);
                linkData(data, updateData, "data.attributes.maxDexBonus", Math.min(updateData["data.attributes.maxDexBonus"] || Number.POSITIVE_INFINITY, 1));
                break;
        }
        linkData(data, updateData, "data.attributes.acp.total", Math.max(updateData["data.attributes.acp.gear"], updateData["data.attributes.acp.encumbrance"]));


        // Force speed to creature speed
        for (let speedKey of Object.keys(this.data.data.attributes.speed)) {
            if (changes[`data.attributes.speed.${speedKey}.replace`])
                linkData(data, updateData, `data.attributes.speed.${speedKey}.total`, changes[`data.attributes.speed.${speedKey}.replace`]);
        }

        // Add ability mods to CMB and CMD
        const cmbMod = Object.keys(CONFIG.D35E.actorSizes).indexOf(getProperty(data, "data.traits.size") || "") <= Object.keys(CONFIG.D35E.actorSizes).indexOf("tiny") ? modDiffs["dex"] : modDiffs["str"];
        linkData(data, updateData, "data.attributes.cmb.total", updateData["data.attributes.cmb.total"] + cmbMod);
        linkData(data, updateData, "data.attributes.cmd.total", updateData["data.attributes.cmd.total"] + modDiffs["str"]);
        if (!flags.loseDexToAC || modDiffs["dex"] < 0) {
            linkData(data, updateData, "data.attributes.cmd.total", updateData["data.attributes.cmd.total"] + modDiffs["dex"]);
            linkData(data, updateData, "data.attributes.cmd.flatFootedTotal", updateData["data.attributes.cmd.flatFootedTotal"] + Math.min(0, modDiffs["dex"]));
        }
        linkData(data, updateData, "data.attributes.cmd.flatFootedTotal", updateData["data.attributes.cmd.flatFootedTotal"] + modDiffs["str"]);

        // Add dex mod to initiative
        linkData(data, updateData, "data.attributes.init.total", updateData["data.attributes.init.total"] + modDiffs["dex"]);

        // Add ability mods to saving throws
        for (let [s, a] of Object.entries(CONFIG.D35E.savingThrowMods)) {
            linkData(data, updateData, `data.attributes.savingThrows.${s}.total`, updateData[`data.attributes.savingThrows.${s}.total`] + modDiffs[a]);
        }
        // Apply changes
        for (let [changeTarget, value] of Object.entries(changes)) {
            linkData(data, updateData, changeTarget, (updateData[changeTarget] || 0) + value);
        }


        if (changes[`data.attributes.hp.replace`])
            linkData(data, updateData, `data.attributes.hp.max`, changes[`data.attributes.hp.replace`]);


        this._updateSkills(updateData, data);
    }

    _changeAffects(field, changeTarget) {
        switch (field) {
            case "encumbrance":
                if (changeTarget === "str") return true;
        }
        return false;
    }

    _updateSkills(updateData, data) {
        const data1 = data.data;
        let energyDrainPenalty = Math.abs(data1.attributes.energyDrain);
        for (let [sklKey, skl] of Object.entries(data1.skills)) {
            if (skl == null) continue;

            let acpPenalty = (skl.acp ? Math.max(updateData["data.attributes.acp.gear"], updateData["data.attributes.acp.encumbrance"]) : 0);
            if (sklKey === "swm")
                acpPenalty = acpPenalty * 2;
            let ablMod = 0;
            if (skl.ability !== "")
                ablMod = data1.abilities[skl.ability].mod;
            let specificSkillBonus = skl.changeBonus || 0;

            // Parse main skills
            let cs = skl.cs;
            if (data1.details.levelUpData && data1.details.levelUpProgression)
                cs = true;
            let sklValue = (Math.floor((cs && skl.rank > 0 ? skl.rank : (skl.rank / 2)) + ablMod + specificSkillBonus - acpPenalty - energyDrainPenalty));
            linkData(data, updateData, `data.skills.${sklKey}.mod`, sklValue);
            // Parse sub-skills
            for (let [subSklKey, subSkl] of Object.entries(skl.subSkills || {})) {
                if (subSkl == null) continue;
                if (getProperty(data1, `skills.${sklKey}.subSkills.${subSklKey}`) == null) continue;

                let scs = subSkl.cs;
                if (data1.details.levelUpData && data1.details.levelUpProgression)
                    scs = true;

                acpPenalty = (subSkl.acp ? data1.attributes.acp.total : 0);
                ablMod = 0
                if (subSkl.ability !== "")
                    ablMod = data1.abilities[subSkl.ability].mod;
                specificSkillBonus = subSkl.changeBonus || 0;
                sklValue = subSkl.rank + (scs && subSkl.rank > 0 ? skl.rank : (skl.rank / 2)) + ablMod + specificSkillBonus - acpPenalty - energyDrainPenalty;
                linkData(data, updateData, `data.skills.${sklKey}.subSkills.${subSklKey}.mod`, sklValue);
            }
        }
    }

    /**
     * Augment the basic actor data with additional dynamic data.
     */
    prepareData() {
        super.prepareData();

        const actorData = this.data;
        const data = actorData.data;

        // Prepare Character data
        if (actorData.type === "character") this._prepareCharacterData(actorData);
        else if (actorData.type === "npc") this._prepareNPCData(data);


        // Create arbitrary skill slots
        for (let skillId of CONFIG.D35E.arbitrarySkills) {
            if (data.skills[skillId] == null) continue;
            let skill = data.skills[skillId];
            skill.subSkills = skill.subSkills || {};
            skill.namedSubSkills = {}
            for (let subSkillId of Object.keys(skill.subSkills)) {
                if (skill.subSkills[subSkillId] == null) {
                    delete skill.subSkills[subSkillId];
                }
                else {
                    skill.namedSubSkills[createTag(skill.subSkills[subSkillId].name)] = skill.subSkills[subSkillId];
                }
            }
        }


        // Delete removed skills
        for (let skillId of Object.keys(data.skills)) {
            let skl = data.skills[skillId];
            if (skl == null) {
                delete data.skills[skillId];
            }
        }

        //
        data.counters = {};

        // Set class tags
        let totalNonRacialLevels = 0;
        data.classes = {};
        data.totalNonEclLevels = 0;
        data.damage = { nonlethal : {value: data.attributes.hp.nonlethal || 0, max: data.attributes.hp.max || 0}}
        actorData.items.filter(obj => {
            return obj.type === "class";
        }).forEach(cls => {
            let tag = createTag(cls.data.customTag || cls.name);
            let nameTag = createTag(cls.name);
            let count = 1;
            while (actorData.items.filter(obj => {
                return obj.type === "class" && obj.data.tag === tag && obj !== cls;
            }).length > 0) {
                count++;
                tag = createTag(cls.data.customTag || cls.name) + count.toString();
                nameTag = createTag(cls.name);
            }
            cls.data.tag = tag;
            data.totalNonEclLevels += cls.data.levels
            let healthConfig = game.settings.get("D35E", "healthConfig");
            healthConfig = cls.data.classType === "racial" ? healthConfig.hitdice.Racial : this.hasPlayerOwner ? healthConfig.hitdice.PC : healthConfig.hitdice.NPC;
            const classType = cls.data.classType || "base";
            data.classes[tag] = {
                level: cls.data.levels,
                _id: cls._id,
                name: cls.name,
                hd: cls.data.hd,
                bab: cls.data.bab,
                hp: healthConfig.auto,
                maxLevel: cls.data.maxLevel,
                skillsPerLevel: cls.data.skillsPerLevel,
                isSpellcaster: cls.data.spellcastingType !== null && cls.data.spellcastingType !== "none",
                isPsionSpellcaster: cls.data.spellcastingType !== null && cls.data.spellcastingType === "psionic",
                hasSpecialSlot: cls.data.hasSpecialSlot,
                isSpellcastingSpontaneus: cls.data.spellcastingSpontaneus === true,
                isArcane: cls.data.spellcastingType !== null && cls.data.spellcastingType === "arcane",
                spellcastingType: cls.data.spellcastingType,
                spellcastingAbility: cls.data.spellcastingAbility,
                spellslotAbility: cls.data.spellslotAbility,
                allSpellsKnown: cls.data.allSpellsKnown,

                savingThrows: {
                    fort: 0,
                    ref: 0,
                    will: 0,
                },
                fc: {
                    hp: classType === "base" ? cls.data.fc.hp.value : 0,
                    skill: classType === "base" ? cls.data.fc.skill.value : 0,
                    alt: classType === "base" ? cls.data.fc.alt.value : 0,
                },
            };
            data.classes[nameTag] = data.classes[tag];
            data.classes[tag].spellsKnownPerLevel = []
            data.classes[tag].powersKnown = []
            data.classes[tag].powersMaxLevel = []
            for (let _level = 1; _level < cls.data.maxLevel + 1; _level++) {
                data.classes[tag][`spellPerLevel${_level}`] = cls.data.spellcastingType !== null && cls.data.spellcastingType !== "none" ? cls.data.spellsPerLevel[_level - 1] : undefined
                if (cls.data.spellcastingType !== null && cls.data.spellcastingType !== "none") data.classes[tag].spellsKnownPerLevel.push(cls.data.spellsKnownPerLevel[_level - 1])
                if (cls.data.spellcastingType !== null && cls.data.spellcastingType !== "none") data.classes[tag].powersKnown.push(cls.data.powersKnown[_level - 1])
                if (cls.data.spellcastingType !== null && cls.data.spellcastingType !== "none") data.classes[tag].powersMaxLevel.push(cls.data.powersMaxLevel[_level - 1])
            }
            for (let k of Object.keys(data.classes[tag].savingThrows)) {
                let formula = CONFIG.D35E.classSavingThrowFormulas[classType][cls.data.savingThrows[k].value];
                if (formula == null) formula = "0";
                data.classes[tag].savingThrows[k] = new Roll35e(formula, { level: cls.data.levels }).roll().total;
            }
            if (cls.data.classType !== "racial")
                totalNonRacialLevels = Math.min(totalNonRacialLevels + cls.data.levels, 20)
        });
        data.classLevels = totalNonRacialLevels;
        {
            let group = "feat"
            let name = "base"
            if (data.counters[group] === undefined) {
                data.counters[group] = {}
            }
            if (data.counters[group][name] === undefined) {
                data.counters[group][name] = { value: 0, counted: 0 }
            }
            data.counters[group][name].value = Math.floor(data.totalNonEclLevels / 3.0) + 1;

        }

        data.combinedResistances = data.energyResistance ? duplicate(data.energyResistance) : [];
        data.combinedDR = data.damageReduction ? duplicate(data.damageReduction) : [];
        let erDrRollData = this.getRollData();

        data.shieldType = "none";
        this.items.filter(obj => {
            if (obj.type === "buff") return obj.data.data.active;
            if (obj.type === "equipment" || obj.type === "weapon") return (obj.data.data.equipped && !obj.data.data.melded);
            return true;
        }).forEach(_obj => {
            let obj = _obj.data;
            if (obj.data.resistances) {
                (obj.data?.resistances || []).forEach(resistance => {
                    if (!resistance[1]) return;
                    let _resistance = data.combinedResistances.find(res => res.uid === resistance[1])
                    if (!_resistance) {
                        _resistance = DamageTypes.defaultER;
                        _resistance.uid = resistance[1]
                        data.combinedResistances.push(_resistance)
                    }
                    // Fix up existing objects so they work
                    erDrRollData.level = _obj.data.levels || 0
                    erDrRollData.levels= _obj.data.levels || 0

                    _resistance.value = Math.max(_resistance.value, new Roll(resistance[0] || "0", erDrRollData).roll().total)
                    _resistance.immunity = _resistance.immunity || resistance[2];
                    _resistance.vulnerable = _resistance.vulnerable || resistance[3];
                    _resistance.half = _resistance.half || resistance[4];
                })
            }
            if (obj.data.damageReduction) {
                (obj.data?.damageReduction || []).forEach(dr => {
                    if (!dr[1] || !dr[0]) return;
                    if (dr[1] !== 'any') {
                        if (!data.combinedDR.types) {
                            data.combinedDR.types = []
                        }
                        let _dr = data.combinedDR.types.find(res => res.uid === dr[1])
                        if (!_dr) {
                            _dr = DamageTypes.defaultDR;
                            _dr.uid = dr[1];
                            data.combinedDR.types.push(_dr)
                        }
                        erDrRollData.level = obj.data.levels || 0
                        erDrRollData.levels= obj.data.levels || 0
                        _dr.value = Math.max(_dr.value, new Roll(dr[0] || "0", erDrRollData).roll().total)
                        _dr.immunity = _dr.immunity || dr[2];
                    } else {
                        data.combinedDR.any = Math.max(data.combinedDR.any || 0,new Roll35e(dr[0] || "0", _obj.getRollData()).roll().total)
                    }
                })
            }
            if (obj.type === "weapon" || obj.type === "equipment") {
                if (obj.data?.equipmentType === "shield")
                    data.shieldType = obj.data?.equipmentSubtype
                if (obj.data.enhancements !== undefined) {
                    obj.data.enhancements.items.forEach(enhancementItem => {
                        (enhancementItem.data?.resistances || []).forEach(resistance => {
                            if (!resistance[1]) return;
                            let _resistance = data.combinedResistances.find(res => res.uid === resistance[1])
                            if (!_resistance) {
                                _resistance = DamageTypes.defaultER;
                                _resistance.uid = resistance[1]
                                data.combinedResistances.push(_resistance)
                            }
                            erDrRollData.level = enhancementItem.data.levels || 0
                            erDrRollData.levels= enhancementItem.data.levels || 0
                            erDrRollData.enh = enhancementItem.data.enh || 0
                            _resistance.value = Math.max(_resistance.value, new Roll(resistance[0] || "0", erDrRollData).roll().total)
                            _resistance.immunity = _resistance.immunity || resistance[2];
                            _resistance.vulnerable = _resistance.vulnerable || resistance[3];
                        })
                        if (enhancementItem.data.damageReduction) {
                            (enhancementItem.data?.damageReduction || []).forEach(dr => {
                                if (!dr[1] || !dr[0]) return;
                                if (dr[1] !== 'any') {
                                    if (!data.combinedDR.types) {
                                        data.combinedDR.types = []
                                    }
                                    let _dr = data.combinedDR.types.find(res => res.uid === dr[1])
                                    if (!_dr) {
                                        _dr = DamageTypes.defaultDR;
                                        _dr.uid = dr[1];
                                        data.combinedDR.types.push(_dr)
                                    }
                                    erDrRollData.level = enhancementItem.data.levels || 0
                                    erDrRollData.levels= enhancementItem.data.levels || 0
                                    erDrRollData.enh = enhancementItem.data.enh || 0
                                    _dr.value = Math.max(_dr.value, new Roll(dr[0] || "0", erDrRollData).roll().total)
                                } else {
                                    data.combinedDR.any = Math.max(data.combinedDR.any || 0,new Roll35e(dr[0] || "0", enhancementItem.data).roll().total)
                                }
                            })
                        }
                    });
                }
            }
            if (obj.data.counterName !== undefined && obj.data.counterName !== null && obj.data.counterName !== "") {
                obj.data.counterName.split(";").forEach(counterName => {
                    counterName = counterName.trim()
                    if (counterName.indexOf(".") !== -1) {
                        let group = counterName.split(".")[0]
                        let name = counterName.split(".")[1]
                        if (data.counters[group] === undefined) {
                            data.counters[group] = {}
                        }
                        if (data.counters[group][name] === undefined) {
                            data.counters[group][name] = { value: 0, counted: 0 }
                        }
                        data.counters[group][name].value++;
                    } else {
                        if (data.counters[counterName] === undefined) {
                            data.counters[counterName] = { value: 0, counted: 0 }
                        }
                        data.counters[counterName].value++;
                    }
                })

            }
        })
        actorData.items.filter(obj => {
            return obj.type === "feat" && obj.data.featType === "feat" && (obj.data.source === undefined || obj.data.source === "");
        }).forEach(obj => {
            let group = "feat"
            let name = obj.data.classSource !== undefined && obj.data.classSource !== "" ? obj.data.classSource : "base"
            if (data.counters[group][name] === undefined) {
                data.counters[group][name] = { value: 0, counted: 0 }
            }
            data.counters[group][name].counted++;
        })

        // Prepare modifier containers
        data.attributes.mods = data.attributes.mods || {};
        data.attributes.mods.skills = data.attributes.mods.skills || {};

        let spellcastingBonusTotalUsed = {
            "psionic": 0,
            "arcane": 0,
            "divine": 0,
        }

        for (let spellbook of Object.values(data.attributes.spells.spellbooks)) {
            if (spellbook.class !== "" && data.classes[spellbook.class] != null) {
                let spellcastingType = data.classes[spellbook.class].spellcastingType;
                spellcastingBonusTotalUsed[spellcastingType] += spellbook.bonusPrestigeCl;
            }
        }

        for (let spellbook of Object.values(data.attributes.spells.spellbooks)) {
            // Set CL
            spellbook.maxPrestigeCl = 0
            spellbook.allSpellsKnown = false
            try {
                let roll = new Roll35e(spellbook.cl.formula, data).roll();
                spellbook.cl.total = roll.total || 0;
            } catch (e) {
                spellbook.cl.total = 0;
            }
            if (actorData.type === "npc") spellbook.cl.total += spellbook.cl.base;
            if (spellbook.class === "_hd") {
                spellbook.cl.total += data.attributes.hd.total;
            } else if (spellbook.class !== "" && data.classes[spellbook.class] != null) {
                spellbook.cl.total += data.classes[spellbook.class].level;
                let spellcastingType = spellbook.spellcastingType;
                if (spellcastingType !== undefined && spellcastingType !== null && spellcastingType !== "none" && spellcastingType !== "other") {
                    if (data.attributes.prestigeCl[spellcastingType]?.max !== undefined) {
                        spellbook.maxPrestigeCl = data.attributes.prestigeCl[spellcastingType].max;
                        spellbook.availablePrestigeCl = data.attributes.prestigeCl[spellcastingType].max - spellcastingBonusTotalUsed[spellcastingType];
                    }
                }

                spellbook.allSpellsKnown = data.classes[spellbook.class]?.allSpellsKnown
            }
            spellbook.hasPrestigeCl = spellbook.maxPrestigeCl > 0
            spellbook.canAddPrestigeCl = spellbook.availablePrestigeCl > 0
            spellbook.canRemovePrestigeCl = spellbook.bonusPrestigeCl > 0
            spellbook.powersKnown = data.classes[spellbook.class]?.powersKnown ? data.classes[spellbook.class]?.powersKnown[`${data.classes[spellbook.class].level}`] || 0 : 0
            spellbook.powersMaxLevel = data.classes[spellbook.class]?.powersMaxLevel ? data.classes[spellbook.class]?.powersMaxLevel[`${data.classes[spellbook.class].level}`] || 0 : 0
            spellbook.cl.total += spellbook.bonusPrestigeCl === undefined ? 0 : spellbook.bonusPrestigeCl;
            // Add spell slots
            spellbook.spells = spellbook.spells || {};
            for (let a = 0; a < 10; a++) {
                spellbook.spells[`spell${a}`] = spellbook.spells[`spell${a}`] || { value: 0, max: 0, base: null, known: 0 };
                spellbook.spells[`spell${a}`].maxKnown = data.classes[spellbook.class]?.spellsKnownPerLevel ? Math.max(0, data.classes[spellbook.class]?.spellsKnownPerLevel[data.classes[spellbook.class].level - 1] ? data.classes[spellbook.class]?.spellsKnownPerLevel[data.classes[spellbook.class].level - 1][a+1] || 0 : 0) : 0
            }
        }
        data.canLevelUp = data.details.xp.value >= data.details.xp.max

    }

    _setSourceDetails(actorData, extraData, flags) {
        if (flags == null) flags = {};
        let sourceDetails = {};
        // Get empty source arrays
        for (let obj of Object.values(CONFIG.D35E.buffTargets)) {
            for (let b of Object.keys(obj)) {
                if (!b.startsWith("_")) {
                    let buffTargets = this._getChangeFlat(b, null, actorData.data);
                    if (!(buffTargets instanceof Array)) buffTargets = [buffTargets];
                    for (let bt of buffTargets) {
                        if (!sourceDetails[bt]) sourceDetails[bt] = [];
                    }
                }
            }
        }
        // Add additional source arrays not covered by changes
        sourceDetails["data.attributes.bab.total"] = [];


        // Add base values to certain bonuses
        sourceDetails["data.attributes.ac.normal.total"].push({ name: "Base", value: 10 });
        sourceDetails["data.attributes.ac.touch.total"].push({ name: "Base", value: 10 });
        sourceDetails["data.attributes.ac.flatFooted.total"].push({ name: "Base", value: 10 });
        sourceDetails["data.attributes.cmd.total"].push({ name: "Base", value: 10 });
        sourceDetails["data.attributes.cmd.flatFootedTotal"].push({ name: "Base", value: 10 });
        for (let [a, abl] of Object.entries(actorData.data.abilities)) {
            sourceDetails[`data.abilities.${a}.total`].push({ name: "Base", value: abl.value });
            // Add ability penalty, damage and drain
            if (abl.damage != null && abl.damage !== 0) {
                sourceDetails[`data.abilities.${a}.total`].push({
                    name: "Ability Damage",
                    value: `-${Math.floor(Math.abs(abl.damage) / 2)} (Mod only)`
                });
            }
            if (abl.drain != null && abl.drain !== 0) {
                sourceDetails[`data.abilities.${a}.total`].push({ name: "Ability Drain", value: -Math.abs(abl.drain) });
            }
        }

        // Add CMB, CMD and initiative
        if (actorData.data.attributes.bab.total !== 0) {
            sourceDetails["data.attributes.cmb.total"].push({ name: "BAB", value: actorData.data.attributes.bab.total });
            sourceDetails["data.attributes.cmd.total"].push({ name: "BAB", value: actorData.data.attributes.bab.total });
            sourceDetails["data.attributes.cmd.flatFootedTotal"].push({
                name: "BAB",
                value: actorData.data.attributes.bab.total
            });
        }
        const useDexForCMB = Object.keys(CONFIG.D35E.actorSizes).indexOf(getProperty(actorData, "data.traits.size") || "") <= Object.keys(CONFIG.D35E.actorSizes).indexOf("tiny");
        if (actorData.data.abilities.str.mod !== 0) {
            if (!useDexForCMB) sourceDetails["data.attributes.cmb.total"].push({
                name: "Strength",
                value: actorData.data.abilities.str.mod
            });
            sourceDetails["data.attributes.cmd.total"].push({
                name: "Strength",
                value: actorData.data.abilities.str.mod
            });
            sourceDetails["data.attributes.cmd.flatFootedTotal"].push({
                name: "Strength",
                value: actorData.data.abilities.str.mod
            });
        }
        if (actorData.data.abilities.dex.mod !== 0) {
            if (useDexForCMB) sourceDetails["data.attributes.cmb.total"].push({
                name: "Dexterity",
                value: actorData.data.abilities.dex.mod
            });
            sourceDetails["data.attributes.cmd.total"].push({
                name: "Dexterity",
                value: actorData.data.abilities.dex.mod
            });
            if (actorData.data.abilities.dex.mod < 0) {
                sourceDetails["data.attributes.cmd.flatFootedTotal"].push({
                    name: "Dexterity",
                    value: actorData.data.abilities.dex.mod
                });
            }
            sourceDetails["data.attributes.init.total"].push({
                name: "Dexterity",
                value: actorData.data.abilities.dex.mod
            });
        }
        if (flags.uncannyDodge && !flags.loseDexToAC) {
            sourceDetails["data.attributes.ac.flatFooted.total"].push({
                name: "Dexterity (Uncanny Dodge)",
                value: actorData.data.abilities.dex.mod
            });
        }
        if (actorData.data.attributes.energyDrain != null && actorData.data.attributes.energyDrain !== 0) {
            sourceDetails["data.attributes.cmb.total"].push({
                name: "Negative Levels",
                value: -actorData.data.attributes.energyDrain
            });
            sourceDetails["data.attributes.cmd.total"].push({
                name: "Negative Levels",
                value: -actorData.data.attributes.energyDrain
            });
            sourceDetails["data.attributes.cmd.flatFootedTotal"].push({
                name: "Negative Levels",
                value: -actorData.data.attributes.energyDrain
            });
        }

        // Add ability mods (and energy drain) to saving throws
        for (let [s, a] of Object.entries(CONFIG.D35E.savingThrowMods)) {
            if (actorData.data.abilities[a].mod !== 0) {
                sourceDetails[`data.attributes.savingThrows.${s}.total`].push({
                    name: CONFIG.D35E.abilities[a],
                    value: actorData.data.abilities[a].mod
                });
            }
            if (actorData.data.attributes.energyDrain != null && actorData.data.attributes.energyDrain !== 0) {
                sourceDetails[`data.attributes.savingThrows.${s}.total`].push({
                    name: "Negative Levels",
                    value: -actorData.data.attributes.energyDrain
                });
            }
        }

        // Add energy drain to skills
        if (actorData.data.attributes.energyDrain != null && actorData.data.attributes.energyDrain !== 0) {
            for (let [sklKey, skl] of Object.entries(actorData.data.skills)) {
                if (sourceDetails[`data.skills.${sklKey}.changeBonus`] == null) continue;
                sourceDetails[`data.skills.${sklKey}.changeBonus`].push({
                    name: "Negative Levels",
                    value: -actorData.data.attributes.energyDrain
                });

                if (skl.subSkills != null) {
                    for (let subSklKey of Object.keys(skl.subSkills)) {
                        sourceDetails[`data.skills.${sklKey}.subSkills.${subSklKey}.changeBonus`].push({
                            name: "Negative Levels",
                            value: -actorData.data.attributes.energyDrain
                        });
                    }
                }
            }
        }

        // AC from Dex mod
        const maxDexBonus = actorData.data.attributes.maxDexBonus;
        const dexBonus = maxDexBonus != null ? Math.min(maxDexBonus, actorData.data.abilities.dex.mod) : actorData.data.abilities.dex.mod;
        if (dexBonus < 0 || (!flags.loseDexToAC && dexBonus > 0)) {
            sourceDetails["data.attributes.ac.normal.total"].push({ name: "Dexterity", value: dexBonus });
            sourceDetails["data.attributes.ac.touch.total"].push({ name: "Dexterity", value: dexBonus });
            if (dexBonus < 0) {
                sourceDetails["data.attributes.ac.flatFooted.total"].push({ name: "Dexterity", value: dexBonus });
            }
        }

        // Add extra data
        for (let [changeTarget, changeGrp] of Object.entries(extraData)) {
            for (let grp of Object.values(changeGrp)) {
                if (grp.length > 0) {
                    sourceDetails[changeTarget] = sourceDetails[changeTarget] || [];
                    for (let src of grp) {
                        let srcInfo = this.constructor._translateSourceInfo(src.type, src.subtype, src.name);
                        sourceDetails[changeTarget].push({
                            name: srcInfo,
                            value: src.value
                        });
                    }
                }
            }
        }

        this.sourceDetails = sourceDetails;
    }

    async refresh(options = {}) {
        if (this.testUserPermission(game.user, "OWNER") && options.stopUpdates !== true) {
            return this.update({});
        }
    }

    async refreshWithData(data, options = {}) {
        if (this.testUserPermission(game.user, "OWNER") && options.stopUpdates !== true) {
            return this.update(data);
        }
    }

    /**
     * Prepare Character type specific
     * data
     */
    _prepareCharacterData(actorData) {
        if (!hasProperty(actorData, "data.details.level.value")) return;

        const data = actorData.data;

        // Experience bar
        let prior = this.getLevelExp(data.details.level.available - 1 || 0),
            req = data.details.xp.max - prior;
        data.details.xp.pct = Math.min(Math.round((data.details.xp.value - prior) * 100 / (req || 1)), 99.5);
    }

    /* -------------------------------------------- */

    /**
     * Prepare NPC type specific data
     */
    _prepareNPCData(data) {
        if (!hasProperty(data, "data.details.cr")) return;

        // Kill Experience
        data.details.xp.value = this.getCRExp(data.details.totalCr);
    }

    /**
     * Return reduced movement speed.
     * @param {Number} value - The non-reduced movement speed.
     * @returns {Number} The reduced movement speed.
     */
    static getReducedMovementSpeed(value) {
        const incr = game.settings.get("D35E", "units") === "metric" ? 1.5 : 5

        if (value <= 0) return value;
        if (value < 2 * incr) return incr;
        value = Math.floor(value / incr) * incr;

        let result = 0,
            counter = 2;
        for (let a = incr; a <= value; a += counter * incr) {
            result += incr;
            if (counter === 1) counter = 2;
            else counter = 1;
        }

        return result;
    }

    /**
     * Return increased amount of spell slots by ability score modifier.
     * @param {Number} mod - The associated ability modifier.
     * @param {Number} level - Spell level.
     * @returns {Number} Amount of spell levels to increase.
     */
    static getSpellSlotIncrease(mod, level) {
        if (level === 0) return 0;
        if (mod <= 0) return 0;
        return Math.max(0, Math.ceil(((mod + 1) - level) / 4));
    }

    /**
     * Return the amount of experience required to gain a certain character level.
     * @param level {Number}  The desired level
     * @return {Number}       The XP required
     */
    getLevelExp(level) {
        const expRate = game.settings.get("D35E", "experienceRate");
        const levels = CONFIG.D35E.CHARACTER_EXP_LEVELS[expRate];
        return levels[Math.min(level, levels.length - 1)];
    }

    /* -------------------------------------------- */

    /**
     * Return the amount of experience granted by killing a creature of a certain CR.
     * @param cr {Number}     The creature's challenge rating
     * @return {Number}       The amount of experience granted per kill
     */
    getCRExp(cr) {
        if (cr < 1.0) return Math.max(400 * cr, 10);
        return CONFIG.D35E.CR_EXP_LEVELS[cr];
    }

    /* -------------------------------------------- */

    /*  Socket Listeners and Handlers
  /* -------------------------------------------- */


    updateContainerData(updateData) {

        // Update item containers data
        let itemUpdates = []
        for (let i of this.items.values()) {
            if (!i.data.data.hasOwnProperty("quantity")) continue;
            let itemUpdateData = {}

            let hasContainerChanged = false
            if (i.data.data.containerId !== undefined && i.data.data.containerId !== "none") {
                const container = this.getOwnedItem(i.data.data.containerId);
                if (container === undefined || container === null) {
                    updateData[`data.items/${i._id}.data.containerId`] = "none";
                    updateData[`data.items/${i._id}.data.container`] = "None";
                    updateData[`data.items/${i._id}.data.containerWeightless`] = false;

                    hasContainerChanged = true;
                } else {
                    if (i.data.data.container !== container.name) {
                        updateData[`data.items/${i._id}.data.container`] = container.name;
                        hasContainerChanged = true
                    }

                    if (i.data.data.containerWeightless !== container.data.data.containerWeightless) {
                        updateData[`data.items/${i._id}.data.containerWeightless`] = container.data.data.containerWeightless;
                        hasContainerChanged = true
                    }
                }
            } else {
                if (i.data.data.containerId !== "none")
                    continue; // Do nothing!
                updateData[`data.items/${i._id}.data.containerId`] = "none";
                updateData[`data.items/${i._id}.data.container`] = "None";
                updateData[`data.items/${i._id}.data.containerWeightless`] = false;
                hasContainerChanged = true
            }
            if (hasContainerChanged)
                itemUpdates.push(itemUpdateData, { stopUpdates: true })
        }
    }

    /**
     * Extend the default update method to enhance data before submission.
     * See the parent Entity.update method for full details.
     *
     * @param {Object} data     The data with which to update the Actor
     * @param {Object} options  Additional options which customize the update workflow
     * @return {Promise}        A Promise which resolves to the updated Entity
     */
    async update(data, options = {}) {
        if (options['recursive'] !== undefined && options['recursive'] === false) {
            console.log('D35E | Skipping update logic since it is not recursive')
            await super.update(data, options);
            return
        }
        // if (options['stopUpdates'] !== undefined && options['stopUpdates'] === true) {
        //     console.log('D35E | Got stop updates, exiting')
        //     return
        // }
        data = await this.prepareUpdateData(data);

        // Update changes
        let diff = data;
        if (options.updateChanges !== false) {
            const updateObj = await this._updateChanges({data: data}, options);

            if (updateObj?.diff?.items) delete updateObj.diff.items;
            diff = mergeObject(diff, updateObj?.diff || {});
        }

        // Diff token data
        if (data.token != null) {
            diff.token = diffObject(this.data.token, data.token);
        }

        if (Object.keys(diff).length) {
            let updateOptions = mergeObject(options, { diff: true })
            await super.update(diff,updateOptions);

        }

        await this.toggleConditionStatusIcons();

        this._updateMinions(options);
        //return false;
        return this;
    }

    async prepareUpdateData(data) {
        let img = data.img;
        let expandedData = expandObject(data);
        if (expandedData.data != null && expandedData.data.skills != null) {
            for (let [s, skl] of Object.entries(expandedData.data.skills)) {
                let curSkl = this.data.data.skills[s];
                if (skl == null) continue;
                if (skl.rank)
                    if (typeof skl.rank !== "number") skl.rank = 0;
                if (skl.subSkills != null) {
                    for (let skl2 of Object.values(skl.subSkills)) {
                        if (skl2 == null) continue;
                        if (skl2.rank)
                            if (typeof skl2.rank !== "number") skl2.rank = 0;
                    }
                }

                // Rename custom skills
                if (curSkl != null && curSkl.custom && skl.name != null) {
                    let tag = createTag(skl.name || "skill");
                    let count = 1;
                    const skillData = getProperty(this.data, `data.skills.${tag}`) || {};
                    while (this.data.data.skills[tag] != null && this.data.data.skills[tag] != curSkl) {
                        count++;
                        tag = createTag(skillData.name || "skill") + count.toString();
                    }

                    if (s !== tag) {
                        expandedData.data.skills[tag] = mergeObject(curSkl, skl);
                        expandedData.data.skills[s] = null;
                    }
                }
            }
            data = flattenObject(expandedData);
        } else if (expandedData.data !== null)
            data = flattenObject(expandedData);
        data.img = img;
        for (let abl of Object.keys(this.data.data.abilities)) {
            if (data[`data.abilities.${abl}.tempvalue`] === undefined || data[`data.abilities.${abl}.tempvalue`] === null)
                continue
            if (Array.isArray(data[`data.abilities.${abl}.tempvalue`])) {
                for (let val of data[`data.abilities.${abl}.tempvalue`]) {
                    if (data[`data.abilities.${abl}.value`] !== undefined && parseInt(val) !== data[`data.abilities.${abl}.value`]) {
                        data[`data.abilities.${abl}.value`] = parseInt(val);
                        break;
                    } else if (parseInt(val) !== this.data.data.abilities[`${abl}`].value) {
                        data[`data.abilities.${abl}.value`] = parseInt(val);
                        break;
                    }
                }
            } else {
                data[`data.abilities.${abl}.value`] = parseInt(data[`data.abilities.${abl}.tempvalue`]);
            }
        }

        // Make certain variables absolute
        const _absoluteKeys = Object.keys(this.data.data.abilities).reduce((arr, abl) => {
            arr.push(`data.abilities.${abl}.userPenalty`, `data.abilities.${abl}.damage`, `data.abilities.${abl}.drain`);
            return arr;
        }, []).concat("data.attributes.energyDrain").filter(k => {
            return data[k] != null;
        });
        for (const k of _absoluteKeys) {
            data[k] = Math.abs(data[k]);
        }
        if (data[`data.attributes.hp.value`]) {
            if (typeof data[`data.attributes.hp.value`] === "string") {
                if (data[`data.attributes.hp.value`].startsWith('+')) {
                    data[`data.attributes.hp.value`] = this.data.data.attributes.hp.value + parseInt(data[`data.attributes.hp.value`]);
                } else if (data[`data.attributes.hp.value`].startsWith('-')) {
                    data[`data.attributes.hp.value`] = this.data.data.attributes.hp.value + parseInt(data[`data.attributes.hp.value`]);
                } else {
                    data[`data.attributes.hp.value`] = parseInt(data[`data.attributes.hp.value`]) || this.data.data.attributes.hp.value
                }
            } else {
                data[`data.attributes.hp.value`] = parseInt(data[`data.attributes.hp.value`]) || this.data.data.attributes.hp.value
            }
        }


        // Update item containers data
        let itemUpdates = []
        for (let i of this.items.values()) {
            if (!i.data.data.hasOwnProperty("quantity")) continue;
            let itemUpdateData = {}

            itemUpdateData["_id"] = i.id;
            let hasContainerChanged = false
            if (i.data.data.containerId !== undefined && i.data.data.containerId !== "none") {
                const container = this.getOwnedItem(i.data.data.containerId);
                if (container === undefined || container === null) {
                    itemUpdateData["data.containerId"] = "none";
                    itemUpdateData["data.container"] = "None";
                    itemUpdateData["data.containerWeightless"] = false;
                    hasContainerChanged = true;
                } else {
                    if (i.data.data.equipped === true) {
                        itemUpdateData["data.equipped"] = false;
                        hasContainerChanged = true
                    }
                    if (i.data.data.container !== container.name) {
                        itemUpdateData["data.container"] = container.name;
                        hasContainerChanged = true
                    }
                    if (i.data.data.carried !== container.data.data.carried) {
                        itemUpdateData["data.carried"] = container.data.data.carried;
                        hasContainerChanged = true
                    }
                    if (i.data.data.containerWeightless !== container.data.data.bagOfHoldingLike) {
                        itemUpdateData["data.containerWeightless"] = container.data.data.bagOfHoldingLike;
                        hasContainerChanged = true
                    }
                }
            } else {
                if (i.data.data.containerId === "none")
                    continue; // Do nothing!

                if (i.data.data.containerId !== "none") {
                    itemUpdateData["data.containerId"] = "none";
                    hasContainerChanged = true
                }
                if (i.data.data.container !== "None") {
                    itemUpdateData["data.container"] = "None";
                    hasContainerChanged = true
                }
                if (i.data.data.containerWeightless !== false) {
                    itemUpdateData["data.containerWeightless"] = false;
                    hasContainerChanged = true
                }
            }
            if (hasContainerChanged)
                itemUpdates.push(itemUpdateData)
        }
        // console.log('D35E | Item updates', itemUpdates)
        if (itemUpdates.length > 0)
            await this.updateOwnedItem(itemUpdates, { stopUpdates: true });
        // Send resource updates to item
        let updatedResources = [];
        let updateClasses = false;

        for (let key of Object.keys(data)) {
            if (key.match(/^data\.resources\.([a-zA-Z0-9]+)/)) {
                const resourceTag = RegExp.$1;
                if (updatedResources.includes(resourceTag)) continue;
                updatedResources.push(resourceTag);

                const resource = this.data.data.resources[resourceTag];
                if (resource != null) {
                    const itemId = resource._id;
                    const item = this.getOwnedItem(itemId);
                    if (item == null) continue;

                    const itemUpdateData = {};
                    let key = `data.resources.${resourceTag}.value`;
                    if (data[key] != null && data[key] !== item.data.data.uses.value) {
                        itemUpdateData["data.uses.value"] = data[key];
                    }
                    key = `data.resources.${resourceTag}.max`;
                    if (data[key] != null && data[key] !== item.data.data.uses.max) {
                        itemUpdateData["data.uses.max"] = data[key];
                    }
                    if (Object.keys(itemUpdateData).length > 0) item.update(itemUpdateData);
                }
            }

        }

        updateClasses = true;


        // Clean up old item resources
        for (let [tag, res] of Object.entries(getProperty(this.data, "data.resources") || {})) {
            if (!res) continue;
            if (!res._id) continue;
            const itemId = res._id;
            const item = this.getOwnedItem(itemId);
            // Remove resource from token bars
            if (item == null) {
                const tokens = this.getActiveTokens();
                tokens.forEach(token => {
                    ["bar1", "bar2"].forEach(b => {
                        const barAttr = token.getBarAttribute(b);
                        if (barAttr == null) {
                            return;
                        }
                        if (barAttr.attribute === `resources.${tag}`) {
                            const tokenUpdateData = {};
                            tokenUpdateData[`${b}.attribute`] = null;
                            token.update(token.scene._id, tokenUpdateData, { stopUpdates: true });
                        }
                    });
                });
            }
            // Remove resource
            if (item == null || createTag(item.name) !== tag) {
                data[`data.resources.-=${tag}`] = null;
            }
        }


        // Update portraits

        await this._updateExp(data);
        return data;
    }

    _onUpdate(data, options, userId, context) {
        if (hasProperty(data, "data.attributes.vision.lowLight") || hasProperty(data, "data.attributes.vision.darkvision")) {
            canvas.sight.initializeTokens();
        }

        let actorRollData = mergeObject(this.getRollData(), data, {inplace: false})
        for (let i of this.items.values()) {
            let itemUpdateData = {};

            i._updateMaxUses(itemUpdateData, {actorRollData: actorRollData});
            if (Object.keys(itemUpdateData).length > 0) {
                const itemDiff = diffObject(flattenObject(i.data), itemUpdateData);
                if (Object.keys(itemDiff).length > 0) i.update(itemDiff);
            }
        }
        return super._onUpdate(data, options, userId, context);
    }

    /**
     * Makes sure experience values are correct in update data.
     * @param {Object} data - The update data, as per ActorPF.update()
     * @returns {Boolean} Whether to force an update or not.
     */
    async _updateExp(data) {
        const classes = this.items.filter(o => o.type === "class");

        let raceLA = 0;
        if (this.items != null) {
            try {
                let raceObject = this.items.filter(o => o.type === "race")[0];
                if (raceObject != null) {
                    raceLA = raceObject.data.data.la || 0
                }
                this.items.filter(o => o.type === "class").forEach(c => {
                    raceLA += c.data.data?.la || 0
                })
            } catch (e) {
            }
        }

        let level = classes.reduce((cur, o) => {
            if (o.data.data.classType === "minion" || o.data.data.classType === "template") return cur;
            return cur + o.data.data.levels;
        }, 0);
        let racialHD = classes.filter(o => o.type === "class" && getProperty(o.data, "data.classType") === "racial").reduce((cur, o) => {
            return cur + o.data.data.levels;
        }, 0);
        level += raceLA;

        let dataLevel = level;


        // The following is not for NPCs
        if (this.data.type !== "character") return;
        if (data["data.details.levelUpProgression"] || this.data.data.details.levelUpProgression) {
            dataLevel = (data["data.details.level.available"] || this.data.data.details.level.available) + raceLA + racialHD
            console.log('D35E | ActorPF | _updateExp | Update exp data from class level count', dataLevel)
        }
        console.log('D35E | ActorPF | _updateExp | Race LA, racial HD, level', raceLA, racialHD,dataLevel)
        // Translate update exp value to number
        let newExp = data["data.details.xp.value"],
            resetExp = false;
        if (typeof newExp === "string") {
            if (newExp.match(/^\+([0-9]+)$/)) {
                newExp = this.data.data.details.xp.value + parseInt(RegExp.$1);
            } else if (newExp.match(/^-([0-9]+)$/)) {
                newExp = this.data.data.details.xp.value - parseInt(RegExp.$1);
            } else if (newExp === "") {
                resetExp = true;
            } else {
                newExp = parseInt(newExp);
                if (Number.isNaN(newExp)) newExp = this.data.data.details.xp.value;
            }

            if (typeof newExp === "number" && newExp !== getProperty(this.data, "data.details.xp.value")) {
                data["data.details.xp.value"] = newExp;
            }
        }
        const maxExp = this.getLevelExp(dataLevel);
        if (maxExp !== getProperty(this.data, "data.details.xp.max")) {
            data["data.details.xp.max"] = maxExp;
        }

        const minExp = dataLevel > 0 ? this.getLevelExp(dataLevel - 1) : 0;
        if (resetExp) data["data.details.xp.value"] = minExp;
    }

    async updateClassProgressionLevel(data, globalUpdateData, data1, levelUpData) {

        console.log('D35E | ActorPF | updateClassProgressionLevel | Starting update')
        const classes = this.items.filter(o => o.type === "class" && getProperty(o.data.data, "classType") !== "racial").sort((a, b) => {
            return a.sort - b.sort;
        });
        let updateData = {}
        let classLevels = new Map()
        let classHP = new Map()
        // Iterate over all levl ups
        if (data1.details.levelUpData && data1.details.levelUpProgression) {
            levelUpData.forEach(lud => {
                if (lud.classId === null || lud.classId === "") return;
                let _class = this.items.find(cls => cls._id === lud.classId)
                if (_class == null) {
                    lud.classId = null;
                    lud.classImage = null;
                    lud.skills = {};
                    lud.class = null;
                    return;
                }
                if (!classLevels.has(_class._id))
                    classLevels.set(_class._id,0)
                classLevels.set(_class._id,classLevels.get(_class._id)+1)
                if (!classHP.has(_class._id))
                    classHP.set(_class._id,0)
                classHP.set(_class._id,classHP.get(_class._id) + (lud.hp || 0))
                Object.keys(lud.skills).forEach(s => {
                    updateData[`data.skills.${s}.rank`] = (lud.skills[s].rank || 0) * (lud.skills[s].cls ? 1 : 0.5) + (updateData[`data.skills.${s}.rank`] || 0);
                    if (lud.skills[s].subskills) {
                        Object.keys(lud.skills[s].subskills).forEach(sb => {
                            updateData[`data.skills.${s}.subSkills.${sb}.rank`] = lud.skills[s].subskills[sb].rank * (lud.skills[s].subskills[sb].cls ? 1 : 0.5) + (updateData[`data.skills.${s}.subSkills.${sb}.rank`] || 0);
                        })
                    }
                })
            })
            Object.keys(levelUpData[0]?.skills || {}).forEach(s => {
                updateData[`data.skills.${s}.rank`] = Math.floor(updateData[`data.skills.${s}.rank`] || 0);
                if (levelUpData[0].skills[s].subskills) {
                    Object.keys(levelUpData[0].skills[s].subskills).forEach(sb => {
                        updateData[`data.skills.${s}.subSkills.${sb}.rank`] = Math.floor(updateData[`data.skills.${s}.subSkills.${sb}.rank`] || 0);
                    })
                }
            })

            for (var _class of classes) {
                let itemUpdateData = {}
                itemUpdateData["_id"] = _class._id;
                itemUpdateData["data.levels"] = classLevels.get(_class._id) || 0;
                itemUpdateData["data.hp"] = classHP.get(_class._id) || 0;
                await this.updateOwnedItem(itemUpdateData, { stopUpdates: true });

                console.log(`D35E | ActorPF | updateClassProgressionLevel | Updated class item ${_class.name}`)
            }

            for (let [k, s] of Object.entries(getProperty(data, "data.skills"))) {
                linkData(data, globalUpdateData, `data.skills.${k}.rank`, updateData[`data.skills.${k}.rank`] || 0);
                for (let k2 of Object.keys(getProperty(s, "subSkills") || {})) {
                    linkData(data, globalUpdateData, `data.skills.${k}.subSkills.${k2}.rank`, updateData[`data.skills.${k}.subSkills.${k2}.rank`] || 0);
                }
            }

            console.log('D35E | ActorPF | updateClassProgressionLevel | Update done')
        } else {
            console.log('D35E | ActorPF | updateClassProgressionLevel | Update skipped, no levelUpData')
        }

    }

    async _onCreate(data, options, userId, context) {
        if (userId === game.user._id) {
            await this._updateChanges();
        }

        super._onCreate(data, options, userId, context);
    }

    updateItemResources(item) {
        if (!(item instanceof Item)) return;
        if (!this.testUserPermission(game.user, "OWNER")) return;

        if (item.data.data.uses != null && item.data.data.activation != null && item.data.data.activation.type !== "") {
            const itemTag = createTag(item.data.name);
            const itemCustomTag = createTag(item.data.data.customTag);
            let curUses = item.data.data.uses;

            if (this.data.data.resources == null) this.data.data.resources = {};
            if (this.data.data.resources[itemTag] == null) this.data.data.resources[itemTag] = {
                value: 0,
                max: 1,
                _id: ""
            };

            const updateData = {};
            if (this.data.data.resources[itemTag].value !== curUses.value) {
                updateData[`data.resources.${itemTag}.value`] = curUses.value;
            }
            if (this.data.data.resources[itemTag].max !== curUses.max) {
                updateData[`data.resources.${itemTag}.max`] = curUses.max;
            }
            if (this.data.data.resources[itemTag]._id !== item._id) {
                updateData[`data.resources.${itemTag}._id`] = item._id;
            }
            if (itemCustomTag) {
                if (this.data.data.resources[itemCustomTag] == null) this.data.data.resources[itemCustomTag] = {
                    value: 0,
                    max: 1,
                    _id: ""
                };
                const updateData = {};
                if (this.data.data.resources[itemCustomTag].value !== curUses.value) {
                    updateData[`data.resources.${itemCustomTag}.value`] = curUses.value;
                }
                if (this.data.data.resources[itemCustomTag].max !== curUses.max) {
                    updateData[`data.resources.${itemCustomTag}.max`] = curUses.max;
                }
                if (this.data.data.resources[itemCustomTag]._id !== item._id) {
                    updateData[`data.resources.${itemCustomTag}._id`] = item._id;
                }
            }

            if (Object.keys(updateData).length > 0) this.update(updateData);
        }
    }

    getItemResourcesUpdate(item, updateData) {
        if (!(item instanceof Item)) return;
        if (!this.testUserPermission(game.user, "OWNER")) return;

        if (item.data.data.uses != null && item.data.data.activation != null && item.data.data.activation.type !== "") {
            const itemTag = createTag(item.data.name);
            let curUses = item.data.data.uses;

            if (this.data.data.resources == null) this.data.data.resources = {};
            if (this.data.data.resources[itemTag] == null) this.data.data.resources[itemTag] = {
                value: 0,
                max: 1,
                _id: ""
            };
            if (this.data.data.resources[itemTag].value !== curUses.value) {
                updateData[`data.resources.${itemTag}.value`] = curUses.value;
            }
            if (this.data.data.resources[itemTag].max !== curUses.max) {
                updateData[`data.resources.${itemTag}.max`] = curUses.max;
            }
            if (this.data.data.resources[itemTag]._id !== item._id) {
                updateData[`data.resources.${itemTag}._id`] = item._id;
            }
        }
    }


    /* -------------------------------------------- */

    /**
     * See the base Actor class for API documentation of this method
     */
    async createOwnedItem(itemData, options) {
        let t = itemData.type;
        let initial = {};
        // Assume NPCs are always proficient with weapons and always have spells prepared
        if (!this.hasPlayerOwner) {
            if (t === "weapon") initial["data.proficient"] = true;
            if (["weapon", "equipment"].includes(t)) initial["data.equipped"] = true;
        }
        if (t === "spell") {
            if (this.sheet != null && this.sheet._spellbookTab != null) {
                initial["data.spellbook"] = this.sheet._spellbookTab;
            }
        }
        mergeObject(itemData, initial);

        return this.createEmbeddedEntity("Item", itemData, options);
    }

    /* -------------------------------------------- */
    /*  Rolls                                       */

    /* -------------------------------------------- */

    /**
     * Cast a Spell, consuming a spell slot of a certain level
     * @param {ItemPF} item   The spell being cast by the actor
     * @param {MouseEvent} ev The click event
     */
    async useSpell(item, ev, { skipDialog = false, replacement = false, replacementItem = null } = {}, actor = null) {
        let usedItem = replacementItem ? replacementItem : item;
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));
        if (item.data.type !== "spell") throw new Error("Wrong Item type");

        if (getProperty(item.data, "data.preparation.mode") !== "atwill" && item.getSpellUses() <= 0) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoSpellsLeft"));

        // Invoke the Item roll
        if (usedItem.hasAction)
        {
            let attackResult = await usedItem.useAttack({ ev: ev, skipDialog: skipDialog }, actor, true);
            let roll = await attackResult.roll;
            await item.addSpellUses(-1+(-1*roll?.rollData?.useAmount || 0));
            return ;
        }

        await item.addSpellUses(-1);
        return usedItem.roll();
    }

    async addSpellsToSpellbook(item) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        if (item.data.type !== "feat") throw new Error("Wrong Item type");
        let spellsToAdd = []
        for (let spell of Object.values(item.data.data.spellSpecialization.spells)) {
            let itemData = null;
            const pack = game.packs.find(p => p.collection === spell.pack);
            const packItem = await pack.getEntity(spell.id);
            if (packItem != null) itemData = packItem.data;
            if (itemData) {
                if (itemData._id) delete itemData._id;
                itemData.data.level = spell.level
                spellsToAdd.push(itemData)
            }
        }
        await this.createEmbeddedEntity("Item", spellsToAdd, {nameUnique: true, domainSpells: true})
    }

    async addSpellsToSpellbookForClass(_spellbookKey, level) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        let spellsToAdd = []
        for (let p of game.packs.values()) {
            if (p.private && !game.user.isGM) continue;
            if (p.entity !== "Item") continue;

            const items = await p.getContent();
            for (let obj of items) {
                if (obj.type !== 'spell') continue;
                let foundLevel = false;
                let spellbook = this.data.data.attributes.spells.spellbooks[_spellbookKey];
                let spellbookClass = this.data.data.classes[spellbook.class]?.name || "Missing";
                if (obj.data.data.learnedAt !== undefined) {
                    obj.data.data.learnedAt.class.forEach(learnedAtObj => {
                        if (learnedAtObj[0].toLowerCase() === spellbookClass.toLowerCase()) {
                            obj.data.data.level = learnedAtObj[1]
                            foundLevel = true;
                        }
                    })
                }
                if (parseInt(level) !== obj.data.data.level) continue;
                if (!foundLevel) continue;

                if (obj.data._id) delete obj.data._id;
                obj.data.data.spellbook = _spellbookKey
                spellsToAdd.push(obj.data)
            }
        }
        await this.createEmbeddedEntity("Item", spellsToAdd, {stopUpdates: true, nameUnique: true, ignoreSpellbookAndLevel: true})
    }

    async createAttackFromWeapon(item) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));
        if (item.type)  {
            item = duplicate(item);
            item.data = duplicate(item);
        }
        if (item.data.type !== "weapon") throw new Error("Wrong Item type");


        let isKeen = false;
        let isSpeed = false
        let isDistance = false;
        let _enhancements = duplicate(getProperty(item.data, `data.enhancements.items`) || []);
        let identified = getProperty(item.data, `data.identified`)
        // Get attack template
        let attackData = { data: {} };
        for (const template of game.data.system.template.Item.attack.templates) {
            mergeObject(attackData.data, game.data.system.template.Item.templates[template]);
        }
        mergeObject(attackData.data, duplicate(game.data.system.template.Item.attack));
        attackData = flattenObject(attackData);


        // Add things from Enhancements
        if (identified) {
            _enhancements.forEach(i => {
                if (i.data.properties !== null && i.data.properties.kee) {
                    isKeen = true;
                }
                if (i.data.properties !== null && i.data.properties.spd) {
                    isSpeed = true;
                }
                if (i.data.properties !== null && i.data.properties.dis) {
                    isDistance = true;
                }
            });
        }
        let baseCrit = item.data.data.weaponData.critRange || 20;
        if (isKeen) {
            baseCrit = 21 - 2 * (21 - baseCrit)
        }
        attackData["type"] = "attack";
        attackData["name"] = identified ? item.data.name : item.data.data.unidentified.name;
        attackData["data.masterwork"] = item.data.data.masterwork;
        attackData["data.attackType"] = "weapon";
        attackData["data.description.value"] = identified ? item.data.data.description.value : item.data.data.description.unidentified;
        attackData["data.enh"] = identified ? item.data.data.enh : 0;
        attackData["data.ability.critRange"] = baseCrit;
        attackData["data.ability.critMult"] = item.data.data.weaponData.critMult || 2;
        attackData["data.actionType"] = ((item.data.data.weaponSubtype === "ranged" || item.data.data.properties.thr) ? "rwak" : "mwak");
        attackData["data.activation.type"] = "attack";
        attackData["data.duration.units"] = "inst";
        attackData["data.finessable"] = false;
        attackData["data.threatRangeExtended"] = isKeen;
        attackData["data.baseWeaponType"] = item.data.data.unidentified?.name ? item.data.data.unidentified.name : item.name;
        attackData["data.originalWeaponCreated"] = true;
        attackData["data.originalWeaponId"] = item._id;
        attackData["data.originalWeaponName"] = identified ? item.data.name : item.data.data.unidentified.name;
        attackData["data.originalWeaponImg"] = item.img;
        attackData["data.originalWeaponProperties"] = item.data.data.properties;
        attackData["data.material"] = item.data.data.material;
        attackData["data.alignment.good"] = item.data.data.weaponData.alignment?.good || false;
        attackData["data.alignment.evil"] = item.data.data.weaponData.alignment?.evil || false;
        attackData["data.alignment.chaotic"] = item.data.data.weaponData.alignment?.chaotic || false;
        attackData["data.alignment.lawful"] = item.data.data.weaponData.alignment?.lawful || false;
        attackData["img"] = item.data.img;

        attackData["data.nonLethal"] = item.data.data.properties.nnl;
        attackData["data.thrown"] = item.data.data.properties.thr;
        attackData["data.returning"] = item.data.data.properties.ret;


        // Add additional attacks
        let extraAttacks = [];
        for (let a = 5; a < this.data.data.attributes.bab.total; a += 5) {
            extraAttacks = extraAttacks.concat([[`-${a}`, `${game.i18n.localize("D35E.Attack")} ${Math.floor((a + 5) / 5)}`]]);
        }
        if (isSpeed) {
            extraAttacks = extraAttacks.concat([[`0`, `${game.i18n.localize("D35E.Attack")} - Speed Enhancement`]])
        }
        if (extraAttacks.length > 0) attackData["data.attackParts"] = extraAttacks;

        // Add ability modifiers
        const isMelee = getProperty(item.data, "data.weaponSubtype") !== "ranged";
        if (isMelee) attackData["data.ability.attack"] = "str";
        else attackData["data.ability.attack"] = "dex";
        if (isMelee || item.data.data.properties["thr"] === true) {
            attackData["data.ability.damage"] = "str";
            if (item.data.data.weaponSubtype === "2h" && isMelee) attackData["data.ability.damageMult"] = 1.5;
        }

        // Add damage formula
        if (item.data.data.weaponData.damageRoll) {
            const die = item.data.data.weaponData.damageRoll || "1d4";
            let part = die;
            let dieCount = 1,
                dieSides = 4;
            if (die.match(/^([0-9]+)d([0-9]+)$/)) {
                dieCount = parseInt(RegExp.$1);
                dieSides = parseInt(RegExp.$2);
                let weaponSize = "@size"
                if (!game.settings.get("D35E", "autosizeWeapons")) weaponSize = Object.keys(CONFIG.D35E.sizeChart).indexOf(item.data.data.weaponData.size) - 4;
                part = `sizeRoll(${dieCount}, ${dieSides}, ${weaponSize}, @critMult)`;
            }
            const bonusFormula = getProperty(item.data, "data.weaponData.damageFormula");
            if (bonusFormula != null && bonusFormula.length) part = `${part} + ${bonusFormula}`;
            attackData["data.damage.parts"] = [[part, item.data.data.weaponData.damageType || "", item.data.data.weaponData.damageTypeId || ""]];
        }

        // Add attack bonus formula
        {
            const bonusFormula = getProperty(item.data, "data.weaponData.attackFormula");
            if (bonusFormula !== undefined && bonusFormula !== null && bonusFormula.length) attackData["data.attackBonus"] = bonusFormula;
        }

        // Add things from Enhancements
        let conditionals = []
        if (identified) {
            _enhancements.forEach(i => {
                if (i.data.enhancementType !== 'weapon') return;
                let conditional = ItemPF.defaultConditional;
                conditional.name = i.name;
                conditional.default = false;
                if (i.data.weaponData.damageRoll !== '') {
                    if (i.data.weaponData.optionalDamage) {
                        let damageModifier = ItemPF.defaultConditionalModifier;
                        damageModifier.formula = i.data.weaponData.damageRoll;
                        damageModifier.type = i.data.weaponData.damageTypeId;
                        damageModifier.target = "damage";
                        damageModifier.subTarget = "allDamage";
                        conditional.modifiers.push(damageModifier)
                    } else {
                        if (i.data.weaponData.damageRoll !== undefined && i.data.weaponData.damageRoll !== null)
                            attackData["data.damage.parts"].push([i.data.weaponData.damageRoll, i.data.weaponData.damageType, i.data.weaponData.damageTypeId || ""])
                    }
                }
                if (i.data.weaponData.attackRoll !== '') {
                    if (i.data.weaponData.optionalDamage) {
                        let attackModifier = ItemPF.defaultConditionalModifier;
                        attackModifier.formula = i.data.weaponData.attackRoll;
                        attackModifier.target = "attack";
                        attackModifier.subTarget = "allAttack";
                        conditional.modifiers.push(attackModifier)
                    } else {
                        if (i.data.weaponData.attackRoll !== undefined && i.data.weaponData.attackRoll !== null)
                            attackData["data.attackBonus"] = attackData["data.attackBonus"] + " + " + i.data.weaponData.attackRoll
                    }
                }
                if (conditional.modifiers.length > 0) {
                    conditionals.push(conditional);
                }
                if (i.data.attackNotes !== '') {
                    attackData["data.attackNotes"] += '\n' + i.data.attackNotes
                    attackData["data.attackNotes"] = attackData["data.attackNotes"].trim();
                }
            });
            if (conditionals.length) {
                attackData["data.conditionals"] = conditionals;
            }
        }

        if (identified) {
            if (item.data.data.attackNotes !== '') {
                attackData["data.attackNotes"] += '\n' + item.data.data.attackNotes
                attackData["data.attackNotes"] = attackData["data.attackNotes"].trim();
            }
        }

        // Add range
        if (!isMelee && getProperty(item.data, "data.weaponData.range") != null) {
            attackData["data.range.units"] = "ft";
            let range = getProperty(item.data, "data.weaponData.range");
            if (isDistance)
                range = range * 2;
            attackData["data.range.value"] = range.toString();
        }

        if (hasProperty(attackData, "data.templates")) delete attackData["data.templates"];
        let createdAttack = await this.createOwnedItem(expandObject(attackData));

        ui.notifications.info(game.i18n.localize("D35E.NotificationCreatedAttack").format(item.data.name));
        return createdAttack;
    }

    /* -------------------------------------------- */



    /* -------------------------------------------- */

    /**
     * Roll a generic ability test or saving throw.
     * Prompt the user for input on which variety of roll they want to do.
     * @param {String} abilityId     The ability id (e.g. "str")
     * @param {Object} options      Options which configure how ability tests or saving throws are rolled
     */
    rollAbility(abilityId, options = {}) {
        this.rollAbilityTest(abilityId, options);
    }

    rollBAB(options = {}) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        return DicePF.d20Roll({
            event: options.event,
            parts: ["@mod - @drain"],
            data: { mod: this.data.data.attributes.bab.total, drain: this.data.data.attributes.energyDrain || 0 },
            title: game.i18n.localize("D35E.BAB"),
            speaker: ChatMessage.getSpeaker({ actor: this }),
            takeTwenty: false
        });
    }

    rollMelee(options = {}) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        return DicePF.d20Roll({
            event: options.event,
            parts: ["@mod - @drain + @ablMod + @sizeMod + @changeGeneral + @changeAttack"],
            data: { changeGeneral: this.data.data.attributes.attack.general, changeAttack: this.data.data.attributes.attack.ranged, mod: this.data.data.attributes.bab.total, ablMod: this.data.data.abilities.str.mod, drain: this.data.data.attributes.energyDrain || 0, sizeMod: CONFIG.D35E.sizeMods[this.data.data.traits.actualSize] || 0 },
            title: game.i18n.localize("D35E.Melee"),
            speaker: ChatMessage.getSpeaker({ actor: this }),
            takeTwenty: false
        });
    }

    rollRanged(options = {}) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        return DicePF.d20Roll({
            event: options.event,
            parts: ["@mod - @drain + @ablMod + @sizeMod + @changeGeneral + @changeAttack"],
            data: { changeGeneral: this.data.data.attributes.attack.general, changeAttack: this.data.data.attributes.attack.ranged, mod: this.data.data.attributes.bab.total, ablMod: this.data.data.abilities.dex.mod, drain: this.data.data.attributes.energyDrain || 0, sizeMod: CONFIG.D35E.sizeMods[this.data.data.traits.actualSize] || 0 },
            title: game.i18n.localize("D35E.Ranged"),
            speaker: ChatMessage.getSpeaker({ actor: this }),
            takeTwenty: false
        });
    }

    rollCMB(options = {}) {
        this.rollGrapple(null, options)
    }

    getDefenseHeaders() {
        const data = this.data.data;
        const headers = [];

        const reSplit = CONFIG.D35E.re.traitSeparator;
        let misc = [];

        // Damage reduction
        if (data.traits.dr.length) {
            headers.push({ header: game.i18n.localize("D35E.DamRed"), value: data.traits.dr.split(reSplit) });
        }
        // Energy resistance
        if (data.traits.eres.length) {
            headers.push({ header: game.i18n.localize("D35E.EnRes"), value: data.traits.eres.split(reSplit) });
        }
        // Damage vulnerabilities
        if (data.traits.dv.value.length || data.traits.dv.custom.length) {
            const value = [].concat(
                data.traits.dv.value.map(obj => {
                    return CONFIG.D35E.damageTypes[obj];
                }),
                data.traits.dv.custom.length > 0 ? data.traits.dv.custom.split(";") : [],
            );
            headers.push({ header: game.i18n.localize("D35E.DamVuln"), value: value });
        }
        // Condition resistance
        if (data.traits.cres.length) {
            headers.push({ header: game.i18n.localize("D35E.ConRes"), value: data.traits.cres.split(reSplit) });
        }
        // Immunities
        if (data.traits.di.value.length || data.traits.di.custom.length ||
            data.traits.ci.value.length || data.traits.ci.custom.length) {
            const value = [].concat(
                data.traits.di.value.map(obj => {
                    return CONFIG.D35E.damageTypes[obj];
                }),
                data.traits.di.custom.length > 0 ? data.traits.di.custom.split(";") : [],
                data.traits.ci.value.map(obj => {
                    return CONFIG.D35E.conditionTypes[obj];
                }),
                data.traits.ci.custom.length > 0 ? data.traits.ci.custom.split(";") : [],
            );
            headers.push({ header: game.i18n.localize("D35E.ImmunityPlural"), value: value });
        }
        // Spell Resistance
        if (data.attributes.sr.total > 0) {
            misc.push(game.i18n.localize("D35E.SpellResistanceNote").format(data.attributes.sr.total));
        }

        if (misc.length > 0) {
            headers.push({ header: game.i18n.localize("D35E.MiscShort"), value: misc });
        }

        return headers;
    }

    async rollInitiative({ createCombatants = false, rerollInitiative = false, initiativeOptions = {} } = {}) {
        // Obtain (or create) a combat encounter
        let combat = game.combat;
        if (!combat) {
            if (game.user.isGM && canvas.scene) {
                combat = await game.combats.object.create({ scene: canvas.scene._id, active: true });
            } else {
                ui.notifications.warn(game.i18n.localize("COMBAT.NoneActive"));
                return null;
            }
        }

        // Create new combatants
        if (createCombatants) {
            const tokens = this.isToken ? [this.token] : this.getActiveTokens();
            const createData = tokens.reduce((arr, t) => {
                if (t.inCombat) return arr;
                arr.push({ tokenId: t.id, hidden: t.data.hidden });
                return arr;
            }, []);
            await combat.createEmbeddedEntity("Combatant", createData);
        }

        // Iterate over combatants to roll for
        const combatantIds = combat.combatants.reduce((arr, c) => {
            if (c.actor.id !== this.id || (this.isToken && c.tokenId !== this.token.id)) return arr;
            if (c.initiative && !rerollInitiative) return arr;
            arr.push(c._id);
            return arr;
        }, []);
        return combatantIds.length ? combat.rollInitiative(combatantIds, initiativeOptions) : combat;
    }


    /**
     * Make a saving throw, with optional versus check
     * @param _savingThrow Saving throw data
     * @param ability Saving throw ability
     * @param target target saving throw dc
     * @param options options
     * @returns {Promise<unknown>|void}
     */
    async rollSavingThrow(_savingThrow,ability, target, options = {}) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));
        if (_savingThrow === "fort") _savingThrow = "fortitudenegates"
        if (_savingThrow === "ref") _savingThrow = "reflexnegates"
        if (_savingThrow === "will") _savingThrow = "willnegates"

        const _roll = async function (saveType, ability, baseAbility, target, form,props) {
            let savingThrowBonus = getProperty(this.data,`data.attributes.savingThrows.${saveType}.total`) || 0,
                optionalFeatIds = [],
                optionalFeatRanges = new Map(),
                rollMode = null;
            savingThrowBonus -= getProperty(this.data,`data.abilities.${baseAbility}.mod`) || 0
            savingThrowBonus += getProperty(this.data,`data.abilities.${ability}.mod`) || 0
            let savingThrowManualBonus = 0;
           // Get data from roll form
            if (form) {
                rollData.savingThrowBonus = form.find('[name="st-bonus"]').val();
                if (rollData.savingThrowBonus) savingThrowManualBonus += new Roll35e(rollData.savingThrowBonus).roll().total;
                rollMode = form.find('[name="rollMode"]').val();

                $(form).find('[data-type="optional"]').each(function () {
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
            }

            // Parse combat changes
            let allCombatChanges = []
            let rollModifiers = []
            let attackType = 'savingThrow';
            allCombatChanges = this._getAllSelectedCombatChangesForRoll(attackType, rollData, allCombatChanges, rollModifiers, optionalFeatIds, optionalFeatRanges);

            if (rollModifiers.length > 0) props.push({
                header: game.i18n.localize("D35E.RollModifiers"),
                value: rollModifiers
            });

            this._addCombatChangesToRollData(allCombatChanges, rollData);
            rollData.featSavingThrow = rollData.featSavingThrow || 0;
            rollData.savingThrowBonus = savingThrowBonus;
            rollData.savingThrowManualBonus = savingThrowManualBonus

            let roll = new Roll35e("1d20 + @savingThrowBonus + @savingThrowManualBonus + @featSavingThrow", rollData).roll();
            // Set chat data
            let chatData = {
                speaker: ChatMessage.getSpeaker({actor: this.data}),
                rollMode: rollMode || "gmroll",
                sound: CONFIG.sounds.dice,
                "flags.D35E.noRollRender": true,
            };
            let chatTemplateData = {
                name: this.name,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                rollMode: rollMode || "gmroll",
            };
            const templateData = mergeObject(chatTemplateData, {
                img: this.img,
                saveTypeName: game.i18n.localize(CONFIG.D35E.savingThrows[saveType]),
                roll: roll,
                total: roll.total,
                result: roll.result,
                target: target,
                tooltip: $(await roll.getTooltip()).prepend(`<div class="dice-formula">${roll.formula}</div>`)[0].outerHTML,
                success: target && roll.total >= target,
                properties: props,
                hasProperties: props.length > 0
            }, {inplace: false});
            // Create message

            await createCustomChatMessage("systems/D35E/templates/chat/saving-throw.html", templateData, chatData, {rolls: [roll]});
        }

        let savingThrowId = "";
        let savingThrowAbility = ability;
        let savingThrowBaseAbility = savingThrowAbility;
        if (_savingThrow === "willnegates" || _savingThrow === "willhalf" || _savingThrow === "willpartial") {
            savingThrowId = "will";
            savingThrowBaseAbility = "wis"
            if (!savingThrowAbility || savingThrowAbility?.event) savingThrowAbility = "wis"
            if (savingThrowAbility === "") savingThrowAbility = "wis"
        } else if (_savingThrow === "reflexnegates" || _savingThrow === "reflexhalf" || _savingThrow === "reflexpartial") {
            savingThrowId = "ref";
            savingThrowBaseAbility = "dex"
            if (!savingThrowAbility || savingThrowAbility?.event) savingThrowAbility = "dex"
            if (savingThrowAbility === "") savingThrowAbility = "dex"
        } else if (_savingThrow === "fortitudenegates" || _savingThrow === "fortitudehalf" || _savingThrow === "fortitudepartial") {
            savingThrowId = "fort";
            savingThrowBaseAbility = "con"
            if (!savingThrowAbility || savingThrowAbility?.event) savingThrowAbility = "con"
            if (savingThrowAbility === "") savingThrowAbility = "con"
        }
        // Add contextual notes
        let notes = [];
        const rollData = duplicate(this.getRollData());
        const noteObjects = this.getContextNotes(`savingThrow.${savingThrowId}`);
        for (let noteObj of noteObjects) {
            rollData.item = {};
            if (noteObj.item != null) rollData.item = duplicate(new ItemPF(noteObj.item.data, { owner: this.owner }));

            for (let note of noteObj.notes) {
                if (!isMinimumCoreVersion("0.5.2")) {
                    let noteStr = "";
                    if (note.length > 0) {
                        noteStr = DicePF.messageRoll({
                            data: rollData,
                            msgStr: note
                        });
                    }
                    if (noteStr.length > 0) notes.push(...noteStr.split(/[\n\r]+/));
                } else notes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(ItemPF._fillTemplate(o, rollData), { rollData: rollData })));
            }
        }
        let props = this.getDefenseHeaders();
        if (notes.length > 0) props.push({ header: game.i18n.localize("D35E.Notes"), value: notes });
        const label = CONFIG.D35E.savingThrows[savingThrowId];
        const savingThrow = this.data.data.attributes.savingThrows[savingThrowId];
        rollData.savingThrow = savingThrowId;


        let template = "systems/D35E/templates/apps/saving-throw-roll-dialog.html";
        let dialogData = {
            data: rollData,
            savingThrow: savingThrow,
            id: `${this.id}-${_savingThrow}`,
            rollMode: game.settings.get("core", "rollMode"),
            rollModes: CONFIG.Dice.rollModes,
            stFeats: this.items.filter(o => this.isCombatChangeItemType(o) && o.hasCombatChange('savingThrow',rollData)),
            stFeatsOptional: this.items.filter(o => this.isCombatChangeItemType(o) && o.hasCombatChange(`savingThrowOptional`,rollData)),
            label: label,
        };
        const html = await renderTemplate(template, dialogData);
        let roll;
        const buttons = {};
        let wasRolled = false;
        buttons.normal = {
            label: game.i18n.localize("D35E.Roll"),
            callback: html => {
                wasRolled = true;
                roll = _roll.call(this,savingThrowId,savingThrowAbility,savingThrowBaseAbility,target,html,props)
            }
        };
        await new Promise(resolve => {
            new Dialog({
                title: `${game.i18n.localize("D35E.STRollSavingThrow")}`,
                content: html,
                buttons: buttons,
                classes: ['custom-dialog','wide'],
                default: "normal",
                close: html => {
                    return resolve(roll);
                }
            }).render(true);
        });
    };

    isCombatChangeItemType(o) {
        return o.type === "feat" || (o.type === "buff" && o.data.data.active) || (o.type === "equipment" && o.data.data.equipped === true && !o.data.data.melded);
    }

    /**
     * Roll a Skill Check
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param {string} skillId      The skill id (e.g. "ins")
     * @param {Object} options      Options which configure how the skill check is rolled
     */
    async rollSkill(skillId, options = {}) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        const _roll = async function (target, form, props, sklName, skillRollFormula) {
            let optionalFeatIds = [],
                skillModTotal = skl.mod,
                optionalFeatRanges = new Map(),
                rollMode = null;
            let skillManualBonus = 0;
            // Get data from roll form
            if (form) {
                skillManualBonus = form.find('[name="sk-bonus"]').val() || 0;

                rollMode = form.find('[name="rollMode"]').val();

                $(form).find('[data-type="optional"]').each(function () {
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
            }

            // Parse combat changes
            let allCombatChanges = []
            let rollModifiers = []
            let attackType = 'skill';
            allCombatChanges = this._getAllSelectedCombatChangesForRoll(attackType, rollData, allCombatChanges, rollModifiers, optionalFeatIds, optionalFeatRanges);

            if (rollModifiers.length > 0) props.push({
                header: game.i18n.localize("D35E.RollModifiers"),
                value: rollModifiers
            });

            this._addCombatChangesToRollData(allCombatChanges, rollData);
            rollData.featSkillBonus = rollData.featSkillBonus || 0;
            rollData.skillModTotal = skillModTotal;
            rollData.skillManualBonus = skillManualBonus

            let roll = new Roll35e(skillRollFormula + " + @skillModTotal + @skillManualBonus + @featSkillBonus", rollData).roll();

            const token = this ? this.token : null;

            // Set chat data
            let chatData = {
                speaker: ChatMessage.getSpeaker({actor: this.data}),
                rollMode: rollMode || "gmroll",
                sound: CONFIG.sounds.dice,
                "flags.D35E.noRollRender": true
            };
            let chatTemplateData = {
                name: this.name,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                rollMode: rollMode || "gmroll",
                tokenId: token ? `${token.scene._id}.${token.id}` : null,
                actor: this
            };
            const templateData = mergeObject(chatTemplateData, {
                img: this.img,
                roll: roll,
                sklName: sklName,
                total: roll.total,
                result: roll.result,
                skl: skl,
                tooltip: $(await roll.getTooltip()).prepend(`<div class="dice-formula">${roll.formula}</div>`)[0].outerHTML,
                success: target && roll.total >= target,
                properties: props,
                hasProperties: props.length > 0
            }, {inplace: false});
            // Create message

            await createCustomChatMessage("systems/D35E/templates/chat/skill.html", templateData, chatData, {rolls: [roll]});
        }

        // Generating Skill Name
        let skl, sklName;
        const skillParts = skillId.split("."),
            isSubSkill = skillParts[1] === "subSkills" && skillParts.length === 3;
        if (isSubSkill) {
            skillId = skillParts[0];
            skl = this.data.data.skills[skillId].subSkills[skillParts[2]];
            sklName = `${CONFIG.D35E.skills[skillId]} (${skl.name})`;
        } else {
            skl = this.data.data.skills[skillId];
            if (skl.name != null) sklName = skl.name;
            else sklName = CONFIG.D35E.skills[skillId];
        }

        // Add contextual notes
        let props = [];
        let notes = [];
        const rollData = duplicate(this.getRollData());
        rollData.skillId = skillId
        const noteObjects = this.getContextNotes(`skill.${isSubSkill ? skillParts[2] : skillId}`);
        for (let noteObj of noteObjects) {
            rollData.item = {};
            if (noteObj.item != null) rollData.item = duplicate(new ItemPF(noteObj.item.data, {owner: this.owner}));

            for (let note of noteObj.notes) {
                notes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(ItemPF._fillTemplate(o, rollData), {rollData: rollData})));
            }
        }
        if (skl.rt && skl.rank === 0) {
            notes.push(game.i18n.localize("D35E.Untrained"));
        }

        if (notes.length > 0) props.push({header: "Notes", value: notes});

        const label = sklName;


        let template = "systems/D35E/templates/apps/skill-roll-dialog.html";
        let dialogData = {
            data: rollData,
            rollMode: game.settings.get("core", "rollMode"),
            rollModes: CONFIG.Dice.rollModes,
            skFeats: this.items.filter(o => this.isCombatChangeItemType(o) && o.hasCombatChange('skill',rollData)),
            skFeatsOptional: this.items.filter(o => this.isCombatChangeItemType(o) && o.hasCombatChange(`skillOptional`,rollData)),
            label: label,
        };
        const html = await renderTemplate(template, dialogData);
        let roll;
        const buttons = {};
        let wasRolled = false;
        buttons.takeTen = {
            label: game.i18n.localize("D35E.Take10"),
            callback: html => {
                wasRolled = true;
                roll = _roll.call(this,skl,html,props, sklName, "10")
            }
        };
        buttons.takeTwenty = {
            label: game.i18n.localize("D35E.Take20"),
            callback: html => {
                wasRolled = true;
                roll = _roll.call(this,skl,html,props, sklName, "20")
            }
        };
        buttons.normal = {
            label: game.i18n.localize("D35E.Roll"),
            callback: html => {
                wasRolled = true;
                roll = _roll.call(this,skl,html,props, sklName, "1d20")
            }
        };
        await new Promise(resolve => {
            new Dialog({
                title: sklName,
                content: html,
                buttons: buttons,
                classes: ['custom-dialog','wide'],
                default: "normal",
                close: html => {
                    return resolve(roll);
                }
            }).render(true);
        });
    }

    _getAllSelectedCombatChangesForRoll(attackType, rollData, allCombatChanges, rollModifiers, optionalFeatIds, optionalFeatRanges) {
        this.items.filter(o => this.isCombatChangeItemType(o)).forEach(i => {
            if (i.hasCombatChange(attackType, rollData)) {
                allCombatChanges = allCombatChanges.concat(i.getPossibleCombatChanges(attackType, rollData))
                rollModifiers.push(`${i.name}`)
            }
            if (i.hasCombatChange(attackType + 'Optional', rollData) && optionalFeatIds.indexOf(i._id) !== -1) {
                allCombatChanges = allCombatChanges.concat(i.getPossibleCombatChanges(attackType + 'Optional', rollData, optionalFeatRanges.get(i._id)))

                if (optionalFeatRanges.get(i._id)) {
                    let ranges = []
                    if (optionalFeatRanges.get(i._id).base) ranges.push(optionalFeatRanges.get(i._id).base)
                    if (optionalFeatRanges.get(i._id).slider1) ranges.push(optionalFeatRanges.get(i._id).slider1)
                    if (optionalFeatRanges.get(i._id).slider2) ranges.push(optionalFeatRanges.get(i._id).slider2)
                    if (optionalFeatRanges.get(i._id).slider3) ranges.push(optionalFeatRanges.get(i._id).slider3)
                    rollModifiers.push(`${i.name} (${ranges.join(", ")})`)
                }
                else
                    rollModifiers.push(`${i.name}`)

                i.addCharges(-1 * (i.data.data.combatChangesUsesCost === 'chargesPerUse' ? i.data.data?.uses?.chargesPerUse || 1 : optionalFeatRanges.get(i._id).base));
            }
        });
        return allCombatChanges;
    }

    /**
     * Make a grapple roll, with optional versus check
     * @param target target saving throw dc
     * @param options options
     * @returns {Promise<unknown>|void}
     */
    async rollGrapple(target, options = {}) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        const _roll = async function (target, form,props) {
            let grappleModTotal = this.data.data.attributes.cmb.total - (this.data.data.attributes.energyDrain || 0),
                optionalFeatIds = [],
                optionalFeatRanges = new Map(),
                rollMode = null;
            let grappleManualBonus = 0;
            // Get data from roll form
            if (form) {
                grappleManualBonus = form.find('[name="gr-bonus"]').val() || 0;

                rollMode = form.find('[name="rollMode"]').val();

                $(form).find('[data-type="optional"]').each(function () {
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
            }

            // Parse combat changes
            let allCombatChanges = []
            let rollModifiers = []
            let attackType = 'grapple';
            allCombatChanges = this._getAllSelectedCombatChangesForRoll(attackType, rollData, allCombatChanges, rollModifiers, optionalFeatIds, optionalFeatRanges);

            if (rollModifiers.length > 0) props.push({
                header: game.i18n.localize("D35E.RollModifiers"),
                value: rollModifiers
            });

            this._addCombatChangesToRollData(allCombatChanges, rollData);
            rollData.featGrappleBonus = rollData.featGrappleBonus || 0;
            rollData.grappleModTotal = grappleModTotal;
            rollData.grappleManualBonus = grappleManualBonus


            let roll = new Roll35e("1d20 + @grappleModTotal + @grappleManualBonus + @featGrappleBonus", rollData).roll();


            let actions = []
            if (!target) {
                actions.push({
                    label: `${game.i18n.localize("D35E.CMB")} ${game.i18n.localize("D35E.Check")}`,
                    value: `Grapple ${roll.total} on target;`,
                    isTargeted: false,
                    action: "customAction",
                    img: "",
                    hasImg: false
                });
            } else if (target && roll.total < target) {
                actions.push({
                    label: `${game.i18n.localize("D35E.Begin")} ${game.i18n.localize("D35E.CMB")}`,
                    value: `Condition set grappled to true on target;`,
                    isTargeted: false,
                    action: "customAction",
                    img: "",
                    hasImg: false
                });
            }

            const token = this ? this.token : null;

            // Set chat data
            let chatData = {
                speaker: ChatMessage.getSpeaker({actor: this.data}),
                rollMode: rollMode || "gmroll",
                sound: CONFIG.sounds.dice,
                "flags.D35E.noRollRender": true
            };
            let chatTemplateData = {
                name: this.name,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                rollMode: rollMode || "gmroll",
                tokenId: token ? `${token.scene._id}.${token.id}` : null,
                actorId: this.id
            };
            const templateData = mergeObject(chatTemplateData, {
                img: this.img,
                roll: roll,
                total: roll.total,
                result: roll.result,
                target: target,
                tooltip: $(await roll.getTooltip()).prepend(`<div class="dice-formula">${roll.formula}</div>`)[0].outerHTML,
                success: target && roll.total >= target,
                properties: props,
                hasProperties: props.length > 0,
                actions: actions
            }, {inplace: true});
            // Create message


            await createCustomChatMessage("systems/D35E/templates/chat/grapple.html", templateData, chatData, {rolls: [roll]});
        }

        // Add contextual notes
        let notes = [];
        const rollData = duplicate(this.getRollData());
        const noteObjects = this.getContextNotes(`"misc.cmb"`);
        for (let noteObj of noteObjects) {
            rollData.item = {};
            if (noteObj.item != null) rollData.item = duplicate(new ItemPF(noteObj.item.data, { owner: this.owner }));

            for (let note of noteObj.notes) {
                if (!isMinimumCoreVersion("0.5.2")) {
                    let noteStr = "";
                    if (note.length > 0) {
                        noteStr = DicePF.messageRoll({
                            data: rollData,
                            msgStr: note
                        });
                    }
                    if (noteStr.length > 0) notes.push(...noteStr.split(/[\n\r]+/));
                } else notes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(ItemPF._fillTemplate(o, rollData), { rollData: rollData })));
            }
        }
        let props = this.getDefenseHeaders();
        if (notes.length > 0) props.push({ header: game.i18n.localize("D35E.Notes"), value: notes });
        const label = game.i18n.localize("D35E.CMB");


        let template = "systems/D35E/templates/apps/grapple-roll-dialog.html";
        let dialogData = {
            data: rollData,
            rollMode: game.settings.get("core", "rollMode"),
            rollModes: CONFIG.Dice.rollModes,
            grFeats: this.items.filter(o => this.isCombatChangeItemType(o) && o.hasCombatChange('grapple',rollData)),
            grFeatsOptional: this.items.filter(o => this.isCombatChangeItemType(o) && o.hasCombatChange(`grappleOptional`,rollData)),
            label: label,
        };
        const html = await renderTemplate(template, dialogData);
        let roll;
        const buttons = {};
        let wasRolled = false;
        buttons.normal = {
            label: game.i18n.localize("D35E.Roll"),
            callback: html => {
                wasRolled = true;
                roll = _roll.call(this,target,html,props)
            }
        };
        await new Promise(resolve => {
            new Dialog({
                title: `${game.i18n.localize("D35E.GRRollGrapple")}`,
                content: html,
                buttons: buttons,
                classes: ['custom-dialog','wide'],
                default: "normal",
                close: html => {
                    return resolve(roll);
                }
            }).render(true);
        });
    };


    _addCombatChangesToRollData(allCombatChanges, rollData) {
        for (const change of allCombatChanges) {
            console.log('D35E | Change', change[4])
            if (change[3].indexOf('$') !== -1) {
                setProperty(rollData, change[3].substr(1), ItemPF._fillTemplate(change[4], rollData))
            } else if (change[3].indexOf('&') !== -1) {
                setProperty(rollData, change[3].substr(1), (getProperty(rollData, change[3]) || "") + ItemPF._fillTemplate(change[4], rollData))
            } else {
                setProperty(rollData, change[3], (getProperty(rollData, change[3]) || 0) + (change[4] || 0))
            }
        }
    }

    /* -------------------------------------------- */

    /**
     * Roll an Ability Test
     * Prompt the user for input regarding Advantage/Disadvantage and any Situational Bonus
     * @param {String} abilityId    The ability ID (e.g. "str")
     * @param {Object} options      Options which configure how ability tests are rolled
     */
    rollAbilityTest(abilityId, options = {}) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        // Add contextual notes
        let notes = [];
        const rollData = duplicate(this.data.data);
        const noteObjects = this.getContextNotes(`abilityChecks.${abilityId}`);
        for (let noteObj of noteObjects) {
            rollData.item = {};
            if (noteObj.item != null) rollData.item = duplicate(new ItemPF(noteObj.item.data, { owner: this.owner }));

            for (let note of noteObj.notes) {
                if (!isMinimumCoreVersion("0.5.2")) {
                    let noteStr = "";
                    if (note.length > 0) {
                        noteStr = DicePF.messageRoll({
                            data: rollData,
                            msgStr: note
                        });
                    }
                    if (noteStr.length > 0) notes.push(...noteStr.split(/[\n\r]+/));
                } else notes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(ItemPF._fillTemplate(o, rollData), { rollData: rollData })));
            }
        }

        let props = this.getDefenseHeaders();
        if (notes.length > 0) props.push({ header: "Notes", value: notes });
        const label = CONFIG.D35E.abilities[abilityId];
        const abl = this.data.data.abilities[abilityId];
        return DicePF.d20Roll({
            event: options.event,
            parts: ["@mod + @checkMod - @drain"],
            data: { mod: abl.mod, checkMod: abl.checkMod, drain: this.data.data.attributes.energyDrain || 0 },
            title: game.i18n.localize("D35E.AbilityTest").format(label),
            speaker: ChatMessage.getSpeaker({ actor: this }),
            chatTemplate: "systems/D35E/templates/chat/roll-ext.html",
            chatTemplateData: { hasProperties: props.length > 0, properties: props }
        });
    }


    async rollTurnUndead(name = "Undead") {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));
        const rollData = duplicate(this.data.data);
        let turnUndeadHdTotal = this.data.data.attributes.turnUndeadHdTotal
        let turnUndeadUses = this.data.data.attributes.turnUndeadUses
        if (turnUndeadHdTotal < 1) {
            return ui.notifications.warn(game.i18n.localize("D35E.CannotTurnUndead").format(this.name));
        }
        // if (turnUndeadUses < 1) {
        //     return ui.notifications.warn(game.i18n.localize("D35E.CannotTurnUndead").format(this.name));
        // }
        let rolls = []
        let knowledgeMod = this.data.data.skills.kre.rank > 5 ? 2 : 0
        let chaMod = this.data.data.abilities.cha.mod
        let maxHdResult = new Roll35e("1d20 + @chaMod + @kMod", { kMod: knowledgeMod, chaMod: chaMod }).roll()
        rolls.push(maxHdResult);
        let data = {}
        data.actor = this
        data.name = this.name
        data.kMod = knowledgeMod
        data.chaMod = chaMod
        data.maxHDResult = maxHdResult
        if (maxHdResult.total > 21) {
            data.maxHD = turnUndeadHdTotal + 4
            data.diffHD = "+ 4"
        } else if (maxHdResult.total > 18) {
            data.maxHD = turnUndeadHdTotal + 3
            data.diffHD = "+ 3"
        } else if (maxHdResult.total > 15) {
            data.maxHD = turnUndeadHdTotal + 2
            data.diffHD = "+ 2"
        } else if (maxHdResult.total > 12) {
            data.maxHD = turnUndeadHdTotal + 1
            data.diffHD = "+ 1"
        } else if (maxHdResult.total > 9) {
            data.maxHD = turnUndeadHdTotal
        } else if (maxHdResult.total > 6) {
            data.maxHD = turnUndeadHdTotal - 1
            data.diffHD = "- 1"
        } else if (maxHdResult.total > 3) {
            data.maxHD = turnUndeadHdTotal - 2
            data.diffHD = "- 2"
        } else if (maxHdResult.total > 0) {
            data.maxHD = turnUndeadHdTotal - 3
            data.diffHD = "- 3"
        } else {
            data.maxHD = turnUndeadHdTotal - 4
            data.diffHD = "- 4"
        }


        {
            let tooltip = $(await maxHdResult.getTooltip()).prepend(`<div class="dice-formula">${maxHdResult.formula}</div>`)[0].outerHTML;
            // Alter tooltip
            let tooltipHtml = $(tooltip);
            let totalText = maxHdResult.total.toString();
            tooltipHtml.find(".part-total").text(totalText);
            data.maxHDResult.tooltip = tooltipHtml[0].outerHTML;

        }

        let damageHD = new Roll35e("2d6 + @chaMod + @level", { level: turnUndeadHdTotal, chaMod: chaMod }).roll()
        rolls.push(damageHD)
        data.damageHD = damageHD
        data.undeadName = name;
        {
            let tooltip = $(await damageHD.getTooltip()).prepend(`<div class="dice-formula">${damageHD.formula}</div>`)[0].outerHTML;
            // Alter tooltip
            let tooltipHtml = $(tooltip);
            let totalText = damageHD.total.toString();
            tooltipHtml.find(".part-total").text(totalText);
            data.damageHD.tooltip = tooltipHtml[0].outerHTML;
        }

        let chatData = {
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            sound: CONFIG.sounds.dice,
            "flags.D35E.noRollRender": true,
        };


        data.level = turnUndeadHdTotal;

        createCustomChatMessage("systems/D35E/templates/chat/turn-undead.html", data, chatData, {rolls: rolls});
        let updateData = {}
        updateData[`data.attributes.turnUndeadUses`] = this.data.data.attributes.turnUndeadUses - 1;
        this.update(updateData)
    }


    /**
     * Display defenses in chat.
     */
    displayDefenses() {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));
        const rollData = duplicate(this.data.data);

        // Add contextual AC notes
        let acNotes = [];
        if (this.data.data.attributes.acNotes.length > 0) acNotes = this.data.data.attributes.acNotes.split(/[\n\r]+/);
        const acNoteObjects = this.getContextNotes("misc.ac");
        for (let noteObj of acNoteObjects) {
            rollData.item = {};
            if (noteObj.item != null) rollData.item = duplicate(new ItemPF(noteObj.item.data, { owner: this.owner }));

            for (let note of noteObj.notes) {
                if (!isMinimumCoreVersion("0.5.2")) {
                    let noteStr = "";
                    if (note.length > 0) {
                        noteStr = DicePF.messageRoll({
                            data: rollData,
                            msgStr: note
                        });
                    }
                    if (noteStr.length > 0) acNotes.push(...noteStr.split(/[\n\r]+/));
                } else acNotes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(ItemPF._fillTemplate(o, rollData), { rollData: rollData })));
            }
        }

        // Add contextual CMD notes
        let cmdNotes = [];
        if (this.data.data.attributes.cmdNotes.length > 0) cmdNotes = this.data.data.attributes.cmdNotes.split(/[\n\r]+/);
        const cmdNoteObjects = this.getContextNotes("misc.cmd");
        for (let noteObj of cmdNoteObjects) {
            rollData.item = {};
            if (noteObj.item != null) rollData.item = duplicate(new ItemPF(noteObj.item.data, { owner: this.owner }));

            for (let note of noteObj.notes) {
                if (!isMinimumCoreVersion("0.5.2")) {
                    let noteStr = "";
                    if (note.length > 0) {
                        noteStr = DicePF.messageRoll({
                            data: rollData,
                            msgStr: note
                        });
                    }
                    if (noteStr.length > 0) cmdDotes.push(...noteStr.split(/[\n\r]+/));
                } else cmdNotes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(ItemPF._fillTemplate(o, rollData), { rollData: rollData })));
            }
        }

        // Add contextual SR notes
        let srNotes = [];
        if (this.data.data.attributes.srNotes.length > 0) srNotes = this.data.data.attributes.srNotes.split(/[\n\r]+/);
        const srNoteObjects = this.getContextNotes("misc.sr");
        for (let noteObj of srNoteObjects) {
            rollData.item = {};
            if (noteObj.item != null) rollData.item = duplicate(new ItemPF(noteObj.item.data, { owner: this.owner }));

            for (let note of noteObj.notes) {
                if (!isMinimumCoreVersion("0.5.2")) {
                    let noteStr = "";
                    if (note.length > 0) {
                        noteStr = DicePF.messageRoll({
                            data: rollData,
                            msgStr: note
                        });
                    }
                    if (noteStr.length > 0) srNotes.push(...noteStr.split(/[\n\r]+/));
                } else srNotes.push(...note.split(/[\n\r]+/).map(o => TextEditor.enrichHTML(ItemPF._fillTemplate(o, rollData), { rollData: rollData })));
            }
        }

        // Add misc data
        const reSplit = CONFIG.D35E.re.traitSeparator;
        // Damage Reduction
        let drNotes = [];
        if (this.data.data.traits.dr.length) {
            drNotes = this.data.data.traits.dr.split(reSplit);
        }
        // Energy Resistance
        let energyResistance = [];
        if (this.data.data.traits.eres.length) {
            energyResistance.push(...this.data.data.traits.eres.split(reSplit));
        }
        // Damage Immunity
        if (this.data.data.traits.di.value.length || this.data.data.traits.di.custom.length) {
            const values = [
                ...this.data.data.traits.di.value.map(obj => {
                    return CONFIG.D35E.damageTypes[obj];
                }),
                ...this.data.data.traits.di.custom.length > 0 ? this.data.data.traits.di.custom.split(reSplit) : [],
            ];
            energyResistance.push(...values.map(o => game.i18n.localize("D35E.ImmuneTo").format(o)));
        }
        // Damage Vulnerability
        if (this.data.data.traits.dv.value.length || this.data.data.traits.dv.custom.length) {
            const values = [
                ...this.data.data.traits.dv.value.map(obj => {
                    return CONFIG.D35E.damageTypes[obj];
                }),
                ...this.data.data.traits.dv.custom.length > 0 ? this.data.data.traits.dv.custom.split(reSplit) : [],
            ];
            energyResistance.push(...values.map(o => game.i18n.localize("D35E.VulnerableTo").format(o)));
        }

        // Create message
        const d = this.data.data;
        const data = {
            actor: this,
            name: this.name,
            tokenId: this.token ? `${this.token.scene._id}.${this.token.id}` : null,
            ac: {
                normal: d.attributes.ac.normal.total,
                touch: d.attributes.ac.touch.total,
                flatFooted: d.attributes.ac.flatFooted.total,
                notes: acNotes,
            },
            cmd: {
                normal: d.attributes.cmd.total,
                flatFooted: d.attributes.cmd.flatFootedTotal,
                notes: cmdNotes,
            },
            misc: {
                sr: d.attributes.sr.total,
                srNotes: srNotes,
                drNotes: drNotes,
                energyResistance: energyResistance,
            },
        };
        // Add regeneration and fast healing
        if ((getProperty(d, "traits.fastHealingTotal") || "").length || (getProperty(d, "traits.regenTotal") || "").length) {
            data.regen = {
                regen: d.traits.regenTotal,
                fastHealing: d.traits.fastHealingTotal,
            };
        }
        createCustomChatMessage("systems/D35E/templates/chat/defenses.html", data, {
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        });
    }

    /* -------------------------------------------- */

    /**
     * Make AC test using Combat Changes bonuses
     * @param ev event
     * @param skipDialog option to ship dialog and use default roll
     * @returns {Promise<unknown>}
     */
    async rollDefenseDialog({ev = null, skipDialog = false} = {}) {
        const _roll = async function (acType, form) {

            let rollModifiers = []
            let ac = getProperty(this.data,`data.attributes.ac.${acType}.total`) || 0,
                optionalFeatIds = [],
                optionalFeatRanges = new Map(),
                applyHalf = false,
                noCritical = false,
                applyPrecision = false,
                conceal = false,
                fullConceal = false,
                rollMode = "gmroll";
            // Get form data
            if (form) {

                rollData.acBonus = form.find('[name="ac-bonus"]').val();
                if (rollData.acBonus) ac += new Roll35e(rollData.acBonus).roll().total;


                rollMode = form.find('[name="rollMode"]').val();

                $(form).find('[data-type="optional"]').each(function () {
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

                if (form.find('[name="applyHalf"]').prop("checked")) {
                    applyHalf = true;
                }

                if (form.find('[name="noCritical"]').prop("checked")) {
                    noCritical = true;
                }
                if (form.find('[name="applyPrecision"]').prop("checked")) {
                    applyPrecision = true;
                }
                if (form.find('[name="prone"]').prop("checked")) {
                    ac += new Roll35e("-4").roll().total;
                    rollModifiers.push(`${game.i18n.localize("D35E.Prone")}`)
                }
                if (form.find('[name="squeezing"]').prop("checked")) {
                    ac += new Roll35e("-4").roll().total;
                    rollModifiers.push(`${game.i18n.localize("D35E.Squeezing")}`)
                }
                if (form.find('[name="defense"]').prop("checked")) {

                    if ((this.data.data.skills?.tmb?.rank || 0) >= 25) {
                        ac += new Roll35e(`4+${Math.floor((this.data.data.skills?.tmb?.rank - 25) / 10)}`).roll().total;
                        rollModifiers.push(`${game.i18n.localize("D35E.Defense")} (Epic ${game.i18n.localize("D35E.SkillTmb")})`)
                    } else if ((this.data.data.skills?.tmb?.rank || 0) >= 5) {
                        ac += new Roll35e("+3").roll().total;
                        rollModifiers.push(`${game.i18n.localize("D35E.Defense")} (${game.i18n.localize("D35E.SkillTmb")})`)
                    } else {
                        ac += new Roll35e("+2").roll().total;
                        rollModifiers.push(`${game.i18n.localize("D35E.Defense")}`)
                    }
                }
                if (form.find('[name="totaldefense"]').prop("checked")) {
                    if ((this.data.data.skills?.tmb?.rank || 0) >= 25) {
                        ac += new Roll35e(`8+${2*Math.floor((this.data.data.skills?.tmb?.rank - 25) / 10)}`).roll().total;
                        rollModifiers.push(`${game.i18n.localize("D35E.TotalDefense")} (Epic ${game.i18n.localize("D35E.SkillTmb")})`)
                    } else if ((this.data.data.skills?.tmb?.rank || 0) >= 5) {
                        ac += new Roll35e("+6").roll().total;
                        rollModifiers.push(`${game.i18n.localize("D35E.TotalDefense")} (${game.i18n.localize("D35E.SkillTmb")})`)
                    } else {
                        ac += new Roll35e("+4").roll().total;
                        rollModifiers.push(`${game.i18n.localize("D35E.TotalDefense")}`)
                    }
                }
                if (form.find('[name="covered"]').prop("checked")) {
                    ac += new Roll35e("+4").roll().total;
                    rollModifiers.push(`${game.i18n.localize("D35E.Covered")}`)
                }
                if (form.find('[name="charged"]').prop("checked")) {
                    ac += new Roll35e("-2").roll().total;
                    rollModifiers.push(`${game.i18n.localize("D35E.Charged")}`)
                }

                if (form.find('[name="conceal"]').prop("checked")) {
                    conceal = true;
                }

                if (form.find('[name="fullconceal"]').prop("checked")) {
                    fullConceal = true;
                }
            }

            let allCombatChanges = []
            let attackType = 'defense';

            allCombatChanges = this._getAllSelectedCombatChangesForRoll(attackType, rollData, allCombatChanges, rollModifiers, optionalFeatIds, optionalFeatRanges);



            this._addCombatChangesToRollData(allCombatChanges, rollData);

            ac += rollData.featAC || 0;

            console.log('D35E | Final roll AC', ac)
            return {ac: ac, applyHalf: applyHalf, noCritical: noCritical, noCheck: acType === 'noCheck', rollMode: rollMode, applyPrecision: applyPrecision, rollModifiers: rollModifiers, conceal: conceal, fullConceal: fullConceal};
        }
        let rollData = this.getRollData();
        // Render modal dialog
        let template = "systems/D35E/templates/apps/defense-roll-dialog.html";
        let totalBonus = "+4"
        let defenseBonus = "+2"
        if ((this.data.data.skills?.tmb?.rank || 0) >= 25) {
            totalBonus = `+${8+2*Math.floor((this.data.data.skills?.tmb?.rank - 25) / 10)}`;
            defenseBonus = `+${4+Math.floor((this.data.data.skills?.tmb?.rank - 25) / 10)}`;
        } else if ((this.data.data.skills?.tmb?.rank || 0) >= 5) {
            totalBonus = `+6`;
            defenseBonus = `+3`;
        }
        let dialogData = {
            data: rollData,
            item: this.data.data,
            id: `${this.id}-defensedialog`,
            rollMode: "gmroll",
            totalBonus: totalBonus,
            defenseBonus: defenseBonus,
            rollModes: CONFIG.Dice.rollModes,
            applyHalf: ev.applyHalf,
            defenseFeats: this.items.filter(o => this.isCombatChangeItemType(o) && o.hasCombatChange('defense',rollData)),
            defenseFeatsOptional: this.items.filter(o => this.isCombatChangeItemType(o) && o.hasCombatChange(`defenseOptional`,rollData)),
            conditionals: this.data.data.conditionals,
        };
        const html = await renderTemplate(template, dialogData);
        let roll;
        const buttons = {};
        let wasRolled = false;
        buttons.vsNormal = {
            label: game.i18n.localize("D35E.ACVsNormal"),
            callback: html => {
                wasRolled = true;
                roll = _roll.call(this, 'normal', html)
            }
        };
        buttons.vsTouch = {
            label: game.i18n.localize("D35E.ACvsTouch"),
            callback: html => {
                wasRolled = true;
                roll = _roll.call(this, 'touch', html)
            }
        };
        buttons.vsFlat = {
            label: game.i18n.localize("D35E.ACvsFlat"),
            callback: html => {
                wasRolled = true;
                roll = _roll.call(this, 'flatFooted', html)
            }
        };

        buttons.vsNo = {
            label: game.i18n.localize("D35E.ACvsNoCheck"),
            callback: html => {
                wasRolled = true;
                roll = _roll.call(this, 'noCheck', html)
            }
        };
        let finalAc = await new Promise(resolve => {
            new Dialog({
                title: `${game.i18n.localize("D35E.ACRollDefense")}`,
                content: html,
                buttons: buttons,
                classes: ['custom-dialog','wide'],
                default: buttons.multi != null ? "multi" : "normal",
                close: html => {
                    return resolve(roll);
                }
            }).render(true);
        });

        console.log('D35E | Final dialog AC', finalAc)
        return finalAc || {ac: -1, applyHalf: false, noCritical: false};
    }

    static async applyAbilityDamage(damage, ability, actor = null) {
        let tokensList = [];
        const promises = [];
        if (actor === null) {
            if (game.user.targets.size > 0)
                tokensList = Array.from(game.user.targets);
            else
                tokensList = canvas.tokens.controlled;
            if (!tokensList.length) {
                ui.notifications.warn(game.i18n.localize("D35E.NoTokensSelected"));
                return
            }
        } else {
            tokensList.push({actor: actor})
        }

        for (let t of tokensList) {
            let a = t.actor,
                abilityField = `data.abilities.${ability}.damage`,
                abilityDamage = a.data.data.abilities[ability].damage || 0,
                updateData = {}
                updateData[abilityField] = abilityDamage + damage
                promises.push(t.actor.update(updateData));
        }
        return Promise.all(promises);
    }

    static async applyAbilityDrain(damage, ability, actor = null) {
        let tokensList = [];
        const promises = [];
        if (actor === null) {
            if (game.user.targets.size > 0)
                tokensList = Array.from(game.user.targets);
            else
                tokensList = canvas.tokens.controlled;
            if (!tokensList.length) {
                ui.notifications.warn(game.i18n.localize("D35E.NoTokensSelected"));
                return
            }
        } else {
            tokensList.push({actor: actor})
        }

        for (let t of tokensList) {
            let a = t.actor,
                abilityField = `data.abilities.${ability}.drain`,
                abilityDrain = a.data.data.abilities[ability].drain || 0,
                updateData = {}
            updateData[abilityField] = abilityDrain + damage
            promises.push(t.actor.update(updateData));
        }
        return Promise.all(promises);
    }


        /**
     * Apply rolled dice damage to the token or tokens which are currently controlled.
     * This allows for damage to be scaled by a multiplier to account for healing, critical hits, or resistance
     *
     * @param {Number} value   The amount of damage to deal.
     * @return {Promise}
     */
    static async applyDamage(ev,roll,critroll,natural20,natural20Crit,fubmle,fumble20Crit,damage,normalDamage,material,alignment,enh, nonLethalDamage, simpleDamage = false, actor = null, attackerId = null, attackerTokenId = null, ammoId = null, incorporeal = false) {

        let value = 0;

        let tokensList = [];
        const promises = [];
        if (actor === null) {
            if (game.user.targets.size > 0)
                tokensList = Array.from(game.user.targets);
            else
                tokensList = canvas.tokens.controlled;
            if (!tokensList.length) {
                ui.notifications.warn(game.i18n.localize("D35E.NoTokensSelected"));
                return
            }
        } else {
            tokensList.push({actor: actor})
        }

        for (let t of tokensList) {

            let a = t.actor,
                hp = a.data.data.attributes.hp,
                _nonLethal = a.data.data.attributes.hp.nonlethal || 0,
                nonLethal = 0,
                tmp = parseInt(hp.temp) || 0,
                hit = false,
                crit = false;

            if (!a.testUserPermission(game.user, "OWNER")) {
                ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));
                continue;
            }
            if (simpleDamage) {
                hit = true
                value = damage;
            } else {
                let finalAc = {}
                if (fubmle)
                    return;
                if (ev.originalEvent instanceof MouseEvent && (ev.originalEvent.shiftKey)) {
                    finalAc.noCheck = true
                    finalAc.ac = 0;
                    finalAc.noCritical = false;
                    finalAc.applyHalf = ev.applyHalf === true;
                } else {
                    if (roll > -1337) { // Spell roll value
                        finalAc = await a.rollDefenseDialog({ev: ev});
                        if (finalAc.ac === -1) continue;
                    } else {
                        finalAc.applyHalf = ev.applyHalf === true;
                    }
                }
                let concealMiss = false;
                let concealRoll = 0;
                let concealTarget = 0;
                let concealRolled = false;
                if (finalAc.conceal || finalAc.fullConceal || a.data.data.attributes?.concealment?.total) {
                    concealRolled = true;
                    concealRoll = new Roll35e("1d100").roll().total;
                    if (finalAc.fullConceal) concealTarget = 50
                    if (finalAc.conceal) concealTarget = 20
                    concealTarget = Math.max(a.data.data.attributes?.concealment?.total || 0, concealTarget)
                    if (concealRoll <= concealTarget) {
                        concealMiss = true;
                    }
                }
                hit = ((roll >= finalAc.ac || roll === -1337 || natural20) && !concealMiss) || finalAc.noCheck // This is for spells and natural 20
                crit = (critroll >= finalAc.ac || (critroll && finalAc.noCheck) || natural20Crit)
                    && !finalAc.noCritical
                    && !fumble20Crit
                let damageData = null
                let noPrecision = false;
                // Fortitifcation / crit resistance
                let fortifyRolled = false;
                let fortifySuccessfull = false;
                let fortifyValue = 0;
                let fortifyRoll = 0;
                if (hit && a.data.data.attributes.fortification?.total) {
                    fortifyRolled = true
                    fortifyValue = a.data.data.attributes.fortification?.total;
                    fortifyRoll = new Roll35e("1d100").roll().total;
                    if (fortifyRoll <= fortifyValue) {
                        fortifySuccessfull = true;
                        crit = false;
                        if (!finalAc.applyPrecision)
                            noPrecision = true;
                    }
                }
                if (crit) {
                    damageData = DamageTypes.calculateDamageToActor(a, damage, material, alignment, enh, nonLethalDamage,noPrecision,incorporeal)
                } else {
                    if (natural20 || (critroll && hit)) //Natural 20 or we had a crit roll, no crit but base attack hit
                        damageData = DamageTypes.calculateDamageToActor(a, normalDamage, material, alignment, enh, nonLethalDamage,noPrecision,incorporeal)
                    else
                        damageData = DamageTypes.calculateDamageToActor(a, damage, material, alignment, enh, nonLethalDamage,noPrecision,incorporeal)
                }
                value = damageData.damage;
                if (finalAc.applyHalf)
                    value = Math.max(Math.floor(value/2),1);
                nonLethal += damageData.nonLethalDamage;
                if (finalAc.applyHalf && nonLethal)
                    nonLethal =  Math.max(Math.floor(nonLethal/2),1);

                damageData.nonLethalDamage = nonLethal
                damageData.displayDamage = value
                let props = []
                if ((finalAc.rollModifiers || []).length > 0) props.push({
                    header: game.i18n.localize("D35E.RollModifiers"),
                    value: finalAc.rollModifiers
                });
                let ammoRecovered = false
                if (game.settings.get("D35E", "useAutoAmmoRecovery")) {
                    if (ammoId && attackerId && !hit) {

                        let recoveryRoll = new Roll35e("1d100").roll().total;
                        if (recoveryRoll < 50) {
                            let _attacker = game.actors.get(attackerId);
                            ammoRecovered = true;
                            await _attacker.quickChangeItemQuantity(ammoId, 1)
                        }
                    }
                }
                // Set chat data
                let chatData = {
                    speaker: ChatMessage.getSpeaker({actor: a.data}),
                    rollMode: finalAc.rollMode || "gmroll",
                    sound: CONFIG.sounds.dice,
                    "flags.D35E.noRollRender": true,
                };
                let chatTemplateData = {
                    name: a.name,
                    type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                    rollMode: finalAc.rollMode || "gmroll",
                };
                const templateData = mergeObject(chatTemplateData, {
                    damageData: damageData,
                    img: a.img,
                    roll: roll,
                    ac: finalAc,
                    hit: hit,
                    crit: crit,
                    concealMiss: concealMiss,
                    concealRoll: concealRoll,
                    concealTarget: concealTarget,
                    concealRolled: concealRolled,
                    isSpell: roll === -1337,
                    applyHalf: finalAc.applyHalf,
                    ammoRecovered: ammoRecovered,
                    fortifyRolled: fortifyRolled,
                    fortifyValue: Math.min(fortifyValue,100),
                    fortifyRoll: fortifyRoll,
                    fortifySuccessfull: fortifySuccessfull,
                    hasProperties: props.length,
                    properties: props
                }, {inplace: false});
                // Create message

                await createCustomChatMessage("systems/D35E/templates/chat/damage-description.html", templateData, chatData);
            }


            if (hit) {
                let dt = value > 0 ? Math.min(tmp, value) : 0;
                promises.push(t.actor.update({
                    "data.attributes.hp.nonlethal": _nonLethal + nonLethal,
                    "data.attributes.hp.temp": tmp - dt,
                    "data.attributes.hp.value": Math.clamped(hp.value - (value - dt), -100, hp.max)
                }));
            }
        }
        return Promise.all(promises);
    }

    static async applyRegeneration(damage,actor = null) {

        let value = 0;

        let tokensList = [];
        const promises = [];
        if (actor === null) {
            if (game.user.targets.size > 0)
                tokensList = Array.from(game.user.targets);
            else
                tokensList = canvas.tokens.controlled;
            if (!tokensList.length) {
                ui.notifications.warn(game.i18n.localize("D35E.NoTokensSelected"));
                return
            }
        } else {
            tokensList.push({actor: actor})
        }

        for (let t of tokensList) {

            let a = t.actor,
                nonLethal = a.data.data.attributes.hp.nonlethal || 0;

                promises.push(t.actor.update({
                    "data.attributes.hp.nonlethal": Math.max(0,nonLethal-damage)
                }));
        }
        return Promise.all(promises);
    }

    async rollSave(type,ability,target) {
        this.rollSavingThrow(type,ability,target,{})
    }

    static async _rollSave(type,ability,target) {
        let tokensList;
        if (game.user.targets.size > 0)
            tokensList = Array.from(game.user.targets);
        else
            tokensList = canvas.tokens.controlled;
        const promises = [];
        if (!tokensList.length) {
            ui.notifications.warn(game.i18n.localize("D35E.NoTokensSelected"));
            return
        }
        for (let t of tokensList) {
            if (t.actor == null) continue
            let a = t.actor
            if (!a.testUserPermission(game.user, "OWNER")) {
                ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));
                continue;
            }
            promises.push(t.actor.rollSavingThrow(type,ability,target,{}));
        }
        return Promise.all(promises);
    }

    getSkill(key) {
        for (let [k, s] of Object.entries(this.data.data.skills)) {
            if (k === key) return s;
            if (s.subSkills != null) {
                for (let [k2, s2] of Object.entries(s.subSkills)) {
                    if (k2 === key) return s2;
                }
            }
        }
        return null;
    }

    get allNotes() {
        let result = [];

        const noteItems = this.items.filter(o => {
            return o.data.data.contextNotes != null;
        });

        for (let o of noteItems) {
            if (o.type === "buff" && !o.data.data.active) continue;
            if ((o.type === "equipment" || o.type === "weapon") && !o.data.data.equipped) continue;
            if (!o.data.data.contextNotes || o.data.data.contextNotes.length === 0) continue;
            result.push({ notes: o.data.data.contextNotes, item: o });
        }

        return result;
    }

    /**
     * Generates an array with all the active context-sensitive notes for the given context on this actor.
     * @param {String} context - The context to draw from.
     */
    getContextNotes(context) {
        let result = this.allNotes;

        // Attacks
        if (context.match(/^attacks\.(.+)/)) {
            const key = RegExp.$1;
            for (let note of result) {
                note.notes = note.notes.filter(o => {
                    return (o[1] === "attacks" && o[2] === key);
                }).map(o => {
                    return o[0];
                });
            }

            return result;
        }

        // Skill
        if (context.match(/^skill\.(.+)/)) {
            const skillKey = RegExp.$1;
            const skill = this.getSkill(skillKey);
            const ability = skill.ability;
            for (let note of result) {
                note.notes = note.notes.filter(o => {
                    return (o[1] === "skill" && o[2] === context) || (o[1] === "skills" && (o[2] === `${ability}Skills` || o[2] === "skills"));
                }).map(o => {
                    return o[0];
                });
            }

            if (skill.notes != null && skill.notes !== "") {
                result.push({ notes: [skill.notes], item: null });
            }

            return result;
        }

        // Saving throws
        if (context.match(/^savingThrow\.(.+)/)) {
            const saveKey = RegExp.$1;
            for (let note of result) {
                note.notes = note.notes.filter(o => {
                    return o[1] === "savingThrows" && (o[2] === saveKey || o[2] === "allSavingThrows");
                }).map(o => {
                    return o[0];
                });
            }

            if (this.data.data.attributes.saveNotes != null && this.data.data.attributes.saveNotes !== "") {
                result.push({ notes: [this.data.data.attributes.saveNotes], item: null });
            }

            return result;
        }

        // Ability checks
        if (context.match(/^abilityChecks\.(.+)/)) {
            const ablKey = RegExp.$1;
            for (let note of result) {
                note.notes = note.notes.filter(o => {
                    return o[1] === "abilityChecks" && (o[2] === `${ablKey}Checks` || o[2] === "allChecks");
                }).map(o => {
                    return o[0];
                });
            }

            return result;
        }

        // Misc
        if (context.match(/^misc\.(.+)/)) {
            const miscKey = RegExp.$1;
            for (let note of result) {
                note.notes = note.notes.filter(o => {
                    return o[1] === "misc" && o[2] === miscKey;
                }).map(o => {
                    return o[0];
                });
            }

            if (miscKey === "cmb" && this.data.data.attributes.cmbNotes != null && this.data.data.attributes.cmbNotes !== "") {
                result.push({ notes: [this.data.data.attributes.cmbNotes], item: null });
            }

            return result;
        }

        return [];
    }

    async createEmbeddedEntity(embeddedName, createData, options = {}) {
        let noArray = false;
        if (!(createData instanceof Array)) {
            createData = [createData];
            noArray = true;
        }

        for (let obj of createData) {
            // Don't auto-equip transferred items
            if (obj._id != null && ["weapon", "equipment"].includes(obj.type)) {
                obj.data.equipped = false;

            }
            if (["weapon", "equipment", "loot"].includes(obj.type)) {
                if (obj.data.identifiedName !== obj.name) {
                    obj.data.identifiedName = obj.name
                }
            }
            if (["spell"].includes(obj.type)) {
                if (options.ignoreSpellbookAndLevel) {

                }
                else if (options.domainSpells) {
                    let spellbook = undefined
                    // We try to set spellbook to correct one
                    for (let _spellbookKey of Object.keys(this.data.data.attributes.spells.spellbooks)) {
                        let _spellbook = this.data.data.attributes.spells.spellbooks[_spellbookKey]
                        if (_spellbook.hasSpecialSlot && _spellbook.spellcastingType === "divine"){
                            spellbook = _spellbook
                            obj.data.spellbook = _spellbookKey
                        }
                    }
                    if (spellbook === undefined) {
                        obj.data.spellbook = "primary"
                        spellbook = this.data.data.attributes.spells.spellbooks["primary"]
                        ui.notifications.warn(`No Spellbook found for spell. Adding to Primary spellbook.`)
                    }
                } else {
                    let spellbook = this.data.data.attributes.spells.spellbooks[obj.data.spellbook]
                    let foundLevel = false;
                    if (obj.data.spellbook === null) {
                        // We try to set spellbook to correct one
                        for (let _spellbookKey of Object.keys(this.data.data.attributes.spells.spellbooks)) {
                            let _spellbook = this.data.data.attributes.spells.spellbooks[_spellbookKey]

                            let spellbookClass = this.data.data.classes[_spellbook.class]?.name || "Missing";
                            if (obj.data.learnedAt !== undefined) {
                                for (const learnedAtObj of obj.data.learnedAt.class) {
                                    if (learnedAtObj[0].toLowerCase() === spellbookClass.toLowerCase()) {
                                        spellbook = _spellbook
                                        obj.data.spellbook = _spellbookKey
                                    }
                                }
                            }
                        }
                        if (spellbook === undefined) {
                            obj.data.spellbook = "primary"
                            spellbook = this.data.data.attributes.spells.spellbooks["primary"]
                            ui.notifications.warn(`No Spellbook found for spell. Adding to Primary spellbook.`)
                        } else {
                        }
                    }
                    let spellbookClass = this.data.data.classes[spellbook.class]?.name || "Missing";
                    if (obj.data.learnedAt !== undefined) {
                        obj.data.learnedAt.class.forEach(learnedAtObj => {
                            if (learnedAtObj[0].toLowerCase() === spellbookClass.toLowerCase()) {
                                obj.data.level = learnedAtObj[1]
                                obj.data.powerPointsCost = Math.max((parseInt(learnedAtObj[1])*2)-1,0)
                                foundLevel = true;
                            }
                        })
                    }
                    if (!foundLevel) {
                        obj.data.powerPointsCost = Math.max((parseInt(obj.data.level)*2)-1,0)
                        ui.notifications.warn(`Spell added despite not being in a spell list for class.`)
                    }
                }

            }
        }
        //this.createEmbeddedDocuments
        //return this.createOwnedItem((noArray ? createData[0] : createData), options);
        return super.createEmbeddedDocuments(embeddedName, [(noArray ? createData[0] : createData)], options);
    }

    _computeEncumbrance(updateData, srcData) {
        const carry = this.getCarryCapacity(srcData);
        linkData(srcData, updateData, "data.attributes.encumbrance.levels.light", carry.light);
        linkData(srcData, updateData, "data.attributes.encumbrance.levels.medium", carry.medium);
        linkData(srcData, updateData, "data.attributes.encumbrance.levels.heavy", carry.heavy);
        linkData(srcData, updateData, "data.attributes.encumbrance.levels.carry", carry.heavy * 2);
        linkData(srcData, updateData, "data.attributes.encumbrance.levels.drag", carry.heavy * 5);

        const carriedWeight = Math.max(0, this.getCarriedWeight(srcData));
        linkData(srcData, updateData, "data.attributes.encumbrance.carriedWeight", Math.round(carriedWeight * 10) / 10);

        // Determine load level
        let encLevel = 0;
        if (carriedWeight > 0) {
            if (carriedWeight >= srcData.data.attributes.encumbrance.levels.light) encLevel++;
            if (carriedWeight >= srcData.data.attributes.encumbrance.levels.medium) encLevel++;
        }
        linkData(srcData, updateData, "data.attributes.encumbrance.level", encLevel);
    }

    _calculateCoinWeight(data) {
        let baseWeight = Object.values(data.data.currency).reduce((cur, amount) => {
            return cur + amount;
        }, 0) / 50;

        const customCurrency = data.data.customCurrency;
        let currencyConfig = game.settings.get("D35E", "currencyConfig");
        for (let currency of currencyConfig.currency) {
            if (customCurrency)
                baseWeight += customCurrency[currency[0]]*currency[2]
        }

        return baseWeight;
    }

    getCarryCapacity(srcData) {
        // Determine carrying capacity
        const carryStr = (srcData.data.abilities.str.total - srcData.data.abilities.str.damage) + srcData.data.abilities.str.carryBonus;
        let carryMultiplier = srcData.data.abilities.str.carryMultiplier;
        const size = srcData.data.traits.actualSize;
        if (srcData.data.attributes.quadruped) carryMultiplier *= CONFIG.D35E.encumbranceMultipliers.quadruped[size];
        else carryMultiplier *= CONFIG.D35E.encumbranceMultipliers.normal[size];
        let heavy = carryMultiplier * new Roll35e(CONFIG.D35E.carryingCapacityFormula, { "str": carryStr > 0 ? carryStr : 0 }).roll().total;

        // 1 kg = 0.5 lb
        // if (game.settings.get("D35E", "units") === "metric") {
        //     heavy = heavy / 2
        // }
        // Imperial to metric: All items have their weight stored in imperial for internal calculations

        return {
            light: Math.floor(heavy / 3),
            medium: Math.floor(heavy / 3 * 2),
            heavy: heavy,
        };
    }

    getCarriedWeight(srcData) {
        // Determine carried weight
        const physicalItems = srcData.items.filter(o => {
            return o.data.weight != null;
        });
        return physicalItems.reduce((cur, o) => {

            let weightMult = o.data.containerWeightless ? 0 : 1
            if (!o.data.carried) return cur;
            if (o.data.equippedWeightless && o.data.equipped) return cur;
            return cur + (o.data.weight * o.data.quantity * weightMult);
        }, this._calculateCoinWeight(srcData));
    }

    /**
     * @returns {number} The total amount of currency this actor has, in gold pieces
     */
    mergeCurrency() {
        const carried = getProperty(this.data.data, "currency");
        const alt = getProperty(this.data.data, "altCurrency");
        const customCurrency = getProperty(this.data.data, "customCurrency");
        let baseTotal = (carried ? carried.pp * 10 + carried.gp + carried.sp / 10 + carried.cp / 100 : 0) +
            (alt ? alt.pp * 10 + alt.gp + alt.sp / 10 + alt.cp / 100 : 0);
        let currencyConfig = game.settings.get("D35E", "currencyConfig");
        for (let currency of currencyConfig.currency) {
            if (customCurrency)
                baseTotal += customCurrency[currency[0]]*currency[3]
        }
        return baseTotal;
    }

    /**
     * Import a new owned Item from a compendium collection
     * The imported Item is then added to the Actor as an owned item.
     *
     * @param collection {String}     The name of the pack from which to import
     * @param entryId {String}        The ID of the compendium entry to import
     */
    importItemFromCollection(collection, entryId) {
        const pack = game.packs.find(p => p.collection === collection);
        if (pack.metadata.entity !== "Item") return;

        return pack.getEntity(entryId).then(ent => {
            console.log(`${vtt} | Importing Item ${ent.name} from ${collection}`);

            let data = duplicate(ent.data);
            if (this.sheet != null && this.sheet.rendered) {
                data = mergeObject(data, this.sheet.getDropData(data));
            }
            delete data._id;
            return this.createOwnedItem(data);
        });
    }

    /**
     * Import a new owned Item from a compendium collection
     * The imported Item is then added to the Actor as an owned item.
     *
     * @param collection {String}     The name of the pack from which to import
     * @param name {String}        The name of the compendium entry to import
     */
    async importItemFromCollectionByName(collection, name, unique = false) {

        const pack = game.packs.find(p => p.collection === collection);
        if (!pack) {
            ui.notifications.error(game.i18n.localize("D35E.NoPackFound") + " " + collection);
            return;
        }
        if (pack.metadata.entity !== "Item") return;
        await pack.getIndex();
        const entry = pack.index.find(e => e.name === name)
        return pack.getDocument(entry._id).then(ent => {
            if (unique) {
                if (this.items.filter(o => o.name === name && o.type === ent.type).length > 0)
                    return;
            }
            console.log(`${vtt} | Importing Item ${ent.name} from ${collection}`);

            let data = duplicate(ent.data);
            if (this.sheet != null && this.sheet.rendered) {
                data = mergeObject(data, this.sheet.getDropData(data));
            }
            delete data._id;
            return this.createEmbeddedEntity("Item",data);
        });
    }

    getRollData(data = null) {
        if (data == null) data = this.data.data;
        const result = mergeObject(data, {
            size: Object.keys(CONFIG.D35E.sizeChart).indexOf(getProperty(data, "traits.actualSize")) - 4,
        }, { inplace: false });

        return result;
    }

    async autoApplyActionsOnSelf(action) {
        for (let _action of ItemPF.parseAction(action))
            if (_action.target === "self")
                await this.applyActionOnSelf(_action, this, null)
    }

    static applyAction(action, actor) {
        const promises = [];
        let tokensList;
        if (game.user.targets.size > 0)
            tokensList = game.user.targets;
        else
            tokensList = canvas.tokens.controlled;
        for (let t of tokensList) {
            promises.push(t.actor.applyActionOnSelf(action, actor));
        }
        return Promise.all(promises);
    }

    async applyActionOnSelf(action, actor, buff = null) {
        if (!this.testUserPermission(game.user, "OWNER")) return ui.notifications.warn(game.i18n.localize("D35E.ErrorNoActorPermission"));

        function cleanParam(parameter) {
            return parameter.replace(/"/gi, "");
        }

        let actionRollData = actor.getRollData() //This is roll data of actor that *rolled* the roll
        actionRollData.self = this.getRollData() //This is roll data of actor that *clicked* the roll
        if (buff) {
            actionRollData.buff = buff.getRollData() //This is roll data of optional buff item
        }

        if (action.condition !== undefined && action.condition !== null && action.condition !== "" && !(new Roll35e(action.condition, actionRollData).roll().result))
            return;

        function isActionRollable(_action) {
            return /^(.*?[0-9]d[0-9]+.*?)$/.test(_action)
                || _action.indexOf("max") !== -1
                || _action.indexOf("min") !== -1
                || _action.indexOf("+") !== -1
                || _action.indexOf(",") !== -1
                || _action.indexOf("@") !== -1;
        }

        switch (action.action) {
            case "TurnUndead":
                await this.rollTurnUndead(cleanParam(action.parameters[0]))
                break;
            case "Create":
            case "Give":
                if (action.parameters.length === 1) {
                    // Create from default compendiums
                } else if (action.parameters.length === 3) {
                    if (action.parameters[1] === "from") {
                        await this.importItemFromCollectionByName(cleanParam(action.parameters[2]), cleanParam(action.parameters[0]))
                    } else {
                        ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                    }
                } else if (action.parameters.length === 4) {
                    if (action.parameters[2] === "from" && (action.parameters[0] === "unique" || action.parameters[0] === "u")) {
                        await this.importItemFromCollectionByName(cleanParam(action.parameters[3]), cleanParam(action.parameters[1]), true)
                    } else {
                        ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                    }
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "Activate":
                if (action.parameters.length === 1) {
                    let name = cleanParam(action.parameters[0])
                    let items = this.items.filter(o => o.name === name)
                    if (items.length > 0) {
                        const item = items[0]
                        if (item.type === "buff") {
                            await item.update({ 'data.active': true })
                        } else {
                            await item.use({ skipDialog: true })
                        }
                    }
                } else if (action.parameters.length === 2) {

                    let name = cleanParam(action.parameters[1])
                    let type = cleanParam(action.parameters[0])
                    let items = this.items.filter(o => o.name === name && o.type === type)
                    if (items.length > 0) {
                        const item = items[0]
                        if (item.type === "buff") {
                            await item.update({ 'data.active': true })
                        } else {
                            await item.use({ skipDialog: true })
                        }
                    }
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "Set":
                // Set "Sneak Attack" field data.level to (@class.rogue.level) on self
                if (action.parameters.length === 5 && action.parameters[1] === "field" && action.parameters[3] === "to") {
                    let name = cleanParam(action.parameters[0])

                    let items = this.items.filter(o => o.name === name)
                    if (items.length > 0) {
                        const item = items[0]
                        let updateObject = {}

                        updateObject["_id"] = item.id;
                        if (action.parameters[4] === 'true' || action.parameters[4] === 'false') {
                            updateObject[action.parameters[2]] = action.parameters[4] === 'true';
                        } else {
                            if (isActionRollable(action.parameters[4])) {
                                updateObject[action.parameters[2]] = new Roll35e(action.parameters[4], actionRollData).roll().total
                            } else {
                                updateObject[action.parameters[2]] = action.parameters[4]
                            }
                        }
                        await this.updateOwnedItem(updateObject, { stopUpdates: true })
                        await this.update({})
                    }
                }
                // Set attack * field data.melded to true on self
                else if (action.parameters.length === 6 && action.parameters[2] === "field" && action.parameters[4] === "to") {
                    let type = cleanParam(action.parameters[0])
                    let subtype = null;
                    if (type.indexOf(":") !== -1) {
                        subtype = type.split(":")[1]
                        type = type.split(":")[0]
                    }
                    let name = cleanParam(action.parameters[1])

                    let items = this.items.filter(o => (o.name === name || name === "*") && o.type === type)
                    if (items.length > 0) {
                        if (name === '*') {
                            let itemUpdates = []
                            for (let item of items) {
                                if (type === "attack" && subtype !== null) {
                                    if (item.data.data.attackType !== subtype) continue;
                                }
                                let updateObject = {}
                                updateObject["_id"] = item.id;
                                if (action.parameters[5] === 'true' || action.parameters[5] === 'false') {
                                    updateObject[action.parameters[3]] = action.parameters[5] === 'true';
                                } else {
                                    if (isActionRollable(action.parameters[5])) {
                                        updateObject[action.parameters[3]] = new Roll35e(action.parameters[5], actionRollData).roll().total
                                    } else {
                                        updateObject[action.parameters[3]] = action.parameters[5]
                                    }
                                }
                                itemUpdates.push(updateObject)
                            }
                            await this.updateOwnedItem(itemUpdates, { stopUpdates: true })
                            await this.update({})
                        } else {
                            const item = items[0]
                            let updateObject = {}
                            updateObject["_id"] = item.id;
                            if (action.parameters[5] === 'true' || action.parameters[5] === 'false') {
                                updateObject[action.parameters[3]] = action.parameters[5] === 'true';
                            } else {
                                if (isActionRollable(action.parameters[5])) {
                                    updateObject[action.parameters[3]] = new Roll(action.parameters[5], actionRollData).roll().total
                                } else {
                                    updateObject[action.parameters[3]] = action.parameters[5]
                                }
                            }
                            await this.updateOwnedItem(updateObject, { stopUpdates: true })
                            await this.update({})
                        }
                    }
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "Condition":
                // Condition set *name* to *value*
                if (action.parameters.length === 4 && action.parameters[0] === "set" && action.parameters[2] === "to") {
                    let name = cleanParam(action.parameters[1])
                    let value = cleanParam(action.parameters[3])
                    let updateObject = {}
                    updateObject[`data.attributes.conditions.${name}`] = value === 'true'
                    await this.update(updateObject)
                }
                // Condition toggle *name*
                else if (action.parameters.length === 2 && action.parameters[0] === "toggle") {
                    let name = cleanParam(action.parameters[1])
                    let updateObject = {}
                    updateObject[`data.attributes.conditions.${name}`] = !getProperty(this.data.data, `attributes.conditions.${name}`)
                    await this.update(updateObject)
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "Trait":
                // Condition set *name* to *value*
                if (action.parameters.length === 5 && action.parameters[0] === "set" && action.parameters[3] === "to") {
                    let traitGroup = cleanParam(action.parameters[1])
                    let name = cleanParam(action.parameters[2])
                    let value = cleanParam(action.parameters[4])
                    let currentTraits = duplicate(actionRollData.self.traits[traitGroup].value)
                    if (value === 'true') {
                        if (currentTraits.indexOf(name) === -1) {
                            currentTraits.push(name)
                        }
                    } else {
                        var index = currentTraits.indexOf(name);
                        if (index !== -1) {
                            currentTraits.splice(index, 1);
                        }
                    }
                    let updateObject = {}
                    updateObject[`data.traits.${traitGroup}.value`] = currentTraits
                    await this.update(updateObject)
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;

            case "Update":
                // Update set *field* to *value*
                if (action.parameters.length === 4 && action.parameters[0] === "set" && action.parameters[2] === "to") {
                    let field = cleanParam(action.parameters[1])
                    let value = cleanParam(action.parameters[3])
                    let updateObject = {}

                    if (isActionRollable(value)) {
                        updateObject[`${field}`]= new Roll(cleanParam(value), actionRollData).roll().total
                    } else {
                        updateObject[`${field}`]= value
                    }
                    await this.update(updateObject)
                } else if (action.parameters.length === 4 && action.parameters[0] === "add" && action.parameters[2] === "to") {
                    let field = cleanParam(action.parameters[1])
                    let value = cleanParam(action.parameters[3])
                    let updateObject = {}

                    if (isActionRollable(value)) {
                        updateObject[`${field}`]= parseInt(getProperty(actionRollData,field.replace("data","self")) || 0) + new Roll(cleanParam(value), actionRollData).roll().total
                    } else {
                        updateObject[`${field}`]= parseInt(getProperty(actionRollData,field.replace("data","self")) || 0) + parseInt(value)
                    }
                    await this.update(updateObject)
                } else if (action.parameters.length === 4 && action.parameters[0] === "subtract" && action.parameters[2] === "to") {
                    let field = cleanParam(action.parameters[1])
                    let value = cleanParam(action.parameters[3])
                    let updateObject = {}

                    if (isActionRollable(value)) {
                        updateObject[`${field}`]= (getProperty(actionRollData,field.replace("data","self")) || 0) - new Roll(cleanParam(value), actionRollData).roll().total
                    } else {
                        updateObject[`${field}`]= (getProperty(actionRollData,field.replace("data","self")) || 0) - value
                    }
                    await this.update(updateObject)
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "Damage":
                // Rolls arbitrary attack
                console.log(action)
                if (action.parameters.length === 1) {
                    let damage = new Roll(cleanParam(action.parameters[0]), actionRollData).roll()
                    let name = action.name;
                    let chatTemplateData = {
                        name: this.name,
                        type: CONST.CHAT_MESSAGE_TYPES.OTHER,
                        rollMode: "public",
                    };
                    const templateData = mergeObject(chatTemplateData, {
                        flavor: name,
                        total: damage.total,
                        tooltip: $(await damage.getTooltip()).prepend(`<div class="dice-formula">${damage.formula}</div>`)[0].outerHTML
                    }, {inplace: false});
                    // Create message
                    await createCustomChatMessage("systems/D35E/templates/chat/simple-attack-roll.html", templateData, {}, damage);
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "SelfDamage":
                // Rolls arbitrary attack
                console.log(action)
                if (action.parameters.length === 1) {
                    let damage = new Roll(cleanParam(action.parameters[0]), actionRollData).roll().total
                    ActorPF.applyDamage(null,null,null,null,null,null,null,damage,null,null,null,null,false,true, actor);
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;

            case "Grapple":
                // Rolls arbitrary attack
                if (action.parameters.length === 1) {
                    this.rollGrapple(cleanParam(action.parameters[0]))
                } else
                    this.rollGrapple()
                break;
            case "AbilityDamage":
                // Rolls arbitrary attack
                console.log(action)
                if (action.parameters.length === 2) {
                    let damage = new Roll(cleanParam(action.parameters[1]), actionRollData).roll().total
                    ActorPF.applyAbilityDamage(damage, cleanParam(action.parameters[0]));
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "AbilityDrain":
                // Rolls arbitrary attack
                console.log(action)
                if (action.parameters.length === 2) {
                    let damage = new Roll(cleanParam(action.parameters[1]), actionRollData).roll().total
                    ActorPF.applyAbilityDrain(damage, cleanParam(action.parameters[0]));
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "Regenerate":
                // Rolls arbitrary attack
                console.log(action)
                if (action.parameters.length === 1) {
                    let damage = new Roll(cleanParam(action.parameters[0]), actionRollData).roll().total
                    ActorPF.applyRegeneration(damage,actor);
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "Clear":
                if (action.parameters.length === 1) {
                    // Clear all items of type
                }
                if (action.parameters.length === 2) {
                    // Clear all items of type and subtype
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "Use":
                if (action.parameters.length === 1) {
                    // Use an action or item
                }
                if (action.parameters.length === 2) {
                    // Use n items/action
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "Roll":
                if (action.parameters.length === 1) {
                    // Do a roll
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
                break;
            case "RunMacro":
				// Executes a macro defined on MacroDirectory
                console.log(action)
                if (action.parameters.length === 1) {
					let macroToRun = MacroDirectory.collection.find(x => x.data.name === cleanParam(action.parameters[0]));
					if (!macroToRun)
					{
						ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
						return;
					}
					await macroToRun.execute();
                } else
                    ui.notifications.error(game.i18n.localize("D35E.ErrorActionFormula"));
				break;
            case "Eval":
                await this.executeEvalOnSelf(action);
                break;
            default:
                break;
        }
    }

    async executeEvalOnSelf(action) {
        let actor = this;
        console.log('D35E | Running async eval')
        await eval("(async () => {" + action.body + "})()");
        console.log('D35E | Running async eval done')
    }

    async quickChangeItemQuantity(itemId, add = 1) {
        const item = this.getOwnedItem(itemId);

        const curQuantity = getProperty(item.data, "data.quantity") || 0;
        const newQuantity = Math.max(0, curQuantity + add);
        await item.update({ "data.quantity": newQuantity });
    }

    //



    _createConsumableSpellDialog(itemData) {
        new Dialog({
            title: game.i18n.localize("D35E.CreateItemForSpell").format(itemData.name),
            content: game.i18n.localize("D35E.CreateItemForSpellD").format(itemData.name),
            buttons: {
                potion: {
                    icon: '<i class="fas fa-prescription-bottle"></i>',
                    label: "Potion",
                    callback: () => this.createConsumableSpell(itemData, "potion"),
                },
                scroll: {
                    icon: '<i class="fas fa-scroll"></i>',
                    label: "Scroll",
                    callback: () => this.createConsumableSpell(itemData, "scroll"),
                },
                wand: {
                    icon: '<i class="fas fa-magic"></i>',
                    label: "Wand",
                    callback: () => this.createConsumableSpell(itemData, "wand"),
                },
            },
            default: "potion",
        }).render(true);
    }

    _createConsumablePowerDialog(itemData) {
        new Dialog({
            title: game.i18n.localize("D35E.CreateItemForPower").format(itemData.name),
            content: game.i18n.localize("D35E.CreateItemForPowerD").format(itemData.name),
            buttons: {
                potion: {
                    icon: '<i class="fas fa-prescription-bottle"></i>',
                    label: "Tattoo",
                    callback: () => this.createConsumableSpell(itemData, "tattoo"),
                },
                scroll: {
                    icon: '<i class="fas fa-scroll"></i>',
                    label: "Power Stone",
                    callback: () => this.createConsumableSpell(itemData, "powerstone"),
                },
                wand: {
                    icon: '<i class="fas fa-magic"></i>',
                    label: "Dorje",
                    callback: () => this.createConsumableSpell(itemData, "dorje"),
                },
            },
            default: "tattoo",
        }).render(true);
    }

    _createPolymorphBuffDialog(itemData) {
        new Dialog({
            title: game.i18n.localize("D35E.CreateItemForActor").format(itemData.name),
            content: game.i18n.localize("D35E.CreateItemForActorD").format(itemData.name),
            buttons: {
                potion: {
                    icon: '',
                    label: "Wild Shape",
                    callback: () => this.createWildShapeBuff(itemData),
                },
                scroll: {
                    icon: '',
                    label: "Polymorph",
                    callback: () => this.createPolymorphBuff(itemData),
                },
                wand: {
                    icon: '',
                    label: "Alter Self",
                    callback: () => this.createAlterSelfBuff(itemData),
                },
                // lycantrophy: {
                //   icon: '',
                //   label: "Lycantrophy",
                //   callback: () => this.createLycantrophyBuff(itemData),
                // },
            },
            default: "Polymorph",
        }).render(true);
    }

    _setMaster(itemData) {
        if (itemData == null) {
            let updateData = {};
            updateData["data.-=master"] = null;
            this.update(updateData);
        } else {
            let masterData = {
                data: {
                    master: {
                        id: itemData._id,
                        img: itemData.img,
                        name: itemData.name,
                        data: game.actors.get(itemData._id).getRollData(),
                    }
                }
            };
            this.update(masterData);
        }
    }

    async createAttackSpell(itemData, type) {
        let data = await ItemPF.toAttack(itemData);

        if (data._id) delete data._id;
        await this.createEmbeddedEntity("Item", data);
    }

    async createConsumableSpell(itemData, type) {
        let data = await ItemPF.toConsumable(itemData, type);

        if (data._id) delete data._id;
        await this.createEmbeddedEntity("Item", data);
    }

    async createTrait(itemData, type) {
        let data = await ItemPF.toTrait(itemData, type);

        if (data._id) delete data._id;
        await this.createEmbeddedEntity("Item", data);
    }

    async createWildShapeBuff(itemData) {
        let data = await ItemPF.toPolymorphBuff(itemData, "wildshape");

        if (data._id) delete data._id;
        await this.createEmbeddedEntity("Item", data);
    }

    async createPolymorphBuff(itemData, type) {
        let data = await ItemPF.toPolymorphBuff(itemData, "polymorph");

        if (data._id) delete data._id;
        await this.createEmbeddedEntity("Item", data);
    }

    async createAlterSelfBuff(itemData, type) {
        let data = await ItemPF.toPolymorphBuff(itemData, "alter-self");

        if (data._id) delete data._id;
        await this.createEmbeddedEntity("Item", data);
    }

    async createLycantrophyBuff(itemData, type) {
        let data = await ItemPF.toPolymorphBuff(itemData, "lycantrophy");

        if (data._id) delete data._id;
        await this.createEmbeddedEntity("Item", data);
    }

    async _updateMinions(options) {
        if (options.skipMinions) return;
        for (const actor of game.actors) {
            if (actor.data.data?.master?.id === this.id) {
                let masterData = {
                    data : {
                        master : {
                            img: this.img,
                            name: this.name,
                            data: this.getRollData(),
                        }
                    }
                };

                // Updating minion "Familiar class"
                const classes = actor.data.items.filter(obj => {
                    return obj.type === "class";
                });
                const minionClass = classes.find(o => getProperty(o.data, "classType") === "minion");
                if (!!minionClass) {
                    let updateObject = {}
                    updateObject["_id"] = minionClass.id || minionClass._id;
                    updateObject["data.levels"] = this.getRollData().attributes.minionClassLevels[minionClass.data.minionGroup] || 0;
                    await actor.updateOwnedItem(updateObject, {stopUpdates: true})
                }
                actor.update(masterData, {stopUpdates: true});
            }
        }
    }

    async _calculateMinionDistance() {
        if (this == null) return;
        if (!this.testUserPermission(game.user, "OWNER")) return;
        if (this.data.type === "npc") {
            let myToken = this.getActiveTokens()[0];
            let masterId = this.data.data?.master?.id;
            let master = game.actors.get(masterId);
            if (!master || !master.getActiveTokens()) return;
            let masterToken = master.getActiveTokens()[0];
            if (!!myToken && !!masterToken) {
                let distance = Math.floor(canvas.grid.measureDistance(myToken, masterToken) / 5.0) * 5;
                let masterData = {
                    data: {
                        master: {
                            distance: distance
                        }
                    }
                };
                let minionData = {
                    data: {
                        attributes: {minionDistance: {}}
                    }
                };
                minionData.data.attributes.minionDistance[this.data.name.toLowerCase().replace(/ /g, '').replace(/,/g, '')] = distance
                master.update(minionData, {stopUpdates: true, skipToken: true, skipMinions: true});
                this.update(masterData, {stopUpdates: true, skipToken: true});
            }
        } else if (this.data.type === "character") {
            let myToken = this.getActiveTokens()[0];
            let minionData = {
                data: {
                    attributes: {minionDistance: {}}
                }
            };
            let hasAnyMinion = false;
            game.actors.forEach(minion => {
                if (minion.data.data?.master?.id === this.id) {
                    hasAnyMinion = true;
                    let minionToken = minion.getActiveTokens()[0]
                    if (!!myToken && !!minionToken) {
                        let distance = Math.floor(canvas.grid.measureDistance(myToken, minionToken) / 5.0) * 5;
                        let masterData = {
                            data: {
                                master: {
                                    distance: distance
                                }
                            }
                        };
                        minionData.data.attributes.minionDistance[minion.data.name.toLowerCase().replace(/ /g, '').replace(/,/g, '')] = distance
                        minion.update(masterData, {stopUpdates: true, skipToken: true});
                    }
                }
            });
            if (hasAnyMinion)
                this.update(minionData, {stopUpdates: true, skipToken: true, skipMinions: true});
        }
    }

    async rest(restoreHealth, restoreDailyUses, longTermCare) {
        const actorData = this.data.data;
        let rollData = this.getRollData();
        const updateData = {};


        if (this.items !== undefined && this.items.size > 0) {
            // Update items
            for (let i of this.items) {
                await i.addElapsedTime(8 * 60 * 10);
            }
        }

        // Restore health and ability damage
        if (restoreHealth) {
            const hd = actorData.attributes.hd.total;
            let heal = {
                hp: hd,
                abl: 1
            };
            if (longTermCare) {
                heal.hp *= 2;
                heal.abl *= 2;
            }

            updateData["data.attributes.hp.value"] = Math.min(actorData.attributes.hp.value + heal.hp, actorData.attributes.hp.max);
            for (let [key, abl] of Object.entries(actorData.abilities)) {
                let dmg = Math.abs(abl.damage);
                updateData[`data.abilities.${key}.damage`] = Math.max(0, dmg - heal.abl);
            }
        }

        // Restore daily uses of spells, feats, etc.
        if (restoreDailyUses) {
            let items = [],
                hasItemUpdates = false;
            for (let a = 0; a < this.data.items.length; a++) {
                let item = this.data.items[a];
                items[a] = item;
                let itemUpdate = {};
                const itemData = item.data;
                rollData.item = duplicate(itemData);

                if (itemData.uses && itemData.uses.per === "day" && itemData.uses.value !== itemData.uses.max) {
                    hasItemUpdates = true;
                    if (itemData.uses.rechargeFormula) {
                        itemUpdate["data.uses.value"] = Math.min(itemData.uses.value + new Roll(itemData.uses.rechargeFormula, itemData).roll().total, itemData.uses.max)
                        rollData.item.uses.value = itemUpdate["data.uses.value"]
                    }
                    else
                    {
                        itemUpdate["data.uses.value"] = itemData.uses.max;
                        rollData.item.uses.value = itemUpdate["data.uses.value"]
                    }
                }
                if (hasProperty(item, "data.combatChangesRange.maxFormula")) {
                    if (getProperty(item, "data.combatChangesRange.maxFormula") !== "") {
                        let roll = new Roll(getProperty(item, "data.combatChangesRange.maxFormula"), rollData).roll();
                        itemUpdate["data.combatChangesRange.max"] = roll.total;
                    }
                }
                for (let i = 1; i <= 3; i++)
                    if (hasProperty(item, `data.combatChangesAdditionalRanges.slider${i}.maxFormula`)) {
                        if (getProperty(item, `data.combatChangesAdditionalRanges.slider${i}.maxFormula`) !== "") {
                            let roll = new Roll(getProperty(item, `data.combatChangesAdditionalRanges.slider${i}.maxFormula`), rollData).roll();
                            itemUpdate[`data.combatChangesAdditionalRanges.slider${i}.max`] = roll.total;
                        }
                    }
                if (itemData.enhancements && itemData.enhancements.uses && itemData.enhancements.uses.per === "day" && itemData.enhancements.uses.value !== itemData.enhancements.uses.max) {
                    hasItemUpdates = true;
                    if (itemData.enhancements.uses.rechargeFormula) {
                        itemUpdate["data.enhancements.uses.value"] = Math.min(itemData.enhancements.uses.value + new Roll(itemData.enhancements.uses.rechargeFormula, itemData).roll().total, itemData.enhancements.uses.max)
                    }
                    else
                    {
                        itemUpdate["data.enhancements.uses.value"] = itemData.enhancements.uses.max;
                    }
                }
                else if (item.type === "spell") {
                    const spellbook = getProperty(actorData, `attributes.spells.spellbooks.${itemData.spellbook}`),
                        isSpontaneous = spellbook.spontaneous,
                        usePowerPoints = spellbook.usePowerPoints;
                    if (!isSpontaneous && !usePowerPoints && itemData.preparation.preparedAmount !== itemData.preparation.maxAmount) {
                        hasItemUpdates = true;
                        itemUpdate["data.preparation.preparedAmount"] = itemData.preparation.maxAmount;
                    }
                }

                if (itemData.enhancements && itemData.enhancements && itemData.enhancements.items) {
                    let enhItems = duplicate(itemData.enhancements.items)
                    for (let _item of enhItems) {
                        if (_item.data.uses.per === "day" && _item.data.uses.value !== _item.data.uses.max) {
                            if (_item.data.uses.rechargeFormula) {
                                _item.data.uses.value  = Math.min(_item.data.uses.value + new Roll(_item.data.uses.rechargeFormula, _item.data).roll().total, _item.data.uses.max)
                            }
                            else
                            {
                                _item.data.uses.value = _item.data.uses.max;
                            }
                            hasItemUpdates = true;
                        }
                    }
                    itemUpdate[`data.enhancements.items`] = enhItems;
                }

                items[a] = mergeObject(item, itemUpdate, { enforceTypes: false, inplace: false });
            }
            if (hasItemUpdates) updateData.items = items;

            // Restore spontaneous spellbooks
            for (let [key, spellbook] of Object.entries(actorData.attributes.spells.spellbooks)) {
                if (spellbook.spontaneous) {
                    for (let sl of Object.keys(CONFIG.D35E.spellLevels)) {
                        updateData[`data.attributes.spells.spellbooks.${key}.spells.spell${sl}.value`] = getProperty(actorData, `attributes.spells.spellbooks.${key}.spells.spell${sl}.max`);
                    }
                }
                if (spellbook.usePowerPoints) {
                    let rollData = {};
                    if (actorData == null && this.actor != null) rollData = this.getRollData();
                    else rollData = actorData;
                    try {
                        updateData[`data.attributes.spells.spellbooks.${key}.powerPoints`] = new Roll(getProperty(actorData, `attributes.spells.spellbooks.${key}.dailyPowerPointsFormula`), rollData).roll().total;
                    } catch (e) {
                        updateData[`data.attributes.spells.spellbooks.${key}.powerPoints`] = 0;
                    }
                }
            }

            updateData[`data.attributes.turnUndeadUses`] = getProperty(actorData, `attributes.turnUndeadUsesTotal`);
        }

        this.update(updateData);
    }

    async _setAverageHitDie() {
        for (const item of this.items.filter(obj => {
            return obj.type === "class"
        })) {
            let hd = item['data']['data']['hd']
            let hp = 0;
            let levels = item['data']['data']['levels'];
            hp = Math.floor(parseInt(levels) * (hd / 2 + 0.5))
            await this.updateOwnedItem({_id: item._id, "data.hp": hp});
            await this.refresh()
        }
    }

    async renderFastHealingRegenerationChatCard() {
        let d = this.data.data;

        const token = this ? this.token : null;
        let chatTemplateData = {
            name: this.name,
            img: this.img,
            type: CONST.CHAT_MESSAGE_TYPES.OTHER,
            rollMode: "selfroll",
            tokenId: token ? `${token.scene._id}.${token.id}` : null,
            actor: this
        };
        let chatData = {
            speaker: ChatMessage.getSpeaker({actor: this}),
            rollMode: "selfroll",
            sound: CONFIG.sounds.dice,
            "flags.D35E.noRollRender": true,
        };
        let actions = []
        if (d.traits.regenTotal) {
            actions.push({
                label: game.i18n.localize("D35E.Regeneration"),
                value: `Regenerate ${d.traits.regenTotal} on self;`,
                isTargeted: false,
                action: "customAction",
                img: "",
                hasImg: false
            });
        }
        if (d.traits.fastHealingTotal) {
            actions.push({
                label: game.i18n.localize("D35E.FastHealing"),
                value: `SelfDamage -${d.traits.fastHealingTotal} on self;`,
                isTargeted: false,
                action: "customAction",
                img: "",
                hasImg: false
            });
        }
        if (actions.length) {
            const templateData = mergeObject(chatTemplateData, {
                actions: actions
            }, {inplace: false});
            // Create message
            await createCustomChatMessage("systems/D35E/templates/chat/fastheal-roll.html", templateData, chatData, {});
        }
    }

    async toggleConditionStatusIcons() {
        const isLinkedToken = getProperty(this.data, "token.actorLink");
        const tokens = isLinkedToken ? this.getActiveTokens() : [this.token].filter((o) => o != null);
        const buffTextures = this._calcBuffTextures();

        let promises = [];
        const fx = [...this.effects];
        let existingIds = new Set()
        for (let [id, obj] of Object.entries(buffTextures)) {
            if (obj.active) {
                await obj.item.toEffect();
                existingIds.add(id)
            }
            else await fx.find((f) => f.data.origin === id)?.delete();
        }
        for (let _fx of fx) {
            if (_fx?.data?.origin && !existingIds.has(_fx?.data?.origin)) {
                await _fx.delete()
            }
        }

        for (let token of tokens) {
            CONFIG.statusEffects.forEach((con) => {
                const idx = fx.findIndex((e) => e.getFlag("core", "statusId") === con.id);
                if (CONFIG.D35E.conditions[con.id] && (idx !== -1) != this.data.data.attributes.conditions[con.id])
                    promises.push(token.toggleEffect(con, { midUpdate: true }));
            });
        }
        return Promise.all(promises);
    }

    // @Object { id: { title: String, type: buff/string, img: imgPath, active: true/false }, ... }
    _calcBuffTextures() {
        if (this.data.data.noBuffDisplay) return [];
        const buffs = this.items.filter((o) => o.type === "buff");
        return buffs.reduce((acc, cur) => {
            const id = cur.uuid;
            if (cur.data.data.hideFromToken) return acc;
            if (cur.data.data?.buffType === "shapechange") return acc;

            if (!acc[id]) acc[id] = { id: cur.id, label: cur.name, icon: cur.data.img, item: cur };
            if (cur.data.data.active) acc[id].active = true;
            else acc[id].active = false;
            return acc;
        }, {});
    }

    async syncToCompendium() {
        if (!this.data.data.companionUuid) return;
        let apiKey = game.settings.get("D35E", "apiKeyWorld")
        if (this.data.data.companionUsePersonalKey) apiKey = game.settings.get("D35E", "apiKeyPersonal")
        if (!apiKey) return;
        $.ajax({
            url: `${this.API_URI}/api/character/${this.data.data.companionUuid}`,
            type: 'PUT',
            headers: {'API-KEY': apiKey},
            crossDomain: true,
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            data: JSON.stringify(this.data),
            success: function(data) {
                //play with data
            }
        });
    }

    async getQueuedActions() {
        if (!this.data.data.companionUuid) return;
        let that = this;
        let apiKey = game.settings.get("D35E", "apiKeyWorld")
        if (this.data.data.companionUsePersonalKey) apiKey = game.settings.get("D35E", "apiKeyPersonal")

        let userWithCharacterIsActive = game.users.players.some(u => u.active && u.data.character === this.id)
        let isMyCharacter = game.users.current.data.character === this.id;
        // It is not ours character and user that has this character is active - so better direct commands to his/her account
        if (!isMyCharacter && userWithCharacterIsActive) return;

        if (!apiKey) return;
        $.ajax({
            url: `${this.API_URI}/api/character/actions/${this.data.data.companionUuid}`,
            type: 'GET',
            headers: {'API-KEY': apiKey},
            crossDomain: true,
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            success: function(data) {
                //console.log('LOTDCOMPANION | ', data)
                that.executeRemoteAction(data)
            }
        });
    }

    async executeRemoteAction(remoteAction) {
        switch (remoteAction.action) {
            case 'ability':
                this.rollAbility(remoteAction.params)
                break;
            case 'save':
                this.rollSave(remoteAction.params)
                break;
            case 'rollSkill':
                this.rollSkill(remoteAction.params)
                break;
            case 'useItem':
                this.items.find(i => i._id === remoteAction.params).use({ })
                break;
        }
    }

    getChargesFromItemById(id) {
        let _item = this.items.find(item => item._id === id || item.data.data.uniqueId === id)
        if (_item != null) {
            return _item.data?.data?.uses?.value || 0
        } else {
            return 0;
        }
    }

    getMaxChargesFromItemById(id) {
        let _item = this.items.find(item => item._id === id || item.data.data.uniqueId === id)
        if (_item != null) {
            return _item.data?.data?.uses?.max || 0
        } else {
            return 0;
        }
    }

    getItemByUidOrId(id) {
        let _item = this.items.find(item => item._id === id || item.data.data.uniqueId === id)
        if (_item != null) {
            return _item
        } else {
            return null;
        }
    }

    getItemByTag(tag) {
        let _item = this.items.find(item => createTag(item.name) === tag || item.data.data.customTag === tag)
        if (_item != null) {
            return _item
        } else {
            return null;
        }
    }

    async renderBuffEndChatCard(items) {
        const chatTemplate = "systems/D35E/templates/chat/roll-ext.html";

        // Create chat data
        let chatData = {
            user: game.user._id,
            type: CONST.CHAT_MESSAGE_TYPES.CHAT,
            sound: CONFIG.sounds.dice,
            speaker: ChatMessage.getSpeaker({actor: this.actor}),
            rollMode: game.settings.get("core", "rollMode"),
        };
        // Handle different roll modes
        switch (chatData.rollMode) {
            case "gmroll":
                chatData["whisper"] = game.users.entities.filter(u => u.isGM).map(u => u._id);
                break;
            case "selfroll":
                chatData["whisper"] = [game.user._id];
                break;
            case "blindroll":
                chatData["whisper"] = game.users.entities.filter(u => u.isGM).map(u => u._id);
                chatData["blind"] = true;
        }

        // Send message
        await createCustomChatMessage("systems/D35E/templates/chat/deactivate-buff.html", {items: items, actor: this}, chatData,  {rolls: []})
    }


    async groupItems() {
        let itemsToDelete = new Set()
        let itemQuantities = new Map()
        for (let type of ['equipment','loot','weapon']) {
            let itemNames = new Set()
            let itemNamesToId = new Map()
            let equipment = this.items.filter(o => {
                return o.type === type
            })
            for (let _item of equipment) {

                let _name = `${_item.name}-${_item.data.data.carried}-${_item.data.data.equipped}-${_item.data.data.containerId}-${_item.data.data.subType}`
                if (itemNames.has(_name)) {
                    itemQuantities.set(itemNamesToId.get(_name), itemQuantities.get(itemNamesToId.get(_name)) + _item.data.data.quantity)
                    itemsToDelete.add(_item.id)
                }
                else {
                    itemNames.add(_name)
                    itemQuantities.set(_item.id, _item.data.data.quantity)
                    itemNamesToId.set(_name, _item.id)
                }
            }

        }
        if (Array.from(itemsToDelete).length)
            await this.deleteEmbeddedEntity("Item", Array.from(itemsToDelete), {stopUpdates: true});

        let itemsToUpdate = []
        for (const [key, value] of itemQuantities.entries()) {
            itemsToUpdate.push({'_id':key,'data.quantity':value})
        }

        if (itemsToUpdate.length)
            await this.updateEmbeddedEntity("Item", itemsToUpdate, {stopUpdates: true, ignoreSpellbookAndLevel: true});
    }
}
