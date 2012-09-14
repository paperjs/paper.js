/**
 *  Exports items, layers or whole projects as a svg
 *  Stetson Alpha - Paper.js
 *  
 *  var NS="http://www.w3.org/2000/svg";
 *  var svg=document.createElementNS(NS,"svg");
 */


var ExportSVG = function()
{
	var svgObj = null; // xml dom object (svg typed)
	
	//initialize the svgObj and what ever else.
	function initialize()
	{
		
	};
	
	/**
	 * 
	 * Takes the whole project and parses
	 * all the layers to be put into svg groups and 
	 * groups into svg groups making all the projects 
	 * items into one svg.
	 * 
	 * takes in a Paper.js Project
	 * returns svg object (xml dom)
	 */
    this.exportProject = function(project)
    {
    	return svgObj;
    };
	
    
	/**
	 * 
	 * Takes the layer and then parses all groups
	 * and items into one svg
	 * 
	 * takes in a Paper.js Layer
	 * returns svg object (xml dom)
	 */
    this.exportLayer = function(layer)
    {
    	return svgObj;
    };
	
    
	/**
	 * 
	 * Takes the group and puts it's items 
	 * in a svg file.
	 * 
	 * takes in a Paper.js Group
	 * returns svg object (xml dom)
	 */
    this.exportGroup = function(group)
    {
    	return svgObj;
    };
	
	/**
	 * 
	 * Takes the item and puts it in
	 * a svg file.
	 * 
	 * takes in a Paper.js Item
	 * returns svg object (xml dom)
	 */
    this.exportItem = function(item)
    {
    	return svgObj;
    };
    
	/**
	 * 
	 * Takes the path and puts it in
	 * a svg file.
	 * 
	 * takes in a Paper.js Path
	 * returns svg object (xml dom)
	 */
    this.exportPath = function(path)
    {
    	return svgObj;
    };

    initialize(); // calls the init function after class is loaded
};