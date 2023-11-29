// list of element to select
let choose = [];
// element selected by the regex string
let selectedRegex = [];
// element selected manually
let selected = [];
// docker or vm?
const type = new URLSearchParams(location.search).get('type');
//id of the folder if present
const id = new URLSearchParams(location.search).get('id');

const rgbToHex = (rgb) => {
    rgb = rgb.slice(4, -1).split(', ');
    return "#" + (1 << 24 | rgb[0] << 16 | rgb[1] << 8 | rgb[2]).toString(16).slice(1);
}

$('div.canvas > form')[0].preview_border_color.value = rgbToHex($('body').css('color'));

(async () => {
    // if editing a vm hide docker related settings
    if (type !== 'docker') {
        $('[constraint*="docker"]').hide();
    }
    // get folders
    let folders = JSON.parse(await $.get(`/plugins/folder.view/server/read.php?type=${type}`).promise());
    // get the list of element docker/vm
    let typeFilter;
    if (type === 'docker') {
        typeFilter = (e) => {
            return {
                'Name': e.info.Name,
                'Icon': e.info.Config.Labels['net.unraid.docker.icon'],
                'Label': e.info.Config.Labels['folder.view']
            }
        };
    } else if (type === 'vm') {
        typeFilter = (e) => {
            return {
                'Name': e.name,
                'Icon': e.icon,
                'Label': undefined
            }
        };
    }

    choose = Object.values(JSON.parse(await $.get(`/plugins/folder.view/server/read_info.php?type=${type}`).promise())).map(typeFilter);

    // if editing a folder and not creating one
    if (id) {
        // select the folder and delete it from the list
        const currFolder = folders[id];
        delete folders[id];

        // set the value of the form
        const form = $('div.canvas > form')[0];
        form.name.value = currFolder.name;
        form.icon.value = currFolder.icon;
        form.preview.value = currFolder.settings.preview.toString();
        form.preview_hover.checked = currFolder.settings.preview_hover;
        form.preview_update.checked = currFolder.settings.preview_update;
        form.preview_text_width.value = currFolder.settings.preview_text_width || '';
        form.preview_grayscale.checked = currFolder.settings.preview_grayscale;
        form.preview_webui.checked = currFolder.settings.preview_webui;
        form.preview_logs.checked = currFolder.settings.preview_logs;
        form.preview_console.checked = currFolder.settings.preview_console || false;
        form.preview_vertical_bars.checked = currFolder.settings.preview_vertical_bars || false;
        form.context.value = currFolder.settings.context?.toString() || '1';
        form.context_trigger.value = currFolder.settings.context_trigger?.toString() || '0';
        form.context_graph.value = currFolder.settings.context_graph?.toString() || '1';
        form.context_graph_time.value = currFolder.settings.context_graph_time?.toString() || '60';
        form.preview_border.checked = currFolder.settings.preview_border || false;
        form.preview_border_color.value = currFolder.settings.preview_border_color || rgbToHex($('body').css('color'));
        form.update_column.checked = currFolder.settings.update_column || false;
        form.default_action.checked = currFolder.settings.default_action || false;
        form.expand_tab.checked = currFolder.settings.expand_tab;
        form.expand_dashboard.checked = currFolder.settings.expand_dashboard;
        form.regex.value = currFolder.regex;
        for (const ct of currFolder.containers) {
            const index = choose.findIndex((e) => e.Name === ct);
            if (index > -1) {
                selected.push(choose.splice(index, 1)[0]);
            }
        };

        currFolder.actions?.forEach((e, i) => {
            $('.custom-action-wrapper').append(`<div class="custom-action-n-${i}">${e.name} <button onclick="return customAction(${i});"><i class="fa fa-pencil" aria-hidden="true"></i></button><button onclick="return rCcustomAction(${i});"><i class="fa fa-trash" aria-hidden="true"></i></button><input type="hidden" name="custom_action[]" value="${btoa(JSON.stringify(e))}"></div>`);
        });


        // make the ui respond to the previus changes
        updateForm();
        updateRegex(form.regex);
        updateIcon(form.icon);
    }

    // create the *cool* unraid button for the autostart
    $('input.basic-switch').switchButton({ labels_placement: 'right', off_label: $.i18n('off'), on_label: $.i18n('on')});

    // iterate over the folders
    for (const [id, value] of Object.entries(folders)) {
        // match the element to the regex
        if (value.regex) {
            const regex = new RegExp(value.regex);
            for (const container of choose) {
                if (regex.test(container.Name)) {
                    value.containers.push(container.Name);
                }
            }
        }

        // remove the containers from the order
        for (const container of value.containers) {
            const index = choose.findIndex((e) => e.Name === container);
            if (index > -1) {
                choose.splice(index, 1);
            }
        }
    }

    updateList();
})();

