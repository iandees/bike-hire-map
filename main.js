var map;
var key1map;
var key2map;
var key1layer;
var key2layer;
var key1feature;
var key2feature;
var currentSelectedFeature;
var selectControl;

var EPSG4326 = new OpenLayers.Projection("EPSG:4326");
var EPSG900913 = new OpenLayers.Projection("EPSG:900913");
var bd = 20037508.34;
var debug = 0;
var timeTillNext = 120; 
var pollIntervalMs = 120000; //Normally 120000.
var ggCommon = "http://chart.apis.google.com/chart?cht=lc:nda&chs=300x135&chts=ffffff&chg=8.333333,0&chxt=x,r&chxl=0:|24h|20h|16h|12h|8h|4h|now";

var tickerItems = new Array();

var stations = [];

var context = function(feature)
{
	return feature;
}

//Graph colour, full highlight, empty highlight, locked highlight
var cNum = 0;
var colours = new Array(); 

colours.push(["Blue to Red", ['FF00FF', 'FFFF00', '00FFFF', 'FF0000'], ['0000FF', '2200DD', '220088', '220044', '220022', '440022', '880022', 'DD0022', 'FF0000'], [1, 0, 0], [0, 0, 1], [0, 0, 0], 0]);
colours.push(["Fiery", ['FFAA00', '770000', '999922', 'FF0000'], ['EE8800', 'CC7700', '885500', '553300', '221100', '550000', '880000', 'CC0000', 'FF0000'], [1, 0, 0], [0.9, 1, 0], [0, 0, 0], 0]);
colours.push(["Spectral", ['FF0000', 'AA0000', '0000AA', 'FF0000'], ['000000', '220000', '440000', '660000', '880000', 'AA0000', 'CC0000', 'EE0000', 'FF0000'], [1, -0.1, 0.1], [-1, 0, 1], [1, 1, -1], 0]);
colours.push(["Boris Blue", ['3366FF', '0000FF', '666666', 'FF0000'], ['444444', '333333', '222222', '111111', '000000', '001166', '002299', '0033CC', '0044FF'], [0, 0.2, 1], [1, 1, 1], [0, 0.1, 0], 0]);
colours.push(["CASA Purple", ['FF00FF', '000000', 'A030A0', 'FF0000'], ['110011', '220022', '330033', '440044', '550055', '660066', '770077', '880088', '990099'], [0.6, 0.2, 0.6], [0.6, 0.2, 0.6], [0, 0, 0], 1]);
colours.push(["Bike Finder", ['FF0000', '880000', '000044', 'FF0000'], ['110000', '330000', '550000', '770000', '880000', '990000', 'BB0000', 'DD0000', 'FF0000'], [1, 0, 0], [0, 0, 0.5], [0, 0, 0], 1]);
colours.push(["Space Finder", ['00FF00', '000000', '008800', 'FF0000'], ['000000', '002200', '004400', '006600', '008800', '009900', '00BB00', '00DD00', '00FF00'], [0, 0, 0], [0, 1, 0], [0, 0, 0], 2]);

