/* copyright 2019, stefano bovio @allyoucanmap. */

import turfSimplify from '@turf/simplify';
import turfBbox from '@turf/bbox';
import {
    scan,
    coordsToPath,
    mapFeatures,
    transform,
    rad,
    template,
    distance
} from './utils';

import Screen from './screen';

const Bullet = function(parent, params) {

    let center = params.center;
    let rotation = params.rotation;
    let removed = false;
    let maxTime = 5000;
    let radius = 3;

    const { group } = template(`
        <g id="group" fill="#ffffff" transform="${transform(...center)}">
            <circle cx="0" cy="0" r="${radius}"/>
        </g>
    `, parent);

    this.info = () => maxTime < 4000
        && {
            center,
            radius
        };
    this.position = () => center;
    this.isRemoved = () => removed;
    this.remove = () => {
        if (removed) return null;
        removed = true;
        parent.removeChild(group());
    };

    this.update = ({bounds, deltaTime}) => {
        const [ minx, miny, maxx, maxy ] = bounds;
        const x = center[0] - Math.sin(rad(-rotation)) * deltaTime;
        const y = center[1] - Math.cos(rad(-rotation)) * deltaTime;

        center = [
            x < minx
                ? maxx :
                x > maxx
                    ? minx
                    : x,
            y < miny
                ? maxy :
                y > maxy
                    ? miny
                    : y
        ];

        group({
            transform: transform(...center)
        });
        maxTime -= deltaTime;

        if (maxTime < 0) this.remove();
    };
};

const Player = function(parent) {

    const size = 16;
    let rotation = 0;
    let move = 0;
    let bullets = [];
    let center;
    let hp = 100;
    let hit;

    const { group } = template(`
        <g id="group" fill="transparent" stroke="#ffffff" stroke-width="3">
            <path d="${coordsToPath([
                [-size, size],
                [0, size / 2],
                [size, size],
                [0, -size]
            ], true)}"/>
        </g>
    `, parent);

    this.bullets = () => bullets;
    this.hp = () => hp;
    this.update = ({time, deltaTime, bounds, controls}) => {
        bullets = bullets.filter(bullet => !bullet.isRemoved());

        const [ minx, miny, maxx, maxy ] = bounds;

        if (!center) center = [(minx + maxx) / 2, maxy - 64];

        if (controls.keys.left(0)) rotation -= 10;
        else if (controls.keys.right(0)) rotation += 10;

        if (!hit && controls.keys.buttonA(400)) bullets = [
            ...bullets,
            new Bullet(parent, {center, rotation})
        ];

        bullets.forEach((bullet) => { bullet.update({deltaTime, bounds}); });

        if (controls.keys.up(0)) move = Math.abs(move) < 10 ? move - 0.5 : move;
        else move = move > 0
            ? move - 0.1
            : move < 0
                ? move + 0.1
                : 0;

        const x = center[0] + Math.sin(rad(-rotation)) * move * deltaTime / 25;
        const y = center[1] + Math.cos(rad(-rotation)) * move * deltaTime / 25;

        center = [
            x < minx
                ? maxx :
                x > maxx
                    ? minx
                    : x,
            y < miny
                ? maxy :
                y > maxy
                    ? miny
                    : y
        ];

        group({
            'transform': transform(...center, rotation),
            'stroke': hit ? '#ff00ff' : '#ffffff',
            'stroke-opacity': hit ? Math.abs(Math.sin(time * 10)) : 1
        });
    };

    this.collide = (entity) => {
        if (hit || !entity) return false;
        if (center && distance(center, entity.center) < entity.radius + size) {
            hit = entity.radius < 20 || entity.bboxs.map(([minx, miny, maxx, maxy]) => {
                return center[0] > minx && center[0] < maxx
                && center[1] > miny && center[1] < maxy;
            }).filter(val => val)[0];

            if (hit) {
                hp -= 10;
                setTimeout(() => {
                    hit = false;
                }, 1000)
                return true;
            }
        }
        return false;
    };
};

