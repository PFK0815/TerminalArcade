function supportsAnsi() {
    const env = process.env;
    const terms = ['xterm', 'xterm-256color', 'screen', 'screen-256color', 'tmux', 'tmux-256color', 'rxvt-unicode', 'rxvt-unicode-256color', 'linux', 'cygwin'];
    return terms.includes(env.TERM) || env.COLORTERM === 'truecolor' || env.TERM_PROGRAM === 'iTerm.app' || env.TERM_PROGRAM === 'Apple_Terminal';
}

function delay(ms) {return new Promise(resolve => setTimeout(resolve, ms));}

async function main(){

if(!supportsAnsi()){
    console.warn("It looks like this terminal can't handle ANSI escape codes. Waiting 5 seconds for quit, else continue.");
    await delay(5000);
}

const fs = require("fs");
var path = require("path");

if(process.argv[2] == "-h"){
    process.stdout.write("Usage: {Command} <DirnameOfWorkspace/Options>\n");
    process.stdout.write("Options:\n");
    process.stdout.write("  -h: Show help.\n");
    process.stdout.write("DirnameOfWorkspace is the dirname where the game is located. This folder will contain the levels directory. More information down.\n");
    process.stdout.write("The script always takes levels from {USERDIRECTORY}/.TerminalArcade/maze/levels/ (Just if DirnameOfWorkspace has no value)\n");
    process.stdout.write("To install levels, download them to the path.\nExample download: curl 'https://raw.githubusercontent.com/the/url/to/your/game/file' -o {USERDIRECTORY}/.TerminalArcade/maze/levels/0002. DownloadedLevel.json\n");
    process.stdout.write("But you can also use levelpacks from others by just using the directory where its downloaded\n");
    process.exit(0);
}

const dirname = path.resolve(process.argv[2] || path.resolve(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], ".TerminalArcade", "maze"));

const LEVELS = (function(){
    var Filename = "";
    if (!fs.existsSync(path.resolve(dirname, "levels"))) {
        try{
            fs.mkdirSync(path.resolve(dirname, "levels"), { recursive: true });
        } catch (err) {
            console.error("Error caught while trying to mkdir \""+dirname+"\"!\nERR: "+err);
            process.exit(1);
        }
    }
    var JSONLEVELS = [];
    var LevelFiles;
    try{
        LevelFiles = fs.readdirSync(path.resolve(dirname, "levels"));
    } catch ( err ){
        console.error(`Error caught while reading levels directory (${path.resolve(path.resolve(dirname, "levels"))})!\n${err}`);
        process.exit(1);
    }
    LevelFiles.forEach(file => {
        try{
            Filename = path.resolve(path.resolve(dirname, "levels"), file);
            var Level = JSON.parse(fs.readFileSync(Filename));
            if (!(Level && Level.MAP && Level.PositionStart && Level.PositionTarget && Level.Name)) return;
            Level.Flags = Level.Flags || {};
            JSONLEVELS.push({...Level, Filename: Filename});
        } catch (err) {
            console.error(`Error caught while reading and parsing level.\nFile: ${Filename}\n${err}\nSkipping that file...`);
        }
    });
    return JSONLEVELS;
})();

