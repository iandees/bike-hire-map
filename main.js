//////// CONSTANTS ///////////

var GGL_PREFIX = "http://chart.apis.google.com/chart?cht=lc:nda&chs=300x135&chts=ffffff&chg=8.333333,0&chxt=x,r&chxl=0:|24h|20h|16h|12h|8h|4h|now";
var DOW_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
var BIKES_USED_PC_LIST = [0.5, 1.0, 2.0, 4.0, 6.0, 9.0, 12.0, 15.0];
var BIKES_USED_24H_PC_LIST = [-12.0, -9.0, -6.0, -3.0, 3.0, 6.0, 9.0, 12.0];
var UNBALANCED_PC_LIST = [0.18, 0.21, 0.24, 0.27, 0.30, 0.33, 0.36, 0.39];
		
var EPSG4326 = new OpenLayers.Projection("EPSG:4326");
var EPSG900913 = new OpenLayers.Projection("EPSG:900913");

var bd = 20037508.34;
var timeTillNext = 120; 
var pollIntervalMs = 120000; //Normally 120000.

//////// VARIABLES /////////

var currTime = 0;
var currTimePos = 1; //At position 0 is the TFL ID.
var totalBikes = 0
var animPause = 10;
var totalBikes = 0;
var colourThemeID = 0;
var stop = false;
var matrixLoaded = false;

//////// OBJECTS //////////

var map;
var features;
var currentSelectedFeature;
var selectControl;
var mintime;
var maxtime;
var dstflag;
var matrix;
var req;
var req2;
var req3;

var tickerItems = new Array();

var context = function(feature)
{
	return feature;
}

var colours = new Array(); 
//(["Graph name", ['Graph colour', 'full highlight', 'empty highlight', 'locked highlight'], ['9 colour ramp empty to full'], [rgb full], [rgb empty], [rgb mid], circle area variation attribute]);
colours.push(["Blue to Red", ['FF00FF', 'FFFF00', '00FFFF', 'FF0000'], ['0000FF', '2200DD', '220088', '220044', '220022', '440022', '880022', 'DD0022', 'FF0000'], [1, 0, 0], [0, 0, 1], [0, 0, 0], 0]);
colours.push(["Fiery", ['FFAA00', '770000', '999922', 'FF0000'], ['EE8800', 'CC7700', '885500', '553300', '221100', '550000', '880000', 'CC0000', 'FF0000'], [1, 0, 0], [0.9, 1, 0], [0, 0, 0], 0]);
colours.push(["Spectral", ['FF0000', 'AA0000', '0000AA', 'FF0000'], ['000000', '220000', '440000', '660000', '880000', 'AA0000', 'CC0000', 'EE0000', 'FF0000'], [1, -0.1, 0.1], [-1, 0, 1], [1, 1, -1], 0]);
colours.push(["Boris Blue", ['3366FF', '0000FF', '666666', 'FF0000'], ['444444', '333333', '222222', '111111', '000000', '001166', '002299', '0033CC', '0044FF'], [0, 0.2, 1], [1, 1, 1], [0, 0.1, 0], 0]);
colours.push(["CASA Purple", ['FF00FF', '000000', 'A030A0', 'FF0000'], ['110011', '220022', '330033', '440044', '550055', '660066', '770077', '880088', '990099'], [0.6, 0.2, 0.6], [0.6, 0.2, 0.6], [0, 0, 0], 1]);
colours.push(["Bike Finder", ['FF0000', '880000', '000044', 'FF0000'], ['110000', '330000', '550000', '770000', '880000', '990000', 'BB0000', 'DD0000', 'FF0000'], [1, 0, 0], [0, 0, 0.5], [0, 0, 0], 1]);
colours.push(["Space Finder", ['00FF00', '000000', '008800', 'FF0000'], ['000000', '002200', '004400', '006600', '008800', '009900', '00BB00', '00DD00', '00FF00'], [0, 0, 0], [0, 1, 0], [0, 0, 0], 2]);

// IE treats strokeWidth 0.1 as 1, Firefox as 0. 
// Ideally would be 0, However, needs to be >0 to stop IE display quirk.
var styleMap = new OpenLayers.StyleMap({
	"default": new OpenLayers.Style({
		pointRadius: "${radius}", 
		fillColor: "${fillColor}", 
		fillOpacity: "${fillOpacity}", 
		strokeColor: "${strokeColor}", 
		strokeWidth: "${strokeWidth}",
		label: "${label}",
      		fontSize: "${fontSize}"}),
	 "select": new OpenLayers.Style({
		strokeColor: "#000000", 
		strokeOpacity: 1.0, 
		strokeWidth: 4})}
);
			
