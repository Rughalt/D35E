export class EntrySelector extends FormApplication {
  constructor(...args) {
    super(...args);

    this.entries = duplicate(getProperty(this.object.data, this.attribute) || []);
  }

  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      id: "entry-selector",
      classes: ["D35E", "entry"],
      title: "Entry Selector",
      template: "systems/D35E/templates/apps/entry-selector.html",
      width: 320,
      height: "auto",
      closeOnSubmit: false,
      submitOnClose: false,
    });
  }

  get attribute() {
    return this.options.name;
  }

  get fields() {
    return this.options.fields.split(";");
  }

  get dtypes() {
    return this.options.dtypes.split(";");
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

  activateListeners(html) {
    html.find(".entry-control").click(this._onEntryControl.bind(this));

    html.find('tr td input[type="text"]').change(this._onEntryChange.bind(this));

    html.find('button[type="submit"]').click(this._submitAndClose.bind(this));
  }

  async _updateObject(event, formData) {
    const updateData = {};
    
    updateData[this.attribute] = this.entries;

    return this.object.update(updateData);
  }

  async _onEntryControl(event) {
    event.preventDefault();
    const a = event.currentTarget;

    if (a.classList.contains("add-entry")) {
      let obj = [];
      for (let a = 0; a < this.dataCount; a++) {
        let dataType = this.dtypes[a];
        if (dataType === "Number") obj.push(0);
        else obj.push("");
      }
      this.entries.push(obj);
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
      this.entries[index][index2] = Math.floor(v * 100) / 100;
    }
    else this.entries[index][index2] = value;
  }

  async _submitAndClose(event) {
    event.preventDefault();
    await this._onSubmit(event);
    this.close();
  }
}