/**
 * Update the folder icon when editing the respective field
 * @param {*} e the element
 */
const updateIcon = (e) => {
    e.previousElementSibling.src = e.value;
};

/**
 * Update the regex selection when editing the respective field
 * @param {*} e the element
 */
const updateRegex = (e) => {
    choose = choose.concat(selectedRegex);
    const fldName = $('[name="name"]')[0].value;
    selectedRegex = choose.filter(el => el.Label === fldName);
    if (e.value) {
        const regex = new RegExp(e.value);
        for (let i = 0; i < choose.length; i++) {
            if (regex.test(choose[i].Name)) {
                const tmpSel = choose.splice(i, 1)[0];
                if(!selectedRegex.includes(tmpSel)) {
                    selectedRegex.push(tmpSel);
                }
                i--;
            }
        }
    }
    updateList();
};

/**
 * Update the setting visibility according to the preview setting
 * @param {*} e the element
 */
const previewChange = (e) => {
    $('[constraint^="preview-"]').hide();
    $(`[constraint*="preview-${e.value}"]`).show();
    if (type !== 'docker') {
        $('[constraint*="docker"]').hide();
    }
};

/**
 * Update the setting visibility according to the changin of settings
 */
const updateForm = () => {
    const form = $('div.canvas > form')[0];
    $('[constraint*="preview-"]').hide();
    $(`[constraint*="preview-${form.preview.value}"]`).show();
    $('[constraint*="context-"]').hide();
    $(`[constraint*="context-${form.context.value}"]`).show();
    if(!form.preview_border.checked && !form.preview_vertical_bars.checked) {
        $('[constraint*="color"]').hide();
    } else {
        $('[constraint*="color"]').show();
    }

    if (type !== 'docker') {
        $('[constraint*="docker"]').hide();
    }
};

/**
 * Create the element select table
 */
const updateList = () => {
    // select the table
    const table = $('.sortable > tbody');
    // empty the table
    table.empty();

    // append the selected elements
    for (const el of selected) {
        table.append($(`<tr class="item" draggable="true"><td><span style="cursor: pointer;" onclick="setIconAsContainer(this)"><img src="${el.Icon}" class="img" onerror="this.src='/plugins/dynamix.docker.manager/images/question.png';"></span>${el.Name}</td><td><input class="container-switch" checked type="checkbox" name="containers[]" value="${el.Name}" style="display: none;"></td></tr>`));
    }

    // append the rest of the elements
    for (const el of choose) {
        table.append($(`<tr class="item" draggable="true"><td><span style="cursor: pointer;" onclick="setIconAsContainer(this)"><img src="${el.Icon}" class="img" onerror="this.src='/plugins/dynamix.docker.manager/images/question.png';"></span>${el.Name}</td><td><input class="container-switch" type="checkbox" name="containers[]" value="${el.Name}" style="display: none;"></td></tr>`));
    }

    // prepend the selected regex element
    for (const el of selectedRegex) {
        table.prepend($(`<tr class="item"><td><span style="cursor: pointer;" onclick="setIconAsContainer(this)"><img src="${el.Icon}" class="img" onerror="this.src='/plugins/dynamix.docker.manager/images/question.png';"></span>${el.Name}</td><td><input class="container-switch" checked disabled type="checkbox" name="containers[]" value="${el.Name}" style="display: none;"></td></tr>`));
    }

    // create the *cool* unraid button for the autostart
    $('table.sortable > tbody > tr > td > input.container-switch').switchButton({ show_labels: false });
    $('table.sortable > tbody > tr > td > input.container-switch:disabled').parent().find('*').css('opacity', '0.5').css('cursor', 'default').off().end().end().each(function() { this.checked = !this.checked; });

    // stuff for the sort table
    $('.item').css('border-color', $('body').css('color'));

    $('.sortable').on('dragover', sortTable).on('dragenter', (e) => { e.preventDefault(); });

    $('.item').on('dragstart', (e) => { e.target.classList.add("dragging") }).on('dragend', (e) => { e.target.classList.remove("dragging") });
};

