'use strict';

angular.module('bubbleGraph', [])
	.directive('bubbles', function() {
		return {
			restrict: 'EA',
			replace: true,
			template: '<canvas></canvas>',
			scope: {
				width: '=width',
				height: '=height',
				data: '=data'
			},
			controller: ['$scope', '$attrs', 'bubblesGraph', function($scope, $attrs, bubblesGraph) {
				$scope.data = bubblesGraph.normalizeData($scope.data, $attrs.tooltipPosition);

				let bubbles, arrowHeight = 10,
					canvas = document.querySelector('#' + $attrs.id),
					context = canvas.getContext('2d'),
					canvasData = bubblesGraph.definePositions(
						$scope.data,
						parseInt($scope.width),
						parseInt($scope.height),
						$attrs.sort,
						$attrs.randomize != null,
						$attrs.orientation,
						$attrs.fixedWidth != null,
						$attrs.fixedHeight != null,
						$attrs.granularity != null ? $attrs.granularity : 512
					);

				canvas.width = canvasData.width;
				canvas.height = canvasData.height;

				bubbles = bubblesGraph.normalizeBubbles(context, canvasData.bubbles, $attrs.tooltipType, arrowHeight);

				bubblesGraph.draw(bubbles, context, $attrs.clipText != null);

				bubblesGraph.addEvents(canvas, context, bubbles, $attrs.tooltipType, $attrs.clipText != null);

				canvas.addEventListener('bubble_clicked', function(e) {
					$scope.$parent.$root.$broadcast('bubble_clicked', e.detail);
				});
			}]
		};
	})
	.factory('bubblesGraph', function() {
		return {
			definePositions: function(data, width, height, sort, randomize, restrictOrientation, fixedWidth, fixedHeight, granularity, defaultDirectionX = 0, defaultDirectionY = 1) {
				let t, directionX, directionY,
					k = restrictOrientation === 'v' ? granularity / 2 : 0,
					l = 0,
					invalidAngle = false,
					noRestriction = false,
					inCircle = false;

				if (sort === 'desc' || sort === 'asc') {
					data.sort((a, b) => {
						return (sort === 'desc') ? (b.r - a.r) : (a.r - b.r);
					});
				}

				for (let i = 0; i < data.length; ++i) {
					data[i].x = i * Math.pow(width, 2);
					data[i].y = i * Math.pow(height, 2);
				}

				for (let j = 1; j < data.length; ++j) {
					l = 0;
					inCircle = true;
					/*Either we use random directions, or we set them according to current comparative circle's position*/
					if (randomize) {
						directionX = Math.round(Math.random()) * Math.PI;
						directionY = Math.round(Math.random()) * 2 - 1;
					} else if (data[l].x > 0 && data[l].y > 0) {
						directionX = Math.PI / 2;
						directionY = 1;
					} else if (data[l].x < 0 && data[l].y > 0) {
						directionX = Math.PI / 2;
						directionY = -1;
					} else if (data[l].x > 0 && data[l].y < 0) {
						directionX = 0;
						directionY = -1;
					} else if (data[l].x < 0 && data[l].y < 0) {
						directionX = 0;
						directionY = 1;
					} else {
						directionX = defaultDirectionX;
						directionY = defaultDirectionY;
					}

					while (inCircle) {
						inCircle = false;
						noRestriction = false;
						do {
							invalidAngle = false;
							t = Math.PI * (k / granularity) * directionY + directionX;
							data[j].x = data[l].x + (data[l].r + data[l].stroke.lineWidth - 1 + data[j].r + data[j].stroke.lineWidth - 1) * Math.cos(t);
							data[j].y = data[l].y + (data[l].r + data[l].stroke.lineWidth - 1 + data[j].r + data[j].stroke.lineWidth - 1) * Math.sin(t);

							if (!noRestriction && Math.floor(data[l].y) !== 0 && restrictOrientation === 'h') {
								invalidAngle = (Math.abs(t) > Math.abs(Math.PI / 4) && Math.abs(t) < Math.abs((3 * Math.PI) / 4)) || (Math.abs(t) > Math.abs((5 * Math.PI) / 4) && Math.abs(t) < Math.abs(7 * Math.PI / 4));
							} else if (!noRestriction && Math.floor(data[l].x) !== 0 && restrictOrientation === 'v') {
								invalidAngle = (Math.abs(t) < Math.abs(Math.PI / 4) && Math.abs(t) > Math.abs((7 * Math.PI) / 4)) || (Math.abs(t) < Math.abs((5 * Math.PI) / 4) && Math.abs(t) > Math.abs(3 * Math.PI / 4));
							}
							k++;

							if (k === granularity * 2) {
								k = 0;
								l++;

								if (l >= data.length) {
									noRestriction = true;
									l = 0;
								}
							}
						} while (invalidAngle);

						/*Check wether the current point is not in another circle (whom radius has been added to current circle to avoid colliding)*/
						for (let m = 0; m < data.length; ++m) {
							if (m !== j) {
								inCircle = Math.pow(data[j].x - data[m].x, 2) + Math.pow(data[j].y - data[m].y, 2) < Math.pow(data[m].r + data[m].stroke.lineWidth - 1 + data[j].r + data[j].stroke.lineWidth - 1, 2);
								if (inCircle) {
									break;
								}
							}
						}
					}
				}

				if (!fixedHeight) {
					for (let i = 0; i < data.length; ++i) {
						height += Math.abs(data[i].y) + 3 + data[i].r + data[i].stroke.lineWidth >= height / 2 ? Math.abs(Math.abs(data[i].y) + 3 + data[i].r + data[i].stroke.lineWidth - (height / 2)) + 5 : 0;
					}
				}

				if (!fixedWidth) {
					for (let i = 0; i < data.length; ++i) {
						width += Math.abs(data[i].x) + 3 + data[i].r + data[i].stroke.lineWidth >= width / 2 ? Math.abs(Math.abs(data[i].x) + 3 + data[i].r + data[i].stroke.lineWidth - (width / 2)) + 5 : 0;
					}
				}

				return {
					bubbles: data,
					width: Math.ceil(width),
					height: Math.ceil(height)
				};
			},
			normalizeData: function(data, tooltipPosition = 'left') {
				for (let i = 0; i < data.length; ++i) {
					data[i].color = Object.assign({
						hue: data[i].r > 360 ? data[i].r - 360 : data[i].r,
						saturation: 80,
						light: 40,
						alpha: 0.1
					}, data[i].color);
					if (!('stroke' in data[i])) {
						data[i].stroke = {color: {}};
					}
					data[i].stroke.color = Object.assign({
						hue: data[i].color.hue,
						saturation: 60,
						light: 40,
						alpha: 1
					}, data[i].stroke.color);
					data[i].stroke = Object.assign({lineWidth: 1}, data[i].stroke);
					data[i].text.color = Object.assign({
						hue: 0,
						saturation: 0,
						light: 0,
						alpha: 1
					}, data[i].text.color);
					data[i].text = Object.assign({font: '10px sans serif'}, data[i].text);
					data[i].tooltip.text.color = Object.assign({
						hue: 0,
						saturation: 100,
						light: 100,
						alpha: 1
					}, data[i].tooltip.text.color);
					data[i].tooltip.text = Object.assign({font: '10px sans serif'}, data[i].tooltip.text);
					data[i].tooltip.color = Object.assign({
						hue: 0,
						saturation: 0,
						light: 0,
						alpha: 0.8
					}, data[i].tooltip.color);
					if (!('stroke' in data[i].tooltip)) {
						data[i].tooltip.stroke = {color: {}};
					}
					data[i].tooltip.stroke.color = Object.assign({
						hue: 0,
						saturation: 0,
						light: 0,
						alpha: 1
					}, data[i].tooltip.stroke.color);
					data[i].tooltip.stroke = Object.assign({lineWidth: 0}, data[i].tooltip.stroke);
					data[i].tooltip = Object.assign({position: tooltipPosition}, data[i].tooltip);
					data[i] = Object.assign({clickable: false}, data[i]);
				}

				return data;
			},
			normalizeBubbles: function(context, bubbles, tooltipType, arrowHeight) {
				for (let i = 0; i < bubbles.length; ++i) {
					bubbles[i].x += context.canvas.width / 2;
					bubbles[i].y += context.canvas.height / 2;

					bubbles[i].tooltip.type = tooltipType;
					switch(tooltipType) {
						case 'arrow' :
							bubbles[i].tooltip.arrow_height = arrowHeight;
							this.defineArrowtooltip(context, bubbles[i]);
							break;
						case 'caption' :
							this.defineCaptionTooltip(context, bubbles[i]);
							break;
					}
				}

				return bubbles;
			},
			defineArrowtooltip: function(context, bubble) {
				let unplaced = true, cpt = 0;

				bubble.tooltip.width = 0;
				bubble.tooltip.height = context.measureText('M').width * (bubble.tooltip.text.lines.length + 3);

				for (let i = 0; i < bubble.tooltip.text.lines.length; ++i) {
					if (context.measureText(bubble.tooltip.text.lines[i]).width > bubble.tooltip.width) {
						bubble.tooltip.width = context.measureText(bubble.tooltip.text.lines[i]).width + 20 + 3 * bubble.tooltip.text.lines.length;
					}
				}

				while (unplaced) {
					switch (bubble.tooltip.position) {
						case 'bottom':
							++cpt;
							bubble.tooltip.x = bubble.x - bubble.tooltip.width / 2;
							bubble.tooltip.y = bubble.y + bubble.r + bubble.stroke.lineWidth - 1 + bubble.tooltip.arrow_height;
							if (bubble.tooltip.y + bubble.tooltip.height > context.canvas.height && cpt < 4) {
								bubble.tooltip.position = 'top';
							} else if (bubble.tooltip.x < 0 && cpt < 4) {
								bubble.tooltip.position = 'right';
							} else if (bubble.tooltip.x + bubble.tooltip.width > context.canvas.width && cpt < 4) {
								bubble.tooltip.position = 'left';
							} else {
								unplaced = false;
								bubble.tooltip.arrow_position = 'top';
							}
							break;
						case 'left':
							++cpt;
							bubble.tooltip.x = bubble.x - bubble.r - bubble.stroke.lineWidth + 1 - bubble.tooltip.arrow_height - bubble.tooltip.width;
							bubble.tooltip.y = bubble.y - (bubble.tooltip.height / 2);
							if (bubble.tooltip.x < 0 && cpt < 4) {
								bubble.tooltip.position = 'right';
							} else if (bubble.tooltip.y + bubble.tooltip.height > context.canvas.height && cpt < 4) {
								bubble.tooltip.position = 'top';
							} else if (bubble.tooltip.y < 0 && cpt < 4) {
								bubble.tooltip.position = 'bottom';
							} else {
								unplaced = false;
								bubble.tooltip.arrow_position = 'right';
							}
							break;
						case 'top':
							++cpt;
							bubble.tooltip.x = bubble.x - bubble.tooltip.width / 2;
							bubble.tooltip.y = bubble.y - bubble.r - bubble.stroke.lineWidth + 1 - bubble.tooltip.arrow_height - bubble.tooltip.height;
							if (bubble.tooltip.y < 0 && cpt < 4) {
								bubble.tooltip.position = 'bottom';
							} else if (bubble.tooltip.x < 0 && cpt < 4) {
								bubble.tooltip.position = 'right';
							} else if (bubble.tooltip.x + bubble.tooltip.width > context.canvas.width && cpt < 4) {
								bubble.tooltip.position = 'left';
							}  else {
								unplaced = false;
								bubble.tooltip.arrow_position = 'bottom';
							}
							break;
						case 'right':
							++cpt;
							bubble.tooltip.x = bubble.x + bubble.r + bubble.stroke.lineWidth - 1 + bubble.tooltip.arrow_height;
							bubble.tooltip.y = bubble.y - (bubble.tooltip.height / 2);
							if (bubble.tooltip.x + bubble.tooltip.width > context.canvas.width && cpt < 4) {
								bubble.tooltip.position = 'left';
							} else if (bubble.tooltip.y + bubble.tooltip.height > context.canvas.height && cpt < 4) {
								bubble.tooltip.position = 'top';
							} else if (bubble.tooltip.y < 0 && cpt < 4) {
								bubble.tooltip.position = 'bottom';
							} else {
								unplaced = false;
								bubble.tooltip.arrow_position = 'left';
							}
							break;
					}
				}
			},
			defineCaptionTooltip: function(context, bubble) {
				bubble.tooltip.width = 0;
				bubble.tooltip.height = context.measureText('M').width * (bubble.tooltip.text.lines.length + 3);

				for (let i = 0; i < bubble.tooltip.text.lines.length; ++i) {
					if (context.measureText(bubble.tooltip.text.lines[i]).width > bubble.tooltip.width) {
						bubble.tooltip.width = context.measureText(bubble.tooltip.text.lines[i]).width + 20 + 3 * bubble.tooltip.text.lines.length;
					}
				}

				switch (bubble.tooltip.position) {
					case 'top-left':
						bubble.tooltip.x = bubble.tooltip.y = 0;
						break;
					case 'top':
						bubble.tooltip.x = context.canvas.width / 2 - bubble.tooltip.width / 2;
						bubble.tooltip.y = 0;
						break;
					case 'top-right':
						bubble.tooltip.x = context.canvas.width - bubble.tooltip.width;
						bubble.tooltip.y = 0;
						break;
					case 'right':
						bubble.tooltip.x = context.canvas.width - bubble.tooltip.width;
						bubble.tooltip.y = context.canvas.height / 2;
						break;
					case 'bottom-right':
						bubble.tooltip.x = context.canvas.width - bubble.tooltip.width;
						bubble.tooltip.y = context.canvas.height - bubble.tooltip.height;
						break;
					case 'bottom':
						bubble.tooltip.x = context.canvas.width / 2 - bubble.tooltip.width / 2;
						bubble.tooltip.y = context.canvas.height - bubble.tooltip.height;
						break;
					case 'bottom-left':
						bubble.tooltip.x = 0;
						bubble.tooltip.y = context.canvas.height - bubble.tooltip.height;
						break;
					case 'left':
						bubble.tooltip.x = 0;
						bubble.tooltip.y = context.canvas.height / 2;
						break;
				}
			},
			draw: function(bubbles, context, clipText, exceptId = null) {
				for (let i = 0; i < bubbles.length; ++i) {
					if (i !== exceptId) {
						this.drawOne(bubbles[i], context, clipText);
					}
				}
			},
			drawOne: function(bubble, context, clipText, fill = {}, stroke = {}, text = {}) {
				fill = Object.assign({}, bubble.color, fill);
				stroke.color = Object.assign({}, bubble.stroke.color, stroke.color);
				stroke = Object.assign({}, bubble.stroke, stroke);
				text.color = Object.assign({}, bubble.text.color, text.color);
				text = Object.assign({}, bubble.text, text);

				this.drawCircle(
					context,
					bubble.x,
					bubble.y,
					bubble.r,
					this.getHSLA(fill),
					this.getHSLA(stroke.color),
					stroke.lineWidth
				);

				this.drawText(
					context,
					bubble.text.lines,
					bubble.x,
					bubble.y,
					2 * bubble.r,
					text.font,
					this.getHSLA(text.color),
					true,
					clipText
				);
			},
			drawBubbleTooltip: function(context, bubble) {
				switch(bubble.tooltip.type) {
					case 'arrow' :
						this.drawTooltipBox(
							context,
							bubble.tooltip.x,
							bubble.tooltip.y,
							bubble.tooltip.width,
							bubble.tooltip.height,
							10,
							this.getHSLA(bubble.tooltip.color),
							bubble.tooltip.stroke.lineWidth,
							this.getHSLA(bubble.tooltip.stroke.color),
							bubble.tooltip.arrow_position,
							bubble.tooltip.arrow_height
						);
						break;
					case 'caption' :
						this.drawTooltipBox(
							context,
							bubble.tooltip.x,
							bubble.tooltip.y,
							bubble.tooltip.width,
							bubble.tooltip.height,
							10,
							this.getHSLA(bubble.tooltip.color),
							bubble.tooltip.stroke.lineWidth,
							this.getHSLA(bubble.tooltip.stroke)
						);
						break;
				}

				this.drawText(
					context,
					bubble.tooltip.text.lines,
					bubble.tooltip.x + bubble.tooltip.width / 2,
					bubble.tooltip.y + bubble.tooltip.height / (bubble.tooltip.text.lines.length + 1),
					bubble.tooltip.width,
					bubble.tooltip.text.font,
					this.getHSLA(bubble.tooltip.text.color),
					false,
					false
				);
			},
			drawCircle: function(context, x, y, radius, fillStyle, strokeStyle, lineWidth) {
				context.beginPath();
				context.arc(x, y, radius, 0, 2 * Math.PI, false);
				context.fillStyle = fillStyle;
				context.fill();
				context.lineWidth = lineWidth;
				context.strokeStyle = strokeStyle;
				context.stroke();
				context.closePath();
			},
  			drawText: function(context, textLines, x, y, maxWidth, font, style, alignCenter = false, clipText = false) {
				let textWidth, textHeight, lines = [], clipTextPadding = 2;
  
  				context.font = font;
  
 				if (clipText) {
 					context.save();
 					context.beginPath();
 					context.arc(x, y, (maxWidth / 2) - clipTextPadding, 0, 2 * Math.PI, false);
 					context.clip();
 				}
 
  				for (let k = 0; k < textLines.length; ++k) {
  					textWidth = context.measureText(textLines[k]).width;
  					if (clipText) {
						if (maxWidth >= 10) {
  							lines.push(textLines[k]);
  						}
  					} else {
 						if (textWidth < maxWidth) {
 							lines.push(textLines[k]);
 						}
 					}
 				}
 
 				textWidth = 0;
 				textHeight = context.measureText('M').width;
 
 				if (!alignCenter) {
 					for (let i = 0; i < lines.length; ++i) {
 						if (context.measureText(lines[i]).width > textWidth) {
 							textWidth = context.measureText(lines[i]).width;
 						}
 					}
 				}
 
 				for (let j = 0; j < lines.length; ++j) {
 					if (alignCenter) {
 						textWidth = context.measureText(lines[j]).width;
 						if (clipText && textWidth >= maxWidth) {
 							textWidth = maxWidth - (clipTextPadding * 2);
 						}
 					}
 					context.beginPath();
 					context.fillStyle = style;
 					context.fillText(
 						lines[j],
 						x - textWidth / 2,
 						y + (textHeight / 2) + (j * (textHeight + 3)) - (lines.length > 1 && alignCenter ? lines.length * (textHeight - 3) / 2 : 0)
 					);
 					context.closePath();
 				}
 
 				if (clipText) {
 					context.restore();
 				}
 			},
			drawTooltipBox: function(context, x, y, width, height, radius = 5, fill, strokeLineWidth, strokeStyle, arrowPosition, arrowHeight) {
				if (typeof radius === 'number') {
					radius = {tl: radius, tr: radius, br: radius, bl: radius};
				} else {
					let defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
					for (let side in defaultRadius) {
						radius[side] = radius[side] || defaultRadius[side];
					}
				}
				context.beginPath();
				context.moveTo(x + radius.tl, y);
				if (arrowPosition === 'top') {
					context.lineTo(x + width / 3, y);
					context.lineTo(x + width / 2, y - arrowHeight);
					context.lineTo(x + 2 * width / 3, y);
					context.lineTo(x + width - radius.tr, y);
				} else {
					context.lineTo(x + width - radius.tr, y);
				}
				context.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
				if (arrowPosition === 'right') {
					context.lineTo(x + width, y + height / 3);
					context.lineTo(x + width + arrowHeight, y + height / 2);
					context.lineTo(x + width, y + 2 * height / 3);
					context.lineTo(x + width, y + height - radius.br);
				} else {
					context.lineTo(x + width, y + height - radius.br);
				}
				context.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
				if (arrowPosition === 'bottom') {
					context.lineTo(x + 2 * width / 3, y + height);
					context.lineTo(x + width / 2, y + height + arrowHeight);
					context.lineTo(x + width / 3, y + height);
					context.lineTo(x + radius.bl, y + height);
				} else {
					context.lineTo(x + radius.bl, y + height);
				}
				context.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
				if (arrowPosition === 'left') {
					context.lineTo(x, y + 2 * height / 3);
					context.lineTo(x - arrowHeight, y + height / 2);
					context.lineTo(x, y + height / 3);
					context.lineTo(x, y + radius.tl);
				} else {
					context.lineTo(x, y + radius.tl);
				}
				context.quadraticCurveTo(x, y, x + radius.tl, y);
				if (fill != null) {
					context.fillStyle = fill;
					context.fill();
				}
				if (strokeLineWidth > 0) {
					context.lineWidth = strokeLineWidth;
					context.strokeStyle = strokeStyle;
					context.stroke();
				}
				context.closePath();
			},
			hoveredBubbleId: function(bubbles, context, x, y) {
				for (let i = 0; i < bubbles.length; ++i) {
					context.beginPath();
					context.arc(bubbles[i].x, bubbles[i].y, bubbles[i].r, 0, 2 * Math.PI, false);
					if (context.isPointInPath(x, y)) {
						context.closePath();
						return i;
					}
					context.closePath();
				}
				return -1;
			},
			addEvents: function(canvas, context, bubbles, clipText) {
				let found = -1, self = this;

				canvas.onselectstart = function(e) {
					return false;
				};

				canvas.onmousemove = function(e) {
					let rect = this.getBoundingClientRect(),
						x = e.clientX - rect.left,
						y = e.clientY - rect.top;

					found = self.hoveredBubbleId(bubbles, context, x, y);
					context.clearRect(0, 0, canvas.width, canvas.height);
					self.draw(bubbles, context, clipText, found);

					if (found != -1) {
						self.drawOne(
							bubbles[found],
							context,
							clipText,
							{
								saturation: bubbles[found].color.saturation / 2,
								light: bubbles[found].color.light * (bubbles[found].color.hue === 0 ? 1.5 : 2)
							},
							{},
							{color: {alpha: 1}}
						);

						if (bubbles[found].clickable) {
							canvas.style.cursor = "pointer";
						} else {
							canvas.style.cursor = "default";
						}

						self.drawBubbleTooltip(context, bubbles[found]);
					} else {
						canvas.style.cursor = "default";
					}
				};

				canvas.onclick = function(e) {
					let rect = this.getBoundingClientRect(),
						x = e.clientX - rect.left,
						y = e.clientY - rect.top,
						found = self.hoveredBubbleId(bubbles, context, x, y);

					if (found !== -1) {
						canvas.dispatchEvent(new CustomEvent(
							'bubble_clicked',
							{
								detail: bubbles[found]
							}
						));
					}
				};
			},
			getHSLA: function(colorObject) {
				return 'hsla(' + colorObject.hue + ', ' + colorObject.saturation + '%, ' + colorObject.light + '%, ' + colorObject.alpha + ')';
			}
		};
	});
