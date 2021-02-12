import redis from "redis";
import mongoose from "mongoose";
import { promisify } from "util";
export const connectMongoDB = () => {
  mongoose.Promise = global.Promise;
  mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

export const connectRedis = (): redis.RedisClient => {
  const client = redis.createClient(process.env.REDIS_URL);
  return client;
};

export const setupRedis = (client: redis.RedisClient) => {
  const setAsync = promisify(client.set).bind(client);
  const getAsync = promisify(client.get).bind(client);
  return { setAsync, getAsync };
};
