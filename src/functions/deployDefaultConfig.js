/**
 * Requires
 */
const path = require( 'path' );
const { cfx } = require( '@squirrel-forge/node-cfx' );
const { FsInterface } = require( '@squirrel-forge/node-util' );

/**
 * Deploy default config
 * @param {string} name - Source name
 * @param {string} read - Target name
 * @param {string} target - Target directory
 * @return {Promise<void>} - May throw errors
 */
module.exports = async function deployDefaultConfig( name, read, target ) {
    const data = require( '../' + read );
    const resolved = path.resolve( target, name );
    const config_exists = await FsInterface.exists( resolved );
    if ( config_exists ) {
        cfx.error( 'Config file already exists: ' + resolved );
    } else {
        const wrote = await FsInterface.write( resolved, JSON.stringify( data, null, 2 ) );
        if ( wrote ) {
            cfx.success( 'Created defaults config: ' + resolved );
        } else {
            cfx.error( 'Failed to write config: ' + resolved );
        }
    }
};