/**
 * i have no idea how this work, if it doesn't work you have to figure out yourself
 * @param {*} e who knows
 */
const sortTable = (e) => {
    e.preventDefault();

    const sib = [...$('.item:not(.dragging)')];

    const bound = e.delegateTarget.getBoundingClientRect();

    const near = sib.find(el => {
        return e.clientY - bound.top <= el.offsetTop + el.offsetHeight / 2;
    });

    $(near).before($('.dragging'));
}

/**
 * Handle sthe form submission
 * @param {*} e the form
 * @returns {bool} always false
 */
const submitForm = async (e) => {
    const actions = $('input[name*="custom_action"]').map((i, e) => JSON.parse(atob($(e).val()))).get();
    // this is easy, no need for a comment :)
    const folder = {
        name: e.name.value.toString(),
        icon: e.icon.value.toString(),
        settings: {
            preview: parseInt(e.preview.value.toString()),
            preview_hover: e.preview_hover.checked,
            preview_update: e.preview_update.checked,
            preview_text_width: e.preview_text_width.value,
            preview_grayscale: e.preview_grayscale.checked,
            preview_webui: e.preview_webui.checked,
            preview_logs: e.preview_logs.checked,
            preview_console: e.preview_console.checked,
            preview_vertical_bars: e.preview_vertical_bars.checked,
            context: parseInt(e.context.value.toString()),
            context_trigger: parseInt(e.context_trigger.value.toString()),
            context_graph: parseInt(e.context_graph.value.toString()),
            context_graph_time: parseInt(e.context_graph_time.value.toString()),
            preview_border: e.preview_border.checked,
            preview_border_color: e.preview_border_color.value.toString(),
            update_column: e.update_column.checked,
            default_action: e.default_action.checked,
            expand_tab: e.expand_tab.checked,
            expand_dashboard: e.expand_dashboard.checked,
        },
        regex: e.regex.value.toString(),
        containers: [...$('input[name*="containers"]:checked').map((i, e) => $(e).val())],
        actions
    }
    // send the data to the right endpoint
    if (id) {
        await $.post('/plugins/folder.view/server/update.php', { type: type, content: JSON.stringify(folder), id: id });
    } else {
        await $.post('/plugins/folder.view/server/create.php', { type: type, content: JSON.stringify(folder) });
    }

    // return to the right tab
    let loc = location.pathname.split('/');
    loc.pop();
    location.href = loc.join('/');
    
    return false;
}

/**
 * Handles the button to return to the tab
 */
const cancelBtn = () => {
    let loc = location.pathname.split('/');
    loc.pop();
    location.href = loc.join('/');
};

/**
 * Set the Folder icon to the clicked element icon
 * @param {*} e the element
 */
const setIconAsContainer = (e) => {
    $('div.canvas > form')[0].icon.value = e.firstChild.src;
    $($('div.canvas > form')[0].icon).trigger('input');
};

/**
 * Add a custom action to the folder
 * @param {number | undefined} action 
 */