var styleMap = new OpenLayers.StyleMap(
	{"default": new OpenLayers.Style({
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

// IE treats strokeWidth 0.1 as 1, Firefox as 0. 
// Ideally would be 0, However, needs to be >0 to stop IE display quirk.


styleMap.addUniqueValueRules("default", "core", lookupCore, context);
styleMap.addUniqueValueRules("select", "core", lookupCore, context);

var layerStations = new OpenLayers.Layer.Vector("Stations", { styleMap: styleMap });
var features = new Array();

OpenLayers.Util.onImageLoadError = function() 
{
	this.src = "404.png";
};

function init() 
{	
	for (var i = 0; i < colours.length; i++)
	{
		var option = new Option(colours[i][0], i);
		if (cNum == i)
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
	        	new OpenLayers.Control.KeyboardDefaults()],
	        maxExtent: new OpenLayers.Bounds(-1*bd, -1*bd, bd, bd),
	        maxResolution: 156543.0399,
	        units: 'm',
	        projection: EPSG900913,
	        displayProjection: EPSG4326
    	});
	  
    	layerSV = new OpenLayers.Layer.OSM("", ["http://a.tile.openstreetmap.us/niceridemn/${z}/${x}/${y}.png",
                                              "http://b.tile.openstreetmap.us/niceridemn/${z}/${x}/${y}.png",
                                              "http://c.tile.openstreetmap.us/niceridemn/${z}/${x}/${y}.png"
                                              ], 
          {  
              type: "png",
              numZoomLevels: 17
          });

  updateStations();
	//Set up drop-down values.

    	map.addLayer(layerSV);

	if (map.getZoom() == 0)
	{
	  map.setCenter(new OpenLayers.LonLat(-93.26636, 44.97251).transform(EPSG4326, EPSG900913), 14);
	}

	initiateTicker();
	restartTicker();

    	updateFeatures(); 

    	layerStations.events.on({
		"featureselected": function(e) {
			document.getElementById('infoboxtop').innerHTML = "<h3>" + e.feature.name + "</h3>";
			if (currentSelectedFeature != null)
			{
				selectControl.unselect(currentSelectedFeature);
				currentSelectedFeature == null;				
			}
			currentSelectedFeature = e.feature;
			refreshStatBox();
		},
		"featureunselected": function(e) {			
			currentSelectedFeature = null;
			refreshStatBox();
		}
	});

    	map.addLayer(layerStations);

	selectControl = new OpenLayers.Control.SelectFeature([layerStations], { });
	map.addControl(selectControl);
	selectControl.activate();
	
    	map.events.register("zoomend", null, updateCartoOnFeatures);
	
	setTimeout('poll()', pollIntervalMs);
	setTimeout('decrementTimeTillNext()', 1000);
}
	
var debug = 0;
var totalBikes = 0;
var req;
var req2;
var req3;


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

function updateStations()
{
	if (req) { }
	else
	{
		setTimeout("setStatusObtaining();", 1);
		getReqObject();
		req.onreadystatechange = pollStateChange;
		req.open("GET", "latest_stations.json", true);
		req.send(null)
	}
}

function poll()
{
  updateStations();
	setTimeout('poll()', pollIntervalMs); 
}

function pollStateChange()
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
	}
	req = null;
}

function showOverallGraph()
{
	if (req3.readyState != 4)
	{
		return;
	}
	if (req3.status == 200)
	{
		var dataText = req3.responseText;
		var data = eval('(' + dataText + ')');

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
		var ggString = ggCommon + "&chtt=Bikes+in+Docks+(last+24h)&chxt=x,r&chxr=0,-24,0,4|1," + minVal + "," + maxVal + "&chco=" + colours[cNum][1][0] + "&chf=bg,s,00000000&chd=" + dataCoded;
		document.getElementById('overallgraph').innerHTML = "<div style='width: 300px'><img src='" + ggString + "' style='width: 300px; height: 135px;' alt='Loading graph...'><br />" 
			+ "</div>";

		var dataToCode = data['unbalanced'];
		var dataCoded = extendedEncode(dataToCode, data['bikes_24h_ago'], 0)
		var ggString = ggCommon + "&chtt=Distribution+Imbalance+(last+24h)&chxr=0,-24,0,4|1,0," + data['bikes_24h_ago']/2 + "&chco=aaaaaa&chf=bg,s,00000000&chd=" + dataCoded;
		document.getElementById('balancegraph').innerHTML = "<div style='width: 300px'><img src='" + ggString + "' style='width: 300px; height: 135px;' alt='Loading graph...'><br />" 
			+ "</div>";


		//Handle the numeric stats.
		//1. No of bikes in use.
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

		var activity = 4;
		var activity_24h = 4;
		var colourList = ['Extremely low', 'Very low' ,'Low', 'Fairly low', 'Normal', 'Fairly high', 'High', 'Very high', 'Extremely high'];
		var balanceList = ['Extremely well<br />balanced', 'Very well<br />balanced', 'Well<br />balanced', 'Fairly well<br />Balanced', 'Somewhat well<br />balanced', 'Somewhat<br />Unbalanced', 'Fairly<br />unbalanced', 'Very<br />unbalanced', 'Extremely<br />unbalanced']; 

		if (bikesUsedPC < 0.5) 	 { activity = 0; }
		else if (bikesUsedPC < 1.0) { activity = 1; }
		else if (bikesUsedPC < 2.0) { activity = 2; }
		else if (bikesUsedPC < 4.0) { activity = 3; }
		else if (bikesUsedPC < 6.0) { activity = 4; }
		else if (bikesUsedPC < 9.0) { activity = 5; }
		else if (bikesUsedPC < 12.0) { activity = 6; }
		else if (bikesUsedPC < 15.0) { activity = 7; }
		else 			 { activity = 8; }

		if (bikesUsedPC_24h < -12.0) 	 { activity_24h = 0; }
		else if (bikesUsedPC_24h < -9.0) { activity_24h = 1; }
		else if (bikesUsedPC_24h < -6.0) { activity_24h = 2; }
		else if (bikesUsedPC_24h < -3.0) { activity_24h = 3; }
		else if (bikesUsedPC_24h < 3.0) { activity_24h = 4; }
		else if (bikesUsedPC_24h < 6.0) { activity_24h = 5; }
		else if (bikesUsedPC_24h < 9.0) { activity_24h = 6; }
		else if (bikesUsedPC_24h < 12.0) { activity_24h = 7; }
		else 			 { activity_24h = 8; }		

		if (unbalancedPC < 0.18) 	 { unbalancedInd = 0; }
		else if (unbalancedPC < 0.21) { unbalancedInd = 1; }
		else if (unbalancedPC < 0.24) { unbalancedInd = 2; }
		else if (unbalancedPC < 0.27) { unbalancedInd = 3; }
		else if (unbalancedPC < 0.30) { unbalancedInd = 4; }
		else if (unbalancedPC < 0.33) { unbalancedInd = 5; }
		else if (unbalancedPC < 0.36) { unbalancedInd = 6; }
		else if (unbalancedPC < 0.39) { unbalancedInd = 7; }
		else 			 { unbalancedInd = 8; }		

		var activityColour = colours[cNum][2][activity];
		var activityWord = colourList[activity];
		var changeColour = colours[cNum][2][activity_24h];
		var unbalancedWord = balanceList[unbalancedInd];
		var unbalancedColour = colours[cNum][2][unbalancedInd];

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
	
		document.getElementById("historicstats").innerHTML = "<div style='padding-bottom: 5px; font-size: 9px;'>" + bikesUsed + " bikes in use - " + maxToday + " is highest so far today<br />" + bikesAvailable + " bikes currently available in docks</div>" +
			"<div class='statuspanel' style='margin: 3px 6px 3px 0; background-color: #" + activityColour + ";'>" + bikesUsedPC + "% in use<br />" + activityWord + "</div>" +
			"<div class='statuspanel' style='margin: 3px 6px 3px 0; background-color: #" + changeColour + ";'>" + changeWord + "<br />than 24h ago</div>" +
			"<div class='statuspanel' style='margin: 3px 0 3px 0; background-color: #" + unbalancedColour + ";'>" + unbalancedWord + "</div>" +
			"<br style='clear: both' />";
			
	}
}

