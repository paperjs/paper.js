/**
 *  Imports svg into items with groups
 *  Stetson Alpha - Paper.js
 *
 */

var ImportSVG = this.ImportSVG = Base.extend({
{
    //initialize
    initialize: function()
    {

    },

    /**
     *
     * Takes the svg dom obj and parses the data
     * to create a layer with groups (if needed) with
     * items inside. Should support nested groups.
     *
     * takes in a svg object (xml dom)
     * returns Paper.js Layer
     */
    importSVG: function(svg)
    {
        //TODO: return layer;
    },

    /**
     * Creates a Paper.js Group by parsing
     * a specific svg g node
     *
     * takes in a svg object (xml dom)
     * returns Paper.js Group
     */
    importGroup: function(svg)
    {
        //TODO: return group;
    },

    /**
     * Creates a Paper.js Path by parsing
     * a specific svg node (rect, path, circle, polygon, etc)
     * and creating the right path object based on the svg type.
     *
     * takes in a svg object (xml dom)
     * returns Paper.js Group
     */
    importPath: function(svg)
    {
        //TODO: return path;
    }
});