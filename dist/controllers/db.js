"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupRedis = exports.connectRedis = exports.connectMongoDB = void 0;
const redis_1 = __importDefault(require("redis"));
const mongoose_1 = __importDefault(require("mongoose"));
const util_1 = require("util");
const connectMongoDB = () => {
    mongoose_1.default.Promise = global.Promise;
    mongoose_1.default.connect(process.env.MONGODB_URL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
};
exports.connectMongoDB = connectMongoDB;
const connectRedis = () => {
    const client = redis_1.default.createClient(process.env.REDIS_URL);
    return client;
};
exports.connectRedis = connectRedis;
const setupRedis = (client) => {
    const setAsync = util_1.promisify(client.set).bind(client);
    const getAsync = util_1.promisify(client.get).bind(client);
    return { setAsync, getAsync };
};
exports.setupRedis = setupRedis;
//# sourceMappingURL=db.js.map