function showGraph()
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
		var ggString = ggCommon + "&chtt=Bikes+in+Dock+(last+24h)&chxr=0,-24,0,4|1,0," + maxVal + "," + maxVal + "&chco=" + colours[cNum][1][0] + "&chf=bg,s,00000000&chd=" + dataCoded;
		document.getElementById('infoboxgraph').innerHTML = "<div style='width: 300px;'><img src='" + ggString + "' style='width: 300px; height: 135px;' alt='Loading graph...'><br />" 
			+ "</div>";
		//document.getElementById('infoboxgraph').innerHTML = req2.responseText;
	}
}

var simpleEncoding = 
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

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

function showHide(ele)
{
	if (document.getElementById(ele).style.display == 'none')
	{
		document.getElementById(ele).style.display = 'block';
		document.getElementById(ele + 'SH').innerHTML = 'hide';
		return;
	}
	document.getElementById(ele).style.display = 'none'
	document.getElementById(ele + 'SH').innerHTML = 'show';
}

function showHide2(ele, changeCaption)
{
	if (document.getElementById(ele).style.display == 'block')
	{
		document.getElementById(ele).style.display = 'none';
		if (changeCaption)
		{
			document.getElementById(ele + 'SH').innerHTML = 'show';
		}
		return;
	}
	document.getElementById(ele).style.display = 'block'
	if (changeCaption)
	{
		document.getElementById(ele + 'SH').innerHTML = 'hide';
	}
}


function showHideOverallStats()
{
	if (document.getElementById('overallgraph').style.display == 'block')
	{
		document.getElementById('overallgraph').style.display = 'none';
		return;
	}
	document.getElementById('overallgraph').style.display = 'block'
	updateOverallStats();
}

function updateOverallStats()
{
	document.getElementById('overallgraph').innerHTML = "<div style='height: 135px'>Loading data...</div>";								
	getReqObject3();
	req3.onreadystatechange = showOverallGraph;
	//req3.overrideMimeType('text/plain');
	req3.open("GET", "loadgraphavail.php", true);
	req3.send(null)
}

function refreshStatBox()
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
		req2.onreadystatechange = showGraph;
		//req2.overrideMimeType('text/plain');
		req2.open("GET", "loadgraphavail.php?tfl_id=" + currentSelectedFeature.tflid, true);
		req2.send(null)
	} 	
	else
	{
		document.getElementById('infobox').style.display = "none";
	}
}

function initialFeatureSetup()
{
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

	layerStations.addFeatures(features);
}


