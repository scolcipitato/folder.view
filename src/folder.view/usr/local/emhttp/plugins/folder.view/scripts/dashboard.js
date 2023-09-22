/**
 * Handles the creation of all folders
 */
const createFolders = async () => {
    // ########################################
    // ##########       DOCKER       ##########
    // ########################################

    // if docker is enabled
    if($('tbody#docker_view').length > 0) {

        let prom = await Promise.all(folderReq.docker);
        // Parse the results
        let folders = JSON.parse(prom[0]);
        const unraidOrder = JSON.parse(prom[1]);
        const containersInfo = JSON.parse(prom[2]);
        let order = JSON.parse(prom[3]);
    
        // Filter the order to get the container that aren't in the order, this happen when a new container is created
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
                version: (await $.get('/plugins/folder.view/server/version.php').promise()).trim(),
                folders,
                unraidOrder,
                originalOrder: JSON.parse(await $.get('/plugins/folder.view/server/read_unraid_order.php?type=docker').promise()),
                newOnes,
                order,
                containersInfo
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
            if ((globalFolders.docker && globalFolders.docker[id].status.expanded) || value.settings.expand_dashboard) {
                value.status.expanded = true;
                expandFolderDocker(id);
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

        const prom = await Promise.all(folderReq.vm);
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
                version: (await $.get('/plugins/folder.view/server/version.php').promise()).trim(),
                folders,
                unraidOrder,
                originalOrder: JSON.parse(await $.get('/plugins/folder.view/server/read_unraid_order.php?type=vm').promise()),
                newOnes,
                order,
                vmInfo
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
            if ((globalFolders.vms && globalFolders.vms[id].status.expanded) || value.settings.expand_dashboard) {
                value.status.expanded = true;
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
    let started = 0;
    let autostart = 0;
    let autostartStarted = 0;

    // If regex is present searches all containers for a match and put them inside the folder containers
    if (folder.regex) {
        const regex = new RegExp(folder.regex);
        folder.containers = folder.containers.concat(order.filter(el => regex.test(el)));
    }

    folder.containers = folder.containers.concat(order.filter(el => containersInfo[el]?.Labels['folder.view'] === folder.name));

    // the HTML template for the folder
    const fld = `<div class="folder-showcase-outer-${id} folder-showcase-outer"><span class="outer solid apps stopped folder-docker"><span id="folder-id-${id}" onclick='addDockerFolderContext("${id}")' class="hand docker folder-hand-docker"><img src="${folder.icon}" class="img folder-img-docker" onerror="this.src='/plugins/dynamix.docker.manager/images/question.png';"></span><span class="inner folder-inner-docker"><span class="folder-appname-docker">${folder.name}</span><br><i class="fa fa-square stopped red-text folder-load-status-docker"></i><span class="state folder-state-docker">${$.i18n('stopped')}</span></span><div class="folder-storage"></div></span><div class="folder-showcase-${id} folder-showcase"></div></div>`;

    // insertion at position of the folder
    if (position === 0) {
        $('tbody#docker_view > tr.updated > td').children().eq(position).before($(fld));
    } else {
        $('tbody#docker_view > tr.updated > td').children().eq(position - 1).after($(fld));
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
            const ct = containersInfo[container];

            // grab the storage folder
            const element = $(`tbody#docker_view span#folder-id-${id}`).siblings('div.folder-storage');
            // grab the container and put it onto the storage
            element.append($('tbody#docker_view > tr.updated > td').children().eq(index).addClass(`folder-${id}-element`).addClass(`folder-element-docker`).addClass(`${!(ct.info.State.Autostart === false) ? 'autostart' : ''}`));
            

            newFolder[container] = {};
            newFolder[container].id = ct.shortId;
            newFolder[container].pause = ct.info.State.Paused;
            newFolder[container].state = ct.info.State.Running;
            newFolder[container].update = ct.info.State.Updated === false;

            if(folderDebugMode) {
                console.log(`Docker ${newFolder[container].id}(${offsetIndex}, ${index}) => ${id}`);
            }

            // set the status of the folder
            upToDate = upToDate && !newFolder[container].update;
            started += newFolder[container].state ? 1 : 0;
            autostart += !(ct.info.State.Autostart === false) ? 1 : 0;
            autostartStarted += ((!(ct.info.State.Autostart === false)) && newFolder[container].state) ? 1 : 0;
        }
    }

    // replace the old containers array with the newFolder object
    folder.containers = newFolder;

    //temp var
    const sel = $(`tbody#docker_view span#folder-id-${id}`)
    
    //set tehe status of a folder

    if (!upToDate) {
        sel.next('span.inner').children().first().addClass('blue-text');
    }

    if (started) {
        sel.parent().removeClass('stopped').addClass('started');
        sel.next('span.inner').children('i').replaceWith($('<i class="fa fa-play started green-text"></i>'));
        sel.next('span.inner').children('span.state').text(`${started}/${Object.entries(folder.containers).length} ${$.i18n('started')}`);
    }

    if(autostart === 0) {
        $(`div.folder-showcase-outer-${id} > span.outer`).addClass('no-autostart');
    } else if (autostart > 0 && autostartStarted === 0) {
        $(`div.folder-showcase-outer-${id} > span.outer`).addClass('autostart-off');
    } else if (autostart > 0 && autostartStarted > 0 && autostart !== autostartStarted) {
        $(`div.folder-showcase-outer-${id} > span.outer`).addClass('autostart-partial');
    } else if (autostart > 0 && autostartStarted > 0 && autostart === autostartStarted) {
        $(`div.folder-showcase-outer-${id} > span.outer`).addClass('autostart-full');
    }

    // set the status
    folder.status = {};
    folder.status.upToDate = upToDate;
    folder.status.started = started;
    folder.status.autostart = autostart;
    folder.status.autostartStarted = autostartStarted;
    folder.status.expanded = false;
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
    let started = 0;

    // If regex is present searches all containers for a match and put them inside the folder containers
    if (folder.regex) {
        const regex = new RegExp(folder.regex);
        folder.containers = folder.containers.concat(order.filter(el => regex.test(el)));
    }

    // the HTML template for the folder
    const fld = `<div class="folder-showcase-outer-${id} folder-showcase-outer"><span class="outer solid vms stopped folder-vm"><span id="folder-id-${id}" onclick='addVMFolderContext("${id}")' class="hand vm folder-hand-vm"><img src="${folder.icon}" class="img" onerror='this.src="/plugins/dynamix.docker.manager/images/question.png"'></span><span class="inner folder-inner-vm">${folder.name}<br><i class="fa fa-square stopped red-text folder-load-status-vm"></i><span class="state folder-state-vm">${$.i18n('stopped')}</span></span><div class="folder-storage" style="display:none"></div></span><div class="folder-showcase-${id} folder-showcase"></div></div>`;

    // insertion at position of the folder
    if (position === 0) {
        $('tbody#vm_view > tr.updated > td').children().eq(position).before($(fld));
    } else {
        $('tbody#vm_view > tr.updated > td').children().eq(position - 1).after($(fld));
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
            $(`tbody#vm_view span#folder-id-${id}`).siblings('div.folder-storage').append($('tbody#vm_view > tr.updated > td').children().eq(index).addClass(`folder-${id}-element`).addClass(`folder-element-vm`));

            if(folderDebugMode) {
                console.log(`VM ${newFolder[container].id}(${offsetIndex}, ${index}) => ${id}`);
            }
            
            // set the status of the folder
            started += ct.state!=="shutoff" ? 1 : 0;
        }
    }

    // replace the old containers array with the newFolder object
    folder.containers = newFolder;

    
    //set tehe status of a folder
    if (started) {
        const sel = $(`tbody#vm_view span#folder-id-${id}`);
        sel.parent().removeClass('stopped').addClass('started');
        sel.next('span.inner').children('i').replaceWith($('<i class="fa fa-play started green-text"></i>'));
        sel.next('span.inner').children('span.state').text(`${started}/${Object.entries(folder.containers).length} ${$.i18n('started')}`);
    }

    // set the status
    folder.status = {};
    folder.status.started = started;
    folder.status.expanded = false;
};

/**
 * Handle the dropdown expand button of folders
 * @param {string} id the id of the folder
 */
const expandFolderDocker = (id) => {
    const el = $(`tbody#docker_view > tr.updated > td span.outer.apps > span#folder-id-${id}`);
    const state = el.attr('expanded') === "true";
    if (state) {
        el.siblings('div.folder-storage').append(el.parents().siblings('div.folder-showcase').children());
        el.attr('expanded', 'false');
    } else {
        el.parents().siblings('div.folder-showcase').append(el.siblings('div.folder-storage').children());
        el.attr('expanded', 'true');
    }
    $(`tbody#docker_view .folder-showcase-outer-${id}`).attr('expanded', !state ? 'true' : 'false');
    if(globalFolders.docker) {
        globalFolders.docker[id].status.expanded = !state;
    }
};

/**
 * Handle the dropdown expand button of folders
 * @param {string} id the id of the folder
 */
const expandFolderVM = (id) => {
    const el = $(`tbody#vm_view > tr.updated > td span.outer.vms > span#folder-id-${id}`);
    const state = el.attr('expanded') === "true";
    if (state) {
        el.siblings('div.folder-storage').append(el.parents().siblings('div.folder-showcase').children());
        el.attr('expanded', 'false');
    } else {
        el.parents().siblings('div.folder-showcase').append(el.siblings('div.folder-storage').children());
        el.attr('expanded', 'true');
    }
    $(`tbody#vm_view .folder-showcase-outer-${id}`).attr('expanded', !state ? 'true' : 'false');
    if(globalFolders.vms) {
        globalFolders.vms[id].status.expanded = !state;
    }
};

/**
 * Removie the folder
 * @param {string} id the id of the folder
 */
const rmDockerFolder = (id) => {
    // Ask for a confirmation
    swal({
        title: $.i18n('are-you-sure'),
        text: `${$.i18n('remove-folder')}: ${globalFolders.docker[id].name}`,
        type: 'warning',
        html: true,
        showCancelButton: true,
        confirmButtonText: $.i18n('yes-delete'),
        cancelButtonText: $.i18n('cancel'),
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
        title: $.i18n('are-you-sure'),
        text: `${$.i18n('remove-folder')}: ${globalFolders.vms[id].name}`,
        type: 'warning',
        html: true,
        showCancelButton: true,
        confirmButtonText: $.i18n('yes-delete'),
        cancelButtonText: $.i18n('cancel'),
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
    location.href = location.pathname + "/Folder?type=docker&id=" + id;
};

/**
 * Redirect to the page to edit the folder
 * @param {string} id the id of the folder
 */
const editVMFolder = (id) => {
    location.href = location.pathname + "/Folder?type=vm&id=" + id;
};

/**
 * Atach the menu when clicking the folder icon
 * @param {string} id the id of the folder
 */
const addDockerFolderContext = (id) => {
    // get the expanded status, needed to swap expand/ compress
    const exp = $(`tbody#docker_view .folder-showcase-outer-${id}`).attr('expanded') === "true";
    let opts = [];
    context.settings({
        right: false,
        above: false
    });

    opts.push({
        text: exp ? $.i18n('compress') : $.i18n('expand'),
        icon: exp ? 'fa-minus' : 'fa-plus',
        action: (e) => { e.preventDefault(); expandFolderDocker(id); }
    });

    opts.push({
        divider: true
    });
    
    opts.push({
        text: $.i18n('start'),
        icon: 'fa-play',
        action: (e) => { e.preventDefault(); actionFolderDocker(id, "start"); }
    });
    opts.push({
        text: $.i18n('stop'),
        icon: 'fa-stop',
        action: (e) => { e.preventDefault(); actionFolderDocker(id, "stop"); }
    });
    
    opts.push({
        text: $.i18n('pause'),
        icon: 'fa-pause',
        action: (e) => { e.preventDefault(); actionFolderDocker(id, "pause"); }
    });

    opts.push({
        text: $.i18n('resume'),
        icon: 'fa-play-circle',
        action: (e) => { e.preventDefault(); actionFolderDocker(id, "resume"); }
    });

    opts.push({
        text: $.i18n('restart'),
        icon: 'fa-refresh',
        action: (e) => { e.preventDefault(); actionFolderDocker(id, "restart"); }
    });

    opts.push({
        divider: true
    });

    if(!globalFolders.docker[id].status.upToDate) {
        opts.push({
            text: $.i18n('update'),
            icon: 'fa-cloud-download',
            action: (e) => { e.preventDefault();  updateFolderDocker(id); }
        });
    } else {
        opts.push({
            text: $.i18n('update-force'),
            icon: 'fa-cloud-download',
            action: (e) => { e.preventDefault(); forceUpdateFolderDocker(id); }
        });
    }
    
    opts.push({
        divider: true
    });

    opts.push({
        text: $.i18n('edit'),
        icon: 'fa-wrench',
        action: (e) => { e.preventDefault(); editDockerFolder(id); }
    });

    opts.push({
        text: $.i18n('remove'),
        icon: 'fa-trash',
        action: (e) => { e.preventDefault(); rmDockerFolder(id); }
    });


    context.attach(`#folder-id-${id}`, opts);
};

/**
 * Force update all the containers inside a folder
 * @param {string} id the id of the folder
 */
const forceUpdateFolderDocker = (id) => {
    const folder = globalFolders.docker[id];
    openDocker('update_container ' + Object.keys(folder.containers).join('*'), $.i18n('updating', folder.name),'','loadlist');
};

/**
 * Update all the updatable containers inside a folder
 * @param {string} id the id of the folder
 */
const updateFolderDocker = (id) => {
    const folder = globalFolders.docker[id];
    let toUpdate = [];
    for (const name of Object.keys(folder.containers)) {
        if(folder.containers[name].update > 0) {
            toUpdate.push(name);
        }
    }
    openDocker('update_container ' + toUpdate.join('*'), $.i18n('updating', folder.name),'','loadlist');
};

/**
 * Perform an action for the entire folder
 * @param {string} id The id of the folder
 * @param {string} action the desired action
 */
const actionFolderDocker = async (id, action) => {
    const folder =  globalFolders.docker[id];
    const cts = Object.keys(folder.containers);
    let proms = [];
    let errors;

    $(`i#load-folder-${id}`).removeClass('fa-play fa-square fa-pause').addClass('fa-refresh fa-spin');
    $('div.spinner.fixed').show('slow');

    for (let index = 0; index < cts.length; index++) {
        const ct = folder.containers[cts[index]];
        const cid = ct.id;
        let pass;
        switch (action) {
            case "start":
                pass = !ct.state;
                break;
            case "stop":
                pass = ct.state;
                break;
            case "pause":
                pass = ct.state && !ct.pause;
                break;
            case "resume":
                pass = ct.state && ct.pause;
                break;
            case "resume":
                pass = true;
                break;
            default:
                pass = false;
                break;
        }
        if(pass) {
            proms.push($.post(eventURL, {action: action, container:cid}, null,'json').promise());
        }
    }

    proms = await Promise.all(proms);
    errors = proms.filter(e => e.success !== true);
    errors = errors.map(e => e.success);

    if(errors.length > 0) {
        swal({
            title: $.i18n('exec-error'),
            text:errors.join('<br>'),
            type:'error',
            html:true,
            confirmButtonText:'Ok'
        }, loadlist);
    }

    loadlist();
    $('div.spinner.fixed').hide('slow');
}

/**
 * Atach the menu when clicking the folder icon
 * @param {string} id the id of the folder
 */
const addVMFolderContext = (id) => {
    // get the expanded status, needed to swap expand/ compress
    const exp = $(`tbody#vm_view .folder-showcase-outer-${id}`).attr('expanded') === "true";
    let opts = [];
    context.settings({
        right: false,
        above: false
    });

    opts.push({
        text: exp ? $.i18n('compress') : $.i18n('expand'),
        icon: exp ? 'fa-minus' : 'fa-plus',
        action: (e) => { e.preventDefault(); expandFolderVM(id); }
    });
    
    opts.push({
        divider: true
    });

    opts.push({
        text: $.i18n('start'),
        icon: "fa-play",
        action: (e) => { e.preventDefault(); actionFolderVM(id, 'domain-start'); }
    });

    opts.push({
        text: $.i18n('stop'),
        icon: "fa-stop",
        action: (e) => { e.preventDefault(); actionFolderVM(id, 'domain-stop'); }
    });

    opts.push({
        text: $.i18n('pause'),
        icon: "fa-pause",
        action: (e) => { e.preventDefault(); actionFolderVM(id, 'domain-pause'); }
    });

    opts.push({
        text: $.i18n('resume'),
        icon: "fa-play-circle",
        action: (e) => { e.preventDefault(); actionFolderVM(id, 'domain-resume'); }
    });

    opts.push({
        text: $.i18n('restart'),
        icon: "fa-refresh",
        action: (e) => { e.preventDefault(); actionFolderVM(id, 'domain-restart'); }
    });

    opts.push({
        text: $.i18n('hibernate'),
        icon: "fa-bed",
        action: (e) => { e.preventDefault(); actionFolderVM(id, 'domain-pmsuspend'); }
    });

    opts.push({
        text: $.i18n('force-stop'),
        icon: "fa-bomb",
        action: (e) => { e.preventDefault(); actionFolderVM(id, 'domain-destroy'); }
    });

    opts.push({
        divider: true
    });

    opts.push({
        text: $.i18n('edit'),
        icon: 'fa-wrench',
        action: (e) => { e.preventDefault(); editVMFolder(id); }
    });

    opts.push({
        text: $.i18n('remove'),
        icon: 'fa-trash',
        action: (e) => { e.preventDefault(); rmVMFolder(id); }
    });


    context.attach(`#folder-id-${id}`, opts);
};

/**
 * Perform an action for the entire folder
 * @param {string} id The id of the folder
 * @param {string} action the desired action
 */
const actionFolderVM = async (id, action) => {
    const folder =  globalFolders.vms[id];
    const cts = Object.keys(folder.containers);
    let proms = [];
    let errors;
    const oldAction = action;

    $(`i#load-folder-${id}`).removeClass('fa-play fa-square fa-pause').addClass('fa-refresh fa-spin');
    $('div.spinner.fixed').show('slow');

    for (let index = 0; index < cts.length; index++) {
        const ct = folder.containers[cts[index]];
        const cid = ct.id;
        let pass;
        action = oldAction;
        switch (action) {
            case "domain-start":
                pass = ct.state !== "running" && ct.state !== "pmsuspended" && ct.state !== "paused" && ct.state !== "unknown";
                break;
            case "domain-stop":
            case "domain-pause":
            case "domain-restart":
            case "domain-pmsuspend":
                pass = ct.state === "running";
                break;
            case "domain-resume":
                pass = ct.state === "paused" || ct.state === "unknown";
                if(!pass) {
                    pass = ct.state === "pmsuspended";
                    action = "domain-pmwakeup";
                }
                break;
            case "domain-destroy":
                pass = ct.state === "running" || ct.state === "pmsuspended" || ct.state === "paused" || ct.state === "unknown";
                break;
            default:
                pass = false;
                break;
        }
        if(pass) {
            proms.push($.post('/plugins/dynamix.vm.manager/include/VMajax.php', {action: action, uuid: cid}, null,'json').promise());
        }
    }

    proms = await Promise.all(proms);
    errors = proms.filter(e => e.success !== true);
    errors = errors.map(e => e.success);

    if(errors.length > 0) {
        swal({
            title: $.i18n('exec-error'),
            text:errors.join('<br>'),
            type:'error',
            html:true,
            confirmButtonText:'Ok'
        }, loadlist);
    }

    loadlist();
    $('div.spinner.fixed').hide('slow');
}

// Global variables
let loadedFolder = false;
let globalFolders = {};
const folderRegex = /^folder-/;
let folderDebugMode = false;
let folderDebugModeWindow = [];
let folderReq = {
    docker: [],
    vm: []
};

// Patching the original function to make sure the containers are rendered before insering the folder
window.loadlist_original = loadlist;
window.loadlist = (x) => {
    loadedFolder = false;
    if($('tbody#docker_view').length > 0) { 
        folderReq.docker = [
            // Get the folders
            $.get('/plugins/folder.view/server/read.php?type=docker').promise(),
            // Get the order as unraid sees it
            $.get('/plugins/folder.view/server/read_order.php?type=docker').promise(),
            // Get the info on containers, needed for autostart, update and started
            $.get('/plugins/folder.view/server/read_info.php?type=docker').promise(),
            // Get the order that is shown in the webui
            $.get('/plugins/folder.view/server/read_unraid_order.php?type=docker').promise()
        ];
    }

    if($('tbody#vm_view').length > 0) {
        folderReq.vm = [
            // Get the folders
            $.get('/plugins/folder.view/server/read.php?type=vm').promise(),
            // Get the order as unraid sees it
            $.get('/plugins/folder.view/server/read_order.php?type=vm').promise(),
            // Get the info on VMs, needed for autostart and started
            $.get('/plugins/folder.view/server/read_info.php?type=vm').promise(),
            // Get the order that is shown in the webui
            $.get('/plugins/folder.view/server/read_unraid_order.php?type=vm').promise()
        ];
    }
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