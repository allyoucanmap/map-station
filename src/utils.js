/* copyright 2019, stefano bovio @allyoucanmap. */

import turfBbox from '@turf/bbox';
import fastXmlParser from 'fast-xml-parser';

export const transform = (x, y, rotation = 0, scale = 1) => `rotate(${rotation} ${x} ${y}) translate(${x}, ${y}) scale(${scale})`;
export const rad = (d) => d * (Math.PI / 180.0);
export const deg = (r) => r / (Math.PI / 180.0);
export const map = (val, v1, v2, v3, v4) => v3 + (v4 - v3) * ((val - v1) / (v2 - v1));
export const distance = (pointA, pointB) => Math.sqrt(Math.pow(pointA[0] - pointB[0], 2) + Math.pow(pointA[1] - pointB[1], 2));
export const lerp = (a, b, am) => a + (b - a) * am;
export const shuffle = (array) => [ ...array.sort(() => Math.random() - 0.5) ];

const xmlns = 'http://www.w3.org/2000/svg';

function updateElement(el, attributes = {}, style = {}) {
    Object.keys(attributes).forEach(key => {
        el.setAttribute(key, attributes[key]);
    });
    Object.keys(style).forEach(key => {
        el.style[key] = style[key];
    });
    return el;
}

export function create(tag, attributes = {}, style = {}, parent) {
    const el = document.createElement(tag);
    updateElement(el, attributes, style);
    if (parent) parent.appendChild(el);
    return function update(...args) {
        return updateElement(el, ...args)
    };
}

export function createNS(tag, attributes = {}, style = {}, parent) {
    const el = document.createElementNS(xmlns, tag);
    updateElement(el, attributes, style);
    if (parent) parent.appendChild(el);
    return function update(...args) {
        return updateElement(el, ...args)
    };
}

export function scan(features, update = function (coords) { return coords; }, replace = true) {
    return features.map(function (feature) {
        const geometryType = feature.geometry && feature.geometry.type;
        const coordinates = geometryType === 'Point' && update([feature.geometry.coordinates], feature.properties || {})
            || geometryType === 'MultiPoint' && update(feature.geometry.coordinates, feature.properties || {})
            || geometryType === 'LineString' && update(feature.geometry.coordinates, feature.properties || {})
            || geometryType === 'MultiLineString' && feature.geometry.coordinates.map(function (coords) { return update(coords, feature.properties || {}); })
            || geometryType === 'Polygon' && feature.geometry.coordinates
                .map(function (coords) { return update(coords, feature.properties || {}); }).filter(coords => coords.length > 0)
            || geometryType === 'MultiPolygon' && feature.geometry.coordinates
                .map(function (group) {
                    return group
                        .map(
                            function (coords) { return update(coords, feature.properties || {}); }
                        ).filter(coords => coords.length > 0);
                }
                ).filter(coords => coords.length > 0);
        if (!replace) return feature;
        return coordinates.length > 0 ? {
            ...feature,
            geometry: {
                ...feature.geometry,
                coordinates: geometryType === 'Point' ? coordinates[0] : coordinates
            }
        } : null;
    }).filter(val => val);
}

export function coordsToPath(coordinates, close) {
    return coordinates.reduce(function (data, coord, idx) {
        return data + (idx === 0 && 'M' + coord[0] + ' ' + coord[1]
            || idx === coordinates.length - 1 && 'L' + coord[0] + ' ' + coord[1] + (close ? 'Z' : '')
            || 'L' + coord[0] + ' ' + coord[1]);
    }, '');
}

export function mapFeatures(featuresCollenction, params, projection, flipYCoords) {

    const features = scan(
        (featuresCollenction && featuresCollenction.features || [])
            .filter(feature => feature && feature.geometry
                && (feature.geometry.type === 'Polygon' || feature.geometry.type === 'MultiPolygon')),
        function (coords) {
            return coords.map(function (coord) {
                const projected = projection && projection(coord) || coord;
                return projected;
            })
        }
    );

    const extent = turfBbox({ ...featuresCollenction, features });
    const extentWidth = extent[2] - extent[0];
    const extentHeight = extent[3] - extent[1];

    const width = params.width;
    const height = params.height;

    const extentRatio = extentWidth / extentHeight;
    const ratio = width / height;

    const isHorizontal = extentRatio > ratio;

    const geometriesWidth = isHorizontal ? width : height * extentWidth / extentHeight;
    const geometriesHeight = isHorizontal ? width * extentHeight / extentWidth : height;

    const minx = isHorizontal ? 0 : params.centered ? width / 2 - geometriesWidth / 2 : 0;
    const miny = isHorizontal ? params.centered ? height / 2 - geometriesHeight / 2 : 0 : 0;
    const maxx = isHorizontal ? geometriesWidth : params.centered ? width / 2 + geometriesWidth / 2 : geometriesWidth;
    const maxy = isHorizontal ? params.centered ? height / 2 + geometriesHeight / 2 : geometriesHeight : geometriesHeight;

    return scan(
        features,
        function (coords) {
            return coords.map(function (coord) {
                return [
                    map(coord[0], extent[0], extent[2], minx, maxx),
                    map(coord[1], extent[flipYCoords ? 1 : 3], extent[flipYCoords ? 3 : 1], miny, maxy)
                ];
            })
        }
    );
}

