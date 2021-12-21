/**
 * A simple form to set actor movement speeds
 * @implements {BaseEntitySheet}
 */
export default class ActorSensesConfig extends DocumentSheet {

    /** @override */
    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            classes: ["D35E"],
            template: "systems/D35E/templates/apps/senses-config.html",
            width: 300,
            height: "auto"
        });
    }

    /* -------------------------------------------- */

    /** @override */
    get title() {
        return `${game.i18n.localize("D35E.SensesConfig")}: ${this.object.name}`;
    }

    /* -------------------------------------------- */

    /** @override */
    getData(options) {
        const senses = this.object.data.data.attributes?.senses ?? {};
        const data = {
            senses: {},
            special: senses.special ?? "",
            lowLight: senses.lowLight ?? "",
            lowLightMultiplier: senses.lowLightMultiplier ?? 2,
            units: senses.units
        };
        for ( let [name, label] of Object.entries(CONFIG.D35E.senses) ) {
            const v = senses[name];
            data.senses[name] = {
                label: game.i18n.localize(label),
                value: Number.isNumeric(v) ? v.toNearest(0.1) : 0
            }
        }
        return data;
    }
}
