<?php

  // /usr/local/emhttp/plugins/dynamix.docker.manager/include/DockerContainers.php

  require_once("/usr/local/emhttp/plugins/folder.view/server/lib.php");
  require_once("$documentRoot/plugins/dynamix.docker.manager/include/DockerClient.php");

  $DockerClient    = new DockerClient();
  $containers      = $DockerClient->getDockerContainers();
  $user_prefs      = $dockerManPaths['user-prefs'];

  if (file_exists($user_prefs)) {
    $prefs = @parse_ini_file($user_prefs) ?: [];
    $sort = [];
    foreach ($containers as $ct)  {
      $sort[] = array_search($ct['Name'],$prefs);
    }
    array_multisort($sort,SORT_NUMERIC,$containers);
    unset($sort);
  }
  foreach ($containers as $index=>$ct)  {
    $containers[$index] = $ct['Name'];
  }
  echo json_encode($containers);
?>