const Rock = function(parent, params) {

    const [ minx, miny, maxx, maxy ] = turfBbox(params.feature);
    const width = maxx - minx;
    const height = maxy - miny;
    const minSide = width < height ? width : height;
    const radius = (width > height ? width : height) * Math.sqrt(2) / 2;
    let center = [(maxx + minx) / 2, (maxy + miny) / 2];
    let paths = '';
    let scale = 1;
    let angle = rad(Math.random() * 360);
    let removed = false;
    let scaleFactor = -0.8;
    let checkScale = () => scale > -scaleFactor;
    let boundingBoxes = [];

    scan(
        [ params.feature ],
        function(coords) {
            let coordinate = coords.map(function(coord) {
                return [ 
                    coord[0] - minx - width / 2, 
                    coord[1] - miny - height / 2,
                ]
            });
            boundingBoxes.push(turfBbox({ type: 'Polygon', coordinates: [ coordinate ] }));
            paths += `<path d="${coordsToPath(coordinate)}" />`;
            return coords;
        }
    );

    const { group, circle } = template(`
        <g
            id="group"
            stroke="#ffffff"
            fill="#111111"
            transform="${transform(...center)}">
            ${paths}
            <circle id="circle" cx="0" cy="0" r="4" fill="transparent" stroke="${radius < 2 ? 'f2f2f2' : 'transparent'}"/>
        </g>
    `, parent);

    this.info = () => ({
        center,
        radius,
        bboxs: boundingBoxes.map((box) => {
            const minx = box[0] * scale + center[0];
            const miny = box[1] * scale + center[1]; 
            const maxx = box[2] * scale + center[0];
            const maxy = box[3] * scale + center[1];
            return [minx, miny, maxx, maxy];
        })
    });
    this.name = () => params.feature && params.feature.properties && params.feature.properties[params.propertyName] || '';
    this.isRemoved = () => removed;
    this.update = ({deltaTime, bounds}) => {
        if (removed) return null;
        if (checkScale()) {
            scale += deltaTime / 6000 * Math.sign(scaleFactor);
        } else {
    
            const [ minx, miny, maxx, maxy ] = bounds;
    
            const x = center[0] + Math.sin(angle) * deltaTime / 25;
            const y = center[1] + Math.cos(angle) * deltaTime / 25;
            
            center = [
                x < minx
                    ? maxx :
                    x > maxx
                        ? minx
                        : x,
                y < miny
                    ? maxy :
                    y > maxy
                        ? miny
                        : y
            ];
        }
        group({
            transform: transform(...center, 0, scale)
        });
    };

    this.collide = (position) => {
        if (removed) return false;

        const [ x, y ] = center;
        const scaledWidth = scale * width;
        const scaledHeight = scale * height;
        
        const bbox = [
            x - scaledWidth / 2,
            y - scaledHeight / 2,
            x + scaledWidth / 2,
            y + scaledHeight / 2
        ];

        const checkBoundingBoxes = () => {
            if (boundingBoxes.length === 1) return true;
            return boundingBoxes.map((box) => {
                const minx = box[0] * scale + x;
                const miny = box[1] * scale + y; 
                const maxx = box[2] * scale + x;
                const maxy = box[3] * scale + y;
                return position[0] > minx && position[0] < maxx
                    && position[1] > miny && position[1] < maxy;

            }).filter(val => val)[0];
        };

        if (minSide < 10 && distance([x, y], position) < 10
        || (position[0] > bbox[0] && position[0] < bbox[2]
        && position[1] > bbox[1] && position[1] < bbox[3] && checkBoundingBoxes())) {
            removed = true;
            group({
                'stroke-dasharray': '10',
                'stroke-width': 2,
                'fill': 'transparent',
                'stroke': '#ff33aa'
            });
            circle({ fill: '#ff33aa', stroke: 'transparent' })
            setTimeout(() => {
                if (group().parentNode) parent.removeChild(group());
            }, 200);
            return true;
        }
        return false;
    };
}