const STDOUT__FUNCTIONS = {
    COLORLIST: {
        Black: '\x1b[30m',
        Red: '\x1b[31m',
        Green: '\x1b[32m',
        Yellow: '\x1b[33m',
        Blue: '\x1b[34m',
        Magenta: '\x1b[35m',
        Cyan: '\x1b[36m',
        White: '\x1b[37m',
        BrightBlack: '\x1b[90m',
        BrightRed: '\x1b[91m',
        BrightGreen: '\x1b[92m',
        BrightYellow: '\x1b[93m',
        BrightBlue: '\x1b[94m',
        BrightMagenta: '\x1b[95m',
        BrightCyan: '\x1b[96m',
        BrightWhite: '\x1b[97m',

        BackgroundBlack: '\x1b[40m',
        BackgroundRed: '\x1b[41m',
        BackgroundGreen: '\x1b[42m',
        BackgroundYellow: '\x1b[43m',
        BackgroundBlue: '\x1b[44m',
        BackgroundMagenta: '\x1b[45m',
        BackgroundCyan: '\x1b[46m',
        BackgroundBrightBlack: '\x1b[47m',
        BackgroundBrightBlack: '\x1b[100m',
        BackgroundBrightRed: '\x1b[101m',
        BackgroundBrightGreen: '\x1b[102m',
        BackgroundBrightYellow: '\x1b[103m',
        BackgroundBrightBlue: '\x1b[104m',
        BackgroundBrightMagenta: '\x1b[105m',
        BackgroundBrightCyan: '\x1b[106m',
        BackgroundBrightWhite: '\x1b[107m'
    },
    CLEAR: function () {
        process.stdout.write("\x1Bc");
    },
    CURSOR: function (show) {
        process.stdout.write((show ? "\x1b[?25h" : "\x1b[?25l"));
    },
    COLOR: function (color) {
        process.stdout.write((this.COLORLIST[color] ? this.COLORLIST[color] : color));
    },
    PAINTAT: function (y, x, color) {
        if (color) this.COLOR(color);
        this.CURSORTO(y, x);
        process.stdout.write(`\u2588`);
    },
    CURSORTO: function (y, x) {
        process.stdout.write(`\x1b[${y + 1};${x + 1}H`);
    },
    WRITE: function (text) {
        process.stdout.write(text);
    }
};


var PLAYERDATA = {
    RunningLevel: null,
    Position: [null, null]
};

function repaintPlayer(OldPos) {
    STDOUT__FUNCTIONS.CURSORTO(OldPos[0], OldPos[1] * 2);
    if(PLAYERDATA.LEVEL.Flags.RemoveTiles){
        var stringarray = PLAYERDATA.LEVEL.MAP[OldPos[0]].split("");
        stringarray[OldPos[1]] = "#";
        PLAYERDATA.LEVEL.MAP[OldPos[0]] = stringarray.join("");
    }
    var element = PLAYERDATA.LEVEL.MAP[OldPos[0]].charAt(OldPos[1]);
    if (element == "T") {
        STDOUT__FUNCTIONS.WRITE("\x1b[37m\u2588\u2588");
    } else if (element == "S") {
        STDOUT__FUNCTIONS.WRITE("\x1b[32m\u2588\u2588");
    } else if (("CYMW").indexOf(element) >= 0) {
        STDOUT__FUNCTIONS.WRITE((element == "C" ? '\x1b[36m' : (element == "Y" ? '\x1b[33m' : (element == "M" ? '\x1b[35m' : '\x1b[37m')))+"\u2588\u2588");
    } else {
        STDOUT__FUNCTIONS.COLOR("BackgroundBrightBlack");
        STDOUT__FUNCTIONS.WRITE((element == "#" ? "\x1b[34m" : "\x1b[90m") + ((element == "#" ? "\u2588" : "\u2588").repeat(2)));
    }
    STDOUT__FUNCTIONS.CURSORTO(PLAYERDATA.Position[0], PLAYERDATA.Position[1] * 2);
    STDOUT__FUNCTIONS.WRITE("\x1b[31m\u2588\u2588");

    if(PLAYERDATA.Position[0] == PLAYERDATA.LEVEL.PositionTarget[0] && PLAYERDATA.Position[1] == PLAYERDATA.LEVEL.PositionTarget[1]){
        PLAYERDATA.RunningLevel = null;
        PLAYERDATA.Position = [ null, null ];
        STDOUT__FUNCTIONS.CURSORTO(20, 5);
        STDOUT__FUNCTIONS.COLOR("BackgroundBlack");
        STDOUT__FUNCTIONS.COLOR("Yellow");
        STDOUT__FUNCTIONS.CURSORTO(4, 20-1); STDOUT__FUNCTIONS.WRITE("                                          ");
        STDOUT__FUNCTIONS.CURSORTO(5, 20-1); STDOUT__FUNCTIONS.WRITE("     █       █       █       █       █    ");
        STDOUT__FUNCTIONS.CURSORTO(6, 20-1); STDOUT__FUNCTIONS.WRITE("    ███     ███     ███     ███     ███   ");
        STDOUT__FUNCTIONS.CURSORTO(7, 20-1); STDOUT__FUNCTIONS.WRITE("   █████   █████   █████   █████   █████  ");
        STDOUT__FUNCTIONS.CURSORTO(8, 20-1); STDOUT__FUNCTIONS.WRITE("  ███████ ███████ ███████ ███████ ███████ ");
        STDOUT__FUNCTIONS.CURSORTO(9, 20-1); STDOUT__FUNCTIONS.WRITE(" ████████████████████████████████████████ ");
        STDOUT__FUNCTIONS.CURSORTO(10, 20-1);STDOUT__FUNCTIONS.WRITE("                                          ");
        STDOUT__FUNCTIONS.CURSORTO(11, 20-1);STDOUT__FUNCTIONS.WRITE("             You did that maze!           ");
        var Time = Date.now() - PLAYERDATA.StartTime;
        var diffSeconds = Math.floor(Time / 1000);
        var diffMinutes = Math.floor(diffSeconds / 60);
        var diffHours = Math.floor(diffMinutes / 60);
        diffSeconds = diffSeconds % 60;
        diffMinutes = diffMinutes % 60;
        var hours = String(diffHours).padStart(2, '0');
        var minutes = String(diffMinutes).padStart(2, '0');
        var seconds = String(diffSeconds).padStart(2, '0');
        var TS = `${hours}:${minutes}:${seconds}`;
        STDOUT__FUNCTIONS.CURSORTO(12, 20-1);STDOUT__FUNCTIONS.WRITE(`           Time: ${TS   }                 `);
        STDOUT__FUNCTIONS.CURSORTO(13, 20-1);STDOUT__FUNCTIONS.WRITE(" **************************************** ");
    }
}

