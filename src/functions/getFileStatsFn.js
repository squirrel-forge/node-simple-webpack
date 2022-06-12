/**
 * Requires
 */
const { leadingZeros, convertBytes } = require( '@squirrel-forge/node-util' );

/**
 * Get file stats function
 * @param {StatsDisplay} stDi - Stats display instance
 * @param {Object} options - Cli options
 * @param {Object} mark - Marking values
 * @return {function(*): *[]} - File stats function
 */
module.exports = function getFileStatsFn( stDi, options, mark ) {

    /**
     * Get file stats data as array
     * @param {Object} asset - Webpack stats asset object
     * @return {Array<string>} - Styled file stats parts
     */
    return function getFileStats( asset ) {
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
                if ( asset.size <= mark.green ) {
                    size_color = 'valid';
                } else if ( asset.size <= mark.yellow ) {
                    size_color = 'notice';
                } else if ( asset.size > mark.red ) {
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
};
