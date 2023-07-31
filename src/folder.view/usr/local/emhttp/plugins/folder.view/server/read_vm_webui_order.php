<?php

  // /usr/local/emhttp/plugins/dynamix.vm.manager/include/VMMachines.php

  require_once("/usr/local/emhttp/plugins/folder.view/server/lib.php");
  require_once ("$documentRoot/webGui/include/Helpers.php");
  require_once ("$documentRoot/plugins/dynamix.vm.manager/include/libvirt_helpers.php");

  $user_prefs = '/boot/config/plugins/dynamix.vm.manager/userprefs.cfg';
  $vms = $lv->get_domains();

  if (empty($vms)) {
    echo '[]';
    return;
  }

  if (file_exists($user_prefs)) {
    $prefs = @parse_ini_file($user_prefs) ?: [];
    $sort = [];
    foreach ($vms as $vm) {
      $sort[] = array_search($vm,$prefs);
    }
    array_multisort($sort,SORT_NUMERIC,$vms);
    unset($sort);
  } else {
    natcasesort($vms);
  }
  echo json_encode($vms);
?>