var lookupCore = {};

styleMap.addUniqueValueRules("default", "core", lookupCore, context);
styleMap.addUniqueValueRules("select", "core", lookupCore, context);

var layerStations = new OpenLayers.Layer.Vector("Stations", { styleMap: styleMap });

OpenLayers.Util.onImageLoadError = function() 
{
	this.src = "images/404.png";
};

/////// INITIAL SETUP ////////

function init() 
{	
	initiateMap();
	initiateTicker();
    	initiateFeatures();
	updateFeatures(); 
	postUpdateFeatures();

    	layerStations.events.on({
		"featureselected": function(e) {
			document.getElementById('infoboxtop').innerHTML = "<h3>" + e.feature.name + "</h3>";
			if (currentSelectedFeature != null)
			{
				selectControl.unselect(currentSelectedFeature);
				currentSelectedFeature == null;				
			}
			currentSelectedFeature = e.feature;
			requestSingleGraph();
		},
		"featureunselected": function(e) {			
			currentSelectedFeature = null;
			requestSingleGraph();
		}
	});

	selectControl = new OpenLayers.Control.SelectFeature([layerStations], { });
	map.addControl(selectControl);
	selectControl.activate();
		
	setTimeout('requestLatestData()', pollIntervalMs);
	setTimeout('decrementTimeTillNext()', 1000);
}

function initHistoric() 
{	
	colourThemeID = 5;
	initiateMap();
    	initiateFeatures();
	updateFeatures();
	stopAnim();
}

function initiateMap()
{
	for (var i = 0; i < colours.length; i++)
	{
		var option = new Option(colours[i][0], i);
		if (colourThemeID == i)
		{
			option.defaultSelected = true;
		}
		document.getElementById('theme').options[i] = option;
	}

    	map = new OpenLayers.Map ("map", 
    	{
        	controls:[
            		new OpenLayers.Control.Navigation(),
            		new OpenLayers.Control.PanZoomBar(),
	        	new OpenLayers.Control.MouseDefaults(),
			//new OpenLayers.Control.MobileDragPan(),
	            	//new OpenLayers.Control.MobileZoom(),
	        	new OpenLayers.Control.KeyboardDefaults()],
	        maxExtent: new OpenLayers.Bounds(-1*bd, -1*bd, bd, bd),
		//restrictedExtent: new OpenLayers.Bounds(-2500000, 5500000, 2000000, 9900000),
	        maxResolution: 156543.0399,
	        units: 'm',
	        projection: EPSG900913,
	        displayProjection: EPSG4326
    	});
	  
    	layerSV = new OpenLayers.Layer.OSM("", "../tiles/tiles_zone1grey/${z}/${x}/${y}.png", 
	{  
	    type: "png",
   	    numZoomLevels: 17
	});

    	map.addLayer(layerSV);
	map.addLayer(layerStations);

	if (map.getZoom() == 0)
	{
		if (isIE)
		{
			//We do this because IE basically melts down (VML rendering time) if over ~100 circles.
			map.setCenter(new OpenLayers.LonLat(-0.13, 51.513).transform(EPSG4326, EPSG900913), 15);
		}
		else
		{
			map.setCenter(new OpenLayers.LonLat(-0.13, 51.513).transform(EPSG4326, EPSG900913), 13);
		}
	}

    	map.events.register("zoomend", null, updateFeatureCartography);
}

//Features are not actually added here - this is done later, on a timer, once the cartography is set up.
function initiateFeatures()
{
	features = new Array();
	for (i in stations)
        {
                var stationLL = new OpenLayers.LonLat(stations[i][4], stations[i][3]).transform(EPSG4326, EPSG900913);
                var stationPoint = new OpenLayers.Geometry.Point(stationLL.lon, stationLL.lat);
                var feature = new OpenLayers.Feature.Vector(stationPoint);
                feature.tflid = stations[i][0];
      		var nameCleaned = stations[i][2].replace(/\s*$/, '').replace(/\s\,/, '\,');
	        feature.name = nameCleaned;
                feature.available = stations[i][8] == "false" && stations[i][7] == "true";
		feature.locked = stations[i][8];
                features.push(feature);
        }
}

