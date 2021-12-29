/**
 * Requires
 */
const path = require( 'path' );
const { cfx } = require( '@squirrel-forge/node-cfx' );
const { CliInput, Progress, Timer, leadingZeros, StatsDisplay, convertBytes } = require( '@squirrel-forge/node-util' );
const SimpleWebpack = require( './classes/SimpleWebpack' );

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

        // Show more output
        verbose : [ '-i', '--verbose', false, true ],

        // Force development mode
        dev : [ '-d', '--development', false, true ],

        // Force production mode
        prod : [ '-p', '--production', false, true ],

        // Bundle all sources
        bundle : [ '-b', '--bundle', false, true ],

        // Bundle name
        name : [ '-n', '--name', null, false ],

        // Index source mode
        index : [ ' ', '--index', false, true ],

        // Color limits
        colors : [ '-w', '--colors', '', false ],

        // Show config
        config : [ '-y', '--show-config', false, true ],

        // Do not break on any error, disables the default strict if set
        loose : [ '-u', '--loose', false, true ],

    } );

    // Cannot force dev and prod mode
    if ( options.dev && options.prod ) {
        cfx.error( 'Cannot force production and development mode at the same time' );
        process.exit( 1 );
    }

    // Show version
    if ( options.version ) {
        const install_dir = path.resolve( __dirname, '../' );
        let pkg;
        try {
            pkg = require( path.join( install_dir, 'package.json' ) );
        } catch ( e ) {
            cfx.error( e );
            process.exit( 1 );
        }
        cfx.log( pkg.name + '@' + pkg.version );
        cfx.info( '- Installed at: ' + install_dir );
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

    // Index source mode
    if ( options.index ) {
        swpOptions.source = 'index';
    }

    // Bundle options
    if ( options.bundle ) {
        swpOptions.name = options.name && options.name.length ? options.name : 'bundle';

        // Prepend options
        if ( options.prepend ) {
            const prepend = options.prepend.split( ',' )
                .filter( ( v ) => { return !!v.length; } );
            if ( prepend.length ) {
                swpOptions.prepend = prepend;
            }
        }
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
    const [ mark_green, mark_yellow, mark_red ] = options.colors;

    // Notify strict mode
    if ( swp.strict && swp.verbose ) {
        cfx.warn( 'Running in strict mode!' );
    }

    // Show active config object
    if ( options.config ) {
        const config = await swp.generateConfig( source, target, options );
        cfx.success( 'simple-webpack configuration:' );
        const entries = Object.entries( config );
        for ( let i = 0; i < entries.length; i++ ) {
            const [ name, data ] = entries[ i ];
            cfx.error( '  ' + name + '  ' );
            cfx.log( data );
        }
        cfx.log( '' );
        process.exit( 0 );
    }

    // Init progress spinner, stats and count
    const spinner = new Progress();
    const stDi = new StatsDisplay( cfx );

    /**
     * Get file stats data as array
     * @param {Object} asset - Webpack stats asset object
     * @return {Array<string>} - Styled file stats parts
     */
    const getFileStats = ( asset ) => {
        const output = [];

        // Source chunks
        output.push( '- ' + stDi.show( [ leadingZeros( asset.chunkNames.join( ', ' ), 14, ' ', true ), 'none' ], true ) );

        // Make extra stats output
        if ( options.stats ) {

            // Begin bracket block
            output.push( '[fred][[re]' );

            // File size
            if ( asset.size ) {
                output.push( stDi.show( 'Output:', true ) );

                // Show output size
                let size_color = 'none';
                if ( asset.size <= mark_green ) {
                    size_color = 'valid';
                } else if ( asset.size <= mark_yellow ) {
                    size_color = 'notice';
                } else if ( asset.size > mark_red ) {
                    size_color = 'error';
                }
                output.push( stDi.show( [ leadingZeros( convertBytes( asset.size ), 11, ' ' ) + ' ', size_color ], true ) );
            }

            // End bracket block
            output.push( '[fred]][re]' );
        } else {
            output.push( '[fred]>[re]' );
        }

        // Output file
        output.push( stDi.show( [ './' + asset.name, 'path' ], true ) );

        return output;
    };

    /**
     * Convert ms to hr time format
     * @param {number} ms - Milliseconds
     * @return {Array<number>} - Hrtime format
     */
    const ms2hrtime = ( ms ) => {
        const seconds = Math.floor( ms / 1000 );
        return [ seconds, ( ms - seconds * 1000 ) * 1000000 ];
    };

    /**
     * Get webpack warnings without heading
     * @param {Object} wpstats - Webpack stats object
     * @return {string} - Trimmed warnings
     */
    const getWarningsWithoutHeading = ( wpstats ) => {
        let warnings = wpstats.toString( { all : false, warnings : true } ).trim();
        const prefix = warnings.indexOf( '\n' );
        if ( prefix < 25 ) {
            warnings = warnings.substr( prefix );
        }
        return warnings;
    };

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
        if ( swp.verbose ) {
            if ( stats.webpack.hasWarnings() ) {
                cfx.warn( 'Webpack warnings:' );
                cfx.log( getWarningsWithoutHeading( stats.webpack ) );
                cfx.success( 'Output files:' );
            }
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
        const info = stats.webpack.toJson( {
            all : false,
            assets : true,
            colors : true,
            entrypoints : true,
            hash : true,
            timings : true,
            warnings : true,
        } );

        const sources_count = Object.keys( info.entrypoints ).length;
        const so = {
            Overview : {
                Build : info.hash,
                Files : [ [ 'Sources:', sources_count ], 'asline' ],
                Time : [ stats.time, 'time' ],
                Webpack : [ ms2hrtime( info.time ), 'time' ],
            },
        };

        if ( sources_count !== info.assets.length ) {
            so.Overview.Files[ 0 ].push( 'Outputs:' );
            so.Overview.Files[ 0 ].push( info.assets.length );
        }

        if ( !options.verbose ) {
            const files_prop = 'Asset output details';
            for ( let i = 0; i < info.assets.length; i++ ) {
                if ( !so[ files_prop ] ) so[ files_prop ] = [];
                so[ files_prop ].push( [ '[fcyan]' + getFileStats( info.assets[ i ] ).join( ' ' ), 'none' ] );
            }
            so[ files_prop ].push( '' );
        }

        if ( !swp.verbose && stats.webpack.hasWarnings() ) {
            so.Warnings = getWarningsWithoutHeading( stats.webpack );
        }

        // Show generated stats
        stDi.display( so );
    }

    // End application
    process.exit( 0 );
};
