/* copyright 2019, stefano bovio @allyoucanmap. */

import turfBbox from '@turf/bbox';
import turfBooleanPointInPolygon from '@turf/boolean-point-in-polygon';
import tinycolor from 'tinycolor2';
import {
    mapFeatures,
    transform,
    template,
    shuffle,
    distance
} from './utils';

import Screen from './screen';

const Block = function(parent, params) {
    const size = params.size || 8;
    const { block } = template(`
        <g
            id="block"
            fill="${tinycolor(params.color).lighten(20) || '#777777'}"
            stroke="${params.color && tinycolor(params.color).darken(10) || '#333333'}"
            stroke-width="0.5"
            transform="${transform(...(params.position || [0, 0]))}">
            <rect x="${-size / 2}" y="${-size / 2}" width="${size}" height="${size}"/>
        </g>
    `, parent);

    let currentPosition = [...params.position];
    let lastPosition = [...currentPosition];
    let moved;

    this.lastPosition = () => [...lastPosition];
    this.position = () => currentPosition;
    this.isMoved = () => moved;
    this.moved = () => {
        moved = true;
        block({
            'stroke-width': 3
        });
    };
    this.reset = () => {
        parent.removeChild(block());
        parent.appendChild(block());
    };
    this.update = ({ position }) => {
        if (position[0] !== currentPosition[0] || position[1] !== currentPosition[1]) {
            lastPosition = [...currentPosition];
            currentPosition = [...position];
        }
        block({
            transform: transform(...currentPosition)
        });
    };
    this.freeze = () => {
        moved = false;
        block({
            'fill': '#000',
            'stroke': '#333',
            'stroke-width': 0.5
        });
    };
};

const Food = function(parent, params) {

    const feature = params.feature;
    const bbox = turfBbox(feature);
    const size = params.size;
    const name = feature && feature.properties && feature.properties[params.propertyName];
    const minx = Math.round(bbox[0] / size) * size;
    const miny = Math.round(bbox[1] / size) * size;
    const maxx = Math.round(bbox[2] / size) * size;
    const maxy = Math.round(bbox[3] / size) * size;
    const width = maxx - minx;
    const height = maxy - miny;
    const center = [
        (maxx + minx) / 2,
        (maxy + miny) / 2
    ];
    const rows = height / size;
    const cols = width / size;

    const range = Object.keys([...new Array(rows * cols)]);
    const colors = ['#ff5555', '#aaee33', '#3377ee', '#aa33ff'].map(color => tinycolor(color).darken(5).toHexString());
    const color = colors[Math.floor(Math.random() * colors.length)];

    let blocks = [];

    if (cols === 0 || rows === 0) {
        const bX = -width / 2 + cols * size + size / 2 + center[0];
        const bY = -height / 2 + rows * size + size / 2 + center[1];
        const checkGrid = !!Food.grid[bX + ':' + bY];
        if (!checkGrid) Food.grid[bX + ':' + bY] = true;
        blocks = checkGrid
            ? []
            : [
                new Block(parent, {
                    size,
                    position: [
                        bX,
                        bY
                    ],
                    color
                })
            ];
    } else {
        blocks = range.map((idx) => {
            const x = idx % cols;
            const y = Math.floor(idx / cols);
            const bX = -width / 2 + x * size + size / 2 + center[0];
            const bY = -height / 2 + y * size + size / 2 + center[1];
            const isInside = turfBooleanPointInPolygon(
                [
                    bX,
                    bY
                ],
                feature
            );
            const checkGrid = !!Food.grid[bX + ':' + bY];
            const block = isInside && !checkGrid ?
                new Block(parent, {
                    size,
                    position: [
                        bX,
                        bY
                    ],
                    color
                })
                : null;
            if (!checkGrid && isInside) Food.grid[bX + ':' + bY] = true;
            return block;
        })
        .filter(block => block);
    }

    this.isEmpty = () => blocks.length === 0;
    this.name = () => name;
    this.collide = (position) => {
        if (position[0] > minx && position[0] < maxx
        && position[1] > miny && position[1] < maxy
        || (cols === 0 || rows === 0)) {
            return blocks
                .filter(block => !block.isMoved())
                .map((block) => distance(block.position(), position) === 0 ? block : null)
                .filter(val => val)[0] || false;
        }
        return false;
    };
};

Food.grid = {};

