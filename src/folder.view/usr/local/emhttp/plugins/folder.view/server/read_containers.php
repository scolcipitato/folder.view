<?php
    require_once("/usr/local/emhttp/plugins/folder.view/server/lib.php");
    require_once("$documentRoot/plugins/dynamix.docker.manager/include/DockerClient.php");

    $dockerClient = new DockerClient();
    $containers = $dockerClient->getDockerContainers();
    echo json_encode($containers);
?>