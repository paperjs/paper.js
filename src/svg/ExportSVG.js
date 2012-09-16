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
	//var blarg = this;
	
	//initialize the svgObj and what ever else.
	/*function initialize()
	{
		var NS = "http://www.w3.org/2000/svg";
		svgObj = document.createElementNS(NS,"svg");
		
		console.log(svgObj);

	};*/
	
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
    	//this.initialize();
    	//console.log(blarg.svgObj);
	var NS = "http://www.w3.org/2000/svg";
	svgObj = document.createElementNS(NS,"svg");
	svgRect = document.createElementNS(NS,"rect");
	svgRect.height.baseVal.value = 50;
	svgRect.width.baseVal.value = 60;
	svgRect.x.baseVal.value = 50;
	svgObj.appendChild(svgRect);

	svgPoint = document.createElementNS(NS,"point");
	svgPoint.setAttribute("x",50);
	svgPoint.setAttribute("y",100);
	svgObj.appendChild(svgPoint);

	svgPath = document.createElementNS(NS, "path");
		
    	console.log(svgObj);
	var pathClone = path.clone();
	var segArray = pathClone.getSegments();

	var pointArray = new Array();
	for(i = 0; i < segArray.length; i++)
	{		
		pointArray[i] = segArray[i].getPoint();
	}
	var pointString = "";
	for(i = 0; i < pointArray.length; i++)
	{
		var x = pointArray[i].getX();
		x = x - (x % 1);
		var y = pointArray[i].getY();
		y = y - (y % 1);
		if(i === 0)
		{
			pointString+= "M " + x + " " + y + " ";
		}
		else
		{
			pointString+= "L " + x + " " + y + " ";
		}
	}
	if(pathClone.getClosed())
	{
		pointString += "z";
	}
	
	var strokeRed = RGBconverter(pathClone.strokeColor.red);
	var strokeGreen = RGBconverter(pathClone.strokeColor.green);
	var strokeBlue = RGBconverter(pathClone.strokeColor.blue);
	var strokeRGB = "#" + strokeRed + strokeGreen + strokeBlue;
	
	var fillRed = RGBconverter(pathClone.fillColor.red);
	var fillGreen = RGBconverter(pathClone.fillColor.green);
	var fillBlue = RGBconverter(pathClone.fillColor.blue);
	var fillRGB = "#" + fillRed + fillGreen + fillBlue;

	svgPath.setAttribute("d", pointString);
	svgPath.setAttribute("stroke", strokeRGB);
	svgPath.setAttribute("fill", fillRGB);
	svgPath.setAttribute("stroke-width",pathClone.strokeWidth);
	svgObj.appendChild(svgPath);i

	console.log(svgObj);
	return svgObj;
    };

    function RGBconverter(deciColor)
    {
	var decColor = Math.round(deciColor * 255);
	var hexColor = decColor.toString(16);
	hexColor = hexColor.length > 1? hexColor : "0" + hexColor;
	return hexColor;
    };

    //initialize(); // calls the init function after class is loaded
};
