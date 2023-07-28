<?php
    $folderVersion = 1.0;
    $configDir = "/boot/config/plugins/folder.view";
    $sourceDir = "/usr/local/emhttp/plugins/folder.view";
    $documentRoot = $_SERVER['DOCUMENT_ROOT'] ?? '/usr/local/emhttp';


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
?>