/////// AJAX REQUESTS ////////

function requestLatestData()
{
	if (req) { }
	else
	{
		setTimeout("setStatusObtaining();", 1);
		getReqObject();
		req.onreadystatechange = handleLatestData;
		//req.overrideMimeType('text/plain');
		req.open("GET", "loadlatest.php", true);
		req.send(null)
	}
	setTimeout('requestLatestData()', pollIntervalMs); 
}

function requestSingleGraph()
{	
	if (currentSelectedFeature != null && currentSelectedFeature.metric >= 0)
	{
		var html = "";
		html += "Bikes: " + currentSelectedFeature.bikes + "<br />";
		html += "Spaces: " + currentSelectedFeature.spaces + "<br />";
	
		if (currentSelectedFeature.locked === "true")
		{
 			html += "<div style='background-color:#a22;border:1px solid red;'><strong>This station is locked.</strong><br />";
			html += "<span style='font-size:xx-small;'>Locked stations temporarily block rentals but allow returns.</span><br /></div>";
		}

		document.getElementById('infobox').style.display = "block";
		document.getElementById('infoboxbottom').innerHTML = html;
		document.getElementById('infoboxgraph').innerHTML = "<div style='height: 135px'>Loading data...</div>";								

		getReqObject2();
		req2.onreadystatechange = handleSingleGraph;
		//req2.overrideMimeType('text/plain');
		req2.open("GET", "loadgraphavail.php?tfl_id=" + currentSelectedFeature.tflid, true);
		req2.send(null)
	} 	
	else
	{
		document.getElementById('infobox').style.display = "none";
	}
}

function requestLatestOverallGraphs()
{
	if (req3) { }
	else
	{
		document.getElementById('overallgraph').innerHTML = "<div style='height: 135px'>Loading data...</div>";								
		getReqObject3();
		req3.onreadystatechange = handleLatestOverallGraphs;
		req3.open("GET", "loadgraphavail.php", true);
		req3.send(null)
	}
}

function requestHistoricData()
{
	if (req) { }
	else
	{
		//document.getElementById('loadPanel').style.display = 'block';
		getReqObject();
		req.onreadystatechange = handleHistoricData;
		req.open("GET", "historic.csv", true);
		req.send(null)
	}
}

/////// AJAX RESPONSE HANDLERS ////////

function handleLatestData()
{
	if (req.readyState != 4)
	{
		return;
	}
	if (req.status == 200)
	{
		stationsText = req.responseText;
		stations = eval('(' + stationsText + ')');
		setStatusRedrawing();
		updateFeatures();
		postUpdateFeatures();
	}
	req = null;
}

function handleSingleGraph()
{
	if (req2.readyState != 4)
	{
		return;
	}
	if (req2.status == 200)
	{
		var dataText = req2.responseText;
		var data = eval('(' + dataText + ')');
		var lastVal = data['bikes_available'].length - 1;
		var maxVal = data['bikes_available'][lastVal] + data['spaces_available'][lastVal];
		var dataCoded = simpleEncode(data['bikes_available'], maxVal)
		var ggString = GGL_PREFIX + "&chtt=Bikes+in+Dock+(last+24h)&chxr=0,-24,0,4|1,0," + maxVal + "," + maxVal + "&chco=" + colours[colourThemeID][1][0] + "&chf=bg,s,00000000&chd=" + dataCoded;
		document.getElementById('infoboxgraph').innerHTML = "<div style='width: 300px;'><img src='" + ggString + "' style='width: 300px; height: 135px;' alt='Loading graph...'><br />" 
			+ "</div>";
		//document.getElementById('infoboxgraph').innerHTML = req2.responseText;
	}
}

function handleHistoricData()
{
	if (req.readyState != 4)
	{
		return;
	}
	if (req.status == 200)
	{
		var data = req.responseText.split("\n");
		// matrix = eval('(' + data + ')');
		var metadata = data[0].split(",");
		mintime = parseInt(metadata[0]);
		maxtime = parseInt(metadata[1]);
		dstflag = parseInt(metadata[2]);
		currTime = mintime;
	
		matrix = new Array();
		for (var i = 1; i < data.length; i++)
		{
			var rowdata = data[i].split(",");
			matrix[rowdata[0]] = rowdata;
		}
		matrixLoaded = true;

		//document.getElementById('loadPanel').style.display = 'none';
		startAnim();
	}
	req = null;
}

