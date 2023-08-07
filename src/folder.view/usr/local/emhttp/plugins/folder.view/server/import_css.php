<?php
    require_once("/usr/local/emhttp/plugins/folder.view/server/lib.php");
    file_put_contents("$configDir/styles/" . $_POST['type'] . "-custom.css", $_POST['content'])
?>