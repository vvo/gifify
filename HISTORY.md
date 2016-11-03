# 2.2.0 (2016-11-03)

 * feat: add --no-loop avoids looping in GIF fixes #66 #68

# 2.1.6 (2016-03-11)

 * fix: windows comes with fontconfig pre-installed in ImageMagick

# 2.1.5 (2015-09-30)

  * fix: --speed now working (using gifsicle instead of convert)

# 2.1.4 (2015-05-13)

  * reduce requiremenents string checks because on arch it's not libfontconfig but fontconfig

# 2.1.3 (2015-04-24)

  * enhance requirements checks, #26

# 2.1.2 (2015-04-07)

  * pin all dependencies, moment broke with moment-duration-format

# 2.1.1 (2015-01-17)

  * fix `to` duration (do not substract `from` from `to`)

# 2.1.0 (2015-01-11)

  * add --text
