# @squirrel-forge/simple-webpack
A thin node wrapper for webpack with some basic options and configuration.
The implemented config only deals with javascript, no other formats are supported and must be added via the extend option.
Supports up to es2021, includes a babel and eslint setup and supplies the webpack bundle analyzer.
Made to be compatible with node ^10.0.0, might work on higher versions, but currently not supported or tested.

## Installation

```
npm i @squirrel-forge/simple-webpack

```

## cli usage

If you installed globally with the *-g* option.
```
simple-webpack target -b --boolean --str=str
simple-webpack source target -b --boolean --str=str

```

For local installations use *npx* to run the simple-webpack executable.
```
npx simple-webpack ...
```

### Arguments

The source argument can be a single file path or folder.
The target argument must be a directory and will be created if it does not exist.

#### Using only one argument

the source argument is omitted and assumed to be the current working directory.
1. target - Path to write webpack asset files.

#### Using two arguments

1. source - Path from where to read, if a directory, files are handled as separated entry points.
2. target - Path to write webpack asset files.

### Options

A long option always override the value of a short option if both are used.

| Short | Long          | Type     | Description                                                                                                                             |
|-------|---------------|----------|-----------------------------------------------------------------------------------------------------------------------------------------|
| -d    | --development | bool     | Development mode                                                                                                                        |
| -p    | --production  | bool     | Production mode                                                                                                                         |
| -n    | --no-minify   | bool     | Do not minify, sets the *optimization.minify* option to false                                                                           |
| -e    | --extend      | bool/str | Extend the webpack config using *webpack-merge*, optionally specify a path, default: cwd/*extend.webpack.config.js*                     |
| -b    | --bundle      | bool     | Bundle all files in one entry                                                                                                           |
| -n    | --name        | str      | Bundle name, default: 'bundle'                                                                                                          |
| -m    | --modules     | str      | Prepend modules to each entry                                                                                                           |
|       | --index       | bool     | Recursively loads all *index.js* files from the source directory                                                                        |
| -w    | --colors      | str, ... | Define verbose listing color kib limits, must be 3 integers > 0                                                                         |
| -y    | --show-config | bool     | Show options, source, target and generated webpack config                                                                               |
|       | --defaults    | bool     | Deploy default .eslintrc and .babelrc to cwd or target directory                                                                        |
| -s    | --stats       | bool     | Show stats output                                                                                                                       |
| -a    | --analyze     | bool/str | Use a bool for a *static* report or *json/disabled*, the *server* option is not supported, use with *--stats* for additional stats.json |
| -i    | --verbose     | bool     | Show additional info                                                                                                                    |
| -u    | --loose       | bool     | Run in loose mode, disables the strict option                                                                                           |
| -v    | --version     | bool     | Show the application version                                                                                                            |

## NPM scripts

When installed locally use following scripts.

```
...
"scripts": {
    "js:render": "simple-webpack src/js dev/js -d",
    "js:publish": "simple-webpack src/js dist/js -p",
}
...
```

## Setup examples

For now there are no explicit examples to show the different implementation possibilities, use the *-y* or *--show-config* option to see how the webpack, source and target config are generated.

## Api usage

You can require the SimpleWebpack class in your node script and run it, change internal options and extend it easily, look at the cli implementation and code comments to understand what to run in which order, currently there will be no extended documentation on the js api, since code comments should be sufficient to understand what works in which way.
