const chokidar = require('chokidar');
const path = require('path');
const fs = require('fs');
const addTimecode = require('./processFile');

/**
 * Watches a folder (root level only) and processes any new video file that appears.
 * After processing, moves the original file to an "original" subfolder and
 * the timecoded file to a "tc" subfolder.
 *
 * @param {string} folder - The folder to watch.
 * @param {Object} options - Options to pass to addTimecode.
 */
function watchFolder(folder, options) {
  console.log(`Watching folder: ${folder} (root level only) for new video files...`);

  const watcher = chokidar.watch(folder, {
    persistent: true,
    depth: 0,                 // Only watch the folder's root level.
    ignoreInitial: false,     // Process files already present.
    awaitWriteFinish: {
      stabilityThreshold: 5000, // Wait 2000ms for file writes to stabilize.
      pollInterval: 1000         // Check every 100ms.
    }
  });

  watcher.on('ready', () => {
    console.log('Initial scan complete. Watching for changes...');
  });

  watcher.on('add', (filePath, stats) => {
    console.log(`Add event for: ${filePath}`);

    // Only process files ending in .mov or .mp4.
    if (!/\.(mov|mp4)$/i.test(filePath)) {
      console.log(`Skipping ${filePath} - not a supported video file.`);
      return;
    }

    console.log(`New video file detected: ${filePath}`);
    addTimecode(filePath, options)
      .then(({ timecode, outputFile, createdTimeFormatted }) => {
        console.log(
          `Processed ${path.basename(filePath)}: creation time ${createdTimeFormatted} and added timecode ${timecode}`
        );

        // Determine destination folders.
        const originalDir = path.join(folder, 'original');
        const tcDir = path.join(folder, 'tc');

        // Create subfolders if they don't exist.
        if (!fs.existsSync(originalDir)) {
          fs.mkdirSync(originalDir);
          console.log(`Created folder: ${originalDir}`);
        }
        if (!fs.existsSync(tcDir)) {
          fs.mkdirSync(tcDir);
          console.log(`Created folder: ${tcDir}`);
        }

        // Move the original file into the original subfolder.
        const baseName = path.basename(filePath);
        const originalDest = path.join(originalDir, baseName);
        fs.renameSync(filePath, originalDest);
        console.log(`Moved original file to: ${originalDest}`);

        // Move the timecoded file into the tc subfolder.
        const tcDest = path.join(tcDir, path.basename(outputFile));
        fs.renameSync(outputFile, tcDest);
        console.log(`Moved timecoded file to: ${tcDest}`);
      })
      .catch((err) => {
        console.error(`Error processing ${filePath}: ${err.message}`);
      });
  });

  watcher.on('error', (error) => {
    console.error(`Watcher error: ${error}`);
  });

  // Prevent the process from exiting.
  setInterval(() => {}, 1000);
}

module.exports = watchFolder;
