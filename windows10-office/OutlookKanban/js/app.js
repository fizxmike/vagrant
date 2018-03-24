'use strict';

var tbApp = angular.module('taskboardApp', ['ui.sortable']);

try {
    // check whether the page is opened in outlook app
    if (window.external !== undefined && window.external.OutlookApplication !== undefined) {
        var outlookApp = window.external.OutlookApplication;
    } else {
        // if it is opened via browser, create activex object
        // this should be supported only from IE8 to IE11.
        // IE Edge currently does not support ActiveXObject
        var outlookApp = new ActiveXObject("Outlook.Application");
    }
    var outlookNS = outlookApp.GetNameSpace("MAPI");

}
catch (e) { console.log(e); }

function stringify(obj, replacer, spaces, cycleReplacer) {
    return JSON.stringify(obj, serializer(replacer, cycleReplacer), spaces)
}

function serializer(replacer, cycleReplacer) {
    var stack = [], keys = []

    if (cycleReplacer == null) cycleReplacer = function (key, value) {
        if (stack[0] === value) return "[Circular ~]"
        return "[Circular ~." + keys.slice(0, stack.indexOf(value)).join(".") + "]"
    }

    return function (key, value) {
        if (stack.length > 0) {
            var thisPos = stack.indexOf(this)
            ~thisPos ? stack.splice(thisPos + 1) : stack.push(this)
            ~thisPos ? keys.splice(thisPos, Infinity, key) : keys.push(key)
            if (~stack.indexOf(value)) value = cycleReplacer.call(this, key, value)
        }
        else stack.push(value)

        return replacer == null ? value : replacer.call(this, key, value)
    }
}