const customAction = (action = undefined) => {
    let config = {
        name: '',
        type: 0,
        action: 0,
        modes: 0,
        conatiners: []
    }
    if(action !== undefined) {
        config = JSON.parse(atob($('input[name*="custom_action"]').map((i, e) => $(e).val()).get()[action]));
    }
    const selectCt = $('.action-subject [name="action_elements"]');
    selectCt.children().remove();
    [...$('input[name*="containers"]:checked').map((i, e) => $(e).val()), ...selectedRegex.map(e => e.Name)].forEach((e) => {
        if(config.conatiners?.includes(e)) {
            selectCt.append(`<option value="${e}" selected>${e}</option>`);
        } else {
            selectCt.append(`<option value="${e}">${e}</option>`);
        }
    });
    const dialog = $('.dialogCustomAction');
    const customNumber = $('input[name*="custom_action"]').length;
    dialog.html($('.templateDialogCustomAction').html());
    dialog.find('[name="action_elements"]').multiselect({
        header: false,
        noneSelectedText: "Select options",
        zIndex: 99999999,
        appendTo: document.body,
        selectedText: (numChecked, numTotal, checkedItems) => {
            return checkedItems.map(e => e.value).join(', ');
        },
        classes: 'multiselect-container'
    });
    dialog.find('[name="action_name"]').val(config.name);
    dialog.find('[name="action_type"]').val(config.type);
    dialog.find('[constraint*=\'action-type-\']').hide();
    dialog.find(`[constraint*=\'action-type-${config.type}\']`).show();
    dialog.find('input.basic-switch-sync').prop("checked", config.script_sync || false);
    dialog.find('input.basic-switch-sync').switchButton({ labels_placement: 'right', off_label: $.i18n('off'), on_label: $.i18n('on')});
    if(config.type === 0) {
        dialog.find('[name="action_standard"]').val(config.action);
        dialog.find('[constraint*=\'action-standard-\']').hide();
        dialog.find(`[constraint*=\'action-standard-${config.action}\']`).show();
        if(config.action === 0) {
            dialog.find('[name="action_cycle"]').val(config.modes);
        } else if(config.action === 1) {
            dialog.find('[name="action_set"]').val(config.modes);
        }
    } else if(config.type === 1){
        dialog.find('[name="action_script"]').val(config.script || '');
    }
    buttons = {};
    buttons[(action !== undefined) ? $.i18n('action-edit-btn') : $.i18n('action-add-btn')] = function() {
        const that = $(this);
        let cfg = {
            name: that.find('[name="action_name"]').val(),
            type: parseInt(that.find('[name="action_type"]').val())
        }
        if(cfg.type === 0) {
            cfg.conatiners = that.find('[name="action_elements"]').val();
            cfg.action = parseInt(that.find('[name="action_standard"]').val());
            if(cfg.action === 0) {
                cfg.modes = parseInt(that.find('[name="action_cycle"]').val());
            } else if(cfg.action === 1) {
                cfg.modes = parseInt(that.find('[name="action_set"]').val());
            }
        } else if(cfg.type === 1) {
            cfg.script = that.find('[name="action_script"]').val();
            cfg.script_sync = that.find('[name="action_script_sync"]').prop("checked");
        }
        if(action !== undefined) {
            $(`.custom-action-n-${action} > input[type="hidden"]`).val(btoa(JSON.stringify(cfg)));
            $(`.custom-action-n-${action} > span`).text(cfg.name + ' ');
        } else {
            $('.custom-action-wrapper').append(`<div class="custom-action-n-${(action !== undefined) ? action : customNumber}"><span>${cfg.name} </span><button onclick="return customAction(${(action !== undefined) ? action : customNumber});"><i class="fa fa-pencil" aria-hidden="true"></i></button><button onclick="return rCcustomAction(${(action !== undefined) ? action : customNumber});"><i class="fa fa-trash" aria-hidden="true"></i></button><input type="hidden" name="custom_action[]" value="${btoa(JSON.stringify(cfg))}"></div>`);
        }
        $(this).dialog("close");
    };
    buttons[$.i18n('cancel')] = function() {
        $(this).dialog("close");
    };
    dialog.dialog({
        title: (action !== undefined) ? $.i18n('action-edit') : $.i18n('action-add'),
        resizable: false,
        width: 800,
        modal: true,
        show: { effect: 'fade', duration: 250 },
        hide: { effect: 'fade', duration: 250 },
        buttons,
        close: () => {
            dialog.find('[name="action_elements"]').multiselect("destroy");
        }
    });
    $(".ui-dialog .ui-dialog-titlebar").addClass('menu');
    $('.ui-dialog .ui-dialog-titlebar-close').css({'display':'none'});
    $(".ui-dialog .ui-dialog-title").css({'text-align':'center','width':'100%'});
    $(".ui-dialog .ui-dialog-content").css({'padding-top':'15px','vertical-align':'bottom'});
    $(".ui-button-text").css({'padding':'0px 5px'});
    return false;
};

/**
 * Remove a custom action from the folder
 * @param {number} action 
 */
const rCcustomAction =  (action) => {
    $(`.custom-action-n-${action}`).remove();
    return false;
};