import { degtorad } from "./lib.js";

// Use 90 degrees cone in D35E style
const TemplateLayer__onDragLeftStart = TemplateLayer.prototype._onDragLeftStart;
TemplateLayer.prototype._onDragLeftStart = function(event) {
  if (!game.settings.get("D35E", "measureStyle")) return TemplateLayer__onDragLeftStart.call(this, event);

  PlaceablesLayer.prototype._onDragLeftStart.call(this, event);

  // Create the new preview template
  const tool = game.activeTool;
  const origin = event.data.origin;
  let pos;
  if (["cone", "circle"].includes(tool)) {
    pos = canvas.grid.getSnappedPosition(origin.x, origin.y, 2);
  }
  else pos = canvas.grid.getSnappedPosition(origin.x, origin.y, 2);
  origin.x = pos.x;
  origin.y = pos.y;

  // Create the template
  const data = {
    user: game.user._id,
    t: tool,
    x: pos.x,
    y: pos.y,
    distance: 0,
    direction: 0,
    fillColor: game.user.data.color || "#FF0000"
  };
  if (tool === "cone") data["angle"] = 90;
  else if (tool === "ray") data["width"] = 5;

  // Assign the template
  let template = new MeasuredTemplate(data);
  event.data.preview = this.preview.addChild(template);
  template.draw();
};


const TemplateLayer__onDragLeftMove = TemplateLayer.prototype._onDragLeftMove;
TemplateLayer.prototype._onDragLeftMove = function(event) {
  if (!game.settings.get("D35E", "measureStyle")) return TemplateLayer__onDragLeftMove.call(this, event);

  PlaceablesLayer.prototype._onDragLeftMove.call(this, event);
  if (event.data.createState >= 1) {
    // Snap the destination to the grid
    let dest = event.data.destination;
    let {x, y} = canvas.grid.getSnappedPosition(dest.x, dest.y, 2);
    dest.x = x;
    dest.y = y;

    // Compute the ray
    let template = event.data.preview,
        ray = new Ray(event.data.origin, event.data.destination),
        ratio = (canvas.dimensions.size / canvas.dimensions.distance);

    // Update the shape data
    if (["cone", "circle"].includes(template.data.t)) {
      const direction = ray.angle;
      template.data.direction = toDegrees(Math.floor((direction + (Math.PI * 0.125)) / (Math.PI * 0.25)) * (Math.PI * 0.25));
      const distance = ray.distance / ratio;
      template.data.distance = Math.floor(distance / canvas.dimensions.distance) * canvas.dimensions.distance;
    }
    else {
      template.data.direction = toDegrees(ray.angle);
      template.data.distance = ray.distance / ratio;
    }

    // Draw the pending shape
    template.refresh();
    event.data.createState = 2;
  }
};


