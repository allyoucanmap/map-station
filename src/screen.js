/* copyright 2019, stefano bovio @allyoucanmap. */

import {
    template
} from './utils';

const Screen = function(
    parent,
    init = () => {},
    visible
) {
    const { group } = template(`<g id="group"></g>`, parent);
    this.init = () => {
        this.update = init(group) || function() {};
    };
    if (visible) this.init();
    this.remove = () => {
        group().innerHTML = '';
        this.update = () => {};
    }
    Screen.items.push(this);
};

Screen.items = [];
Screen.update = () => Screen.items.forEach((item) => item.update && item.update());

export default Screen;
