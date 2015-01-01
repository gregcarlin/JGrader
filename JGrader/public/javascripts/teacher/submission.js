$('#input-expand').click(function() {
  var inputExpand = $('#input-expand');
  inputExpand.toggleClass('glyphicon-expand');
  inputExpand.toggleClass('glyphicon-collapse-down');
  $('#input-text').toggle();
});

$('#edit-grade').click(function() {
  $('#edit-grade').hide();
  $('#text').hide();
  var text = $('#text').html();
  if(text != 'Not graded.') {
    $('#edit').val(text);
  }
  $('#edit').show();
  $('#edit').focus();
});

$('#edit').blur(function() {
  $('#edit').hide();
  var text = $('#edit').val();
  if(text.length > 0) {
    $('#text').html(text);
    var url = document.URL;
    if(url.charAt(url.length-1) != '/') url += '/';
    $.post(url + 'updategrade/' + text, '', function(data, textStatus, jqXHR) {
      var code = jqXHR.responseText;
      if(code == 0) {
        // success, do nothing
      } else if(code == 1) {
        alert('That is not a valid grade.');
      } else {
        alert('An error has occurred, please reload the page and try again.');
      }
    });
  }
  $('#text').show();
  $('#edit-grade').show();
});

$('#edit').keyup(function(event) {
  if(event.which == 13) $('#edit').blur();
});

$('#execute').click(function() {
  $('#output-text').html('<span class="glyphicon glyphicon-refresh"></span>'); // todo make this spin so it actually looks like a loading thing
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