var TYPINGINLEVELID = false;
var TYPINGTEXT = "";

if(process.stdin.setRawMode){
    process.stdin.setRawMode(true);
}else{
    console.error("This stdin dont support raw mode!");
    process.exit(1);
}
process.stdin.resume();
process.stdin.on("data", (str, key) => {
    if (str == "\x1B\x5B\x32\x34\x7E") { // F12
        STDOUT__FUNCTIONS.CURSOR(true);
        STDOUT__FUNCTIONS.WRITE("\x1B[0m\x1Bc");
        process.exit(0);
    }

    if(TYPINGINLEVELID){
        if("0123456789".indexOf(""+str) >= 0){
            TYPINGTEXT += ""+str;
            process.stdout.write('\x1B[1K\r Please input number(index): '+TYPINGTEXT);
            return;
        }
        if (str == "\x7F"){
            TYPINGTEXT = TYPINGTEXT.substring(0, TYPINGTEXT.length-1);
            process.stdout.write('\x1B[1K\r Please input number(index): '+TYPINGTEXT);
        }
        if (str == "\x0D" || str == "\x0A"){
            TYPINGINLEVELID = false;
            const LEVELID = parseInt(TYPINGTEXT);
            if(!Number.isInteger(LEVELID)){
                STDOUT__FUNCTIONS.CLEAR();
                STDOUT__FUNCTIONS.CURSORTO(1, 0);
                STDOUT__FUNCTIONS.WRITE("\x1b[31m Invalid input!");
                STDOUT__FUNCTIONS.CURSORTO(3, 0);
                ShowStartScreen();
                return;
            }
            if(!LEVELS[LEVELID]){
                STDOUT__FUNCTIONS.CLEAR();
                STDOUT__FUNCTIONS.CURSORTO(1, 0);
                STDOUT__FUNCTIONS.WRITE("\x1b[31m Invalid level id!");
                STDOUT__FUNCTIONS.CURSORTO(3, 0);
                ShowStartScreen();
                return;
            }
            StartLevel(LEVELID);
        }
    }

    if(str == "q"){
        PLAYERDATA.RunningLevel = null;
        PLAYERDATA.Position = [ null, null ];
        ExitLevel();
    }else if(str == "r" && Number.isInteger(PLAYERDATA.RunningLevel) && PLAYERDATA.RunningLevel != null){
        STDOUT__FUNCTIONS.CLEAR();
        StartLevel(PLAYERDATA.RunningLevel);
    }

    if(Number.isInteger(PLAYERDATA.RunningLevel) && PLAYERDATA.RunningLevel != null){
        if (str == "\x1b\x5b\x41") { // ARROW-UP
            if (PLAYERDATA.RunningLevel == null) return;
            if (PLAYERDATA.Position[0] - 1 < 0) return;
            if ((!PLAYERDATA.LEVEL.Flags.FreeMove) && PLAYERDATA.LEVEL.MAP[PLAYERDATA.Position[0]-1].charAt(PLAYERDATA.Position[1]-0) == "#") return;
            const OldPos = [...PLAYERDATA.Position];
            PLAYERDATA.Position[0]--;
            repaintPlayer(OldPos);
        } else if (str == "\x1b\x5b\x42") { // ARROW-DOWN
            if (PLAYERDATA.RunningLevel == null) return;
            if (PLAYERDATA.Position[0] + 1 >= 40) return;
            if ((!PLAYERDATA.LEVEL.Flags.FreeMove) && PLAYERDATA.LEVEL.MAP[PLAYERDATA.Position[0]+1].charAt(PLAYERDATA.Position[1]-0) == "#") return;
            const OldPos = [...PLAYERDATA.Position];
            PLAYERDATA.Position[0]++;
            repaintPlayer(OldPos);
        } else if (str == "\x1b\x5b\x44") { // ARROW-LEFT
            if (PLAYERDATA.RunningLevel == null) return;
            if (PLAYERDATA.Position[1] - 1 < 0) return;
            if ((!PLAYERDATA.LEVEL.Flags.FreeMove) && PLAYERDATA.LEVEL.MAP[PLAYERDATA.Position[0]-0].charAt(PLAYERDATA.Position[1]-1) == "#") return;
            const OldPos = [...PLAYERDATA.Position];
            PLAYERDATA.Position[1]--;
            repaintPlayer(OldPos);
        } else if (str == "\x1b\x5b\x43") { // ARROW-RIGHT
            if (PLAYERDATA.RunningLevel == null) return;
            if (PLAYERDATA.Position[1] + 1 >= 40) return;
            if ((!PLAYERDATA.LEVEL.Flags.FreeMove) && PLAYERDATA.LEVEL.MAP[PLAYERDATA.Position[0]-0].charAt(PLAYERDATA.Position[1]+1) == "#") return;
            const OldPos = [...PLAYERDATA.Position];
            PLAYERDATA.Position[1]++;
            repaintPlayer(OldPos);
        }
    } 
});

