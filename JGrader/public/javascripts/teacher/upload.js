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
  parallelUploads: 100,
  addRemoveLinks: true,
  dictRemoveFile: '<img src="/images/times.svg">',
  init: function() {
    var myDropzone = this;

    $('#submit-btn').click(function(e) {
      e.preventDefault();
      e.stopPropagation();
      if (myDropzone.files.length > 0) {
        myDropzone.processQueue();
      } else {
        $('#assign-create').submit();
      }
    });

    this.on('successmultiple', function() {
      window.location.href = '/teacher/assignment';
    });
  }
});