tbApp.controller('taskboardController', function ($scope, $filter) {

    // DeepDiff.observableDiff(def, curr, function(d) {

    // });

    $scope.init = function () {

        $scope.getConfig();

        var defaultConfig = $scope.makeDefaultConfig();
        var delta = DeepDiff.diff($scope.config, defaultConfig);
        if (delta) {
            delta.forEach(function (change) {
                if (change.kind === 'N' || change.kind === 'D') {
                    DeepDiff.applyChange($scope.config, defaultConfig, change);
                }
            });
            $scope.saveConfig();
        }

        $scope.usePrivate = $scope.config.PRIVACY_FILTER;
        $scope.useCategoryColors = $scope.config.USE_CATEGORY_COLORS;
        $scope.useCategoryColorFooters = $scope.config.USE_CATEGORY_COLOR_FOOTERS;
        $scope.outlookCategories = getCategories();
        $scope.getState();
        $scope.initTasks();

        $scope.numfolders = 0;
        if ($scope.config.BACKLOG_FOLDER.ACTIVE) $scope.numfolders++;
        if ($scope.config.NEXT_FOLDER.ACTIVE) $scope.numfolders++;
        if ($scope.config.INPROGRESS_FOLDER.ACTIVE) $scope.numfolders++;
        if ($scope.config.WAITING_FOLDER.ACTIVE) $scope.numfolders++;
        if ($scope.config.COMPLETED_FOLDER.ACTIVE) $scope.numfolders++;

        // ui-sortable options and events
        $scope.sortableOptions = {
            connectWith: '.tasklist',
            items: 'li',
            opacity: 0.5,
            cursor: 'move',
            containment: 'document',

            stop: function (e, ui) {
                // locate the target folder in outlook
                // ui.item.sortable.droptarget[0].id represents the id of the target list
                if (ui.item.sortable.droptarget) { // check if it is dropped on a valid target
                    if (($scope.config.INPROGRESS_FOLDER.LIMIT !== 0 && e.target.id !== 'inprogressList' && ui.item.sortable.droptarget.attr('id') === 'inprogressList' && $scope.inprogressTasks.length > $scope.config.INPROGRESS_FOLDER.LIMIT) ||
                    ($scope.config.NEXT_FOLDER.LIMIT !== 0 && e.target.id !== 'nextList' && ui.item.sortable.droptarget.attr('id') === 'nextList' && $scope.nextTasks.length > $scope.config.NEXT_FOLDER.LIMIT) ||
                    ($scope.config.WAITING_FOLDER.LIMIT !== 0 && e.target.id !== 'waitingList' && ui.item.sortable.droptarget.attr('id') === 'waitingList' && $scope.waitingTasks.length > $scope.config.WAITING_FOLDER.LIMIT)) {
                        $scope.initTasks();
                        ui.item.sortable.cancel();
                } else {
                    switch (ui.item.sortable.droptarget[0].id) {
                        case 'backlogList':
                            var tasksfolder = getOutlookFolder($scope.config.BACKLOG_FOLDER.NAME);
                            var newstatus = $scope.config.STATUS.NOT_STARTED.VALUE;
                            break;
                        case 'nextList':
                            var tasksfolder = getOutlookFolder($scope.config.NEXT_FOLDER.NAME);
                            var newstatus = $scope.config.STATUS.NOT_STARTED.VALUE;
                            break;
                        case 'inprogressList':
                            var tasksfolder = getOutlookFolder($scope.config.INPROGRESS_FOLDER.NAME);
                            var newstatus = $scope.config.STATUS.IN_PROGRESS.VALUE;
                            break;
                        case 'waitingList':
                            var tasksfolder = getOutlookFolder($scope.config.WAITING_FOLDER.NAME);
                            var newstatus = $scope.config.STATUS.WAITING.VALUE;
                            break;
                        case 'completedList':
                            var tasksfolder = getOutlookFolder($scope.config.COMPLETED_FOLDER.NAME);
                            var newstatus = $scope.config.STATUS.COMPLETED.VALUE;
                            break;
                    };

                    // locate the task in outlook namespace by using unique entry id
                    var taskitem = outlookNS.GetItemFromID(ui.item.sortable.model.entryID);
                    var itemChanged = false;

                    // set new status, if different
                    if (taskitem.Status != newstatus) {
                        taskitem.Status = newstatus;
                        taskitem.Save();
                        itemChanged = true;
                        ui.item.sortable.model.status = taskStatus(newstatus);
                        ui.item.sortable.model.completeddate = new Date(taskitem.DateCompleted)
                    }

                    // ensure the task is not moving into same folder
                    if (taskitem.Parent.Name != tasksfolder.Name) {
                        // move the task item
                        taskitem = taskitem.Move(tasksfolder);
                        itemChanged = true;

                        // update entryID with new one (entryIDs get changed after move)
                        // https://msdn.microsoft.com/en-us/library/office/ff868618.aspx
                        ui.item.sortable.model.entryID = taskitem.EntryID;
                    }

                    if (itemChanged) {
                        $scope.initTasks();
                    }
                }}
            }
        };

        // watch search filter and apply it
        $scope.$watchGroup(['search', 'private'], function (newValues, oldValues) {
            var search = newValues[0];
            $scope.applyFilters();
            $scope.saveState();
        });
    };

    var getOutlookFolder = function (folderpath) {
        if (folderpath === undefined || folderpath === '') {
            // if folder path is not defined, return main Tasks folder
            var folder = outlookNS.GetDefaultFolder(13);
        } else {
            // if folder path is defined then find it, create it if it doesn't exist yet
            try {
                var folder = outlookNS.GetDefaultFolder(13).Folders(folderpath);
            }
            catch (e) {
                outlookNS.GetDefaultFolder(13).Folders.Add(folderpath);
                var folder = outlookNS.GetDefaultFolder(13).Folders(folderpath);
            }
        }
        return folder;
    }

    // borrowed from http://stackoverflow.com/a/30446887/942100
    var fieldSorter = function (fields) {
        return function (a, b) {
            return fields
                .map(function (o) {
                    var dir = 1;
                    if (o[0] === '-') {
                        dir = -1;
                        o = o.substring(1);
                    }
                    var propOfA = a[o];
                    var propOfB = b[o];

                    //string comparisons shall be case insensitive
                    if (typeof propOfA === "string") {
                        propOfA = propOfA.toUpperCase();
                        propOfB = propOfB.toUpperCase();
                    }

                    if (propOfA > propOfB) return dir;
                    if (propOfA < propOfB) return -(dir);
                    return 0;
                }
                ).reduce(function firstNonZeroValue(p, n) {
                    return p ? p : n;
                }, 0
                );
        };
    };

    var getTasksFromOutlook = function (path, restrict, sort, folderStatus) {
        var i, array = [];
        if (restrict === undefined || restrict == '') {
            var tasks = getOutlookFolder(path).Items;
        }
        else {
            var tasks = getOutlookFolder(path).Items.Restrict(restrict);
        }

        var count = tasks.Count;
        for (i = 1; i <= count; i++) {
            var task = tasks(i);
            if (task.Status == folderStatus) {
                array.push({
                    entryID: task.EntryID,
                    subject: task.Subject,
                    priority: task.Importance,
                    startdate: new Date(task.StartDate),
                    duedate: new Date(task.DueDate),
                    sensitivity: task.Sensitivity,
                    categories: getCategoriesArray(task.Categories),
                    notes: taskExcerpt(task.Body, $scope.config.TASKNOTE_EXCERPT),
                    status: taskStatus(task.Status),
                    oneNoteTaskID: getUserProp(tasks(i), "OneNoteTaskID"),
                    oneNoteURL: getUserProp(tasks(i), "OneNoteURL"),
                    completeddate: new Date(task.DateCompleted),
                    percent: task.PercentComplete,
                    owner: task.Owner,
                    totalwork: task.TotalWork,
                });
            }
        };

        // sort tasks
        var sortKeys;
        if (sort === undefined) { sortKeys = ["-priority"]; }
        else { sortKeys = sort.split(","); }

        var sortedTasks = array.sort(fieldSorter(sortKeys));

        return sortedTasks;
    };



    var getCategories = function () {
        var i;
        var catNames = [];
        var catColors = [];
        var categories = outlookNS.Categories;
        var count = outlookNS.Categories.Count;
        catNames.length = count;
        catColors.length = count;
        for (i = 1; i <= count; i++) {
            catNames[i - 1] = categories(i).Name;
            catColors[i - 1] = categories(i).Color;
        };
        return { names: catNames, colors: catColors };
    }

    var getCategoriesArray = function (csvCategories) {
        var i;
        var catStyles = [];
        var categories = csvCategories.split(/[;,]+/);
        catStyles.length = categories.length;
        for (i = 0; i < categories.length; i++) {
            categories[i] = categories[i].trim();
            if (categories[i].length > 0) {
                if ($scope.useCategoryColors) {
                    catStyles[i] = {
                        label: categories[i], style: { "background-color": getColor(categories[i]), color: getContrastYIQ(getColor(categories[i])) }
                    }
                }
                else {
                    catStyles[i] = {
                        label: categories[i], style: { color: "black" }
                    };
                }
            }
        }
        return catStyles;
    }

    // grabs values of user defined fields from outlook item object 
    // currently used for getting onenote url info 
    var getUserProp = function (item, prop) {
        var userprop = item.UserProperties(prop);
        var value = '';
        if (userprop != null) {
            value = userprop.Value;
        }
        return value;
    };

    // opens up onenote app and locates the page by using onenote uri 
    $scope.openOneNoteURL = function (url) {
        window.event.returnValue = false;
        // try to open the link using msLaunchUri which does not create unsafe-link security warning 
        // unfortunately this method is only available Win8+ 
        if (navigator.msLaunchUri) {
            navigator.msLaunchUri(url);
        } else {
            // old window.open method, this creates unsafe-link warning if the link clicked via outlook app 
            // there is a registry key to disable these warnings, but not recommended as it disables 
            // the unsafe-link protection in entire outlook app 
            window.open(url, "_blank").close();
        }
        return nfalse;
    }

    var colorArray = [ 
        '#E7A1A2', '#F9BA89', '#F7DD8F', '#FCFA90', '#78D168', '#9FDCC9', '#C6D2B0', '#9DB7E8', '#B5A1E2', 
        '#daaec2', '#dad9dc', '#6b7994', '#bfbfbf', '#6f6f6f', '#4f4f4f', '#c11a25', '#e2620d', '#c79930', 
        '#b9b300', '#368f2b', '#329b7a', '#778b45', '#2858a5', '#5c3fa3', '#93446b'
    ];

    var getColor = function (category) {
        var c = $scope.outlookCategories.names.indexOf(category);
        var i = $scope.outlookCategories.colors[c];        
        if (i == -1) {
            return '#4f4f4f';
        }
        else {
            return colorArray[i-1];
        }
    }

    function getContrastYIQ(hexcolor) {
        if (hexcolor == undefined) {
            return 'black';
        }
        var r = parseInt(hexcolor.substr(1, 2), 16);
        var g = parseInt(hexcolor.substr(3, 2), 16);
        var b = parseInt(hexcolor.substr(5, 2), 16);
        var yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return (yiq >= 128) ? 'black' : 'white';
    }

    $scope.initTasks = function () {
        // get tasks from each outlook folder and populate model data
        $scope.backlogTasks = getTasksFromOutlook($scope.config.BACKLOG_FOLDER.NAME, $scope.config.BACKLOG_FOLDER.RESTRICT, $scope.config.BACKLOG_FOLDER.SORT, $scope.config.STATUS.NOT_STARTED.VALUE);
        $scope.inprogressTasks = getTasksFromOutlook($scope.config.INPROGRESS_FOLDER.NAME, $scope.config.INPROGRESS_FOLDER.RESTRICT, $scope.config.INPROGRESS_FOLDER.SORT, $scope.config.STATUS.IN_PROGRESS.VALUE);
        $scope.nextTasks = getTasksFromOutlook($scope.config.NEXT_FOLDER.NAME, $scope.config.NEXT_FOLDER.RESTRICT, $scope.config.NEXT_FOLDER.SORT, $scope.config.STATUS.NOT_STARTED.VALUE);
        $scope.waitingTasks = getTasksFromOutlook($scope.config.WAITING_FOLDER.NAME, $scope.config.WAITING_FOLDER.RESTRICT, $scope.config.WAITING_FOLDER.SORT, $scope.config.STATUS.WAITING.VALUE);
        $scope.completedTasks = getTasksFromOutlook($scope.config.COMPLETED_FOLDER.NAME, $scope.config.COMPLETED_FOLDER.RESTRICT, $scope.config.COMPLETED_FOLDER.SORT, $scope.config.STATUS.COMPLETED.VALUE);

        // copy the lists as the initial filter    
        $scope.filteredBacklogTasks = $scope.backlogTasks;
        $scope.filteredInprogressTasks = $scope.inprogressTasks;
        $scope.filteredNextTasks = $scope.nextTasks;
        $scope.filteredWaitingTasks = $scope.waitingTasks;
        $scope.filteredCompletedTasks = $scope.completedTasks;

        // then apply the current filters for search and sensitivity
        $scope.applyFilters();

        // clean up Completed Tasks
        if ($scope.config.COMPLETED.ACTION == 'ARCHIVE' || $scope.config.COMPLETED.ACTION == 'DELETE') {
            var i;
            var tasks = $scope.completedTasks;
            var count = tasks.length;
            for (i = 0; i < count; i++) {
                var days = Date.daysBetween(tasks[i].completeddate, new Date());
                if (days > $scope.config.COMPLETED.AFTER_X_DAYS) {
                    if ($scope.config.COMPLETED.ACTION == 'ARCHIVE') {
                        $scope.archiveTask(tasks[i], $scope.completedTasks, $scope.filteredCompletedTasks);
                    }
                    if ($scope.config.COMPLETED.ACTION == 'DELETE') {
                        $scope.deleteTask(tasks[i], $scope.completedTasks, $scope.filteredCompletedTasks, false);
                    }
                };
            };
        };

        // move tasks with start date today to the Next folder
        if ($scope.config.AUTO_START_TASKS) {
            var i;
            var movedTask = false;
            var tasks = $scope.backlogTasks;
            var count = tasks.length;
            for (i = 0; i < count; i++) {
                if (tasks[i].startdate.getFullYear() != 4501) {
                    var seconds = Date.secondsBetween(tasks[i].startdate, new Date());
                    if (seconds >= 0) {
                        var taskitem = outlookNS.GetItemFromID(tasks[i].entryID);
                        taskitem.Move(getOutlookFolder($scope.config.NEXT_FOLDER.NAME));
                        movedTask = true;
                    }
                };
            };
            if (movedTask) {
                $scope.backlogTasks = getTasksFromOutlook($scope.config.BACKLOG_FOLDER.NAME, $scope.config.BACKLOG_FOLDER.RESTRICT, $scope.config.BACKLOG_FOLDER.SORT, $scope.config.STATUS.NOT_STARTED.VALUE);
                $scope.nextTasks = getTasksFromOutlook($scope.config.NEXT_FOLDER.NAME, $scope.config.NEXT_FOLDER.RESTRICT, $scope.config.NEXT_FOLDER.SORT, $scope.config.STATUS.NOT_STARTED.VALUE);
                $scope.filteredBacklogTasks = $scope.backlogTasks;
                $scope.filteredNextTasks = $scope.nextTasks;
            }
        };
    }

    $scope.applyFilters = function () {
        if ($scope.search.length > 0) {
            $scope.filteredBacklogTasks = $filter('filter')($scope.backlogTasks, $scope.search);
            $scope.filteredNextTasks = $filter('filter')($scope.nextTasks, $scope.search);
            $scope.filteredInprogressTasks = $filter('filter')($scope.inprogressTasks, $scope.search);
            $scope.filteredWaitingTasks = $filter('filter')($scope.waitingTasks, $scope.search);
            $scope.filteredCompletedTasks = $filter('filter')($scope.completedTasks, $scope.search);
        }
        else {
            $scope.filteredBacklogTasks = $scope.backlogTasks;
            $scope.filteredInprogressTasks = $scope.inprogressTasks;
            $scope.filteredNextTasks = $scope.nextTasks;
            $scope.filteredWaitingTasks = $scope.waitingTasks;
            $scope.filteredCompletedTasks = $scope.completedTasks;
        }
        // I think this can be written shorter, but for now it works
        if ($scope.config.PRIVACY_FILTER) {
            var sensitivityFilter = 0;
            if ($scope.private == true) { sensitivityFilter = 2; }
            $scope.filteredBacklogTasks = $filter('filter')($scope.filteredBacklogTasks, function (task) { return task.sensitivity == sensitivityFilter });
            $scope.filteredNextTasks = $filter('filter')($scope.filteredNextTasks, function (task) { return task.sensitivity == sensitivityFilter });
            $scope.filteredInprogressTasks = $filter('filter')($scope.filteredInprogressTasks, function (task) { return task.sensitivity == sensitivityFilter });
            $scope.filteredWaitingTasks = $filter('filter')($scope.filteredWaitingTasks, function (task) { return task.sensitivity == sensitivityFilter });
            $scope.filteredCompletedTasks = $filter('filter')($scope.filteredCompletedTasks, function (task) { return task.sensitivity == sensitivityFilter });
        }

        // filter backlog on start date
        if ($scope.config.BACKLOG_FOLDER.FILTER_ON_START_DATE) {
            $scope.filteredBacklogTasks = $filter('filter')($scope.filteredBacklogTasks, function (task) {
                if (task.startdate.getFullYear() != 4501) {
                    var days = Date.daysBetween(task.startdate, new Date());
                    return days >= 0;
                }
                else return true; // always show tasks not having start date
            });
        };

        // filter completed tasks if the HIDE options is configured
        if ($scope.config.COMPLETED.ACTION == 'HIDE') {
            $scope.filteredCompletedTasks = $filter('filter')($scope.filteredCompletedTasks, function (task) {
                var days = Date.daysBetween(task.completeddate, new Date());
                return days < $scope.config.COMPLETED.AFTER_X_DAYS;
            });
        }
    }

    $scope.saveState = function () {
        if ($scope.config.SAVE_STATE) {
            var state = { "private": $scope.private, "search": $scope.search };

            var folder = outlookNS.GetDefaultFolder(11); // use the Journal folder to save the state
            var stateItems = folder.Items.Restrict('[Subject] = "KanbanState"');
            if (stateItems.Count == 0) {
                var stateItem = outlookApp.CreateItem(4);
                stateItem.Subject = "KanbanState";
            }
            else {
                stateItem = stateItems(1);
            }
            stateItem.Body = JSON.stringify(state);
            stateItem.Save();
        }
    }

    $scope.saveConfig = function () {
        var folder = outlookNS.GetDefaultFolder(11); // use the Journal folder to save the state
        var configItems = folder.Items.Restrict('[Subject] = "KanbanConfig"');
        if (configItems.Count == 0) {
            var configItem = outlookApp.CreateItem(4);
            configItem.Subject = "KanbanConfig";
        }
        else {
            configItem = configItems(1);
        }
        configItem.Body = JSON.stringify($scope.config, null, 2);
        configItem.Save();
    }

    $scope.getState = function () {
        // set default state
        var state = { "private": false, "search": "" };

        if ($scope.config.SAVE_STATE) {
            var folder = outlookNS.GetDefaultFolder(11);
            var stateItems = folder.Items.Restrict('[Subject] = "KanbanState"');
            if (stateItems.Count > 0) {
                var stateItem = stateItems(1);
                if (stateItem.Body) {
                    state = JSON.parse(stateItem.Body);
                }
            }
        }

        $scope.search = state.search;
        $scope.private = state.private;
    }

    $scope.getConfig = function () {
        var folder = outlookNS.GetDefaultFolder(11);
        var configItems = folder.Items.Restrict('[Subject] = "KanbanConfig"');
        var configFound = false;
        if (configItems.Count > 0) {
            var configItem = configItems(1);
            if (configItem.Body) {
                try {
                    $scope.config = JSON.parse(JSON.minify(configItem.Body));
                }
                catch (e) {
                    alert("I am afraid there is something wrong with the json structure of your configuration data. Please correct it.");
                    $scope.editConfig();
                }
                configFound = true;
            }
        }
        if (!configFound) {
            $scope.config = $scope.makeDefaultConfig();
            $scope.saveConfig();
        }
    }

    $scope.displayHelp = function () {
        var mailItem, mailBody;
        mailItem = outlookApp.CreateItem(0);
        mailItem.Subject = "Outlook Kanban Help";
        mailItem.To = "you@yourself.com";
        mailItem.BodyFormat = 2;
        mailBody = "<style>";
        mailBody += "body { font-family: Calibri; font-size:11.0pt; } ";
        mailBody += " </style>";
        mailBody += "<body>";
        mailBody += "<h2>Configuration options:</h2>";
        mailBody += "<table>";
        mailBody += "<tr><strong>BACKLOG_FOLDER</strong></tr>";
        mailBody += "<tr><td>ACTIVE</td><td>display this folder on the board or not</td></tr>";
        mailBody += "<tr><td>FILTER_ON_START_DATE</td><td>if true, then task with start date in the future will not be displayed</td></tr>";
        mailBody += "<tr><td>TITLE</td><td>Folder title</td></tr>";
        mailBody += "<tr><td>NAME</td><td>Name of the Outlook tasks folder (blank = default tasks folder)</td></tr>";
        mailBody += "<tr><td>LIMIT</td><td>Maximum number of tasks in this folder (0 means no maximum)</td></tr>";
        mailBody += "<tr><td>SORT</td><td>The sort order of the tasks</td></tr>";
        mailBody += "<tr><td>RESTRICT</td><td>Filter that is applied to the tasks collection</td></tr>";
        mailBody += "<tr><td>DISPLAY_PROPERTIES</td><td>Defines the task properties that will be displayed on the task card</td></tr>";
        mailBody += "<tr><td>REPORT</td><td>Settings for the status report</td></tr>";
        mailBody += "<tr><strong>NEXT_FOLDER</strong></tr>";
        mailBody += "<tr><td>ACTIVE</td><td>display this folder on the board or not</td></tr>";
        mailBody += "<tr><td>TITLE</td><td>Folder title</td></tr>";
        mailBody += "<tr><td>NAME</td><td>Name of the Outlook tasks folder (blank = default tasks folder)</td></tr>";
        mailBody += "<tr><td>LIMIT</td><td>Maximum number of tasks in this folder (0 means no maximum)</td></tr>";
        mailBody += "<tr><td>SORT</td><td>The sort order of the tasks</td></tr>";
        mailBody += "<tr><td>RESTRICT</td><td>Filter that is applied to the tasks collection</td></tr>";
        mailBody += "<tr><td>DISPLAY_PROPERTIES</td><td>Defines the task properties that will be displayed on the task card</td></tr>";
        mailBody += "<tr><td>REPORT</td><td>Settings for the status report</td></tr>";
        mailBody += "<tr><strong>INPROGRESS_FOLDER</strong></tr>";
        mailBody += "<tr><td>ACTIVE</td><td>display this folder on the board or not</td></tr>";
        mailBody += "<tr><td>TITLE</td><td>Folder title</td></tr>";
        mailBody += "<tr><td>NAME</td><td>Name of the Outlook tasks folder (blank = default tasks folder)</td></tr>";
        mailBody += "<tr><td>LIMIT</td><td>Maximum number of tasks in this folder (0 means no maximum)</td></tr>";
        mailBody += "<tr><td>SORT</td><td>The sort order of the tasks</td></tr>";
        mailBody += "<tr><td>RESTRICT</td><td>Filter that is applied to the tasks collection</td></tr>";
        mailBody += "<tr><td>DISPLAY_PROPERTIES</td><td>Defines the task properties that will be displayed on the task card</td></tr>";
        mailBody += "<tr><td>REPORT</td><td>Settings for the status report</td></tr>";
        mailBody += "<tr><strong>WAITING_FOLDER</strong></tr>";
        mailBody += "<tr><td>ACTIVE</td><td>display this folder on the board or not</td></tr>";
        mailBody += "<tr><td>TITLE</td><td>Folder title</td></tr>";
        mailBody += "<tr><td>NAME</td><td>Name of the Outlook tasks folder (blank = default tasks folder)</td></tr>";
        mailBody += "<tr><td>LIMIT</td><td>Maximum number of tasks in this folder (0 means no maximum)</td></tr>";
        mailBody += "<tr><td>SORT</td><td>The sort order of the tasks</td></tr>";
        mailBody += "<tr><td>RESTRICT</td><td>Filter that is applied to the tasks collection</td></tr>";
        mailBody += "<tr><td>DISPLAY_PROPERTIES</td><td>Defines the task properties that will be displayed on the task card</td></tr>";
        mailBody += "<tr><td>REPORT</td><td>Settings for the status report</td></tr>";
        mailBody += "<tr><strong>COMPLETED_FOLDER</strong></tr>";
        mailBody += "<tr><td>ACTIVE</td><td>display this folder on the board or not</td></tr>";
        mailBody += "<tr><td>TITLE</td><td>Folder title</td></tr>";
        mailBody += "<tr><td>NAME</td><td>Name of the Outlook tasks folder (blank = default tasks folder)</td></tr>";
        mailBody += "<tr><td>LIMIT</td><td>Maximum number of tasks in this folder (0 means no maximum)</td></tr>";
        mailBody += "<tr><td>SORT</td><td>The sort order of the tasks</td></tr>";
        mailBody += "<tr><td>RESTRICT</td><td>Filter that is applied to the tasks collection</td></tr>";
        mailBody += "<tr><td>DISPLAY_PROPERTIES</td><td>Defines the task properties that will be displayed on the task card</td></tr>";
        mailBody += "<tr><td>REPORT</td><td>Settings for the status report</td></tr>";
        mailBody += "<tr><strong>ARCHIVE_FOLDER</strong></tr>";
        mailBody += "<tr><td>NAME</td><td>Name of the Outlook tasks folder (blank = default tasks folder)</td></tr>";
        mailBody += "<tr><strong>OTHER SETTINGS</strong></tr>";
        mailBody += "<tr><td>TASKNOTE_EXCERPT</td><td>Number of characters that are displayed for the tasks details</td></tr>";
        mailBody += "<tr><td>TASK_TEMPLATE</td><td>Template to use for new tasks</td></tr>";
        mailBody += "<tr><td>DATE_FORMAT</td><td>Date format (must a valid JS date format)</td></tr>";
        mailBody += "<tr><td>USE_CATEGORY_COLORS</td><td>if true, then the Outlook category colors will be used</td></tr>";
        mailBody += "<tr><td>USE_CATEGORY_COLOR_FOOTERS</td><td>if true, then the Outlook category colors will be used for the entire footer line</td></tr>";
        mailBody += "<tr><td>SAVE_STATE</td><td>if true, then the filters will be save dand re-used when the app is restarted</td></tr>";
        mailBody += "<tr><td>PRIVACY_FILTER</td><td>if true, then you can use separate boards for private and publis tasks</td></tr>";
        mailBody += "<tr><td>STATUS</td><td>Tha value and descriptions for the task statuses. The text can be changed for the status report</td></tr>";
        mailBody += "<tr><td>COMPLETED</td><td>Define what to do with completed tasks after x days: NONE, HIDE, ARCHIVE or DELETE</td></tr>";
        mailBody += "<tr><td>AUTO_UPDATE</td><td>if true, then the board is updated immediately after adding or deleting tasks</td></tr>";
        mailBody += "</table>";
        mailBody += "</body>"
        mailItem.HTMLBody = mailBody;
        mailItem.Display();
    }

    // this is only a proof-of-concept single page report in a draft email for weekly report
    // it will be improved later on
    $scope.createReport = function () {
        var i, array = [];
        var mailItem, mailBody;
        mailItem = outlookApp.CreateItem(0);
        mailItem.Subject = "Status Report";
        mailItem.BodyFormat = 2;

        mailBody = "<style>";
        mailBody += "body { font-family: Calibri; font-size:11.0pt; } ";
        //mailBody += " h3 { font-size: 11pt; text-decoration: underline; } ";
        mailBody += " </style>";
        mailBody += "<body>";

        // COMPLETED ITEMS
        if ($scope.config.COMPLETED_FOLDER.REPORT.DISPLAY) {
            var tasks = getOutlookFolder($scope.config.COMPLETED_FOLDER.NAME).Items.Restrict("[Complete] = true And Not ([Sensitivity] = 2)");
            tasks.Sort("[Importance][Status]", true);
            mailBody += "<h3>" + $scope.config.COMPLETED_FOLDER.TITLE + "</h3>";
            mailBody += "<ul>";
            var count = tasks.Count;
            for (i = 1; i <= count; i++) {
                mailBody += "<li>"
                if (tasks(i).Categories !== "") { mailBody += "[" + tasks(i).Categories + "] "; }
                mailBody += "<strong>" + tasks(i).Subject + "</strong>" + " - <i>" + taskStatus(tasks(i).Status) + "</i>";
                if ($scope.config.COMPLETED_FOLDER.DISPLAY_PROPERTIES.TOTALWORK) { mailBody += " - " + tasks(i).TotalWork + " mn "; }
                if (tasks(i).Importance == 2) { mailBody += "<font color=red> [H]</font>"; }
                if (tasks(i).Importance == 0) { mailBody += "<font color=gray> [L]</font>"; }
                var dueDate = new Date(tasks(i).DueDate);
                if (moment(dueDate).isValid && moment(dueDate).year() != 4501) { mailBody += " [Due: " + moment(dueDate).format("DD-MMM") + "]"; }
                if (taskExcerpt(tasks(i).Body, 10000)) { mailBody += "<br>" + "<font color=gray>" + taskExcerpt(tasks(i).Body, 10000) + "</font>"; }
                mailBody += "</li>";
            }
            mailBody += "</ul>";
        }

        // INPROGRESS ITEMS
        if ($scope.config.INPROGRESS_FOLDER.REPORT.DISPLAY) {
            var tasks = getOutlookFolder($scope.config.INPROGRESS_FOLDER.NAME).Items.Restrict("[Status] = 1 And Not ([Sensitivity] = 2)");
            tasks.Sort("[Importance][Status]", true);
            mailBody += "<h3>" + $scope.config.INPROGRESS_FOLDER.TITLE + "</h3>";
            mailBody += "<ul>";
            var count = tasks.Count;
            for (i = 1; i <= count; i++) {
                mailBody += "<li>"
                if (tasks(i).Categories !== "") { mailBody += "[" + tasks(i).Categories + "] "; }
                mailBody += "<strong>" + tasks(i).Subject + "</strong>" + " - <i>" + taskStatus(tasks(i).Status) + "</i>";
                if ($scope.config.INPROGRESS_FOLDER.DISPLAY_PROPERTIES.TOTALWORK) { mailBody += " - " + tasks(i).TotalWork + " mn "; }
                if (tasks(i).Importance == 2) { mailBody += "<font color=red> [H]</font>"; }
                if (tasks(i).Importance == 0) { mailBody += "<font color=gray> [L]</font>"; }
                var dueDate = new Date(tasks(i).DueDate);
                if (moment(dueDate).isValid && moment(dueDate).year() != 4501) { mailBody += " [Due: " + moment(dueDate).format("DD-MMM") + "]"; }
                if (taskExcerpt(tasks(i).Body, 10000)) { mailBody += "<br>" + "<font color=gray>" + taskExcerpt(tasks(i).Body, 10000) + "</font>"; }
                mailBody += "</li>";
            }
            mailBody += "</ul>";
        }

        // NEXT ITEMS
        if ($scope.config.NEXT_FOLDER.REPORT.DISPLAY) {
            var tasks = getOutlookFolder($scope.config.NEXT_FOLDER.NAME).Items.Restrict("[Status] = 0 And Not ([Sensitivity] = 2)");
            tasks.Sort("[Importance][Status]", true);
            mailBody += "<h3>" + $scope.config.NEXT_FOLDER.TITLE + "</h3>";
            mailBody += "<ul>";
            var count = tasks.Count;
            for (i = 1; i <= count; i++) {
                mailBody += "<li>"
                if (tasks(i).Categories !== "") { mailBody += "[" + tasks(i).Categories + "] "; }
                mailBody += "<strong>" + tasks(i).Subject + "</strong>" + " - <i>" + taskStatus(tasks(i).Status) + "</i>";
                if ($scope.config.NEXT_FOLDER.DISPLAY_PROPERTIES.TOTALWORK) { mailBody += " - " + tasks(i).TotalWork + " mn "; }
                if (tasks(i).Importance == 2) { mailBody += "<font color=red> [H]</font>"; }
                if (tasks(i).Importance == 0) { mailBody += "<font color=gray> [L]</font>"; }
                var dueDate = new Date(tasks(i).DueDate);
                if (moment(dueDate).isValid && moment(dueDate).year() != 4501) { mailBody += " [Due: " + moment(dueDate).format("DD-MMM") + "]"; }
                if (taskExcerpt(tasks(i).Body, 10000)) { mailBody += "<br>" + "<font color=gray>" + taskExcerpt(tasks(i).Body, 10000) + "</font>"; }
                mailBody += "</li>";
            }
            mailBody += "</ul>";
        }

        // WAITING ITEMS
        if ($scope.config.WAITING_FOLDER.REPORT.DISPLAY) {
            var tasks = getOutlookFolder($scope.config.WAITING_FOLDER.NAME).Items.Restrict("[Status] = 3 And Not ([Sensitivity] = 2)");
            tasks.Sort("[Importance][Status]", true);
            mailBody += "<h3>" + $scope.config.WAITING_FOLDER.TITLE + "</h3>";
            mailBody += "<ul>";
            var count = tasks.Count;
            for (i = 1; i <= count; i++) {
                mailBody += "<li>"
                if (tasks(i).Categories !== "") { mailBody += "[" + tasks(i).Categories + "] "; }
                mailBody += "<strong>" + tasks(i).Subject + "</strong>" + " - <i>" + taskStatus(tasks(i).Status) + "</i>";
                if ($scope.config.WAITING_FOLDER.DISPLAY_PROPERTIES.TOTALWORK) { mailBody += " - " + tasks(i).TotalWork + " mn "; }
                if (tasks(i).Importance == 2) { mailBody += "<font color=red> [H]</font>"; }
                if (tasks(i).Importance == 0) { mailBody += "<font color=gray> [L]</font>"; }
                var dueDate = new Date(tasks(i).DueDate);
                if (moment(dueDate).isValid && moment(dueDate).year() != 4501) { mailBody += " [Due: " + moment(dueDate).format("DD-MMM") + "]"; }
                if (taskExcerpt(tasks(i).Body, 10000)) { mailBody += "<br>" + "<font color=gray>" + taskExcerpt(tasks(i).Body, 10000) + "</font>"; }
                mailBody += "</li>";
            }
            mailBody += "</ul>";
        }

        // BACKLOG ITEMS
        if ($scope.config.BACKLOG_FOLDER.REPORT.DISPLAY) {
            var tasks = getOutlookFolder($scope.config.BACKLOG_FOLDER.NAME).Items.Restrict("[Status] = 0 And Not ([Sensitivity] = 2)");
            tasks.Sort("[Importance][Status]", true);
            mailBody += "<h3>" + $scope.config.BACKLOG_FOLDER.TITLE + "</h3>";
            mailBody += "<ul>";
            var count = tasks.Count;
            for (i = 1; i <= count; i++) {
                mailBody += "<li>"
                if (tasks(i).Categories !== "") { mailBody += "[" + tasks(i).Categories + "] "; }
                mailBody += "<strong>" + tasks(i).Subject + "</strong>" + " - <i>" + taskStatus(tasks(i).Status) + "</i>";
                if ($scope.config.BACKLOG_FOLDER.DISPLAY_PROPERTIES.TOTALWORK) { mailBody += " - " + tasks(i).TotalWork + " mn "; }
                if (tasks(i).Importance == 2) { mailBody += "<font color=red> [H]</font>"; }
                if (tasks(i).Importance == 0) { mailBody += "<font color=gray> [L]</font>"; }
                var dueDate = new Date(tasks(i).DueDate);
                if (moment(dueDate).isValid && moment(dueDate).year() != 4501) { mailBody += " [Due: " + moment(dueDate).format("DD-MMM") + "]"; }
                if (taskExcerpt(tasks(i).Body, 10000)) { mailBody += "<br>" + "<font color=gray>" + taskExcerpt(tasks(i).Body, 10000) + "</font>"; }
                mailBody += "</li>";
            }
            mailBody += "</ul>";
        }

        mailBody += "</body>"

        // include report content to the mail body
        mailItem.HTMLBody = mailBody;

        // only display the draft email
        mailItem.Display();

    };

    // grabs the summary part of the task until the first '###' text
    // shortens the string by number of chars
    // tries not to split words and adds ... at the end to give excerpt effect
    var taskExcerpt = function (str, limit) {
        if (str.indexOf('\r\n### ') > 0) {
            str = str.substring(0, str.indexOf('\r\n###'));
        }
        // remove empty lines
        str = str.replace(/^(?=\n)$|^\s*|\s*$|\n\n+/gm, '');
        if (str.length > limit) {
            str = str.substring(0, str.lastIndexOf(' ', limit));
            str = str.replace('\r\n', '<br>');
            //if (limit != 0) { str = str + "..." }
        };
        return str;
    };

    var taskStatus = function (status) {
        var str = '';
        if (status == $scope.config.STATUS.NOT_STARTED.VALUE) { str = $scope.config.STATUS.NOT_STARTED.TEXT; }
        if (status == $scope.config.STATUS.IN_PROGRESS.VALUE) { str = $scope.config.STATUS.IN_PROGRESS.TEXT; }
        if (status == $scope.config.STATUS.WAITING.VALUE) { str = $scope.config.STATUS.WAITING.TEXT; }
        if (status == $scope.config.STATUS.COMPLETED.VALUE) { str = $scope.config.STATUS.COMPLETED.TEXT; }
        return str;
    };

    // create a new task under target folder
    $scope.addTask = function (target) {
        // set the parent folder to target defined
        switch (target) {
            case 'backlog':
                var tasksfolder = getOutlookFolder($scope.config.BACKLOG_FOLDER.NAME);
                break;
            case 'inprogress':
                var tasksfolder = getOutlookFolder($scope.config.INPROGRESS_FOLDER.NAME);
                break;
            case 'next':
                var tasksfolder = getOutlookFolder($scope.config.NEXT_FOLDER.NAME);
                break;
            case 'waiting':
                var tasksfolder = getOutlookFolder($scope.config.WAITING_FOLDER.NAME);
                break;
        };
        // create a new task item object in outlook
        var taskitem = tasksfolder.Items.Add();

        // add default task template to the task body
        taskitem.Body = $scope.config.TASK_TEMPLATE;

        // set sensitivity according to the current filter
        if ($scope.config.PRIVACY_FILTER) {
            if ($scope.private) {
                taskitem.Sensitivity = 2;
            }
        }

        // display outlook task item window
        taskitem.Display();

        if ($scope.config.AUTO_UPDATE) {
            $scope.saveState();

            // bind to taskitem write event on outlook and reload the page after the task is saved
            eval("function taskitem::Write (bStat) {window.location.reload();  return true;}");
        }

        // for anyone wondering about this weird double colon syntax:
        // Office is using IE11 to launch custom apps.
        // This syntax is used in IE to bind events. 
        //(https://msdn.microsoft.com/en-us/library/ms974564.aspx?f=255&MSPPError=-2147217396)
        //
        // by using eval we can avoid any error message until it is actually executed by Microsofts scripting engine
    }

    // opens up task item in outlook
    // refreshes the taskboard page when task item window closed
    $scope.editTask = function (item) {
        var taskitem = outlookNS.GetItemFromID(item.entryID);
        taskitem.Display();
        if ($scope.config.AUTO_UPDATE) {
            $scope.saveState();
            // bind to taskitem write event on outlook and reload the page after the task is saved
            eval("function taskitem::Write (bStat) {window.location.reload(); return true;}");
            // bind to taskitem beforedelete event on outlook and reload the page after the task is deleted
            eval("function taskitem::BeforeDelete (bStat) {window.location.reload(); return true;}");
        }
    };

    // deletes the task item in both outlook and model data
    $scope.deleteTask = function (item, sourceArray, filteredSourceArray, bAskConfirmation) {
        var doDelete = true;
        if (bAskConfirmation) {
            doDelete = window.confirm('Are you absolutely sure you want to delete this item?');
        }
        if (doDelete) {
            // locate and delete the outlook task
            var taskitem = outlookNS.GetItemFromID(item.entryID);
            taskitem.Delete();

            // locate and remove the item from the models
            removeItemFromArray(item, sourceArray);
            removeItemFromArray(item, filteredSourceArray);
        };
    };

    // moves the task item to the archive folder and marks it as complete
    // also removes it from the model data
    $scope.archiveTask = function (item, sourceArray, filteredSourceArray) {
        // locate the task in outlook namespace by using unique entry id
        var taskitem = outlookNS.GetItemFromID(item.entryID);

        // move the task to the archive folder first (if it is not already in)
        var archivefolder = getOutlookFolder($scope.config.ARCHIVE_FOLDER.NAME);
        if (taskitem.Parent.Name != archivefolder.Name) {
            taskitem = taskitem.Move(archivefolder);
        };

        // locate and remove the item from the models
        removeItemFromArray(item, sourceArray);
        removeItemFromArray(item, filteredSourceArray);
    };

    var removeItemFromArray = function (item, array) {
        var index = array.indexOf(item);
        if (index != -1) { array.splice(index, 1); }
    };

    // checks whether the task date is overdue or today
    // returns class based on the result
    $scope.isOverdue = function (strdate) {
        var dateobj = new Date(strdate).setHours(0, 0, 0, 0);
        var today = new Date().setHours(0, 0, 0, 0);
        return { 'task-overdue': dateobj < today, 'task-today': dateobj == today };
    };
    
    $scope.getFooterStyle = function (categories) {
        if ($scope.useCategoryColorFooters) {
            if ((categories !== '') && $scope.useCategoryColors) {
                // Copy category style
                if (categories.length == 1) {
                    return categories[0].style;
                }
                // Make multi-category tasks light gray
                else {
                    var lightGray = '#dfdfdf';
                    return { "background-color": lightGray, color: getContrastYIQ(lightGray) };
                }           
            }
        }
        return;
    };

    Date.daysBetween = function (date1, date2) {
        //Get 1 day in milliseconds
        var one_day = 1000 * 60 * 60 * 24;

        // Convert both dates to milliseconds
        var date1_ms = date1.getTime();
        var date2_ms = date2.getTime();

        // Calculate the difference in milliseconds
        var difference_ms = date2_ms - date1_ms;

        // Convert back to days and return
        return difference_ms / one_day;
    }

    Date.secondsBetween = function (date1, date2) {
        //Get 1 second in milliseconds
        var one_second = 1000;

        // Convert both dates to milliseconds
        var date1_ms = date1.getTime();
        var date2_ms = date2.getTime();

        // Calculate the difference in milliseconds
        var difference_ms = date2_ms - date1_ms;

        // Convert back to seconds and return
        return difference_ms / one_second;
    }

    $scope.editConfig = function () {
        var folder = outlookNS.GetDefaultFolder(11);
        var configItems = folder.Items.Restrict('[Subject] = "KanbanConfig"');
        var configItem = configItems(1);
        configItem.Display();
        // bind to taskitem write event on outlook and reload the page after the task is saved
        eval("function configItem::Write (bStat) {window.location.reload(); return true;}");
    }

    $scope.makeDefaultConfig = function () {
        return {
            "BACKLOG_FOLDER": {
                "ACTIVE": true,
                "NAME": "",
                "TITLE": "BACKLOG",
                "LIMIT": 0,
                "SORT": "duedate,-priority",
                "RESTRICT": "",
                "DISPLAY_PROPERTIES": {
                    "OWNER": false,
                    "PERCENT": false,
                    "TOTALWORK": false
                },
                "FILTER_ON_START_DATE": true,
                "REPORT": {
                    "DISPLAY": true
                }
            },
            "NEXT_FOLDER": {
                "ACTIVE": true,
                "NAME": "Kanban",
                "TITLE": "NEXT",
                "LIMIT": 20,
                "SORT": "duedate,-priority",
                "RESTRICT": "",
                "DISPLAY_PROPERTIES": {
                    "OWNER": false,
                    "PERCENT": false,
                    "TOTALWORK": false
                },
                "REPORT": {
                    "DISPLAY": true
                }
            },
            "INPROGRESS_FOLDER": {
                "ACTIVE": true,
                "NAME": "Kanban",
                "TITLE": "IN PROGRESS",
                "LIMIT": 5,
                "SORT": "-priority",
                "RESTRICT": "",
                "DISPLAY_PROPERTIES": {
                    "OWNER": false,
                    "PERCENT": false,
                    "TOTALWORK": false
                },
                "REPORT": {
                    "DISPLAY": true
                }
            },
            "WAITING_FOLDER": {
                "ACTIVE": true,
                "NAME": "Kanban",
                "TITLE": "WAITING",
                "LIMIT": 0,
                "SORT": "-priority",
                "RESTRICT": "",
                "DISPLAY_PROPERTIES": {
                    "OWNER": false,
                    "PERCENT": false,
                    "TOTALWORK": false
                },
                "REPORT": {
                    "DISPLAY": true
                }
            },
            "COMPLETED_FOLDER": {
                "ACTIVE": true,
                "NAME": "Kanban",
                "TITLE": "COMPLETED",
                "LIMIT": 0,
                "SORT": "-completeddate,-priority,subject",
                "RESTRICT": "",
                "DISPLAY_PROPERTIES": {
                    "OWNER": false,
                    "PERCENT": false,
                    "TOTALWORK": false
                },
                "REPORT": {
                    "DISPLAY": true
                },
                "EDITABLE": true
            },
            "ARCHIVE_FOLDER": {
                "NAME": "Completed"
            },
            "TASKNOTE_EXCERPT": 100,
            "TASK_TEMPLATE": "\r\n\r\n### TODO:\r\n\r\n\r\n\r\n### STATUS:\r\n\r\n\r\n\r\n### ISSUES:\r\n\r\n\r\n\r\n### REFERENCE:\r\n\r\n\r\n\r\n",
            "DATE_FORMAT": "dd-MMM",
            "USE_CATEGORY_COLORS": true,
            "USE_CATEGORY_COLOR_FOOTERS": false,
            "SAVE_STATE": true,
            "PRIVACY_FILTER": true,
            "STATUS": {
                "NOT_STARTED": {
                    "VALUE": 0,
                    "TEXT": "Not Started"
                },
                "IN_PROGRESS": {
                    "VALUE": 1,
                    "TEXT": "In Progress"
                },
                "WAITING": {
                    "VALUE": 3,
                    "TEXT": "Waiting For Someone Else"
                },
                "COMPLETED": {
                    "VALUE": 2,
                    "TEXT": "Completed"
                }
            },
            "COMPLETED": {
                "AFTER_X_DAYS": 7,
                "ACTION": "ARCHIVE"
            },
            "AUTO_UPDATE": true,
            "AUTO_START_TASKS": false

        };
    }
});