function handleLatestOverallGraphs()
{
	if (req3.readyState != 4)
	{
		return;
	}
	if (req3.status == 200)
	{
		var dataText = req3.responseText;
		var data = eval('(' + dataText + ')');

		req3 = null;

		//Handle the 24-hour overall graph.
 		var minVal = 10000;
		var maxVal = 0;
 		for (var i = 0; i < data['bikes_available'].length; i++) 
		{
    			var currentValue = data['bikes_available'][i];
			if (currentValue < minVal)
			{
				minVal = currentValue;
			}	
			if (currentValue > maxVal)
			{
				maxVal = currentValue;
			}	
		}
		maxVal = maxVal + 50;
		minVal = minVal - 50;
		var dataToCode = data['bikes_available'];
		var dataCoded = extendedEncode(dataToCode, maxVal, minVal)
		var ggString = GGL_PREFIX + "&chtt=Bikes+in+Docks+(last+24h)&chxt=x,r&chxr=0,-24,0,4|1," + minVal + "," + maxVal + "&chco=" + colours[colourThemeID][1][0] + "&chf=bg,s,00000000&chd=" + dataCoded;
		document.getElementById('overallgraph').innerHTML = "<div style='width: 300px'><img src='" + ggString + "' style='width: 300px; height: 135px;' alt='Loading graph...'><br />" 
			+ "</div>";

		var dataToCode = data['unbalanced'];
		var dataCoded = extendedEncode(dataToCode, data['max_bikes_last_24h'], 0)
		var ggString = GGL_PREFIX + "&chtt=Distribution+Imbalance+(last+24h)&chxr=0,-24,0,4|1,0," + data['max_bikes_last_24h']/2 + "&chco=aaaaaa&chf=bg,s,00000000&chd=" + dataCoded;
		document.getElementById('balancegraph').innerHTML = "<div style='width: 300px'><img src='" + ggString + "' style='width: 300px; height: 135px;' alt='Loading graph...'><br />" 
			+ "</div>";

		var numOfBikes = data['max_bikes_last_24h'];
		var numDataVals = data['bikes_available'].length;
		var bikesAvailable = data['bikes_available'][numDataVals-1];
		
		var bikesUsed = numOfBikes - bikesAvailable;
		var bikesUsedPC = 100.0*(bikesUsed/(numOfBikes+0.0));
		var bikesAvailable_24h = data['bikes_24h_ago'];
		var bikesUsed_24h = numOfBikes - bikesAvailable_24h;
		var bikesUsedPC_24h = bikesUsedPC - 100.0*(bikesUsed_24h/(numOfBikes+0.0));

		var unbalanced = data['unbalanced'][numDataVals-1];
		var unbalancedPC = unbalanced/(bikesAvailable+bikesAvailable+0.0)

		var maxToday = numOfBikes - data['min_bikes_since_midnight'];

		var colourList = ['Extremely low', 'Very low' ,'Low', 'Fairly low', 'Normal', 'Fairly high', 'High', 'Very high', 'Extremely high'];
		var balanceList = ['Extremely well<br />balanced', 'Very well<br />balanced', 'Well<br />balanced', 'Fairly well<br />Balanced', 'Somewhat well<br />balanced', 'Somewhat<br />Unbalanced', 'Fairly<br />unbalanced', 'Very<br />unbalanced', 'Extremely<br />unbalanced']; 

		var activity = 8;
		var activity_24h = 8;
		var unbalancedInd = 8;

		for (var i = 0; i < 8; i++)
		{
			if (bikesUsedPC < BIKES_USED_PC_LIST[i]) { activity = i; break; }
		}
		for (var i = 0; i < 8; i++)
		{
			if (bikesUsedPC_24h < BIKES_USED_24H_PC_LIST[i]) { activity_24h = i; break; }
		}
		for (var i = 0; i < 8; i++)
		{
			if (unbalancedPC < UNBALANCED_PC_LIST[i]) { unbalancedInd = i; break; }
		}
		
		var activityColour = colours[colourThemeID][2][activity];
		var activityWord = colourList[activity];
		var changeColour = colours[colourThemeID][2][activity_24h];
		var unbalancedWord = balanceList[unbalancedInd];
		var unbalancedColour = colours[colourThemeID][2][unbalancedInd];

		if (bikesUsedPC_24h < -5.0 || bikesUsedPC_24h > 5.0)
		{
			bikesUsedPC_24h = parseInt(bikesUsedPC_24h);
		}
		else
		{
			bikesUsedPC_24h = Math.round(bikesUsedPC_24h*Math.pow(10,1))/Math.pow(10,1);
		}

		var changeWord = "" + bikesUsedPC_24h + "% higher"; 
		if (bikesUsedPC_24h < 0.0) 
		{ 
			changeWord = "" + (-1.0*bikesUsedPC_24h) + "% lower"; 
		}
		if (bikesUsedPC > 5.0)
		{
			bikesUsedPC = parseInt(bikesUsedPC);
		}
		else
		{
			bikesUsedPC = Math.round(bikesUsedPC*Math.pow(10,1))/Math.pow(10,1);
		}
	
		document.getElementById("stats").innerHTML = "<div style='padding-bottom: 5px; font-size: 9px;'>" + bikesUsed + " bikes in use - " + maxToday + " is highest so far today<br />" + bikesAvailable + " bikes currently available in docks</div>" +
			"<div class='statuspanel' style='margin: 3px 6px 3px 0; background-color: #" + activityColour + ";'>" + bikesUsedPC + "% in use<br />" + activityWord + "</div>" +
			"<div class='statuspanel' style='margin: 3px 6px 3px 0; background-color: #" + changeColour + ";'>" + changeWord + "<br />than 24h ago</div>" +
			"<div class='statuspanel' style='margin: 3px 0 3px 0; background-color: #" + unbalancedColour + ";'>" + unbalancedWord + "</div>" +
			"<br style='clear: both' />";			
	}
}

