const chokidar = require('chokidar');
const path = require('path');
const addTimecode = require('./processFile');

/**
 * Watches a folder and processes any new file that appears.
 *
 * @param {string} folder - The folder to watch.
 * @param {Object} options - Options to pass to addTimecode.
 */
function watchFolder(folder, options) {
  console.log(`Watching folder: ${folder} for new files...`);
  const watcher = chokidar.watch(folder, {
    ignored: /^\./,
    persistent: true,
  });

  watcher.on('add', (filePath) => {
    // Optionally, add filtering based on file extension.
    console.log(`New file detected: ${filePath}`);
    addTimecode(filePath, options)
      .then(({ timecode, outputFile, createdTimeFormatted }) => {
        console.log(`Processed ${path.basename(filePath)}: creation time ${createdTimeFormatted} and added timecode ${timecode}`);
      })
      .catch((err) => {
        console.error(`Error processing ${filePath}: ${err.message}`);
      });
  });

  watcher.on('error', (error) => {
    console.error(`Watcher error: ${error}`);
  });
}

module.exports = watchFolder;
