# map-station

## collection of mini game made with js and SVG

demo: https://allyoucanmap.github.io/map-station/index.html

### MapStation:

- `MapStation.mapAsteroids(selector, options);` asteroids game [A]
- `MapStation.mapSnake(selector, options);` snake game [S]

- `arguments`
    - `selector` *{string}*
    - `options` *{object}*:
        - `featureCollection` *{object}* Polygon and MultiPolygon GeoJSON
        - `propertyName` *{string}* property of feature to display as label
        - `projection` *{function}* must return an array of coordinares [x, y], example `function(coords) { return [coords[1], coords[0]];}`
        - `controlsKeys` *{object}* array of controls objects
        - `flipYCoords` *{boolean}* flip y coordinates
        - `warpPole` *{boolean}* [S] if true snake will warp between poles

### Controls:

- `.mapAsteroids`
    - `left` rotate left
    - `right` rotate right
    - `up` move
    - `buttonA` fire

- `.mapSnake`
    - `up` move up
    - `right` move right
    - `down` move down
    - `left` move left

- `default controlKeys`:

```js
[
    { name: 'left', code: 65 }, // a
    { name: 'right', code: 68 }, // d
    { name: 'up', code: 87 }, // w
    { name: 'down', code: 83 }, // s
    { name: 'buttonA', code: 32 }, // spacebar
    { name: 'buttonB', code: 77 }, // m
    { name: 'start', code: 13 }, // enter
    { name: 'select', code: 27} // esc
]
```

### Example

```html
<body>
    <div id="container"></div>
    <script src="dist/map-station.js"></script>
    <script>
        fetch('my-polygon.geo.json')
            .then(function (res) {
                res.json()
                    .then(function (featureCollection) {
                        MapStation.mapAsteroids(
                            '#container'
                            { featureCollection }
                        );
                    })
            });
    </script>
</body>
```
### Note

Work only with `Polygon` and `MultiPolygon` feature

### Development

`npm install`

`npm start` -> `http://localhost:3000`

---

country.geo.json data from https://github.com/johan/world.geo.json