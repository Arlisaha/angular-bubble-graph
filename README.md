# angular-bubble-graph
Allow to make a bubble chart with some options.

## Examples

For Canvas example, see : https://jsfiddle.net/Arlisaha/h1amkaf8/41/

For SVG example, see : https://jsfiddle.net/Arlisaha/24f18zqv/41/ (still in progress ! Lacks of tooltips)

## Usage

### Fired events

Events 'bubble_clicked' in angular and DOM are dispatched directly from SVG/canvas element.

### Tag's directive

This module allow you to create a bubble graph either in Canvas or SVG with tooltips and events triggering on click.
To use it, you just need to add a tag with different attributes : 
<bubbles id="CanvasId" width="Width" height="Height" data="ControllerData" [randomize] [orientation="h"] [sort="desc"] [fixed-width] [tooltip-type="arrow"] [tooltip-position="top"]></bubbles>

* randomize : give random direction when generating bubbles coordinates
* orientation [h|v] : restrain area where bubbles will be if it is possible
* sort [asc|desc] : sort bubbles according to their radius (desc = biggest in the center, asc = smallest in the center)
* [fixed-width/fixed-height] : the algorithm increase height and width in order to fit content, if one or the two are given, then the matching parameter will remain the same as given in the tag attribute's.
* tooltip-type [arrow|caption] : define the type of tooltip you want to use, 'arrow' stand for a tooltip appearing against the bubble with a small arrow pointing at it, and 'caption' stands for a tooltip appearing around the canvas as an image caption. WARNING, if no valid value given, then no tooltip will be displayed.
* tooltip-position [[top|left|bottom|right]|[top-left|top|top-right|right|bottom-right|bottom|bottom-left|left]] : precise the position of the tooltip. Arrow tooltip position's are given in first, and caption in the second array. If the tooltip will be cut by the edge of the Canvas/SVG element, then its position will be the opposite of the given one. Tooltip position can also be given one by one inside data definitions.
* granularity : the number of subdivisions to draw around a bubble in order to place the others. Default is 512.

### Data format

Given data (in "data" attribute), must be an array of object looking like :

```javascript
  { 
    x: [optional, value will be calculated and added to the object no matter what], 
    y: [optional, value will be calculated and added to the object no matter what], 
    r: [required, the radius of the bubble],
    clickable: [optional (default false), does the bubble must fire a "bubble_clicked" event ?],
    color: { [optional, bubble fill color]
      hue: [hue value in HSLA format], 
      saturation: [saturation value in HSLA format], 
      light: [light value in HSLA format],
      alpha: [alpha value in HSLA format]
    },
    stroke: { [optional, bubble stroke linewidth and color]
      lineWidth: [stroke width in pixels (float)],
      color: { [optional, bubble fill color]
        hue: [hue value in HSLA format], 
        saturation: [saturation value in HSLA format], 
        light: [light value in HSLA format],
        alpha: [alpha value in HSLA format]
      }
    },
    text: { [required, definitions for the bubble inner text]
      lines: [required, array of lines that must be written inside the bubble],
      color: { [optional]
        hue: [hue value in HSLA format], 
        saturation: [saturation value in HSLA format], 
        light: [light value in HSLA format],
        alpha: [alpha value in HSLA format]
      },
      font: [optional, in canvas, this value muste look like "10px 'sans serif'" when in SVG it must be an object like "{size: 10, family: 'sans serif'}"]
    }, 
    tooltip: {[optional, define tooltip info]
    position: [optional, default to 'left'],
    text: { [required if you want tooltips, definitions for the tooltip inner text]
      lines: [required, array of lines that must be written inside the bubble],
      color: { [optional]
        hue: [hue value in HSLA format], 
        saturation: [saturation value in HSLA format], 
        light: [light value in HSLA format],
        alpha: [alpha value in HSLA format]
      },
      font: [optional, in canvas, this value muste look like "10px 'sans serif'" when in SVG it must be an object like "{size: 10, family: 'sans serif'}"]
    }, 
```

======================================================================================

You don't use AngularJS, you  can still easily extract logic from angular directive wrapping !
