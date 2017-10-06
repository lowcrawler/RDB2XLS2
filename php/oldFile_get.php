<?php
include 'oldFile_CONSTANTS.php';

if(isset($_GET["filename"])) {
    $filename = $_GET["filename"];
}

if (file_exists($dir . "/" . $filename)) {
    echo "$filename exists";
} else {
    echo "$filename does NOT exist";
}

?>
