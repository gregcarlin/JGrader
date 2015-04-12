// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

// hide submit button before any files are added
$('#actions .start').hide();

// Get the template HTML and remove it from the doumenthe template HTML and remove it from the doument
var previewNode = document.querySelector(".file-row");
previewNode.id = "";
//var previewTemplate = previewNode.parentNode.innerHTML;
var previewTemplate = previewNode.outerHTML;
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
  clickable: ".dz-clickable" // Define the element that should be used as click trigger to select files.
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

// show submit button when a file is added
myDropzone.on("addedfile", function(file) {
  $('#actions .start').show();
});

// hide submit button when all files are removed
myDropzone.on("removedfile", function(file) {
  if(myDropzone.files.length <= 0) {
    $('#actions .start').hide();
  }
});

// Update the progress bars
myDropzone.on("uploadprogress", function(file, progress) {
  $('.progress-bar', $('p.name:contains("' + file.name + '")').parent().parent()).css('width', progress + '%');
});

myDropzone.on("sending", function(file) {
  // Show the total progress bar when upload starts
  $('#total-progress').show();
  // And disable the start button
  $('#actions .buttons').hide();
  $('#actions .drag-zone').hide();
  $('button.cancel').hide();
});

// Hide the total progress bar when nothing is uploading anymore
myDropzone.on("queuecomplete", function(progress) {
  $('.progress').hide();
  $('#actions').html('<div class="red">Please reload the page in order to try again.</div>');
});

document.querySelector("#actions .start").onclick = function() {
  myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));
};
