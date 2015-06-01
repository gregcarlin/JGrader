// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

// hide submit button before any files are added
$('.submit-assignment').hide();
$('.prog-total').hide();

// Get the template HTML and remove it from the doumenthe template HTML and remove it from the doument
var previewNode = document.querySelector(".file-row");
previewNode.id = "";
//var previewTemplate = previewNode.parentNode.innerHTML;
var previewTemplate = previewNode.outerHTML;
previewNode.parentNode.removeChild(previewNode);

var myDropzone = new Dropzone(document.querySelector(".drag-zone"), {
  url: (document.URL + '/submit'), // Set the url
  thumbnailWidth: 80,
  thumbnailHeight: 80,
  parallelUploads: 20,
  uploadMultiple: true,
  previewTemplate: previewTemplate,
  autoQueue: false, // Make sure the files aren't queued until manually added
  previewsContainer: "#previews-inner", // Define the container to display the previews
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
    case 6:
      alert('You must designate one of the files as the main file.');
      break;
  }
  responded = true;
});

// show submit button when a file is added
myDropzone.on("addedfile", function(file) {
  $('.submit-assignment').show();
  $('input[name="main"]').change(function() {
    var mainFile = $('.name', $(this).parent()).text();
    if(!myDropzone.options.headers) myDropzone.options.headers = {};
    myDropzone.options.headers['main-file'] = mainFile;
  });
});

// hide submit button when all files are removed
myDropzone.on("removedfile", function(file) {
  if(myDropzone.files.length <= 0) {
    $('.submit-assignment').hide();
  }
});

// update total progress bar
myDropzone.on("totaluploadprogress", function(uploadProgress, totalBytes, totalBytesSent) {
  $('.prog-total .progress-bar').css('width', uploadProgress + '%');
});

myDropzone.on("sending", function(file) {
  // Show the total progress bar when upload starts
  $('.prog-total').show();
  // And disable the start button
  $('.submit-assignment').hide();
  $('.cancel').hide();
});

// Hide the total progress bar when nothing is uploading anymore
myDropzone.on("queuecomplete", function(progress) {
  $('.progress').hide();
  $('#actions').html('<div class="alert alert-danger" role="alert"">Please <a href="">reload</a> the page in order to try again.</div>');
});

document.querySelector('button[type="submit"]').onclick = function() {
  myDropzone.enqueueFiles(myDropzone.getFilesWithStatus(Dropzone.ADDED));
};

