/**
 * Handles the creation of all folders
 */
const createFolders = async () => {
    const prom = await Promise.all([
        // Get the folders
        $.get('/plugins/folder.view/server/read.php?type=vm').promise(),
        // Get the order as unraid sees it
        $.get('/plugins/folder.view/server/read_order.php?type=vm').promise(),
        // Get the info on VMs, needed for autostart and started
        $.get('/plugins/folder.view/server/read_vms_info.php').promise()
    ]);
    // Get the list of container on the webui
    const webUiOrder = $("#kvm_list > tr.sortable > td.vm-name > span.outer >  span.inner > a").map((i, el) => el.innerText.trim()).get();
    // Parse the results
    let folders = JSON.parse(prom[0]);
    const unraidOrder = JSON.parse(prom[1]);
    const vmInfo = JSON.parse(prom[2]);

    // Filter the order to make sure no 'ghost' container are present in the final order, unraid don't remove deleted container from the order
    let order = unraidOrder.filter(e => (webUiOrder.includes(e) || (folderRegex.test(e) && folders[e.slice(7)])));
    // Filter the webui order to get the container that aren't in the order, this happen when a new container is created
    let newOnes = webUiOrder.filter(x => !order.includes(x));
    // This seems strange but unraid keep the first element in the order and insert element around it
    newOnes.push(order.shift());
    // Sort the container to mirror unraid behavior
    newOnes.sort();
    // Finally add the new contaners to the final order
    order = newOnes.concat(order);

    // debug mode, download the debug json file
    if(folderDebugMode) {
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify({
            veriosn: await $.get('/plugins/folder.view/server/version.php').promise(),
            webUiOrder,
            folders,
            unraidOrder,
            vmInfo,
            newOnes,
            order
        })));
        element.setAttribute('download', 'debug-VM.json');
    
        element.style.display = 'none';
        document.body.appendChild(element);
    
        element.click();
    
        document.body.removeChild(element);
        console.log('Order:', [...order]);
    }

    let foldersDone = {};

    // Draw the folders in the order
    for (let key = 0; key < order.length; key++) {
        const container = order[key];
        if (container && folderRegex.test(container)) {
            let id = container.replace(folderRegex, '');
            if (folders[id]) {
                createFolder(folders[id], id, key, order, vmInfo, Object.keys(foldersDone));
                // Move the folder to the done object and delete it from the undone one
                foldersDone[id] = folders[id];
                delete folders[id];
            }
        }
    }

    // Draw the foldes outside of the order
    for (const [id, value] of Object.entries(folders)) {
        // Add the folder on top of the array
        order.unshift(`folder-${id}`);
        createFolder(value, id, 0, order, vmInfo, Object.keys(foldersDone));
        // Move the folder to the done object and delete it from the undone one
        foldersDone[id] = folders[id];
        delete folders[id];
    }

    // Expand folders that are set to be expanded by default, this is here because is easier to work with all compressed folder when creating them
    for (const [id, value] of Object.entries(foldersDone)) {
        if(value.settings.expand_tab) {
            dropDownButton(id);
        }
    }

    // Assing the folder done to the global object
    globalFolders = foldersDone;

    folderDebugMode  = false;
};

/**
 * Handles the creation of one folder
 * @param {object} folder the folder
 * @param {string} id if of the folder
 * @param {int} position position to inset the folder
 * @param {Array<string>} order order of vms
 * @param {object} vmInfo info of the vms
 * @param {Array<string>} foldersDone folders that are done
 */
