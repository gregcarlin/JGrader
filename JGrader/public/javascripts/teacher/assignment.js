var URL = function() {
  var base = location.protocol + '//' + location.host + location.pathname;
  if (base.substring(base.length - 1) != '/') base += '/';
  return base;
};

$('#dropzone').dropzone({
  url: URL() + 'add',
  clickable: '#dropzone a',
  previewTemplate: '<span class="fa fa-spinner fa-spin"></span>',
  init: function() {
    this.on('success', function(file, response) {
      switch(response.code) {
        case 0:
          window.location.reload();
          break;
        case 1:
          alert('You cannot add files after students have already submitted code.');
          break;
        case 2:
          alert('A file with that name already exists.');
          break;
        case -1:
        default:
          alert('An unknown error has occurred. Please reload the page and try again.');
          break;
      }
    });
  }
});
