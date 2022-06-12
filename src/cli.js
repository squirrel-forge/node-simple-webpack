/**
 * Requires
 */
const path = require( 'path' );
const { cfx } = require( '@squirrel-forge/node-cfx' );
const {
    CliInput,
    Progress,
    Timer,
    StatsDisplay,
    isPojo,
    rand,
} = require( '@squirrel-forge/node-util' );
const SimpleWebpack = require( './classes/SimpleWebpack' );
const deployDefaultConfig = require( './functions/deployDefaultConfig' );
const getWarningsWithoutHeading = require( './functions/getWarningsWithoutHeading' );
const getFileStatsFn = require( './functions/getFileStatsFn' );
const generateStats = require( './functions/generateStats' );
const updateNotice = require( './functions/updateNotice' );

/**
 * Simple webpack cli application
 * @return {Promise<void>} - Possibly throws errors in strict mode
 */
module.exports = async function cli() {

    // Timer
    const timer = new Timer();

    // Input
    const input = new CliInput( cfx );

    // Main arguments
    let source = input.arg( 0 ) || '',
        target = input.arg( 1 ) || '';
    if ( !target.length ) {
        target = source;
        source = '';
    }

    // Cli application options
    const options = input.getFlagsOptions( {

        // Show version
        version : [ '-v', '--version', false, true ],

        // Show more output
        stats : [ '-s', '--stats', false, true ],

        // Use analyzer
        analyze : [ '-a', '--analyze', null, true, true ],

        // Show more output
        verbose : [ '-i', '--verbose', false, true ],

        // Force development mode
        dev : [ '-d', '--development', false, true ],

        // Force production mode
        prod : [ '-p', '--production', false, true ],

        // Disable minification
        nominify : [ ' ', '--no-minify', false, true ],

        // Disable minification
        keepnames : [ ' ', '--keep-names', false, true ],

        // Devtool setting
        devtool : [ ' ', '--map', null, true, true ],

        // Extend config
        extend : [ '-e', '--extend', null, true, true ],

        // Prepend to entries
        prepend : [ '-m', '--modules', null, false ],

        // Bundle all sources
        bundle : [ '-b', '--bundle', false, true ],

        // Bundle name
        name : [ '-n', '--name', null, false ],

        // Index source mode
        index : [ ' ', '--index', false, true ],

        // Color limits
        colors : [ ' ', '--colors', '', false ],

        // Show config
        config : [ '-y', '--show-config', false, true ],

        // Deploy defaults
        defaults : [ ' ', '--defaults', false, true ],

        // Do not break on any error, disables the default strict if set
        loose : [ '-u', '--loose', false, true ],

    } );

    // Cannot force dev and prod mode
    if ( options.dev && options.prod ) {
        cfx.error( 'Cannot force production and development mode at the same time' );
        process.exit( 1 );
    }

    // Check for updates
    let lottery = false;
    if ( !options.prod ) {
        lottery = rand( 0, 20 ) === 0;
    }

    // Load local package
    let pkg = null;
    const install_dir = path.resolve( __dirname, '../' );
    if ( options.version || lottery ) {
        try {
            pkg = require( path.join( install_dir, 'package.json' ) );
        } catch ( e ) {
            cfx.error( e );
            process.exit( 1 );
        }
    }

    // Show version
    if ( options.version && pkg ) {
        cfx.log( pkg.name + '@' + pkg.version );
        cfx.info( '- Installed at: ' + install_dir );
        await updateNotice( pkg, true );
        process.exit( 0 );
    }

    // Deploy default configs
    if ( options.defaults ) {

        // Deploy eslint
        await deployDefaultConfig( '.eslintrc', 'eslintrc.json', target );

        // Deploy babel
        await deployDefaultConfig( '.babelrc', 'babelrc.json', target );
        if ( lottery ) await updateNotice( pkg, options.loose && options.verbose );
        process.exit( 0 );
    }

    // Init application
    const swp = new SimpleWebpack( cfx );
    const swpOptions = {};

    // Set options
    if ( options.loose ) {
        swp.strict = false;
    }
    swp.verbose = options.verbose;
    if ( options.prod ) {
        swp.production = true;
    } else if ( options.dev ) {
        swp.production = false;
    }

    // Enable bundle analyzer
    if ( options.analyze ) {

        // Enable all if set as boolean flag
        if ( options.analyze === true ) {
            options.analyze = 'static';
        }

        // Notify server option not supported
        if ( options.analyze === 'server' ) {
            cfx.error( 'WebpackBundleAnalyzer.analyzerMode = "server" is currently not supported' );
            process.exit( 1 );
        }

        // Set analyzer options
        swp.analyzer = {
            analyzerMode : options.analyze,
            generateStatsFile : options.stats,
            defaultSizes : 'gzip',
        };
    }

    // Source map/devtool settings
    if ( options.devtool ) {
        if ( typeof options.devtool === 'string' ) {
            swpOptions.devtool = options.devtool;
        } else {
            swpOptions.devtool = swp.production ? 'source-map' : 'eval-source-map';
        }
    }

    // Index source mode
    if ( options.index ) {
        swpOptions.source = 'index';
    }

    // Bundle option
    if ( options.bundle ) {
        swpOptions.name = options.name && options.name.length ? options.name : 'bundle';
    }

    // Prepend option
    if ( options.prepend ) {
        const prepend = options.prepend.split( ',' )
            .filter( ( v ) => { return !!v.length; } );
        if ( prepend.length ) {
            swpOptions.prepend = prepend;
        }
    }

    // Disable minification
    if ( options.nominify ) {
        swpOptions.minify = false;
    }

    // Terser keep names options
    swpOptions.keepnames = options.keepnames;

    // Load extend options
    if ( options.extend ) {

        // Set default extend if not specified
        if ( options.extend === true ) {
            options.extend = path.join( process.cwd(), 'extend.webpack.config.js' );
        }

        // Attempt load with require
        let config_extend;
        try {
            config_extend = require( options.extend );
        } catch ( e ) {
            const error = new SimpleWebpack.SimpleWebpackException( 'Failed to load config extension: ' + options.extend, e );
            cfx.log( swp._exceptionAsOutput( error, !swp.verbose ) );
            process.exit( 1 );
        }

        // Ensure basic format
        if ( !( isPojo( config_extend ) || typeof config_extend === 'function' ) ) {
            const error = new SimpleWebpack.SimpleWebpackException( 'Invalid extension format, must be a plain object or function' );
            cfx.log( swp._exceptionAsOutput( error, !swp.verbose ) );
            process.exit( 1 );
        }

        // Set option with extension data
        swpOptions.extend = config_extend;
    }

    // Color warning option must be an Array
    if ( !( options.colors instanceof Array ) ) {
        options.colors = options.colors.split( ',' )
            .filter( ( v ) => { return !!v.length; } )
            .map( ( x ) => { return parseInt( x, 10 ) * 1024; } );
    }

    // Use default color if not enough defined
    if ( options.colors.length !== 3 ) {

        // Notify user if something is defined
        if ( options.verbose && options.colors.length ) {
            cfx.info( 'Using default coloring, [fwhite]-c[fcyan] or [fwhite]--colors'
                + ' [fcyan]must contain 3 incrementing kib limit integers' );
        }

        // Set default coloring limits
        options.colors = [ 200 * 1024, 400 * 1024, 500 * 1024 ];
    }
    const [ green, yellow, red ] = options.colors;
    const mark = { green, yellow, red };

    // Notify strict mode
    if ( swp.strict && swp.verbose ) {
        cfx.warn( 'Running in strict mode!' );
    }

    // Show active config object
    if ( options.config ) {
        const config = await swp.generateConfig( source, target, swpOptions );
        cfx.success( 'simple-webpack configuration:' );
        const entries = Object.entries( config );
        for ( let i = 0; i < entries.length; i++ ) {
            const [ name, data ] = entries[ i ];
            cfx.error( '  ' + name + '  ' );
            cfx.log( data );
        }
        cfx.log( '' );
        if ( lottery ) await updateNotice( pkg, options.loose && options.verbose );
        process.exit( 0 );
    }

    // Init progress spinner, stats and count
    const spinner = new Progress();
    const stDi = new StatsDisplay( cfx );
    const getFileStats = getFileStatsFn( stDi, options, mark );

    // Begin processing
    if ( swp.verbose ) {
        cfx.info( 'Reading from: ' + stDi.show( [ path.resolve( source ), 'path' ], true ) );
    }
    swp.strict && spinner.start( 'Building... ' );
    let stats;
    try {

        // Run render, process and write
        stats = await swp.run( source, target, swpOptions );
    } catch ( e ) {
        swp.strict && spinner.stop();

        // Generate cleaner exception output only full trace on verbose
        const error = new SimpleWebpack.SimpleWebpackException( 'Something went wrong', e );
        swp.error( swp._exceptionAsOutput( error, !swp.verbose ) );
        process.exit( 1 );
    }

    // If we did not crash, stop spinner and inform user
    swp.strict && spinner.stop();

    // Output result info
    if ( !stats.webpack || typeof stats.webpack.toJson !== 'function' ) {

        // Warn user since there were stats
        cfx.error( 'simple-webpack failed for some unknown reason!' );
        if ( swp.verbose ) {
            cfx.info( 'Completed after [fwhite]' + timer.end( 'construct' ) );
        }
        process.exit( 1 );
    } else {
        const info = stats.webpack.toJson( { all : false, assets : true, warnings : true } );
        if ( stats.webpack.hasWarnings() && ( swp.verbose || swp.strict ) ) {
            cfx.warn( 'Webpack warnings:' );
            cfx.log( getWarningsWithoutHeading( stats.webpack ) );
            if ( swp.verbose ) {
                cfx.success( 'Output files:' );
            }
        }
        if ( swp.verbose ) {
            for ( let i = 0; i < info.assets.length; i++ ) {
                cfx.info( getFileStats( info.assets[ i ] ).join( ' ' ) );
            }
            cfx.info( 'Wrote to: ' + stDi.show( [ path.resolve( target ), 'path' ], true ) );
        }

        // Show a few details at least when something was written
        cfx.success( 'simple-webpack wrote [ ' + info.assets.length
            + ' ] file' + ( info.assets.length === 1 ? '' : 's' )
            + ( swp.verbose ? ''
                : ' with [' + info.warnings.length + '] warning' + ( info.warnings.length === 1 ? '' : 's' ) )
            + ' in ' + timer.end( 'construct' ) );
    }

    // Generate stats on request only
    if ( options.stats ) {
        const so = generateStats( options, swp, stats, getFileStats );

        // Show generated stats
        stDi.display( so );
    }
    if ( lottery ) await updateNotice( pkg, options.loose && options.verbose );

    // End application
    process.exit( 0 );
};
