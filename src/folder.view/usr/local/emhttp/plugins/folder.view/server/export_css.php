<?php
    require_once("/usr/local/emhttp/plugins/folder.view/server/lib.php");
    echo file_get_contents("$configDir/styles/" . $_GET['type'] . "-custom.css");
?>