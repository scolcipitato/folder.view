<?php
    require_once("/usr/local/emhttp/plugins/folder.view/server/lib.php");
    require_once("$documentRoot/plugins/dynamix.docker.manager/include/DockerClient.php");

    $dockerTemplates = new DockerTemplates();
    $info = $dockerTemplates->getAllInfo();
    echo json_encode($info);
?>