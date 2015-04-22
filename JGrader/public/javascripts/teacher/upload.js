// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

Dropzone.autoDiscover = false;
$('#assign-create').dropzone({
  url: '/teacher/assignment/create',
  clickable: '.clickable',
  createImageThumbnails: false,
  previewsContainer: '.files',
  autoProcessQueue: false,
  method: 'post',
  uploadMultiple: true,
  init: function() {
    var myDropzone = this;

    $('#submit').click(function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('procssing queue');
      myDropzone.processQueue();
    });

    this.on('successmultiple', function() {
      window.location.href = '/teacher/assignment';
    });
  }
});
