/**
 * This registers very simple layer that is used to properly render
 * left menu buttons.
 */
export default class D35ELayer extends CanvasLayer {
    constructor() {
        super();
    }

    static get layerOptions() {
        return mergeObject(super.layerOptions, {
            objectClass: Note,
            sheetClass: NoteConfig,
            canDragCreate: false,
            zIndex: 180
        });
    }

    selectObjectsFromTokenLayer({x, y, width, height, releaseOptions={}, controlOptions={}}={}) {
        const oldSet = canvas.tokens.controlled;
        // Identify controllable objects
        const controllable = canvas.getLayer("TokenLayer").placeables.filter(obj => obj.visible && (obj.control instanceof Function));
        const newSet = controllable.filter(obj => {
          let c = obj.center;
          return Number.between(c.x, x, x+width) && Number.between(c.y, y, y+height);
        });
        // Release objects no longer controlled
        //console.log(oldSet)
        //console.log(newSet)
        const toRelease = oldSet.filter(obj => !newSet.includes(obj));
        //console.log(toRelease)
        toRelease.forEach(obj => obj.release(releaseOptions));
        // Control new objects
        if ( isObjectEmpty(controlOptions) ) controlOptions.releaseOthers = false;
        const toControl = newSet.filter(obj => !oldSet.includes(obj));
        toControl.forEach(obj => obj.control(controlOptions));
        // Return a boolean for whether the control set was changed
        return (toRelease.length > 0) || (toControl.length > 0);
      }

    /** @override */
    selectObjects({x, y, width, height, releaseOptions={}, controlOptions={}}={}) {
        //console.log('selectObjects')
        releaseOptions = { updateSight: false };
        controlOptions = { releaseOthers: false, updateSight: false };
        const changed = this.selectObjectsFromTokenLayer({x, y, width, height, releaseOptions, controlOptions});
        if ( changed ) canvas.initializeSources();
        return changed;
      }

      /** @override */
      _onClickLeft(event) {
        canvas.tokens.controlled.forEach(token => token.release())
      }

      activate(a, b, c) {
            super.activate(a, b, c)
          canvas.tokens.interactiveChildren = true;
      }

      deactivate(a, b, c) {
          super.deactivate(a, b, c)
          //canvas.tokens.interactiveChildren = false;
      }

    async draw() {
        super.draw();
    }




}

