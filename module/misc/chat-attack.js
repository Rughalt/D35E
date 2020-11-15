export class ChatAttack {
    constructor(item, label = "", actor = null) {
        this.setItem(item, actor);
        this.label = label;

        this.attack = {
            flavor: "",
            tooltip: "",
            total: 0,
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

        this.subDamage = [];
        this.hasSubdamage = false;
        this.hasDamage = false;

        this.cards = [];
        this.special = [];
        this.effectNotes = "";
        this.rolls = []
    }

    get critRange() {
        return getProperty(this.item, "data.data.ability.critRange") || 20;
    }

    /**
     * Sets the attack's item reference.
     * @param {ItemPF} item - The item to reference.
     * @param actor
     */
    setItem(item, actor = null) {
        if (item == null) {
            this.rollData = {};
            this.item = null;
            return;
        }

        this.item = item;
        this.rollData = item.actor != null ? item.actor.getRollData() : actor != null ? actor.getRollData() : {};
        this.rollData.item = duplicate(this.item.data.data);
    }

    async addAttack({bonus = null, extraParts = [], primaryAttack = true, critical = false} = {}) {
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
        let d20 = roll.parts[0];
        let critType = 0;
        if ((d20.total >= this.critRange && !critical) || (d20.total === 20 && critical)) critType = 1;
        else if (d20.total === 1) critType = 2;

        // Add tooltip
        let tooltip = $(await roll.getTooltip()).prepend(`<div class="dice-formula">${roll.formula}</div>`)[0].outerHTML;
        data.flavor = critical ? game.i18n.localize("D35E.CriticalConfirmation") : this.label;
        data.tooltip = tooltip;
        data.total = roll.total;
        data.isCrit = critType === 1;
        data.isFumble = critType === 2;


        // Add crit confirm
        if (!critical && d20.total >= this.critRange) {
            this.hasCritConfirm = true;
            await this.addAttack({bonus: bonus || 0, extraParts: extraParts, primaryAttack: primaryAttack, critical: true});
        }
    }

    getShortToolTip(damageText) {
        var match = damageText.match(/([0-9]+) \((.*?)\)/)
        if (match === null) return `<img src="/systems/D35E/icons/damage-type/unknown.svg" title="Part" class="dmg-type-icon" />${damageText}`
        let dmgVal = match[1];
        let dmgName = match[2];
        let dmgIconBase = match[2].toLowerCase();
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
        return `<img src="/systems/D35E/icons/damage-type/${dmgIcon}.svg" title="${dmgName}" class="dmg-type-icon" />${dmgVal}`
    }

    async addDamage({extraParts = [], primaryAttack = true, critical = false, multiattack = 0} = {}) {
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
            critical: critical
        });
        rolls.forEach(r => {
            this.rolls.push(r.roll || r)
        })
        // Add tooltip
        let tooltips = "";
        let totalDamage = 0;
        let shortTooltips = []
        let critShortTooltips = []
        for (let roll of rolls) {
            let tooltip = $(await roll.roll.getTooltip()).prepend(`<div class="dice-formula">${roll.roll.formula}</div>`)[0].outerHTML;
            // Alter tooltip
            let tooltipHtml = $(tooltip);
            totalDamage += roll.roll.total;
            let totalText = roll.roll.total.toString();

            if (roll.damageType.length) totalText += ` (${roll.damageType})`;
            tooltipHtml.find(".part-total").text(totalText);
            tooltip = tooltipHtml[0].outerHTML;
            if (!critical)
                shortTooltips.push(this.getShortToolTip(totalText))
            else
                critShortTooltips.push(this.getShortToolTip(totalText))
            tooltips += tooltip;
        }
        // Add normal data
        let flavor;
        if (isMultiattack) flavor = game.i18n.localize("D35E.Damage") + ` (${game.i18n.localize("D35E.SubAttack")} ${multiattack})`;
        else if (!critical) flavor = this.item.isHealing ? game.i18n.localize("D35E.Healing") : game.i18n.localize("D35E.Damage");
        else flavor = this.item.isHealing ? game.i18n.localize("D35E.HealingCritical") : game.i18n.localize("D35E.DamageCritical");
        const damageTypes = this.item.data.data.damage.parts.reduce((cur, o) => {
            if (o[1] !== "" && cur.indexOf(o[1]) === -1) cur.push(o[1]);
            return cur;
        }, []);

        // Add card
        if (critical) {
            if (this.item.isHealing) this.cards.push({
                label: game.i18n.localize("D35E.ApplyCriticalHealing"),
                value: -totalDamage,
                action: "applyDamage",
            });
            else this.cards.push({
                label: game.i18n.localize("D35E.ApplyCriticalDamage"),
                value: totalDamage,
                action: "applyDamage",
            });
        } else {
            if (this.item.isHealing) this.cards.push({
                label: game.i18n.localize("D35E.ApplyHealing"),
                value: -totalDamage,
                action: "applyDamage",
            });
            else if (isMultiattack) this.cards.push({
                label: game.i18n.localize("D35E.ApplyDamage") + ` (${game.i18n.localize("D35E.SubAttack")} ${multiattack})`,
                value: totalDamage,
                action: "applyDamage",
            });
            else this.cards.push({
                    label: game.i18n.localize("D35E.ApplyDamage"),
                    value: totalDamage,
                    action: "applyDamage",
                });
        }

        data.flavor = damageTypes.length > 0 ? `${flavor} (${damageTypes.join(", ")})` : flavor;
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
    }

    async addEffect({primaryAttack = true, actor = null} = {}) {
        if (!this.item) return;
        this.effectNotes = this.item.rollEffect({primaryAttack: primaryAttack}, actor);
        this.addSpecial(actor);
    }

    async addSpecial(actor = null) {
        let _actor = this.item.actor;
        if (actor != null)
            _actor = actor
        if (!this.item) return;
        if (this.item.data.data.specialActions === undefined || this.item.data.data.specialActions === null)
            return;
        for (let action of this.item.data.data.specialActions) {
            let cl = 0;
            if (this.item.data.type === "spell") {
                const spellbookIndex = this.item.data.data.spellbook;
                const spellbook = _actor.data.data.attributes.spells.spellbooks[spellbookIndex];
                cl = spellbook.cl.total + (this.item.data.data.clOffset || 0);
            }

            if (action.condition !== undefined && action.condition !== null && action.condition !== "") {
                // console.log('Condition', action.condition, this.rollData)
                if (!(new Roll(action.condition, this.rollData).roll().total)) {
                    continue;
                }
            }

            this.special.push({
                label: action.name,
                value: action.action.replace(/\(@cl\)/g, `${cl}`),
                isTargeted: action.action.endsWith("target") || action.action.endsWith("target;"),
                action: "customAction",
                img: action.img,
                hasImg: action.img !== undefined && action.img !== null && action.img !== ""
            });
        }
    }
}