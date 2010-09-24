<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" 
    "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html;charset=utf-8" />
<title>London Cycle Hire Historic Map</title>
<link rel="stylesheet" type="text/css" media="screen" href="style.css" />

<script type="text/javascript">
	var isIE = false;
</script>	     
<script type="text/javascript" src="proj4js-compressed.js"></script>	     
<script type="text/javascript" src="../openlayers/OpenLayers-2.10/lib/OpenLayers.js"></script> 
<!--[if lt IE 7]>
	<link type="text/css" rel="stylesheet" href="ie6fix/ie6.css" />
	<script type="text/javascript" src="ie6fix/IE7.js"></script>
<![endif]-->
<!--[if IE]>
	<script type="text/javascript">
		alert("Welcome to the live cycle dock status map. This visualisation " + 
			"is *extremely* slow in Internet Explorer when viewing the whole of central London " + 
			"due to the number of cycle docks and the way IE draws circles. Be careful if zooming out.\n\n" + 
			"For the best experience, it is strongly recommended to use Firefox, Safari or " + 
			"another browser, if at all possible. It's much quicker on these!");
		isIE = true;
	</script>
<![endif]-->

<script type="text/javascript">
<?php
	$csv = fopen('tfl.csv', 'r');
	$i = 0;
	while (($row = fgetcsv($csv)) != FALSE)
	{
	       for ($j=0; $j < count($row); $j++) 
		{
			if (is_numeric($row[$j]))
			{
				$row[$j] = (float)$row[$j];
			}
		}

		$rows[$i] = $row;
		$i++;
	}
	fclose($csv);
	echo "\nvar stations = " . json_encode($rows) . "\n"; 
?>
</script>

<script type="text/javascript" src="main.js"></script>
</head>

<body onload="initHistoric();" style="margin: 0; padding: 0; height: 100%; ">
	<div id="mappanel" style="position: absolute; left: 0; top: 0; right: 0; bottom: 0; height: 100%; ">
	      <div id="map" style="margin-left: auto; margin-right: auto; position: absolute; width: 100%; height: 100%;"></div>
	</div>
	<div id='optionwrapper'>
		<div id='logo'>
				<a href="http://casa.ucl.ac.uk/"><img src='images/casawhitesmall.png' alt='CASA' /></a>
		</div>
		<div id="optionbox" >
			<table id="keywrapper">
				<tr>
					<td id="themecell">
						Colours: <select id='theme' onchange='updateTheme()'><option></option></select>
					</td>
					<td id="rampcell">
						<table style='margin: 0 auto; '>
							<tr>
								<td>Empty</td>
								<td>
									<div id='key0' style='float:left; width: 8px; border: 1px solid #000000'>&nbsp;</div>
									<div id='key1' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key2' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key3' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key4' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key5' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key6' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key7' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key8' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key9' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key10' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key11' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key12' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key13' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key14' style='float:left; width: 8px; padding: 1px 0;'>&nbsp;</div>
									<div id='key15' style='float:left; width: 8px; border: 1px solid #000000'>&nbsp;</div>
								</td>
								<td>Full&nbsp;&nbsp;</td>
							</tr>
						</table>
					</td>
				</tr>
				<tr><td></td>
					<td id='keyinfo'></td>
				</tr>
			</table>
			<div id='title'>London Cycle Hire Historic Map</div>		
			<div id='refreshwrapper'>
			<div id='refreshstatus' style='font-size: 16px; '>&nbsp;</div>

			</div>		
			<div id='linkswrapper'><a href="index.php">Live version</a> - 
			<a href="http://www.oliverobrien.co.uk/">Blog</a> - <a href="javascript:alert('Data: TFL website map. Map data: OpenStreetMap contributors, including OS Open Data. Hosting: UCL. Powered by Mapnik and OpenLayers. Thanks to BorisBikes forum contributors, Steven Gray at UCL CASA and Aidan Slingsby at City GICentre. This mashup was produced by Oliver O\'Brien at UCL CASA. Map is CC-By-SA OpenStreetMap. ')">Attributions</a> - <a href="javascript:alert('Data is updated automatically every two minutes from TfL. Bike usage is simultaneous usage and includes cycle redistribution. Actual total usage across the day is much higher. Distribution imbalance - the number of cycles that would need to be moved to a different stand, in order for all stands to be the same % full. Higher numbers indicate a more unbalanced distribution, e.g. many bikes in the centre, few on the edge. This website may be subject to interruption.')">Notes</a> - <a href="http://twitter.com/oobr/">Twitter: @oobr</a> - <a href="javascript:alert('You can contact me via Twitter or by emailing me at: mail (@) oliverobrien.co.uk')">Contact</a>
			</div>
		</div>
	</div>
	<div id='statsbox'>
				
<input type='button' value='Start Animation' onclick='startAnim()' id='startButton' />
<input type='button' value='Stop' onclick='stopAnim()' id='stopButton' disabled='disabled'  />
<input type='button' value='Reset' onclick='resetAnim()' id='resetButton'  disabled='disabled'   />
<input type='button' value='Slower' onclick='slowerAnim()' id='slowerButton'  disabled='disabled'    />
<input type='button' value='Faster' onclick='fasterAnim()' id='fasterButton'  disabled='disabled'    />
<input type='button' value='Jump 6h' onclick='jumpAnim()' id='jumpButton'  disabled='disabled'   />
</div>
 
</body>
</html>

