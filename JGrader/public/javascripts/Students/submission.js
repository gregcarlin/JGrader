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