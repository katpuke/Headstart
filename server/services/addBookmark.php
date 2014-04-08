<?php

header('Content-type: application/json');

require dirname(__FILE__) . '/../classes/headstart/personalization/DBConnectionPersonalization.php';
require_once '/../classes/headstart/library/CommUtils.php';
require_once '/../classes/headstart/library/toolkit.php';

//$_SESSION['userInfo']['userID'];

use headstart\library;

$INI_DIR = dirname(__FILE__) . "/../preprocessing/conf/";

$ini_array = library\Toolkit::loadIni($INI_DIR);

$user_id = library\CommUtils::getParameter($_GET, "user_id");
$conference_id = library\CommUtils::getParameter($_GET, "content_id");

$connection = new headstart\personalization\DBConnectionPersonalization($ini_array);
$connection->establishConnection();
$bookmarking_data = $connection->addPersonalBookmark($user_id, $conference_id);

$jsonData = json_encode($bookmarking_data);

library\CommUtils::echoOrCallback($jsonData, $_GET);
