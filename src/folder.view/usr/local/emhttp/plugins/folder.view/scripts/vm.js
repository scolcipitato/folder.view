/**
 * Handles the creation of all folders
 */
const createFolders = async () => {
    const prom = await Promise.all(folderReq);
    // Parse the results
    let folders = JSON.parse(prom[0]);
    const unraidOrder = JSON.parse(prom[1]);
    const vmInfo = JSON.parse(prom[2]);
    let order = JSON.parse(prom[3]);

    
    // Filter the webui order to get the container that aren't in the order, this happen when a new container is created
    let newOnes = order.filter(x => !unraidOrder.includes(x));

    // Insert the folder in the unraid folder into the order shifted by the unlisted containers
    for (let index = 0; index < unraidOrder.length; index++) {
        const element = unraidOrder[index];
        if((folderRegex.test(element) && folders[element.slice(7)])) {
            order.splice(index+newOnes.length, 0, element);
        }
    }

    // debug mode, download the debug json file
    if(folderDebugMode) {
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify({
            veriosn: (await $.get('/plugins/folder.view/server/version.php').promise()).trim(),
            folders,
            unraidOrder,
            originalOrder: JSON.parse(await $.get('/plugins/folder.view/server/read_vm_webui_order.php').promise()),
            newOnes,
            order,
            vmInfo
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
                key -= newOnes.length;
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
        if((globalFolders[id] && globalFolders[id].status.expanded) || value.settings.expand_tab) {
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
    let started = 0;
    let autostart = false;

    // If regex is present searches all containers for a match and put them inside the folder containers
    if (folder.regex) {
        const regex = new RegExp(folder.regex);
        folder.containers = folder.containers.concat(order.filter(el => regex.test(el)));
    }

    // the HTML template for the folder
    const fld = `<tr parent-id="${id}" class="sortable folder-id-${id} ${folder.settings.preview_hover ? 'hover' : ''} folder"><td class="vm-name folder-name"><div class="folder-name-sub"><i class="fa fa-arrows-v mover orange-text"></i><span class="outer folder-outer"><span id="${id}" onclick='addVMFolderContext("${id}")' class="hand folder-hand"><img src="${folder.icon}" class="img folder-img" onerror='this.src="/plugins/dynamix.docker.manager/images/question.png"'></span><span class="inner folder-inner"><a class="folder-appname" href="#" onclick='editFolder("${id}")'>${folder.name}</a><a class="folder-appname-id">folder-${id}</a><br><i id="load-folder-${id}" class="fa fa-square stopped red-text folder-load-status"></i><span class="state folder-state">stopped</span></span></span><button class="dropDown-${id} folder-dropdown" onclick='dropDownButton("${id}")'><i class="fa fa-chevron-down" aria-hidden="true"></i></button></div></td><td colspan="5"><div class="folder-storage"></div><div class="folder-preview"></div></td><td class="folder-autostart"><input class="autostart" type="checkbox" id="folder-${id}-auto" style="display:none"></td></tr><tr child-id="${id}" id="name-${id}" style="display:none"><td colspan="8" style="margin:0;padding:0"></td></tr>`;

    // insertion at position of the folder
    if (position === 0) {
        $('#kvm_list > tr.sortable').eq(position).before($(fld));
    } else {
        $('#kvm_list > tr.sortable').eq(position - 1).next().after($(fld));
    }

    // create the *cool* unraid button for the autostart
    $(`#folder-${id}-auto`).switchButton({ labels_placement: 'right', off_label: "Off", on_label: "On", checked: false });

    // Set the border if enabled and set the color
    if(folder.settings.preview_border) {
        $(`tr.folder-id-${id} div.folder-preview`).css('border', `solid ${folder.settings.preview_border_color} 1px`);
    }

    $(`tr.folder-id-${id} div.folder-preview`).addClass(`folder-preview-${folder.settings.preview}`);

    // select the preview function to use
    let addPreview;
    switch (folder.settings.preview) {
        case 1:
            addPreview = (id) => {
                $(`tr.folder-id-${id} div.folder-preview`).append($(`tr.folder-id-${id} div.folder-storage > tr > td.vm-name > span.outer:last`).clone());
            };
            break;
        case 2:
            addPreview = (id) => {
                $(`tr.folder-id-${id} div.folder-preview`).append($(`tr.folder-id-${id} div.folder-storage > tr > td.vm-name > span.outer > span.hand:last`).clone());
            };
            break;
        case 3:
            addPreview = (id) => {
                $(`tr.folder-id-${id} div.folder-preview`).append($(`tr.folder-id-${id} div.folder-storage > tr > td.vm-name > span.outer > span.inner:last`).clone());
            };
            break;
        case 4:
            addPreview = (id) => {
                let lstSpan = $(`tr.folder-id-${id} div.folder-preview > span.outer:last`);
                if(!lstSpan[0] || lstSpan.children().length >= 2) {
                    $(`tr.folder-id-${id} div.folder-preview`).append($('<span class="outer"></span>'));
                    lstSpan = $(`tr.folder-id-${id} div.folder-preview > span.outer:last`);
                }
                lstSpan.append($('<span class="inner"></span>'));
                lstSpan.children('span.inner:last').append($(`tr.folder-id-${id} div.folder-storage > tr > td.vm-name > span.outer > span.inner > a:last`).clone())
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
            newFolder[container] = {};
            newFolder[container].id = ct.uuid;
            newFolder[container].state = ct.state;

            // grab the container and put it onto the storage
            $(`tr.folder-id-${id} div.folder-storage`).append($('#kvm_list > tr.sortable').eq(index).addClass(`folder-${id}-element`).addClass(`folder-element`).removeClass('sortable'));

            if(folderDebugMode) {
                console.log(`${newFolder[container].id}(${offsetIndex}, ${index}) => ${id}`);
            }
            
            addPreview(id);

            // element to set the preview options
            const element = $(`tr.folder-id-${id} div.folder-preview > span.outer:last`);

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
            started += ct.state!=="shutoff" ? 1 : 0;
            autostart = autostart || ct.autostart;
        }
    }

    // replace the old containers array with the newFolder object
    folder.containers = newFolder;

    // wrap the preview with a div
    $(`tr.folder-id-${id} div.folder-preview > span`).wrap('<div class="folder-preview-wrapper"></div>');

    if(folder.settings.preview_vertical_bars) {
        $(`tr.folder-id-${id} div.folder-preview > div`).not(':last').after(`<div class="folder-preview-divider" style="border-color: ${folder.settings.preview_border_color};"></div>`);
    }

    //set tehe status of a folder

    if (started) {
        $(`tr.folder-id-${id} i#load-folder-${id}`).attr('class', 'fa fa-play started green-text folder-load-status');
        $(`tr.folder-id-${id} span.folder-state`).text(`${started}/${Object.entries(folder.containers).length} started`);
    }

    if (autostart) {
        $(`#folder-${id}-auto`).next().click();
    }

    // set the status
    folder.status = {};
    folder.status.started = started;
    folder.status.autostart = autostart;
    folder.status.expanded = false;

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
        $(`tr.folder-id-${id} > td[colspan=5] > .folder-storage`).append($(`.folder-${id}-element`));
        element.attr('active', 'false');
    } else {
        element.children().removeClass('fa-chevron-down').addClass('fa-chevron-up');
        $(`tr.folder-id-${id}`).removeClass('sortable').removeClass('ui-sortable-handle').off().css('cursor', '');
        $(`tr.folder-id-${id}`).after($(`.folder-${id}-element`));
        $(`.folder-${id}-element > td > i.fa-arrows-v`).remove();
        $(`.folder-${id}-element:last`).css('border-bottom', `1px solid ${globalFolders[id].settings.preview_border_color}`);
        element.attr('active', 'true');
    }
    if(globalFolders[id]) {
        globalFolders[id].status.expanded = !state;
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
 * Force stop all the vms inside a folder
 * @param {string} id the id of the folder
 */
const forceStopFolder = async (id) => {
    const folder = globalFolders[id];
    const cts = Object.keys(folder.containers);
    let proms = [];
    let errors;
    $(`i#load-folder-${id}`).removeClass('fa-play fa-square fa-pause').addClass('fa-refresh fa-spin');
    $('div.spinner.fixed').show('slow');
    for (let index = 0; index < cts.length; index++) {
        const ct = folder.containers[cts[index]];
        const cid = ct.id;
        if(ct.state === "running" || ct.state === "pmsuspended" || ct.state === "paused" || ct.state === "unknown") {
            proms.push($.post('/plugins/dynamix.vm.manager/include/VMajax.php', {action:"domain-destroy", uuid:cid}, null,'json').promise());
        }
    }
    proms = await Promise.all(proms);
    errors = proms.filter(e => e.success !== true);
    errors = errors.map(e => e.success);
    if(errors.length > 0) {
        swal({
            title:'Execution error',
            text:errors.join('<br>'),
            type:'error',
            html:true,
            confirmButtonText:'Ok'
        }, loadlist);
    }
    loadlist();
    $('div.spinner.fixed').hide('slow');
};

/**
 * Hibernate all the started vms inside a folder
 * @param {string} id the id of the folder
 */
const hibernateFolder = async (id) => {
    const folder = globalFolders[id];
    const cts = Object.keys(folder.containers);
    let proms = [];
    let errors;
    $(`i#load-folder-${id}`).removeClass('fa-play fa-square fa-pause').addClass('fa-refresh fa-spin');
    $('div.spinner.fixed').show('slow');
    for (let index = 0; index < cts.length; index++) {
        const ct = folder.containers[cts[index]];
        const cid = ct.id;
        if(ct.state === "running") {
            proms.push($.post('/plugins/dynamix.vm.manager/include/VMajax.php', {action:"domain-pmsuspend", uuid:cid}, null,'json').promise());
        }
    }
    proms = await Promise.all(proms);
    errors = proms.filter(e => e.success !== true);
    errors = errors.map(e => e.success);
    if(errors.length > 0) {
        swal({
            title:'Execution error',
            text:errors.join('<br>'),
            type:'error',
            html:true,
            confirmButtonText:'Ok'
        }, loadlist);
    }
    loadlist();
    $('div.spinner.fixed').hide('slow');
};

/**
 * Restart all the started vms inside a folder
 * @param {string} id the id of the folder
 */
const restartFolder = async (id) => {
    const folder = globalFolders[id];
    const cts = Object.keys(folder.containers);
    let proms = [];
    let errors;
    $(`i#load-folder-${id}`).removeClass('fa-play fa-square fa-pause').addClass('fa-refresh fa-spin');
    $('div.spinner.fixed').show('slow');
    for (let index = 0; index < cts.length; index++) {
        const ct = folder.containers[cts[index]];
        const cid = ct.id;
        if(ct.state === "running") {
            proms.push($.post('/plugins/dynamix.vm.manager/include/VMajax.php', {action:"domain-restart", uuid:cid}, null,'json').promise());
        }
    }
    proms = await Promise.all(proms);
    errors = proms.filter(e => e.success !== true);
    errors = errors.map(e => e.success);
    if(errors.length > 0) {
        swal({
            title:'Execution error',
            text:errors.join('<br>'),
            type:'error',
            html:true,
            confirmButtonText:'Ok'
        }, loadlist);
    }
    loadlist();
    $('div.spinner.fixed').hide('slow');
};

/**
 * resume all the paused vms inside a folder
 * @param {string} id the id of the folder
 */
const resumeFolder = async (id) => {
    const folder = globalFolders[id];
    const cts = Object.keys(folder.containers);
    let proms = [];
    let errors;
    $(`i#load-folder-${id}`).removeClass('fa-play fa-square fa-pause').addClass('fa-refresh fa-spin');
    $('div.spinner.fixed').show('slow');
    for (let index = 0; index < cts.length; index++) {
        const ct = folder.containers[cts[index]];
        const cid = ct.id;
        if(ct.state === "paused" || ct.state === "unknown") {
            proms.push($.post('/plugins/dynamix.vm.manager/include/VMajax.php', {action:"domain-resume", uuid:cid}, null,'json').promise());
        }
        if(ct.state === "pmsuspended") {
            proms.push($.post('/plugins/dynamix.vm.manager/include/VMajax.php', {action:"domain-pmwakeup", uuid:cid}, null,'json').promise());
        }
    }
    proms = await Promise.all(proms);
    errors = proms.filter(e => e.success !== true);
    errors = errors.map(e => e.success);
    if(errors.length > 0) {
        swal({
            title:'Execution error',
            text:errors.join('<br>'),
            type:'error',
            html:true,
            confirmButtonText:'Ok'
        }, loadlist);
    }
    loadlist();
    $('div.spinner.fixed').hide('slow');
};

/**
 * Pause all the started vms inside a folder
 * @param {string} id the id of the folder
 */
const pauseFolder = async (id) => {
    const folder = globalFolders[id];
    const cts = Object.keys(folder.containers);
    let proms = [];
    let errors;
    $(`i#load-folder-${id}`).removeClass('fa-play fa-square fa-pause').addClass('fa-refresh fa-spin');
    $('div.spinner.fixed').show('slow');
    for (let index = 0; index < cts.length; index++) {
        const ct = folder.containers[cts[index]];
        const cid = ct.id;
        if(ct.state === "running") {
            proms.push($.post('/plugins/dynamix.vm.manager/include/VMajax.php', {action:"domain-pause", uuid:cid}, null,'json').promise());
        }
    }
    proms = await Promise.all(proms);
    errors = proms.filter(e => e.success !== true);
    errors = errors.map(e => e.success);
    if(errors.length > 0) {
        swal({
            title:'Execution error',
            text:errors.join('<br>'),
            type:'error',
            html:true,
            confirmButtonText:'Ok'
        }, loadlist);
    }
    loadlist();
    $('div.spinner.fixed').hide('slow');
};

/**
 * Stop all the started vms inside a folder
 * @param {string} id the id of the folder
 */
const stopFolder = async (id) => {
    const folder = globalFolders[id];
    const cts = Object.keys(folder.containers);
    let proms = [];
    let errors;
    $(`i#load-folder-${id}`).removeClass('fa-play fa-square fa-pause').addClass('fa-refresh fa-spin');
    $('div.spinner.fixed').show('slow');
    for (let index = 0; index < cts.length; index++) {
        const ct = folder.containers[cts[index]];
        const cid = ct.id;
        if(ct.state === "running") {
            proms.push($.post('/plugins/dynamix.vm.manager/include/VMajax.php', {action:"domain-stop", uuid:cid}, null,'json').promise());
        }
    }
    proms = await Promise.all(proms);
    errors = proms.filter(e => e.success !== true);
    errors = errors.map(e => e.success);
    if(errors.length > 0) {
        swal({
            title:'Execution error',
            text:errors.join('<br>'),
            type:'error',
            html:true,
            confirmButtonText:'Ok'
        }, loadlist);
    }
    loadlist();
    $('div.spinner.fixed').hide('slow');
};

/**
 * Start all the stopped vms inside a folder
 * @param {string} id the id of the folder
 */
const startFolder = async (id) => {
    const folder = globalFolders[id];
    const cts = Object.keys(folder.containers);
    let proms = [];
    let errors;
    $(`i#load-folder-${id}`).removeClass('fa-play fa-square fa-pause').addClass('fa-refresh fa-spin');
    $('div.spinner.fixed').show('slow');
    for (let index = 0; index < cts.length; index++) {
        const ct = folder.containers[cts[index]];
        const cid = ct.id;
        if(ct.state !== "running" && ct.state !== "pmsuspended" && ct.state !== "paused" && ct.state !== "unknown") {
            proms.push($.post('/plugins/dynamix.vm.manager/include/VMajax.php', {action:"domain-start", uuid:cid}, null,'json').promise());
        }
    }
    proms = await Promise.all(proms);
    errors = proms.filter(e => e.success !== true);
    errors = errors.map(e => e.success);
    if(errors.length > 0) {
        swal({
            title:'Execution error',
            text:errors.join('<br>'),
            type:'error',
            html:true,
            confirmButtonText:'Ok'
        }, loadlist);
    }
    loadlist();
    $('div.spinner.fixed').hide('slow');
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
        text:"Start",
        icon:"fa-play",
        action:(e) => { e.preventDefault(); startFolder(id); }
    });

    opts.push({
        text:"Stop",
        icon:"fa-stop",
        action:(e) => { e.preventDefault(); stopFolder(id); }
    });

    opts.push({
        text:"Pause",
        icon:"fa-pause",
        action:(e) => { e.preventDefault(); pauseFolder(id); }
    });

    opts.push({
        text:"Resume",
        icon:"fa-play-circle",
        action:(e) => { e.preventDefault(); resumeFolder(id); }
    });

    opts.push({
        text:"Restart",
        icon:"fa-refresh",
        action:(e) => { e.preventDefault(); restartFolder(id); }
    });

    opts.push({
        text:"Hibernate",
        icon:"fa-bed",
        action:(e) => { e.preventDefault(); hibernateFolder(id); }
    });

    opts.push({
        text:"Force Stop",
        icon:"fa-bomb",
        action:(e) => { e.preventDefault(); forceStopFolder(id); }
    });

    opts.push({
        divider: true
    });

    opts.push({
        text: 'Edit',
        icon: 'fa-wrench',
        action: (e) => { e.preventDefault(); editFolder(id); }
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
let folderReq = [];

// Patching the original function to make sure the containers are rendered before insering the folder
window.loadlist_original = loadlist;
window.loadlist = (x) => {
    loadedFolder = false;
    folderReq = [
        // Get the folders
        $.get('/plugins/folder.view/server/read.php?type=vm').promise(),
        // Get the order as unraid sees it
        $.get('/plugins/folder.view/server/read_order.php?type=vm').promise(),
        // Get the info on VMs, needed for autostart and started
        $.get('/plugins/folder.view/server/read_vms_info.php').promise(),
        // Get the order that is shown in the webui
        $.get('/plugins/folder.view/server/read_vm_webui_order.php').promise()
    ];
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