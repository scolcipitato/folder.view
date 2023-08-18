<?php
    $folderVersion = 1.0;
    $configDir = "/boot/config/plugins/folder.view";
    $sourceDir = "/usr/local/emhttp/plugins/folder.view";
    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/usr/local/emhttp';
    require_once("$documentRoot/plugins/dynamix.docker.manager/include/DockerClient.php");
    require_once ("$documentRoot/webGui/include/Helpers.php");
    require_once ("$documentRoot/plugins/dynamix.vm.manager/include/libvirt_helpers.php");


    function readFolder(string $type) : string {
        global $configDir;
        if(!file_exists("$configDir/$type.json")) {
            createFile($type);
        }

        return file_get_contents("$configDir/$type.json");
    }

    function readUserPrefs(string $type) : string {
        $userPrefs = "/boot/config/plugins";
        if($type == 'docker') {
            $userPrefs = "$userPrefs/dockerMan/userprefs.cfg";
            if(!file_exists($userPrefs)) {
                return '[]';
            }
        } else if($type == 'vm') {
            $userPrefs = "$userPrefs/dynamix.vm.manager/userprefs.cfg";
            if(!file_exists($userPrefs)) {
                return '[]';
            }
        } else {
            return '[]';
        }

        return json_encode(parse_ini_file($userPrefs));
    }
    
    // Used for create without passing the id
    function updateFolder(string $type, string $content, string $id = '') : void {
        global $configDir;
        if(!file_exists("$configDir/$type.json")) {
            createFile($type);
            $id = generateId();
        }
        if($id == '') {
            $id = generateId();
        }
        $file = json_decode(file_get_contents("$configDir/$type.json"), true);
        $file[$id] = json_decode($content, true);
        file_put_contents("$configDir/$type.json", json_encode($file));
    }

    function deleteFolder(string $type, string $id) : void {
        global $configDir;
        if(!file_exists("$configDir/$type.json")) {
            createFile($type);
        }
        $file = json_decode(file_get_contents("$configDir/$type.json"), true);
        unset($file[$id]);
        file_put_contents("$configDir/$type.json", json_encode($file));
    }

    function generateId(int $length = 20) : string {
        return str_replace(['+', '/', '='], '', base64_encode(random_bytes(20)));
    }

    function createFile(string $type): void {
        global $configDir;
        $default = [
            'docker' => '{}',
            'vm' => '{}',
        ];
        file_put_contents("$configDir/$type.json", $default[$type]);
    }

    function readInfo(string $type): array {
        $info = [];
        if ($type == "docker") {
            $dockerTemplates = new DockerTemplates();
            $info = $dockerTemplates->getAllInfo();
        } elseif ($type == "vm") {
            global $lv;
            $vms = $lv->get_domains();
            if (!empty($vms)) {
                foreach ($vms as $vm) {
                    $res = $lv->get_domain_by_name($vm);
                    $dom = $lv->domain_get_info($res);
                    $info[$vm] = [
                        'uuid' => $lv->domain_get_uuid($res),
                        'autostart' => $lv->domain_get_autostart($res),
                        'state' => $lv->domain_state_translate($dom['state'])
                    ];
                }
            }
        }
        return $info;
    }

    function readElements(string $type): array {
        $elements = [];
        if ($type == "docker") {
            $dockerClient = new DockerClient();
            $elements = $dockerClient->getDockerContainers();
        } elseif ($type == "vm") {
            global $lv;
            $vms = $lv->get_domains();
            if (!empty($vms)) {
                foreach ($vms as $vm) {
                    $res = $lv->get_domain_by_name($vm);
                    array_push($elements, [
                        'Name' => $vm,
                        'Icon' => $lv->domain_get_icon_url($res),
                    ]);
                }
            }
        }
        return $elements;
    }

    function readUnraidOrder(string $type): array {
        $user_prefs = "/boot/config/plugins";
        $order = [];
        if ($type == "docker") {
            // /usr/local/emhttp/plugins/dynamix.docker.manager/include/DockerContainers.php
            $containers = readElements($type);
            $user_prefs = "$user_prefs/dockerMan/userprefs.cfg";

            if (file_exists($user_prefs)) {
                $prefs = parse_ini_file($user_prefs) ?: [];
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
            
            $order = $containers;
        } elseif ($type == "vm") {
            global $lv;
            // /usr/local/emhttp/plugins/dynamix.vm.manager/include/VMMachines.php
            $user_prefs = "$user_prefs/dynamix.vm.manager/userprefs.cfg";
            $vms = $lv->get_domains();

            if (!empty($vms)) {
                if (file_exists($user_prefs)) {
                    $prefs = parse_ini_file($user_prefs) ?: [];
                    $sort = [];
                    foreach ($vms as $vm) {
                        $sort[] = array_search($vm,$prefs);
                    }
                    array_multisort($sort,SORT_NUMERIC,$vms);
                    unset($sort);
                } else {
                    natcasesort($vms);
                }

                $order = $vms;
            }
        }
        return $order;
    }
?>