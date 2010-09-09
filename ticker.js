var SPACING = 15;
var PADDING = 2;

//TODO: Adjust based on number of messages to convey.
var CHAR_PAUSE_MS = 40; 
var SCROLL_PAUSE_MS = 50; 
var EOL_PAUSE_MS = 1500;

var posDelta;
var tickerboxHeight = 0;
var posA, posB, posC, posD, posE;

var currTypeId;
var currText;
var currTextPos;


var currItem = 0;
var tickerActive = 0;

var itemDivs = ['item1', 'item2', 'item3', 'item4', 'item5'];
var itemDivPos = 0;
var itemDivNum = 5;
var idA, idB, idC, idD, idE;

idA = getNextItemDiv();
idB = getNextItemDiv();
idC = getNextItemDiv();
idD = getNextItemDiv();
idE = getNextItemDiv();

//setInterval('restartItems()', 13000);

function getNextItemDiv()
{
	itemDivPos++;
	if (itemDivPos == itemDivNum)
	{
		itemDivPos = 0;
	}	
	return itemDivs[itemDivPos];
}

function resetPositions()
{
	var idAtemp = idA; 
	idA = idB;
	idB = idC;
	idC = idD;
	idD = idE;
	idE = idAtemp;

	posDelta = 0;
	posE = PADDING
	posD = posE+SPACING;
	posC = posD+SPACING;
	posB = posC+SPACING;
	posA = posB+SPACING;
}

function restartTicker()
{
	if (tickerItems.length > 0)
	{
		currItem = 0; //TODO Bug - if updates fail to finish before the next restart (for a non-update), the updates start from the beginning again.
		if (tickerActive == 0)
		{
			moveUp();
		}
	}
}

function populateTickerItems()
{
	var tickerItemsTmp = new Array();
	var timeNow = getCurrTimeMin();
	var full = 0;
	var empty = 0;	
	var initialLoad = 1;
	
	if (features.length > 0 && features[0].bikes_previous !== undefined && features[0].spaces_previous !== undefined)
	{
		initialLoad = 0;
	}
	else
	{
		for (var i = 0; i < features.length; i++)
		{
			if (features[i].spaces == 0 && features[i].bikes != 0)
			{
				full++;
			}
			else if (features[i].bikes == 0 && features[i].spaces != 0)
			{
				empty++;
			}
		}		
		tickerItemsTmp.push("Welcome to the Dock Status Map - messages appear here as docks become full or empty");  
		tickerItemsTmp.push("Currently " + empty + " docking station" + (empty == 1 ? " is" : "s are") +" empty and " + full + (full == 1 ? " is" : " are") + " full");
	}

	for (var i = 0; i < features.length; i++)
	{
		if (initialLoad == 0)
		{
			if (features[i].bikes_previous != 0 && features[i].bikes == 0)
			{
				tickerItemsTmp.push(features[i].name + ": Now empty");
			}
			else if (features[i].spaces_previous != 0 && features[i].spaces == 0)
			{
				tickerItemsTmp.push(features[i].name + ": Now full");
			}
			else if (features[i].bikes_previous == 0 && features[i].bikes == 1)
			{
				tickerItemsTmp.push(features[i].name + ": One bike now available");
			}
			else if (features[i].spaces_previous == 0 && features[i].spaces == 1)
			{
				tickerItemsTmp.push(features[i].name + ": One space now free");
			}
			else if (features[i].bikes_previous == 0 && features[i].bikes > 1)
			{
				tickerItemsTmp.push(features[i].name + ": Bikes now available");
			}
			else if (features[i].spaces_previous == 0 && features[i].spaces > 1)
			{
				tickerItemsTmp.push(features[i].name + ": Spaces now free");
			}
			else if (features[i].bikes_previous - features[i].bikes > 5)
			{
				if (features[i].bikes < 5)
				{
					tickerItemsTmp.push(features[i].name + ": Dock emptying rapidly");
				}
				else
				{
					tickerItemsTmp.push(features[i].name + ": Spaces increasing quickly");
				}
			}
			else if (features[i].spaces_previous - features[i].spaces > 5)
			{
				if (features[i].spaces < 5)
				{
					tickerItemsTmp.push(features[i].name + ": Dock filling rapidly");
				}
				else
				{
					tickerItemsTmp.push(features[i].name + ": Bikes increasing quickly");
				}
			}
			//else if (features[i].tflid == 4) //Debug
			//{
			//	tickerItemsTmp.push(features[i].name + ": test"); //Debug
			//}

		}
	}		

	//if (tickerItemsTmp.length > 0) { tickerItemsTmp.push('End of updates') }
	//if (tickerItemsTmp.length == 0) { tickerItemsTmp.push('No updates') } //Debug

	if (tickerItemsTmp.length > 0)
	{
		tickerItems = new Array();
		for (var i = 0; i < tickerItemsTmp.length; i++)
		{
			tickerItems.push(timeNow + " (" + (i+1) + "/" + tickerItemsTmp.length + ") - " + tickerItemsTmp[i]);
		}
	}
}

