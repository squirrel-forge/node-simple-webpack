/**
 * Requires
 */
const path = require( 'path' );
const webpack = require( 'webpack' );
const ESLintPlugin = require( 'eslint-webpack-plugin' );
const { Exception, Timer, FsInterface, isPojo } = require( '@squirrel-forge/node-util' );

/**
 * SimpleWebpack exception
 * @class
 */
class SimpleWebpackException extends Exception {}

/**
 * @typedef {Object} SimpleWebpackRunOptions
 * @property {null|'index'|'recursive'} source - Source read mode
 * @property {null|string} name - Entry name for index and recursive mode bundling
 * @property {null|{exclude:RegExp,extensions:RegExp}} read - Source read options
 * @property {null|string} public - Webpack publicPath option
 * @property {null|Object|Function} extend - Extend the generated config
 */

/**
 * SimpleWebpack class
 * @class
 */
class SimpleWebpack {

    /**
     * Constructor
     * @constructor
     * @param {null|console} cfx - Console or alike object
     */
    constructor( cfx = null ) {

        /**
         * Timer
         * @public
         * @property
         * @type {Timer}
         */
        this.timer = new Timer();

        /**
         * Console alike reporting object
         * @protected
         * @property
         * @type {console|null}
         */
        this._cfx = cfx;

        /**
         * Strict mode
         * @public
         * @property
         * @type {boolean}
         */
        this.strict = true;

        /**
         * Verbose mode
         * Outputs the full stack of nonfatal exceptions
         * @public
         * @property
         * @type {boolean}
         */
        this.verbose = true;

        /**
         * Production or dev mode
         * @type {boolean}
         */
        this.production = process.env.NODE_ENV === 'production';
    }

    /**
     * Parse exception for output
     * @protected
     * @param {string|Error|Exception} msg - Message or exception instance
     * @param {boolean} noTrace - Do not output trace since it is internal
     * @return {string} - Exception output
     */
    _exceptionAsOutput( msg, noTrace = false ) {

        // We check if its an exception, all other errors will be sent to output unmodified
        if ( msg instanceof Error ) {
            if ( this.verbose && !noTrace ) {

                // In verbose we want to whole stack
                return msg.stack;
            } else {

                // In normal mode we just send the short string representation without the stack
                return msg + '';
            }
        }
        return msg;
    }

    /**
     * Error output
     *  Throw in strict mode or always true
     *  Notify in normal mode
     *  Show full trace in verbose mode
     * @public
     * @param {string|Error|Exception} msg - Message or exception instance
     * @param {boolean} always - Fatal error, always throw
     * @throws {Exception}
     * @return {void}
     */
    error( msg, always = false ) {

        // In strict mode we always throw
        if ( always || this.strict ) {
            throw msg;
        }

        // If we are not silent and we have a fitting error logger
        if ( this._cfx && typeof this._cfx.error === 'function' ) {
            this._cfx.error( this._exceptionAsOutput( msg ) );
        }
    }

    /**
     * Parse options
     * @protected
     * @param {Object|SimpleWebpackRunOptions} options - Options object
     * @return {SimpleWebpackRunOptions} - Parsed options
     */
    _parseOptions( options ) {
        if ( !isPojo( options ) ) {
            return {};
        }
        return options;
    }

    /**
     * Resolve source
     * @protected
     * @param {string} source - Source path
     * @param {SimpleWebpackRunOptions} options - Options object
     * @return {Promise<{root: string, files: string[], source, resolved: string}>} - Source object
     */
    async _resolveSource( source, options ) {

        // Resolve source
        const resolved = path.resolve( source );

        // Require valid source
        const source_exists = await FsInterface.exists( resolved );
        if ( !source_exists ) {
            throw new SimpleWebpackException( 'Source not found: ' + resolved );
        }

        // Convert to array for processing
        let files = [ resolved ], root = resolved;

        // Fetch files if source is a directory
        if ( FsInterface.isDir( resolved ) ) {

            // Index mode uses all index.js files as entry points, recursive uses custom options
            if ( options.source && [ 'index', 'recursive' ].includes( options.source ) ) {
                if ( !options.read ) {

                    // In recursive mode we expect custom options
                    if ( options.source === 'recursive' ) {
                        throw new SimpleWebpackException( 'Source mode recursive requires a read filter' );
                    }

                    // Set the index mode options
                    options.read = { exclude : /^(?!.*index).*\.js$/, extensions : /\.js/ };
                }
                files = FsInterface.fileList( resolved, options.read );
            } else {

                // Set the default mode options
                if ( !options.read ) {
                    options.read = { extensions : /\.js/ };
                }
                files = await FsInterface.files( resolved, options.read );
            }

            // Require file results
            if ( !files.length ) {
                throw new SimpleWebpackException( 'Source is empty: ' + resolved );
            }
        } else {
            root = path.dirname( resolved );
        }

        // Map to root relative paths
        files = files.map( ( file ) => {
            return './' + FsInterface.relative2root( file, root );
        } );

        return { root, source, resolved, files };
    }

