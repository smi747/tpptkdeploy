const {src, dest, watch, parallel, series} = require('gulp');

const scss = require('gulp-sass')(require('sass'));
const concat = require('gulp-concat');
const uglify = require('gulp-uglify-es').default;
const browserSync = require('browser-sync').create();
const clean = require('gulp-clean');

var gulp = require('gulp'); // 1
var browserify = require('browserify'); //2
var babelify = require('babelify'); //3
var source = require('vinyl-source-stream'); //4
var streamify = require('gulp-streamify');


function scripts() {
   /* return src([
        'app/main.js'
    ])
    .pipe(babel({
        presets: ["@babel/preset-env", "@babel/preset-react"]
      }))
        .pipe(concat('main.min.js'))
        .pipe(uglify())
        .pipe(dest('app/'))
        .pipe(browserSync.stream())*/
        return browserify('app/main.js')
        .transform(babelify) //———–> transpiles es6 to es5
        .bundle()
        .on('error', (err)=>{
        console.log('JS Error', err);
        })
        .pipe(source('main.min.js'))
        .pipe(streamify(uglify()))
        .pipe(dest('app/js'))
        .pipe(browserSync.stream());
}

function styles() {
    return src('app/styles.scss')
        .pipe(concat('styles.min.cs'))
        .pipe(scss({outputStyle: 'compressed' }))
        .pipe(dest('app/'))
        .pipe(browserSync.stream())
}

function watching() {
    watch(['app/styles.scss'], styles)
    watch(['app/main.js'], scripts)
    watch(['app/*.html']).on('change', browserSync.reload);
}

function browsersync() {
    browserSync.init({
        server: {
            baseDir: "app/"
        }
    });
}

function cleanDist() {
    return src('dist')
        .pipe(clean())
}


function building() {
    return src([
        'app/styles.min.css',
        'app/main.js',
        'app/*.html'
    ], {base : 'app'})
        .pipe(dest('dist'))
}

exports.styles = styles;
exports.scripts = scripts;
exports.watching = watching;
exports.browsersync = browsersync;

exports.build = series(cleanDist, building);

exports.default = parallel(styles, scripts, browsersync, watching);

exports.update = parallel(styles, scripts);