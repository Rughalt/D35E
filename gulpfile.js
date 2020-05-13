const gulp = require('gulp');
const less = require('gulp-less');

/* ----------------------------------------- */
/*  Compile LESS
/* ----------------------------------------- */

const PF1_LESS = ["less/*.less"];
function compileLESS() {
  return gulp.src("less/pf1.less")
    .pipe(less())
    .pipe(gulp.dest("./"))
}
const css = gulp.series(compileLESS);

/* ----------------------------------------- */
/*  Watch Updates
/* ----------------------------------------- */

function watchUpdates() {
  gulp.watch(PF1_LESS, css);
}

/* ----------------------------------------- */
/*  Export Tasks
/* ----------------------------------------- */

exports.default = gulp.series(
  gulp.parallel(css),
  watchUpdates
);
exports.css = css;
