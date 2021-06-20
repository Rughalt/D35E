export class DeckEditor extends FormApplication {
    constructor(...args) {
        super(...args);

        this.spellbook = duplicate(getProperty(this.object.data, this.attribute) || {});
        this.actor = this.object.data;
    }

    static get defaultOptions() {
        return mergeObject(super.defaultOptions, {
            id: "deck-editor",
            classes: ["D35E", "entry"],
            title: "Notes Selector",
            template: "systems/D35E/templates/apps/deck-editor.html",
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
        return {spellbook: this.spellbook, actor: this.actor,
            config: CONFIG.D35E}
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
        if (!formData['autoSetup']) {
            for (const [key, value] of Object.entries(formData)) {
                updateData[`${this.attribute}.${key}`] = formData[key];
            }
        } else {
            updateData[`${this.attribute}.class`] = formData['class'];
            updateData[`${this.attribute}.name`] = formData['name']
            updateData[`${this.attribute}.autoSetup`] = true;
        }
        return this.object.update(updateData);
    }

    async _submitAndClose(event) {
        event.preventDefault();
        await this._onSubmit(event);
        this.close();
    }
}