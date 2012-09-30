/**
 *  Imports svg into items with groups
 *  Stetson Alpha - Paper.js
 *  
 */

var ImportSVG = function()
{
	//initialize
	function initialize()
	{
		
	};
	
	/**
	 * 
	 * Takes the svg dom obj and parses the data
	 * to create a layer with groups (if needed) with
	 * items inside. Should support nested groups.
	 * 
	 * takes in a svg object (xml dom)
	 * returns Paper.js Layer 
	 */
    this.importSVG = function(svg)
    {
    	return layer;
    };
	
	/**
	 * Creates a Paper.js Group by parsing
	 * a specific svg g node
	 * 
	 * takes in a svg object (xml dom)
	 * returns Paper.js Group
	 */
    function importGroup(svg)
    {
    	return group;
    };
    
	/**
	 * Creates a Paper.js Path by parsing
	 * a specific svg node (rect, path, circle, polygon, etc)
	 * and creating the right path object based on the svg type.
	 * 
	 * takes in a svg object (xml dom)
	 * returns Paper.js Group
	 */
    function importPath(svg)
    {
    	return path;
    };
	
    initialize(); // calls the init function after class is loaded
};