//////// UI DISPLAY /////////

function showHideStats()
{
	if (document.getElementById('stats').style.display == 'none')
	{
		document.getElementById('stats').style.display = 'block';
		document.getElementById('statsSH').innerHTML = 'hide';
	}
	else
	{
		document.getElementById('stats').style.display = 'none'
		document.getElementById('statsSH').innerHTML = 'show';
	}
}

function showHideOverallGraphs()
{
	if (document.getElementById('overallgraphs').style.display == 'block')
	{
		document.getElementById('overallgraphs').style.display = 'none';
		document.getElementById('overallgraphsSH').innerHTML = 'show';
	}
	else
	{
		document.getElementById('overallgraphs').style.display = 'block'
		document.getElementById('overallgraphsSH').innerHTML = 'hide';
	}
}

function showHideTicker()
{
	if (document.getElementById('tickerbox').style.display == 'block')
	{
		document.getElementById('tickerbox').style.display = 'none';
		document.getElementById('tickerboxSH').innerHTML = 'show';
	}
	else
	{
		document.getElementById('tickerbox').style.display = 'block'
		document.getElementById('tickerboxSH').innerHTML = 'hide';
	}
}


//////// UI UPDATING /////////

function updateFeatures()
{
	totalBikes = 0;
	for (var i = 0; i < features.length; i++)
	{
		var feature = features[i]
		for (var j = 0; j < stations.length; j++)
        	{
			if (feature.tflid == stations[j][0])
			{
				if (feature.spaces !== undefined)
				{
					feature.spaces_previous = feature.spaces;
					feature.bikes_previous = feature.bikes;
				}
				feature.spaces = stations[j][6];
                		feature.bikes = stations[j][5];
                		feature.total = feature.spaces + feature.bikes;
       				totalBikes += feature.bikes;
			}
		} 
	}

	updateFeatureCartography();
}

function updateFeaturesHistoric()
{
	totalBikes = 0;
	for (var i = 0; i < features.length; i++)
        {
		var historicdata = matrix[features[i].tflid][currTimePos]
                features[i].spaces = features[i].total - historicdata;
                features[i].bikes = historicdata;

		if (features[i].spaces < 0) { features[i].spaces = 0; } //May happen as we only know current feature.total, not historic.
		if (features[i].bikes > features[i].total) { features[i].bikes = features[i].total; } //May happen as we only know current feature.total, not historic.
                totalBikes += features[i].bikes;
        }
        updateFeatureCartography();
	currTimePos++;
	currTime = currTime + 600; //10 minutes in seconds.

	if (currTime < maxtime && !stop)
	{
		setTimeout("updateFeaturesHistoric()", animPause); //Up to 100 frames/second, in practice a lot slower due to browser rendering speeds.
	}
	if (currTime >= maxtime)
	{
		stopAnim();
		resetAnim();
	}
       	setTimeout("setStatusCompleteHistoric();", 1);
}