const Snake = function(parent, params) {

    const size = params.size;
    let position = [ 512 + size / 2, 512 + size / 2 ];
    let direction = 0;
    let updateTime = 0;
    let score = 0;
    let walls = [];
    let stop;
    const maxLength = 512;
    const headLength = 3;
    const range = Object.keys([...new Array(headLength)]);
    let tail = range.map(() =>
        new Block(parent, {
            size,
            position
        }));

    tail.forEach((block) => {
        block.moved();
    });

    this.position = () => [...position];
    this.isStopped = () => stop;
    this.append = (block) => {
        block.reset();
        tail = [...tail, block];
        score++;
    };
    this.label = () => `max length ${tail.length}/${maxLength}`;
    this.score = () => `score ${score}`;
    this.update = ({deltaTime, bounds, controls}) => {
        if (stop) return null;
        if (controls.keys.left(100) && direction !== 1) direction = 0;
        else if (controls.keys.right(100) && direction !== 0) direction = 1;
        else if (controls.keys.up(100) && direction !== 3) direction = 2;
        else if (controls.keys.down(100) && direction !== 2) direction = 3;

        if (updateTime > 25) {
            position = [
                position[0] + ((direction === 0 || direction === 1)
                    ? direction === 0 ? -size : size
                    : 0),
                position[1] + ((direction === 2 || direction === 3)
                    ? direction === 2 ? -size : size
                    : 0),
            ];
            updateTime = 0;
        }
        updateTime += deltaTime;

        const [x, y] = position;
        const [ minx, miny, maxx, maxy ] = bounds;

        position[0] = x < minx
            ? maxx - size / 2 
            : x > maxx
                ? minx + size / 2
                : x;

        if (params.warpPole) {
            position[1] = y < miny
            ? maxy - size / 2
            : y > maxy
                ? miny + size / 2
                : y;
        } else {
            const width = maxx - minx;
            if (y < miny) {
                const shift = position[0] + width / 2;
                position[0] = shift > width ? shift - width : shift;
                position[1] += size; 
                direction = 3;
            } else if (y > maxy) {
                const shift = position[0] + width / 2;
                position[0] = shift > width ? shift - width : shift;
                position[1] -= size; 
                direction = 2;
            }
        }

        tail.forEach((block, idx) => {
            let lastBlock = tail[idx - 1];
            if (lastBlock) {
                block.update({ position: lastBlock.lastPosition() });
            } else {
                block.update({ position: [...position] });
            }
        });

        if (tail.length === maxLength) {
            const wall = tail.filter((block, idx) => idx > maxLength / 2);
            wall.forEach((block) => {
                block.freeze();
            });
            walls = [...walls, ...wall];
            tail = tail.filter((block, idx) => idx <= maxLength / 2);
        }

        const head = tail[0];
        
        const hit = [
            ...tail.filter((block, idx) => idx >= headLength && idx < tail.length - 1),
            ...walls
        ]
        .map((block) => distance(block.position(), head.position()) === 0 ? block : null)
        .filter(val => val)[0];
        
        if (hit) {
            stop = true;
            tail.forEach((block) => block.freeze());
        }
    };
};

