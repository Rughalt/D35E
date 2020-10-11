export class LevelUpDialog extends FormApplication {
    constructor(...args) {
        super(...args);

        this.actor = this.object.data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "level-up-box",
            classes: ["D35E", "entry"],
            title: "Level Up Wizard",
            template: "systems/D35E/templates/apps/level-up-box.html",
            width: 320,
            height: "auto",
            closeOnSubmit: false,
            submitOnClose: false,
        });
    }

    get attribute() {
        return this.options.name;
    }

    getData() {
        let data = {actor: this.actor, hasNewFeat: (this.actor.data.details.level.available + 1) % 3 == 0, hasNewAbility: (this.actor.data.details.level.available + 1) % 4 == 0,
            config: CONFIG.D35E}
        return data
    }

    activateListeners(html) {
        html.find('button[type="submit"]').click(this._submitAndClose.bind(this));

        html.find('textarea').change(this._onEntryChange.bind(this));
    }

    async _onEntryChange(event) {
        const a = event.currentTarget;
    }

    async _updateObject(event, formData) {
        const updateData = {};
        let ability = formData['ability'];
        if (ability !== undefined)
            updateData[`data.abilities.${ability}.value`] = this.actor.data.abilities[ability].value + 1

        updateData[`data.details.level.available`] = (this.actor.data.details.level.available || 0) + 1
        return this.object.update(updateData);
    }

    async _submitAndClose(event) {
        event.preventDefault();
        await this._onSubmit(event);
        this.close();
    }
}