function postUpdateFeatures()
{
	populateTickerItems();
	restartTicker();
	requestSingleGraph();
	requestLatestOverallGraphs();
	setTimeout("setStatusComplete();", 1);
}

function updateFeatureCartography()
{
	for (var i = 0; i < features.length; i++)
        {
                var feature = features[i];
		var metric = -1;
		var bikesP = feature.bikes/feature.total;
		var spacesP = feature.spaces/feature.total;
		var diffP = bikesP-spacesP;
		if (diffP < 0) { diffP = -diffP; }
		diffP = 1-diffP;

		diffP = 0.9999*diffP;
		bikesP = 0.9999*bikesP;
		spacesP = 0.9999*spacesP;

		var r = bikesP*colours[colourThemeID][3][0]+spacesP*colours[colourThemeID][4][0]+diffP*colours[colourThemeID][5][0];
		var g = bikesP*colours[colourThemeID][3][1]+spacesP*colours[colourThemeID][4][1]+diffP*colours[colourThemeID][5][1];
		var b = bikesP*colours[colourThemeID][3][2]+spacesP*colours[colourThemeID][4][2]+diffP*colours[colourThemeID][5][2];

		if (r < 0) { r = 0; }
		if (g < 0) { g = 0; }
		if (b < 0) { b = 0; }

		var colourHex = rgb2Hex(r, g, b);
		if (colours[colourThemeID][6] == 0) { metric = feature.total; document.getElementById('keyinfo').innerHTML = 'Circle sizes correspond to dock size.'; }
		else if (colours[colourThemeID][6] == 1) { metric = feature.bikes; document.getElementById('keyinfo').innerHTML = 'Circle sizes correspond to number of bikes.'; }
		else if (colours[colourThemeID][6] == 2) { metric = feature.spaces; document.getElementById('keyinfo').innerHTML = 'Circle sizes correspond to number of spaces.'; }
		coreParty = "#" + colourHex;
		
		feature.metric = metric;
		feature.core = coreParty;

		if (feature.bikes == 0 && feature.spaces != 0)
		{
			feature.edge = "empty";
		}
		else if (feature.spaces == 0 && feature.bikes != 0)
		{
			feature.edge = "full";
		}
		else
		{
			feature.edge = "";
		}
		if (feature.locked === "true")
		{
			feature.edge = "locked";
		}
	}

	var scaling;
	if (map.getZoom() < 13)
	{
		scaling = 1;
	}
	else if (map.getZoom() < 15)
	{
		scaling = 2;
	}
	else
	{
		scaling = 4;
	}

	for (var i = 0; i < features.length; i++)
	{
		var feature = features[i];
		var metric = feature.metric;
		var pointRadius = 0;
		if (metric >= 0)
		{	
			pointRadius = Math.round(scaling*Math.sqrt(metric));							
			/* if (pointRadius < 3) { pointRadius = 3; } */
			if (pointRadius > 300) { pointRadius = 300; } 
		}
	
		feature.attributes.label = "";
		if (map.getZoom() > 14)
		{
			//feature.attributes.label = feature.bikes + "/" + feature.spaces;
			feature.attributes.fontSize = "20%";
		}

		feature.attributes.radius = pointRadius;
		feature.attributes.fillOpacity = 0.6;
		feature.attributes.strokeOpacity = 0.75;
		if (feature.edge == "full")
		{
			feature.attributes.strokeWidth = 1;
			feature.attributes.strokeColor = "#" + colours[colourThemeID][1][1]; 
		}
		else if (feature.edge == "empty")
		{
			feature.attributes.strokeWidth = 1;
			feature.attributes.strokeColor = "#" + colours[colourThemeID][1][2]; 
		}
		else if (feature.edge == "locked")
		{
			feature.attributes.strokeWidth = 2;
			feature.attributes.strokeColor = "#" + colours[colourThemeID][1][3];
		}
		else
		{
			feature.attributes.strokeWidth = 0.1; 
			feature.attributes.strokeColor = "#888888"; 
		}
		
		if (feature.core != null && feature.core.length > 1)
		{
			feature.attributes.fillColor = feature.core;
		} 
	}

	for (var i = 0; i < 16; i++)
	{
		var mod = (i-8)/8;
		if (mod < 0) { mod = -mod; }
		mod = 1-mod;

		var r = (i/16)*0.9999*colours[colourThemeID][3][0]+((16-i)/16)*0.9999*colours[colourThemeID][4][0]+mod*0.9999*colours[colourThemeID][5][0];
		var g = (i/16)*0.9999*colours[colourThemeID][3][1]+((16-i)/16)*0.9999*colours[colourThemeID][4][1]+mod*0.9999*colours[colourThemeID][5][1];
		var b = (i/16)*0.9999*colours[colourThemeID][3][2]+((16-i)/16)*0.9999*colours[colourThemeID][4][2]+mod*0.9999*colours[colourThemeID][5][2];

		if (r < 0) { r = 0; }
		if (g < 0) { g = 0; }
		if (b < 0) { b = 0; }

		var colourHex = rgb2Hex(r, g, b);
		document.getElementById("key" + i).style.backgroundColor = "#" + colourHex;
	}
	document.getElementById("key0").style.borderColor = "#" + colours[colourThemeID][1][2];
	document.getElementById("key15").style.borderColor = "#" + colours[colourThemeID][1][1];

	setTimeout("layerStations.removeFeatures(); layerStations.addFeatures(features);", 1);	
}