export const fitFeatures = function (features, container) {

    const [minx, miny, maxx, maxy] = turfBbox({ type: 'FeatureCollection', features });

    const extentWidth = maxx - minx;
    const extentHeight = maxy - miny;
    const ratio = extentWidth / extentHeight;

    const width = extentWidth > extentHeight ? container.width : container.height * ratio;
    const height = extentWidth > extentHeight ? container.width / ratio : container.height;

    return {
        features: scan(features, function (coords) {
            return coords.map(coord => [
                map(coord[0], minx, maxx, -width / 2, width / 2),
                map(coord[1], miny, maxy, -height / 2, height / 2),
            ]);
        }),
        width,
        height
    }
};

export const getSprites = (name) =>
    new Promise(function (resolve) {
        fetch(`${name}.json`)
            .then(function (res) {
                res.json()
                    .then(function (info) {
                        const sprites = new Image();
                        sprites.onload = () => {
                            const canvas = create('canvas', {
                                width: sprites.naturalWidth,
                                height: sprites.naturalHeight
                            }, {
                                    width: `${sprites.naturalWidth}px`,
                                    height: `${sprites.naturalHeight}px`
                                })();

                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(sprites, 0, 0);

                            const defs = createNS('defs');

                            Object.keys(info)
                                .forEach((key) => {
                                    const { x, y, width, height } = info[key];
                                    const group = createNS('g', { id: `sprite-${key}` }, {}, defs());
                                    for (let j = y; j < y + height; j++) {
                                        for (let i = x; i < x + width; i++) {
                                            const { data } = ctx.getImageData(i, j, 1, 1);
                                            const [r, g, b, a] = data;
                                            if (a !== 0) {
                                                createNS('rect', {
                                                    x: i - x,
                                                    y: j - y,
                                                    width: 1,
                                                    height: 1,
                                                    fill: `rgba(${r}, ${g}, ${b}, ${a})`
                                                }, {}, group());
                                            }
                                        }
                                    }
                                });
                            resolve(defs);
                        };

                        sprites.crossOrigin = 'Anonymous'
                        sprites.src = `${name}.png`;

                    })
            });
    });

const tags = {
    create: ['div', 'span', 'strong', 'link', 'canvas'],
    createNS: ['rect', 'circle', 'path', 'svg', 'g', 'foreignObject', 'text', 'use', 'tspan']
};

export const template = function (xmlString, parentNode) {
    const parsed = fastXmlParser.parse(`<div class="ok">${xmlString}</div>`, {
        ignoreAttributes: false
    });

    const convertObj = (id, key, json, parent, skip) => {
        const { attributesStyle, attributes } = Object.keys(json)
            .reduce((acc, attrKey) => {
                if (attrKey.indexOf('@_') !== 0) return { ...acc };
                if (attrKey === '@_style') return { ...acc, attributesStyle: json[attrKey] };
                return {
                    ...acc,
                    attributes: {
                        ...acc.attributes,
                        [attrKey.replace('@_', '')]: json[attrKey]
                    }
                };
            }, { attributes: {} });
        let style;
        try {
            style = (attributesStyle || '').split(';')
                .reduce((acc, param) => {
                    const splittedParam = param.split(':');
                    const styleKey = (splittedParam[0] || '').trim();
                    const styleValue = (splittedParam[1] || '').trim();
                    if (!styleKey) return { ...acc };
                    return {
                        ...acc,
                        [styleKey]: styleValue
                    };
                }, {});
        } catch (e) {
            style = {};
        }
        const text = json['#text'];
        const createFunc = tags.create.indexOf(key) !== -1 && create
            || tags.createNS.indexOf(key) !== -1 && createNS;
        const node = skip ? null : createFunc(key, attributes, style, parent);
        if (text && node) node().innerHTML = text;
        return [
            ...(skip
                ? []
                : [{
                    id,
                    attributeId: attributes.id,
                    key,
                    type: key,
                    node
                }]),
            ...Object.keys(json)
                .filter((childrenKey) => childrenKey !== '#text' && childrenKey.indexOf('@_') !== 0)
                .reduce((acc, childrenKey) => {
                    const children = json[childrenKey].length ? json[childrenKey] : [json[childrenKey]];
                    return [
                        ...acc,
                        ...children
                            .reduce((childAcc, child) => [
                                ...childAcc,
                                ...convertObj(`${id}_${childrenKey}`, childrenKey, child, skip ? parent : node())
                            ], [])
                    ];
                }, [])
        ]
    };

    return convertObj('root', 'div', parsed.div, parentNode, true).reduce((acc, object) => {
        return Object.assign({}, acc,
            { [object.attributeId || object.id]: object.node }
        );
    }, {});
};
