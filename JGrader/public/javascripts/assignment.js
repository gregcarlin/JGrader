var url = document.URL;
var lastChar = url.charAt(url.length-1);
if(lastChar == '#') {
  url = url.substring(0, url.length - 1) + '/';
} else if(lastChar != '/') {
  url += '/';
}
$('#dropzone').dropzone({
  url: url + 'add',
  clickable: '#dropzone a',
  previewTemplate: '<span class="fa fa-spinner fa-spin"></span>'
});