    /**
     * Resolve target
     * @protected
     * @param {string} target - Target source
     * @return {Promise<{created: null, exists: boolean, target, resolved: string}>} - Target object
     */
    async _resolveTarget( target ) {

        // Resolve target
        const resolved = path.resolve( target );

        // Attempt create
        let created = null, exists = await FsInterface.exists( resolved );
        if ( !exists ) {
            created = await FsInterface.dir( resolved );
            exists = true;
        }

        // Check for directory if not created
        if ( !created && !FsInterface.isDir( resolved ) ) {
            throw new SimpleWebpackException( 'Target must be a directory: ' + resolved );
        }
        return { target, resolved, exists, created };
    }

    /**
     * Generate webpack config
     * @param {Object} source - Source object
     * @param {Object} target - Target object
     * @param {Object|SimpleWebpackRunOptions} options - Options object
     * @return {Promise<Object>} - Setup object
     */
    async generateConfig( source, target, options ) {
        options = this._parseOptions( options );
        source = await this._resolveSource( source, options );
        target = await this._resolveTarget( target, options );
        const config = {
            mode : this.production ? 'production' : 'development',
            context : source.root,
            entry : this._getEntry( source, options ),
            output : this._getOutput( target, options ),
            plugins : [ new ESLintPlugin( { fix : true } ) ],
            module : {
                rules : [
                    {
                        test : /\.m?js$/,
                        use : {
                            loader : 'babel-loader',
                            options : { presets : [ '@babel/preset-env' ] }
                        }
                    }
                ]
            },
            optimization : { minimize : this.production },
        };

        // Custom extend
        if ( typeof options.extend === 'function' ) {
            options.extend( config, source, target, this );
        } else if ( isPojo( options.extend ) ) {
            Object.assign( config, options.extend );
        }
        return { options, source, target, config };
    }

    /**
     * Get entry data
     * @protected
     * @param {Object} source - Source object
     * @param {Object|SimpleWebpackRunOptions} options - Option object
     * @return {Object} - Entry object
     */
    _getEntry( source, options ) {
        const entry = {};

        // Combine into one bundle entry
        if ( typeof options.name === 'string' ) {
            if ( !options.name.length ) {
                throw new SimpleWebpackException( 'Entry name must be a none empty string' );
            }
            if ( options.prepend instanceof Array ) {
                source.files.unshift( ...options.prepend );
            }
            entry[ options.name ] = source.files;
        } else {

            // Add individual entries
            for ( let i = 0; i < source.files.length; i++ ) {
                const file = source.files[ i ];
                const name = path.basename( file, path.extname( file ) );
                entry[ name ] = file;
            }
        }
        return entry;
    }

    /**
     * Get output data
     * @protected
     * @param {Object} target -Target object
     * @param {Object|SimpleWebpackRunOptions} options - Options object
     * @return {Object} - Output object
     */
    _getOutput( target, options ) {
        const output = {
            filename : '[name]' + ( this.production ? '.min' : '' ) + '.js',
            path : target.resolved,
        };
        if ( options.public ) {
            output.publicPath = options.public;
        }
        return output;
    }

    /**
     * Run webpack
     * @protected
     * @param {Object} config - Webpack config
     * @param {null|Object} statsOptions - Webpack stats options for errors
     * @return {Promise<Object|SimpleWebpackException>} - Stats object or exception
     */
    _compile( config, statsOptions = null ) {
        return new Promise( ( resolve ) => {
            webpack( config, ( err, stats ) => {
                if ( err || stats.hasErrors() ) {
                    if ( err ) {
                        resolve( new SimpleWebpackException( 'Compile error', err ) );
                    } else if ( stats.hasErrors() ) {
                        resolve( new SimpleWebpackException( 'Compile error',
                            'WebpackStatsInfo:\n' + stats.toString( statsOptions || {
                                all : false,
                                colors : true,
                                errors : true,
                                errorDetails : true,
                                warnings : true,
                            } ) ) );
                    } else {
                        resolve( new SimpleWebpackException( 'Unknown compile error',
                            'WebpackStatsInfo:\n' + stats.toString( statsOptions || { all : true } ) ) );
                    }
                } else {
                    resolve( stats );
                }
            } );
        } );
    }

    /**
     * Run build
     * @param {string} source - Source path
     * @param {string} target - Target path
     * @param {null|Object} options - Options object
     * @return {Promise<{compiled: number, sources: number, files: *[], dirs: {created: *[], failed: *[]}, time: null}>} - Stats
     */
    async run( source, target, options = null ) {
        this.timer.start( 'total-run' );
        const setup = await this.generateConfig( source, target, options );
        const stats = {
            options : setup.options,
            source : setup.source,
            target : setup.target,
            config : setup.config,
            webpack : null,
            time : null,
        };

        // Run compile
        const wps = await this._compile( setup.config );

        // Notify error
        if ( wps instanceof Error ) {
            this.error( wps );
        } else if ( wps ) {
            stats.webpack = wps;
        }

        stats.time = this.timer.measure( 'total-run' );

        return stats;
    }
}

// Export Exception as static property constructor
SimpleWebpack.SimpleWebpackException = SimpleWebpackException;
module.exports = SimpleWebpack;
