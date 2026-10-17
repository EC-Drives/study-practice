# Diagram spec (Study Practice v2)

Owner: Chief Tech Officer. Version 1.1, 17 Oct 2026. Audience: the Chief Learning Officer (who writes the JSON) and the app (which draws it).

A question can carry a drawn diagram as **data**: a small JSON object with a `type` and the fields for that type. The app draws it as a crisp SVG picture (no image files, no outside libraries), in light and dark themes, with a text description for screen readers. The CLO never draws anything: you describe what the picture shows and the renderer draws it to scale.

To try a diagram, open `test/diagrams.html` (with the laptop server running: http://localhost:8766/test/diagrams.html). It shows every type with sample data, and has a box where you can paste a diagram, a whole question, or a whole topic file: it draws each diagram and lists any errors.

---

## 1. Where diagrams go in a question

Two new optional keys on a question (all other keys unchanged):

| Key | Type | Notes |
|---|---|---|
| `diagram` | diagram object | Drawn between the prompt and the answer area. |
| `optionDiagrams` | list, same length as `options` | Picture-choice `mcq` or `multi`: one diagram (or `null`) per option. The option **string stays required**: it is the option's text alternative and what reports show ("B. a net with six squares in a T shape"). Keep it short and neutral (it must not give the answer away). |

Example (picture choice):

```json
{
  "id": "m04-q050", "subtopicId": "m04-s2", "type": "mcq", "difficulty": 2, "marks": 1,
  "prompt": "Which net folds to make a cube?",
  "options": ["Net A", "Net B", "Net C", "Net D"],
  "optionDiagrams": [
    {"type": "net", "shape": "custom", "cells": [[0,0],[1,0],[2,0],[3,0],[1,1],[2,1]]},
    {"type": "net", "shape": "custom", "cells": [[1,0],[0,1],[1,1],[2,1],[3,1],[1,2]]},
    {"type": "net", "shape": "custom", "cells": [[0,0],[1,0],[2,0],[2,1],[3,1],[4,1]], "alt": "Net C"},
    {"type": "net", "shape": "custom", "cells": [[0,0],[1,0],[0,1],[1,1],[2,1],[3,1]]}
  ],
  "answer": 1, "...": "..."
}
```

`validate.py` will need `diagram` and `optionDiagrams` added to the allowed question keys (a CLO change; the CTO has not touched it).

## 2. Rules for every diagram

Fields every type accepts:

| Field | Type | Default | Notes |
|---|---|---|---|
| `type` | string | required | One of the types in section 3. |
| `alt` | string | built from the data | Text description for screen readers. Leave it out normally: the renderer writes one from the data. Give one when the automatic description would give the answer away or is not helpful. |
| `caption` | string | none | A short visible caption under the picture ("Not drawn to scale" has its own field). |
| `size` | `"small"`, `"medium"`, `"large"` | per type | How wide the picture may grow on a big screen. On a phone every diagram fills the width. |
| `notToScale` | boolean | false | Prints "Not drawn to scale" (geometry types). |

Conventions:

- **Text** follows the README's text conventions: plain text, `^` for powers (`cm^2` shows as cm²), `/` for fractions, `°` for degrees, a space as the thousands separator. A label of `"?"` is drawn as an answer box.
- **Numbers that may be fractions** (number lines, fraction models) can be a number (`0.75`) or a string (`"3/4"`, `"-1 1/2"`). Strings keep exact values, so `"1/3"` lands exactly on a third.
- **Directions** are degrees **anticlockwise from "east"** (pointing right): 0 = right, 90 = up, 180 = left, 270 = down. This is only for placing rays and lines; the question can talk about clockwise turns as usual.
- **Coordinates** have y going **up** (as on a maths grid), in any units: shapes are scaled to fit.
- **Only what is drawn is described.** The automatic description states what a sighted pupil can see: labels, marked values and positions. It never states a value that the picture shows only as "?". For "read the scale" questions, the position of the pointer is described as a sighted pupil would read it, which is the answer: if that matters, set `alt`.
- Unknown fields are reported as errors by the checker (catches typos such as `lable`).
- Keep to about 8 labelled items per diagram; past that it gets crowded on a phone.

## 3. Types

Thirty-one types. Each entry: what it is for, fields (required in **bold**), and a minimal example.

### Geometry and number

#### `polygon` - a shape with labelled sides and angles
For triangles, quadrilaterals, compound shapes, regular polygons.

| Field | Type | Notes |
|---|---|---|
| **`points`** | list of `[x, y]` | 3-12 corners in order (either direction). Or use `regular` instead. |
| `regular` | integer 3-12 | A regular polygon with this many sides (instead of `points`). |
| `vertexLabels` | list of strings | One per corner (`""` to skip). Drawn outside the corner. |
| `sides` | list | One entry per side: side *i* joins corner *i* to corner *i+1* (the last joins back to the first). Each entry `null` or `{ "label": "6 cm", "ticks": 1, "arrows": 1 }`. `ticks` = equal-side marks (1-3); `arrows` = parallel-side arrows (1-3). |
| `angles` | list | One entry per corner: `null` or `{ "label": "65°", "right": true, "arcs": 1 }`. `right` draws the right-angle square; `arcs` (1-3) marks equal angles. Interior angles. |
| `extraLines` | list | `{ "from": [x,y], "to": [x,y], "dashed": true, "label": "" }`: diagonals, heights, lines of symmetry. |
| `shaded` | boolean | Fill the shape lightly. |
| `grid` | boolean | Draw on squared paper with 1-unit squares (for counting areas). Points must then be whole numbers. |

```json
{"type": "polygon", "points": [[0,0],[8,0],[3,5]], "vertexLabels": ["A","B","C"],
 "sides": [{"label": "8 cm"}, null, null], "angles": [{"label": "45°"}, {"label": "x"}, null], "notToScale": true}
```

#### `circle` - centre, radius, diameter
| Field | Type | Notes |
|---|---|---|
| `centreLabel` | string | Default none; the centre dot is always drawn. |
| `radius` | `{ "angle": 30, "label": "5 cm" }` | A radius drawn at this direction. |
| `diameter` | `{ "angle": 0, "label": "?" }` | A diameter through the centre. |
| `points` | list of `{ "angle": 90, "label": "A" }` | Points on the circle. |
| `chords` | list of `[angle1, angle2]` | Straight lines between two points on the circle. |

```json
{"type": "circle", "centreLabel": "O", "radius": {"angle": 40, "label": "7 cm"}}
```

#### `angle` - rays from a point, protractor readings, angles on a line and round a point
| Field | Type | Notes |
|---|---|---|
| **`rays`** | list of directions | 1-8 rays from the vertex. |
| `lines` | list of directions | Full straight lines through the vertex (angles on a straight line, vertically opposite angles). |
| `arcs` | list of `{ "from": 0, "to": 130, "label": "130°", "right": false }` | An angle mark measured **anticlockwise** from direction `from` to direction `to`. `right: true` draws a square. |
| `rayLabels` | list of strings | A letter at the end of each ray. |
| `vertexLabel` | string | |
| `protractor` | boolean | Lays a protractor on the vertex with its baseline along 0°-180° and both scales (outer reads 0 on the left, inner reads 0 on the right), as on a real protractor. Use rays at 0 or 180 for a reading question. |

```json
{"type": "angle", "rays": [0, 65], "protractor": true}
{"type": "angle", "lines": [0], "rays": [130], "arcs": [{"from": 0, "to": 130, "label": "x"}, {"from": 130, "to": 180, "label": "50°"}]}
```

#### `coordinateGrid` - one or four quadrants
| Field | Type | Notes |
|---|---|---|
| **`x`**, **`y`** | `[min, max]` integers | Axis ranges, e.g. `[-6, 6]`. Use `[0, 10]` for the first quadrant only. At most 20 units each way. |
| `labelEvery` | integer | Number labels every n units (default 1, or 2 when the range is wide). |
| `points` | list of `{ "at": [x, y], "label": "A", "showCoords": false, "style": "dot" }` | `style`: `dot`, `cross` or `hollow`. Fractions and decimals allowed in `at` (`"-9/2"`, `-4.5`). `showCoords` writes them as decimals when they are exact decimals (-4.5), otherwise as mixed numbers. |
| `polygons` | list of `{ "points": [[x,y],...], "label": "P", "style": "solid" }` | `style`: `solid` (object), `dashed` (image), `shaded`. |
| `segments` | list of `{ "from": [x,y], "to": [x,y], "dashed": false, "arrow": false, "label": "" }` | Line segments; `arrow` for a translation arrow; `label` is written beside the middle of the segment. |
| `lines` | list | Mirror lines across the whole grid: `{ "x": 2, "label": "x = 2" }`, `{ "y": -1 }`, or `{ "through": [[0,0],[1,1]], "label": "y = x" }`. Drawn as a bold dashed line. |
| `quadrantLabels` | boolean | Writes "1st quadrant" to "4th quadrant" in the outer corners. |
| `axisLabels` | list of 2 strings | Axis names, default `["x", "y"]`. |

```json
{"type": "coordinateGrid", "x": [-5, 5], "y": [-5, 5],
 "polygons": [{"points": [[1,1],[3,1],[1,4]], "label": "A"}], "lines": [{"x": 0, "label": "mirror line"}]}
```

#### `numberLine` - whole numbers, fractions, decimals, negatives
| Field | Type | Notes |
|---|---|---|
| **`min`**, **`max`** | number or fraction string | |
| **`step`** | number or fraction string | Gap between the labelled (major) ticks. |
| `minorStep` | number or fraction string | Small ticks between. Must divide `step` exactly. |
| `labels` | `"major"`, `"ends"`, `"none"`, or a list of values | Which ticks get numbers. Default `"major"`. |
| `format` | `"auto"`, `"decimal"`, `"fraction"`, `"mixed"` | How tick numbers are written. `auto` keeps the form used in `min`/`step`. |
| `points` | list of `{ "at": "3/4", "label": "A" }` | A dot with a label above. `label: "?"` draws an answer box with an arrow. |
| `jumps` | list of `{ "from": -3, "to": 5, "label": "+8" }` | Hops drawn as arcs above the line. |
| `highlight` | `{ "from": 2, "to": 6 }` | A thick band (for an interval or a difference). |

At most 40 minor ticks and 20 labels.

```json
{"type": "numberLine", "min": 0, "max": 2, "step": 1, "minorStep": "1/4", "format": "fraction", "points": [{"at": "1 1/4", "label": "A"}]}
```

#### `fractionModel` - shaded parts of a whole
| Field | Type | Notes |
|---|---|---|
| **`shape`** | `"bar"`, `"circle"`, `"rectangle"`, `"grid"` | `grid` is a rows x columns grid (10 x 10 for percentages). |
| `parts` | integer 2-24 | Equal parts in each whole (bar, circle). |
| `rows`, `cols` | integers 1-12 each | For `grid` and `rectangle` (rows x cols squares, so at most 144; a 10 x 10 grid for percentages). |
| `shaded` | integer or list of part indices | Number of parts shaded (filled in order across the wholes) or exactly which ones (0-based). |
| `wholes` | integer 1-4 | Several identical wholes side by side (for improper fractions and mixed numbers). `shaded` counts across all the wholes (up to 400 squares). |
| `partLabels` | boolean | Writes the unit fraction in each part. |

```json
{"type": "fractionModel", "shape": "bar", "parts": 4, "wholes": 2, "shaded": 7}
```

#### `barModel` - Singapore bar model (ratio, fractions, word problems)
| Field | Type | Notes |
|---|---|---|
| **`bars`** | list | Each bar: `{ "label": "Ali", "units": 3 }` (equal boxes) **or** `{ "label": "Ali", "parts": [{"size": 3, "text": "?"}, {"size": 2, "text": "12"}] }` (boxes of different lengths). Optional `"unitText"` written in every unit box, `"right"` text after the bar (e.g. `"RM 24"`), `"shadedUnits"` (how many units shaded). |
| `braces` | list of `{ "bar": 0, "from": 0, "to": 3, "label": "RM 24", "side": "above" }` | A brace over units `from`-`to` (unit indices, `to` exclusive) of one bar, above or below. |
| `totalBrace` | `{ "label": "60 sweets" }` | A brace on the right spanning all bars. |

All bars share one unit length, so 3 units and 5 units compare truthfully.

```json
{"type": "barModel", "bars": [{"label": "Ali", "units": 3}, {"label": "Ben", "units": 5}], "totalBrace": {"label": "RM 64"}}
```

### Data handling

Charts follow the reading rules of exam papers: clear gridlines to read values from, a start at zero for bar charts, titles and axis labels as given. They do not show the values on hover (that would give the answer away); set `valueLabels` when the values should be shown.

#### `barChart`
| Field | Type | Notes |
|---|---|---|
| **`categories`** | list of strings | 1-12 bars per series. |
| **`series`** | list of `{ "name": "Boys", "values": [..] }` | 1-3 series (grouped bars when more than one; a legend is drawn). Values 0 or more. |
| `title`, `xLabel`, `yLabel` | strings | |
| `yMax`, `yStep` | numbers | Scale top and labelled gridline step. Default: worked out from the data. |
| `minorStep` | number | Faint gridlines between labelled ones (for reading in-between values). |
| `horizontal` | boolean | Bars run left to right. |
| `valueLabels` | boolean | Write each value at the end of its bar. Default false. |

```json
{"type": "barChart", "title": "Books read in a week", "categories": ["Mon","Tue","Wed","Thu","Fri"],
 "series": [{"name": "Books", "values": [4, 7, 3, 8, 5]}], "yLabel": "Number of books", "yStep": 2, "minorStep": 1}
```

#### `lineGraph`
| Field | Type | Notes |
|---|---|---|
| **`series`** | list | 1-3 series: `{ "name": "...", "values": [..] }` against `categories`, **or** `{ "name": "...", "points": [[x, y], ...] }` against a number x axis. |
| `categories` | list of strings | x labels (times, months). |
| `xMin`, `xMax`, `xStep` | numbers | For a number x axis (conversion graphs, time in minutes). |
| `yMin`, `yMax`, `yStep`, `minorStep` | numbers | `yMin` may be negative (temperatures). |
| `title`, `xLabel`, `yLabel` | strings | |
| `markers` | boolean | Dots at the data points. Default true. |

```json
{"type": "lineGraph", "title": "Temperature in the garden", "categories": ["6 am","9 am","12 noon","3 pm","6 pm"],
 "series": [{"name": "Temperature", "values": [24, 27, 31, 32, 28]}], "yMin": 20, "yMax": 34, "yStep": 2, "yLabel": "Temperature (°C)"}
```

#### `pieChart`
| Field | Type | Notes |
|---|---|---|
| **`slices`** | list of `{ "label": "Red", "value": 5 }` | 2-6 slices. Values are any positive amounts; angles are worked out exactly. |
| `title` | string | |
| `show` | `"label"`, `"percent"`, `"fraction"`, `"value"`, `"degrees"` | What is written beside each label. Default `"label"` (name only). |
| `rightAngles` | boolean | Mark 90° slices with a right-angle square. |
| `startAngle` | direction | Default 90 (12 o'clock); slices go clockwise. |

```json
{"type": "pieChart", "title": "Favourite fruit", "slices": [{"label": "Mango", "value": 6}, {"label": "Apple", "value": 3}, {"label": "Banana", "value": 3}], "rightAngles": true}
```

#### `table` - tally charts and frequency tables
Drawn as a real (accessible) table, not a picture.

| Field | Type | Notes |
|---|---|---|
| **`columns`** | list of strings | Column headings. |
| **`rows`** | list of lists | One cell per column. A cell is a string, a number, or `{ "tally": 7 }` (drawn as tally marks in gates of five). |
| `title` | string | Table caption. |
| `rowHeaders` | boolean | First cell of each row is a heading. Default true. |

```json
{"type": "table", "title": "Colours of cars passing the school", "columns": ["Colour", "Tally", "Frequency"],
 "rows": [["Red", {"tally": 7}, 7], ["White", {"tally": 12}, "?"], ["Black", {"tally": 4}, 4]]}
```

#### `dotPlot` - a dot plot (line plot)
| Field | Type | Notes |
|---|---|---|
| **`values`** | list of numbers | One dot per value, stacked over its mark. Up to 60. |
| **`min`**, **`max`** | numbers | The scale; every value must sit on a step. |
| `step` | number | Gap between marks (default 1). At most 24 steps. |
| `title`, `xLabel` | strings | |

```json
{"type": "dotPlot", "title": "Goals scored in each match", "values": [0, 1, 1, 2, 2, 2, 3, 1, 0, 2, 4, 1], "min": 0, "max": 5, "xLabel": "Goals"}
```

#### `scatterGraph`
| Field | Type | Notes |
|---|---|---|
| **`points`** | list of `[x, y]` | 2-40 points, drawn as crosses. |
| `xMin`, `xMax`, `xStep`, `yMin`, `yMax`, `yStep` | numbers | Scales (worked out from the data when left out). |
| `title`, `xLabel`, `yLabel` | strings | |

The description lists the points and says whether they go up, go down, or show no clear pattern.

#### `venn` - two or three sets
| Field | Type | Notes |
|---|---|---|
| **`sets`** | list of 2 or 3 strings | Set labels (A, B, C in that order). |
| `universe` | string | Label for the outer rectangle (default no label; the rectangle is always drawn). |
| `regions` | object | Items in each region. Keys: `A`, `B`, `AB`, `outside` for two sets; plus `C`, `AC`, `BC`, `ABC` for three. `A` means "in A only". Items are strings or numbers; `"?"` draws an answer box. |
| `shade` | list of region keys | Regions to shade. |

```json
{"type": "venn", "sets": ["Multiples of 2", "Multiples of 3"], "universe": "Whole numbers 1 to 12",
 "regions": {"A": [2,4,8,10], "B": [3,9], "AB": [6,12], "outside": [1,5,7,11]}}
```

#### `carroll` - Carroll diagram
Drawn as a real table.

| Field | Type | Notes |
|---|---|---|
| **`columns`** | list of 2-3 strings | Column headings, e.g. `["Even", "Not even"]`. |
| **`rows`** | list of 2-3 strings | Row headings. |
| **`cells`** | list of lists of lists | `cells[row][column]` = the items in that cell. |

```json
{"type": "carroll", "columns": ["Even", "Not even"], "rows": ["Less than 10", "Not less than 10"],
 "cells": [[[4, 8], [3, 7]], [[12, 16], [15, "?"]]]}
```

#### `functionMachine`
| Field | Type | Notes |
|---|---|---|
| **`steps`** | list of 1-3 strings | The operations in order, e.g. `["x 3", "+ 4"]`. |
| `input`, `output` | string or number | Shown in the IN and OUT circles; `"?"` draws an answer box; leave one out to show an empty circle. |

```json
{"type": "functionMachine", "steps": ["x 3", "+ 4"], "input": "5", "output": "?"}
```

### Shape and space (3D)

#### `net` - nets of 3D shapes
| Field | Type | Notes |
|---|---|---|
| **`shape`** | `"cube"`, `"cuboid"`, `"triangularPrism"`, `"squarePyramid"`, `"tetrahedron"`, `"custom"` | |
| `cells` | list of `[col, row]` | For `custom` (and optionally `cube`): unit squares on a grid, row 0 at the top. For "which net makes a cube" questions. |
| `l`, `w`, `h` | numbers | Dimensions for `cuboid` and `triangularPrism` (drawn to scale). |
| `labels` | `{ "l": "5 cm", "w": "3 cm", "h": "2 cm" }` | Edge labels. |
| `faceLabels` | list of strings | One per face/cell in drawing order (`""` to skip). Use for "which face is opposite" questions. |
| `shaded` | list of face indices | |

```json
{"type": "net", "shape": "cuboid", "l": 5, "w": 3, "h": 2, "labels": {"l": "5 cm", "w": "3 cm", "h": "2 cm"}}
```

#### `cuboid` - a cuboid (or cube) with dimensions
| Field | Type | Notes |
|---|---|---|
| **`l`**, **`w`**, **`h`** | numbers | Length (across), width (depth), height. Drawn in proportion. |
| `labels` | `{ "l": "8 cm", "w": "3 cm", "h": "5 cm" }` | |
| `unitCubes` | boolean | Shows the cuboid built from 1-unit cubes (whole-number sizes up to 12). |
| `hiddenEdges` | boolean | Dashed back edges. Default true. |

```json
{"type": "cuboid", "l": 4, "w": 2, "h": 3, "unitCubes": true}
```

#### `cubes` - shapes built from unit cubes
| Field | Type | Notes |
|---|---|---|
| **`cubes`** | list of `[x, y, z]` | Whole-number positions: x across, y back (depth), z up. Up to 60 cubes. |

```json
{"type": "cubes", "cubes": [[0,0,0],[1,0,0],[2,0,0],[0,1,0],[0,0,1]]}
```

#### `solid` - a named 3D shape
| Field | Type | Notes |
|---|---|---|
| **`shape`** | `"cube"`, `"cuboid"`, `"triangularPrism"`, `"pentagonalPrism"`, `"hexagonalPrism"`, `"squarePyramid"`, `"triangularPyramid"`, `"cylinder"`, `"cone"`, `"sphere"`, `"hemisphere"` | Drawn with dashed hidden edges. |
| `label` | string | Written under the shape. |

```json
{"type": "solid", "shape": "triangularPrism"}
```

### Measures

#### `clock`
| Field | Type | Notes |
|---|---|---|
| **`time`** | `"HH:MM"` | 24-hour (`"14:35"`); an analogue clock shows it on a 12-hour face. |
| `style` | `"analogue"`, `"digital"` | Default analogue. |
| `numerals` | `"arabic"`, `"roman"`, `"none"` | Analogue only. |
| `hour24` | boolean | Digital only: show `14:35` (true, default) or `2:35` (false). |
| `label` | string | Under the clock, e.g. `"p.m."`. |

```json
{"type": "clock", "time": "10:35"}
```

#### `scale` - ruler, jug, thermometer, weighing scale
| Field | Type | Notes |
|---|---|---|
| **`kind`** | `"ruler"`, `"jug"`, `"thermometer"`, `"weighing"`, `"newtonMeter"` | `newtonMeter`: a spring balance hanging from a ring, scale from `min` at the top downwards, a red pointer at `value`, a load on the hook. |
| **`min`**, **`max`** | numbers | Scale range (thermometers may go negative). |
| **`major`** | number | Labelled interval. |
| `minor` | number | Small divisions (must divide `major` exactly). Default: none. |
| `labelEvery` | integer | Label every n-th major mark (default 1). |
| `unit` | string | `"cm"`, `"ml"`, `"°C"`, `"g"`, `"kg"`. |
| `value` | number | The reading: end of the object on a ruler, liquid level, liquid in the thermometer, the pointer on a dial. |
| `from` | number | Ruler only: where the object starts (default `min`). |
| `object` | `"bar"`, `"pencil"`, `"ribbon"` | Ruler only. |
| `load` | string | Newton meter only: a label beside the hanging load (`"apple"`, `"?"`). |

```json
{"type": "scale", "kind": "jug", "min": 0, "max": 1000, "major": 200, "minor": 50, "unit": "ml", "value": 650}
{"type": "scale", "kind": "newtonMeter", "min": 0, "max": 10, "major": 1, "minor": 0.5, "unit": "N", "value": 6.5, "load": "apple"}
```

#### `spinner` - probability spinner
| Field | Type | Notes |
|---|---|---|
| **`sectors`** | list of strings | 2-12 sector labels, clockwise from the top. Colour words (red, blue, green, yellow, orange, purple, pink, white, black, grey) also tint the sector; the word is always written as well. |
| `sizes` | list of numbers | Relative sector sizes (default equal). |
| `pointer` | direction or `null` | Arrow angle. Default 60. `null` hides it. |

```json
{"type": "spinner", "sectors": ["red", "blue", "red", "green", "red", "blue"]}
```

### Science

#### `circuit` - circuit diagrams with standard symbols
| Field | Type | Notes |
|---|---|---|
| **`layout`** | `"series"` or `"parallel"` | |
| `components` | list | Series: the components round the loop, clockwise from the top left. |
| `main` | list | Parallel: components on the main loop (the top wire), usually the cell and a switch. |
| `branches` | list of lists | Parallel: 2-4 branches, each a list of components, drawn one under another. |

A component: `{ "kind": "cell" }` with optional `label` (written beside it, e.g. `"A"`, `"X"`). Kinds:

| `kind` | Symbol | Extra fields |
|---|---|---|
| `cell` | long and short plate | |
| `battery` | two or more cells joined | `cells`: 2-4 (default 2) |
| `bulb` (or `lamp`) | circle with a cross | |
| `switch` | open or closed switch | `closed`: true/false (default false) |
| `buzzer` | buzzer symbol | |
| `motor` | circle with M | |
| `gap` | a break in the wire | |

```json
{"type": "circuit", "layout": "series", "components": [{"kind": "cell"}, {"kind": "switch", "closed": true}, {"kind": "bulb"}, {"kind": "buzzer"}]}
{"type": "circuit", "layout": "parallel", "main": [{"kind": "battery", "cells": 2}, {"kind": "switch", "closed": true}],
 "branches": [[{"kind": "bulb", "label": "A"}], [{"kind": "bulb", "label": "B"}, {"kind": "switch"}]]}
```

#### `foodChain`
| Field | Type | Notes |
|---|---|---|
| **`organisms`** | list of 2-6 strings | Producer first. Arrows point from the food to the eater (the way the energy goes). |
| `roles` | boolean or list of strings | `true` writes producer / primary consumer / ... under each; a list gives your own (`"?"` for a box). |

Food-chain boxes are all drawn the same (no producer colour), so a wrong-order chain in a picture-choice question gives nothing away. In a `foodWeb`, organisms that eat nothing in the drawn links are tinted green.

```json
{"type": "foodChain", "organisms": ["Grass", "Grasshopper", "Frog", "Snake", "Eagle"]}
```

#### `foodWeb`
| Field | Type | Notes |
|---|---|---|
| **`organisms`** | list of `{ "id": "grass", "name": "Grass" }` | 3-12 organisms. |
| **`links`** | list of `[foodId, eaterId]` | Each arrow goes from the food to the eater. |
| `highlight` | list of ids | Draws these organisms in bold (e.g. the one the question is about). |
| `positions` | object `{ id: [column, row] }` | Optional manual layout (row 0 at the bottom with the producers). By default organisms are arranged in rows by how far up the web they feed, producers at the bottom. |

```json
{"type": "foodWeb", "organisms": [{"id": "g", "name": "Grass"}, {"id": "r", "name": "Rabbit"}, {"id": "i", "name": "Insect"}, {"id": "b", "name": "Bird"}, {"id": "f", "name": "Fox"}],
 "links": [["g","r"], ["g","i"], ["i","b"], ["r","f"], ["b","f"]]}
```

#### `light` - rays: mirror, shadow, seeing
| Field | Type | Notes |
|---|---|---|
| **`scene`** | `"mirror"`, `"shadow"`, `"seeing"`, `"refraction"` | `refraction`: a ray from air into water or a glass block, bending towards the normal (drawn with the real angle, n = 1.33 for water and 1.5 for glass). |
| `medium` | `"water"`, `"glass"` | Refraction only (default water). |
| `showRefracted` | boolean | Refraction: draw the ray inside the water or glass (default true). |
| `angle` | number | Mirror: angle of incidence from the normal (0-80). Shadow with the Sun: the Sun's height above the ground in degrees. |
| `showReflected` | boolean | Mirror: draw the reflected ray (default true). |
| `labels` | object | Mirror: `incident`, `reflected`, `normal`, `mirror`, `i`, `r` (angle labels). Refraction: `incident`, `refracted`, `normal`, `i`, `r`, `air`, `medium`. Shadow: `source`, `object`, `shadow`, `screen`. Any can be `"?"`. |
| `source` | `"torch"`, `"lamp"`, `"sun"` | Shadow and seeing. |
| `object` | `"box"`, `"ball"`, `"tree"`, `"person"`, `"book"`, `"apple"` | Shadow and seeing. |
| `sourceDistance`, `screenDistance`, `objectHeight` | numbers | Shadow with a torch or lamp: distances from the source to the object and to the screen, and object height (any units). The shadow is drawn to the exact size from these (similar triangles). Without `screenDistance` the shadow falls on the ground. |
| `arrows` | `"correct"`, `"fromEye"`, `"none"` | Seeing: the direction the light travels. `fromEye` draws the common wrong idea, for picture-choice questions. |

```json
{"type": "light", "scene": "mirror", "angle": 40, "labels": {"i": "40°", "r": "?"}}
{"type": "light", "scene": "shadow", "source": "torch", "object": "ball", "sourceDistance": 2, "screenDistance": 6, "objectHeight": 1}
{"type": "light", "scene": "seeing", "source": "lamp", "object": "book"}
```

#### `forces` - force arrows on an object
For balanced and unbalanced forces (s07). Arrow lengths are in proportion to `size`, so equal forces look equal.

| Field | Type | Notes |
|---|---|---|
| **`arrows`** | list of 1-6 `{ "direction": "right", "size": 30, "name": "push", "label": "30 N" }` | `direction`: `up`, `down`, `left`, `right` (one arrow per direction). `size` (any units, usually N) sets the length; leave it out and the arrow has a standard length. `name` and `label` are written at the arrow (`"?"` for an unknown). An arrow named weight or gravity starts from the middle of the object; the others start from the side they point away from. Keep names short ("push", "friction", "air resistance") so the picture stays readable on a phone. |
| `object` | `"box"`, `"ball"`, `"car"`, `"boat"`, `"parachutist"`, `"person"`, `"apple"` | Default box. |
| `surface` | `"ground"`, `"table"`, `"water"`, `"none"` | Default: ground (water for a boat, none for a parachutist or an apple). |
| `label` | string | Under the picture. |

The description says which opposite arrows are the same length and which is longer, as a sighted pupil would see it.

```json
{"type": "forces", "object": "box", "arrows": [{"direction": "right", "size": 30, "name": "push", "label": "30 N"}, {"direction": "left", "size": 12, "name": "friction", "label": "12 N"}]}
{"type": "forces", "object": "parachutist", "arrows": [{"direction": "up", "size": 700, "name": "air resistance", "label": "?"}, {"direction": "down", "size": 700, "name": "weight", "label": "700 N"}]}
```

#### `sunEarthMoon` - day and night, orbits, the Moon's positions
| Field | Type | Notes |
|---|---|---|
| **`view`** | `"dayNight"`, `"earthOrbit"`, `"moonOrbit"` | `dayNight`: sunlight from the left, Earth half lit, with its spin. `earthOrbit`: the Earth's orbit round the Sun (one year). `moonOrbit`: the Moon at several places round the Earth, each lit on the side facing the Sun. |
| `place` | direction | `dayNight`: marks a place on Earth (a dot) at this direction from Earth's centre; 180 = facing the Sun = midday. |
| `moons` | list of directions | `moonOrbit`: where the Moon is drawn (direction from the Earth; 180 = between Earth and Sun). Default the 8 standard places. |
| `moonLabels` | list of strings | One per moon (`"A"`, `"B"`, ...). |
| `showPhases` | boolean | `moonOrbit`: also draw, beside each Moon, how it looks from Earth. |
| `labels` | boolean | Name the Sun, Earth, Moon, orbit and spin. Default true. |

Seen from above the North Pole: the Earth spins and the Moon orbits anticlockwise.

```json
{"type": "sunEarthMoon", "view": "moonOrbit", "moonLabels": ["A","B","C","D","E","F","G","H"]}
```

#### `moonPhases` - how the Moon looks
| Field | Type | Notes |
|---|---|---|
| **`phases`** | list | Any of `new`, `waxingCrescent`, `firstQuarter`, `waxingGibbous`, `full`, `waningGibbous`, `lastQuarter`, `waningCrescent`. |
| `labels` | boolean or list of strings | `true` writes the phase names; a list gives your own (`"A"`, `"?"`). |
| `hemisphere` | `"north"` (default) or `"south"` | North: a waxing Moon is lit on the right (as in Cambridge books). |

```json
{"type": "moonPhases", "phases": ["new", "firstQuarter", "full", "lastQuarter"], "labels": true}
```

#### `organ` - simple labelled organ diagrams
Schematic and accurate (front view, so the heart's left side is on the right of the picture, as in textbooks).

| Field | Type | Notes |
|---|---|---|
| **`organ`** | `"heart"`, `"lungs"`, `"circulation"` | `circulation`: heart, lungs and body with the two loops (blood rich in oxygen red, poor in oxygen blue). |
| `labels` | `"names"`, `"letters"`, `"none"` | Default `"names"`. `"letters"` puts A, B, C ... on the parts in `parts`, in that order (for "what is part B?"). |
| `parts` | list of part ids | Which parts to label (default all). Heart: `rightAtrium`, `leftAtrium`, `rightVentricle`, `leftVentricle`, `aorta`, `pulmonaryArtery`, `pulmonaryVein`, `venaCava`, `septum`. Lungs: `trachea`, `bronchus`, `bronchioles`, `lung`, `ribs`, `diaphragm`, `alveoli`. Circulation: `heart`, `lungs`, `body`, `arteries`, `veins`. |
| `flow` | boolean | Arrows for the direction of blood (heart, circulation) or air (lungs). |

```json
{"type": "organ", "organ": "heart", "labels": "letters", "parts": ["rightAtrium", "leftVentricle", "aorta", "venaCava"], "flow": true}
```

## 4. For the app (integration)

`js/diagrams/index.js` exports:

| Function | Returns |
|---|---|
| `renderDiagram(spec, opts?)` | A `<figure class="dg">` element: the SVG (`role="img"`, with the full text description as its `aria-label`) or, for `table` and `carroll`, a real HTML table; plus the caption. On a bad spec it returns a small "This picture could not be drawn" box (and never throws), so a question still works. |
| `validateQuestionDiagrams(question)` | The errors in a question's `diagram` and `optionDiagrams` (also checks there is one option diagram per option). |
| `diagramCss()` | The stylesheet, for a page that embeds several diagrams as strings. |
| `diagramMarkup(spec)` | The same as an HTML string with its colours written in (for the saved report and the email-free HTML report). |
| `describeDiagram(spec)` | The text description (the `alt` if given). |
| `validateDiagram(spec)` | A list of error strings (empty when the spec is good). |
| `DIAGRAM_TYPES` | The list of type names. |

`opts`: `{ idPrefix }` (a unique prefix if many diagrams share a page; one is made automatically otherwise).

Colours come from the app's theme tokens (`--ink`, `--line`, `--accent`, `--surface` ...) with fallbacks, so diagrams follow light and dark themes and the user's theme switch. The renderer adds one small style block to the page the first time it draws.

## 5. Change log

- 17 Oct 2026: version 1 (27 types).
- 17 Oct 2026: version 1.1. New: `forces` (force arrows), the `newtonMeter` scale, `functionMachine`, `dotPlot`, `scatterGraph`, and refraction in `light`. Documented: coordinate `segments[].label`, `axisLabels`, `fractionModel` limits (rows and cols up to 12 each, parts up to 24, wholes up to 4). Changed: food chains no longer tint the first box as a producer; coordinates with halves show as decimals (-4.5), not -9/2. Still to come (CLO's v1.1 list): reproductive organs, lab apparatus.
