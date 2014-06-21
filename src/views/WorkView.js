define(function(require, exports, module) {
    var View          = require('famous/core/View');
    var Surface       = require('famous/core/Surface');
    var Transform     = require('famous/core/Transform');
    var EventHandler  = require('famous/core/EventHandler');
    var ModifierChain = require('famous/modifiers/ModifierChain');
    var StateModifier = require('famous/modifiers/StateModifier');
    var Draginator    = require('Draginator');
    var BasicLayout   = require('utils/BasicLayout');
    var LayoutView    = require('views/LayoutView');
    var RenderController = require('famous/views/RenderController');

    var SceneGrid = require('views/SceneGrid');

    function WorkView() {
        View.apply(this, arguments);
        this.numLayouts = 0;
        this.layouts = {};
        this.currentView = null;

        _createGrid.call(this);

        // this.renderController = new RenderController();
        // this.add(this.renderController);

        BasicLayout.createContent.call(this);

        window.onkeydown = function(event) {
            if (event.keyIdentifier === 'U+004E') {
                this.createLayoutView();
            };
        }.bind(this);

        this._eventInput.on('createNewLayout', function() {
            console.log('creating a new layout');
            console.log(this);
            this.createLayoutView();
        }.bind(this));

        this._eventInput.on('deselectRest', function() {
            this._eventOutput.emit('deselect');
        }.bind(this));
    }

    WorkView.prototype = Object.create(View.prototype);
    WorkView.prototype.constructor = WorkView;
    WorkView.prototype.toggleHeader = function() {
        this.header = !this.header;
        this.createHeaderFooter();
    };

    WorkView.prototype.toggleFooter = function() {
        this.footer = !this.footer;
        this.createHeaderFooter();
    };

    WorkView.prototype.createHeaderFooter = function() {
        BasicLayout.render.call(this);
    };

    WorkView.prototype.createLayoutView = function() {
        this.numLayouts++;

        var layoutView = new LayoutView(this.currentView);
        layoutView.linkTo(this.layouts, this.numLayouts);
        layoutView.addLayout();

        this.grid.surfaces.unshift(layoutView);

        this._eventOutput.pipe(layoutView._eventInput);
        layoutView._eventOutput.pipe(this._eventInput);

        this._eventOutput.emit('deselect');
        this._eventOutput.emit('select', layoutView);
    };

    WorkView.prototype.getLayouts = function() {
        return this.layouts;
    };

    WorkView.DEFAULT_OPTIONS = {
        grid: {
            width: 960,
            height: 600,
            dimensions: [6, 4],
            cellSize: [192, 240]
        }
    };

    function _createGrid() {
        this.grid = new SceneGrid(this.options.grid);
        this.gridModifier = new StateModifier({
            origin: [0.5, 0.5],
            align: [0.5, 0.5],
            size: [this.options.grid.width, this.options.grid.height]
        });
        this.gridNode = this.add(this.gridModifier).add(this.grid);
    }

    module.exports = WorkView;
});
