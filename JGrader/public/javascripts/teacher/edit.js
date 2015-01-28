// http://stackoverflow.com/questions/646628/how-to-check-if-a-string-startswith-another-string
if (typeof String.prototype.startsWith != 'function') {
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

$('.edit').each(function(index, element) {

  var span = $('span', element);
  if(span.html().length <= 0) {
    span.html('<em>' + $(element).attr('data-default') + '</em>');
  }

  // do stuff when edit icon is clicked
  $(element).next().click(function() {
    var icon  = $(this);
    var other = icon.prev();
    var input = $('input', other);
    var span  = $('span', other);

    icon.hide();
    span.hide();
    var text = span.html();
    if(text != 'Not graded.' && !text.startsWith('<em>')) {
      if(other.is('[data-convert-to-edit]')) { // if it has function for converting data to editable format
        text = window[other.attr('data-convert-to-edit')](text);
      }
      input.val(text);
    }
    input.width(span.width());
    input.show();
    input.focus();
  });

  // do stuff when done editing
  $('input', element).blur(function() {
    var input = $(this);
    var par   = input.parent();
    var span  = $('span', par);
    var icon  = par.next();

    input.hide();
    // todo show loading thing
    var text = input.val();
    if(par.attr('data-default') != 'none' || text.length > 0) {
      var url = document.URL;
      if(url.charAt(url.length-1) != '/') url += '/';
      $.post(url + par.attr('data-key') + '/' + text.replace(new RegExp('/', 'g'), '-'), '', function(data, textStatus, jqXHR) {
        var code = data.code;
        if(code == 0) {
          // success, update text
          if(par.is('[data-convert-to-read]')) { // if it has function for converting data to readable format
            data.newValue = window[par.attr('data-convert-to-read')](data.newValue);
          }
          span.html(data.newValue.length > 0 ? data.newValue : '<em>' + par.attr('data-default') + '</em>');
        } else if(code == 1) {
          alert('That is not a valid value.');
        } else {
          alert('An error has occurred, please reload the page and try again.');
        }
      });
    }
    span.show();
    icon.show();
  });

  // blur when user hits enter
  $('input', element).keyup(function(event) {
    if(event.which == 13) $(this).blur();
  });

});