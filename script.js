$(function() {

  // Load test data using AJAX
  function getStatusData(dataId) {
    $('tbody').empty();
    $('.error').empty();
    $.getJSON('/data/test' + dataId + '.json')
      .done(function(response) {
        outputDataTable(response.DATA);
      })
      .fail(function(jqXHR, textStatus, errorThrown) {
        console.log(textStatus);
        console.log(errorThrown);
        outputError(errorThrown);
      });
  }

  // Output error message to the page
  function outputError(error) {
    $('table').before('<span class="error">' + error + '</span>');
  }

  // Convert timestamp to formatted time in user timezone
  function formatDate(timestamp) {
    var userOffset = moment().utcOffset();
    var utcTime = moment(timestamp).utc();
    return utcTime.add(userOffset, 'minutes').format('MM/DD/YYYY hh:mm A');
  }

  // Return time string for reminaing tasks
  function formatRemainingTime(timestamp) {
    var duration = moment.duration(timestamp);
    if (duration.days() > 2) {
      return duration.days() + ' days';
    } else {
      return duration.hours() + ':' + duration.minutes() + ':' + duration.seconds();
    }
  }

  // Set status code and flag on the task for later use
  function getStatusCode(task) {
    var status;
    var isActive;
    if (!task.hasOwnProperty('start_date')) {
      status = 'INACTIVE';
      isActive = false;
    } else if (task.hasOwnProperty('end_date') && task.total !== task.processed) {
      status = 'ERROR';
      isActive = false;
    } else if (task.hasOwnProperty('end_date') && task.total === task.processed) {
      status = 'SUCCESS';
      isActive = false;
    } else if (!task.hasOwnProperty('end_date') && task.total !== task.processed) {
      status = 'IN PROGRESS';
      isActive = true;
    } else {
      status = 'UNKNOWN';
    }
    task.statusCode = status;
    task.isActive = isActive;
    return task;
  }

  // Return status indicator string for table
  function getStatusString(task) {
    switch (task.statusCode) {
      case 'INACTIVE':
        return 'not started';
      case 'SUCCESS':
        return 'Completed: ' + formatDate(task.end_date);
      case 'ERROR':
        return 'Halted: ' + formatDate(task.end_date);
      case 'IN PROGRESS':
        return 'Time Remaining: ' + formatRemainingTime(task.remaining);
      default:
        return 'Unknown';
    }
  }

  // Highlight key words for nice status
  function formatNiceStatus(niceStatus, statusCode) {
    if (statusCode === 'SUCCESS') {
      return niceStatus.replace(/success/gi, function(match) {
        return '<strong>' + match + '</strong>';
      });
    } else if (statusCode === 'ERROR') {
      return niceStatus.replace(/fail|error/gi, function(match) {
        return '<strong>' + match + '</strong>';
      });
    } else {
      return niceStatus;
    }
  }

  function sortTasks(a, b) {
    // Sort: Inactive tasks --> Tasks in progress
    if (!a.isActive && !b.isActive) {
      // Secondary sort: Completion date
      if (a.end_date < b.end_date) {
        return -1;
      } else {
        return 1;
      }
    } else if (a.isActive) {
      return 1;
    } else {
      return -1;
    }
  }

  function outputDataTable(statusData) {
    if (Array.isArray(statusData)) {
      // Add statusCode and isActive properties to each task
      statusData.forEach(getStatusCode);

      // Sort tasks by inactive --> in progress, completion date
      statusData.sort(sortTasks);

      statusData.forEach(function(task) {

        // Determine task progress
        var processed = task.hasOwnProperty('processed') ? task.processed : 0;
        var progress = filesize(processed) + '/' + filesize(task.total);

        // Construct new table row as a DOM string
        var domString = 
          '<tr>'
            + '<td>' + getStatusString(task) + '</td>'
            + '<td>' + progress + '</td>'
            + '<td><a href="mailto:' + task.email + '">' + task.fullname + '</a></td>'
            + '<td>' + formatDate(task.request_date) + '</td>'
          + '</tr>'
          + '<tr>'
            + '<td colspan="4">' + formatNiceStatus(task.status, task.statusCode) + '</td>'
          + '</tr>';

        $('tbody').append(domString);

      });
    }
  }

  getStatusData('');

  $('select').change(function(e) {
    getStatusData(e.target.value);
  });

});