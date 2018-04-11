var duration = require('moment').duration;
var spawn = require('child_process').spawn;

require('moment-duration-format');

var debug = require('debug')('gifify');

module.exports = gifify;

function gifify(streamOrFile, opts) {
  opts = opts || {};
  if (typeof streamOrFile === 'string') {
    opts.inputFilePath = streamOrFile;
  }

  if (opts.fps === undefined) {
    opts.fps = 10;
  }

  if (opts.speed === undefined) {
    opts.speed = 1;
  }

  if (opts.colors === undefined) {
    opts.colors = 80;
  }

  if (opts.compress === undefined) {
    opts.compress = 40;
  }

  if (opts.from !== undefined && typeof opts.from === 'number' ||
    typeof opts.from === 'string' && opts.from.indexOf(':') === -1) {
    opts.from = parseFloat(opts.from) * 1000;
  }

  if (opts.to !== undefined && typeof opts.to === 'number' ||
    typeof opts.to === 'string' && opts.to.indexOf(':') === -1) {
    opts.to = parseFloat(opts.to) * 1000;
  }

  var ffmpegArgs = computeFFmpegArgs(opts);
  var convertArgs = computeConvertArgs(opts);
  var gifsicleArgs = computeGifsicleArgs(opts);

  var ffmpeg = spawn('ffmpeg', ffmpegArgs);
  var convert = spawn('convert', convertArgs);
  var gifsicle = spawn('gifsicle', gifsicleArgs);

  [ffmpeg, convert, gifsicle].forEach(function handleErrors(child) {
    child.on('error', gifsicle.emit.bind(gifsicle, 'error'));
    child.stderr.on('data', function gotSomeErrors(buf) {
      // emit errors on the resolved stream
      gifsicle.stdout.emit('error', buf.toString());
    });
  });

  // https://github.com/joyent/node/issues/8652
  ffmpeg.stdin.on('error', function ignoreStdinError(){});

  // ffmpeg.stdout.on('error', function() {})
  // convert.stdin.on('error', function(){});
  // convert.stdout.on('error', function() {});
  // gifsicle.stdin.on('error', function() {});
  // gifsicle.stdout.on('error', function() {})

  if (!opts.inputFilePath) {
    streamOrFile.pipe(ffmpeg.stdin);
  }

  ffmpeg.stdout.pipe(convert.stdin);
  convert.stdout.pipe(gifsicle.stdin);
  return gifsicle.stdout;
}

function computeFFmpegArgs(opts) {
  var FFmpegTimeFormat = 'hh:mm:ss.SSS';

  // FFmpeg options
  // https://www.ffmpeg.org/ffmpeg.html#Options
  var args = [
    '-loglevel', 'panic'
  ];

  // fast seek to opts.from - 500ms
  // see http://superuser.com/a/704118/35651
  if (opts.from !== undefined) {
    args.push('-ss', duration(opts.from).format(FFmpegTimeFormat, {trim: false}));
  }

  if (opts.inputFilePath) {
    args.push('-i', opts.inputFilePath);
  } else {
    // stdin as input
    // https://www.ffmpeg.org/ffmpeg-protocols.html#pipe
    args.push('-i', 'pipe:0');
  }

  if (opts.to !== undefined) {
    args.push('-to', duration(opts.to).format(FFmpegTimeFormat, {trim: false}));
  }

  // framerate
  args.push('-r', opts.fps);

  if (opts.resize || opts.subtitles || opts.reverse) {
    // filters
    args.push('-vf');

    var filters = [];
    // resize filter
    if (opts.resize) {
      filters.push('scale=' + opts.resize);
    }

    if (opts.subtitles !== undefined) {
      filters.push('subtitles=' + opts.subtitles);
    }

    if (opts.reverse !== undefined) {
      filters.push('reverse');
    }

    args.push(filters.join(','));
  }

  // encoding filter and codec
  args.push('-f', 'image2pipe', '-vcodec', 'ppm');

  // force video sync so that even if nothing moves in the video, we get a constant frame rate
  // seems buggy, not what I want, still, some videos are failing to encode
  // args.push('-vsync', '1');

  // write on stdout
  args.push('pipe:1');

  debug('ffmpeg args: %j', args);

  return args;
}

function computeConvertArgs(opts) {
  // Convert options
  // http://www.imagemagick.rg/script/convert.php#options
  var args = [
    '-',
    '+dither',
    '-layers', 'Optimize'
  ];

  if (opts.text) {
    args.push(
      '-gravity', 'South',
      '-fill', 'white',
      '-stroke', 'black',
      '-strokewidth', '1',
      '-pointsize', '40',
      '-annotate', '+20+20', opts.text
    );
  }

  args.push('gif:-');

  debug('convert args: %j', args);

  return args;
}

function computeGifsicleArgs(opts) {
  // Gifsicle options
  // http://www.lcdf.org/gifsicle/man.html
  // --lossy is not yet into master, https://github.com/kohler/gifsicle/pull/16
  var args = [
    '-O3',
    '--lossy=' + opts.compress * 2,
    '--colors=' + opts.colors,
    '--delay', Math.round(100 / opts.fps / opts.speed),
    '--no-warnings'
  ];

  if (opts.loop === false) {
    args.push('--no-loopcount');
  }

  debug('gifsicle args: %j', args);

  return args;
}
