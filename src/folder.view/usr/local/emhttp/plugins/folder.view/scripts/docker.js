/**
 * Handles the creation of all folders
 */
const createFolders = async () => {
    const prom = await Promise.all(folderReq);
    // Parse the results
    let folders = JSON.parse(prom[0]);
    const unraidOrder = JSON.parse(prom[1]);
    const containersInfo = JSON.parse(prom[2]);
    let order = JSON.parse(prom[3]);

    // Filter the order to get the container that aren't in the order, this happen when a new container is created
    const newOnes = order.filter(x => !unraidOrder.includes(x));

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
            originalOrder: JSON.parse(await $.get('/plugins/folder.view/server/read_docker_webui_order.php').promise()),
            newOnes,
            order,
            containersInfo
        })));
        element.setAttribute('download', 'debug-DOCKER.json');
    
        element.style.display = 'none';
        document.body.appendChild(element);
    
        element.click();
    
        document.body.removeChild(element);
        console.log('Order:', [...order]);
    }

    let foldersDone = {};

    if(folderobserver) {
        folderobserver.disconnect();
        folderobserver = undefined;
    }

    folderobserver = new MutationObserver((mutationList, observer) => {
        for (const mutation of mutationList) {
            if(/^load-/.test(mutation.target.id)) {
                $('i#folder-' + mutation.target.id).attr('class', mutation.target.className)
            }
        }
    });

    // Draw the folders in the order
    for (let key = 0; key < order.length; key++) {
        const container = order[key];
        if (container && folderRegex.test(container)) {
            let id = container.replace(folderRegex, '');
            if (folders[id]) {
                createFolder(folders[id], id, key, order, containersInfo, Object.keys(foldersDone));
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
        createFolder(value, id, 0, order, containersInfo, Object.keys(foldersDone));
        // Move the folder to the done object and delete it from the undone one
        foldersDone[id] = folders[id];
        delete folders[id];
    }

    // Expand folders that are set to be expanded by default, this is here because is easier to work with all compressed folder when creating them
    for (const [id, value] of Object.entries(foldersDone)) {
        if ((globalFolders[id] && globalFolders[id].status.expanded) || value.settings.expand_tab) {
            dropDownButton(id);
        }
    }

    // Assing the folder done to the global object
    globalFolders = foldersDone;
    
    folderDebugMode = false;
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
const createFolder = (folder, id, position, order, containersInfo, foldersDone) => {
    // default varibles
    let upToDate = true;
    let started = 0;
    let autostart = false;

    // Get if the advanced view is enabled
    const advanced = $.cookie('docker_listview_mode') == 'advanced';

    // If regex is present searches all containers for a match and put them inside the folder containers
    if (folder.regex) {
        const regex = new RegExp(folder.regex);
        folder.containers = folder.containers.concat(order.filter(el => regex.test(el)));
    }

    // the HTML template for the folder
    const fld = `<tr class="sortable folder-id-${id} ${folder.settings.preview_hover ? 'hover' : ''} folder"><td class="ct-name folder-name"><div class="folder-name-sub"><i class="fa fa-arrows-v mover orange-text"></i><span class="outer folder-outer"><span id="${id}" onclick="addDockerFolderContext('${id}')" class="hand folder-hand"><img src="${folder.icon}" class="img folder-img" onerror='this.src="/plugins/dynamix.docker.manager/images/question.png"'></span><span class="inner folder-inner"><span class="appname" style="display: none;"><a>folder-${id}</a></span><a class="exec folder-appname" onclick='editFolder("${id}")'>${folder.name}</a><br><i id="load-folder-${id}" class="fa fa-square stopped red-text folder-load-status"></i><span class="state folder-state">stopped</span></span></span><button class="dropDown-${id} folder-dropdown" onclick="dropDownButton('${id}')" ><i class="fa fa-chevron-down" aria-hidden="true"></i></button></div></td><td class="updatecolumn folder-update"><span class="green-text folder-update-text"><i class="fa fa-check fa-fw"></i>up-to-date</span></td><td colspan="3"><div class="folder-storage"></div><div class="folder-preview"></div></td><td class="advanced folder-advanced" ${advanced ? 'style="display: table-cell;"' : ''}><span class="cpu-folder-${id} folder-cpu">0%</span><div class="usage-disk mm folder-load"><span id="cpu-folder-${id} folder-cpu-bar" style="width:0%"></span><span></span></div><br><span class="mem-folder-${id} folder-mem">0B / 0B</span></td><td class="folder-autostart"><input type="checkbox" id="folder-${id}-auto" class="autostart" style="display:none"><div style="clear:left"></div></td><td></td></tr>`;

    //border:solid ${$('body').css('color')} 1px;

    // insertion at position of the folder
    if (position === 0) {
        $('#docker_list > tr.sortable').eq(position).before($(fld));
    } else {
        $('#docker_list > tr.sortable').eq(position - 1).after($(fld));
    }

    // create the *cool* unraid button for the autostart
    $(`#folder-${id}-auto`).switchButton({ labels_placement: 'right', off_label: "Off", on_label: "On", checked: false });

    // Set the border if enabled and set the color
    if(folder.settings.preview_border) {
        $(`tr.folder-id-${id}  div.folder-preview`).css('border', `solid ${folder.settings.preview_border_color} 1px`);
    }

    $(`tr.folder-id-${id} div.folder-preview`).addClass(`folder-preview-${folder.settings.preview}`);

    // select the preview function to use
    let addPreview;
    switch (folder.settings.preview) {
        case 1:
            addPreview = (id) => {
                $(`tr.folder-id-${id} div.folder-preview`).append($(`tr.folder-id-${id} div.folder-storage > tr > td.ct-name > span.outer:last`).clone());
                let tmpId = $(`tr.folder-id-${id} div.folder-preview > span.outer:last`).find('i[id^="load-"]');
                tmpId.attr("id", "folder-" + tmpId.attr("id"));
            };
            break;
        case 2:
            addPreview = (id) => {
                $(`tr.folder-id-${id} div.folder-preview`).append($(`tr.folder-id-${id} div.folder-storage > tr > td.ct-name > span.outer > span.hand:last`).clone());
            };
            break;
        case 3:
            addPreview = (id) => {
                $(`tr.folder-id-${id} div.folder-preview`).append($(`tr.folder-id-${id} div.folder-storage > tr > td.ct-name > span.outer > span.inner:last`).clone());
                let tmpId = $(`tr.folder-id-${id} div.folder-preview > span.inner:last`).find('i[id^="load-"]');
                tmpId.attr("id", "folder-" + tmpId.attr("id"));
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
                    lstSpan.children('span.inner:last').append($(`tr.folder-id-${id} div.folder-storage > tr > td.ct-name > span.outer > span.inner > span.appname:last`).clone())
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

            // grab the container and put it onto the storage
            $(`tr.folder-id-${id} div.folder-storage`).append($('#docker_list > tr.sortable').eq(index).addClass(`folder-${id}-element`).addClass(`folder-element`).removeClass('sortable'));
            
            addPreview(id);

            const ct = containersInfo[container];

            newFolder[container] = {};
            newFolder[container].id = $(`tr.folder-id-${id} div.folder-storage > tr:last > td.ct-name > span.outer > span.hand`)[0].id;
            newFolder[container].pause = ct.paused ? 1 : 0;
            newFolder[container].state = ct.running ? 1 : 0;
            newFolder[container].update = ct.updated === "false" ? 1 : 0;

            if(folderDebugMode) {
                console.log(`${newFolder[container].id}(${offsetIndex}, ${index}) => ${id}`);
            }

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

            if (folder.settings.preview_update && ct.updated === "false") {
                sel = element.children('span.inner').children('span.blue-text');
                if (!sel.length) {
                    sel = element.children('span.blue-text');
                }
                sel.removeClass('blue-text').addClass('orange-text');
                sel.children('a.exec').addClass('orange-text');
            }

            if (folder.settings.preview_webui && ct.url) {
                sel = element.children('span.inner').last();
                if (!sel.length) {
                    sel = element;
                }
                sel.append($(`<span class="folder-element-webui"><a href="${ct.url}" target="_blank"><i class="fa fa-globe" aria-hidden="true"></i></a></span>`));
            }

            if (folder.settings.preview_logs) {
                sel = element.children('span.inner').last();
                if (!sel.length) {
                    sel = element;
                }
                sel.append($(`<span class="folder-element-logs"><a href="#" onclick="openTerminal('docker', '${container}', '.log')"><i class="fa fa-bars" aria-hidden="true"></i></a></span>`));
            }

            // set the status of the folder
            upToDate = upToDate && ct.updated !== "false";
            started += ct.running ? 1 : 0;
            autostart = autostart || ct.autostart;
        }
    }

    // replace the old containers array with the newFolder object
    folder.containers = newFolder;

    $(`tr.folder-id-${id} div.folder-storage span.outer`).get().forEach((e) => {
        folderobserver.observe(e, folderobserverConfig);
    });

    // wrap the preview with a div
    $(`tr.folder-id-${id} div.folder-preview > span`).wrap('<div class="folder-preview-wrapper"></div>');

    if(folder.settings.preview_vertical_bars) {
        $(`tr.folder-id-${id} div.folder-preview > div`).not(':last').after(`<div class="folder-preview-divider" style="border-color: ${folder.settings.preview_border_color};"></div>`);
    }

    //set tehe status of a folder

    if (!upToDate) {
        const sel = $(`tr.folder-id-${id} > td.updatecolumn`);
        sel.empty();
        sel.append($('<span class="orange-text folder-update-text" style="white-space:nowrap;"><i class="fa fa-flash fa-fw"></i> update ready</span>'));
    }

    if (started) {
        $(`tr.folder-id-${id} i#load-folder-${id}`).attr('class', 'fa fa-play started green-text folder-load-status');
        $(`tr.folder-id-${id} span.folder-state`).text(`${started}/${Object.entries(folder.containers).length} started`);
    }

    if (autostart) {
        $(`#folder-${id}-auto`).next().click();
    }

    // set the status
    folder.status = {};
    folder.status.upToDate = upToDate;
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
    const containers = $(`.folder-${id}-element`);
    for (const container of containers) {
        // Select the td with the switch inside
        const el = $(container).children('td.advanced').next();

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
        $(`tr.folder-id-${id} > td[colspan=3] > .folder-storage`).append($(`.folder-${id}-element`));
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
        await $.get('/plugins/folder.view/server/delete.php?type=docker&id=' + id).promise();
        setTimeout(loadlist(), 500)
    });
};

/**
 * Redirect to the page to edit the folder
 * @param {string} id the id of the folder
 */
const editFolder = (id) => {
    location.href = "/Docker/Folder?type=docker&id=" + id;
};

/**
 * Force update all the containers inside a folder
 * @param {string} id the id of the folder
 */
const forceUpdateFolder = (id) => {
    const folder = globalFolders[id];
    openDocker('update_container ' + Object.keys(folder.containers).join('*'),`Updating ${folder.name} folder containers`,'','loadlist');
};

/**
 * Update all the updatable containers inside a folder
 * @param {string} id the id of the folder
 */
const updateFolder = (id) => {
    const folder = globalFolders[id];
    let toUpdate = [];
    for (const name of Object.keys(folder.containers)) {
        if(folder.containers[name].update > 0) {
            toUpdate.push(name);
        }
    }
    openDocker('update_container ' + toUpdate.join('*'),`Updating ${folder.name} folder containers`,'','loadlist');
};

/**
 * Restart all the containers inside a folder
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
        const cid = folder.containers[cts[index]].id;
        proms.push($.post(eventURL, {action:'restart', container:cid}, null,'json').promise());
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
 * Pause all the started containers inside a folder
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
        if(ct.state === 1 && ct.pause === 0) {
            proms.push($.post(eventURL, {action:'pause', container:cid}, null,'json').promise());
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
 * Resume all the paused containers inside a folder
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
        if(ct.state === 1 && ct.pause === 1) {
            proms.push($.post(eventURL, {action:'resume', container:cid}, null,'json').promise());
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
 * Stop all the started containers inside a folder
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
        if(ct.state === 1) {
            proms.push($.post(eventURL, {action:'stop', container:cid}, null,'json').promise());
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
 * Start all the stopped containers inside a folder
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
        if(ct.state === 0) {
            proms.push($.post(eventURL, {action:'start', container:cid}, null,'json').promise());
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
const addDockerFolderContext = (id) => {
    let opts = [];

    context.settings({
        right: false,
        above: false
    });

    opts.push({
        text: 'Start',
        icon: 'fa-play',
        action: (e) => { e.preventDefault(); startFolder(id); }
    });
    opts.push({
        text: 'Stop',
        icon: 'fa-stop',
        action: (e) => { e.preventDefault(); stopFolder(id); }
    });
    
    opts.push({
        text: 'Pause',
        icon: 'fa-pause',
        action: (e) => { e.preventDefault(); pauseFolder(id); }
    });

    opts.push({
        text: 'Resume',
        icon: 'fa-play-circle',
        action: (e) => { e.preventDefault(); resumeFolder(id); }
    });

    opts.push({
        text: 'Restart',
        icon: 'fa-refresh',
        action: (e) => { e.preventDefault(); restartFolder(id); }
    });

    opts.push({
        divider: true
    });

    if(!globalFolders[id].status.upToDate) {
        opts.push({
            text: 'Update',
            icon: 'fa-cloud-download',
            action: (e) => { e.preventDefault();  updateFolder(id); }
        });
    } else {
        opts.push({
            text: 'Force update',
            icon: 'fa-cloud-download',
            action: (e) => { e.preventDefault(); forceUpdateFolder(id); }
        });
    }

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

// Patching the original function to make sure the containers are rendered before insering the folder
window.listview_original = listview;
window.listview = () => {
    listview_original();
    if (!loadedFolder) {
        createFolders();
        loadedFolder = true;
    }
};

window.loadlist_original = loadlist;
window.loadlist = () => {
    loadedFolder = false;
    folderReq = [
        // Get the folders
        $.get('/plugins/folder.view/server/read.php?type=docker').promise(),
        // Get the order as unraid sees it
        $.get('/plugins/folder.view/server/read_order.php?type=docker').promise(),
        // Get the info on containers, needed for autostart, update and started
        $.get('/plugins/folder.view/server/read_containers_info.php').promise(),
        // Get the order that is shown in the webui
        $.get('/plugins/folder.view/server/read_docker_webui_order.php').promise()
    ];
    loadlist_original();
};

// Get the number of CPU, nneded for a right display of the load
$.get('/plugins/folder.view/server/cpu.php').promise().then((data) => {
    cpus = parseInt(data);
    // Attach to the scoket and process the data
    dockerload.addEventListener('message', (e) => {
        let load = {};
        e.split('\n').forEach((e) => {
            const exp = e.split(';');
            load[exp[0]] = {
                cpu: exp[1],
                mem: exp[2].split(' / ')
            };
        });
        for (const [id, value] of Object.entries(globalFolders)) {
            let loadCpu = 0;
            let totalMem = 0;
            let loadMem = 0;
            for (const [cid, cvalue] of Object.entries(value.containers)) {
                const curLoad = load[cvalue.id] || { cpu: '0.00%', mem: ['0B', '0B'] };
                loadCpu += parseFloat(curLoad.cpu.replace('%', ''))/cpus;
                loadMem += memToB(curLoad.mem[0]);
                let tempTotalMem = memToB(curLoad.mem[1]);
                totalMem = (tempTotalMem > totalMem) ? tempTotalMem : totalMem;
            }
            $(`span.mem-folder-${id}`).text(`${bToMem(loadMem)} / ${bToMem(totalMem)}`);
            $(`span.cpu-folder-${id}`).text(`${loadCpu.toFixed(2)}%`);
            $(`span#cpu-folder-${id}`).css('width', `${loadCpu.toFixed(2)}%`)
        }
    });
});

/**
 * Convert memory unit to Bytes
 * @param {string} mem the unraid memory notation
 * @returns {number} number of bytes
 */
const memToB = (mem) => {
    const unit = mem.match(/[a-zA-Z]/g).join('');
    mem = parseFloat(mem.replace(unit, ''));
    let loadMem = 0;
    switch (unit) {
        case 'KiB':
            loadMem += (2 ** 10) * mem;
            break;
        case 'MiB':
            loadMem = (2 ** 20) * mem;
            break;
        case 'GiB':
            loadMem = (2 ** 30) * mem;
            break;
        case 'TiB':
            loadMem = (2 ** 40) * mem;
            break;
        case 'PiB':
            loadMem = (2 ** 50) * mem;
            break;
        case 'EiB':
            loadMem = (2 ** 60) * mem;
            break;
        case 'ZiB':
            loadMem = (2 ** 70) * mem;
            break;
        case 'YiB':
            loadMem = (2 ** 80) * mem;
            break;
        default:
            loadMem = 1 * mem;
            break;
    }
    return loadMem;
};

/**
 * Convert Bytes to memory units
 * @param {number} b the number of bytes
 * @returns {string} a string with the right notation and right unit
 */
const bToMem = (b) => {
    const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let index = 0;
    while (b >= 1024) {
        b /= 1024;
        index++;
    }
    return b.toFixed(2) + units[index];
};

// Global variables
let cpus = 1;
let loadedFolder = false;
let globalFolders = {};
const folderRegex = /^folder-/;
let folderDebugMode = false;
let folderDebugModeWindow = [];
let folderobserver;
let folderobserverConfig = {
    subtree: true,
    attributes: true
};
let folderReq = [];

// Add the button for creating a folder
const createFolderBtn = () => { location.href = "/Docker/Folder?type=docker" };
$('<input type="button" onclick="createFolderBtn()" value="Add Folder" style="display:none">').insertAfter('table#docker_containers');

// This is needed because unraid don't like the folder and the number are set incorrectly, this intercept the request and change the numbers to make the order appear right, this is important for the autostart and to draw the folders
$.ajaxPrefilter((options, originalOptions, jqXHR) => {
    if (options.url === "/plugins/dynamix.docker.manager/include/UserPrefs.php") {
        const data = new URLSearchParams(options.data);
        const containers = data.get('names').split(';');
        let num = "";
        for (let index = 0; index < containers.length - 1; index++) {
            num += index + ';'
        }
        data.set('index', num);
        options.data = data.toString();
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