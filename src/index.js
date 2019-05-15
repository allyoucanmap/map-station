/* copyright 2019, stefano bovio @allyoucanmap. */

import Controls from './controls';
import MapAsteroids from './map-asteroids';
import MapSnake from './map-snake';

const mapAsteroids = (selector, options) =>
    new MapAsteroids(selector,
        {
            ...options,
            controls: options.controls
            || new Controls(options.controlsKeys)
        }
    );

const mapSnake = (selector, options) =>
    new MapSnake(selector,
        {
            ...options,
            controls: options.controls
            || new Controls(options.controlsKeys)
        }
    );

window.MapStation = {
    mapAsteroids,
    mapSnake
};