function CLEARMAPSCREEN() {
    STDOUT__FUNCTIONS.COLOR("BackgroundBlack");
    for (var LINE__Y = 0; LINE__Y < 40; LINE__Y++) {
        STDOUT__FUNCTIONS.COLOR("Black");
        STDOUT__FUNCTIONS.CURSORTO(LINE__Y, 0);
        STDOUT__FUNCTIONS.WRITE(" ".repeat(80));
    }
}
CLEARMAPSCREEN();

function PRINTLEVEL(LEVEL) {
    CLEARMAPSCREEN();
    STDOUT__FUNCTIONS.CURSORTO(0, 0);
    STDOUT__FUNCTIONS.COLOR("BackgroundBlack");
    if (!LEVEL) return;
    for (var PRINT__Y = 0; PRINT__Y < 40; PRINT__Y++) {
        if (LEVEL.MAP[PRINT__Y]) {
            LEVEL.MAP[PRINT__Y].split("").forEach((element, PRINT__X) => {
                STDOUT__FUNCTIONS.CURSORTO(PRINT__Y, PRINT__X * 2);
                if (element == "T") {
                    STDOUT__FUNCTIONS.WRITE("\x1b[37m\u2588\u2588");
                } else if (element == "S") {
                    STDOUT__FUNCTIONS.WRITE("\x1b[32m\u2588\u2588");
                } else if (("CYMW").indexOf(element) >= 0) {
                    STDOUT__FUNCTIONS.WRITE((element == "C" ? '\x1b[36m' : (element == "Y" ? '\x1b[33m' : (element == "M" ? '\x1b[35m' : '\x1b[37m')))+"\u2588\u2588");
                } else {
                    STDOUT__FUNCTIONS.COLOR("BackgroundBrightBlack");
                    STDOUT__FUNCTIONS.WRITE((element == "#" ? "\x1b[34m" : "\x1b[90m") + ((element == "#" ? "\u2588" : "\u2588").repeat(2)));
                }
            });
        }
    }
}

