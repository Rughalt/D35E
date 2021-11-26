import {ItemPF} from "../item/entity.js";
import {Roll35e} from "../roll.js"

export class ChatAttack {
    constructor(item, label = "", actor = null, rollData = null) {
        this.setItem(item, actor, rollData);
        this.label = label;

        this.attack = {
            flavor: "",
            tooltip: "",
            total: -1337,
            isCrit: false,
            isFumble: false,
        };
        this.critConfirm = {
            flavor: "",
            tooltip: "",
            total: 0,
            isCrit: false,
            isFumble: false,
        };

        this.hasAttack = false;
        this.hasCritConfirm = false;

        this.damage = {
            flavor: "",
            tooltip: "",
            total: 0,
        };
        this.critDamage = {
            flavor: "",
            tooltip: "",
            total: 0,
        };
        this.altDamage = {
            flavor: "",
            tooltip: "",
            total: 0,
        };

        this.subDamage = [];
        this.hasSubdamage = false;
        this.hasDamage = false;
        this.hasAltDamage = false;

        this.cards = [];
        this.altCards = [];
        this.special = [];
        this.effectNotes = "";
        this.rolls = []
        this.normalDamage = "";
        this.natural20 = false;
        this.natural20Crit = false;
        this.fumble = false;
        this.fumbleCrit = false;
        this.spellPenetration = null;
        this.isSpell = false;
    }

    get critRange() {
        return new Roll35e(`${this.rollData.item.ability.critRange || '20'}` || "20", this.rollData).roll().total;
    }

    /**
     * Sets the attack's item reference.
     * @param {ItemPF} item - The item to reference.
     * @param actor
     */
    setItem(item, actor = null, rollData = null) {
        if (item == null) {
            this.rollData = {};
            this.item = null;
            return;
        }

        this.item = item;
        if (rollData)
            this.rollData = duplicate(rollData);
        else {
            this.rollData = item.actor != null ? item.actor.getRollData() : actor != null ? actor.getRollData() : {};
            this.rollData.item = duplicate(this.item.data.data);
        }
    }

    async addAttack({bonus = null, extraParts = [], primaryAttack = true, critical = false, critConfirmBonus = 0} = {}) {
        if (!this.item) return;

        this.hasAttack = true;
        let data = this.attack;
        if (critical === true) data = this.critConfirm;

        // Roll attack
        let roll = this.item.rollAttack({
            data: this.rollData,
            bonus: bonus || 0,
            extraParts: extraParts,
            primaryAttack: primaryAttack
        });
        this.rolls.push(roll)
        let d20 = roll.terms[0];
        let critType = 0;
        if ((d20.total >= this.critRange && !critical) || (d20.total === 20 && critical)) critType = 1;
        else if (d20.total === 1) critType = 2;

        // Add tooltip
        let tooltip = $(await roll.getTooltip()).prepend(`<div class="dice-formula">${roll.formula}</div>`)[0].outerHTML;
        data.flavor = critical ? game.i18n.localize("D35E.CriticalConfirmation") : this.label;
        data.tooltip = tooltip;
        data.total = roll.total;
        data.isCrit = critType === 1;
        if (!data.isCrit)
            this.rollData[`attack${this.rolls.length}`] = roll.total;
        data.isNatural20 = (d20.total === 20 && !critical);
        data.isFumble = critType === 2;
        if (!critical) {
            this.natural20 = data.isNatural20
            this.fumble = data.isFumble
        }
        else {
            this.natural20Crit = data.isNatural20
            this.fumbleCrit = data.isFumble
        }
        // Add crit confirm
        if (!critical && d20.total >= this.critRange) {
            this.hasCritConfirm = true;
            await this.addAttack({bonus: (parseInt(bonus) || 0) + parseInt(critConfirmBonus), extraParts: extraParts, primaryAttack: primaryAttack, critical: true});
        }
    }

