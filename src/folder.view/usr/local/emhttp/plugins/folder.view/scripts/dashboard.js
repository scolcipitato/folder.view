/**
 * Handles the creation of all folders
 */
const createFolders = async () => {
    // ########################################
    // ##########       DOCKER       ##########
    // ########################################

    // if docker is enabled
    if($('tbody#docker_view').length > 0) {

        let prom = await Promise.all([
            // Get the folders
            $.get('/plugins/folder.view/server/read.php?type=docker').promise(),
            // Get the order as unraid sees it
            $.get('/plugins/folder.view/server/read_order.php?type=docker').promise(),
            // Get the info on containers, needed for autostart, update and started
            $.get('/plugins/folder.view/server/read_containers_info.php').promise()
        ]);
        // Get the list of container on the webui
        const webUiOrder = $('tbody#docker_view > tr.updated > td > span.outer.apps > span.inner > span:not(".state")').map((i, el) => el.innerText.trim()).get();
        // Parse the results
        let folders = JSON.parse(prom[0]);
        const unraidOrder = JSON.parse(prom[1]);
        const containersInfo = JSON.parse(prom[2]);
    
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
                containersInfo,
                newOnes,
                order
            })));
            element.setAttribute('download', 'debug-DASHBOARD-DOCKER.json');
        
            element.style.display = 'none';
            document.body.appendChild(element);
        
            element.click();
        
            document.body.removeChild(element);
            console.log('Docker Order:', [...order]);
        }
    
        let foldersDone = {};

        // Draw the folders in the order
        for (let key = 0; key < order.length; key++) {
            const container = order[key];
            if (container && folderRegex.test(container)) {
                let id = container.replace(folderRegex, '');
                if (folders[id]) {
                    createFolderDocker(folders[id], id, key, order, containersInfo, Object.keys(foldersDone));
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
            createFolderDocker(value, id, 0, order, containersInfo, Object.keys(foldersDone));
            // Move the folder to the done object and delete it from the undone one
            foldersDone[id] = folders[id];
            delete folders[id];
        }
    
        // if started only is active hide all stopped folder
        if ($('input#apps').is(':checked')) {
            $('tbody#docker_view > tr.updated > td > span.outer.stopped').css('display', 'none');
        }
    
        // Expand folders that are set to be expanded by default, this is here because is easier to work with all compressed folder when creating them
        for (const [id, value] of Object.entries(foldersDone)) {
            if (value.settings.expand_dashboard) {
                expandFolderDcoker(id);
            }
        }
    
        // Assing the folder done to the global object
        globalFolders.docker = foldersDone;

    }


    // ########################################
    // ##########         VMS        ##########
    // ########################################

    // if vm is enabled
    if($('tbody#vm_view').length > 0) {

        const prom = await Promise.all([
            // Get the folders
            $.get('/plugins/folder.view/server/read.php?type=vm').promise(),
            // Get the order as unraid sees it
            $.get('/plugins/folder.view/server/read_order.php?type=vm').promise(),
            // Get the info on VMs, needed for autostart and started
            $.get('/plugins/folder.view/server/read_vms_info.php').promise()
        ]);
        // Get the list of container on the webui
        const webUiOrder = $('tbody#vm_view > tr.updated > td > span.outer.vms > span.inner').clone().children().remove().end().map((i, el) => el.innerText.trim()).get();
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
            element.setAttribute('download', 'debug-DASHBOARD-VM.json');
        
            element.style.display = 'none';
            document.body.appendChild(element);
        
            element.click();
        
            document.body.removeChild(element);
            console.log('VM Order:', [...order]);
        }
    
        let foldersDone = {};

        // Draw the folders in the order
        for (let key = 0; key < order.length; key++) {
            const container = order[key];
            if (container && folderRegex.test(container)) {
                let id = container.replace(folderRegex, '');
                if (folders[id]) {
                    createFolderVM(folders[id], id, key, order, vmInfo, Object.keys(foldersDone));
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
            createFolderVM(value, id, 0, order, vmInfo, Object.keys(foldersDone));
            // Move the folder to the done object and delete it from the undone one
            foldersDone[id] = folders[id];
            delete folders[id];
        }

        // if started only is active hide all stopped folder
        if ($('input#vms').is(':checked')) {
            $('tbody#vm_view > tr.updated > td > span.outer.stopped').css('display', 'none');
        }
    
        // Expand folders that are set to be expanded by default, this is here because is easier to work with all compressed folder when creating them
        for (const [id, value] of Object.entries(foldersDone)) {
            if (value.settings.expand_dashboard) {
                expandFolderVM(id);
            }
        }
    
        globalFolders.vms = foldersDone;
        
    }

    folderDebugMode  = false;
};

/**
 * Handles the creation of one folder
 * @param {object} folder the folder
 * @param {string} id if of the folder
 * @param {int} position position to inset the folder
 * @param {Array<string>} order order of containers
 * @param {object} containersInfo info of the containers
 * @param {Array<string>} foldersDone folders that are done
 */
const createFolderDocker = (folder, id, position, order, containersInfo, foldersDone) => {
    // default varibles
    let upToDate = true;
    let started = false;

    // If regex is present searches all containers for a match and put them inside the folder containers
    if (folder.regex) {
        const regex = new RegExp(folder.regex);
        folder.containers = folder.containers.concat(order.filter(el => regex.test(el)));
    }

    // the HTML template for the folder
    const fld = `<span class="outer solid apps stopped"><span id="folder-id-${id}" onclick='addDockerFolderContext("${id}")' class="hand docker"><img src="${folder.icon}" class="img" onerror="this.src='/plugins/dynamix.docker.manager/images/question.png';"></span><span class="inner"><span class="">${folder.name}</span><br><i class="fa fa-square stopped red-text"></i><span class="state">stopped</span></span><div class="folder_storage" style="display:none"></div></span>`;

    // insertion at position of the folder
    if (position === 0) {
        $('tbody#docker_view > tr.updated > td > span.outer').eq(position).before($(fld));
    } else {
        $('tbody#docker_view > tr.updated > td > span.outer').eq(position - 1).after($(fld));
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

            // grab the storage folder
            const element = $(`tbody#docker_view > tr.updated > td > span.outer.apps > span#folder-id-${id}`).siblings('div.folder_storage');
            // grab the container and put it onto the storage
            element.append($('tbody#docker_view > tr.updated > td > span.outer').eq(index).addClass(`folder-${id}-element`));
            // get the id from the id of the container in the page
            newFolder[container] = element.children('span.outer').children('span.hand').last()[0].id;

            if(folderDebugMode) {
                console.log(`Docker ${newFolder[container]}(${offsetIndex}, ${index}) => ${id}`);
            }

            // set the status of the folder
            const ct = containersInfo[container];
            upToDate = upToDate && ct.updated == "true";
            started = started || ct.running;
        }
    }

    // replace the old containers array with the newFolder object
    folder.containers = newFolder;

    //temp var
    const sel = $(`tbody#docker_view > tr.updated > td > span.outer.apps > span#folder-id-${id}`)
    
    //set tehe status of a folder

    if (!upToDate) {
        sel.next('span.inner').children().first().addClass('blue-text');
    }

    if (started) {
        sel.parent().removeClass('stopped').addClass('started');
        sel.next('span.inner').children('i').replaceWith($('<i class="fa fa-play started green-text"></i>'));
        sel.next('span.inner').children('span.state').text('started')
    }
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
const createFolderVM = (folder, id, position, order, vmInfo, foldersDone) => {
    // default varibles
    let started = false;

    // If regex is present searches all containers for a match and put them inside the folder containers
    if (folder.regex) {
        const regex = new RegExp(folder.regex);
        folder.containers = folder.containers.concat(order.filter(el => regex.test(el)));
    }

    // the HTML template for the folder
    const fld = `<span class="outer solid vms stopped"><span id="folder-id-${id}" onclick='addVMFolderContext("${id}")' class="hand vm"><img src="${folder.icon}" class="img" onerror='this.src="/plugins/dynamix.docker.manager/images/question.png"'></span><span class="inner">${folder.name}<br><i class="fa fa-square stopped red-text"></i><span class="state">stopped</span></span><div class="folder_storage" style="display:none"></div></span>`;

    // insertion at position of the folder
    if (position === 0) {
        $('tbody#vm_view > tr.updated > td > span.outer').eq(position).before($(fld));
    } else {
        $('tbody#vm_view > tr.updated > td > span.outer').eq(position - 1).after($(fld));
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
            $(`tbody#vm_view > tr.updated > td > span.outer.vms > span#folder-id-${id}`).siblings('div.folder_storage').append($('tbody#vm_view > tr.updated > td > span.outer').eq(index).addClass(`folder-${id}-element`));

            if(folderDebugMode) {
                console.log(`VM ${newFolder[container]}(${offsetIndex}, ${index}) => ${id}`);
            }
            
            // set the status of the folder
            started = started || ct.running;
        }
    }

    // replace the old containers array with the newFolder object
    folder.containers = newFolder;

    
    //set tehe status of a folder
    if (started) {
        const sel = $(`tbody#vm_view > tr.updated > td > span.outer.vms > span#folder-id-${id}`);
        sel.parent().removeClass('stopped').addClass('started');
        sel.next('span.inner').children('i').replaceWith($('<i class="fa fa-play started green-text"></i>'));
        sel.next('span.inner').children('span.state').text('started')
    }
};

