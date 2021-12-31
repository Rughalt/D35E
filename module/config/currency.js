export class CurrencyConfig extends FormApplication {

  get currencyOptions() {
    return {fields: 'Id;Name;Weight;Value in gp;Group (Currency) Name', dtypes: 'String;String;Number;Number;String'}
  }

  constructor(object, options) {
    super(object || CurrencyConfig.defaultSettings, options)

    let settings = game.settings.get("D35E", "currencyConfig")
    settings = mergeObject(CurrencyConfig.defaultSettings, settings)
    this.entries = settings.currency
  }

  get fields() {
    return this.currencyOptions.fields.split(";");
  }

  get dtypes() {
    return this.currencyOptions.dtypes.split(";");
  }

  get dataCount() {
    return this.fields.length;
  }

  getData() {
    const entries = this.entries.map(o => {
      return o.map((o2, a) => {
        return [o2, this.dtypes[a]];
      });
    });

    return {
      entries: entries,
      fields: this.fields,
    };
  }

  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      title:  game.i18n.localize("SETTINGS.D35ECurrencyConfigName"),
      id: 'currency-config',
      classes: ["D35E", "entry"],
      template: "systems/D35E/templates/settings/currency.html",
      width: 480,
      height: "auto",
    })
  }

  static get defaultSettings() {
    return {
      currency: []
    }
  }

  activateListeners(html) {
    super.activateListeners(html)
    html.find(".entry-control").click(this._onEntryControl.bind(this));

    html.find('tr td input[type="text"]').change(this._onEntryChange.bind(this));

    html.find('button[type="submit"]').click(this._submitAndClose.bind(this));
  }


  async _onEntryControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    if (a.classList.contains("add-entry")) {
      let obj = [];
      if (this.progression) {
        for (let a = 0; a < this.dataCount; a++) {
          let dataType = this.dtypes[a];
          if (a > 0) {
            if (dataType === "Number") obj.push(this.entries.length === 0 ? -1 : this.entries[this.entries.length - 1][a]);
            else obj.push("");
          } else {
            obj.push(this.entries.length+1);
          }
        }
        this.entries.push(obj);
      } else {
        for (let a = 0; a < this.dataCount; a++) {
          let dataType = this.dtypes[a];
          if (dataType === "Number") obj.push(0);
          else obj.push("");
        }
        this.entries.push(obj);
      }
      this._render(false);
    }

    if (a.classList.contains("delete-entry")) {
      const tr = a.closest("tr");
      const index = parseInt(tr.dataset.index);
      this.entries.splice(index, 1);
      this._render(false);
    }
  }

  async _onEntryChange(event) {
    const a = event.currentTarget;

    const tr = a.closest("tr.entry");
    const index = parseInt(tr.dataset.index);
    const index2 = parseInt(a.dataset.index);
    const value = a.value;

    if (a.dataset.dtype === "Number") {
      let v = parseFloat(value);
      if (isNaN(v)) v = 0;
	  /** round off to the nearest .0001 of a standard gp */
      this.entries[index][index2] = v === 0 ? 0 : Math.floor(v * 1000000) / 1000000;
    }
    else this.entries[index][index2] = value;
  }

  async _submitAndClose(event) {
    event.preventDefault();
    await this._onSubmit(event);
    this.close();
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
    settings.currency = this.entries
    await game.settings.set("D35E", "currencyConfig", settings)
    ui.notifications.info(`Updated D35E currency configuration.`)
  }
}