function StartLevel(levelid) {
    STDOUT__FUNCTIONS.CLEAR();
    STDOUT__FUNCTIONS.CURSOR(false);
    CLEARMAPSCREEN();

    const LEVEL = {...LEVELS[levelid]};
    if (!LEVEL) {
        STDOUT__FUNCTIONS.CLEAR();
        STDOUT__FUNCTIONS.CURSORTO(1, 0);
        STDOUT__FUNCTIONS.WRITE("Tried to start unknown level!");
        STDOUT__FUNCTIONS.CURSORTO(3, 0);
        ShowStartScreen();
        return;
    };
    PLAYERDATA.LEVEL = JSON.parse(JSON.stringify(LEVEL));
    PLAYERDATA.RunningLevel = levelid;
    PLAYERDATA.Position = [...PLAYERDATA.LEVEL.PositionStart];
    PLAYERDATA.StartTime = Date.now();
    PRINTLEVEL(LEVEL);
    STDOUT__FUNCTIONS.CURSORTO(PLAYERDATA.Position[0], PLAYERDATA.Position[1] * 2);
    STDOUT__FUNCTIONS.WRITE("\x1b[31m\u2588\u2588");

    STDOUT__FUNCTIONS.CURSORTO(41, 0);
    STDOUT__FUNCTIONS.WRITE("Controls:\nWASD: Move the player.\nQ: Quit level.\nR: Restart level.");
}

function ExitLevel(levelid) {
    PLAYERDATA.RunningLevel = null;
    PLAYERDATA.Position = [ null, null ];
    STDOUT__FUNCTIONS.CLEAR();
    STDOUT__FUNCTIONS.CURSORTO(3, 0);
    ShowStartScreen();
}

//StartLevel(0);

function ShowStartScreen(){
    STDOUT__FUNCTIONS.WRITE("\x1B[0m");
    STDOUT__FUNCTIONS.COLOR("White");
    STDOUT__FUNCTIONS.WRITE(" Hello!\n Press F12 to exit at any time.\n While in game use 'q' key to get back to main menu.\n Ingame use 'r' to go back to restart.\n This is a terminal game! You can play mazes here easy.\n\n List of mazes:\n");
    var LEVEL = null;
    var TABLE = [];
    for( var LEVELID in LEVELS ){
        LEVEL = LEVELID;
        TABLE.push({
            Name: LEVELS[LEVELID].Name,
            Filename: LEVELS[LEVELID].Filename,
        });
        //STDOUT__FUNCTIONS.WRITE(`   #${LEVELID}: ${LEVELS[LEVELID].Filename}: ${LEVELS[LEVELID].Name || "No Name"}\n`);
    }
    console.table(TABLE);
    if(LEVEL == null){
        process.stdout.write(" Looks like you have no installed mazes!\n Maybe download some?\n Use -h for more information.\n");
        process.exit(0);
    }
    process.stdout.write(" Please input number(index): ");
    TYPINGINLEVELID = true;
    TYPINGTEXT = "";
}

STDOUT__FUNCTIONS.CLEAR();
STDOUT__FUNCTIONS.CURSORTO(3, 0);
ShowStartScreen();

}

main();