function updateThemeAndGraphs()
{
	updateTheme();
	requestSingleGraph();
	requestLatestOverallGraphs();
}

function updateTheme()
{
	colourThemeID = document.getElementById('theme').value;
	updateFeatureCartography();
}

///////// STATUS UPDATE DISPLAYING /////////

function setStatusObtaining()
{
	document.getElementById('refreshstatus').innerHTML = "Obtaining new data...";
	document.getElementById('timeTillNext').innerHTML = "";
}

function setStatusRedrawing()
{
	document.getElementById('refreshstatus').innerHTML = "New data obtained, redrawing...";
}

function getCurrTime()
{
	var d = new Date();
	var hours = d.getHours();
	if (hours < 10) { hours = "0" + hours; }
	var minutes = d.getMinutes();
	if (minutes < 10) { minutes = "0" + minutes; }
	var seconds = d.getSeconds();
	if (seconds < 10) { seconds = "0" + seconds; }
	return hours + ":" + minutes + ":" + seconds;
}


function getCurrTimeHistoric()
{
	if (currTime == 0) { return "&nbsp;"; }
	var d = new Date();	
	d.setTime(currTime*1000);
	if (dstflag)
	{
		d.setTime(currTime*1000+(60*60*1000));
	}
	var day = DOW_NAME[d.getUTCDay()];
	var dom = d.getUTCDate();
	var hours = d.getUTCHours();	 
	if (hours < 10) { hours = "0" + hours; }
	var minutes = d.getUTCMinutes();
	if (minutes < 10) { minutes = "0" + minutes; }	
	//return currTime;
	return day + " " + dom + " at " + hours + ":" + minutes;
}

function setStatusCompleteHistoric()
{
	if (stop)
	{
		document.getElementById('refreshstatus').innerHTML = "&nbsp;";		
	}
	else
	{
		document.getElementById('refreshstatus').innerHTML = getCurrTimeHistoric();
	}
}

function setStatusComplete()
{

	document.getElementById('refreshstatus').innerHTML = "Last updated at " + getCurrTime() + " - next in ";
	timeTillNext = 120;
}

function decrementTimeTillNext()
{
	setTimeout('decrementTimeTillNext()', 1000);
	timeTillNext--;
	document.getElementById('timeTillNext').innerHTML = "" + timeTillNext;
} 

///////// TIMELINE BUTTON HANDLERS /////////

function startAnim()
{
	document.getElementById('startButton').disabled = true;
	if (matrixLoaded)
	{
		document.getElementById('stopButton').disabled = false;
		document.getElementById('resetButton').disabled =false;
		document.getElementById('slowerButton').disabled = false;
		document.getElementById('fasterButton').disabled = false;
		document.getElementById('jumpButton').disabled = false;
		stop = false;
		updateFeaturesHistoric();
	}
	else
	{
		requestHistoricData();
	}
}

function stopAnim()
{
	document.getElementById('startButton').disabled = false;
	document.getElementById('stopButton').disabled = true;
	stop = true;
}

function resetAnim()
{
	currTime = mintime;
	currTimePos = 1;
	animPause = 10;
	document.getElementById('refreshstatus').innerHTML = "&nbsp;";
}

function slowerAnim()
{
	animPause = animPause * 1.25;
}

