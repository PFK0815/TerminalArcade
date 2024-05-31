const fs = require(`fs`);
var path = require(`path`);
const crypto = require('crypto');
const yargs = require(`yargs/yargs`);

const ServerPath = "https://raw.githubusercontent.com/PFK0815/TerminalArcade/main/";

const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv))
    .usage('Usage: $0 [options]')
    .option('game', {
        describe: 'The name of the game. Use \'all\' while updating.',
        type: 'string',
        demandOption: true,
    })
    /*.option('update', {
        describe: 'Enable to update.',
        type: 'boolean',
        default: false,
    })*/
    .option('ignorehash', {
        describe: 'Enable to disable hash check.',
        type: 'boolean',
        default: false,
    })
    .help('h')
    .alias('g', 'game')
    .alias('u', 'update')
    .alias('i', "ignorehash")
    .locale("en")
    .argv;

var platform = process.platform;
if (![`linux`, `darwin`, `win32`].includes(platform)) {
    console.error(`Your platform is not supported!\nPlease contact the developer with the informations!\nInformation:`)
    console.error(`  Data of 'platform': ${platform}`);
    process.exit(1);
}

var sha256 = function (Data) { return crypto.createHash("sha256").update(Data).digest("hex"); }

const TerminalArcadeDirectory = path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], `.TerminalArcade`);

process.stdout.write(`Looking for TerminalArcade directory '${TerminalArcadeDirectory}'... `);
if (fs.existsSync(TerminalArcadeDirectory)) {
    process.stdout.write(`Found!\n`);
} else {
    process.stdout.write(`Not found!\nTrying to make... `);
    try {
        fs.mkdirSync(TerminalArcadeDirectory, { recursive: true });
        process.stdout.write(`Succesfully created TerminalArcade user directory!\n`);
    } catch (err) {
        process.stderr.write(`Could not create TerminalArcade user directory!\n`);
        process.exit(1);
    }
}

(async function main() {
    const GamePath = path.resolve(TerminalArcadeDirectory, argv.game);

    try {
        if (!fs.existsSync(GamePath)) {
            fs.mkdirSync(GamePath, { recursive: true });
        }
    } catch (err) {
        console.error("Error caught while creating app directory!");
        console.error(err);
    }

    try {
        console.log(`Installing the game '${argv.game}' for platform '${platform}'...`);
        console.log(`Server url is set to '${ServerPath}'`);
        console.log(`Fetching game configuration...`);
        const Response = await fetch(`${ServerPath}/GAMES/${argv.game}.json`);
        if (Response.status != 200) {
            throw ("ERROR: Server answered not 200 OK!\nAnswer: " + `${Response.status} ${Response.statusText}`);
        }
        const GameConfiguration = await Response.json();
        console.log("Creating all subdirectorys...");
        GameConfiguration.FileTargets.SUBDIRECTORYS.forEach(element => {
            if (!fs.existsSync(path.resolve(GamePath, element))) {
                fs.mkdirSync(path.resolve(GamePath, element), { recursive: true });
            }
        });
        console.log(`Downloading executeable...`);
        const EXECUTEABLE__RESPONSE = await fetch(`${ServerPath}${GameConfiguration.EXECS[platform]}`);
        if (EXECUTEABLE__RESPONSE.status != 200) {
            throw ("ERROR: Server answered not 200 OK!\nAnswer: " + `${EXECUTEABLE__RESPONSE.status} ${EXECUTEABLE__RESPONSE.statusText}`);
        }
        const EXECUTEABLE = Buffer.from(await EXECUTEABLE__RESPONSE.arrayBuffer());
        if ((!argv.ignorehash) && GameConfiguration.HASHES[GameConfiguration.EXECS[platform]] !== null && sha256(EXECUTEABLE) !== GameConfiguration.HASHES[GameConfiguration.EXECS[platform]]) {
            throw ("The downloaded file does not match the sha256 sum!\n");
        }
        fs.writeFileSync(path.resolve(GamePath, GameConfiguration.FileTargets[GameConfiguration.EXECS[platform]]), EXECUTEABLE);
        console.log("Downloading all other files...");
        for(var i = 0; i < GameConfiguration.OtherFiles.length; i++){
            const element = GameConfiguration.OtherFiles[i];
            console.log(`  Downloading: ${element}...`)
            const FileResponse = await fetch(`${ServerPath}${element}`);
            if (FileResponse.status != 200) {
                throw ("ERROR: Server answered not 200 OK!\nAnswer: " + `${FileResponse.status} ${FileResponse.statusText}`);
            }
            const FileContent = Buffer.from(await FileResponse.arrayBuffer());
            if ((!argv.ignorehash) && GameConfiguration.HASHES[element] !== null && sha256(FileContent) !== GameConfiguration.HASHES[element]) {
                throw ("The downloaded file does not match the sha256 sum!\n");
            }
            fs.writeFileSync(path.resolve(GamePath, GameConfiguration.FileTargets[element]), FileContent);
        }
        console.log("Succesfully installed!\nThe file is located in '"+GamePath+"'.\nAt linux you maybe need to make the file executeable.\nBye and happy playing the games!");
    } catch (err) {
        console.error("An Error got caught while installing the game!");
        console.error(err);
        //console.error("Deleting game directory...");
        //fs.rmdirSync(GamePath, {recursive:true, force: true});
        process.exit(1);
    }
})();