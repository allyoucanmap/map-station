/* copyright 2019, stefano bovio @allyoucanmap. */

import {
    transform,
    template
} from './utils';

const Controller = function(selector) {
    const storeKey = 'mapStationControlsKeys';
    let controlsKeys;
    try {
        controlsKeys = JSON.parse(localStorage.getItem(storeKey));
    } catch(e) {
        //
    }
    if (!controlsKeys) controlsKeys = [
        { name: 'left', code: 65 },
        { name: 'right', code: 68 },
        { name: 'up', code: 87 },
        { name: 'down', code: 83 },
        { name: 'buttonA', code: 32 },
        { name: 'buttonB', code: 77 },
        { name: 'start', code: 13 },
        { name: 'select', code: 27}
    ];

    const parent = document.querySelector(selector);
    const width = 1024;
    const height = 1024;
    const margin = 16;

    const backgroundColor = '#f2f2f2';
    const borderColor = '#333333';

    template('<link href="fonts/PressStart2P.css" type="text/css" rel="stylesheet" />', document.head);

    const { title, keyCode, bg, ...ids } = template(`
    <svg
        viewBox="0 0 ${width + margin * 2} ${width + margin * 2}"
        style="
        position: relative;
        width: 100%;
        height: 100%;
        padding: 16px;">
        <rect x="${-margin}" y="${-margin}" width="${width + margin * 4}" height="${height + margin * 4}" fill="${backgroundColor}"/>
        <rect x="${-margin/2}" y="${-margin / 2}" width="${width + margin * 3}" height="${height + margin * 3}" stroke="${borderColor}" stroke-width="0.5" fill="transparent"/>
        <rect id="bg" x="0" y="0" width="${width + margin * 2}" height="${height + margin * 2}" stroke="${borderColor}" stroke-width="3" fill="transparent"/>
        <svg
            viewBox="0 0 ${width} ${height}"
            style="
                position: absolute;
                width: 100%;
                height: 100%;">
            <g>
                <rect
                    transform="${transform(width / 2, height / 2)}"
                    fill="#777"
                    x="${- width / 4}"
                    y="${- height / 8}"
                    width="${width / 2}"
                    height="${height / 4}"/>
                <circle
                    transform="${transform(width / 4, height / 2)}"
                    fill="#999"
                    cx="0"
                    cy="0"
                    r="${height / 7}"/>
                <circle
                    transform="${transform(width * 3 / 4, height / 2)}"
                    fill="#999"
                    cx="0"
                    cy="0"
                    r="${height / 7}"/>
            </g>
            <rect
                id="up"
                transform="${transform(width / 4, height / 2 - 64)}"
                fill="#333"
                x="-24"
                y="-32"
                width="48"
                height="64"
                stroke="#888"
                rx="8"/>
            <rect
                id="right"
                transform="${transform(width / 4 + 64, height / 2)}"
                fill="#333"
                x="-32"
                y="-24"
                width="64"
                height="48"
                stroke="#888"
                rx="8"/>
            <rect
                id="down"
                transform="${transform(width / 4, height / 2 + 64)}"
                fill="#333"
                x="-24"
                y="-32"
                width="48"
                height="64"
                stroke="#888"
                rx="8"/>
            <rect
                id="left"
                transform="${transform(width / 4 - 64, height / 2)}"
                fill="#333"
                x="-32"
                y="-24"
                width="64"
                height="48"
                stroke="#888"
                rx="8"/>
            <rect
                id="start"
                transform="${transform(width / 2 - 48, height / 2 + 64)}"
                fill="#333"
                x="-32"
                y="-8"
                width="64"
                height="16"
                stroke="#888"
                rx="8"/>
            <rect
                id="select"
                transform="${transform(width / 2 + 48, height / 2 + 64)}"
                fill="#333"
                x="-32"
                y="-8"
                width="64"
                height="16"
                stroke="#888"
                rx="8"/>
            <circle
                id="buttonA"
                transform="${transform(width * 3 / 4 - 48, height / 2 + 16)}"
                fill="#333"
                cx="0"
                cy="0"
                r="32"/>
            <text
                x="${width * 3 / 4 - 48}"
                y="${height / 2 + 16}"
                fill="#fff"
                font-size="24"
                font-family="PressStart2P"
                text-anchor="middle"
                alignment-baseline="central"
                style="pointer-events: none;">
                A
            </text>
            <circle
                id="buttonB"
                transform="${transform(width * 3 / 4 + 48, height / 2 - 16)}"
                fill="#333"
                cx="0"
                cy="0"
                r="32"/>
            <text
                x="${width * 3 / 4 + 48}"
                y="${height / 2 - 16}"
                fill="#fff"
                font-size="24"
                font-family="PressStart2P"
                text-anchor="middle"
                alignment-baseline="central"
                style="pointer-events: none;">
                B
            </text>
            <text
                id="title"
                x="${width / 2}"
                y="${height - 64}"
                fill="#555"
                font-size="24"
                font-family="PressStart2P"
                text-anchor="middle"
                alignment-baseline="central"/>
            <text
                x="${width / 2}"
                y="96"
                fill="#555"
                font-size="64"
                font-family="PressStart2P"
                text-anchor="middle"
                alignment-baseline="central">
                MAP STATION
            </text>
            ${controlsKeys.map(({ name, code }, idx) => {
                return `<text
                    id="label_${name}"
                    x="${width / 2}"
                    y="${height * 3.3 / 5 + idx * 32}"
                    fill="#555"
                    font-size="16"
                    font-family="PressStart2P"
                    text-anchor="middle"
                    alignment-baseline="central">
                    ${name} -> key code: ${code}
                </text>`;
            }).join('\n')}
            <text
                id="keyCode"
                x="${width / 2}"
                y="${height / 4}"
                fill="#555"
                font-size="32"
                font-family="PressStart2P"
                text-anchor="middle"
                alignment-baseline="central"/>
        </svg>
    </svg>
    `, parent);

    const { buttons, labels } = Object.keys(ids)
        .reduce((acc, key) => {
            if (key.indexOf('label_') === 0) {
                return {
                    ...acc,
                    labels: {
                        ...acc.labels,
                        [key.replace('label_', '')]: ids[key]
                    }
                };
            }
            return {
                ...acc,
                buttons: {
                    ...acc.buttons,
                    [key]: ids[key]
                }
            };
        }, {labels: {}, buttons: {}});

    const baseTitle = 'CLICK ON A BUTTON TO CHANGE KEY BINDING';

    title().innerHTML = baseTitle;

    let selected;
    const selectedColor = '#ffaa00';

    const keydown = (event) => {
        if (selected) {
            controlsKeys = controlsKeys.map((control) => {
                if (control.name === selected) {
                    return {
                        ...control,
                        code: event.keyCode
                    };
                }
                return control;
            });
            try {
                localStorage.setItem(storeKey, JSON.stringify(controlsKeys));
            } catch(e) {
                // 
            }
            title().innerHTML = baseTitle;
            buttons[selected]({
                'stroke': 'none',
                'stroke-width': 0
            });
            labels[selected]().innerHTML = `${selected} -> key code: ${event.keyCode}`;
            selected = null;
        } else {
            keyCode().innerHTML = `key code: ${event.keyCode}`;
            const buttonName = controlsKeys
                .map(({ code, name }) => code === event.keyCode ? name : null)
                .filter(val => val)[0];
            if (buttonName) {
                buttons[buttonName]({
                    'stroke': '#aaff33',
                    'stroke-width': 4
                });
                labels[buttonName]({
                    'stroke': '#aaff33'
                });
            }
        }
    };

    const keyup  = () => {
        Object.keys(buttons)
            .filter((key) => key.indexOf('root') === -1)
            .forEach((key) => {
                buttons[key]({
                    'stroke': 'none',
                    'stroke-width': 0
                });
            });
        Object.keys(labels)
            .forEach((key) => {
                labels[key]({
                    'stroke': 'transparent'
                });
            });
        keyCode().innerHTML = '';
    };

    bg().onclick = () => {
        if (selected) {
            title().innerHTML = baseTitle;
            buttons[selected]({
                'stroke': 'none',
                'stroke-width': 0
            });
            labels[selected]({
                'stroke': 'transparent'
            });
            selected = null;
            keyCode().innerHTML = '';
        }
    };

    
    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);

    Object.keys(buttons)
        .filter((key) => key.indexOf('root') === -1)
        .forEach((key) => {
            const button = buttons[key]();
            button.onclick = () => {
                
                if (selected) return null;
                title().innerHTML = `TYPE ON THE KEYBOARD TO SET
                <tspan
                    fill="#000"
                    stroke="${selectedColor}"
                    alignment-baseline="central"
                    style="font-weight: bold;">${key.toUpperCase()}<tspan>`;
                selected = key;
                buttons[key]({
                    'stroke': selectedColor,
                    'stroke-width': 4
                });
                labels[selected]({
                    'stroke': selectedColor
                });
            };
        });

};

window.MapStationController = Controller;
