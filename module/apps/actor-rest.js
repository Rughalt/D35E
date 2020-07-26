export class ActorRestDialog extends BaseEntitySheet {
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
    const actorData = actor.data.data;

    const updateData = {};
    // Restore health and ability damage
    if (formData["restoreHealth"] === true) {
      const hd = actorData.attributes.hd.total;
      let heal = {
        hp: hd,
        abl: 1,
      };
      if (formData["longTermCare"] === true) {
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
    if (formData["restoreDailyUses"] === true) {
      let items = [],
        hasItemUpdates = false;
      for (let a = 0; a < actor.data.items.length; a++) {
        let item = actor.data.items[a];
        items[a] = item;
        let itemUpdate = {};
        const itemData = item.data;

        if (itemData.uses && itemData.uses.per === "day" && itemData.uses.value !== itemData.uses.max) {
          hasItemUpdates = true;
          itemUpdate["data.uses.value"] = itemData.uses.max;
        }
        else if (item.type === "spell") {
          const spellbook = getProperty(actorData, `attributes.spells.spellbooks.${itemData.spellbook}`),
            isSpontaneous = spellbook.spontaneous, 
            usePowerPoints = spellbook.usePowerPoints;
          if (!isSpontaneous && !usePowerPoints && itemData.preparation.preparedAmount < itemData.preparation.maxAmount) {
            hasItemUpdates = true;
            itemUpdate["data.preparation.preparedAmount"] = itemData.preparation.maxAmount;
          }
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
          if (actorData == null && this.actor != null) rollData = this.actor.getRollData();
            updateData[`data.attributes.spells.spellbooks.${key}.powerPoints`] = new Roll(getProperty(actorData, `attributes.spells.spellbooks.${key}.dailyPowerPointsFormula`), rollData).roll()._total;
          
        }
      }

      updateData[`data.attributes.turnUndeadUses`] = getProperty(actorData, `attributes.turnUndeadUsesTotal`)
    }

    actor.update(updateData);
  }
}
