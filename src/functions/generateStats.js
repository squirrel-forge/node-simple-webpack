/**
 * Requires
 */
const { convertMs2Hrtime } = require( '@squirrel-forge/node-util' );
const getWarningsWithoutHeading = require( './getWarningsWithoutHeading' );

/**
 * Generate stats output
 * @param {Object} options - CLi options
 * @param {SimpleWebpack} swp - SWP instance
 * @param {Object} stats - Webpack stats
 * @param {Function} getFileStats - Get file stats function
 * @return {Object} - Stats object
 */
module.exports = function generateStats( options, swp, stats, getFileStats ) {
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
            Webpack : [ convertMs2Hrtime( info.time ), 'time' ],
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

    if ( !swp.verbose && !swp.strict && stats.webpack.hasWarnings() ) {
        so.Warnings = getWarningsWithoutHeading( stats.webpack );
    }
    return so;
};