function updateFeatures()
{
	totalBikes = 0;

  if (features.length === 0)
  {
    initialFeatureSetup();
  }

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
    feature.locked = stations[i][8];
				feature.spaces = stations[j][6];
                		feature.bikes = stations[j][5];
                		feature.total = feature.spaces + feature.bikes;
       				totalBikes += feature.bikes;
			}
		} 
	}

	populateTickerItems();
	restartTicker();

	updateCartoOnFeatures();
	setTimeout("setStatusComplete();", 1);
}

function updateCartoOnFeatures()
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

		var r = bikesP*colours[cNum][3][0]+spacesP*colours[cNum][4][0]+diffP*colours[cNum][5][0];
		var g = bikesP*colours[cNum][3][1]+spacesP*colours[cNum][4][1]+diffP*colours[cNum][5][1];
		var b = bikesP*colours[cNum][3][2]+spacesP*colours[cNum][4][2]+diffP*colours[cNum][5][2];

		if (r < 0) { r = 0; }
		if (g < 0) { g = 0; }
		if (b < 0) { b = 0; }

		var colourHex = rgb2Hex(r, g, b);
		if (colours[cNum][6] == 0) { metric = feature.total; document.getElementById('keyinfo').innerHTML = 'Circle sizes correspond to dock size.'; }
		else if (colours[cNum][6] == 1) { metric = feature.bikes; document.getElementById('keyinfo').innerHTML = 'Circle sizes correspond to number of bikes.'; }
		else if (colours[cNum][6] == 2) { metric = feature.spaces; document.getElementById('keyinfo').innerHTML = 'Circle sizes correspond to number of spaces.'; }
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

	refreshStatBox();
 	updateCircleSizesAndKeys();
	updateOverallStats();
}


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

function updateCircleSizesAndKeys()
{
	var scaling = 2.0;
	if (map.getZoom() < 13)
	{
		scaling = scaling * 0.5;
	}
	if (map.getZoom() > 14)
	{
		scaling = scaling * 2;
	}

	for (var i = 0; i < features.length; i++)
	{
		var feature = features[i];
		var metric = feature.metric;
		var pointRadius = 0;
		if (metric >= 0)
		{	
			pointRadius = Math.round(scaling*Math.sqrt(metric));							
			//if (pointRadius < 3)
			//{
			//	pointRadius = 3;
			//}
			if (pointRadius > 300)
			{
				pointRadius = 300;
			}
		}
	
    feature.attributes.label = "";
    if (map.getZoom() > 14)
    {
    feature.attributes.label = feature.bikes + "/" + feature.spaces;
    feature.attributes.fontSize = "20%";
    }
		feature.attributes.radius = pointRadius;
		feature.attributes.fillOpacity = 0.6;
		feature.attributes.strokeOpacity = 0.75;
		if (feature.edge == "full")
		{
			feature.attributes.strokeWidth = 1;
			feature.attributes.strokeColor = "#" + colours[cNum][1][1]; 
		}
		else if (feature.edge == "empty")
		{
			feature.attributes.strokeWidth = 1;
			feature.attributes.strokeColor = "#" + colours[cNum][1][2]; 
		}
    else if (feature.edge == "locked")
    {
      feature.attributes.strokeWidth = 2;
      feature.attributes.strokeColor = "#" + colours[cNum][1][3];
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
		//layerStations.drawFeature(feature);
	}

	for (var i = 0; i < 16; i++)
	{
		var mod = (i-8)/8;
		if (mod < 0) { mod = -mod; }
		mod = 1-mod;

		var r = (i/16)*0.9999*colours[cNum][3][0]+((16-i)/16)*0.9999*colours[cNum][4][0]+mod*0.9999*colours[cNum][5][0];
		var g = (i/16)*0.9999*colours[cNum][3][1]+((16-i)/16)*0.9999*colours[cNum][4][1]+mod*0.9999*colours[cNum][5][1];
		var b = (i/16)*0.9999*colours[cNum][3][2]+((16-i)/16)*0.9999*colours[cNum][4][2]+mod*0.9999*colours[cNum][5][2];

		if (r < 0) { r = 0; }
		if (g < 0) { g = 0; }
		if (b < 0) { b = 0; }

		var colourHex = rgb2Hex(r, g, b);
		document.getElementById("key" + i).style.backgroundColor = "#" + colourHex;
	}
	document.getElementById("key0").style.borderColor = "#" + colours[cNum][1][2];
	document.getElementById("key15").style.borderColor = "#" + colours[cNum][1][1];


	setTimeout("layerStations.destroyFeatures(); layerStations.addFeatures(features);", 1);	
}

function updateTheme()
{
	cNum = document.getElementById('theme').value;
	updateCartoOnFeatures();
}

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