    getShortToolTip(dmgVal, dmgName) {
        if (dmgName === null) return `<img src="systems/D35E/icons/damage-type/unknown.svg" title="Part" class="dmg-type-icon" />${dmgVal}`
        let dmgIconBase = dmgName.toLowerCase();
        let dmgIcon = "unknown"
        switch (dmgIconBase) {
            case "fire":
            case "f":
                dmgIcon = "fire";
                break;
            case "cold":
            case "c":
                dmgIcon = "cold";
                break;
            case "electricity":
            case "electric":
            case "el":
            case "e":
                dmgIcon = "electricity";
                break;
            case "acid":
            case "a":
                dmgIcon = "acid";
                break;
            case "sonic":
                dmgIcon = "sonic";
                break;
            case "air":
                dmgIcon = "air";
                break;
            case "piercing":
            case "p":
                dmgIcon = "p";
                break;
            case "slashing":
            case "s":
                dmgIcon = "s";
                break;
            case "bludgeoning":
            case "b":
                dmgIcon = "b";
                break;
            case "unarmed":
                dmgIcon = "unarmed";
                break;
        }
        return `<img src="systems/D35E/icons/damage-type/${dmgIcon}.svg" title="${dmgName}" class="dmg-type-icon" />${dmgVal}`
    }

    async addDamage({extraParts = [], primaryAttack = true, critical = false, multiattack = 0, modifiers = {}} = {}) {
        if (!this.item) return;

        let isMultiattack = multiattack > 0;
        this.hasDamage = true;
        let data = this.damage;
        if (isMultiattack) data = {
            flavor: "",
            tooltip: "",
            total: 0,
        }
        if (critical === true) data = this.critDamage;

        const rolls = this.item.rollDamage({
            data: this.rollData,
            extraParts: extraParts,
            primaryAttack: primaryAttack,
            critical: critical,
            modifiers: modifiers
        });
        rolls.forEach(r => {
            this.rolls.push(r.roll || r)
        })
        // Add tooltip
        let tooltips = "";
        let totalDamage = 0;
        let shortTooltips = []
        let critShortTooltips = []
        let damageTypeTotal = new Map();

        const tooltipsAndDamage = await this.createTooltipsForRolls(rolls, totalDamage, damageTypeTotal, tooltips);
        totalDamage = tooltipsAndDamage.totalDamage;
        tooltips = tooltipsAndDamage.tooltips;

        damageTypeTotal.forEach((value, key) => {
            if (!critical)
                shortTooltips.push(this.getShortToolTip(value.value,value.name))
            else
                critShortTooltips.push(this.getShortToolTip(value.value,value.name))
        })
        // Add normal data
        let flavor;
        if (isMultiattack) flavor = game.i18n.localize("D35E.Damage") + ` (${game.i18n.localize("D35E.SubAttack")} ${multiattack})`;
        else if (!critical) flavor = this.item.isHealing ? game.i18n.localize("D35E.Healing") : game.i18n.localize("D35E.Damage");
        else flavor = this.item.isHealing ? game.i18n.localize("D35E.HealingCritical") : game.i18n.localize("D35E.DamageCritical");
        const damageTypes = rolls.reduce((cur, o) => {
            if (o.damageType !== "" && cur.indexOf(o.damageType) === -1) cur.push(o.damageType);
            return cur;
        }, []);

        // Add cards
        if (critical) {
            this.cards = []
            if (this.item.isHealing) this.cards.push(this.createCriticalChatCardData(game.i18n.localize("D35E.Apply"), -totalDamage, rolls));
            else this.cards.push(this.createCriticalChatCardData(game.i18n.localize("D35E.Apply"), totalDamage, rolls));
        } else {
            this.normalDamage = JSON.stringify(rolls)
            if (this.item.isHealing) this.cards.push(this.createChatCardData(game.i18n.localize("D35E.Apply"), -totalDamage, rolls));
            else if (isMultiattack) this.cards.push(this.createChatCardData(game.i18n.localize("D35E.Apply") + ` (${game.i18n.localize("D35E.SubAttack")} ${multiattack})`, totalDamage, rolls));
            else this.cards.push(this.createChatCardData(game.i18n.localize("D35E.Apply"), totalDamage, rolls));
        }



        data.flavor = flavor;
        data.tooltip = tooltips;
        if (!critical)
            data.shortTooltip = "(" + shortTooltips.join("") + ")";
        else
            data.critShortTooltip = "(" + critShortTooltips.join("") + ")";
        data.total = rolls.reduce((cur, roll) => {
            return cur + roll.roll.total;
        }, 0);
        if (isMultiattack) {
            this.subDamage.push(data);
            this.hasSubdamage = true;
        }
        this.addAltDamage();
    }


