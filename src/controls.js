/* copyright 2019, stefano bovio @allyoucanmap. */

const Controls = function(keys) {
    this._keys = { };
    this._press = { };
    window.addEventListener('keydown', this.keydown.bind(this));
    window.addEventListener('keyup', this.keyup.bind(this));
    this.setKeys(keys);
};

Controls.prototype.setKeys = function(keys) {
    this.keys = (keys || [
        { name: 'left', code: 65 },
        { name: 'right', code: 68 },
        { name: 'up', code: 87 },
        { name: 'down', code: 83 },
        { name: 'buttonA', code: 32 },
        { name: 'buttonB', code: 77 },
        { name: 'start', code: 13 },
        { name: 'select', code: 27}
    ]).reduce((acc, { name, code }) => {
        return {
            ...acc,
            [name]: (time = 100) => {
                if(this._keys[code]) {
                    if (!this._press[code]) {
                        this._press[code] = true;
                        setTimeout(() => {
                            this._press[code] = false;
                        }, time);
                        return true;
                    }
                }
                return false;
            }
        }
    }, {});
    return this;
};

Controls.prototype.keydown = function() {
    if (!this._keys[event.keyCode]) {
        this._keys[event.keyCode] = true;
    }
};

Controls.prototype.keyup = function() {
    if (this._keys[event.keyCode]) {
        this._keys[event.keyCode] = false;
    }
};

Controls.prototype.reset = function() {
    this._press = { };
};

export default Controls;
