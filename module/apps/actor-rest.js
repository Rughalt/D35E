export class ActorRestDialog extends DocumentSheet {
  static get defaultOptions() {
    const options = super.defaultOptions;
    return mergeObject(options, {
      id: "actor-flags",
      classes: ["D35E", "actor-rest"],
      template: "systems/D35E/templates/apps/actor-rest.html",
      width: 500,
      closeOnSubmit: true
    });
  }

  /* -------------------------------------------- */

  /**
   * Configure the title of the special traits selection window to include the Actor name
   * @type {String}
   */
  get title() {
    return `${game.i18n.localize('D35E.Rest')}: ${this.object.name}`;
  }

  /* -------------------------------------------- */

  /**
   * Update the Actor using the configured options
   * Remove/unset any flags which are no longer configured
   */
  _updateObject(event, formData) {
      const actor = this.object;
      actor.rest(formData["restoreHealth"], formData["restoreDailyUses"], formData["longTermCare"]);
  }
}