    async addAltDamage() {
        if (!this.item) return;

        let data = this.altDamage;

        const rolls = this.item.rollAlternativeDamage({
            data: this.rollData
        });
        if (!rolls || rolls.length === 0) {
            return;
        }
        this.hasAltDamage = true;

        rolls.forEach(r => {
            this.rolls.push(r.roll || r)
        })
        // Add tooltip
        let tooltips = "";
        let totalDamage = 0;
        let shortTooltips = []
        let damageTypeTotal = new Map();
        const tooltipsAndDamage = await this.createTooltipsForRolls(rolls, totalDamage, damageTypeTotal, tooltips);
        totalDamage = tooltipsAndDamage.totalDamage;
        tooltips = tooltipsAndDamage.tooltips;
        damageTypeTotal.forEach((value, key) => {
            shortTooltips.push(this.getShortToolTip(value.value,value.name))
        })
        // Add normal data
        let flavor = game.i18n.localize("D35E.AlternativeDamage");
        const damageTypes = rolls.reduce((cur, o) => {
            if (o.damageType !== "" && cur.indexOf(o.damageType) === -1) cur.push(o.damageType);
            return cur;
        }, []);

        this.altCards.push(this.createChatCardData(game.i18n.localize("D35E.ApplyAlt"), totalDamage, rolls));




        data.flavor = flavor;
        data.tooltip = tooltips;
        data.shortTooltip = "(" + shortTooltips.join("") + ")";
        data.total = rolls.reduce((cur, roll) => {
            return cur + roll.roll.total;
        }, 0);
    }

    async createTooltipsForRolls(rolls, totalDamage, damageTypeTotal, tooltips) {
        for (let roll of rolls) {
            let tooltip = $(await roll.roll.getTooltip());

            let totalText = roll.roll.total.toString();
            if (roll.damageType.length) totalText += ` (${roll.damageType})`;
            tooltip = tooltip.prepend(`
                <header class="part-header flexrow" style="border-bottom: none; margin-top: 4px">
                    <span class="part-formula"></span>
                    <span class="part-total">${totalText}</span>
                </header>
                <div class="dice-formula">${roll.roll.formula}</div>
                `)[0].outerHTML;
            // Alter tooltip
            let tooltipHtml = $(tooltip);
            totalDamage += roll.roll.total;
            tooltip = tooltipHtml[0].outerHTML;
            if (!damageTypeTotal.has(roll.damageTypeUid))
                damageTypeTotal.set(roll.damageTypeUid, {name: roll.damageType, value: 0})
            let _dtt = damageTypeTotal.get(roll.damageTypeUid);
            _dtt.value += roll.roll.total

            tooltips += tooltip;
        }
        return {totalDamage, tooltips};
    }

    createCriticalChatCardData(label, totalDamage, rolls) {
        return {
            normalDamage: this.normalDamage,
            label: label,
            value: Math.max(totalDamage, 1),
            data: JSON.stringify(rolls),
            alignment: JSON.stringify(this.item.data.data.alignment),
            material: JSON.stringify(this.item.data.data.material),
            enh: this.item.data.data.epic ? 10 : this.item.data.data.magic ? 1 : this.item.data.data.enh,
            action: "applyDamage",
            natural20: this.natural20,
            fumble: this.fumble,
            natural20Crit: this.natural20Crit,
            fumbleCrit: this.fumbleCrit,
            incorporeal: this.item.data.data.incorporeal || this.item.actor.data.data.traits.incorporeal
        };
    }