function fasterAnim()
{
	animPause = parseInt(animPause/1.25);
	if (animPause < 1)
	{
		animPause = 1;
	}
}

function jumpAnim()
{
	var quarterDay = 6*60*60;
	if ((maxtime - currTime) > quarterDay)
	{
		currTime = currTime + quarterDay;
		currTimePos = currTimePos + 6*6;
	}
}

//////// UTILITY METHODS /////////

//RGB values between 0 and 1.
function rgb2Hex(r, g, b)
{
	var colourHex = "";
	var hexArray = new Array( "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f" );
	var code1 = Math.floor(r*16);
	var code2 = Math.floor(r*256) - code1*16;
	colourHex += hexArray[code1];
	colourHex += hexArray[code2];
	var code1 = Math.floor(g*16);
	var code2 = Math.floor(g*256) - code1*16;
	colourHex += hexArray[code1];
	colourHex += hexArray[code2];
	var code1 = Math.floor(b*16);
	var code2 = Math.floor(b*256) - code1*16;
	colourHex += hexArray[code1];
	colourHex += hexArray[code2];
	return colourHex;
}

// The following two methods are from Google.

var simpleEncoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// This function scales the submitted values so that
// maxVal becomes the highest value.
function simpleEncode(valueArray,maxValue) {
  var chartData = ['s:'];
  for (var i = 0; i < valueArray.length; i++) {
    var currentValue = valueArray[i];
    if (!isNaN(currentValue) && currentValue >= 0) {
    chartData.push(simpleEncoding.charAt(Math.round((simpleEncoding.length-1) * currentValue / maxValue)));
    }
      else {
      chartData.push('_');
      }
  }
  return chartData.join('');
}

// Same as simple encoding, but for extended encoding.
var EXTENDED_MAP= 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.';
var EXTENDED_MAP_LENGTH = EXTENDED_MAP.length;
function extendedEncode(arrVals, maxVal, minVal) {
  var chartData = 'e:';

  for(i = 0, len = arrVals.length; i < len; i++) {
    // In case the array vals were translated to strings.
    var numericVal = new Number(arrVals[i])-minVal;
    // Scale the value to maxVal.
    var scaledVal = Math.floor(EXTENDED_MAP_LENGTH * 
        EXTENDED_MAP_LENGTH * numericVal / (maxVal-minVal));

    if(scaledVal > (EXTENDED_MAP_LENGTH * EXTENDED_MAP_LENGTH) - 1) {
      chartData += "..";
    } else if (scaledVal < 0) {
      chartData += '__';
    } else {
      // Calculate first and second digits and add them to the output.
      var quotient = Math.floor(scaledVal / EXTENDED_MAP_LENGTH);
      var remainder = scaledVal - EXTENDED_MAP_LENGTH * quotient;
      chartData += EXTENDED_MAP.charAt(quotient) + EXTENDED_MAP.charAt(remainder);
    }
  }

  return chartData;
}

function getReqObject()
{
  req = false;
  // For Safari, Firefox, and other non-MS browsers
  if (window.XMLHttpRequest) {
    try {
      req = new XMLHttpRequest();
    } catch (e) {
      req = false;
    }
  } else if (window.ActiveXObject) {
    // For Internet Explorer
    try {
      req = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
      try {
        req = new ActiveXObject("Microsoft.XMLHTTP");
      } catch (e) {
        req = false;
      }
    }
  }
}

function getReqObject2()
{
  req2 = false;
  // For Safari, Firefox, and other non-MS browsers
  if (window.XMLHttpRequest) {
    try {
      req2 = new XMLHttpRequest();
    } catch (e) {
      req2 = false;
    }
  } else if (window.ActiveXObject) {
    // For Internet Explorer
    try {
      req2 = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
      try {
        req2 = new ActiveXObject("Microsoft.XMLHTTP");
      } catch (e) {
        req2 = false;
      }
    }
  }
}

function getReqObject3()
{
  req3 = false;
  // For Safari, Firefox, and other non-MS browsers
  if (window.XMLHttpRequest) {
    try {
      req3 = new XMLHttpRequest();
    } catch (e) {
      req3 = false;
    }
  } else if (window.ActiveXObject) {
    // For Internet Explorer
    try {
      req3 = new ActiveXObject("Msxml2.XMLHTTP");
    } catch (e) {
      try {
        req3 = new ActiveXObject("Microsoft.XMLHTTP");
      } catch (e) {
        req3 = false;
      }
    }
  }
}
