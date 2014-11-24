var fs = require('fs');
var gifify = require('../');
var path = require('path');

var input = path.join(__dirname, 'movie.mp4');
var output = path.join(__dirname, 'movie.gif');

var gif = fs.createWriteStream(output);

var options = {
  resize: '500:-1',
  from: 30,
  to: 35,
  subtitles: path.join(__dirname, 'movie.ass')
};

gifify(input, options).pipe(gif);

gif.on('close', function end() {
  console.log('gifified ' + input + ' to ' + output);
});
