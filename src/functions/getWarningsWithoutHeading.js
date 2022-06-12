/**
 * Get webpack warnings without heading
 * @param {Object} wpstats - Webpack stats object
 * @return {string} - Trimmed warnings
 */
module.exports = function getWarningsWithoutHeading( wpstats ) {
    let warnings = wpstats.toString( { all : false, warnings : true } ).trim();
    const prefix = warnings.indexOf( '\n' );
    if ( prefix < 25 ) {
        warnings = warnings.substring( prefix );
    }
    return warnings;
};
