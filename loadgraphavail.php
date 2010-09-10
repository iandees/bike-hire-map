<?php
include('db.php');

if(isset($_GET['tfl_id']) && !is_numeric($_GET['tfl_id'])) {
  return;
}

$station_id = mysql_real_escape_string($_GET['tfl_id']);
if($station_id != FALSE) {
  // Querying for a particular station id
  $q = mysql_query("SELECT *
                    FROM niceride_historical
                    WHERE station_id=$station_id
                      AND TIME > TIMESTAMPADD( DAY, -1, NOW( ) )");
  $err = mysql_error();
} else {
  // Querying for overall system data
  $q = mysql_query("SELECT SUM( bikes ) AS bikes, SUM( slots ) AS slots, DATE_FORMAT( TIME,  '%Y-%m-%d %H:%i' ) AS time
                    FROM niceride_historical
                    GROUP BY DATE_FORMAT( TIME,  '%Y-%m-%d %H:%i' ) 
                    HAVING TIME > TIMESTAMPADD( DAY , -1, NOW( ) )");
  $err = mysql_error();

}

if($err) {
  print "{'Error':'$err'}";
  return;
}

$times = array();
$bikes = array();
$slots = array();
$unbalanced = array();
while($row = mysql_fetch_assoc($q)) {
  array_push($times, "\"".$row['time']."\"");
  array_push($bikes, $row['bikes']);
  array_push($slots, $row['slots']);
  array_push($unbalanced, 0);
}

$timestamps = implode(",", $times);
$bikes_str = implode(",", $bikes);
$slots_str = implode(",", $slots);
$unbalanced_str = implode(",", $unbalanced);

$res = mysql_query("
    SELECT MAX( bike_sum ) AS max_bikes
    FROM (
      SELECT SUM( bikes ) AS bike_sum, DATE_FORMAT( TIME,  '%Y-%m-%d %H:%i' ) AS TIME
      FROM niceride_historical
      GROUP BY DATE_FORMAT( TIME,  '%Y-%m-%d %H:%i' ) 
      HAVING TIME > TIMESTAMPADD( DAY , -1, NOW( ) )
    ) AS bike_sums");
$row = mysql_fetch_assoc($res);
$max_bikes_24h = $row['max_bikes'];

$res = mysql_query("
    SELECT SUM( bikes ) AS bike_sum, SUM( slots ) AS slot_sum, DATE_FORMAT( TIME,  '%Y-%m-%d %H:%i' ) AS TIME
    FROM niceride_historical
    GROUP BY DATE_FORMAT( TIME,  '%Y-%m-%d %H:%i' ) 
    HAVING TIME < TIMESTAMPADD( DAY , -1, NOW( ) ) 
    LIMIT 1");
$row = mysql_fetch_assoc($res);
$bikes_24h_ago = $row['bike_sum'];
$slots_24h_ago = $row['slot_sum'];

$res = mysql_query("
    SELECT MIN( bike_sum ) AS min_bikes_since_midnight
    FROM (
      SELECT SUM( bikes ) AS bike_sum, DATE_FORMAT( TIME,  '%Y-%m-%d %H:%i' ) AS TIME
      FROM niceride_historical
      GROUP BY DATE_FORMAT( TIME,  '%Y-%m-%d %H:%i' ) 
      HAVING TIME > DATE_SUB( CURDATE( ) , INTERVAL 0 DAY )
    ) AS bike_sums");
$row = mysql_fetch_assoc($res);
$min_bikes_since_midnight = $row['min_bikes_since_midnight'];

print <<<EOD
{"bikes_24h_ago":{$bikes_24h_ago},
"spaces_24h_ago":{$slots_24h_ago},
"max_bikes_last_24h":{$max_bikes_24h},
"min_bikes_since_midnight":{$min_bikes_since_midnight},
"timestamp_min":[{$timestamps}],
"bikes_available":[{$bikes_str}],
"spaces_available":[{$slots_str}],
"unbalanced":[{$unbalanced_str}]}
EOD;

?>
