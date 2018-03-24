var tbConfig = angular.module('taskboardApp.config', []);

var config_data = {

  'CONFIG': {

    // Outlook Task folders
    // Name: Name of the task folder
    // Title: Task lane title
    // Limit: hard limits for each task lane. 0 = no limit
    // Sort: Sort order for tasks (default = priority), can state multiple sort keys separated by comma, use '-' to sort descending, Example "duedate,-priority,subject"
    // Restrict: Restrict certain tasks (More info = https://msdn.microsoft.com/en-us/library/office/ff869597.aspx)
    //           N.B.: The folders will already be filtered on task status 
    'BACKLOG_FOLDER': {
      Name: '', Title: 'BACKLOG', Limit: 0, Sort: "duedate,-priority", Restrict: "",
      'SHOW': {
        'OWNER': false,
        'PERCENT': false,
      },
      'FILTER_ON_START_DATE': true,
      'REPORT': {
        'SHOW': true,
      }
    },
    'NEXT_FOLDER': {
      Name: 'Kanban', Title: 'NEXT', Limit: 20, Sort: "duedate,-priority", Restrict: "",
      'SHOW': {
        'OWNER': false,
        'PERCENT': false,
      },
      'REPORT': {
        'SHOW': true,
      }
    },
    'INPROGRESS_FOLDER': {
      Name: 'Kanban', Title: 'IN PROGRESS', Limit: 5, Sort: "-priority", Restrict: "",
      'SHOW': {
        'OWNER': false,
        'PERCENT': false,
      },
      'REPORT': {
        'SHOW': true,
      }
    },
    'WAITING_FOLDER': {
      Name: 'Kanban', Title: 'WAITING', Limit: 0, Sort: "-priority", Restrict: "",
      'SHOW': {
        'OWNER': false,
        'PERCENT': false,
      },
      'REPORT': {
        'SHOW': true,
      }
    },
    'COMPLETED_FOLDER': {
      Name: 'Kanban', Title: 'COMPLETED', Limit: 0, Sort: "-completeddate,-priority,subject", Restrict: "",
      'SHOW': {
        'OWNER': false,
        'PERCENT': false,
      },
      'REPORT': {
        'SHOW': true,
      }
    },
    'ARCHIVE_FOLDER': { Name: 'Completed' },

    // Task Note Excerpt Size
    // number of chars for each task note
    // 0 = makes no notes appear on the each task card
    'TASKNOTE_EXCERPT': 100,

    // Default task template
    'TASK_TEMPLATE': '\r\n\r\n### TODO:\r\n\r\n\r\n\r\n### STATUS:\r\n\r\n\r\n\r\n### ISSUES:\r\n\r\n\r\n\r\n### REFERENCE:\r\n\r\n\r\n\r\n',

    'DATE_FORMAT': 'dd-MMM',

    'USE_CATEGORY_COLORS': true,

    'SAVE_STATE': true,     // Preserve state between window.reloads (privacy and search filter)
    'PRIVACY_FILTER': true, // Add filter to separately handle private tasks

    // Outlook task statuses
    'STATUS': {
      'NOT_STARTED': { Value: 0, Text: "Not Started" },
      'IN_PROGRESS': { Value: 1, Text: "In Progress" },
      'WAITING': { Value: 3, Text: "Waiting For Someone Else" },
      'COMPLETED': { Value: 2, Text: "Completed" }
    },

    // Configure what needs to be done with completed tasks
    // N.B. 0 days means immediately, which makes the Completed column display nothing at all
    'COMPLETED': {
      'AFTER_X_DAYS': 7,
      'ACTION': 'ARCHIVE' // the options are: NONE, HIDE, ARCHIVE, DELETE
    },

    'AUTO_UPDATE': true, // Switch for reloading the page after adding or editing tasks

  }
};

angular.forEach(config_data, function (key, value) {
  tbConfig.constant(value, key);
});

