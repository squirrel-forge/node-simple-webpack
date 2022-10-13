/**
 * Requires
 */
const semver = require( 'semver' );
const { cfx } = require( '@squirrel-forge/node-cfx' );
const { FsInterface, isPojo } = require( '@squirrel-forge/node-util' );

/**
 * Lottery version check
 * @param {Object} pkg - Package json
 * @param {boolean} debug - Show errors
 * @return {Promise<void>} - Returns nothing
 */
module.exports = async function updateNotice( pkg, debug = false ) {
    if ( pkg ) {
        try {
            const remote = await FsInterface.remoteJSON( 'https://registry.npmjs.org/' + pkg.name + '/latest' );
            if ( isPojo( remote ) && remote.version ) {

                // Check if there is an update available
                if ( semver.gt( remote.version, pkg.version ) ) {
                    const msg_offset = '[fwhite][fgreen][fcyan][fwhite][fcyan][fwhite]';
                    const msg = ' [fwhite]' + pkg.name + '[fgreen] update available [fcyan]from [fwhite]'
                        + pkg.version + '[fcyan] to [fwhite]' + remote.version + ' ';
                    let style = 'info';
                    if ( semver.major( remote.version ) > semver.major( pkg.version ) ) {
                        style = 'error';
                    } else if ( semver.minor( remote.version ) > semver.minor( pkg.version ) ) {
                        style = 'warn';
                    }
                    cfx.log( '' );
                    cfx[ style ]( '-'.repeat( msg.length - msg_offset.length ) );
                    cfx.info( msg );
                    if ( remote.engines.node !== pkg.engines.node ) {
                        cfx.warn( 'This update requires a different node version ' + remote.engines.node );
                    }
                    cfx[ style ]( '-'.repeat( msg.length - msg_offset.length ) );
                } else if ( debug ) {
                    cfx.log( '[fgreen]You are using the latest version: [fwhite]' + pkg.version );
                }
            }
        } catch ( e ) {
            if ( debug ) {
                cfx.error( e );
                cfx.error( 'Failed to check latest version' );
            }
        }
    }
};