const createFolder = (folder, id, position, order, vmInfo, foldersDone) => {
    // default varibles
    let started = false;
    let autostart = false;

    // If regex is present searches all containers for a match and put them inside the folder containers
    if (folder.regex) {
        const regex = new RegExp(folder.regex);
        folder.containers = folder.containers.concat(order.filter(el => regex.test(el)));
    }

    // the HTML template for the folder
    const fld = `<tr parent-id="${id}" class="sortable folder-id-${id} ${folder.settings.preview_hover ? 'hover' : ''}"><td class="vm-name" style="width:220px;padding:8px"><i class="fa fa-arrows-v mover orange-text"></i><span class="outer"><span id="${id}" onclick='addVMFolderContext("${id}")' class="hand"><img src="${folder.icon}" class="img" onerror='this.src="/plugins/dynamix.docker.manager/images/question.png"'></span><span class="inner"><a href="#" onclick='editFolder("${id}")'>${folder.name}</a><a style="display:none">folder-${id}</a><br><i id="load-folder-${id}" class="fa fa-square stopped red-text"></i><span class="state">stopped</span></span></span><button class="dropDown-${id}" onclick='dropDownButton("${id}")' style="padding:6px;min-width:0;margin:0;margin-left:1em;float:right"><i class="fa fa-chevron-down" aria-hidden="true"></i></button></td><td colspan="5"><div class="folder_storage" style="display:none"></div><div class="folder-preview" style="border:solid ${$('body').css('color')} 1px;border-radius:4px;height:3.5em;overflow:hidden"></div></td><td><input class="autostart" type="checkbox" id="folder-${id}-auto" style="display:none"></td></tr><tr child-id="${id}" id="name-${id}" style="display:none"><td colspan="8" style="margin:0;padding:0"></td></tr>`;

    // insertion at position of the folder
    if (position === 0) {
        $('#kvm_list > tr.sortable').eq(position).before($(fld));
    } else {
        $('#kvm_list > tr.sortable').eq(position - 1).next().after($(fld));
    }

    // create the *cool* unraid button for the autostart
    $(`#folder-${id}-auto`).switchButton({ labels_placement: 'right', off_label: "Off", on_label: "On", checked: false });


    // select the preview function to use
    let addPreview;
    switch (folder.settings.preview) {
        case 1:
            addPreview = (id) => {
                $(`tr.folder-id-${id} > td[colspan=5] > div.folder-preview`).append($(`tr.folder-id-${id} > td[colspan=5] > .folder_storage > tr > td.vm-name > span.outer:last`).clone());
            };
            break;
        case 2:
            addPreview = (id) => {
                $(`tr.folder-id-${id} > td[colspan=5] > div.folder-preview`).append($(`tr.folder-id-${id} > td[colspan=5] > .folder_storage > tr > td.vm-name > span.outer > span.hand:last`).clone());
            };
            break;
        case 3:
            addPreview = (id) => {
                $(`tr.folder-id-${id} > td[colspan=5] > div.folder-preview`).append($(`tr.folder-id-${id} > td[colspan=5] > .folder_storage > tr > td.vm-name > span.outer > span.inner:last`).clone());
            };
            break;
        default:
            addPreview = (id) => { };
            break;
    }

    // new folder is needed for not altering the old containers
    let newFolder = {};

    // foldersDone is and array of only ids there is the need to add the 'folder-' in front
    foldersDone = foldersDone.map(e => 'folder-'+e);

    // remove the undone folders from the order, needed because they can cause an offset when grabbing the containers
    const cutomOrder = order.filter((e) => {
        return e && (foldersDone.includes(e) || !(folderRegex.test(e) && e !== `folder-${id}`));
    });

    // loop over the containers
    for (const container of folder.containers) {
        // get both index, tis is needed for removing from the orders later
        const index = cutomOrder.indexOf(container);
        const offsetIndex = order.indexOf(container);

        if (index > -1) {
            // remove the containers from the order
            cutomOrder.splice(index, 1);
            order.splice(offsetIndex, 1);

            // add the id to the container name 
            const ct = vmInfo[container];
            newFolder[container] = ct.uuid;

            // grab the container and put it onto the storage
            $(`tr.folder-id-${id} > td[colspan=5] > .folder_storage`).append($('#kvm_list > tr.sortable').eq(index).addClass(`folder-${id}-element`).removeClass('sortable'));

            if(folderDebugMode) {
                console.log(`${newFolder[container]}(${offsetIndex}, ${index}) => ${id}`);
            }
            
            addPreview(id);

            // element to set the preview options
            const element = $(`tr.folder-id-${id} > td[colspan=5] > .folder-preview > span.outer:last`);

            //temp var
            let sel;

            //set the preview option

            if (folder.settings.preview_grayscale) {
                sel = element.children('span.hand').children('img.img');
                if (!sel.length) {
                    sel = element.children('img.img');
                }
                sel.css('filter', 'grayscale(100%)');
            }

            // set the status of the folder
            started = started || ct.running;
            autostart = autostart || ct.autostart;
        }
    }

    // replace the old containers array with the newFolder object
    folder.containers = newFolder;

    // wrap the preview with a div
    $(`tr.folder-id-${id} > td[colspan=5] > div.folder-preview > span`).wrap('<div style="float: left; height: 100%; margin-left: 10px; margin-top: 5px;"></div>');

    //set tehe status of a folder

    if (started) {
        $(`tr.folder-id-${id} > td.vm-name > span.outer > span.inner > i#load-folder-${id}`).attr('class', 'fa fa-play started green-text');
        $(`#docker_list > tr.folder-id-${id} > td.vm-name > span.outer > span.inner > span.state`).text('started');
    }

    if (autostart) {
        $(`#folder-${id}-auto`).next().click();
    }

    // add the function to handle the change on the autostart checkbox, this is here because of the if before, i don't want to handle the change i triggered before
    $(`#folder-${id}-auto`).on("change", folderAutostart);
};

/**
 * Hanled the click of the autostart button and changes the container to reflect the status of the folder
 * @param {*} el element passed by the event caller
 */
const folderAutostart = (el) => {
    const status = el.target.checked;
    // The id is needded to get the containers, the checkbox has a id folder-${id}-auto, so split and take the second element
    const id = el.target.id.split('-')[1];
    const containers = $(`tr.folder-${id}-element`);
    for (const container of containers) {
        // Select the td with the switch inside
        const el = $(container).children().last();

        // Get the status of the container
        const cstatus = el.children('.autostart')[0].checked;
        if ((status && !cstatus) || (!status && cstatus)) {
            el.children('.switch-button-background').click();
        }
    }
};

