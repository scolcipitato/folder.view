<?php
    require_once("/usr/local/emhttp/plugins/folder.view/server/lib.php");
    echo json_encode(readInfo($_GET['type']));
?>