function typeOut(id, text)
{
	document.getElementById(id).innerHTML = '';	
	currTypeId = id;
	currText = text;
	currTextPos = 0;
	var textLength = text.length;
	var i = 0;
	setTimeout('addLetter()', CHAR_PAUSE_MS);
}

function addLetter()
{
	var currIdText = document.getElementById(currTypeId).innerHTML;
	document.getElementById(currTypeId).innerHTML = currIdText + currText[currTextPos];
	currTextPos++;
	if (currTextPos < currText.length)
	{
		setTimeout('addLetter()', CHAR_PAUSE_MS);
	}
	else
	{
		setTimeout('moveUp()', EOL_PAUSE_MS);		
	}
}

function cycleCursor(cid)
{
	if (document.getElementById(cid).style.display == 'none')
	{
		document.getElementById(cid).style.display = 'inline';
	}
	else
	{
		document.getElementById(cid).style.display = 'none';
	}
}

function moveUp()
{
	tickerActive = 1;
	if (tickerboxHeight < PADDING)
	{
		tickerboxHeight++;
		document.getElementById('tickerbox').style.height = "" + tickerboxHeight + ' px';
		setTimeout("moveUp()", SCROLL_PAUSE_MS);
	}
	else if (tickerItems[currItem] == undefined)
	{
		tickerItems = new Array();
		tickerActive = 0;
	}
	else
	{
		if (posDelta == 0)
		{
			document.getElementById(idE + "cursorwrapper").style.display = 'none';
		}
		if (posDelta < SPACING)
		{
			posA++;
			posB++;
			posC++;
			posD++;
			posE++;
			document.getElementById(idA).style.bottom = posA + "px";
			document.getElementById(idB).style.bottom = posB + "px";
			document.getElementById(idC).style.bottom = posC + "px";
			document.getElementById(idD).style.bottom = posD + "px";
			document.getElementById(idE).style.bottom = posE + "px";
			if (tickerboxHeight < SPACING*5+PADDING)
			{
				tickerboxHeight++;	
				document.getElementById('tickerbox').style.height = tickerboxHeight + "px";
			}
			posDelta++;
			setTimeout("moveUp()", SCROLL_PAUSE_MS);
		}
		else
		{			
			resetPositions();
			document.getElementById(idE).style.bottom = posE + 'px';	
			document.getElementById(idE).style.display = 'block';	
			document.getElementById(idE + "cursorwrapper").style.display = 'inline';			
			typeOut(idE + "text", tickerItems[currItem]);
			currItem++;			
		}
	}
}

function getCurrTimeMin()
{
	var d = new Date();
	var hours = d.getHours();
	if (hours < 10) { hours = "0" + hours; }
	var minutes = d.getMinutes();
	if (minutes < 10) { minutes = "0" + minutes; }
	return hours + ":" + minutes;
}

function initiateTicker()
{
	resetPositions();

	setInterval("cycleCursor('item1cursor')", 500); 
	setInterval("cycleCursor('item2cursor')", 500); 
	setInterval("cycleCursor('item3cursor')", 500); 
	setInterval("cycleCursor('item4cursor')", 500); 
	setInterval("cycleCursor('item5cursor')", 500);
	
	document.getElementById(idE + "cursorwrapper").style.display = 'inline';
}
