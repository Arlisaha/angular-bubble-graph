'use strict';

angular.module('bubbleGraph', [])
	.directive('bubbles', function(){
		return {
			restrict: 'EA',
			replace: true,
			transclude: false,
			template: function(element, attrs) {
				let svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');			
				
				svg.setAttributeNS(null, 'id', attrs.id);
				svg.setAttributeNS(null, 'class', attrs.class);
				
				return svg.outerHTML;
			},
			scope: {
				width: '=width',
				height: '=height',
				data: '=data'
			},
			controller: ['$scope', '$attrs', 'bubblesGraph', function($scope, $attrs, bubblesGraph) {
				let svg = document.querySelector('#' + $attrs.id),
					svgData = bubblesGraph.definePositions(
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
					bubbles = svgData.bubbles;
				
				for (let i = 0;i < bubbles.length;++i) {
					bubbles[i].x += svgData.width / 2;
					bubbles[i].y += svgData.height / 2;

					if(!('id' in bubbles[i])) {
						bubbles[i].id = 'svg_bubble_' + i;
					}

					bubbles[i].color = Object.assign({hue: bubbles[i].r > 360 ? bubbles[i].r - 360 : bubbles[i].r, saturation: 80, light: 40, alpha: 0.1}, bubbles[i].color);
					if(!('stroke' in bubbles[i])) {
						bubbles[i].stroke = {color: {}};
					}
					bubbles[i].stroke.color = Object.assign({hue: bubbles[i].color.hue, saturation: 60, light: 40, alpha: 1}, bubbles[i].stroke.color);
					bubbles[i].stroke = Object.assign({lineWidth: 1}, bubbles[i].stroke);
					bubbles[i].text.color = Object.assign({hue: 0, saturation: 0, light: 0, alpha: 1}, bubbles[i].text.color);
					bubbles[i].text.font = Object.assign({size: '10', family: 'sans serif'}, bubbles[i].text.font);
					bubbles[i].text = Object.assign({}, bubbles[i].text);
					bubbles[i].tooltip.text.color = Object.assign({hue: 0, saturation: 100, light: 100, alpha: 1}, bubbles[i].tooltip.text.color);
					bubbles[i].tooltip.text.font = Object.assign({size: '10', family: 'sans serif'}, bubbles[i].tooltip.text.font);
					bubbles[i].tooltip.text = Object.assign({}, bubbles[i].tooltip.text);
					bubbles[i].tooltip.color = Object.assign({hue: 0, saturation: 0, light: 0, alpha: 0.8}, bubbles[i].tooltip.color);
					if(!('stroke' in bubbles[i].tooltip)) {
						bubbles[i].tooltip.stroke = {color: {}};
					}
					bubbles[i].tooltip.stroke.color = Object.assign({hue: 0, saturation: 0, light: 0, alpha: 1}, bubbles[i].tooltip.stroke.color);
					bubbles[i].tooltip.stroke = Object.assign({lineWidth: 0}, bubbles[i].tooltip.stroke);
					bubbles[i].tooltip = Object.assign({position: 'left'}, {position: $attrs.tooltipPosition}, bubbles[i].tooltip);
					bubbles[i] = Object.assign({clickable: false}, bubbles[i]);
				}
				
				svg.setAttributeNS(null,'width',svgData.width);
				svg.setAttributeNS(null,'height',svgData.height);
				bubblesGraph.draw(svg, bubbles);
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
				
				for (let i = 0;i < data.length;++i) {
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
						height += Math.abs(data[i].y) + 3 + data[i].r >= height / 2 ? Math.abs(Math.abs(data[i].y) + 3 + data[i].r - (height / 2)) + 5 : 0;
					}
				}

				if(!fixedWidth) {
					for (let i = 0;i < data.length;++i) {
						width += Math.abs(data[i].x) + 3 + data[i].r >= width / 2 ? Math.abs(Math.abs(data[i].x)+ 3 + data[i].r - (width / 2)) + 5 : 0;
					}
				}

				return {
					bubbles: data,
					width: Math.ceil(width),
					height: Math.ceil(height)
				};
			},
			draw: function(svgElement, bubbles, exceptId = null) {
				for (let i = 0; i < bubbles.length; ++i) {
					if(i !== exceptId) {
						this.drawOne(svgElement, bubbles[i]);
					}
				}
			},
			drawOne: function(svgElement, bubble, fill = {}, stroke = {}, text = {}) {
				fill = Object.assign({}, bubble.color, fill);
				stroke.color = Object.assign({}, bubble.stroke.color, stroke.color);
				stroke = Object.assign({}, bubble.stroke, stroke);
				text.color = Object.assign({}, bubble.text.color, text.color);
				text.font = Object.assign({}, bubble.text.font, text.font);
				
				this.drawCircle(
					svgElement,
					bubble.id,
					bubble.x,
					bubble.y,
					bubble.r,
					'hsl(' + fill.hue + ',' + fill.saturation + '%,' + fill.light + '%)',
					 fill.alpha,
					'hsl(' + stroke.color.hue + ',' + stroke.color.saturation + '%,' + stroke.color.light + '%)',
					stroke.color.alpha,
					stroke.lineWidth + 'px'
				);
				
				this.drawText(
					svgElement, 
					bubble.text.lines, 
					bubble.x, 
					bubble.y, 
					2 * bubble.r, 
					text.font.family, 
					text.font.size, 
					'hsl(' + text.color.hue + ',' + text.color.saturation + '%,' + text.color.light + '%)',
					true
				);
			},
			drawCircle: function(svgElement, id, x, y, radius, fillColor, fillOpacity, strokeColor, strokeOpacity, lineWidth) {
				let circle = document.createElementNS(svgElement.namespaceURI, 'circle');
				
				circle.setAttributeNS(null, 'id', id);
				circle.setAttributeNS(null, 'cx', x);
				circle.setAttributeNS(null, 'cy', y);
				circle.setAttributeNS(null, 'r', radius);
				circle.setAttributeNS(null, 'fill', fillColor);
				circle.setAttributeNS(null, 'fill-opacity', fillOpacity)
				circle.setAttributeNS(null, 'stroke', strokeColor);
				circle.setAttributeNS(null, 'stroke-opacity', strokeOpacity);
				circle.setAttributeNS(null, 'strokeWidth', lineWidth);
				
				svgElement.appendChild(circle);
			},
			drawText: function(svgElement, textLines, x, y, maxWidth, fontFamily, fontSize, fontColor, alignCenter = false) {
				let text = document.createElementNS(svgElement.namespaceURI, 'text'), 
					tspan, textBbox, tspanBbox, longestTspanWidth = 0, previousTspanWidthSum = 0, tspanList = [];
				
				text.setAttributeNS(null, 'font-family', fontFamily);
				text.setAttributeNS(null, 'font-size', fontSize);
				text.setAttributeNS(null, 'color', fontColor);
				
				svgElement.appendChild(text);

				for(let i = 0; i < textLines.length;++i) {
					tspan = document.createElementNS(svgElement.namespaceURI, 'tspan');
					tspan.innerHTML = textLines[i];
					text.appendChild(tspan);
					
					tspanBbox = tspan.getBBox();
					
					if(i > 0) {
						tspan.setAttributeNS(null, 'dy', fontSize);
						tspan.setAttributeNS(null, 'dx', - tspanBbox.width / (alignCenter ? 2 : 1));
					}
				}

				textBbox = text.getBBox();
				
				if (textBbox.width < maxWidth) {
					text.setAttributeNS(null, 'x', x - textBbox.width / 2);
					text.setAttributeNS(null, 'y', y + textLines.length);

					svgElement.appendChild(text);
				} else {
					svgElement.removeChild(text);
				}
			}
		};
	});
