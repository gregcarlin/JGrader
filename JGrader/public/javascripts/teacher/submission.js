// Created by Brian Singer and Greg Carlin in 2015.
// Copyright (c) 2015 JGrader. All rights reserved.

$('#input-expand').click(function() {
  var inputExpand = $('#input-expand');
  inputExpand.toggleClass('fa-caret-square-o-right');
  inputExpand.toggleClass('fa-caret-square-o-down');
  $('#input-text').toggle();
});

$('#execute').click(function() {
  $('#output-text').html('<span class="fa fa-refresh fa-spin"></span>');
  var fileID = $('.tab-content .active').attr('id');
  var url = document.URL;
  if(url.charAt(url.length-1) != '/') url += '/';
  $.post(url + 'run/' + fileID, {stdin: $('#input-text').val()}, function(data, textStatus, jqXHR) {
    if(data.code == 0) {
      $('#output-text').html(data.out + '\n\n<span class="stderr">' + data.err + '</span>');
    } else {
      alert('An error has occurred, please reload the page and try again.');
    }
  });
});

$('#download').click(function() {
  var fileID = $('.tab-content .active').attr('id');
  var url = document.URL;
  if(url.charAt(url.length-1) != '/') url += '/';
  var win = window.open(url + 'download/' + fileID, '_blank');
  win.focus();
});

