# Changelog

## 0.11.0
 - Added *--map* option to enable default webpack devtool source maps.

## 0.10.0
 - Added async transform support.
 - Added options for babel polyfill by usage.
 - Migrate to *babel@7.18.x*.
 - Updated dependencies.
 - Fixed *default* directory read mode file extension matching.

## 0.9.2
 - Fixed *index* mode default read options.
 - Updated dependencies.

## 0.9.1
 - Fixed *--keep-names* cli option.

## 0.9.0
 - Added babel native transform support and updated babelrc.
 - Added TerserPlugin with *--keep-names* cli option.
 - Updated dependencies.

## 0.8.4
 - Updated dependencies.

## 0.8.3
 - Use option *-n* for bundle name, remove option for short *--no-minify* to remove conflict.
 - Removed short option *-w* for *--colors* option, to free it for future use.
 - Updated and fixed some README.md typos.

## 0.8.2
 - Fixed and extended missing *--modules* prepend option used to prepend polyfills or anything else to entries.

## 0.8.1
 - Update *node-util* and replace local implementation with *convertMs2Hrtime* method from utils.
 - Internal updates and cleanups for *--analyze* and *--extend* options.
 - Improve README.md and some code docs.

## 0.8.0
 - Added *--no-minify* option to disable *optimization.minimize* in webpack config.
 - Added *--extend* option to load a config extension via require, path/name customizable via the option.
 - Added *webpack-merge* package to merge the extension config if it's an object, extend can also be a sync function that receives following arguments *(config, source, target, SimpleWebpack)* and must return the modified config object.
 - Update *node-util* to fix progress display issues with colliding output.

## 0.7.0
 - Added *webpack-bundle-analyzer* plugin and options.

## 0.6.0
 - Added default configs *.eslintrc* and *.babelrc* deployable with the *--defaults* option.
 - Updated some dependencies.

## 0.5.1
 - Fix broken utilities reference and version.

## 0.5.0
 - Core features prototype.
