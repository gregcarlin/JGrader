$('.edit').each(function(index, element) {

  // do stuff when edit icon is clicked
  $(element).next().click(function() {
    var icon  = $(this);
    var other = icon.prev();
    var input = $('input', other);
    var span  = $('span', other);

    icon.hide();
    span.hide();
    var text = span.html();
    if(text != 'Not graded.') {
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
    if(text.length > 0) {
      var url = document.URL;
      if(url.charAt(url.length-1) != '/') url += '/';
      $.post(url + par.attr('data-key') + '/' + text.replace(new RegExp('/', 'g'), '-'), '', function(data, textStatus, jqXHR) {
        var code = data.code;
        if(code == 0) {
          // success, update text
          span.html(data.newValue);
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