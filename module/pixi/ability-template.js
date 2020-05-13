/**
 * A helper class for building MeasuredTemplates for 5e spells and abilities
 * @extends {MeasuredTemplate}
 */
export class AbilityTemplate extends MeasuredTemplate {

  get pfStyle() {
    return game.settings.get("D35E", "measureStyle") === true;
  }

  _createMouseInteractionManager() {

    // Handle permissions to perform various actions
    const permissions = {
      clickLeft: true,
      clickRight: true,
    };

    // Define callback functions for each workflow step
    const callbacks = {
      clickLeft: this._onClickLeft.bind(this),
      clickRight: this._onClickRight.bind(this),
    };

    if (this.controlIcon) this.controlIcon.removeAllListeners();

    return new MouseInteractionManager(this.layer, this.layer, permissions, callbacks);
  }

  /**
   * A factory method to create an AbilityTemplate instance using provided data
   * @param {string} type -             The type of template ("cone", "circle", "rect" or "ray")
   * @param {number} distance -         The distance/size of the template
   * @return {AbilityTemplate|null}     The template object, or null if the data does not produce a template
   */
  static fromData(options) {
    let type = options.type;
    let distance = options.distance;
    if (!type) return null;
    if (!distance) return null;
    if (!["cone", "circle", "rect", "ray"].includes(type)) return null;

    // Prepare template data
    const templateData = {
      t: type,
      user: game.user._id,
      distance: distance || 5,
      direction: 0,
      x: 0,
      y: 0,
      fillColor: options.color ? options.color : game.user.color,
      texture: options.texture ? options.texture : null,
      _id: randomID(16),
    };

    // Additional type-specific data
    switch (type) {
      case "cone":
        if (game.settings.get("D35E", "measureStyle") === true) templateData.angle = 90;
        else templateData.angle = 53.13;
        break;
      case "rect":
        templateData.distance = distance || 5;
        templateData.width = target.value;
        templateData.direction = 45;
        break;
      case "ray":
        templateData.width = 5;
        break;
      default:
        break;
    }

    // Return the template constructed from the item data
    return new this(templateData);
  }

  /* -------------------------------------------- */

  /**
   * Creates a preview of the spell template
   * @param {Event} event   The initiating click event
   */
  async drawPreview(event) {
    this.initialLayer = canvas.activeLayer;
    this.draw();
    this.layer.activate();
    this.layer.preview.addChild(this);
    this.active = true;
    return this.activatePreviewListeners();
  }

  /* -------------------------------------------- */

  /**
   * Activate listeners for the template preview
   * @param {CanvasLayer} initialLayer  The initially active CanvasLayer to re-activate after the workflow is complete
   * @returns {Promise<boolean>} Returns true if placed, or false if cancelled
   */
  activatePreviewListeners() {
    return new Promise(resolve => {
      this.moveTime = 0;

      // Activate listeners
      this.mouseInteractionManager = this._createMouseInteractionManager().activate();
      canvas.stage.on("mousemove", this._onMouseMove.bind(this));
      // canvas.stage.on("mousedown", handlers.lc);
      // canvas.app.view.oncontextmenu = handlers.rc;
      canvas.app.view.onwheel = this._onMouseWheel.bind(this);

      this.__cb = (result) => {
        resolve(result);
      };
    });
  }

  _onMouseWheel(event) {
    if (event.ctrlKey) event.preventDefault(); // Avoid zooming the browser window
    event.stopPropagation();
    let delta, snap;
    if (this.pfStyle && this.data.t === "cone") {
      delta = 90;
      snap = event.shiftKey ? delta : 45;
    }
    else {
      delta = canvas.grid.type > CONST.GRID_TYPES.SQUARE ? 30 : 15;
      snap = event.shiftKey ? delta : 5;
    }
    this.data.direction += (snap * Math.sign(event.deltaY));
    this.refresh();
  }

  _onMouseMove(event) {
    event.stopPropagation();
    let now = Date.now(); // Apply a 20ms throttle
    if (now - this.moveTime <= 20) return;
    const center = event.data.getLocalPosition(this.layer);
    let pos;
    if (this.pfStyle && this.data.t === "cone") {
      const cs = canvas.dimensions.size * 0.5;
      pos = canvas.grid.getSnappedPosition(center.x - cs, center.y - cs, 1);
      pos.x += cs;
      pos.y += cs;
    }
    else if (this.pfStyle && this.data.t === "circle") {
      pos = canvas.grid.getSnappedPosition(center.x, center.y, 1);
    }
    else pos = canvas.grid.getSnappedPosition(center.x, center.y, 2);
    this.data.x = pos.x;
    this.data.y = pos.y;
    this.refresh();
    this.moveTime = now;
  }

  _onClickRight(event) {
    this.layer.preview.removeChildren();
    this.active = false;
    // Deactivate events
    canvas.stage.off("mousemove", this._onMouseMove);
    canvas.app.view.onwheel = null;
    this.mouseInteractionManager._deactivateClickEvents();
    // Clear highlight
    const hl = canvas.grid.getHighlightLayer(`Template.${this.id}`);
    hl.clear();

    this.initialLayer.activate();
    if (this.__cb) this.__cb(false);
  }

  _onClickLeft(event) {
    // Confirm final snapped position
    const destination = canvas.grid.getSnappedPosition(this.x, this.y, 2);
    this.data.x = destination.x;
    this.data.y = destination.y;

    // Create the template
    canvas.scene.createEmbeddedEntity("MeasuredTemplate", this.data);

    if (this.__cb) this.__cb(true);
    this._onClickRight(event);
  }

  refresh() {
    super.refresh();

    if (this.active) {
      this.highlightGrid();
    }
  }
}
