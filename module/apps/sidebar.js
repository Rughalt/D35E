import { CompendiumBrowser } from "../apps/compendium-browser.js";

export class SidebarPF extends Sidebar {
  constructor(...args) {
    super(...args);

    this.compendiums = {
      spells: new CompendiumBrowser({ type: "spells", entityType: "Item" }),
      items: new CompendiumBrowser({ type: "items", entityType: "Item" }),
      bestiary: new CompendiumBrowser({ type: "bestiary", entityType: "Actor" }),
    };
  }

  async _render(...args) {
    await super._render(...args);

    const parent = this.element.find("#compendium .directory-footer");
    const child = await renderTemplate("systems/D35E/templates/sidebar/compendiums-footer.html", {});
    parent.append(child);
    this.activateExtraListeners(parent);
  }

  activateExtraListeners(html) {
    html.find(".compendium-footer .compendium.spells").click(e => this._onBrowseCompendium(e, "spells"));
    html.find(".compendium-footer .compendium.items").click(e => this._onBrowseCompendium(e, "items"));
    html.find(".compendium-footer .compendium.bestiary").click(e => this._onBrowseCompendium(e, "bestiary"));
  }

  _onBrowseCompendium(event, type) {
    event.preventDefault();

    this.compendiums[type]._render(true);
  }
}