/**
 * Handle the dropdown expand button of folders
 * @param {string} id the id of the folder
 */
const expandFolderDcoker = (id) => {
    const el = $(`tbody#docker_view > tr.updated > td > span.outer.apps > span#folder-id-${id}`);
    const state = el.attr('expanded') === "true";
    if (state) {
        el.siblings('div.folder_storage').append($(`tbody#docker_view > tr.updated > td > span.outer.apps.folder-${id}-element`));
        el.attr('expanded', 'false');
    } else {
        el.parent().after(el.siblings('div.folder_storage').children());
        el.attr('expanded', 'true');
    }

};

/**
 * Handle the dropdown expand button of folders
 * @param {string} id the id of the folder
 */
const expandFolderVM = (id) => {
    const el = $(`tbody#vm_view > tr.updated > td > span.outer.vms > span#folder-id-${id}`);
    const state = el.attr('expanded') === "true";
    if (state) {
        el.siblings('div.folder_storage').append($(`tbody#vm_view > tr.updated > td > span.outer.vms.folder-${id}-element`));
        el.attr('expanded', 'false');
    } else {
        el.parent().after(el.siblings('div.folder_storage').children());
        el.attr('expanded', 'true');
    }

};

/**
 * Removie the folder
 * @param {string} id the id of the folder
 */
