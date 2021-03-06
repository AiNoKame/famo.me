/*             
 * , . ..           
 * ,      ://.//./.
 *
 * : @.
 * @  .
 * @  , . 
 */

define(function(require, exports, module) {
    var Transform      = require('famous/core/Transform');
    var EventHandler   = require('famous/core/EventHandler');
    var OptionsManager = require('famous/core/OptionsManager');

    var Transitionable = require('famous/transitions/Transitionable');

    var Utilities      = require('famous/math/Utilities');

    var GenericSync    = require('famous/inputs/GenericSync');
    var MouseSync      = require('famous/inputs/MouseSync');
    var TouchSync      = require('famous/inputs/TouchSync');
    GenericSync.register({'mouse': MouseSync, 'touch': TouchSync});

    /**
     * Makes added render nodes responsive to drag beahvior.
     *   Emits events 'start', 'update', 'end'.
     * @class Draginator
     * @constructor
     * @param {Object} [options] options configuration object.
     * @param {Number} [options.snapX] grid width for snapping during drag
     * @param {Number} [options.snapY] grid height for snapping during drag
     * @param {Array.Number} [options.xRange] maxmimum [negative, positive] x displacement from start of drag
     * @param {Array.Number} [options.yRange] maxmimum [negative, positive] y displacement from start of drag
     * @param {Number} [options.scale] one pixel of input motion translates to this many pixels of output drag motion
     * @param {Number} [options.projection] User should set to Draginator._direction.x or
     *    Draginator._direction.y to constrain to one axis.
     *
     */
    function Draginator(options) {
        this.options = Object.create(Draginator.DEFAULT_OPTIONS);
        this._optionsManager = new OptionsManager(this.options);
        if (options) this.setOptions(options);

        this._positionState = new Transitionable([0,0]);
        this._differential  = [0,0];
        this._active = true;
        this._selected = false;
        this.snapped = true;

        this.sync = new GenericSync(['mouse', 'touch'], {scale : this.options.scale});
        this.eventOutput = new EventHandler();
        EventHandler.setInputHandler(this,  this.sync);
        EventHandler.setOutputHandler(this, this.eventOutput);

        _bindEvents.call(this);
    }


    //binary representation of directions for bitwise operations
    var _direction = {
        x : 0x01,         //001
        y : 0x02          //010
    };

    Draginator.DIRECTION_X = _direction.x;
    Draginator.DIRECTION_Y = _direction.y;

    var _clamp = Utilities.clamp;

    Draginator.DEFAULT_OPTIONS = {
        projection  : _direction.x | _direction.y,
        scale       : 1,
        xRange      : null,
        yRange      : null,
        snapX       : 60,
        snapY       : 60,
        minSnapX    : 1,
        minSnapY    : 1,
        maxSnapX    : 60,
        maxSnapY    : 60,
        transition  : {duration : 500}
    };

    function _mapDifferential(differential) {
        var opts        = this.options;
        var projection  = opts.projection;
        var snapX       = opts.snapX;
        var snapY       = opts.snapY;

        //axes
        var tx = (projection & _direction.x) ? differential[0] : 0;
        var ty = (projection & _direction.y) ? differential[1] : 0;

        //snapping
        if (snapX > 0) tx -= tx % snapX;
        if (snapY > 0) ty -= ty % snapY;

        return [tx, ty];
    }

    function _handleStart() {
        if (!this._active) return;
        if (this._positionState.isActive()) this._positionState.halt();
        this.eventOutput.emit('start', {position : this.getPosition()});
    }

    function _deleteElement(event) {
        this.eventOutput.emit('delete');
    }

    function _createElement() {
        this.eventOutput.emit('create');
    }

    function _switchElement() {
        this.eventOutput.emit('switch');
    }

    function _generateJSON() {
        this.eventOutput.emit('generate');
    }

    function _deselectAll() {
        this.eventOutput.emit('deselect');
    }

    function _editPropertiesOfSelected() {
        this.eventOutput.emit('editPropertiesOfSelected');
    }

    function _toggleSnapToGrid() {
        var currentPosition = this.getPosition();
        var newPosition = [];
        var snap = {
            minX: this.options.minSnapX,
            minY: this.options.minSnapY,
            maxX: this.options.maxSnapX,
            maxY: this.options.maxSnapY
        }

        if (!this.snapped) {
            this.snapped = true;

            newPosition[0] = Math.round(currentPosition[0] / this.options.maxSnapX) * this.options.maxSnapX;
            newPosition[1] = Math.round(currentPosition[1] / this.options.maxSnapY) * this.options.maxSnapY;
            this.setPosition(newPosition);
            this.eventOutput.emit('translate', newPosition);
            this.options.snapX = snap.maxX;
            this.options.snapY = snap.maxY;
        } else {
            this.snapped = false;
            this.options.snapX = snap.minX;
            this.options.snapY = snap.minY;
        }
    }

    function _handleMove(event) {
        if (!this._active) return;

        var options = this.options;
        if (event.keyIdentifier) {
            this.keybinding = true;
            var keyMatrix = {
                Up: [0, -this.options.snapY],
                Down: [0, this.options.snapY],
                Left: [-this.options.snapX, 0],
                Right: [this.options.snapX, 0]
            };
            var shiftKeyMatrix = {
                Up: [0, -this.options.snapY * 25],
                Down: [0, this.options.snapY * 25],
                Left: [-this.options.snapX * 25, 0],
                Right: [this.options.snapX * 25, 0]
            }

            var commandMatrix = {
                'U+0008': _deleteElement.bind(this), // delete
                'U+004E': _createElement.bind(this), // 'n'
                'U+0009': _switchElement.bind(this), // tab
                'U+001B': _deselectAll.bind(this), // escape
                'U+0045': _editPropertiesOfSelected.bind(this), // 'e'
                'U+0020': _toggleSnapToGrid.bind(this), // space bar
                Enter: _generateJSON.bind(this)
            };

            if (commandMatrix[event.keyIdentifier]) {
                commandMatrix[event.keyIdentifier](event, this);
            }

            if (keyMatrix[event.keyIdentifier]) {
                if (event.shiftKey) {
                    if (event.metaKey) {
                        this.dragging = true;
                    } else {
                        this.dragging = false;
                    }
                    this._differential = shiftKeyMatrix[event.keyIdentifier];
                } else {
                    if (event.metaKey) {
                        this.dragging = true;
                    } else {
                        this.dragging = false;
                    }
                    this._differential = keyMatrix[event.keyIdentifier];
                }
            } else return;
        } else {
            this.keybinding = false;
            this._differential = event.position;
        }

        var newDifferential = _mapDifferential.call(this, this._differential);

        //buffer the differential if snapping is set
        this._differential[0] -= newDifferential[0];
        this._differential[1] -= newDifferential[1];

        var pos = this.getPosition();
        var originalPos = pos.slice();

        //pipe that
        if (this.dragging) {
            this.eventOutput.emit('resize', newDifferential);
        } else {
            //modify position, retain reference
            pos[0] += newDifferential[0];
            pos[1] += newDifferential[1];

            //handle bounding box
            if (options.xRange){
                pos[0] = _clamp(pos[0], options.xRange);
            }

            if (options.yRange){
                pos[1] = _clamp(pos[1], options.yRange);
            }

            if (pos[0] !== originalPos[0] || pos[1] !== originalPos[1]) {
                this.eventOutput.emit('translate', pos);
            }
            this.eventOutput.emit('update', {position : pos});
        }
    }

    function _handleEnd() {
        if (!this._active) return;
        this.dragging = false;
        this.eventOutput.emit('end', {position : this.getPosition()});
    }

    function _bindEvents() {
        this.sync.on('start', _handleStart.bind(this));
        this.sync.on('update', _handleMove.bind(this));
        this.sync.on('end', _handleEnd.bind(this));
    }

    /**
     * Set internal options, overriding any default options
     *
     * @method setOptions
     *
     * @param {Object} [options] overrides of default options.  See constructor.
     */
    Draginator.prototype.setOptions = function setOptions(options) {
        return this._optionsManager.setOptions(options);
    };

    /**
     * Get current delta in position from where this draginator started.
     *
     * @method getPosition
     *
     * @return {array<number>} [x, y] position delta from start.
     */
    Draginator.prototype.getPosition = function getPosition() {
        return this._positionState.get();
    };

    /**
     * Transition the element to the desired relative position via provided transition.
     *  For example, calling this with [0,0] will not change the position.
     *  Callback will be executed on completion.
     *
     * @method setRelativePosition
     *
     * @param {array<number>} position end state to which we interpolate
     * @param {transition} transition transition object specifying how object moves to new position
     * @param {function} callback zero-argument function to call on observed completion
     */
    Draginator.prototype.setRelativePosition = function setRelativePosition(position, transition, callback) {
        var currPos = this.getPosition();
        var relativePosition = [currPos[0] + position[0], currPos[1] + position[1]];

        this.setPosition(relativePosition, transition, callback);
    };

    /**
     * Transition the element to the desired absolute position via provided transition.
     *  Callback will be executed on completion.
     *
     * @method setPosition
     *
     * @param {array<number>} position end state to which we interpolate
     * @param {transition} transition transition object specifying how object moves to new position
     * @param {function} callback zero-argument function to call on observed completion
     */
    Draginator.prototype.setPosition = function setPosition(position, transition, callback) {
        if (this._positionState.isActive()) this._positionState.halt();
        this._positionState.set(position, transition, callback);
    };

    /**
     * Set this draginator to respond to user input for the particular types of actions passed.
     *
     * @method activate
     */
    Draginator.prototype.activate = function activate(type) {
        this._active = true;
    };

    /**
     * Set this draginator to ignore user input.
     *
     * @method deactivate
     */
    Draginator.prototype.deactivate = function deactivate() {
        this._active = false;
    };

    /**
     * Return render spec for this Modifier, applying to the provided
     *    target component.  This is similar to render() for Surfaces.
     *
     * @private
     * @method modify
     *
     * @param {Object} target (already rendered) render spec to
     *    which to apply the transform.
     * @return {Object} render spec for this Modifier, including the
     *    provided target
     */
    Draginator.prototype.modify = function modify(target) {
        var pos = this.getPosition();
        var transform;

        if (this._active)
            transform = Transform.translate(pos[0], pos[1]);
        else
            return false;

        return {
            transform: transform,
            target: target
        };
    };

    Draginator.prototype.startDragging = function startDragging() {
        this.dragging = true;
    }

    Draginator.prototype.select = function select() {
        this._selected = true;

        // there can only be one active window.onkeydown function available at a time
        window.onkeydown = function(event) {
            if (event.metaKey && event.keyIdentifier === 'Left' // browser back
                || event.metaKey && event.keyIdentifier === 'Right') { // browser forward
                event.preventDefault();
            }

            if ((!event.metaKey && event.keyIdentifier !== 'U+0052') // refresh
                || (!event.metaKey && !event.altKey && event.keyIdentifier !== 'U+004A')) { // dev console
                event.preventDefault();
            }
            return _handleMove.call(this, event);
        }.bind(this);
    }

    Draginator.prototype.deselect = function deselect() {
        this._selected = false;
    }

    module.exports = Draginator;
});