// Highlight grid in D35E style
const MeasuredTemplate_highlightGrid = MeasuredTemplate.prototype.highlightGrid;
MeasuredTemplate.prototype.highlightGrid = function() {
  if (!game.settings.get("D35E", "measureStyle") || !(["circle", "cone"].includes(this.data.t))) return MeasuredTemplate_highlightGrid.call(this);

  const grid = canvas.grid,
        d = canvas.dimensions,
        bc = this.borderColor,
        fc = this.fillColor;

  // Only highlight for objects which have a defined shape
  if ( !this.id || !this.shape ) return;

  // Clear existing highlight
  const hl = grid.getHighlightLayer(`Template.${this.id}`);
  hl.clear();

  // Get number of rows and columns
  let nr = Math.ceil(((this.data.distance * 1.5) / d.distance) / (d.size / grid.h)),
      nc = Math.ceil(((this.data.distance * 1.5) / d.distance) / (d.size / grid.w));

  // Get the center of the grid position occupied by the template
  let x = this.data.x,
    y = this.data.y;

  let [cx, cy] = grid.getCenter(x, y),
    [col0, row0] = grid.grid.getGridPositionFromPixels(cx, cy),
    minAngle = (360 + ((this.data.direction - this.data.angle * 0.5) % 360)) % 360,
    maxAngle = (360 + ((this.data.direction + this.data.angle * 0.5) % 360)) % 360;

  const within_angle = function(min, max, value) {
    min = (360 + min % 360) % 360;
    max = (360 + max % 360) % 360;
    value = (360 + value % 360) % 360;

    if (min < max) return (value >= min && value <= max);
    return (value >= min || value <= max);
  };

  const measureDistance = function(p0, p1) {
    let gs = canvas.dimensions.size,
    ray = new Ray(p0, p1),
    // How many squares do we travel across to get there? If 2.3, we should count that as 3 instead of 2; hence, Math.ceil
    nx = Math.ceil(Math.abs(ray.dx / gs)),
    ny = Math.ceil(Math.abs(ray.dy / gs));

    // Get the number of straight and diagonal moves
    let nDiagonal = Math.min(nx, ny),
        nStraight = Math.abs(ny - nx);

    // Diagonals in PF pretty much count as 1.5 times a straight
    let distance = Math.floor(nDiagonal * 1.5 + nStraight);
    let distanceOnGrid = distance * canvas.dimensions.distance;
    return distanceOnGrid;
  };

  let originOffset = {x: 0, y: 0};
  // Offset measurement for cones
  // Offset is to ensure that cones only start measuring from cell borders, as in https://www.d20pfsrd.com/magic/#Aiming_a_Spell
  if (this.data.t === "cone") {
    // Degrees anticlockwise from pointing right. In 45-degree increments from 0 to 360
    const dir = (this.data.direction >= 0 ? 360 - this.data.direction : -this.data.direction) % 360;
    // If we're not on a border for X, offset by 0.5 or -0.5 to the border of the cell in the direction we're looking on X axis
    let xOffset = this.data.x % d.size != 0 ?
      Math.sign(1 * (Math.round(Math.cos(degtorad(dir)) * 100)) / 100) /2 // /2 turns from 1/0/-1 to 0.5/0/-0.5
      : 0;
    // Same for Y, but cos Y goes down on screens, we invert
    let yOffset = this.data.y % d.size != 0 ?
      -Math.sign(1 * (Math.round(Math.sin(degtorad(dir)) * 100)) / 100) /2
      : 0;
    originOffset.x = xOffset;
    originOffset.y = yOffset;
  }

  // Point we are measuring distances from
  let origin = {
    x: this.data.x + (originOffset.x * d.size),
    y: this.data.y + (originOffset.y * d.size)
  }

  for (let a = -nc; a < nc; a++) {
    for (let b = -nr; b < nr; b++) {
       // Position of cell's top-left corner, in pixels
      let [gx, gy] = canvas.grid.grid.getPixelsFromGridPosition(col0 + a, row0 + b);
      // Position of cell's center, in pixels
      let [cellCenterX, cellCenterY] = [gx + d.size * 0.5, gy + d.size * 0.5];

      // Determine point of origin
      let origin = {x: this.data.x, y: this.data.y};
      origin.x += (originOffset.x * d.size);
      origin.y += (originOffset.y * d.size);

      let ray = new Ray(origin, {x: cellCenterX, y: cellCenterY});

      let rayAngle = (360 + (ray.angle / (Math.PI / 180)) % 360) % 360;
      if (this.data.t === "cone" && ray.distance > 0 && !within_angle(minAngle, maxAngle, rayAngle)) {
        continue;
      }

       // Determine point we're measuring the distance to - always in the center of a grid square
      let destination = {x: cellCenterX, y: cellCenterY};

      let distance = measureDistance(destination, origin);
      if (distance <= this.data.distance) {
        grid.grid.highlightGridPosition(hl, { x: gx, y: gy, color: fc, border: bc });
      }
    }
  }
};

let newFun = MeasuredTemplate.prototype.refresh.toString();
newFun = newFun.replace(
    /this\.template\.beginTextureFill\(\{[\s\S]*\}\)\;/,
    `
			{
				let mat = PIXI.Matrix.IDENTITY;
				// rectangle
				if (this.shape.width && this.shape.height)
					mat.scale(this.shape.width / this.texture.width, this.shape.height / this.texture.height);
				else if (this.shape.radius) {
					mat.scale(this.shape.radius * 2 / this.texture.height, this.shape.radius * 2 / this.texture.width)
					// Circle center is texture start...
					mat.translate(-this.shape.radius, -this.shape.radius);
				} else if (this.data.t === "ray") {
					const d = canvas.dimensions,
								height = this.data.width * d.size / d.distance,
								width = this.data.distance * d.size / d.distance;
					mat.scale(width / this.texture.width, height / this.texture.height);
					mat.translate(0, -height * 0.5);
					mat.rotate(toRadians(this.data.direction));
				} else {// cone
					const d = canvas.dimensions;
			
					// Extract and prepare data
					let {direction, distance, angle} = this.data;
					distance *= (d.size / d.distance);
					direction = toRadians(direction);
					const width = this.data.distance * d.size / d.distance;
					const angles = [(angle/-2), (angle/2)];
					distance = distance / Math.cos(toRadians(angle/2));
			
					// Get the cone shape as a polygon
					const rays = angles.map(a => Ray.fromAngle(0, 0, direction + toRadians(a), distance+1));
					const height = Math.sqrt((rays[0].B.x - rays[1].B.x) * (rays[0].B.x - rays[1].B.x)
													+ (rays[0].B.y - rays[1].B.y) * (rays[0].B.y - rays[1].B.y));
					mat.scale(width / this.texture.width, height / this.texture.height);
					mat.translate(0, -height/2)
					mat.rotate(toRadians(this.data.direction));
				}
				this.template.beginTextureFill({
					texture: this.texture,
					matrix: mat,
					alpha: 0.8
				});
				// move into draw or so
				const source = getProperty(this.texture, "baseTexture.resource.source")
				if ( source && (source.tagName === "VIDEO") && game.D35E.createdMeasureTemplates.has(this.id) ) {
					source.loop = game.settings.get("D35E", "repeatAnimations");
					source.muted = true;
					game.video.play(source);
					game.D35E.createdMeasureTemplates.delete(this.id)
				}
		}`
);

MeasuredTemplate.prototype.refresh = Function(
    `"use strict"; return ( function ${newFun} )`
)();