const MapAsteroids = function(selector, { featureCollection, controls, projection, propertyName = 'name', flipYCoords }) {

    const parent = document.querySelector(selector);
    const width = 1024;
    const height = 1024;
    const margin = 16;

    const backgroundColor = '#000000';
    const borderColor = '#f2f2f2';

    const features = mapFeatures(
        turfSimplify(featureCollection),
        { width, height, centered: true },
        projection,
        flipYCoords
    );

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
    let score = 0;
    let hp = 100;

    const cover = new Screen(svg(), (group) => {
        score = 0;
        hp = 100;
        features.map((feature) => new Rock(group(), {feature}));
        const { title } = template(`
        <text
            id="title"
            x="${width / 2}"
            y="${height / 2}"
            fill="#ffffff"
            font-size="64"
            font-family="PressStart2P"
            text-anchor="middle"
            alignment-baseline="central"/>
        <text
            id="pressStartLabel"
            x="${width / 2}"
            y="${height / 2 + 64}"
            fill="#ffffff"
            font-size="32"
            font-family="PressStart2P"
            font-weight="bold"
            text-anchor="middle"
            alignment-baseline="central">
            PRESS START
        </text>
        `, group());
        title().innerHTML = 'MAP ASTEROIDS';
    }, true);

    const main = new Screen(svg(), (group) => {
        controls.reset();
        const rocks = features.map((feature) => new Rock(group(), {feature, propertyName}));
        const player = new Player(group());

        const { name, scoreBar } = template(`
        <text
            id="name"
            x="${width / 2}"
            y="32"
            fill="#ffffff"
            fill-opacity="0.75"
            font-size="16"
            font-family="PressStart2P"
            text-anchor="middle"
            alignment-baseline="central"/>
        <text
            id="hp"
            x="16"
            y="${height - 24}"
            fill="#ffffff"
            fill-opacity="0.75"
            font-size="16"
            font-family="PressStart2P"
            alignment-baseline="central">HP:</text>
        <rect x="76" y="${height - 32}" width="${width - 92}" height="16" stroke="#ffffff" fill="transparent" rx="8"/>
        <rect id="scoreBar" x="80" y="${height - 28}" width="${width - 100}" height="8" fill-opacity="0.75" fill="#f2f2f2" rx="4"/>
        `, group());

        return () => {
            let playerCollide = false;
            rocks.forEach(function(rock) {
                rock.update({time, deltaTime, bounds});
                player.bullets().forEach((bullet) => {
                    if (rock.collide(bullet.position())) {
                        bullet.remove();
                        score += 1;
                        name().innerHTML = rock.name();
                    }
                });
                if (!rock.isRemoved() && player.collide(rock.info())) playerCollide = true;
            });
            player.bullets().forEach((bullet) => {
                if (player.collide(bullet.info())) playerCollide = true;
            });
            if (playerCollide) {
                scoreBar({ width: player.hp() * (width - 100) / 100 });
                hp = player.hp();
            }
            player.update({time, deltaTime, bounds, controls});  
        };
    });

    const gameover = new Screen(svg(), (group) => {
        const { title, scoreText, scoreLabel } = template(`
        <text
            id="title"
            x="${width / 2}"
            y="${height / 2 - 32}"
            fill="#ffffff"
            font-size="64"
            font-family="PressStart2P"
            text-anchor="middle"
            alignment-baseline="central"/>
        <text
            id="pressStartLabel"
            x="${width / 2}"
            y="${height / 2 + 64}"
            fill="#ffffff"
            font-size="32"
            font-family="PressStart2P"
            font-weight="bold"
            text-anchor="middle"
            alignment-baseline="central">
            PRESS START
        </text>
        <text
            id="scoreText"
            x="${width / 2}"
            y="${height - 128}"
            fill="#ffffff"
            font-size="24"
            font-family="PressStart2P"
            text-anchor="middle"
            alignment-baseline="central"/>
        <text
            id="scoreLabel"
            x="${width / 2}"
            y="${height - 64}"
            fill="#ffffff"
            font-size="32"
            font-family="PressStart2P"
            text-anchor="middle"
            alignment-baseline="central"/>
        `, group());
        title().innerHTML = 'GAME OVER';
        scoreText().innerHTML = 'SCORE';
        scoreLabel().innerHTML = `${score} / ${features.length}`;
    });

    const win = new Screen(svg(), (group) => {
        const { title, scoreText, scoreLabel } = template(`
        <text
            id="title"
            x="${width / 2}"
            y="${height / 2 - 32}"
            fill="#ffffff"
            font-size="64"
            font-family="PressStart2P"
            text-anchor="middle"
            alignment-baseline="central"/>
        <text
            id="scoreText"
            x="${width / 2}"
            y="${height / 2 + 64}"
            fill="#ffffff"
            font-size="32"
            font-family="PressStart2P"
            text-anchor="middle"
            alignment-baseline="central"/>
        <text
            id="scoreLabel"
            x="${width / 2}"
            y="${height / 2 + 128}"
            fill="#ffffff"
            font-size="32"
            font-family="PressStart2P"
            text-anchor="middle"
            alignment-baseline="central"/>
        `, group());
        title().innerHTML = 'YOU WIN';
        scoreText().innerHTML = 'SCORE';
        scoreLabel().innerHTML = `${score} / ${features.length}`;
    });

    let current = 'cover';
    let last = current;

    const animate = () => {
        setTimeout(() => {
            requestAnimationFrame(animate);
        }, 1000 / 60);

        if (current === 'cover' && (controls.keys.start(1000) || controls.keys.select(1000))) {
            current = 'main';
        }

        if (current === 'main' && (controls.keys.select(1000) || hp === 0)) {
            current = 'gameover';
        }

        if (current === 'gameover' && (controls.keys.start(1000) || controls.keys.select(1000))) {
            current = 'cover';
        }

        if (current === 'win' && (controls.keys.start(1000) || controls.keys.select(1000))) {
            current = 'cover';
        }

        if (score === features.length && current === 'main') {
            current = 'win';
        }

        if (last === 'cover' && current !== 'cover') {
            cover.remove();
            gameover.remove();
            win.remove();
            main.init();
        }

        if (last !== 'cover' && current === 'cover') {
            main.remove();
            win.remove();
            gameover.remove();
            cover.init();
        }

        if (last === 'main' && current === 'gameover') {
            main.remove();
            win.remove();
            cover.remove();
            gameover.init();
        }

        if (last !== 'win' && current === 'win') {
            main.remove();
            cover.remove();
            gameover.remove();
            win.init();
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

export default MapAsteroids;
