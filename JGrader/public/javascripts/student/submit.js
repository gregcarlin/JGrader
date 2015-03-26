// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

// Get the template HTML and remove it from the doumenthe template HTML and remove it from the doument
var previewNode = document.querySelector("#template");
previewNode.id = "";
var previewTemplate = previewNode.parentNode.innerHTML;
previewNode.parentNode.removeChild(previewNode);

var myDropzone = new Dropzone(document.querySelector(".tester"), {
  url: (document.URL + '/submit'), // Set the url
  thumbnailWidth: 80,
  thumbnailHeight: 80,
  parallelUploads: 20,
  uploadMultiple: true,
  previewTemplate: previewTemplate,
  autoQueue: false, // Make sure the files aren't queued until manually added
  previewsContainer: "#previews", // Define the container to display the previews
  clickable: ".fileinput-button" // Define the element that should be used as click trigger to select files.
});

var responded = false;
myDropzone.on("success", function(file, response) {
  if(responded) return; // we already alerted the user or whatever
  // fuck it, we're just going to alert errors
  switch(response.code) {
    case -1: // unknown error
    default: // we didn't handle something properly
      alert('An unknown error has occurred. Please reload the page and try again.');
      break;
    case 0: // all good
      window.location.href = document.URL; // reload page
      break;
    case 1: // code can't compile
      alert('Your code could not be compiled. Please fix it and try again.');
      break;
    case 2: // invalid name
      alert('Some of your files have invalid names. Only alphanumeric characters and periods are allowed, and names must contain at least 6 characters. Please rename one or more of your files and try again.');
      break;
    case 3: // already submitted
      alert('You already submitted this!. Please reload the page and try again.');
      break;
    case 4: // no java files submitted
      alert('You must submit at least one java file. Make sure they end in .java');
      break;
    case 5: // duplicate names
      alert('No two files can share the same name.');
      break;
  }
  responded = true;
});

// Update the total progress bar
myDropzone.on("totaluploadprogress", function(progress) {
  $('#total-progress .progress-bar').css('width', progress + '%');
});

myDropzone.on("sending", function(file) {
  // Show the total progress bar when upload starts
  $('#total-progress').show();
  // And disable the start button
  $('#actions .buttons').hide();
  $('#actions .drag-zone').hide();
});

// Hide the total progress bar when nothing is uploading anymore
myDropzone.on("queuecomplete", function(progress) {
  $('.progress').hide();
  $('#actions').html('<div class="red">Please reload the page in order to try again.</div>');
});

document.querySelector("#actions .start").onclick = function() {
  myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));
};

/**!
 * Google Drive File Picker Example
 * By Daniel Lo Nigro (http://dan.cx/)
 */
(function() {
  /**
   * Initialise a Google Driver file picker
   */
  var FilePicker = window.FilePicker = function(options) {
    // Config
    this.apiKey = options.apiKey;
    this.clientId = options.clientId;
 
    // Elements
    this.buttonEl = options.buttonEl;
 
    // Events
    this.onSelect = options.onSelect;
    this.buttonEl.addEventListener('click', this.open.bind(this));
 
    // Disable the button until the API loads, as it won't work properly until then.
    this.buttonEl.disabled = true;
 
    // Load the drive API
    gapi.client.setApiKey(this.apiKey);
    gapi.client.load('drive', 'v2', this._driveApiLoaded.bind(this));
    google.load('picker', '1', { callback: this._pickerApiLoaded.bind(this) });
  }
 
  FilePicker.prototype = {
    /**
     * Open the file picker.
     */
    open: function() {
      // Check if the user has already authenticated
      var token = gapi.auth.getToken();
      if (token) {
        this._showPicker();
      } else {
        // The user has not yet authenticated with Google
        // We need to do the authentication before displaying the Drive picker.
        this._doAuth(false, function() { this._showPicker(); }.bind(this));
      }
    },
 
    /**
     * Show the file picker once authentication has been done.
     * @private
     */
    _showPicker: function() {
      var accessToken = gapi.auth.getToken().access_token;
      var view = new google.picker.DocsView();
      view.setIncludeFolders(true);
      this.picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setAppId(this.clientId)
        .setDeveloperKey(this.apiKey)
        .setOAuthToken(accessToken)
        .addView(view)
        .setCallback(this._pickerCallback.bind(this))
        .build()
        .setVisible(true);
    },
 
    /**
     * Called when a file has been selected in the Google Drive file picker.
     * @private
     */
    _pickerCallback: function(data) {
      if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
        var file = data[google.picker.Response.DOCUMENTS][0],
          id = file[google.picker.Document.ID],
          request = gapi.client.drive.files.get({
            fileId: id
          });
 
        request.execute(this._fileGetCallback.bind(this));
      }
    },
    /**
     * Called when file details have been retrieved from Google Drive.
     * @private
     */
    _fileGetCallback: function(file) {
      if (this.onSelect) {
        this.onSelect(file);
      }
    },
 
    /**
     * Called when the Google Drive file picker API has finished loading.
     * @private
     */
    _pickerApiLoaded: function() {
      this.buttonEl.disabled = false;
    },
 
    /**
     * Called when the Google Drive API has finished loading.
     * @private
     */
    _driveApiLoaded: function() {
      this._doAuth(true);
    },
 
    /**
     * Authenticate with Google Drive via the Google JavaScript API.
     * @private
     */
    _doAuth: function(immediate, callback) {
      gapi.auth.authorize({
        client_id: this.clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        immediate: immediate
      }, callback);
    }
  };
}());

function downloadFile(file, callback) {
  if (file.downloadUrl) {
    var accessToken = gapi.auth.getToken().access_token;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', file.downloadUrl);
    xhr.setRequestHeader('Authorization', 'Bearer ' + accessToken);
    xhr.onload = function() {
      callback(xhr.responseText);
    };
    xhr.onerror = function() {
      callback(null);
    };
    xhr.send();
  } else {
    callback(null);
  }
}

function initPicker() {
  var picker = new FilePicker({
    apiKey: 'AIzaSyA-SyAcuSH8rt5FTFng9m668zG41pEImtM',
    clientId: '835071763335-v3cfbmm39vboo0lh1dureqe0cqkop6j9.apps.googleusercontent.com',
    buttonEl: document.getElementById('pick'),
    onSelect: function(file) {
      downloadFile(file, function(contents) {
        if(contents) {
          // TODO
        } else {
          // TODO unable to get contents, probably a spreadsheet or something gross
        }
      });
    }
  });
}