const rmDockerFolder = (id) => {
    // Ask for a confirmation
    swal({
        title: 'Are you sure?',
        text: `Remove folder: ${globalFolders.docker[id].name}`,
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
        await $.get('/plugins/folder.view/server/delete.php?type=docker&id=' + id).promise();
        loadedFolder = false;
        setTimeout(loadlist(), 500)
    });
};

/**
 * Removie the folder
 * @param {string} id the id of the folder
 */
const rmVMFolder = (id) => {
    // Ask for a confirmation
    swal({
        title: 'Are you sure?',
        text: `Remove folder: ${globalFolders.vm[id].name}`,
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
const editDockerFolder = (id) => {
    location.href = "/Docker/Folder?type=docker&id=" + id;
};

/**
 * Redirect to the page to edit the folder
 * @param {string} id the id of the folder
 */
const editVMFolder = (id) => {
    location.href = "/VMs/Folder?type=vm&id=" + id;
};

/**
 * Atach the menu when clicking the folder icon
 * @param {string} id the id of the folder
 */
const addDockerFolderContext = (id) => {
    // get the expanded status, needed to swap expand/ compress
    const exp = $(`tbody#docker_view > tr.updated > td > span.outer.apps > #folder-id-${id}`).attr('expanded') === "true";
    let opts = [];
    context.settings({
        right: false,
        above: false
    });

    opts.push({
        text: exp ? 'Compress' : 'Expand',
        icon: exp ? 'fa-minus' : 'fa-plus',
        action: (e) => { e.preventDefault(); expandFolderDcoker(id); }
    });
    opts.push({
        divider: true
    });

    opts.push({
        text: 'Edit',
        icon: 'fa-wrench',
        action: (e) => { e.preventDefault(); editDockerFolder(id); }
    });

    opts.push({
        divider: true
    });

    opts.push({
        text: 'Remove',
        icon: 'fa-trash',
        action: (e) => { e.preventDefault(); rmDockerFolder(id); }
    });


    context.attach(`#folder-id-${id}`, opts);
};

/**
 * Atach the menu when clicking the folder icon
 * @param {string} id the id of the folder
 */
const addVMFolderContext = (id) => {
    // get the expanded status, needed to swap expand/ compress
    const exp = $(`tbody#vm_view > tr.updated > td > span.outer.vms > #folder-id-${id}`).attr('expanded') === "true";
    let opts = [];
    context.settings({
        right: false,
        above: false
    });

    opts.push({
        text: exp ? 'Compress' : 'Expand',
        icon: exp ? 'fa-minus' : 'fa-plus',
        action: (e) => { e.preventDefault(); expandFolderVM(id); }
    });
    opts.push({
        divider: true
    });

    opts.push({
        text: 'Edit',
        icon: 'fa-wrench',
        action: (e) => { e.preventDefault(); editVMFolder(id); }
    });

    opts.push({
        divider: true
    });

    opts.push({
        text: 'Remove',
        icon: 'fa-trash',
        action: (e) => { e.preventDefault(); rmVMFolder(id); }
    });


    context.attach(`#folder-id-${id}`, opts);
};

// Global variables
let loadedFolder = false;
let globalFolders = {};
const folderRegex = /^folder-/;
let folderDebugMode = false;
let folderDebugModeWindow = [];

// Patching the original function to make sure the containers are rendered before insering the folder
window.loadlist_original = loadlist;
window.loadlist = (x) => {
    loadedFolder = false;
    loadlist_original(x);
};

// this is needed to trigger the funtion to create the folders
$.ajaxPrefilter((options, originalOptions, jqXHR) => {
    if (options.url === "/webGui/include/DashboardApps.php" && !loadedFolder) {
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