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

var getOrigLi = function(tab, line) {
  return $($('ol.linenums li', $('.tab-pane').get(tab)).get(line));
}

// open new comment dialog at a given position
var addComment = function(tab, line) {
  var lineLi = getLineLi(tab, line);
  if($('.comment-text', lineLi).length == 0) {
    var commentBox = $('<div class="comment comment-text"><textarea class="form-control"></textarea><a onclick="closeComment(' + tab + ',' + line + ')" class="fa fa-times"></a><a onclick="submitComment(' + tab + ',' + line + ')" class="fa fa-arrow-right"></a></div>');
    lineLi.append(commentBox);
  }
};

// close an already-open new comment dialog at a given position
var closeComment = function(tab, line) {
  $('.comment-text', getLineLi(tab, line)).remove();
};

// add a comment in the db and update the ui
var submitComment = function(tab, line) {
  var lineLi = getLineLi(tab, line);
  var text = $('textarea', lineLi).val();
  var innerComment = $('.comment-text', lineLi);
  innerComment.html('<span class="fa fa-spinner fa-spin"></span> Posting');
  var url = document.URL;
  if(url.charAt(url.length-1) != '/') url += '/';
  $.post(url + 'comment', {tab: tab, line: line, text: text}, function(data, textStatus, jqXHR) {
    if(data.code == 0) {
      innerComment.remove();
      delete data.code;
      appendComment(data);
    } else {
      alert('There was an issue posting your comment. Please reload the page and try again.');
    }
  });
};

// displays a comment in UI. comment must have certain fields defined (see GET or POST '/:id/comment' in routes/teacher/submission.js)
var appendComment = function(comment) {
  var li = getLineLi(comment.tab, comment.line);
  var date = new Date(comment.timestamp);
  var html = '<div class="comment comment-line-' + comment.line + ' comment-tab-' + comment.tab + '" id="comment-' + comment.id + '">';
  html += '<div class="data">'
  html += '<div class="date">'
  html += date.toLocaleString();
  html += '</div>';
  if(comment.owns) { // if this person owns this comment, add delete and edit buttons
    html += '<div class="buttons">';
    html += '<a class="fa fa-pencil-square-o" onclick="editComment(' + comment.id + ',' + comment.tab + ',' + comment.line + ')"></a>';
    html += '<a class="fa fa-trash-o" onclick="deleteComment(' + comment.id + ')"></a>';
    html += '</div>';
  }
  html += '<div class="name">';
  html += comment.name + ':';
  html += '</div>';
  html += '</div>';
  html += '<div class="message">';
  html += comment.message;
  html += '</div>';
  html += '<div class="links">';
  html += '<a onclick="addComment(' + comment.tab + ',' + comment.line + ')">Reply</a>';
  html += '</div>';
  html += '</div>';;
  var div = $(html);
  div.mouseenter(function() {
    var tabLine = getTabLine($(this));
    var lio = getOrigLi(tabLine.tab, tabLine.line);
    lio.css('background-color', '#FFA');
  });
  div.mouseleave(function() {
    var tabLine = getTabLine($(this));
    var lio = getOrigLi(tabLine.tab, tabLine.line);
    lio.css('background-color', '');
  });
  li.append(div);
}

// finds the tab and line encoded into a div created in appendComment
var getTabLine = function(div) {
  var classes = div.attr('class').split(' ');
  var line = classes[1].split('-')[2];
  var tab = classes[2].split('-')[2];
  return {line: line, tab: tab};
};

var editComment = function(id, tab, line) {
  var text = $('#comment-' + id + ' .message').html();
  var commentBox = $('<div class="edit"><textarea class="form-control">' + text + '</textarea><div><a onclick="cancelEditComment(' + id + ')" class="fa fa-times"></a><a onclick="submitEditComment(' + tab + ',' + line + ')" class="fa fa-arrow-right"></a></div></div>');
  var comment = $('#comment-' + id);
  comment.addClass('comment-text-edit');
  comment.append(commentBox); // add old html with new html (old html is hidden via magic css)
};

var cancelEditComment = function(id) {
  $('#comment-' + id + ' .edit').remove();
  $('#comment-' + id).removeClass('comment-text-edit');
};

var submitEditComment = function(id, text) {
  var url = document.URL;
  if(url.charAt(url.length-1) != '/') url += '/';
  $.post(url + 'comment/' + id + '/edit', {text: text}, function(data, textStatus, jqXHR) {
    if(data.code == -1) {
      alert('An error has occurred. Please reload the page.');
    } else {
      // todo update UI
    }
  });
};

var deleteComment = function(id) {
  var url = document.URL;
  if(url.charAt(url.length-1) != '/') url += '/';
  $.post(url + 'comment/' + id + '/delete', '', function(data, textStatus, jqXHR) {
    if(data.code == -1) {
      alert('An error has occurred. Please reload the page.');
    } else {
      $('#comment-' + id).remove();
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

  // retrieve and display comments
  var url = document.URL;
  if(url.charAt(url.length-1) != '/') url += '/';
  $.get(url + 'comment/', {}, function(data, textStatus, jqXHR) {
    if(data.code != 0) {
      var lio = getOrigLi(0,0);
      lio.append('<div class="comment">Error retrieving comments</div>');
    } else {
      for(i in data.comments) {
        appendComment(data.comments[i]);
      }
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

