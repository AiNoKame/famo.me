define(function(require, exports, module) {
    var View          = require('famous/core/View');
    var Surface       = require('famous/core/Surface');
    var Transform     = require('famous/core/Transform');
    var EventHandler  = require('famous/core/EventHandler');
    
    var GridLayout    = require('views/GridLayoutCellSized');

    var sceneGrid = new GridLayout();

    function SceneGrid(properties) {
        View.apply(this, arguments);

        return _createGrid(properties);
    }

    SceneGrid.prototype = Object.create(View.prototype);
    SceneGrid.prototype.constructor = SceneGrid;

    SceneGrid.DEFAULT_OPTIONS = {};

    function _createGrid(properties) {
        // var cellSize = properties.cellSize || [properties.width / properties.dimensions[0], undefined];
        // var numCells;
        cellSize = properties.cellSize || undefined;

        var grid = new GridLayout({
                dimensions: properties.dimensions,
                cellSize: cellSize
            });

        grid.surfaces = [];
        grid.sequenceFrom(grid.surfaces);
        var cols = properties.width / properties.cellSize[0];
        var rows = properties.height / properties.cellSize[1];
        var cells = rows * cols;

        for(var i = 0; i < cells; i++) {
            var surface = new Surface({
              content: 'hi' + (i + 1),
              size: [undefined, undefined],
              properties: {
                backgroundColor: "rgba(0,0,0,.25)",
                backgroundBlendMode: "multiply",
                boxShadow: "inset 0 0 20px rgba(255, 192, 203, .125)",
                border: "1px dotted rgba(255, 192, 203, .5)",
                color: "#404040",
                textAlign: 'center'
              }
            });
            surface.on('mouseenter', function(e){
                this.setProperties({
                    backgroundColor: "rgba(255, 255, 255, .5)",
                    boxShadow: "inset 0 0 20px rgba(255, 192, 203, .125), 0 0 35px rgba(255, 255, 255, .5)",
                })
            });
            surface.on('mouseleave', function(e){
                this.setProperties({
                    backgroundColor: "rgba(0, 0, 0, .25)",
                    boxShadow: "inset 0 0 20px rgba(255, 192, 203, .125)"
                })
            });
            grid.surfaces.push(surface);
        }

        return grid;
    }

    module.exports = SceneGrid;
});