    createChatCardData(label, totalDamage, rolls) {
        return {
            label: label,
            value: Math.max(totalDamage, 1),
            data: JSON.stringify(rolls),
            alignment: JSON.stringify(this.item.data.data.alignment),
            material: JSON.stringify(this.item.data.data.material),
            enh: this.item.data.data.epic ? 10 : this.item.data.data.magic ? 1 : this.item.data.data.enh,
            action: "applyDamage",
            natural20: this.natural20,
            fumble: this.fumble,
            natural20Crit: this.natural20Crit,
            fumbleCrit: this.fumbleCrit,
            incorporeal: this.item.data.data.incorporeal || this.item?.actor?.data?.data?.traits?.incorporeal
        };
    }

    async addEffect({primaryAttack = true, actor = null, useAmount = 1, cl = null, spellPenetration = null} = {}) {
        if (!this.item) return;
        this.effectNotes = this.item.rollEffect({primaryAttack: primaryAttack}, actor, this.rollData);
        this.spellPenetration = spellPenetration;
        this.isSpell = !!cl;
        await this.addSpecial(actor, useAmount, cl, spellPenetration);
    }

    async addSpecial(actor = null, useAmount = 1, cl = null, spellPenetration = null) {
        let _actor = this.item.actor;
        if (actor != null)
            _actor = actor
        if (!this.item) return;
        if (this.item.data.data.specialActions === undefined || this.item.data.data.specialActions === null)
            return;
        for (let action of this.item.data.data.specialActions) {
            if (cl === null) {
                if (this.item.data.type === "spell") {
                    const spellbookIndex = this.item.data.data.spellbook;
                    const spellbook = _actor.data.data.attributes.spells.spellbooks[spellbookIndex];
                    cl = spellbook.cl.total + (this.item.data.data.clOffset || 0);
                }
            }

            if (action.condition !== undefined && action.condition !== null && action.condition !== "") {
                // //console.log('Condition', action.condition, this.rollData)
                if (!(new Roll35e(action.condition, this.rollData).roll().total)) {
                    continue;
                }
            }
            let actionData = action.action.replace(/\(@cl\)/g, `${cl}`).replace(/\(@useAmount\)/g, `${useAmount}`).replace(/\(@attack\)/g, `${this.attack.total}`).replace(/\(@damage\)/g, `${this.damage.total}`);

            // If this is self action, run it on the actor on the time of render
            await _actor.autoApplyActionsOnSelf(actionData)
            this.special.push({
                label: action.name,
                value: actionData,
                isTargeted: action.action.endsWith("target") || action.action.endsWith("target;"),
                action: "customAction",
                img: action.img,
                hasImg: action.img !== undefined && action.img !== null && action.img !== ""
            });
        }
    }

    async addCommandAsSpecial(name, img, actionData, actor = null, useAmount = 1, cl = null, range = 0) {
        let _actor = this.item.actor;
        if (actor != null)
            _actor = actor

        if (cl === null) {
            if (this.item.data.type === "spell") {
                const spellbookIndex = this.item.data.data.spellbook;
                const spellbook = _actor.data.data.attributes.spells.spellbooks[spellbookIndex];
                cl = spellbook.cl.total + (this.item.data.data.clOffset || 0);
            }
        }

        let _actionData = actionData.replace(/\(@cl\)/g, `${cl}`).replace(/\(@useAmount\)/g, `${useAmount}`).replace(/\(@range\)/g, `${range}`).replace(/\(@attack\)/g, `${this.attack.total}`).replace(/\(@damage\)/g, `${this.damage.total}`);

        // If this is self action, run it on the actor on the time of render
        await _actor.autoApplyActionsOnSelf(_actionData)
        this.special.push({
            label: name,
            value: _actionData,
            isTargeted: _actionData.endsWith("target") || _actionData.endsWith("target;"),
            action: "customAction",
            img: img,
            hasImg: img !== undefined && img !== null && img !== ""
        });
    }
}
