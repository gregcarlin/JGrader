var URL = function() {
  var base = location.protocol + '//' + location.host + location.pathname;
  if (base.substring(base.length - 1) != '/') base += '/';
  return base;
};

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
  if(text.trim().length <= 0) {
    alert('You cannot post an empty comment.');
  } else {
    var innerComment = $('.comment-text', lineLi);
    innerComment.html('<span class="fa fa-spinner fa-spin"></span> Posting');
    $.post(URL() + 'comment', {tab: tab, line: line, text: text}, function(data, textStatus, jqXHR) {
      if(data.code == 0) {
        innerComment.remove();
        delete data.code;
        appendComment(data);
      } else {
        alert('There was an issue posting your comment. Please reload the page and try again.');
      }
    });
  }
};

// displays a comment in UI. comment must have certain fields defined (see GET or POST '/:id/comment' in routes/comments.js)
var appendComment = function(comment) {
  var li = getLineLi(comment.tab, comment.line);
  var date = new Date(comment.timestamp);
  var html = '<div class="comment comment-line-' + comment.line + ' comment-tab-' + comment.tab + '" id="comment-' + comment.id + '">';
  html += '<div class="data">'
  html += '<div class="date">'
  html += date.toLocaleString();
  html += '</div>';
  html += '</div>';
  html += '<div class="name">';
  html += comment.name + ':';
  html += '</div>';
  html += '<div class="message">';
  html += comment.message;
  html += '</div>';
  html += '<div class="bottom-links">';
  html += '<div class="links">';
  html += '<a onclick="addComment(' + comment.tab + ',' + comment.line + ')">Reply</a>';
  html += '</div>';
  if(comment.owns) { // if this person owns this comment, add delete and edit buttons
    html += '<div class="buttons">';
    html += '<a class="fa fa-pencil-square-o" onclick="editComment(' + comment.id + ',' + comment.tab + ',' + comment.line + ')"></a>';
    html += '<a class="fa fa-trash-o" onclick="deleteComment(' + comment.id + ')"></a>';
    html += '</div>';
  }
  html += '</div>';
  html += '</div>';
  var div = $(html);
  div.mouseenter(function() {
    var tabLine = getTabLine($(this));
    var lio = getOrigLi(tabLine.tab, tabLine.line);
    lio.css('background-color', 'rgba(234,128,128,60)');
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
  var html = '<div class="edit">';
  html += '<textarea class="form-control">';
  html += text;
  html += '</textarea>';
  html += '<div>';
  html += '<a onclick="cancelEditComment(' + id + ')" class="fa fa-times">';
  html += '</a>';
  html += '<a onclick="submitEditComment(' + id + ')" class="fa fa-arrow-right">';
  html += '</a>';
  html += '</div>';
  html += '</div>'; // close .edit div
  var commentBox = $(html);
  var comment = $('#comment-' + id);
  comment.addClass('comment-text-edit');
  comment.append(commentBox); // add new html to end of old html (old html is hidden via magic css)
};

var cancelEditComment = function(id) {
  $('#comment-' + id + ' .edit').remove();
  $('#comment-' + id).removeClass('comment-text-edit');
};

var submitEditComment = function(id) {
  $('#comment-' + id).append('<span class="fa fa-spinner fa-spin"></span>');
  var text = $('#comment-' + id + ' .edit textarea').val();
  $('#comment-' + id + ' .edit').remove(); // remove text area and stuff
  $.post(URL() + 'comment/' + id + '/edit', {text: text}, function(data, textStatus, jqXHR) {
    if(data.code != 0) {
      alert('An error has occurred. Please reload the page.');
    } else {
      $('#comment-' + id + ' .fa-spinner').remove();
      $('#comment-' + id + ' .message').html(text); // update text
      $('#comment-' + id).removeClass('comment-text-edit'); // removes class so old comment is displayed properly
    }
  });
};

var deleteComment = function(id) {
  $('#comment-' + id).html('<span class="fa fa-spinner fa-spin"></span>');
  $.post(URL() + 'comment/' + id + '/delete', '', function(data, textStatus, jqXHR) {
    if(data.code == -1) {
      alert('An error has occurred. Please reload the page.');
    } else {
      $('#comment-' + id).remove();
    }
  });
};

$(document).ready(function() {
  prettyPrint();
  $('code').css('white-space', 'nowrap'); // must be added after prettyPrint to not cause interference

  $('.tab-pane').each(function(tab, elem) {
    $('ol.linenums li', elem).each(function(index, element) {
      $(element).prepend('<a onclick="addComment(' + tab + ','  + index  + ')" class="fa fa-comment-o"></a>');
      $('ol.comments', elem).append('<li></li>');
    });
  });

  // retrieve and display comments
  $.get(URL() + 'comment/', {}, function(data, textStatus, jqXHR) {
    if(data.code != 0) {
      var lio = getLineLi(0,0);
      lio.append('<div class="comment">Error retrieving comments</div>');
    } else {
      for(i in data.comments) {
        appendComment(data.comments[i]);
      }
    }
  });
});