/**
 * Handle the dropdown expand button of folders
 * @param {string} id the id of the folder
 */
const dropDownButton = (id) => {
    const element = $(`.dropDown-${id}`);
    const state = element.attr('active') === "true";
    if (state) {
        element.children().removeClass('fa-chevron-up').addClass('fa-chevron-down');
        $(`tr.folder-id-${id}`).addClass('sortable');
        $(`tr.folder-id-${id} > td[colspan=5] > .folder_storage`).append($(`.folder-${id}-element`));
        element.attr('active', 'false');
    } else {
        element.children().removeClass('fa-chevron-down').addClass('fa-chevron-up');
        $(`tr.folder-id-${id}`).removeClass('sortable').removeClass('ui-sortable-handle').off().css('cursor', '');
        $(`tr.folder-id-${id}`).after($(`.folder-${id}-element`));
        $(`.folder-${id}-element > td > i.fa-arrows-v`).remove();
        $(`.folder-${id}-element:last`).css('border-bottom', '1px solid');
        element.attr('active', 'true');
    }
};

/**
 * Removie the folder
 * @param {string} id the id of the folder
 */
const rmFolder = (id) => {
    // Ask for a confirmation
    swal({
        title: 'Are you sure?',
        text: `Remove folder: ${globalFolders[id].name}`,
        type: 'warning',
        html: true,
        showCancelButton: true,
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel',
        showLoaderOnConfirm: true
    },
    async (c) => {
        if (!c) { setTimeout(loadlist); return; }
        $('div.spinner.fixed').show('slow');
        await $.get('/plugins/folder.view/server/delete.php?type=vm&id=' + id).promise();
        loadedFolder = false;
        setTimeout(loadlist(), 500)
    });
};

/**
 * Redirect to the page to edit the folder
 * @param {string} id the id of the folder
 */
const editFolder = (id) => {
    location.href = "/VMs/Folder?type=vm&id=" + id;
};

/**
 * Atach the menu when clicking the folder icon
 * @param {string} id the id of the folder
 */
const addVMFolderContext = (id) => {
    let opts = [];
    context.settings({
        right: false,
        above: false
    });

    opts.push({
        text: 'Edit',
        icon: 'fa-wrench',
        action: (e) => { e.preventDefault(); editFolder(id); }
    });

    opts.push({
        divider: true
    });

    opts.push({
        text: 'Remove',
        icon: 'fa-trash',
        action: (e) => { e.preventDefault(); rmFolder(id); }
    });

    context.attach('#' + id, opts);
};

// Global variables
let loadedFolder = false;
let globalFolders = {};
const folderRegex = /^folder-/;
let folderDebugMode  = false;
let folderDebugModeWindow = [];

// Patching the original function to make sure the containers are rendered before insering the folder
window.loadlist_original = loadlist;
window.loadlist = (x) => {
    loadedFolder = false;
    loadlist_original(x);
};

// Add the button for creating a folder
const createFolderBtn = () => { location.href = "/VMs/Folder?type=vm" };
$('<input type="button" onclick="createFolderBtn()" value="Add Folder" style="display:none">').insertAfter('table#kvm_table');

$.ajaxPrefilter((options, originalOptions, jqXHR) => {
    // This is needed because unraid don't like the folder and the number are set incorrectly, this intercept the request and change the numbers to make the order appear right, this is important for the autostart and to draw the folders
    if (options.url === "/plugins/dynamix.vm.manager/include/UserPrefs.php") {
        const data = new URLSearchParams(options.data);
        const containers = data.get('names').split(';');
        const folderFixRegex = /^(.*?)(?=folder-)/g;
        let num = "";
        for (let index = 0; index < containers.length - 1; index++) {
            containers[index] = containers[index].replace(folderFixRegex, '');
            num += index + ';'
        }
        data.set('names', containers.join(';'));
        data.set('index', num);
        options.data = data.toString();
        $('.unhide').show();
    // this is needed to trigger the funtion to create the folders
    } else if (options.url === "/plugins/dynamix.vm.manager/include/VMMachines.php" && !loadedFolder) {
        jqXHR.promise().then(() => {
            createFolders();
            $('div.spinner.fixed').hide();
            loadedFolder = !loadedFolder
        });
    }
});

// activate debug mode
addEventListener("keydown", (e) => {
    if (e.isComposing || e.key.length !== 1) { // letter X FOR TESTING
        return;
    }
    folderDebugModeWindow.push(e.key);
    if(folderDebugModeWindow.length > 5) {
        folderDebugModeWindow.shift();
    }
    if(folderDebugModeWindow.join('').toLowerCase() === "debug") {
        folderDebugMode = true;
        loadlist();
    }
})