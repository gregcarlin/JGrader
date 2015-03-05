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

var getLineLi = function(tab, line) {
  return $($('ol.comments li', $('.tab-pane').get(tab)).get(line));
};

// open new comment dialog at a given position
var addComment = function(tab, line) {
  var lineLi = getLineLi(tab, line);
  if($('.comment-text', lineLi).length == 0) {
    var commentBox = $('<div class="comment comment-text"><textarea class="form-control"></textarea><button class="btn btn-lg btn-success" onclick="submitComment(' + tab + ',' + line + ')"><span class="fa fa-arrow-right"></span></button><button class="btn btn-lg btn-danger" onclick="closeComment(' + tab + ',' + line + ')"><span class="fa fa-times"></span></button></div>');
    lineLi.append(commentBox);
  }
};

// close an already-open new comment dialog at a given position
var closeComment = function(tab, line) {
  $('.comment-text', getLineLi(tab, line)).remove();
};

var submitComment = function(tab, line) {
  var lineLi = getLineLi(tab, line);
  var text = $('textarea', lineLi).val();
  //closeComment(tab, line);
  var innerComment = $('.comment-text', lineLi);
  innerComment.html('<span class="fa fa-spinner fa-spin"></span> Posting comment');
  var url = document.URL;
  if(url.charAt(url.length-1) != '/') url += '/';
  $.post(url + 'comment', {tab: tab, line: line, text: text}, function(data, textStatus, jqXHR) {
    if(data.code == 0) {
      innerComment.remove();
      lineLi.append('<div class="comment">' + text + '</div>');
    } else {
      alert('There was an issue posting your comment. Please reload the page and try again.');
    }
  });
};

$(document).ready(function() {
  prettyPrint();
  $('.tab-pane').each(function(tab, elem) {
    $('ol.linenums li', elem).each(function(index, element) {
      $(element).prepend('<a onclick="addComment(' + tab + ','  + index  + ')" class="fa fa-comment-o"></a>');
      $('ol.comments', elem).append('<li></li>');
    });
  });
});

$('#download').click(function() {
  var fileID = $('.tab-content .active').attr('id');
  var url = document.URL;
  if(url.charAt(url.length-1) != '/') url += '/';
  var win = window.open(url + 'download/' + fileID, '_blank');
  win.focus();
});

