define(function(require, exports, module) {
    var View          = require('famous/core/View');
    var Surface       = require('famous/core/Surface');
    var Transform     = require('famous/core/Transform');
    var StateModifier = require('famous/modifiers/StateModifier');
    var EventHandler  = require('famous/core/EventHandler');
    var Draginator    = require('Draginator');
    var JSONifier     = require('utils/JSONifier');
    
    // layout tracker
    var numLayouts = 0;
    var layouts = {};

    function LayoutView() {
        View.apply(this, arguments);
        
        numLayouts++;
        this.id = 'LayoutView'+numLayouts;
        this.xOffset = 0;
        this.yOffset = 0;
        this.width = this.options.size;
        this.height = this.options.size;
        
        _createLayoutDraginator.call(this);
        _createLayoutModifier.call(this);
        _createLayoutSurface.call(this);
        
        _setListeners.call(this);
        
        this.add(this.draginator).add(this.modifier).add(this.surface);
    }

    LayoutView.prototype = Object.create(View.prototype);
    LayoutView.prototype.constructor = LayoutView;
    LayoutView.prototype.getId = function() {
        return this.id;
    };
    LayoutView.prototype.getOffset = function() {
        return [this.xOffset, this.yOffset];
    };
    LayoutView.prototype.getSize = function() {
        return [this.width, this.height];  
    };

    LayoutView.DEFAULT_OPTIONS = {
        snapX: 100,
        snapY: 100,
        offset: [0, 0],
        dimension: [1, 1],
        color: 'pink',
        size: 100,
        edgeDetectSize: 20
    };
    
    function _createLayoutDraginator() {
        this.draginator = new Draginator({
          snapX: this.options.snapX,
          snapY: this.options.snapY
        });
    }
    
    function _createLayoutModifier() {
        this.modifier = new StateModifier({
            size: [this.options.size, this.options.size]
        });
    }

    function _createLayoutSurface() {
        this.surface = new Surface({
            properties: {
                border: '0px solid purple',
                backgroundColor: this.options.color,
                cursor: '-webkit-grab'
            }
        });
    }

    function _setEdges(event) {
        this.surface.setProperties({mouseInside: true});
        var edge = '';

        var edges = {
          'n' : { cursor: 'ns-resize' },
          'nw': { cursor: 'nwse-resize' },
          'w' : { cursor: 'ew-resize' },
          'sw': { cursor: 'nesw-resize' },
          's' : { cursor: 'ns-resize' },
          'se': { cursor: 'nwse-resize' },
          'e' : { cursor: 'ew-resize' },
          'ne': { cursor: 'nesw-resize' },
          ''  : { cursor: '-webkit-grab' }
        };

        if (event.offsetY < this.options.edgeDetectSize)
            edge = 'n';
        if (this.options.snapY * this.options.dimension[1] - event.offsetY < this.options.edgeDetectSize)
            edge = 's';
        if (event.offsetX < this.options.edgeDetectSize)
            edge += 'w';
        if (this.options.snapY * this.options.dimension[0] - event.offsetX < this.options.edgeDetectSize)
            edge += 'e';
            
        this.draggable = edge === '';

        if (edges[edge] && !this.dragging)
            this.surface.setProperties(edges[edge]);
    };

    function _removeEdges(event) {
        this.surface.setProperties({cursor: '-webkit-grab'});
        if (this.surface.properties.mouseInside && !this.surface.properties.grabbed)
            this.surface.setProperties({mouseInside: false});
    };

    function _grab(event) {
        this.dragging = true;
        if (this.draggable)
            this.surface.setProperties({cursor: '-webkit-grabbing'});
    };

    function _ungrab(event) {
        this.dragging = false;
        if (this.draggable)
            this.surface.setProperties({cursor: '-webkit-grab'});

    };

    function _setListeners() {
        // initialize eventing linkages
        this.modifier.eventHandler = new EventHandler();
        this.modifier.eventHandler.pipe(this._eventInput);
        this.draginator.eventOutput.pipe(this._eventInput);
        this.surface.pipe(this);
        this._eventInput.pipe(this.draginator);

        // view listens for translate from draggable
        this._eventInput.on('translate', function(data){
            this.xOffset += data[0];
            this.yOffset += data[1];
        }.bind(this));

        this._eventInput.on('mousemove', _setEdges.bind(this));
        this._eventInput.on('mouseleave', _removeEdges.bind(this));
        this.draginator.eventOutput.on('start', _grab.bind(this));
        this.draginator.eventOutput.on('update', _grab.bind(this));
        this.draginator.eventOutput.on('end', _ungrab.bind(this));

        // view listens for resize from draggable
        this._eventInput.on('resize', function(data) {
            console.log('resize')
        }.bind(this));


        this.surface.on('dblclick', function() {
            console.log(JSONifier.JSONify(this).id);
            console.log('layout view offset', JSONifier.JSONify(this).offset);
            console.log('layout view size', JSONifier.JSONify(this).size);
        }.bind(this));
    }

    module.exports = LayoutView;
});
