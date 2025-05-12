import pino from 'pino';
import pretty from 'pino-pretty';
import fs from 'fs';
import path from 'path';

// Ensure logs directory exists
const logDir = path.resolve('logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

// Log file path
const logFilePath = path.join(logDir, 'app.log');

// Create logger
const logger = pino({
    level: 'debug',
    timestamp: pino.stdTimeFunctions.isoTime,
}, pino.multistream([
    { stream: pretty({ colorize: true }) },
    { stream: fs.createWriteStream(logFilePath) }
]));

export default logger;