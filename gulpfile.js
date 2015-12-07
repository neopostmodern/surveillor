'use strict';

var gulp       = require('gulp');
var $          = require('gulp-load-plugins')();
var sync       = $.sync(gulp).sync;
var del        = require('del');
var browserify = require('browserify');
var watchify   = require('watchify');
var babelify   = require('babelify');
var source     = require('vinyl-source-stream');
var path       = require('path');
var merge      = require('merge-stream');

// todo: gulp-bump (read here: https://ponyfoo.com/articles/my-first-gulp-adventure)

require('harmonize')();

var SCRIPT_NAMES = ['app.js'];
var bundler = {
  w: null,
  init: function() {
    this.w = SCRIPT_NAMES.map((scriptName) =>
      watchify(browserify({
        entries: ['./app/scripts/' + scriptName],
        insertGlobals: true,
        cache: {},
        packageCache: {}
      }).transform("babelify", {presets: ["es2015", "react"]}))
    );
  },
  bundle: function() {
    return this.w && merge.apply(null, this.w.map((_w, index) =>
        _w.bundle()
          .on('error', $.util.log.bind($.util, 'Browserify Error'))
          .pipe(source(SCRIPT_NAMES[index]))
          .pipe(gulp.dest('dist/scripts'))
      ));
  },
  watch: function() {
    this.w && this.w.forEach((_w) => _w.on('update', this.bundle.bind(this)));
  },
  stop: function() {
    this.w && this.w.forEach((_w) => _w.close());
  }
};

gulp.task('styles', function() {
  return $.rubySass('app/styles/main.sass', {
    style: 'expanded',
    precision: 10,
    loadPath: ['app/bower_components']
  })
    .on('error', $.util.log.bind($.util, 'Sass Error'))
    .pipe($.autoprefixer('last 1 version'))
    .pipe(gulp.dest('dist/styles'))
    .pipe($.size());
});

gulp.task('scripts', function() {
  bundler.init();
  return bundler.bundle();
});

gulp.task('html', function() {
  var assets = $.useref.assets();
  return gulp.src('app/*.html')
    .pipe(assets)
    .pipe(assets.restore())
    .pipe($.useref())
    .pipe(gulp.dest('dist'))
    .pipe($.size());
});

gulp.task('images', function() {
  return gulp.src('app/images/**/*')
    .pipe($.cache($.imagemin({
      optimizationLevel: 3,
      progressive: true,
      interlaced: true
    })))
    .pipe(gulp.dest('dist/images'))
    .pipe($.size());
});

gulp.task('clear-image-cache', function() {
  // Still pass the files to clear cache for
  gulp.src('app/images/**/*')
    .pipe($.cache.clear());

  // Or, just call this for everything
  //cache.clearAll();
});

gulp.task('fonts', function() {
  return gulp.src(['app/fonts/*'])
    .pipe(gulp.dest('dist/fonts'))
    .pipe($.size());
});

gulp.task('extras', function () {
  return gulp.src(['app/*.txt', 'app/*.ico'])
    .pipe(gulp.dest('dist/'))
    .pipe($.size());
});

gulp.task('serve', function() {
  gulp.src('dist')
    .pipe($.webserver({
      livereload: true,
      port: 9000
    }));
});

gulp.task('jest', function () {
  var nodeModules = path.resolve('./node_modules');
  return gulp.src('app/scripts/**/__tests__')
    .pipe($.jest({
      scriptPreprocessor: nodeModules + '/babel-jest',
      unmockedModulePathPatterns: [nodeModules + '/react']
    }));
});

gulp.task('set-production', function() {
  process.env.NODE_ENV = 'production';
});

gulp.task('minify:js', function() {
  return gulp.src('dist/scripts/**/*.js')
    .pipe($.uglify())
    .pipe(gulp.dest('dist/scripts/'))
    .pipe($.size());
});

gulp.task('minify:css', function() {
  return gulp.src('dist/styles/**/*.css')
    .pipe($.minifyCss())
    .pipe(gulp.dest('dist/styles'))
    .pipe($.size());
});

gulp.task('minify', ['minify:js', 'minify:css']);

gulp.task('clean', del.bind(null, 'dist'));

gulp.task('bundle', ['html', 'styles', 'scripts', 'images', 'fonts', 'extras']);

gulp.task('clean-bundle', sync(['clean', 'bundle']));

gulp.task('build', ['clean-bundle'], bundler.stop.bind(bundler));

gulp.task('build:production', sync(['set-production', 'build', 'minify']));

gulp.task('serve:production', sync(['build:production', 'serve']));

gulp.task('test', ['jest']);

gulp.task('default', ['build']);

gulp.task('watch', sync(['clean-bundle', 'serve']), function() {
  bundler.watch();
  gulp.watch('app/*.html', ['html']);
  gulp.watch('app/styles/*.sass', ['styles']);
  gulp.watch('app/images/**/*', ['images']);
  gulp.watch('app/fonts/*', ['fonts']);
});
