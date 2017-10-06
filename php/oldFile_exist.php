<?php
include 'oldFile_CONSTANTS.php';

if(isset($_GET["trackingCode"])) {
    $trackingCode = $_GET["trackingCode"];
} else {
    exit("ERR: Tracking Code not set in oldFile_exist.php");
}

$oldFilesDirList = scandir($oldFilesDir);

$matchedFilesArr = array();
foreach($oldFilesDirList as $oldFilename) {
    if(strpos($oldFilename,$trackingCode)!==false) {
        array_push($matchedFilesArr, $oldFilename);
    }
}

if (count($matchedFilesArr)===1) {
    exit($matchedFilesArr[0]);
} elseif (count($matchedFilesArr)===0) {
    exit("ERR: No matching filess found for tracking code [$trackingCode]");
} else {
    exit("ERR: Multiple matching files found: [" . json_encode($matchedFilesArr) . "]");
}

?>
