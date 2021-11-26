export class RollConfig extends FormApplication {
  constructor(object, options) {
    super(object || RollConfig.defaultSettings, options)
  }

  /** Collect data for the template. @override */
  async getData() {
    let settings = await game.settings.get("D35E", "rollConfig")
    settings = mergeObject(RollConfig.defaultSettings, settings)
    return {settings: settings, rollModes: CONFIG.Dice.rollModes}
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title:  game.i18n.localize("SETTINGS.D35ERollConfigName"),
      id: 'roll-config',
      template: "systems/D35E/templates/settings/roll-config.html",
      width: 480,
      height: "auto"
    })
  }

  static get defaultSettings() {
    return {
      rollConfig: {
        character:     {attack: "", applyDamage: "", skill: "", savingThrow: "", grapple: "", hpRoll: ""},
        npc:    {attack: "", applyDamage: "", skill: "", savingThrow: "", grapple: "", hpRoll: ""},
        trap:    {attack: "", applyDamage: "", skill: "", savingThrow: "", grapple: "", hpRoll: ""}
      }
    }
  }

  /**
   * Activate the default set of listeners for the Entity sheet These listeners handle basic stuff like form submission or updating images.
   * @override
   */
  activateListeners(html) {
    super.activateListeners(html)
    html.find('button[name="reset"]').click(this._onReset.bind(this))
    html.find('button[name="submit"]').click(this._onSubmit.bind(this))
  }

  /**
   * Handle button click to reset default settings
   * @param event {Event}   The initial button click event
   * @private
   */
  async _onReset(event) {
    event.preventDefault();
    await game.settings.set("D35E", "rollConfig", RollConfig.defaultSettings)
    ui.notifications.info(`Reset D35E roll configuration.`)
    return this.render()
  }

  _onSubmit(event) {
    super._onSubmit(event)
  }

  /**
   * This method is called upon form submission after form data is validated.
   * @override
   */
  async _updateObject(event, formData) {
    const settings = expandObject(formData)
    await game.settings.set("D35E", "rollConfig", settings)
    ui.notifications.info(`Updated D35E roll configuration.`)
  }
}
