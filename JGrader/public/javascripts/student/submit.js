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

// The Browser API key obtained from the Google Developers Console.
// Replace with your own Browser API key, or your own key.
var developerKey = 'AIzaSyA-SyAcuSH8rt5FTFng9m668zG41pEImtM';

// The Client ID obtained from the Google Developers Console. Replace with your own Client ID.
var clientId = '835071763335-v3cfbmm39vboo0lh1dureqe0cqkop6j9.apps.googleusercontent.com';

// Replace with your own App ID. (Its the first number in your Client ID)
var appId = '835071763335';

// Scope to use to access user's Drive items.
var scope = ['https://www.googleapis.com/auth/drive'];

var pickerApiLoaded = false;
var oauthToken;

// Use the Google API Loader script to load the google.picker script.
function loadPicker() {
gapi.load('auth', {'callback': onAuthApiLoad});
gapi.load('picker', {'callback': onPickerApiLoad});
}

function onAuthApiLoad() {
window.gapi.auth.authorize(
    {
      'client_id': clientId,
      'scope': scope,
      'immediate': false
    },
    handleAuthResult);
}

function onPickerApiLoad() {
  pickerApiLoaded = true;
  createPicker();
}

function handleAuthResult(authResult) {
  if (authResult && !authResult.error) {
    oauthToken = authResult.access_token;
    createPicker();
  }
}

// Create and render a Picker object for searching files.
function createPicker() {
  if (pickerApiLoaded && oauthToken) {
    var view = new google.picker.View(google.picker.ViewId.DOCS);
    var picker = new google.picker.PickerBuilder()
        .enableFeature(google.picker.Feature.NAV_HIDDEN)
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
        .setAppId(appId)
        .setOAuthToken(oauthToken)
        .addView(view)
        .addView(new google.picker.DocsUploadView())
        .setDeveloperKey(developerKey)
        .setCallback(pickerCallback)
        .build();
      picker.setVisible(true);
  }
}

// A simple callback implementation.
function pickerCallback(data) {
  if (data.action == google.picker.Action.PICKED) {
    var fileId = data.docs[0].id;
    console.log('The user selected: ' + fileId);
    $.get('https://www.googleapis.com/drive/v2/files/' + fileId, {}, function(data, textStatus, jqXHR) {
      // TODO
      console.log('DATA RECEIVED');
      console.log(data);
    });
  }
}
