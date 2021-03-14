"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gameStatus = exports.level = void 0;
var level;
(function (level) {
    level[level["Easy"] = 0] = "Easy";
    level[level["Medium"] = 1] = "Medium";
    level[level["Hard"] = 2] = "Hard";
})(level = exports.level || (exports.level = {}));
var gameStatus;
(function (gameStatus) {
    gameStatus[gameStatus["NotStarted"] = 0] = "NotStarted";
    gameStatus[gameStatus["Started"] = 1] = "Started";
    gameStatus[gameStatus["Over"] = 2] = "Over";
})(gameStatus = exports.gameStatus || (exports.gameStatus = {}));
//# sourceMappingURL=interface.js.map