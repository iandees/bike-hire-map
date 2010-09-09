<?php
$s = curl_init();
curl_setopt($s, CURLOPT_URL, 'http://secure.niceridemn.org/data2/bikeStations.xml');
curl_setopt($s, CURLOPT_RETURNTRANSFER, true);
$result = curl_exec($s);

$xml = new SimpleXMLElement($result);

include('db.php');

$lines = array();
foreach ($xml->station as $station) {
  $lines[] = "[{$station->id},\"\",\"{$station->name}\",{$station->lat},{$station->long},{$station->nbBikes},{$station->nbEmptyDocks},\"{$station->installed}\",\"{$station->locked}\"]";
  mysql_query("INSERT INTO niceride_historical (station_id, bikes, slots) VALUES ({$station->id}, {$station->nbBikes}, {$station->nbEmptyDocks})");
}
$output = "[" . implode(",\n", $lines) . "]";

$fp = fopen('latest_stations.json', 'w');
fwrite($fp, $output);
fclose($fp);
?>
