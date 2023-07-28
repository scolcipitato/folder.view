<?php
    require_once("/usr/local/emhttp/plugins/folder.view/server/lib.php");
    require_once("$documentRoot/plugins/dynamix.vm.manager/include/libvirt.php");

    $lv = new Libvirt('qemu:///system', null, null, false);
    $vms = $lv->get_domains();
    $info = [];
    foreach ($vms as $vm) {
        $res = $lv->get_domain_by_name($vm);
        $dom = $lv->domain_get_info($res);
        $info[$vm] = [
            'uuid' => $lv->domain_get_uuid($res),
            'autostart' => $lv->domain_get_autostart($res),
            'running' => $lv->domain_state_translate($dom['state']) == 'running'
        ];
    }
    echo json_encode($info);
?>