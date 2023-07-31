<?php
    require_once("/usr/local/emhttp/plugins/folder.view/server/lib.php");
    require_once ("$documentRoot/webGui/include/Helpers.php");
    require_once ("$documentRoot/plugins/dynamix.vm.manager/include/libvirt_helpers.php");

    $vms = $lv->get_domains();
    if (empty($vms)) {
        echo '[]';
        return;
    }
    $info = [];
    foreach ($vms as $vm) {
        $res = $lv->get_domain_by_name($vm);
        array_push($info, [
            'Name' => $vm,
            'Icon' => $lv->domain_get_icon_url($res),
        ]);
    }
    echo json_encode($info);
?>