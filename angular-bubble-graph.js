'use strict';

angular.module('bubbleGraph', [])
	.directive('bubbles', function(){
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
				let arrowPosition, found = -1,
					canvas = document.querySelector('#' + $attrs.id),
					context = canvas.getContext('2d'),
					canvasData = bubblesGraph.define(
						$scope.data,
						parseInt($scope.width),
						parseInt($scope.height),
						$attrs.sort,
						$attrs.randomize != null,
						$attrs.orientation,
						$attrs.fixedWidth != null,
						$attrs.fixedHeight != null,
						$attrs.granularity != null ? $attrs.granularity : 512
					),
					bubbles = canvasData.bubbles;

				canvas.width = canvasData.width;
				canvas.height = canvasData.height;
				bubblesGraph.draw(bubbles, context);

				canvas.onselectstart = function(e) {
					return false;
				};

				canvas.onmousemove = function(e) {
					let rect = this.getBoundingClientRect(),
						x = e.clientX - rect.left,
						y = e.clientY - rect.top;

					found = bubblesGraph.hoveredBubbleId(bubbles, context, x, y);
					context.clearRect(0, 0, canvas.width, canvas.height);
					bubblesGraph.draw(bubbles, context, found);

					if (found != -1) {
						bubblesGraph.drawOne(
							bubbles[found],
							context,
							{saturation: 40, light: 80},
							{color: {saturation: 40, light: 60, alpha: 0.8}, lineWidth: 1.5},
							{color:{alpha: 0.9}}
						);

						if(bubbles[found].clickable) {
							canvas.style.cursor = "pointer";
						} else {
							canvas.style.cursor = "default";
						}

						if($attrs.tooltipType === 'arrow') {
							switch($attrs.tooltipPosition) {
								case 'top':
									arrowPosition = 'bottom';
									break;
								case 'right':
									arrowPosition = 'left';
									break;
								case 'bottom':
									arrowPosition = 'top';
									break;
								case 'left':
									arrowPosition = 'right';
									break;
							}
							bubblesGraph.drawBubbleArrowTooltip(context, bubbles[found], {position: arrowPosition});
						} else if ($attrs.tooltipType === 'caption') {
							bubblesGraph.drawBubbleCaptionTooltip(context, bubbles[found], $attrs.tooltipPosition);
						}
					} else {
						canvas.style.cursor = "default";
					}
				};

				canvas.onclick = function(e) {
					if(found !== -1) {
						$scope.$parent.$broadcast('bubble_clicked', canvasData.bubbles[found]);
					}
				};
			}]
		};
	})
	.factory('bubblesGraph', function() {
		return {
			define: function(data, width, height, sort, randomize, restrictOrientation, fixedWidth, fixedHeight, granularity, defaultDirectionX = 0, defaultDirectionY = 1) {
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

				for (let j = 1; j < data.length; ++j) {
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
						do {
							invalidAngle = false;
							t = Math.PI * (k / granularity) * directionY + directionX;
							data[j].x = data[l].x + (data[l].r + data[j].r) * Math.cos(t);
							data[j].y = data[l].y + (data[l].r + data[j].r) * Math.sin(t);

							if(!noRestriction && Math.floor(data[l].y) !== 0 && restrictOrientation === 'h') {
								invalidAngle = (Math.abs(t) > Math.abs(Math.PI / 4) && Math.abs(t) < Math.abs((3 * Math.PI) / 4)) || (Math.abs(t) > Math.abs((5 * Math.PI) / 4) && Math.abs(t) < Math.abs(7 * Math.PI / 4));
							} else if (!noRestriction && Math.floor(data[l].x) !== 0 && restrictOrientation === 'v') {
								invalidAngle = (Math.abs(t) < Math.abs(Math.PI / 4) && Math.abs(t) > Math.abs((7 * Math.PI) / 4)) || (Math.abs(t) < Math.abs((5 * Math.PI) / 4) && Math.abs(t) > Math.abs(3 * Math.PI / 4));
							}
							k++;

							if (k === granularity * 2) {
								k = 0;
								l++;

								if(l >= data.length) {
									noRestriction = true;
									l = 0;
								}
							}
						} while (invalidAngle);

						/*Check wether the current point is not in another circle (whom radius has been added to current circle to avoid colliding)*/
						for (let m = 0; m < data.length; ++m) {
							if (m !== j) {
								inCircle = Math.pow(data[j].x - data[m].x, 2) + Math.pow(data[j].y - data[m].y, 2) < Math.pow(data[m].r + data[j].r, 2);
								if (inCircle) {
									break;
								}
							}
						}
					}
				}

				if(!fixedHeight) {
					for (let i = 0;i < data.length;++i) {
						height += Math.abs(data[i].y + data[i].r) >= height / 2 ? Math.abs(Math.abs(data[i].y + data[i].r) - height / 2) + 3 : 0;
					}
				}

				if(!fixedWidth) {
					for (let i = 0;i < data.length;++i) {
						width += Math.abs(data[i].x + data[i].r) >= width / 2 ? Math.abs(Math.abs(data[i].x + data[i].r) - width / 2) + 3 : 0;
					}
				}

				for (let i = 0;i < data.length;++i) {
					data[i].x += Math.ceil(width) / 2;
					data[i].y += Math.ceil(height) / 2;
				}

				return {
					bubbles: data,
					width: Math.ceil(width),
					height: Math.ceil(height)
				};
			},
			draw: function(bubbles, context, exceptId = null) {
				for (let i = 0; i < bubbles.length; ++i) {
					if(i !== exceptId) {
						this.drawOne(bubbles[i], context);
					}
				}
			},
			drawOne: function(bubble, context, fill = {}, stroke = {color: {}}, text = {color: {}}) {
				fill = Object.assign({hue: 0, saturation: 80, light: 40, alpha: 0.1}, fill);
				stroke.color = Object.assign({saturation: 60, light: 40, alpha: 1}, stroke.color);
				stroke = Object.assign({lineWidth: 1}, stroke);
				text.color = Object.assign({hue: 0, saturation: 0, light: 0, alpha: 1}, text.color);
				text = Object.assign({font: '10px sans serif'}, text);

				this.drawCircle(
					context,
					bubble.x,
					bubble.y,
					bubble.r,
					'hsla(' + (bubble.color != null ? bubble.color : fill.hue) + ', ' + fill.saturation + '%, ' + fill.light +'%, ' + fill.alpha +')',
					'hsla(' + (bubble.color != null ? bubble.color : stroke.color.hue) + ', ' + stroke.color.saturation + '%, ' + stroke.color.light +'%, ' + stroke.color.alpha + ')',
					stroke.lineWidth
				);

				this.drawText(
					context,
					bubble.text,
					bubble.x,
					bubble.y,
					2 * bubble.r,
					text.font,
					'hsla(' + text.color.hue + ', ' + text.color.saturation + '%, ' + text.color.light +'%, ' + text.color.alpha +')'
				);
			},
			drawBubbleCaptionTooltip: function(context, bubble, captionPosition = 'top', fill = {}, stroke = {color: {}}, text = {color: {}}) {
				fill = Object.assign({hue: 0, saturation: 0, light: 0, alpha: 0.8}, fill);
				stroke.color = Object.assign({saturation: 60, light: 40, alpha: 1}, stroke.color);
				stroke = Object.assign({lineWidth: 0}, stroke);
				text.color = Object.assign({hue: 0, saturation: 100, light: 100, alpha: 1}, text.color);
				text = Object.assign({font: '10px sans serif'}, text);

				let x, y,
					tooltipWidth = context.measureText(bubble.tooltip.text).width + 20,
					tooltipHeight = context.measureText('A').width * 5;

				switch(captionPosition) {
					case 'top-left':
						x = y = 0;
						break;
					case 'top':
						x = context.canvas.width / 2 - tooltipWidth / 2;
						y = 0;
						break;
					case 'top-right':
						x = context.canvas.width - tooltipWidth;
						y = 0;
						break;
					case 'right':
						x = context.canvas.width - tooltipWidth;
						y = context.canvas.height / 2;
						break;
					case 'bottom-right':
						x = context.canvas.width - tooltipWidth;
						y = context.canvas.height - tooltipHeight;
						break;
					case 'bottom':
						x = context.canvas.width / 2 - tooltipWidth / 2;
						y = context.canvas.height - tooltipHeight;
						break;
					case 'bottom-left':
						x = 0;
						y = context.canvas.height - tooltipHeight;
						break;
					case 'left':
						x = 0;
						y = context.canvas.height / 2;
						break;
				}

				this.drawTooltipBox(
					context,
					x,
					y,
					tooltipWidth,
					tooltipHeight,
					10,
					{},
					fill,
					stroke
				);

				this.drawText(
					context,
					bubble.tooltip.text,
					x + tooltipWidth / 2,
					y + tooltipHeight / 2,
					tooltipWidth,
					text.font,
					'hsla(' + text.color.hue + ', ' + text.color.saturation + '%, ' + text.color.light +'%, ' + text.color.alpha +')'
				);
			},
			drawBubbleArrowTooltip: function(context, bubble, arrowPosition = {}, fill = {}, stroke = {color: {}}, text = {color: {}}) {
				fill = Object.assign({hue: 0, saturation: 0, light: 0, alpha: 0.8}, fill);
				stroke.color = Object.assign({saturation: 60, light: 40, alpha: 1}, stroke.color);
				stroke = Object.assign({lineWidth: 0}, stroke);
				text.color = Object.assign({hue: 0, saturation: 100, light: 100, alpha: 1}, text.color);
				text = Object.assign({font: '10px sans serif'}, text);
				arrowPosition = Object.assign({position: 'right', height: 10}, arrowPosition);

				let x, y,
					tooltipWidth = context.measureText(bubble.tooltip.text).width + 20,
					tooltipHeight = context.measureText('A').width * 5;

				switch(arrowPosition.position) {
					case 'top':
						x = bubble.x - tooltipWidth / 2;
						y = bubble.y + bubble.r + arrowPosition.height;
						break;
					case 'right':
						x = bubble.x - bubble.r - arrowPosition.height - tooltipWidth;
						y = bubble.y - (tooltipHeight / 2);
						break;
					case 'bottom':
						x = bubble.x - tooltipWidth / 2;
						y = bubble.y - bubble.r - arrowPosition.height - tooltipHeight;
						break;
					case 'left':
						x = bubble.x + bubble.r + arrowPosition.height;
						y = bubble.y - (tooltipHeight / 2);
						break;
				}

				this.drawTooltipBox(
					context,
					x,
					y,
					tooltipWidth,
					tooltipHeight,
					10,
					arrowPosition,
					fill,
					stroke
				);

				this.drawText(
					context,
					bubble.tooltip.text,
					x + tooltipWidth / 2,
					y + tooltipHeight / 2,
					tooltipWidth,
					text.font,
					'hsla(' + text.color.hue + ', ' + text.color.saturation + '%, ' + text.color.light +'%, ' + text.color.alpha +')'
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
			drawText: function(context, text, x, y, maxWidth, font, style, centraliseText = true) {
				let textWidth, textHeight = context.measureText('0').width;
				context.beginPath();
				context.font = font;
				textWidth = context.measureText(text).width;
				if (textWidth < maxWidth) {
					context.fillStyle = style;
					context.fillText(
						text,
						x - (centraliseText ? textWidth / 2 : 0),
						y + (centraliseText ? textHeight / 2 : 0)
					);
				}
				context.closePath();
			},
			drawTooltipBox: function(context, x, y, width, height, radius = 5, arrow, fill, stroke) {
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
				if(arrow.position === 'top') {
					context.lineTo(x + width / 3, y);
					context.lineTo(x + width / 2, y - arrow.height);
					context.lineTo(x + 2 * width / 3, y);
					context.lineTo(x + width - radius.tr, y);
				} else {
					context.lineTo(x + width - radius.tr, y);
				}
				context.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
				if(arrow.position === 'right') {
					context.lineTo(x + width, y + height / 3);
					context.lineTo(x + width + arrow.height, y + height / 2);
					context.lineTo(x + width, y + 2 * height / 3);
					context.lineTo(x + width, y + height - radius.br);
				} else {
					context.lineTo(x + width, y + height - radius.br);
				}
				context.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
				if(arrow.position === 'bottom') {
					context.lineTo(x + 2 * width / 3, y + height);
					context.lineTo(x + width / 2, y + height + arrow.height);
					context.lineTo(x + width / 3, y + height);
					context.lineTo(x + radius.bl, y + height);
				} else {
					context.lineTo(x + radius.bl, y + height);
				}
				context.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
				if(arrow.position === 'left') {
					context.lineTo(x, y + 2 * height / 3);
					context.lineTo(x - arrow.height, y + height / 2);
					context.lineTo(x, y + height / 3);
					context.lineTo(x, y + radius.tl);
				} else {
					context.lineTo(x, y + radius.tl);
				}
				context.quadraticCurveTo(x, y, x + radius.tl, y);
				if(fill != null) {
					context.fillStyle = 'hsla(' + fill.hue + ', ' + fill.saturation + '%, ' + fill.light +'%, ' + fill.alpha +')';
					context.fill();
				}
				if(stroke != null && stroke.lineWidth > 0) {
					context.lineWidth = stroke.lineWidth;
					context.strokeStyle = 'hsla(' + stroke.color.hue + ', ' + stroke.color.saturation + '%, ' + stroke.color.light +'%, ' + stroke.color.alpha +')';
					context.stroke();
				}
				context.closePath();
			},
			hoveredBubbleId: function(bubbles, context, x, y) {
				for (let i = 0;i < bubbles.length;++i) {
					context.beginPath();
					context.arc(bubbles[i].x, bubbles[i].y, bubbles[i].r, 0, 2 * Math.PI, false);
					if (context.isPointInPath(x, y)) {
						context.closePath();
						return i;
					}
					context.closePath();
				}
				return -1;
			}
		};
	});