const MapSnake = function(selector, { warpPole, featureCollection, controls, projection, flipYCoords, propertyName = 'name' }) {

    const parent = document.querySelector(selector);
    const width = 1024;
    const height = 1024;
    const margin = 16;

    const backgroundColor = '#f2f2f2';
    const borderColor = '#333333';

    const features = shuffle(
        mapFeatures(
            featureCollection,
            { width, height, centered: true },
            projection,
            flipYCoords
        ));

    template('<link href="fonts/PressStart2P.css" type="text/css" rel="stylesheet" />', document.head);

    const { svg } = template(`
    <svg
        viewBox="0 0 ${width + margin * 2} ${width + margin * 2}"
        style="
        position: relative;
        width: 100%;
        height: 100%;
        padding: 16px;">
        <rect x="${-margin}" y="${-margin}" width="${width + margin * 4}" height="${height + margin * 4}" fill="${backgroundColor}"/>
        <rect x="${-margin/2}" y="${-margin / 2}" width="${width + margin * 3}" height="${height + margin * 3}" stroke="${borderColor}" stroke-width="0.5" fill="transparent"/>
        <rect x="0" y="0" width="${width + margin * 2}" height="${height + margin * 2}" stroke="${borderColor}" stroke-width="3" fill="transparent"/>
        <svg
            id="svg"
            viewBox="0 0 ${width} ${height}"
            style="
                position: absolute;
                width: 100%;
                height: 100%;">
        </svg>
    </svg>
    `, parent);

    const bounds = [ 0, 0, width, height ];

    let startTime = Date.now();
    let time = (Date.now() - startTime) / 1000;
    let currentTime = Date.now();
    let prevTime = currentTime;
    let deltaTime = currentTime - prevTime;
    const size = 8;
    let gameover;

    const cover = new Screen(svg(), (group) => {
        Food.grid = {};
        features
            .map(feature => new Food(group(), { feature, size, propertyName }))
            .filter(block => !block.isEmpty());
        const { title } = template(`
        <text
            id="title"
            x="${width / 2}"
            y="${height / 2}"
            fill="#333333"
            font-size="64"
            font-family="PressStart2P"
            text-anchor="middle"
            alignment-baseline="central"/>
        <text
            id="pressStartLabel"
            x="${width / 2}"
            y="${height / 2 + 64}"
            fill="#333333"
            font-size="32"
            font-family="PressStart2P"
            font-weight="bold"
            stroke="#ffffff"
            text-anchor="middle"
            alignment-baseline="central">
            PRESS START
        </text>
        `, group());
        title().innerHTML = 'MAP SNAKE';
    }, true);

    const main = new Screen(svg(), (group) => {
        controls.reset();
        Food.grid = {};
        gameover = false;
        const { pressStartLabel, background, label, maxLengthlabel, scoreLabel, gameoverLabel } = template(`
        <g id="background"></g>
        <text
            id="scoreLabel"
            x="${width / 2}"
            y="${32}"
            fill="#333333"
            font-size="16"
            font-family="PressStart2P"
            font-weight="bold"
            stroke="#ffffff"
            text-anchor="middle"
            alignment-baseline="central"/>
        <text
            id="label"
            x="${width / 2}"
            y="${64}"
            fill="#333333"
            font-size="16"
            font-family="PressStart2P"
            font-weight="bold"
            stroke="#ffffff"
            text-anchor="middle"
            alignment-baseline="central"/>
        <text
            id="gameoverLabel"
            x="${width / 2}"
            y="${height / 2}"
            fill="#333333"
            font-size="64"
            font-family="PressStart2P"
            font-weight="bold"
            stroke="#ffffff"
            text-anchor="middle"
            alignment-baseline="central"
            style="display: none;">
            GAME OVER
        </text>
        <text
            id="pressStartLabel"
            x="${width / 2}"
            y="${height / 2 + 64}"
            fill="#333333"
            font-size="32"
            font-family="PressStart2P"
            font-weight="bold"
            stroke="#ffffff"
            text-anchor="middle"
            alignment-baseline="central"
            style="display: none;">
            PRESS START
        </text>
        <text
            id="maxLengthlabel"
            x="${width / 2}"
            y="${height - 32}"
            fill="#333333"
            font-size="16"
            font-family="PressStart2P"
            font-weight="bold"
            stroke="#ffffff"
            text-anchor="middle"
            alignment-baseline="central"/>
        `, group());

        const feed = features
            .map(feature => new Food(background(), { feature, size, propertyName }))
            .filter(block => !block.isEmpty());
        const snake = new Snake(background(), { size, warpPole });
        maxLengthlabel().innerHTML = snake.label();
        scoreLabel().innerHTML = snake.score();
        return () => {
            if (snake.isStopped()) {
                if (!gameover) {
                    gameoverLabel({}, {
                        display: 'block'
                    });
                    pressStartLabel({}, {
                        display: 'block'
                    });
                    gameover = true;
                }
                
            } else {
                feed.forEach((food) => {
                    const block = food.collide(snake.position());
                    if (block) {
                        block.moved();
                        snake.append(block);
                        label().innerHTML = food.name();
                        maxLengthlabel().innerHTML = snake.label();
                        scoreLabel().innerHTML = snake.score();
                    }
                });
                snake.update({time, deltaTime, bounds, controls});
            }
        };
    });

    let current = 'cover';
    let last = current;

    const animate = () => {
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, 1000 / 60);

        if (current === 'cover'
        && (controls.keys.start(1000) || controls.keys.select(1000) || controls.keys.buttonA(1000))) {
            current = 'main';
        }

        if (current === 'main'
        && gameover && (controls.keys.start(1000) || controls.keys.select(1000) || controls.keys.buttonA(1000))) {
            current = 'cover';
        }

        if (last === 'cover' && current !== 'cover') {
            cover.remove();
            main.init();
        }

        if (last === 'main' && current !== 'main') {
            cover.init();
            main.remove();
        }

        Screen.update();

        currentTime = Date.now();
        deltaTime = currentTime - prevTime;
        prevTime = currentTime;
        time = (currentTime - startTime) / 1000;
        last = current;
    };
    animate();
};

export default MapSnake;
